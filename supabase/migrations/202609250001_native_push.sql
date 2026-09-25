begin;
create table public.push_devices (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null default 'ios' check(platform='ios'),
 device_token text not null check(device_token ~ '^[a-f0-9]{64,200}$'),
 environment text not null check(environment in ('sandbox','production')),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 unique(environment,device_token)
);
create index push_devices_user on public.push_devices(user_id) where enabled;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon,authenticated;
grant all on public.push_devices to service_role;
-- Registration is atomic across token rotations and account switches on this installation.
create function public.register_push_device(p_id uuid,p_user_id uuid,p_token text,p_environment text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_environment||p_token,0));
 delete from public.push_devices where environment=p_environment and device_token=p_token and id<>p_id;
 insert into public.push_devices(id,user_id,device_token,environment) values(p_id,p_user_id,p_token,p_environment)
 on conflict(id) do update set user_id=excluded.user_id,device_token=excluded.device_token,
 environment=excluded.environment,enabled=true,updated_at=now(),last_seen_at=now();
end;
$$;
revoke all on function public.register_push_device(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.register_push_device(uuid,uuid,text,text) to service_role;
-- Durable dirty-user queue catches every mutation, including bots, end/leave and invitation RPCs.
create table public.push_badge_jobs (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision uuid not null default gen_random_uuid()
);
alter table public.push_badge_jobs enable row level security;
revoke all on public.push_badge_jobs from anon,authenticated;
grant all on public.push_badge_jobs to service_role;
create function public.queue_push_badges() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 for u in select distinct unnest(array[new.home_user_id,new.away_user_id,old.home_user_id,old.away_user_id]) loop
  if u is not null and exists(select 1 from auth.users where id=u) then
   insert into public.push_badge_jobs(user_id) values(u) on conflict(user_id) do update set revision=gen_random_uuid();
  end if;
 end loop;
 return null;
end;
$$;
create trigger async_match_push_badges after insert or update or delete on public.async_matches
 for each row execute function public.queue_push_badges();
create function public.turn_badge_count(p_user_id uuid) returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from public.async_matches where status='active' and current_action_user_id=p_user_id
 and p_user_id in(home_user_id,away_user_id) and (friend_state is null or friend_state='accepted');
$$;
revoke all on function public.turn_badge_count(uuid) from public,anon,authenticated;
grant execute on function public.turn_badge_count(uuid) to service_role;
commit;
