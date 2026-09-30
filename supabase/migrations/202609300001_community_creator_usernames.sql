begin;
-- Match the creator credit to the account handle shown in Community.
create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select c.public_id,
 c.player||jsonb_build_object('name',public.clean_player_text(c.player->>'name'),'catchphrase',public.clean_player_text(c.player->>'catchphrase')),
 public.clean_player_text(coalesce(nullif(btrim(n.username),''),c.creator_name)),c.added
 from public.community_player_catalog_before_safety(p_ids) c
 join public.players p on p.public_id=c.public_id
 left join public.usernames n on n.user_id=p.owner_id
 where not public.players_blocked(auth.uid(),p.owner_id);
$$;
notify pgrst,'reload schema';
commit;
