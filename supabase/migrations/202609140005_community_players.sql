-- Public designs are opt-in; ownership and all existing write policies stay unchanged.
alter table public.players add column is_public boolean not null default false;
alter table public.players add column public_id uuid not null default gen_random_uuid() unique;
create index players_public_catalog on public.players(public_id) where is_public;
create table public.community_player_selections (
 owner_id uuid not null references auth.users(id) on delete cascade,
 public_id uuid not null references public.players(public_id) on delete cascade,
 primary key(owner_id,public_id)
);
alter table public.community_player_selections enable row level security;
revoke all on public.community_player_selections from public,anon,authenticated;
grant select,insert,delete on public.community_player_selections to authenticated;
create policy community_select_own on public.community_player_selections for select to authenticated using(owner_id=(select auth.uid()));
create function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select p.public_id,jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.skills,'handedness',p.handedness),
 coalesce(nullif(pr.display_name,''),'Community creator'),exists(select 1 from public.community_player_selections s where s.public_id=p.public_id and s.owner_id=auth.uid())
 from public.players p left join public.profiles pr on pr.user_id=p.owner_id
 where p.is_public and (p_ids is null or p.public_id=any(p_ids)) order by p.name,p.public_id;
$$;
revoke all on function public.community_player_catalog(uuid[]) from public;
grant execute on function public.community_player_catalog(uuid[]) to anon,authenticated,service_role;
create policy community_add_own on public.community_player_selections for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.community_player_catalog() c where c.public_id=community_player_selections.public_id));
create policy community_remove_own on public.community_player_selections for delete to authenticated using(owner_id=(select auth.uid()));
