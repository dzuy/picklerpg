begin;
create index if not exists async_matches_home_created on public.async_matches(home_user_id,created_at desc,id desc);
create index if not exists async_matches_away_created on public.async_matches(away_user_id,created_at desc,id desc);
-- Service-only bounded projection. No checkpoint, secret, trajectory, or action history leaves SQL.
create function public.list_match_summaries(p_actor uuid,p_filter text,p_before_time timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or p_filter not in ('active','turn','completed','archived') then raise exception 'Invalid game filter';end if;
 select coalesce(jsonb_agg(summary order by created_at desc,id desc),'[]'::jsonb) into result from (
 select m.created_at,m.id,jsonb_build_object(
 'id',m.id,'version',m.version,'createdAt',m.created_at,'completedAt',m.completed_at,'status',m.status,
 'viewerTeam',case when m.home_user_id=p_actor then 'home' else 'away' end,
 'currentTeam',case when m.status<>'active' or m.friend_state in ('pending','cancelled') then null when m.current_action_user_id=m.home_user_id then 'home' when m.current_action_user_id=m.away_user_id then 'away' end,
 'accountIds',jsonb_build_object('home',m.home_user_id,'away',m.away_user_id),
 'archived',case when m.home_user_id=p_actor then m.archived_home else m.archived_away end,
 'endedEarly',m.ended_by is not null,'friendState',m.friend_state,'invitedName',m.invited_name,
 'court',coalesce(m.checkpoint->>'court','forest'),'courtTheme',coalesce(m.checkpoint->>'courtTheme','none'),
 'rules',m.checkpoint->'rules','score',m.checkpoint->'scoring'->'score',
 'roster',jsonb_build_object('you',m.checkpoint->'roster'->'you'->'design','partner',m.checkpoint->'roster'->'partner'->'design','opponent-left',m.checkpoint->'roster'->'opponent-left'->'design','opponent-right',m.checkpoint->'roster'->'opponent-right'->'design')
 ) as summary
 from public.async_matches m
 where p_actor in (m.home_user_id,m.away_user_id) and m.friend_state is distinct from 'cancelled'
 and (p_before_time is null or (m.created_at,m.id)<(p_before_time,p_before_id))
 and case when p_filter='archived' then case when m.home_user_id=p_actor then m.archived_home else m.archived_away end
 else not (case when m.home_user_id=p_actor then m.archived_home else m.archived_away end)
 and m.status=case when p_filter='completed' then 'completed' else 'active' end
 and (p_filter<>'turn' or (m.current_action_user_id=p_actor and m.friend_state is distinct from 'pending')) end
 order by m.created_at desc,m.id desc limit 51
 ) page;
 return result;
end $$;
revoke all on function public.list_match_summaries(uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_match_summaries(uuid,text,timestamptz,uuid) to service_role;
notify pgrst,'reload schema';
commit;
