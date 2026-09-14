-- Guest-first accounts, player cloud saves, and server-owned progression.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 24),
  catchphrase text check (catchphrase is null or char_length(catchphrase) <= 60),
  appearance jsonb not null,
  skills jsonb not null,
  handedness text not null check (handedness in ('left', 'right')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create unique index if not exists players_one_active_per_owner
  on public.players(owner_id) where is_active;

create table if not exists public.player_progress (
  owner_id uuid not null,
  player_id text not null,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  rating numeric(6, 2),
  unlocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_id, player_id),
  foreign key (owner_id, player_id) references public.players(owner_id, id) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.player_progress enable row level security;

revoke all on public.profiles, public.players, public.player_progress from anon;
revoke all on public.profiles, public.players, public.player_progress from authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.players to authenticated;
grant select on public.player_progress to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own" on public.players for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own" on public.players for insert to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists "players_update_own" on public.players;
create policy "players_update_own" on public.players for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "players_delete_own" on public.players;
create policy "players_delete_own" on public.players for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "progress_select_own" on public.player_progress;
create policy "progress_select_own" on public.player_progress for select to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at before update on public.players
for each row execute function public.touch_updated_at();
drop trigger if exists progress_touch_updated_at on public.player_progress;
create trigger progress_touch_updated_at before update on public.player_progress
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles(user_id)
select id from auth.users
on conflict do nothing;
