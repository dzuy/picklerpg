begin;
create or replace function public.get_async_strategy_source(p_match uuid,p_actor uuid,p_definition text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.async_matches; r bigint; s jsonb; e jsonb;
begin
 select * into m from public.async_matches where id=p_match;
 if not found or (p_actor is distinct from m.home_user_id and p_actor is distinct from m.away_user_id) then raise exception 'Not found' using errcode='P0002';end if;
 if m.status<>'completed' or m.ended_by is not null or m.away_user_id is null then return null;end if;
 insert into public.async_strategy_revisions(match_id) values(p_match) on conflict do nothing;
 select revision into r from public.async_strategy_revisions where match_id=p_match for update;
 select summary into s from public.async_match_strategies where match_id=p_match and user_id=p_actor and source_revision=r and definition_version=p_definition;
 if found then return jsonb_build_object('summary',s);end if;
 select coalesce(jsonb_agg(jsonb_build_object('action_id',action_id,'to_version',to_version,'chooser_id',chooser_id,'team',team,'point_index',point_index,'intent',intent,'completeness',completeness,'capture',capture,'engine_version',engine_version,'athlete_design_id',athlete_design_id) order by to_version),'[]'::jsonb) into e from public.shot_selection_events where match_id=p_match;
 return jsonb_build_object('revision',r,'expected',m.version,'events',e);
end $$;
create or replace function public.save_async_strategy(p_match uuid,p_actor uuid,p_revision bigint,p_summary jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare r bigint;
begin
 if not exists(select 1 from public.async_matches where id=p_match and p_actor in(home_user_id,away_user_id) and status='completed' and ended_by is null and away_user_id is not null) then raise exception 'Not found' using errcode='P0002';end if;
 select revision into r from public.async_strategy_revisions where match_id=p_match for update;
 if r is null or r<>p_revision then return false;end if;
 if p_summary->>'definitionVersion' is distinct from 'strategy-2' then raise exception 'Invalid strategy definition';end if;
 insert into public.async_match_strategies values(p_match,p_actor,r,p_summary->>'definitionVersion',p_summary)
 on conflict(match_id,user_id) do update set source_revision=excluded.source_revision,definition_version=excluded.definition_version,summary=excluded.summary;
 return true;
end $$;
-- Slim private pages. No checkpoints or raw selections leave this function.
create function public.get_async_shot_mix_page(p_actor uuid,p_before timestamptz,p_cursor_time timestamptz default null,p_cursor_id uuid default null)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_to_json(page) order by page.completed_at desc,page.id desc),'[]'::jsonb) from (
 select m.id,m.completed_at,m.engine_version,m.checkpoint->'rules' as rules,
 case when m.home_user_id=p_actor then m.away_user_id else m.home_user_id end as opponent_id,
 jsonb_build_object(
 coalesce(m.checkpoint#>>array['roster',case when m.home_user_id=p_actor then 'you' else 'opponent-left' end,'design','id'],'__unknown__'),coalesce(m.checkpoint#>>array['roster',case when m.home_user_id=p_actor then 'you' else 'opponent-left' end,'design','name'],'Unknown athlete'),
 coalesce(m.checkpoint#>>array['roster',case when m.home_user_id=p_actor then 'partner' else 'opponent-right' end,'design','id'],'__unknown__'),coalesce(m.checkpoint#>>array['roster',case when m.home_user_id=p_actor then 'partner' else 'opponent-right' end,'design','name'],'Unknown athlete')) as athletes,
 case when s.source_revision=coalesce(r.revision,0) and s.definition_version='strategy-2' then s.summary else null end as summary
 from public.async_matches m left join public.async_strategy_revisions r on r.match_id=m.id
 left join public.async_match_strategies s on s.match_id=m.id and s.user_id=p_actor
 where p_actor in(m.home_user_id,m.away_user_id) and m.status='completed' and m.ended_by is null and m.away_user_id is not null
 and m.completed_at<=p_before and (p_cursor_time is null or (m.completed_at,m.id)<(p_cursor_time,p_cursor_id))
 order by m.completed_at desc,m.id desc limit 50
 ) page;
$$;
revoke all on function public.get_async_shot_mix_page(uuid,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.get_async_shot_mix_page(uuid,timestamptz,timestamptz,uuid) to service_role;
commit;
