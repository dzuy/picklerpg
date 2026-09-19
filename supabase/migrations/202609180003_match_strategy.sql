begin;
create table public.async_strategy_revisions (
 match_id uuid primary key references public.async_matches(id) on delete cascade,
 revision bigint not null default 0
);
create table public.async_match_strategies (
 match_id uuid not null references public.async_matches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 source_revision bigint not null,
 definition_version text not null,
 summary jsonb not null,
 primary key(match_id,user_id)
);
alter table public.async_strategy_revisions enable row level security;
alter table public.async_match_strategies enable row level security;
revoke all on public.async_strategy_revisions,public.async_match_strategies from public,anon,authenticated,service_role;
-- A revision changes even for a backfilled event. Cache writes use that revision
-- under the same row lock, so stale reducers cannot publish over newer history.
create function public.invalidate_async_strategy() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 target:=case when tg_op='DELETE' then old.match_id else new.match_id end;
 if not exists(select 1 from public.async_matches where id=target) then return null;end if;
 insert into public.async_strategy_revisions(match_id,revision) values(target,1)
 on conflict(match_id) do update set revision=public.async_strategy_revisions.revision+1;
 return new;
end $$;
create trigger invalidate_async_strategy after insert or update or delete on public.shot_selection_events for each row execute function public.invalidate_async_strategy();
create function public.get_async_strategy_source(p_match uuid,p_actor uuid,p_definition text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; r bigint; s jsonb; e jsonb;
begin
 select * into m from public.async_matches where id=p_match;
 if not found or (p_actor is distinct from m.home_user_id and p_actor is distinct from m.away_user_id) then raise exception 'Not found' using errcode='P0002';end if;
 if m.status<>'completed' or m.ended_by is not null or m.away_user_id is null then return null;end if;
 insert into public.async_strategy_revisions(match_id) values(p_match) on conflict do nothing;
 select revision into r from public.async_strategy_revisions where match_id=p_match for update;
 select summary into s from public.async_match_strategies where match_id=p_match and user_id=p_actor and source_revision=r and definition_version=p_definition;
 if found then return jsonb_build_object('summary',s);end if;
 select coalesce(jsonb_agg(jsonb_build_object('action_id',action_id,'to_version',to_version,'chooser_id',chooser_id,'team',team,'point_index',point_index,'intent',intent,'completeness',completeness,'capture',capture,'engine_version',engine_version) order by to_version),'[]'::jsonb) into e from public.shot_selection_events where match_id=p_match;
 return jsonb_build_object('revision',r,'expected',m.version,'events',e);
end $$;
create function public.save_async_strategy(p_match uuid,p_actor uuid,p_revision bigint,p_summary jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare r bigint;
begin
 if not exists(select 1 from public.async_matches where id=p_match and p_actor in(home_user_id,away_user_id) and status='completed' and ended_by is null and away_user_id is not null) then raise exception 'Not found' using errcode='P0002';end if;
 select revision into r from public.async_strategy_revisions where match_id=p_match for update;
 if r is null or r<>p_revision then return false;end if;
 if p_summary->>'definitionVersion' is distinct from 'strategy-1' then raise exception 'Invalid strategy definition';end if;
 insert into public.async_match_strategies values(p_match,p_actor,r,p_summary->>'definitionVersion',p_summary)
 on conflict(match_id,user_id) do update set source_revision=excluded.source_revision,definition_version=excluded.definition_version,summary=excluded.summary;
 return true;
end $$;
revoke all on function public.invalidate_async_strategy() from public,anon,authenticated,service_role;
revoke all on function public.get_async_strategy_source(uuid,uuid,text),public.save_async_strategy(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.get_async_strategy_source(uuid,uuid,text),public.save_async_strategy(uuid,uuid,bigint,jsonb) to service_role;
commit;
