begin;
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<=2048),
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_used_at timestamptz,
 active_until timestamptz
);
create index push_subscriptions_user on public.push_subscriptions(user_id);
-- All access goes through the bearer-authenticated Railway API. No browser key
-- can read endpoint/key material, including another user's subscriptions.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
grant all on public.push_subscriptions to service_role;
-- One watermark per match; concurrent retries and older receipts cannot alert twice.
create table public.turn_push_claims (
 match_id uuid primary key references public.async_matches(id) on delete cascade,
 version bigint not null
);
alter table public.turn_push_claims enable row level security;
revoke all on public.turn_push_claims from anon,authenticated;
grant all on public.turn_push_claims to service_role;
create function public.claim_turn_push(p_match_id uuid,p_version bigint,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.async_matches where id=p_match_id
   and version=p_version and status='active' and current_action_user_id=p_user_id
   and p_user_id in(home_user_id,away_user_id)) then return false; end if;
 insert into public.turn_push_claims values(p_match_id,p_version)
 on conflict(match_id) do update set version=excluded.version
 where public.turn_push_claims.version<excluded.version;
 return found;
end;
$$;
revoke all on function public.claim_turn_push(uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.claim_turn_push(uuid,bigint,uuid) to service_role;
commit;
