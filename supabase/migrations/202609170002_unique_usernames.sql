create table if not exists public.usernames (
 username text primary key check (username ~ '^[a-z0-9_]{3,24}$'),
 user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table public.usernames enable row level security;
revoke all on public.usernames from public, anon, authenticated;
grant select on public.usernames to service_role;
create or replace function public.sync_username() returns trigger
language plpgsql security definer set search_path='' as $$
declare handle text := lower(new.raw_user_meta_data->>'username');
begin
 delete from public.usernames where user_id=new.id and username is distinct from handle;
 if handle is not null then
  insert into public.usernames(username,user_id) values(handle,new.id)
  on conflict (user_id) do update set username=excluded.username;
 end if;
 return new;
end $$;
revoke all on function public.sync_username() from public,anon,authenticated;
create trigger sync_username after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_username();
insert into public.usernames(username,user_id)
select lower(raw_user_meta_data->>'username'),id from auth.users
where raw_user_meta_data->>'username' is not null;
