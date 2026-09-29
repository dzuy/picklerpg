begin;
-- Permanent ownership is independent for each provider and each pack.
create table public.pack_catalog(id text primary key);
insert into public.pack_catalog values('style'),('court'),('fun'),('everything');
create table public.pack_bundle_contents(bundle_id text references public.pack_catalog,pack_id text references public.pack_catalog,primary key(bundle_id,pack_id),check(bundle_id<>pack_id));
insert into public.pack_bundle_contents values('everything','style'),('everything','court'),('everything','fun');
create table public.pack_ownership(
 owner_id uuid references auth.users on delete cascade,
 source text check(source in ('revenuecat','stripe','complimentary')),
 pack_id text references public.pack_catalog,
 active boolean not null,
 observed_at timestamptz not null,
 primary key(owner_id,source,pack_id)
);
create table public.pack_provider_snapshots(owner_id uuid references auth.users on delete cascade,source text check(source in ('revenuecat','stripe')),observed_at timestamptz not null,primary key(owner_id,source));
create table public.pack_grant_audit(id bigint generated always as identity primary key,owner_id uuid references auth.users on delete cascade,administrator_id uuid references auth.users on delete set null,pack_id text references public.pack_catalog,active boolean not null,reason text not null check(length(reason) between 1 and 200),created_at timestamptz not null default now());
create table public.pack_courts(court text primary key,pack_id text not null references public.pack_catalog);
insert into public.pack_courts values('city','court'),('glowball','court'),('jungle','court'),('winter','court'),('autumn','court');
create function public.pack_owned(p_owner uuid,p_pack text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pack_ownership o where o.owner_id=p_owner and o.active and (o.pack_id=p_pack or exists(select 1 from public.pack_bundle_contents b where b.bundle_id=o.pack_id and b.pack_id=p_pack)))
$$;
create function public.update_pack_provider(p_owner uuid,p_source text,p_packs text[],p_observed timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_source not in ('revenuecat','stripe') or p_observed is null or p_packs is null then raise exception 'Invalid snapshot';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text||p_source,0));
 if exists(select 1 from public.pack_provider_snapshots where owner_id=p_owner and source=p_source and observed_at>=p_observed) then return;end if;
 if exists(select 1 from unnest(p_packs) p where not exists(select 1 from public.pack_catalog c where c.id=p)) then raise exception 'Unknown pack';end if;
 insert into public.pack_provider_snapshots values(p_owner,p_source,p_observed) on conflict(owner_id,source) do update set observed_at=excluded.observed_at;
 update public.pack_ownership set active=false,observed_at=p_observed where owner_id=p_owner and source=p_source;
 insert into public.pack_ownership select p_owner,p_source,p,true,p_observed from (select distinct unnest(p_packs) p) packs
 on conflict(owner_id,source,pack_id) do update set active=true,observed_at=excluded.observed_at;
end $$;
create function public.grant_pack(p_owner uuid,p_administrator uuid,p_pack text,p_active boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.pack_ownership values(p_owner,'complimentary',p_pack,p_active,clock_timestamp()) on conflict(owner_id,source,pack_id) do update set active=excluded.active,observed_at=excluded.observed_at;
 insert into public.pack_grant_audit(owner_id,administrator_id,pack_id,active,reason) values(p_owner,p_administrator,p_pack,p_active,p_reason);
end $$;
-- Preserve the agreed fixed tester cohort and prior complimentary grants forever.
insert into public.pack_ownership select owner_id,'complimentary','everything',true,now() from public.premium_memberships where source='complimentary' and active and (expires_at is null or expires_at>now());
insert into public.pack_grant_audit(owner_id,pack_id,active,reason) select owner_id,'everything',true,'V1 permanent tester / complimentary migration' from public.pack_ownership;
-- Existing analysis access is independent; buying a cosmetic pack never grants reports.
create function public.pack_analysis_access(p_owner uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.premium_tester_cohort where owner_id=p_owner)
 or exists(select 1 from public.premium_memberships where owner_id=p_owner and source='legacy_analysis' and active and (expires_at is null or expires_at>now()))
 or exists(select 1 from auth.users where id=p_owner and raw_app_meta_data->>'full_game_analysis'='true')
$$;
create or replace function public.premium_cosmetic_options() returns jsonb language sql immutable set search_path='' as $$ select '{"hairStyle":["bun","side-part","curls","mohawk","long","pigtails","twin-buns","side-braid","long-waves","high-fade","afro"],"facialHair":["goatee","long-beard","chops"],"expression":["angry","crying","confident"],"hat":["beanie","bucket","crown","tiara","viking","cowboy","santa","sombrero"],"top":["polo","hoodie","long-sleeve"],"bottom":["pleated-skirt","pants"],"glasses":["wraparound","cat-eye","hexagon","stars","flowers","hearts","diamonds","oversized"],"outfit":["dinosaur","lion","bear","butterfly"],"accessory":["watch","dinosaur-tail","cape"],"paddleShape":["rectangular","circular","squarish-circles","squarish-lines","rounded-circles","rounded-lines"]}'::jsonb $$;
create or replace function public.premium_free_appearance(p_appearance jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; options jsonb; result jsonb:=p_appearance; defaults jsonb:='{"outfit":"none","outfitColor":"#36936c","facialHair":"none","facialHairColor":"#493629","expression":"happy","paddleShape":"squarish","presentation":"boy","face":"oval","hairStyle":"short","hat":"cap","glasses":"none","glassesColor":"#25272d","lensColor":"#b7dce5","shoeStyle":"court","skin":"#dba67f","hair":"#493629","jersey":"#f3dc86","accent":"#214d43","hatColor":"#214d43","bottomColor":"#214d43","top":"jersey","bottom":"shorts","accessory":"wristband","shoes":"#214d43","paddle":"#214d43"}';
begin
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (p_appearance->>k) then result:=jsonb_set(result,array[k],defaults->k); end if;
 end loop;return result;
end $$;

create function public.pack_appearance(p_appearance jsonb,p_owner uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare k text;options jsonb;result jsonb:=p_appearance;defaults jsonb:=public.premium_free_appearance(p_appearance);
begin
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (p_appearance->>k) and not public.pack_owned(p_owner,case when k='paddleShape' then 'fun' else 'style' end) then result:=jsonb_set(result,array[k],defaults->k);end if;
 end loop;return result;
end $$;
create or replace function public.check_premium_player() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; options jsonb;
begin
 if not public.premium_enforced() or exists(select 1 from auth.users where id=new.owner_id and raw_app_meta_data->>'community_bot'='true') then return new; end if;
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if not public.pack_owned(new.owner_id,case when k='paddleShape' then 'fun' else 'style' end) and options ? (new.appearance->>k) and (tg_op='INSERT' or (old.appearance->k) is distinct from (new.appearance->k)) then
   raise exception 'A cosmetic pack is required for this appearance choice.' using errcode='PT403';
  end if;
 end loop;return new;
end $$;
create or replace function public.check_premium_court() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; selected_court text;
begin
 if not public.premium_enforced() then return new; end if;
 if tg_table_name='async_invitations' then owner:=new.creator_id;selected_court:=new.court;
 else owner:=new.inviter_id;select checkpoint->>'court' into selected_court from public.async_matches where id=new.match_id;
 end if;
 if exists(select 1 from public.pack_courts pc where pc.court=coalesce(selected_court,'forest') and not public.pack_owned(owner,pc.pack_id)) then
  raise exception 'Court Pack is required to host this court.' using errcode='PT403';
 end if;return new;
end $$;
create or replace function public.apply_premium_match_appearance() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; slot text; slots text[]; entitled boolean;
begin
 if not public.premium_enforced() then return new; end if;
 foreach owner in array array[new.home_user_id,new.away_user_id] loop
  if owner is null then continue; end if;
  if exists(select 1 from auth.users where id=owner and raw_app_meta_data->>'community_bot'='true') then continue;end if;
  slots:=case when owner=new.home_user_id then array['you','partner'] else array['opponent-left','opponent-right'] end;
  foreach slot in array slots loop
   if new.checkpoint#>array['roster',slot,'design','appearance'] is not null then
    new.checkpoint:=jsonb_set(new.checkpoint,array['roster',slot,'design','appearance'],public.pack_appearance(new.checkpoint#>array['roster',slot,'design','appearance'],owner));
   end if;
  end loop;
 end loop;return new;
end $$;
create or replace function public.create_signup_player() returns trigger
language plpgsql security definer set search_path='' as $$
declare player jsonb:=new.raw_user_meta_data->'starter_player'; appearance jsonb;
begin
 if new.raw_user_meta_data->>'username' is not null and player is not null
 and not exists(select 1 from public.players where owner_id=new.id) then
  appearance:=player->'appearance';
  if public.premium_enforced() then appearance:=public.pack_appearance(appearance,new.id);end if;
  insert into public.players(owner_id,id,name,appearance,skills,handedness,is_active)
  values(new.id,'starter',left(player->>'name',24),appearance,player->'skills',player->>'handedness',true);
 end if;return new;
end $$;
alter table public.pack_catalog enable row level security;
revoke all on public.pack_catalog from public,anon,authenticated;
grant select on public.pack_catalog to service_role;
alter table public.pack_bundle_contents enable row level security;
revoke all on public.pack_bundle_contents from public,anon,authenticated;
grant select on public.pack_bundle_contents to service_role;
alter table public.pack_ownership enable row level security;
revoke all on public.pack_ownership from public,anon,authenticated;
grant select on public.pack_ownership to service_role;
alter table public.pack_provider_snapshots enable row level security;
revoke all on public.pack_provider_snapshots from public,anon,authenticated;
grant select on public.pack_provider_snapshots to service_role;
alter table public.pack_grant_audit enable row level security;
revoke all on public.pack_grant_audit from public,anon,authenticated;
grant select on public.pack_grant_audit to service_role;
alter table public.pack_courts enable row level security;
revoke all on public.pack_courts from public,anon,authenticated;
grant select on public.pack_courts to service_role;
revoke all on function public.pack_owned(uuid,text) from public,anon,authenticated;
grant execute on function public.pack_owned(uuid,text) to service_role;
revoke all on function public.update_pack_provider(uuid,text,text[],timestamptz) from public,anon,authenticated;
grant execute on function public.update_pack_provider(uuid,text,text[],timestamptz) to service_role;
revoke all on function public.grant_pack(uuid,uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.grant_pack(uuid,uuid,text,boolean,text) to service_role;
revoke all on function public.pack_analysis_access(uuid) from public,anon,authenticated;
grant execute on function public.pack_analysis_access(uuid) to service_role;
revoke all on function public.pack_appearance(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.pack_appearance(jsonb,uuid) to service_role;
revoke execute on function public.update_premium_provider(uuid,text,boolean,timestamptz,timestamptz),public.grant_premium(uuid,uuid,boolean,timestamptz,text) from service_role;
commit;
