begin;
-- Independent sources: revoking a promotion never cancels a paid membership.
create table public.premium_memberships (
 owner_id uuid not null references auth.users(id) on delete cascade,
 source text not null check(source in ('revenuecat','stripe','complimentary','legacy_analysis')),
 active boolean not null default false,
 expires_at timestamptz,
 observed_at timestamptz not null,
 primary key(owner_id,source)
);
create table public.premium_grant_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 administrator_id uuid references auth.users(id) on delete set null,
 active boolean not null,
 expires_at timestamptz,
 reason text not null check(length(reason) between 1 and 200),
 created_at timestamptz not null default now()
);
create table public.premium_tester_cohort (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 captured_at timestamptz not null default now()
);
create table public.billing_customers (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text not null unique
);
create table public.premium_configuration (
 singleton boolean primary key default true check(singleton),
 enforcement_enabled boolean not null default false
);
insert into public.premium_configuration default values;
alter table public.premium_memberships enable row level security;
alter table public.premium_grant_audit enable row level security;
alter table public.premium_tester_cohort enable row level security;
alter table public.billing_customers enable row level security;
alter table public.premium_configuration enable row level security;
revoke all on public.premium_memberships,public.premium_grant_audit,public.premium_tester_cohort,public.billing_customers,public.premium_configuration from public,anon,authenticated;
grant select,insert,update on public.premium_memberships,public.billing_customers to service_role;
grant select on public.premium_grant_audit,public.premium_tester_cohort,public.premium_configuration to service_role;

create function public.premium_active(p_owner uuid,p_analysis_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.premium_memberships where owner_id=p_owner and active
 and (expires_at is null or expires_at>now()) and (source<>'legacy_analysis' or p_analysis_only))
$$;
create function public.premium_enforced()
returns boolean language sql stable security definer set search_path='' as $$
 select enforcement_enabled from public.premium_configuration where singleton
$$;
-- Provider refreshes can finish in a different order than they started.
create function public.update_premium_provider(p_owner uuid,p_source text,p_active boolean,p_expires timestamptz,p_observed timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_source not in ('revenuecat','stripe') then raise exception 'Invalid billing source'; end if;
 insert into public.premium_memberships values(p_owner,p_source,p_active,p_expires,p_observed)
 on conflict(owner_id,source) do update set active=excluded.active,expires_at=excluded.expires_at,observed_at=excluded.observed_at
 where premium_memberships.observed_at<excluded.observed_at;
end $$;
create function public.grant_premium(p_owner uuid,p_administrator uuid,p_active boolean,p_expires timestamptz,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.premium_memberships values(p_owner,'complimentary',p_active,p_expires,clock_timestamp())
 on conflict(owner_id,source) do update set active=excluded.active,expires_at=excluded.expires_at,observed_at=excluded.observed_at;
 insert into public.premium_grant_audit(owner_id,administrator_id,active,expires_at,reason) values(p_owner,p_administrator,p_active,p_expires,p_reason);
end $$;
-- Fixed cutoff: later deploys and future registrations cannot enlarge this cohort.
insert into public.premium_tester_cohort(owner_id)
 select id from auth.users where created_at<'2026-09-29T05:13:25Z'
 and raw_app_meta_data->>'multiplayer_playtest'='true'
 and coalesce(raw_app_meta_data->>'community_bot','false')<>'true';
insert into public.premium_memberships
 select owner_id,'complimentary',true,null,now() from public.premium_tester_cohort;
insert into public.premium_grant_audit(owner_id,active,reason)
 select owner_id,true,'Launch tester cohort: registered before 2026-09-29 05:13:25 UTC' from public.premium_tester_cohort;
-- Preserve the old analysis-only permission without claiming a purchase/global access.
insert into public.premium_memberships
 select id,'legacy_analysis',true,null,now() from auth.users where raw_app_meta_data->>'full_game_analysis'='true';
revoke all on function public.premium_active(uuid,boolean),public.premium_enforced(),public.update_premium_provider(uuid,text,boolean,timestamptz,timestamptz),public.grant_premium(uuid,uuid,boolean,timestamptz,text) from public,anon,authenticated;
grant execute on function public.premium_active(uuid,boolean),public.premium_enforced(),public.update_premium_provider(uuid,text,boolean,timestamptz,timestamptz),public.grant_premium(uuid,uuid,boolean,timestamptz,text) to service_role;
commit;
