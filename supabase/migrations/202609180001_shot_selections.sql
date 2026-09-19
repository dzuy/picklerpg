-- Private selection facts are committed with the existing action receipt.
-- Deploy this migration before the server. Older servers still create selected_only events.
begin;
alter table public.async_match_actions add column selection_capture jsonb;
create table public.shot_selection_events (
 match_id uuid not null,
 action_id uuid not null,
 from_version bigint not null,
 to_version bigint not null,
 chooser_id uuid not null references auth.users(id),
 opponent_id uuid references auth.users(id),
 team text not null check(team in ('home','away')),
 hitter_slot text not null check(hitter_slot in ('you','partner','opponent-left','opponent-right')),
 athlete_design_id text,
 point_index integer,
 pre_score jsonb,
 serving_state jsonb,
 rules jsonb,
 intent jsonb not null,
 timing text check(timing in ('air','bounce')),
 input_source_quality text not null default 'normalized' check(input_source_quality='normalized'),
 engine_version text not null,
 completeness text not null check(completeness in ('complete','selected_only')),
 provenance text not null check(provenance in ('live','backfill')),
 capture jsonb,
 point_result jsonb,
 created_at timestamptz not null,
 primary key(match_id,action_id),
 unique(match_id,to_version),
 foreign key(match_id,action_id) references public.async_match_actions(match_id,action_id) on delete cascade,
 check(to_version=from_version+1),
 check((completeness='complete' and capture is not null) or (completeness='selected_only' and capture is null))
);
create index shot_selection_events_chooser on public.shot_selection_events(chooser_id,created_at,match_id);
alter table public.shot_selection_events enable row level security;
revoke all on public.shot_selection_events from public,anon,authenticated,service_role;
grant select on public.shot_selection_events to service_role;

-- The locked match still contains the authoritative PRE-action checkpoint here.
create function public.capture_shot_selection() returns trigger
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; c jsonb; t text;
begin
 select * into strict m from public.async_matches where id=new.match_id;
 c:=m.checkpoint;t:=case when new.actor_id=m.home_user_id then 'home' else 'away' end;
 insert into public.shot_selection_events(match_id,action_id,from_version,to_version,chooser_id,opponent_id,team,hitter_slot,athlete_design_id,point_index,pre_score,serving_state,rules,intent,timing,engine_version,completeness,provenance,capture,point_result,created_at)
 values(new.match_id,new.action_id,new.from_version,new.to_version,new.actor_id,
 case when t='home' then m.away_user_id else m.home_user_id end,t,new.action#>>'{intent,actor}',
 c#>>array['roster',new.action#>>'{intent,actor}','design','id'],(c->>'pointIndex')::integer,
 c#>'{scoring,score}',c->'scoring',c->'rules',new.action->'intent',new.action->>'timing',new.engine_version,
 case when new.selection_capture is null then 'selected_only' else 'complete' end,'live',new.selection_capture,new.result->'last_result',new.created_at);
 return new;
end $$;
create trigger capture_shot_selection after insert on public.async_match_actions for each row execute function public.capture_shot_selection();
revoke all on function public.capture_shot_selection() from public,anon,authenticated,service_role;

-- Keep the original call shape through the default argument, without ambiguous overloads.
drop function public.commit_async_match_action(uuid,uuid,uuid,text,bigint,jsonb,uuid,text,jsonb,jsonb,jsonb);
create function public.commit_async_match_action(p_match_id uuid,p_actor uuid,p_action_id uuid,p_request_hash text,p_expected_version bigint,p_checkpoint jsonb,p_current_actor uuid,p_status text,p_last_result jsonb,p_animation jsonb,p_action jsonb,p_selection jsonb default null)
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
 if p_selection is not null and (
  p_selection->>'schemaVersion' is distinct from '1'
  or p_selection->>'definitionVersion' is distinct from 'selection-1'
  or p_selection->>'pointIndex' is distinct from m.checkpoint->>'pointIndex'
  or p_selection->>'completedContacts' is distinct from jsonb_array_length(m.checkpoint#>'{rally,state,shotHistory}')::text
  or jsonb_typeof(p_selection->'offered') is distinct from 'array'
  or jsonb_typeof(p_selection->'contexts') is distinct from 'array'
  or jsonb_typeof(p_selection->'execution') is distinct from 'object'
  or p_selection#>'{execution,pointResult}' is distinct from coalesce(p_last_result,'null'::jsonb)
 ) then raise exception 'Invalid selection capture' using errcode='22023'; end if;
 insert into public.async_match_actions(match_id,action_id,actor_id,request_hash,from_version,to_version,action,checkpoint,result,engine_version,selection_capture)
 values(m.id,p_action_id,p_actor,p_request_hash,m.version,m.version+1,p_action,p_checkpoint,jsonb_build_object('status',p_status,'current_action_user_id',p_current_actor,'last_result',p_last_result,'animation',p_animation,'completed_at',case when p_status='completed' then now() end,'archived_home',m.archived_home,'archived_away',m.archived_away),m.engine_version,p_selection) returning * into r;
 update public.async_matches set checkpoint=p_checkpoint,version=m.version+1,status=p_status,current_action_user_id=p_current_actor,last_result=p_last_result,animation=p_animation,updated_at=now(),
  completed_at=case when p_status='completed' then now() end,
  winner_user_id=case winning_team when 'home' then m.home_user_id when 'away' then m.away_user_id end
 where id=m.id;
 return to_jsonb(r);
end $$;

revoke all on function public.commit_async_match_action(uuid,uuid,uuid,text,bigint,jsonb,uuid,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_async_match_action(uuid,uuid,uuid,text,bigint,jsonb,uuid,text,jsonb,jsonb,jsonb,jsonb) to service_role;

-- Resumable bounded backfill. Do not reconstruct historical menus with today's engine.
-- A predecessor receipt supplies some old context; absent context stays NULL.
create function public.backfill_shot_selections(p_limit integer default 1000) returns integer
language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 if p_limit is null or p_limit<1 or p_limit>10000 then raise exception 'Invalid batch size';end if;
 insert into public.shot_selection_events(match_id,action_id,from_version,to_version,chooser_id,opponent_id,team,hitter_slot,athlete_design_id,point_index,pre_score,serving_state,rules,intent,timing,engine_version,completeness,provenance,capture,point_result,created_at)
 select a.match_id,a.action_id,a.from_version,a.to_version,a.actor_id,
 case when a.actor_id=m.home_user_id then m.away_user_id else m.home_user_id end,
 case when a.actor_id=m.home_user_id then 'home' else 'away' end,a.action#>>'{intent,actor}',
 a.checkpoint#>>array['roster',a.action#>>'{intent,actor}','design','id'],
 (p.checkpoint->>'pointIndex')::integer,p.checkpoint#>'{scoring,score}',p.checkpoint->'scoring',a.checkpoint->'rules',a.action->'intent',a.action->>'timing',a.engine_version,
 'selected_only','backfill',null,a.result->'last_result',a.created_at
 from public.async_match_actions a join public.async_matches m on m.id=a.match_id
 left join public.async_match_actions p on p.match_id=a.match_id and p.to_version=a.from_version
 where not exists(select 1 from public.shot_selection_events e where e.match_id=a.match_id and e.action_id=a.action_id)
 order by a.match_id,a.to_version limit p_limit on conflict do nothing;
 get diagnostics inserted=row_count;return inserted;
end $$;
revoke all on function public.backfill_shot_selections(integer) from public,anon,authenticated;
grant execute on function public.backfill_shot_selections(integer) to service_role;
commit;
