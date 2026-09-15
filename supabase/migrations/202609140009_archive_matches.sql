begin;
alter table public.async_matches
 add column archived_home boolean not null default false,
 add column archived_away boolean not null default false;
-- Archive is a participant's private list preference. It never changes the match or turn.
create function public.set_async_match_archived(p_id uuid,p_actor uuid,p_archived boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_archived is null then raise exception 'Choose archive or restore' using errcode='22023'; end if;
 update public.async_matches set
 archived_home=case when home_user_id=p_actor then p_archived else archived_home end,
 archived_away=case when away_user_id=p_actor then p_archived else archived_away end
 where id=p_id and p_actor in (home_user_id,away_user_id);
 if not found then raise exception 'Match not found' using errcode='P0002'; end if;
end;
$$;
revoke all on function public.set_async_match_archived(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_async_match_archived(uuid,uuid,boolean) to service_role;
commit;
