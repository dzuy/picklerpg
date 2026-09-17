-- One-time, destructive PickleBash reset requested by the project owner.
-- Run only in project vwdtfnljcjbyokdvjiea (picklebash).
-- Removes all users, including the owner's account, and their game data.
-- Keep this out of migrations: it must never run during normal deployment.
begin;
truncate table
 public.invite_events,
 public.friend_challenges,
 public.async_invitations,
 public.async_match_actions,
 public.match_trash_talk,
 public.match_nudges,
 public.turn_push_claims,
 public.async_matches,
 public.push_subscriptions,
 public.community_player_selections,
 public.player_progress,
 public.match_history,
 public.players,
 public.profiles;
delete from auth.users;
commit;

select 'users' as entity, count(*) as remaining from auth.users
union all select 'players', count(*) from public.players
union all select 'games', count(*) from public.async_matches
union all select 'invitations', count(*) from public.async_invitations
union all select 'link challenges', count(*) from public.friend_challenges;
