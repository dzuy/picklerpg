begin;
-- Private analytics only. Solo reports are not authoritative game results or XP inputs.
create table public.gameplay_rallies (
 source text not null check(source in ('solo-client','friends-server')),
 owner_id uuid not null references auth.users(id) on delete cascade,
 game_id uuid not null,
 point_index integer not null check(point_index between 0 and 100000),
 revision bigint not null check(revision between 0 and 9007199254740991),
 definition_version text not null,
 record jsonb not null,
 first_received_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(source,owner_id,game_id,point_index)
);
create index gameplay_rallies_cohort on public.gameplay_rallies(definition_version,source,first_received_at);
alter table public.gameplay_rallies enable row level security;
revoke all on public.gameplay_rallies from public,anon,authenticated,service_role;
grant select on public.gameplay_rallies to service_role;

create function public.store_gameplay_record(p_source text,p_owner uuid,p_record jsonb,p_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_owner is null or p_record is null or jsonb_typeof(p_record) is distinct from 'object'
 or octet_length(p_record::text)>1048576 or p_record->>'schemaVersion' is distinct from '1'
 or coalesce(p_record->>'definitionVersion','') !~ '^gameplay-[a-zA-Z0-9.-]{1,60}$'
 or jsonb_typeof(p_record->'events') is distinct from 'array'
 or jsonb_typeof(p_record->'executions') is distinct from 'array'
 or jsonb_typeof(p_record->'roster') is distinct from 'object'
 or jsonb_typeof(p_record->'complete') is distinct from 'boolean'
 or jsonb_typeof(p_record->'gameComplete') is distinct from 'boolean'
 or (p_record ? 'endedEarly' and jsonb_typeof(p_record->'endedEarly') is distinct from 'boolean')
 or p_record->>'gameId' is null or p_record->>'pointIndex' is null then raise exception 'Invalid gameplay record';end if;
 if jsonb_array_length(p_record->'events')>10000 or jsonb_array_length(p_record->'executions')>2000 then raise exception 'Gameplay record too large';end if;
 if coalesce(p_record->>'pointIndex','') !~ '^[0-9]{1,6}$'
 or coalesce(p_record#>>'{score,home}','') !~ '^[0-9]{1,6}$'
 or coalesce(p_record#>>'{score,away}','') !~ '^[0-9]{1,6}$'
 or exists(select 1 from jsonb_array_elements(p_record->'events') e where
  coalesce(e->>'type','') not in ('rally-start','contact','shot','bounce','point-end')
  or (e->>'type'='shot' and (coalesce(e->>'shotIndex','') !~ '^[0-9]{1,6}$'
   or coalesce(e#>>'{intent,type}','') not in ('serve','return','drive','drop','dink','reset','volley','counter','overhead','block','lob','flick')
   or coalesce(e#>>'{intent,actor}','') not in ('you','partner','opponent-left','opponent-right')
   or (e#>'{intent,power}' is not null and jsonb_typeof(e#>'{intent,power}') is distinct from 'number'))))
 or exists(select 1 from jsonb_array_elements(p_record->'executions') e where coalesce(e->>'shotIndex','') !~ '^[0-9]{1,6}$')
 then raise exception 'Invalid gameplay fields';end if;
 if exists(select 1 from jsonb_array_elements(p_record->'events') e where e->>'type'='shot' and ((e#>>'{intent,power}')::numeric<0 or (e#>>'{intent,power}')::numeric>1)) then raise exception 'Invalid gameplay power';end if;
 insert into public.gameplay_rallies(source,owner_id,game_id,point_index,revision,definition_version,record)
 values(p_source,p_owner,(p_record->>'gameId')::uuid,(p_record->>'pointIndex')::integer,p_revision,p_record->>'definitionVersion',p_record)
 on conflict(source,owner_id,game_id,point_index) do update set
 revision=excluded.revision,definition_version=excluded.definition_version,updated_at=now(),
 record=jsonb_set(excluded.record,'{executions}',coalesce((
  select jsonb_agg(value order by key::integer) from jsonb_each(coalesce((
   select jsonb_object_agg(e->>'shotIndex',e) from jsonb_array_elements(gameplay_rallies.record->'executions') e
  ),'{}'::jsonb) || coalesce((select jsonb_object_agg(e->>'shotIndex',e) from jsonb_array_elements(excluded.record->'executions') e),'{}'::jsonb))
 ),excluded.record->'executions'))
 where excluded.revision>=gameplay_rallies.revision
 and jsonb_array_length(excluded.record->'events')>=jsonb_array_length(gameplay_rallies.record->'events')
 and (not (gameplay_rallies.record->>'complete')::boolean or (excluded.record->>'complete')::boolean);
end $$;
revoke all on function public.store_gameplay_record(text,uuid,jsonb,bigint) from public,anon,authenticated,service_role;

create function public.record_solo_gameplay(p_record jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in';end if;
 perform public.store_gameplay_record('solo-client',auth.uid(),p_record,(p_record->>'revision')::bigint);
end $$;
revoke all on function public.record_solo_gameplay(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.record_solo_gameplay(jsonb) to authenticated;

-- The selection capture is made before nextPoint, so the closing rally is never lost.
create function public.capture_gameplay_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; r jsonb;
begin
 r:=new.selection_capture->'gameplay';
 if r is null then return new;end if;
 select * into strict m from public.async_matches where id=new.match_id;
 if r->>'gameId' is distinct from new.match_id::text then raise exception 'Gameplay match mismatch';end if;
 r:=r||jsonb_build_object('accountControllers',jsonb_build_object(
 'home',case when exists(select 1 from auth.users where id=m.home_user_id and raw_app_meta_data->>'community_bot'='true') then 'computer' else 'human' end,
 'away',case when exists(select 1 from auth.users where id=m.away_user_id and raw_app_meta_data->>'community_bot'='true') then 'computer' else 'human' end));
 perform public.store_gameplay_record('friends-server',m.home_user_id,r,new.to_version);
 return new;
end $$;
revoke all on function public.capture_gameplay_record() from public,anon,authenticated,service_role;
create trigger capture_gameplay_record after insert on public.async_match_actions for each row execute function public.capture_gameplay_record();

-- Ending an existing Friends game early does not create a new shot action.
create function public.capture_gameplay_early_end() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.ended_by is not null and old.ended_by is null then
  update public.gameplay_rallies set record=record||jsonb_build_object('endedEarly',true),updated_at=now()
  where source='friends-server' and owner_id=new.home_user_id and game_id=new.id
   and point_index=(select max(point_index) from public.gameplay_rallies where source='friends-server' and owner_id=new.home_user_id and game_id=new.id);
 end if;
 return new;
end $$;
revoke all on function public.capture_gameplay_early_end() from public,anon,authenticated,service_role;
create trigger capture_gameplay_early_end after update of ended_by on public.async_matches for each row execute function public.capture_gameplay_early_end();

create view public.gameplay_shots as
select r.source,r.owner_id,r.game_id,r.point_index,r.definition_version,r.first_received_at,
 e->>'shotIndex' as shot_index,e#>>'{intent,actor}' as hitter,e#>>'{intent,type}' as shot_type,
 coalesce((e#>>'{intent,power}')::numeric,.5) as power,
 e#>>'{intent,source}' as input_source,e#>'{intent,target}' as target,e#>'{intent,spin}' as spin,
 e->'contact' as contact,r.record->'roster' as roster,r.record->'rules' as rules,
 lag(e#>>'{intent,type}') over(partition by r.source,r.owner_id,r.game_id,r.point_index order by (e->>'shotIndex')::integer) as previous_shot_type
from public.gameplay_rallies r cross join lateral jsonb_array_elements(r.record->'events') e
where e->>'type'='shot';

create view public.gameplay_games as
select source,owner_id,game_id,definition_version,min(first_received_at) as first_received_at,
 count(*) as recorded_rallies,min(point_index) as first_recorded_point,max(point_index) as last_recorded_point,
 bool_or((record->>'gameComplete')::boolean) as game_complete,
 bool_or(coalesce((record->>'endedEarly')::boolean,false)) as ended_early,
 min(point_index)=0 and count(*)=max(point_index)+1 and bool_and((record->>'complete')::boolean) and bool_or((record->>'gameComplete')::boolean) as complete_event_coverage,
 max((record#>>'{score,home}')::integer) as home_score,max((record#>>'{score,away}')::integer) as away_score,
 sum((select count(*) from jsonb_array_elements(record->'events') e where e->>'type'='shot')) as shots
from public.gameplay_rallies group by source,owner_id,game_id,definition_version;
revoke all on public.gameplay_shots,public.gameplay_games from public,anon,authenticated,service_role;
grant select on public.gameplay_shots,public.gameplay_games to service_role;
commit;
