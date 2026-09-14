-- Business conflicts must return HTTP 409 without SQL serialization retries.
create or replace function public.create_async_test_match(p_match jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; c jsonb:=p_match->'checkpoint';
begin
 -- Serialize retries by creator and request id, including before a row exists.
 perform pg_advisory_xact_lock(hashtextextended((p_match->>'home_user_id')||':'||(p_match->>'creation_request_id'),0));
 select * into m from public.async_matches where home_user_id=(p_match->>'home_user_id')::uuid and creation_request_id=(p_match->>'creation_request_id')::uuid;
 if found then
  if m.creation_hash<>p_match->>'creation_hash' then raise exception 'Creation conflict' using errcode='PT409'; end if;
  return to_jsonb(m);
 end if;
 if c->>'mode' is distinct from 'local-human' or c->>'engineVersion' is distinct from 'pickle-human-1'
    or c->>'schemaVersion' is distinct from '2' or c->>'revision' is distinct from '0'
    or c->'rally'->>'kind' is distinct from 'contact' or c->'scoring'->>'winner' is not null
    or c->'rally'->'state'->>'possession' is distinct from 'home'
 then raise exception 'Invalid initial state' using errcode='22023'; end if;
 insert into public.async_matches(id,home_user_id,away_user_id,version,status,current_action_user_id,checkpoint,creation_request_id,creation_hash,resolution_secret,seed_version,engine_version)
 values ((p_match->>'id')::uuid,(p_match->>'home_user_id')::uuid,(p_match->>'away_user_id')::uuid,0,'active',(p_match->>'home_user_id')::uuid,c,(p_match->>'creation_request_id')::uuid,p_match->>'creation_hash',p_match->>'resolution_secret',(p_match->>'seed_version')::integer,p_match->>'engine_version') returning * into m;
 return to_jsonb(m);
end $$;

create or replace function public.commit_async_match_action(p_match_id uuid,p_actor uuid,p_action_id uuid,p_request_hash text,p_expected_version bigint,p_checkpoint jsonb,p_current_actor uuid,p_status text,p_last_result jsonb,p_animation jsonb,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; r public.async_match_actions; decision_team text; receiver text; winning_team text;
begin
 select * into m from public.async_matches where id=p_match_id for update;
 if not found or p_actor not in (m.home_user_id,m.away_user_id) then raise exception 'Not found' using errcode='P0002'; end if;
 select * into r from public.async_match_actions where match_id=p_match_id and action_id=p_action_id;
 if found then
  if r.actor_id<>p_actor or r.request_hash<>p_request_hash then raise exception 'Action conflict' using errcode='PT409'; end if;
  return to_jsonb(r);
 end if;
 if m.version<>p_expected_version or m.status<>'active' then raise exception 'Version conflict' using errcode='PT409'; end if;
 if m.current_action_user_id<>p_actor then raise exception 'Wrong actor' using errcode='42501'; end if;
 if p_checkpoint->>'matchId' is distinct from m.id::text
  or p_checkpoint->>'revision' is distinct from (m.version+1)::text
  or p_checkpoint->>'schemaVersion' is distinct from m.checkpoint->>'schemaVersion'
  or p_checkpoint->>'engineVersion' is distinct from m.checkpoint->>'engineVersion'
  or p_checkpoint->>'mode' is distinct from 'local-human'
  or p_checkpoint->'roster' is distinct from m.checkpoint->'roster'
  or p_checkpoint->'rules' is distinct from m.checkpoint->'rules'
  or p_action->>'kind' is distinct from 'play_shot'
 then raise exception 'Invalid transition' using errcode='22023'; end if;
 winning_team:=p_checkpoint->'scoring'->>'winner';
 if p_checkpoint->'rally'->>'kind'='reception' then
  receiver:=coalesce(p_checkpoint#>>'{rally,shot,receptionChoice,airborne,resolution,receiver}',p_checkpoint#>>'{rally,shot,receptionChoice,bounced,resolution,receiver}');
  decision_team:=case when receiver in ('you','partner') then 'home' when receiver in ('opponent-left','opponent-right') then 'away' end;
 else decision_team:=p_checkpoint#>>'{rally,state,possession}'; end if;
 if p_status='active' then
  if winning_team is not null or decision_team is null or p_current_actor is distinct from (case decision_team when 'home' then m.home_user_id when 'away' then m.away_user_id end)
   or p_checkpoint->'rally'->>'kind' not in ('contact','reception') then raise exception 'Invalid turn owner' using errcode='22023'; end if;
 elsif p_status='completed' then
  if winning_team is null or winning_team not in ('home','away') or p_current_actor is not null or p_checkpoint->'rally'->>'kind' is distinct from 'point-end' then raise exception 'Invalid completion' using errcode='22023'; end if;
 else raise exception 'Invalid status' using errcode='22023'; end if;
 insert into public.async_match_actions(match_id,action_id,actor_id,request_hash,from_version,to_version,action,checkpoint,result,engine_version)
 values(m.id,p_action_id,p_actor,p_request_hash,m.version,m.version+1,p_action,p_checkpoint,jsonb_build_object('status',p_status,'current_action_user_id',p_current_actor,'last_result',p_last_result,'animation',p_animation),m.engine_version) returning * into r;
 update public.async_matches set checkpoint=p_checkpoint,version=m.version+1,status=p_status,current_action_user_id=p_current_actor,last_result=p_last_result,animation=p_animation,updated_at=now(),
  completed_at=case when p_status='completed' then now() end,
  winner_user_id=case winning_team when 'home' then m.home_user_id when 'away' then m.away_user_id end
 where id=m.id;
 return to_jsonb(r);
end $$;
