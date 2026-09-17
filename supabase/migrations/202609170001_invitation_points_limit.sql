alter table public.async_invitations add column points_limit integer not null default 3 check (points_limit between 1 and 99);

create or replace function public.create_async_invitation(p_invite jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations;
begin
 perform pg_advisory_xact_lock(hashtextextended((p_invite->>'creator_id')||':'||(p_invite->>'request_id'),0));
 select * into i from public.async_invitations where creator_id=(p_invite->>'creator_id')::uuid and request_id=(p_invite->>'request_id')::uuid;
 if found then if i.request_hash<>p_invite->>'request_hash' then raise exception 'Invitation conflict' using errcode='PT409';end if;return to_jsonb(i);end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,scoring,points_limit,request_id,request_hash) values((p_invite->>'id')::uuid,(p_invite->>'creator_id')::uuid,(p_invite->>'recipient_id')::uuid,p_invite->'team',p_invite->>'court',p_invite->>'scoring',coalesce((p_invite->>'points_limit')::integer,3),(p_invite->>'request_id')::uuid,p_invite->>'request_hash') returning * into i;
 return to_jsonb(i);
end $$;

create or replace function public.create_async_rematch(p_source uuid,p_actor uuid,p_invite jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source public.async_matches; invitation public.async_invitations; opponent uuid;
begin
 -- Serialize both players, including the race before the invitation exists.
 select * into source from public.async_matches where id=p_source for update;
 if not found or p_actor is null or (p_actor is distinct from source.home_user_id and p_actor is distinct from source.away_user_id) then raise exception 'Not found' using errcode='P0002';end if;
 if source.status<>'completed' or source.away_user_id is null then raise exception 'Finish this game first' using errcode='PT409';end if;
 select * into invitation from public.async_invitations where rematch_of=p_source;
 if found then return to_jsonb(invitation);end if;
 opponent:=case when p_actor=source.home_user_id then source.away_user_id else source.home_user_id end;
 if p_invite->>'creator_id' is distinct from p_actor::text or p_invite->>'recipient_id' is distinct from opponent::text
 or p_invite->>'scoring' is distinct from source.checkpoint#>>'{rules,scoring}'
 or p_invite->>'court' is distinct from coalesce(source.checkpoint->>'court','forest')
 then raise exception 'Invalid rematch' using errcode='22023';end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,scoring,points_limit,request_id,request_hash,rematch_of)
 values((p_invite->>'id')::uuid,p_actor,opponent,p_invite->'team',p_invite->>'court',p_invite->>'scoring',coalesce((source.checkpoint#>>'{rules,target}')::integer,3),(p_invite->>'request_id')::uuid,p_invite->>'request_hash',p_source) returning * into invitation;
 return to_jsonb(invitation);
end $$;
revoke all on function public.create_async_rematch(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_async_rematch(uuid,uuid,jsonb) to service_role;
