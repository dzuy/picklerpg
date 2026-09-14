-- Use the same account player name as multiplayer signup and the opponent directory.
create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select p.public_id,jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.skills,'handedness',p.handedness),
 coalesce(nullif(btrim(u.raw_user_meta_data->>'player_name'),''),nullif(btrim(pr.display_name),''),'Community creator'),exists(select 1 from public.community_player_selections s where s.public_id=p.public_id and s.owner_id=auth.uid())
 from public.players p join auth.users u on u.id=p.owner_id left join public.profiles pr on pr.user_id=p.owner_id
 where p.is_public and (p_ids is null or p.public_id=any(p_ids)) order by p.name,p.public_id;
$$;
