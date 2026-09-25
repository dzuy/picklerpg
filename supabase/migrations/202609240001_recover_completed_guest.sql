-- A completed guest match must transfer its winner and rivalry history with the seat.
create or replace function public.recover_guest_challenge(p_token text,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.friend_challenges; m public.async_matches; old_guest boolean; new_guest boolean;
begin
 select * into i from public.friend_challenges where token=p_token for update;
 if not found or i.status<>'accepted' or not i.recipient_is_guest or i.inviter_id=p_actor then
  raise exception 'Guest recovery unavailable' using errcode='PT409';
 end if;
 select is_anonymous into old_guest from auth.users where id=i.claimed_user_id for update;
 select is_anonymous into new_guest from auth.users where id=p_actor for update;
 if old_guest is distinct from true or new_guest is distinct from true then
  raise exception 'Sign in to the account that joined this game' using errcode='PT409';
 end if;
 select * into m from public.async_matches where id=i.match_id for update;
 if m.away_user_id is distinct from i.claimed_user_id or m.friend_state<>'accepted' then
  raise exception 'Guest recovery unavailable' using errcode='PT409';
 end if;
 if i.claimed_user_id=p_actor then return to_jsonb(i); end if;
 update public.async_matches set away_user_id=p_actor,
 current_action_user_id=case when current_action_user_id=i.claimed_user_id then p_actor else current_action_user_id end,
 winner_user_id=case when winner_user_id=i.claimed_user_id then p_actor else winner_user_id end,
 updated_at=now() where id=i.match_id;
 update public.friend_challenges set claimed_user_id=p_actor where id=i.id returning * into i;
 if m.status='completed' and m.ended_by is null then
  perform public.rebuild_async_rivalry(m.home_user_id,m.away_user_id);
  perform public.rebuild_async_rivalry(m.home_user_id,p_actor);
 end if;
 return to_jsonb(i);
end $$;
revoke all on function public.recover_guest_challenge(text,uuid) from public,anon,authenticated;
grant execute on function public.recover_guest_challenge(text,uuid) to service_role;
