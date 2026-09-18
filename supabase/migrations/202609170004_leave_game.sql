begin;
alter table public.async_matches add column if not exists ended_by uuid references auth.users(id);
create or replace function public.leave_async_match(p_id uuid,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare m public.async_matches;
begin
 select * into m from public.async_matches where id=p_id and p_actor in(home_user_id,away_user_id) for update;
 if not found then raise exception 'Match not found' using errcode='P0002';end if;
 if m.status='active' then
  update public.async_matches set status='completed',current_action_user_id=null,completed_at=now(),updated_at=now(),ended_by=p_actor,
   winner_user_id=case when home_user_id=p_actor then coalesce(away_user_id,home_user_id) else home_user_id end,
   version=version+1,checkpoint=jsonb_set(checkpoint,'{revision}',to_jsonb(version+1)),animation='[]',last_result=null,
   archived_home=archived_home or home_user_id=p_actor,archived_away=archived_away or coalesce(away_user_id=p_actor,false)
  where id=p_id;
 else
  perform public.set_async_match_archived(p_id,p_actor,true);
 end if;
end;
$$;
revoke all on function public.leave_async_match(uuid,uuid) from public,anon,authenticated;
grant execute on function public.leave_async_match(uuid,uuid) to service_role;
commit;
