begin;
-- One actionable item per playable turn or incoming invitation, never sent invites.
create or replace function public.turn_badge_count(p_user_id uuid) returns bigint
language sql stable security definer set search_path='' as $$
 select
  (select count(*) from public.async_matches where status='active' and current_action_user_id=p_user_id
   and p_user_id in(home_user_id,away_user_id) and (friend_state is null or friend_state='accepted'))
  + (select count(*) from public.async_invitations where recipient_id=p_user_id and status='pending');
$$;
create function public.queue_invitation_badges() returns trigger
language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 for u in select distinct unnest(array[new.recipient_id,old.recipient_id]) loop
  if u is not null and exists(select 1 from auth.users where id=u) then
   insert into public.push_badge_jobs(user_id) values(u)
   on conflict(user_id) do update set revision=gen_random_uuid();
  end if;
 end loop;
 return null;
end;
$$;
create trigger async_invitation_push_badges after insert or update or delete on public.async_invitations
 for each row execute function public.queue_invitation_badges();
revoke all on function public.queue_invitation_badges() from public,anon,authenticated;
-- Refresh existing installations, including invitations created before this change.
insert into public.push_badge_jobs(user_id)
 select distinct recipient_id from public.async_invitations where status='pending'
 on conflict(user_id) do update set revision=gen_random_uuid();
commit;
