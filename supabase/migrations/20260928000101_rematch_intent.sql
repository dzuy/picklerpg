-- Automatic invitations cannot stand in for a player's deliberate rematch tap.
alter table public.async_invitations add column rematch_manual boolean not null default true;
alter table public.async_matches add column rematch_countdown_seen uuid[] not null default '{}';
create or replace function public.create_async_rematch(p_source uuid,p_actor uuid,p_invite jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source public.async_matches; invitation public.async_invitations; opponent uuid;
begin
 -- Serialize both players, including the race before the invitation exists.
 select * into source from public.async_matches where id=p_source for update;
 if not found or p_actor is null or (p_actor is distinct from source.home_user_id and p_actor is distinct from source.away_user_id) then raise exception 'Not found' using errcode='P0002';end if;
 if source.status<>'completed' or source.away_user_id is null then raise exception 'Finish this game first' using errcode='PT409';end if;
 select * into invitation from public.async_invitations where rematch_of=p_source;
 if found then
  if invitation.creator_id=p_actor and coalesce((p_invite->>'rematch_manual')::boolean,true) then
   update public.async_invitations set rematch_manual=true where id=invitation.id returning * into invitation;
  end if;
  return to_jsonb(invitation);
 end if;
 opponent:=case when p_actor=source.home_user_id then source.away_user_id else source.home_user_id end;
 if p_invite->>'creator_id' is distinct from p_actor::text or p_invite->>'recipient_id' is distinct from opponent::text
 or p_invite->>'scoring' is distinct from source.checkpoint#>>'{rules,scoring}'
 or p_invite->>'court' is distinct from coalesce(source.checkpoint->>'court','forest')
 then raise exception 'Invalid rematch' using errcode='22023';end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,scoring,points_limit,request_id,request_hash,rematch_of,rematch_manual)
 values((p_invite->>'id')::uuid,p_actor,opponent,p_invite->'team',p_invite->>'court',p_invite->>'scoring',coalesce((source.checkpoint#>>'{rules,target}')::integer,3),(p_invite->>'request_id')::uuid,p_invite->>'request_hash',p_source,coalesce((p_invite->>'rematch_manual')::boolean,true)) returning * into invitation;
 return to_jsonb(invitation);
end $$;
revoke all on function public.create_async_rematch(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_async_rematch(uuid,uuid,jsonb) to service_role;

create function public.claim_rematch_countdown(p_source uuid,p_actor uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.async_matches set rematch_countdown_seen=array_append(rematch_countdown_seen,p_actor)
 where id=p_source and status='completed' and p_actor in (home_user_id,away_user_id)
 and not p_actor=any(rematch_countdown_seen);
 return found;
end $$;
revoke all on function public.claim_rematch_countdown(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_rematch_countdown(uuid,uuid) to service_role;
