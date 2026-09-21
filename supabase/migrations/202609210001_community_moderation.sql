-- Moderation is separate from owner sharing and cannot be overwritten by player sync.
create table public.community_player_moderation (
 public_id uuid primary key references public.players(public_id) on delete cascade,
 hidden_by uuid not null references auth.users(id),
 hidden_at timestamptz not null default now()
);
alter table public.community_player_moderation enable row level security;
revoke all on public.community_player_moderation from public,anon,authenticated;

create function public.is_community_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'community_admin'='true');
$$;
revoke all on function public.is_community_admin() from public,anon;
grant execute on function public.is_community_admin() to authenticated;

create function public.remove_player_from_community(p_public_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_community_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if not exists(select 1 from public.players where public_id=p_public_id and is_public) then raise exception 'Public player not found'; end if;
 insert into public.community_player_moderation(public_id,hidden_by) values(p_public_id,auth.uid()) on conflict(public_id) do nothing;
end;
$$;
revoke all on function public.remove_player_from_community(uuid) from public,anon;
grant execute on function public.remove_player_from_community(uuid) to authenticated;

create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select p.public_id,jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.skills,'handedness',p.handedness),
 coalesce(nullif(btrim(u.raw_user_meta_data->>'player_name'),''),nullif(btrim(pr.display_name),''),'Community creator'),exists(select 1 from public.community_player_selections s where s.public_id=p.public_id and s.owner_id=auth.uid())
 from public.players p join auth.users u on u.id=p.owner_id left join public.profiles pr on pr.user_id=p.owner_id
 where p.is_public and (p_ids is null or p.public_id=any(p_ids))
 and (not exists(select 1 from public.community_player_moderation m where m.public_id=p.public_id)
 -- Explicit references keep existing games/rosters working; discovery never exposes hidden players.
 or p_ids is not null
 or exists(select 1 from public.community_player_selections s where s.public_id=p.public_id and s.owner_id=auth.uid()))
 order by p.name,p.public_id;
$$;

-- A direct API insert must not bypass moderation (including an old/stale catalog).
create function public.community_player_is_available(p_public_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.players p where p.public_id=p_public_id and p.is_public
 and not exists(select 1 from public.community_player_moderation m where m.public_id=p.public_id));
$$;
revoke all on function public.community_player_is_available(uuid) from public,anon;
grant execute on function public.community_player_is_available(uuid) to authenticated;
drop policy community_add_own on public.community_player_selections;
create policy community_add_own on public.community_player_selections for insert to authenticated
with check(owner_id=(select auth.uid()) and public.community_player_is_available(public_id));
