-- Invitations are not playable matches. Acceptance creates one match atomically.
create table public.async_invitations (
 id uuid primary key, creator_id uuid not null references auth.users(id), recipient_id uuid not null references auth.users(id),
 team jsonb not null check(jsonb_array_length(team)=2), court text not null check(court='forest'), scoring text not null check(scoring in ('rally-doubles','side-out-doubles')),
 status text not null default 'pending' check(status in ('pending','accepted')), created_at timestamptz not null default now(),
 request_id uuid not null, request_hash text not null, accept_hash text, match_id uuid references public.async_matches(id),
 check(creator_id<>recipient_id), check((status='pending' and match_id is null) or (status='accepted' and match_id is not null)), unique(creator_id,request_id)
);
alter table public.async_invitations enable row level security;
revoke all on public.async_invitations from public,anon,authenticated,service_role;
grant select on public.async_invitations to service_role;
create index async_invitations_recipient on public.async_invitations(recipient_id,status);
create function public.create_async_invitation(p_invite jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations;
begin
 perform pg_advisory_xact_lock(hashtextextended((p_invite->>'creator_id')||':'||(p_invite->>'request_id'),0));
 select * into i from public.async_invitations where creator_id=(p_invite->>'creator_id')::uuid and request_id=(p_invite->>'request_id')::uuid;
 if found then if i.request_hash<>p_invite->>'request_hash' then raise exception 'Invitation conflict' using errcode='PT409';end if;return to_jsonb(i);end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,scoring,request_id,request_hash) values((p_invite->>'id')::uuid,(p_invite->>'creator_id')::uuid,(p_invite->>'recipient_id')::uuid,p_invite->'team',p_invite->>'court',p_invite->>'scoring',(p_invite->>'request_id')::uuid,p_invite->>'request_hash') returning * into i;
 return to_jsonb(i);
end $$;
create function public.accept_async_invitation(p_id uuid,p_actor uuid,p_hash text,p_match jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations; m jsonb;
begin
 select * into i from public.async_invitations where id=p_id for update;
 if not found or i.recipient_id<>p_actor then raise exception 'Not found' using errcode='P0002';end if;
 if i.status='accepted' then
  if i.accept_hash<>p_hash then raise exception 'Acceptance conflict' using errcode='PT409';end if;
  select to_jsonb(x) into m from public.async_matches x where id=i.match_id;return m;
 end if;
 if p_match->>'id'<>i.id::text or p_match->>'home_user_id'<>i.recipient_id::text or p_match->>'away_user_id'<>i.creator_id::text or p_match->>'creation_request_id'<>i.id::text
 or p_match#>>'{checkpoint,rules,scoring}'<>i.scoring
 or p_match#>'{checkpoint,roster,opponent-left,design}' is distinct from i.team->0
 or p_match#>'{checkpoint,roster,opponent-right,design}' is distinct from i.team->1
 then raise exception 'Invalid accepted match' using errcode='22023';end if;
 m:=public.create_async_test_match(p_match);
 update public.async_invitations set status='accepted',accept_hash=p_hash,match_id=i.id where id=i.id;
 return m;
end $$;
revoke all on function public.create_async_invitation(jsonb) from public,anon,authenticated;
revoke all on function public.accept_async_invitation(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_async_invitation(jsonb), public.accept_async_invitation(uuid,uuid,text,jsonb) to service_role;
