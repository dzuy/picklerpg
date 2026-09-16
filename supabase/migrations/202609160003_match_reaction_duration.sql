begin;
create or replace function public.get_match_trash_talk(p_match_id uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; result jsonb;
begin
 select * into m from public.async_matches where id=p_match_id;
 if not found or p_actor is null or p_actor not in(m.home_user_id,m.away_user_id) then raise exception 'Match not found' using errcode='P0002'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'player',player,'text',text,'version',version,'createdAt',created_at) order by created_at,id),'[]'::jsonb) into result
 from public.match_trash_talk where match_id=m.id and (version>=m.version-1 or created_at>clock_timestamp()-interval '5 seconds');
 return jsonb_build_object('messages',result,'serverTime',clock_timestamp());
end $$;
revoke all on function public.get_match_trash_talk(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_match_trash_talk(uuid,uuid) to service_role;
commit;
