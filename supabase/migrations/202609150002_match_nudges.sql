begin;
-- Only accepted gameplay advances this clock. Archiving cannot reset the wait.
alter table public.async_matches add column action_ready_at timestamptz not null default now();
update public.async_matches set action_ready_at=updated_at;
create function public.track_async_action_ready() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.version is distinct from old.version then new.action_ready_at:=now(); end if;
 return new;
end $$;
create trigger async_action_ready before update on public.async_matches
for each row execute function public.track_async_action_ready();
revoke all on function public.track_async_action_ready() from public,anon,authenticated;

create table public.match_nudges (
 match_id uuid not null references public.async_matches(id) on delete cascade,
 turn_version bigint not null,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(match_id,turn_version),
 check(sender_id<>recipient_id)
);
create index match_nudges_pair_time on public.match_nudges(sender_id,recipient_id,created_at desc);
alter table public.match_nudges enable row level security;
revoke all on public.match_nudges from public,anon,authenticated,service_role;
grant select on public.match_nudges to service_role;

create function public.get_match_nudge_status(p_match_id uuid,p_actor uuid,p_unlimited boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; available_at timestamptz; last_nudge timestamptz; reason text;
begin
 select * into m from public.async_matches where id=p_match_id;
 if not found or p_actor is null or p_actor not in(m.home_user_id,m.away_user_id) then
  raise exception 'Match not found' using errcode='P0002';
 end if;
 if m.status<>'active' then reason:='finished';
 elsif m.current_action_user_id=p_actor then reason:='not_waiting';
 elsif p_unlimited then reason:='ready';
 elsif exists(select 1 from public.match_nudges where match_id=m.id and turn_version=m.version) then reason:='already_nudged';
 else
  available_at:=m.action_ready_at+interval '30 minutes';
  select max(created_at) into last_nudge from public.match_nudges where sender_id=p_actor and recipient_id=m.current_action_user_id;
  if last_nudge+interval '24 hours'>available_at then
   available_at:=last_nudge+interval '24 hours';reason:='daily_limit';
  else reason:='waiting'; end if;
  if now()>=available_at then reason:='ready'; end if;
 end if;
 return jsonb_build_object('state',reason,'version',m.version,'availableAt',available_at,'serverTime',now());
end $$;

create function public.claim_match_nudge(p_match_id uuid,p_actor uuid,p_expected_version bigint,p_unlimited boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; result jsonb;
begin
 -- Same match lock as gameplay; pair lock also serializes different matches/devices.
 select * into m from public.async_matches where id=p_match_id for update;
 if not found or p_actor is null or p_actor not in(m.home_user_id,m.away_user_id) then
  raise exception 'Match not found' using errcode='P0002';
 end if;
 if p_expected_version is distinct from m.version then
  return jsonb_build_object('state','stale','version',m.version,'availableAt',null,'serverTime',now(),'accepted',false);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('match-nudge:'||p_actor::text||':'||coalesce(m.current_action_user_id::text,''),0));
 result:=public.get_match_nudge_status(p_match_id,p_actor,p_unlimited);
 if result->>'state'<>'ready' then return result||jsonb_build_object('accepted',false); end if;
 insert into public.match_nudges(match_id,turn_version,sender_id,recipient_id) values(m.id,m.version,p_actor,m.current_action_user_id)
 on conflict(match_id,turn_version) do update set created_at=excluded.created_at;
 return result||jsonb_build_object('state',case when p_unlimited then 'ready' else 'already_nudged' end,'availableAt',null,'accepted',true,'recipientUserId',m.current_action_user_id);
end $$;
revoke all on function public.get_match_nudge_status(uuid,uuid,boolean),public.claim_match_nudge(uuid,uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.get_match_nudge_status(uuid,uuid,boolean),public.claim_match_nudge(uuid,uuid,bigint,boolean) to service_role;
commit;
