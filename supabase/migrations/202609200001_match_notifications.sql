begin;
alter table public.async_matches
 add column muted_home boolean not null default false,
 add column muted_away boolean not null default false;
-- Mute is a participant's private notification preference. It never changes the match or turn.
create function public.set_async_match_muted(p_id uuid,p_actor uuid,p_muted boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_muted is null then raise exception 'Choose mute or unmute' using errcode='22023'; end if;
 update public.async_matches set
 muted_home=case when home_user_id=p_actor then p_muted else muted_home end,
 muted_away=case when away_user_id=p_actor then p_muted else muted_away end
 where id=p_id and p_actor in (home_user_id,away_user_id);
 if not found then raise exception 'Match not found' using errcode='P0002'; end if;
end;
$$;
revoke all on function public.set_async_match_muted(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_async_match_muted(uuid,uuid,boolean) to service_role;
commit;
