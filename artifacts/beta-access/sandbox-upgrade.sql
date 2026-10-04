-- Approved beta verification only: purchase-sandbox drdvwfjkbyvfqnmxkksl
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtext('picklebash-beta-sandbox-upgrade'));
do $$ begin if not exists(select 1 from supabase_migrations.schema_migrations where version='20260929182826' and name='remote_schema') or to_regclass('public.account_archives') is not null or to_regprocedure('public.players_blocked(uuid,uuid)') is not null then raise exception 'Unexpected sandbox baseline: inspect before continuing'; end if; end $$;
create temporary table beta_counts on commit drop as select (select count(*) from auth.users) users,(select count(*) from public.players) players,(select count(*) from public.async_matches) matches,(select count(*) from public.pack_ownership) ownership;
alter table beta_counts enable row level security;
create table public.account_deletion_requests(account_id uuid primary key,requested_at timestamptz not null default now(),completed_at timestamptz,external_cleanup_completed_at timestamptz);
create table public.player_blocks(owner_id uuid references auth.users on delete cascade,blocked_id uuid references auth.users on delete cascade,created_at timestamptz not null default now(),primary key(owner_id,blocked_id),check(owner_id<>blocked_id));
create table public.player_reports(id bigint generated always as identity primary key,reporter_id uuid references auth.users on delete set null,target_id uuid references auth.users on delete set null,public_id uuid,reason text not null check(reason in ('harassment','inappropriate_content','impersonation','other')),details text not null check(length(details)<=500),evidence jsonb,created_at timestamptz not null default now(),reviewed_at timestamptz);
alter table public.account_deletion_requests enable row level security;
alter table public.player_blocks enable row level security;
alter table public.player_reports enable row level security;
revoke all on public.account_deletion_requests,public.player_blocks,public.player_reports from public,anon,authenticated;
grant all on public.account_deletion_requests,public.player_blocks,public.player_reports to service_role;
grant usage,select on sequence public.player_reports_id_seq to service_role;
create function public.players_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.player_blocks where (owner_id=a and blocked_id=b) or (owner_id=b and blocked_id=a)); $$;
revoke all on function public.players_blocked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.players_blocked(uuid,uuid) to service_role;
create function public.prevent_blocked_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare a uuid;b uuid;
begin
 if tg_table_name in ('async_invitations','friend_challenges') then
  if tg_op='UPDATE' then
   if new.status in ('cancelled','declined','deleted') then return new;end if;
  end if;
 end if;
 if tg_table_name='async_invitations' then a:=new.creator_id;b:=new.recipient_id;
 elsif tg_table_name='friend_challenges' then a:=new.inviter_id;b:=new.claimed_user_id;
 elsif tg_table_name='async_matches' then a:=new.home_user_id;b:=new.away_user_id;
 elsif tg_table_name='match_nudges' then a:=new.sender_id;b:=new.recipient_id;
 else select home_user_id,away_user_id into a,b from public.async_matches where id=new.match_id;end if;
 if public.players_blocked(a,b) then raise exception 'Contact unavailable' using errcode='PT410';end if;
 return new;
end $$;
create trigger prevent_blocked_invite before insert or update on public.async_invitations for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_challenge before insert or update on public.friend_challenges for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_match before insert or update of away_user_id on public.async_matches for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_chat before insert on public.match_trash_talk for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_nudge before insert on public.match_nudges for each row execute function public.prevent_blocked_contact();
alter table public.community_player_moderation alter column hidden_by drop not null;
alter table public.community_player_moderation drop constraint community_player_moderation_hidden_by_fkey;
alter table public.community_player_moderation add constraint community_player_moderation_hidden_by_fkey foreign key(hidden_by) references auth.users(id) on delete set null;
grant select,insert on public.community_player_moderation to service_role;
grant select on public.match_trash_talk to service_role;
create table public.published_player_cards(owner_id uuid not null references auth.users on delete cascade,path text primary key,created_at timestamptz not null default now());
alter table public.published_player_cards enable row level security;
revoke all on public.published_player_cards from public,anon,authenticated;
grant all on public.published_player_cards to service_role;
-- Explicitly remove shared snapshots containing the deleted identity before auth deletion.
-- No other user's roster, ownership or account is deleted.
create function public.cleanup_deleted_account() returns trigger language plpgsql security definer set search_path='' as $$
declare ids uuid[];
begin
 select array_agg(id) into ids from public.async_matches where old.id in(home_user_id,away_user_id);
 delete from public.invite_events where actor_id=old.id or game_id=any(ids);
 delete from public.friend_challenges where old.id in(inviter_id,claimed_user_id) or match_id=any(ids);
 delete from public.async_invitations where old.id in(creator_id,recipient_id) or match_id=any(ids) or rematch_of=any(ids);
 delete from public.async_rivalries where old.id in(low_user_id,high_user_id);
 delete from public.async_rivalry_results where old.id in(low_user_id,high_user_id);
 delete from public.async_match_actions where match_id=any(ids);
 delete from public.async_matches where id=any(ids);

 -- Friend relationships are private metadata; do not leave stale deleted UUIDs.
 update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{open_play_friends}',coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(raw_user_meta_data->'open_play_friends','[]'::jsonb)) value where value<>to_jsonb(old.id::text)),'[]'::jsonb)) where id<>old.id and raw_user_meta_data->'open_play_friends' @> to_jsonb(array[old.id::text]);
 update public.account_deletion_requests set completed_at=now() where account_id=old.id;
 return old;
end $$;
create trigger cleanup_deleted_account before delete on auth.users for each row execute function public.cleanup_deleted_account();
revoke all on function public.cleanup_deleted_account(),public.prevent_blocked_contact() from public,anon,authenticated,service_role;
-- Filter stored public names/catchphrases, including writes made outside the app UI.
create function public.clean_player_text(value text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(normalize(coalesce(value,''),NFKC), E'\\y(?:motherfuck(?:er|ers|ing)?|fuck(?:s|ed|er|ers|ing)?|shit(?:s|ty|ting|head)?|bullshit|bitch(?:es|y|ing)?|ass(?:hole|holes)?|bastard(?:s)?|damn(?:ed|it)?|crap|piss(?:ed|ing)?|dick(?:s|head)?|cock(?:s)?|cunt(?:s)?|prick(?:s)?|wanker(?:s)?|twat(?:s)?|fag(?:got|gots|s)?|nigg(?:er|ers|a|as))\\y','!@#$%','gi');
$$;
create function public.filter_player_text() returns trigger language plpgsql set search_path='' as $$
begin new.name:=left(public.clean_player_text(new.name),24);new.catchphrase:=left(public.clean_player_text(new.catchphrase),30);return new;end $$;
create trigger filter_player_text before insert or update of name,catchphrase on public.players for each row execute function public.filter_player_text();
revoke all on function public.filter_player_text() from public,anon,authenticated,service_role;
alter function public.community_player_catalog(uuid[]) rename to community_player_catalog_before_safety;
revoke all on function public.community_player_catalog_before_safety(uuid[]) from public,anon,authenticated,service_role;
create function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean) language sql stable security definer set search_path='' as $$
 select c.public_id,c.player||jsonb_build_object('name',public.clean_player_text(c.player->>'name'),'catchphrase',public.clean_player_text(c.player->>'catchphrase')),public.clean_player_text(c.creator_name),c.added from public.community_player_catalog_before_safety(p_ids) c join public.players p on p.public_id=c.public_id
 where not public.players_blocked(auth.uid(),p.owner_id);
$$;
revoke all on function public.community_player_catalog(uuid[]) from public;
grant execute on function public.community_player_catalog(uuid[]) to anon,authenticated,service_role;
-- Existing skill/edit RPCs retain their authorization and snapshot semantics.
create or replace function public.community_player_is_available(p_public_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.players p where p.public_id=p_public_id and p.is_public and not public.players_blocked(auth.uid(),p.owner_id) and not exists(select 1 from public.community_player_moderation m where m.public_id=p_public_id));
$$;
notify pgrst,'reload schema';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202609290006','account_safety',array['begin;
create table public.account_deletion_requests(account_id uuid primary key,requested_at timestamptz not null default now(),completed_at timestamptz,external_cleanup_completed_at timestamptz);
create table public.player_blocks(owner_id uuid references auth.users on delete cascade,blocked_id uuid references auth.users on delete cascade,created_at timestamptz not null default now(),primary key(owner_id,blocked_id),check(owner_id<>blocked_id));
create table public.player_reports(id bigint generated always as identity primary key,reporter_id uuid references auth.users on delete set null,target_id uuid references auth.users on delete set null,public_id uuid,reason text not null check(reason in (''harassment'',''inappropriate_content'',''impersonation'',''other'')),details text not null check(length(details)<=500),evidence jsonb,created_at timestamptz not null default now(),reviewed_at timestamptz);
alter table public.account_deletion_requests enable row level security;
alter table public.player_blocks enable row level security;
alter table public.player_reports enable row level security;
revoke all on public.account_deletion_requests,public.player_blocks,public.player_reports from public,anon,authenticated;
grant all on public.account_deletion_requests,public.player_blocks,public.player_reports to service_role;
grant usage,select on sequence public.player_reports_id_seq to service_role;
create function public.players_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='''' as $$ select exists(select 1 from public.player_blocks where (owner_id=a and blocked_id=b) or (owner_id=b and blocked_id=a)); $$;
revoke all on function public.players_blocked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.players_blocked(uuid,uuid) to service_role;
create function public.prevent_blocked_contact() returns trigger language plpgsql security definer set search_path='''' as $$
declare a uuid;b uuid;
begin
 if tg_table_name in (''async_invitations'',''friend_challenges'') then
  if tg_op=''UPDATE'' then
   if new.status in (''cancelled'',''declined'',''deleted'') then return new;end if;
  end if;
 end if;
 if tg_table_name=''async_invitations'' then a:=new.creator_id;b:=new.recipient_id;
 elsif tg_table_name=''friend_challenges'' then a:=new.inviter_id;b:=new.claimed_user_id;
 elsif tg_table_name=''async_matches'' then a:=new.home_user_id;b:=new.away_user_id;
 elsif tg_table_name=''match_nudges'' then a:=new.sender_id;b:=new.recipient_id;
 else select home_user_id,away_user_id into a,b from public.async_matches where id=new.match_id;end if;
 if public.players_blocked(a,b) then raise exception ''Contact unavailable'' using errcode=''PT410'';end if;
 return new;
end $$;
create trigger prevent_blocked_invite before insert or update on public.async_invitations for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_challenge before insert or update on public.friend_challenges for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_match before insert or update of away_user_id on public.async_matches for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_chat before insert on public.match_trash_talk for each row execute function public.prevent_blocked_contact();
create trigger prevent_blocked_nudge before insert on public.match_nudges for each row execute function public.prevent_blocked_contact();
alter table public.community_player_moderation alter column hidden_by drop not null;
alter table public.community_player_moderation drop constraint community_player_moderation_hidden_by_fkey;
alter table public.community_player_moderation add constraint community_player_moderation_hidden_by_fkey foreign key(hidden_by) references auth.users(id) on delete set null;
grant select,insert on public.community_player_moderation to service_role;
grant select on public.match_trash_talk to service_role;
create table public.published_player_cards(owner_id uuid not null references auth.users on delete cascade,path text primary key,created_at timestamptz not null default now());
alter table public.published_player_cards enable row level security;
revoke all on public.published_player_cards from public,anon,authenticated;
grant all on public.published_player_cards to service_role;
-- Explicitly remove shared snapshots containing the deleted identity before auth deletion.
-- No other user''s roster, ownership or account is deleted.
create function public.cleanup_deleted_account() returns trigger language plpgsql security definer set search_path='''' as $$
declare ids uuid[];
begin
 select array_agg(id) into ids from public.async_matches where old.id in(home_user_id,away_user_id);
 delete from public.invite_events where actor_id=old.id or game_id=any(ids);
 delete from public.friend_challenges where old.id in(inviter_id,claimed_user_id) or match_id=any(ids);
 delete from public.async_invitations where old.id in(creator_id,recipient_id) or match_id=any(ids) or rematch_of=any(ids);
 delete from public.async_rivalries where old.id in(low_user_id,high_user_id);
 delete from public.async_rivalry_results where old.id in(low_user_id,high_user_id);
 delete from public.async_match_actions where match_id=any(ids);
 delete from public.async_matches where id=any(ids);

 -- Friend relationships are private metadata; do not leave stale deleted UUIDs.
 update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,''{open_play_friends}'',coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(raw_user_meta_data->''open_play_friends'',''[]''::jsonb)) value where value<>to_jsonb(old.id::text)),''[]''::jsonb)) where id<>old.id and raw_user_meta_data->''open_play_friends'' @> to_jsonb(array[old.id::text]);
 update public.account_deletion_requests set completed_at=now() where account_id=old.id;
 return old;
end $$;
create trigger cleanup_deleted_account before delete on auth.users for each row execute function public.cleanup_deleted_account();
revoke all on function public.cleanup_deleted_account(),public.prevent_blocked_contact() from public,anon,authenticated,service_role;
-- Filter stored public names/catchphrases, including writes made outside the app UI.
create function public.clean_player_text(value text) returns text language sql immutable set search_path='''' as $$
 select regexp_replace(normalize(coalesce(value,''''),NFKC), E''\\y(?:motherfuck(?:er|ers|ing)?|fuck(?:s|ed|er|ers|ing)?|shit(?:s|ty|ting|head)?|bullshit|bitch(?:es|y|ing)?|ass(?:hole|holes)?|bastard(?:s)?|damn(?:ed|it)?|crap|piss(?:ed|ing)?|dick(?:s|head)?|cock(?:s)?|cunt(?:s)?|prick(?:s)?|wanker(?:s)?|twat(?:s)?|fag(?:got|gots|s)?|nigg(?:er|ers|a|as))\\y'',''!@#$%'',''gi'');
$$;
create function public.filter_player_text() returns trigger language plpgsql set search_path='''' as $$
begin new.name:=left(public.clean_player_text(new.name),24);new.catchphrase:=left(public.clean_player_text(new.catchphrase),30);return new;end $$;
create trigger filter_player_text before insert or update of name,catchphrase on public.players for each row execute function public.filter_player_text();
revoke all on function public.filter_player_text() from public,anon,authenticated,service_role;
alter function public.community_player_catalog(uuid[]) rename to community_player_catalog_before_safety;
revoke all on function public.community_player_catalog_before_safety(uuid[]) from public,anon,authenticated,service_role;
create function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean) language sql stable security definer set search_path='''' as $$
 select c.public_id,c.player||jsonb_build_object(''name'',public.clean_player_text(c.player->>''name''),''catchphrase'',public.clean_player_text(c.player->>''catchphrase'')),public.clean_player_text(c.creator_name),c.added from public.community_player_catalog_before_safety(p_ids) c join public.players p on p.public_id=c.public_id
 where not public.players_blocked(auth.uid(),p.owner_id);
$$;
revoke all on function public.community_player_catalog(uuid[]) from public;
grant execute on function public.community_player_catalog(uuid[]) to anon,authenticated,service_role;
-- Existing skill/edit RPCs retain their authorization and snapshot semantics.
create or replace function public.community_player_is_available(p_public_id uuid) returns boolean language sql stable security definer set search_path='''' as $$
 select exists(select 1 from public.players p where p.public_id=p_public_id and p.is_public and not public.players_blocked(auth.uid(),p.owner_id) and not exists(select 1 from public.community_player_moderation m where m.public_id=p_public_id));
$$;
notify pgrst,''reload schema'';
commit;
']);
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

insert into supabase_migrations.schema_migrations(version,name,statements) values('202609300001','community_creator_usernames',array['begin;
-- Match the creator credit to the account handle shown in Community.
create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='''' as $$
 select c.public_id,
 c.player||jsonb_build_object(''name'',public.clean_player_text(c.player->>''name''),''catchphrase'',public.clean_player_text(c.player->>''catchphrase'')),
 public.clean_player_text(coalesce(nullif(btrim(n.username),''''),c.creator_name)),c.added
 from public.community_player_catalog_before_safety(p_ids) c
 join public.players p on p.public_id=c.public_id
 left join public.usernames n on n.user_id=p.owner_id
 where not public.players_blocked(auth.uid(),p.owner_id);
$$;
notify pgrst,''reload schema'';
commit;
']);
-- Preserve selected community copies after source deletion while resolving current creator handles.
create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select c.public_id,
 c.player||jsonb_build_object('name',public.clean_player_text(c.player->>'name'),'catchphrase',public.clean_player_text(c.player->>'catchphrase')),
 public.clean_player_text(coalesce(nullif(btrim(n.username),''),c.creator_name)),c.added
 from public.community_player_catalog_before_safety(p_ids) c
 left join public.players p on p.public_id=c.public_id
 left join public.usernames n on n.user_id=p.owner_id
 where p.owner_id is null or not public.players_blocked(auth.uid(),p.owner_id);
$$;
notify pgrst,'reload schema';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202609300003','community_saved_copies',array['begin;
-- Preserve selected community copies after source deletion while resolving current creator handles.
create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='''' as $$
 select c.public_id,
 c.player||jsonb_build_object(''name'',public.clean_player_text(c.player->>''name''),''catchphrase'',public.clean_player_text(c.player->>''catchphrase'')),
 public.clean_player_text(coalesce(nullif(btrim(n.username),''''),c.creator_name)),c.added
 from public.community_player_catalog_before_safety(p_ids) c
 left join public.players p on p.public_id=c.public_id
 left join public.usernames n on n.user_id=p.owner_id
 where p.owner_id is null or not public.players_blocked(auth.uid(),p.owner_id);
$$;
notify pgrst,''reload schema'';
commit;
']);
-- Private operator audit survives target deletion; no user-editable roles or PII payloads.
create table public.admin_user_actions (
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 target_id uuid not null,
 action text not null check (action in ('edit','remove')),
 changed_fields text[] not null default '{}',
 status text not null default 'pending' check (status in ('pending','completed','failed')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 external_cleanup_completed_at timestamptz
);
alter table public.admin_user_actions enable row level security;
revoke all on public.admin_user_actions from public,anon,authenticated;
grant select,insert,update on public.admin_user_actions to service_role;
grant usage,select on sequence public.admin_user_actions_id_seq to service_role;
notify pgrst,'reload schema';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202610010001','admin_user_actions',array['begin;
-- Private operator audit survives target deletion; no user-editable roles or PII payloads.
create table public.admin_user_actions (
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 target_id uuid not null,
 action text not null check (action in (''edit'',''remove'')),
 changed_fields text[] not null default ''{}'',
 status text not null default ''pending'' check (status in (''pending'',''completed'',''failed'')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 external_cleanup_completed_at timestamptz
);
alter table public.admin_user_actions enable row level security;
revoke all on public.admin_user_actions from public,anon,authenticated;
grant select,insert,update on public.admin_user_actions to service_role;
grant usage,select on sequence public.admin_user_actions_id_seq to service_role;
notify pgrst,''reload schema'';
commit;
']);
create table public.account_archives (
 account_id uuid primary key references auth.users(id) on delete cascade,
 archived_by uuid not null,
 archived_at timestamptz not null default now(),
 previous_banned_until timestamptz
);
alter table public.account_archives enable row level security;
revoke all on public.account_archives from public,anon,authenticated;
grant select,insert,update,delete on public.account_archives to service_role;
alter table public.admin_user_actions drop constraint admin_user_actions_action_check;
alter table public.admin_user_actions add constraint admin_user_actions_action_check check(action in ('edit','remove','archive'));

create function public.is_account_archived(p_account uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_archives where account_id=p_account);
$$;
revoke all on function public.is_account_archived(uuid) from public,anon,authenticated;
grant execute on function public.is_account_archived(uuid) to service_role;
create function public.current_account_is_active() returns boolean
language sql stable security definer set search_path='' as $$
 select not public.is_account_archived(auth.uid());
$$;
revoke all on function public.current_account_is_active() from public;
grant execute on function public.current_account_is_active() to anon,authenticated,service_role;
-- Covers direct REST RPC calls as well as table access with an already-issued token.
create function public.require_active_account() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.current_account_is_active() then raise sqlstate '42501' using message='This account is unavailable.';end if;
end;
$$;
revoke all on function public.require_active_account() from public;
grant execute on function public.require_active_account() to anon,authenticated,service_role;
-- Do not overwrite another application's existing pre-request hook.
do $$ declare prior text;begin
 if exists(select 1 from pg_roles where rolname='authenticator') then
  select split_part(setting,'=',2) into prior from pg_roles r cross join lateral unnest(r.rolconfig) setting where r.rolname='authenticator' and setting like 'pgrst.db_pre_request=%';
  if coalesce(prior,'') not in ('','public.require_active_account') then raise exception 'Compose the existing Data API pre-request hook before installing account archives';end if;
  execute 'alter role authenticator set pgrst.db_pre_request = ''public.require_active_account''';
 end if;
end $$;
-- Restrictive policies also cover Realtime and private Storage access with old tokens.
do $$ declare t record;begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relrowsecurity and (n.nspname='public' or (n.nspname='storage' and c.relname='objects')) loop
  execute format('create policy active_account_required on %I.%I as restrictive for all to authenticated using ((select public.current_account_is_active())) with check ((select public.current_account_is_active()))',t.nspname,t.relname);
 end loop;
end $$;

create function public.archive_admin_account(p_account uuid,p_actor uuid,p_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare u auth.users%rowtype;stamp timestamptz;begin
 if p_actor is distinct from 'dda6d51d-cfbd-4204-a03d-b240e3f9e4a0'::uuid or p_account=p_actor then raise sqlstate '42501' using message='Owner account protected';end if;
 select * into u from auth.users where id=p_account for update;
 if not found then raise exception 'Account unavailable' using errcode='P0002';end if;
 select archived_at into stamp from public.account_archives where account_id=p_account;
 if stamp is not null then return stamp;end if;
 if coalesce(u.updated_at,u.created_at) is distinct from p_updated_at then raise exception 'Account changed; refresh before archiving' using errcode='40001';end if;
 stamp:=now();
 insert into public.account_archives(account_id,archived_by,archived_at,previous_banned_until) values(p_account,p_actor,stamp,u.banned_until);
 update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('account_archived_at',stamp),banned_until=stamp+interval '100 years',updated_at=stamp where id=p_account;
 -- Refresh tokens belong to sessions; revoke every existing session atomically.
 delete from auth.sessions where user_id=p_account;
 update public.push_devices set enabled=false,updated_at=stamp where user_id=p_account;
 -- Push registrations are retained, but delivery is disabled.
 update public.push_subscriptions set enabled=false where user_id=p_account;
 return stamp;
end;
$$;
revoke all on function public.archive_admin_account(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.archive_admin_account(uuid,uuid,timestamptz) to service_role;
alter table public.push_subscriptions add column enabled boolean not null default true;

alter function public.community_player_catalog(uuid[]) rename to community_player_catalog_before_archives;
revoke all on function public.community_player_catalog_before_archives(uuid[]) from public,anon,authenticated,service_role;
create function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select c.* from public.community_player_catalog_before_archives(p_ids) c
 left join public.players p on p.public_id=c.public_id
 where public.current_account_is_active() and (c.added or p.owner_id is null or not public.is_account_archived(p.owner_id));
$$;
revoke all on function public.community_player_catalog(uuid[]) from public;
grant execute on function public.community_player_catalog(uuid[]) to anon,authenticated,service_role;
create or replace function public.community_player_is_available(p_public_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.current_account_is_active() and exists(select 1 from public.players p where p.public_id=p_public_id and p.is_public
 and not public.is_account_archived(p.owner_id) and not public.players_blocked(auth.uid(),p.owner_id)
 and not exists(select 1 from public.community_player_moderation m where m.public_id=p_public_id));
$$;
revoke all on function public.community_player_is_available(uuid) from public,anon;
grant execute on function public.community_player_is_available(uuid) to authenticated,service_role;

create function public.prevent_archived_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare a uuid;b uuid;begin
 if tg_table_name in ('async_invitations','friend_challenges') then
  if tg_op='UPDATE' then
   if new.status in ('cancelled','declined','deleted') then return new;end if;
  end if;
 end if;
 if tg_table_name='async_invitations' then a:=new.creator_id;b:=new.recipient_id;
 elsif tg_table_name='friend_challenges' then a:=new.inviter_id;b:=new.claimed_user_id;
 elsif tg_table_name='async_matches' then a:=new.home_user_id;b:=new.away_user_id;
 elsif tg_table_name='match_nudges' then a:=new.sender_id;b:=new.recipient_id;
 else select home_user_id,away_user_id into a,b from public.async_matches where id=new.match_id;end if;
 if public.is_account_archived(a) or public.is_account_archived(b) then raise exception 'Contact unavailable' using errcode='PT410';end if;
 return new;
end $$;
create trigger prevent_archived_invite before insert or update on public.async_invitations for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_challenge before insert or update on public.friend_challenges for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_match before insert or update on public.async_matches for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_chat before insert on public.match_trash_talk for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_nudge before insert on public.match_nudges for each row execute function public.prevent_archived_contact();
revoke all on function public.prevent_archived_contact() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
notify pgrst,'reload config';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202610010002','account_archives',array['begin;
create table public.account_archives (
 account_id uuid primary key references auth.users(id) on delete cascade,
 archived_by uuid not null,
 archived_at timestamptz not null default now(),
 previous_banned_until timestamptz
);
alter table public.account_archives enable row level security;
revoke all on public.account_archives from public,anon,authenticated;
grant select,insert,update,delete on public.account_archives to service_role;
alter table public.admin_user_actions drop constraint admin_user_actions_action_check;
alter table public.admin_user_actions add constraint admin_user_actions_action_check check(action in (''edit'',''remove'',''archive''));

create function public.is_account_archived(p_account uuid) returns boolean
language sql stable security definer set search_path='''' as $$
 select exists(select 1 from public.account_archives where account_id=p_account);
$$;
revoke all on function public.is_account_archived(uuid) from public,anon,authenticated;
grant execute on function public.is_account_archived(uuid) to service_role;
create function public.current_account_is_active() returns boolean
language sql stable security definer set search_path='''' as $$
 select not public.is_account_archived(auth.uid());
$$;
revoke all on function public.current_account_is_active() from public;
grant execute on function public.current_account_is_active() to anon,authenticated,service_role;
-- Covers direct REST RPC calls as well as table access with an already-issued token.
create function public.require_active_account() returns void
language plpgsql security definer set search_path='''' as $$
begin
 if not public.current_account_is_active() then raise sqlstate ''42501'' using message=''This account is unavailable.'';end if;
end;
$$;
revoke all on function public.require_active_account() from public;
grant execute on function public.require_active_account() to anon,authenticated,service_role;
-- Do not overwrite another application''s existing pre-request hook.
do $$ declare prior text;begin
 if exists(select 1 from pg_roles where rolname=''authenticator'') then
  select split_part(setting,''='',2) into prior from pg_roles r cross join lateral unnest(r.rolconfig) setting where r.rolname=''authenticator'' and setting like ''pgrst.db_pre_request=%'';
  if coalesce(prior,'''') not in ('''',''public.require_active_account'') then raise exception ''Compose the existing Data API pre-request hook before installing account archives'';end if;
  execute ''alter role authenticator set pgrst.db_pre_request = ''''public.require_active_account'''''';
 end if;
end $$;
-- Restrictive policies also cover Realtime and private Storage access with old tokens.
do $$ declare t record;begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind=''r'' and c.relrowsecurity and (n.nspname=''public'' or (n.nspname=''storage'' and c.relname=''objects'')) loop
  execute format(''create policy active_account_required on %I.%I as restrictive for all to authenticated using ((select public.current_account_is_active())) with check ((select public.current_account_is_active()))'',t.nspname,t.relname);
 end loop;
end $$;

create function public.archive_admin_account(p_account uuid,p_actor uuid,p_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='''' as $$
declare u auth.users%rowtype;stamp timestamptz;begin
 if p_actor is distinct from ''dda6d51d-cfbd-4204-a03d-b240e3f9e4a0''::uuid or p_account=p_actor then raise sqlstate ''42501'' using message=''Owner account protected'';end if;
 select * into u from auth.users where id=p_account for update;
 if not found then raise exception ''Account unavailable'' using errcode=''P0002'';end if;
 select archived_at into stamp from public.account_archives where account_id=p_account;
 if stamp is not null then return stamp;end if;
 if coalesce(u.updated_at,u.created_at) is distinct from p_updated_at then raise exception ''Account changed; refresh before archiving'' using errcode=''40001'';end if;
 stamp:=now();
 insert into public.account_archives(account_id,archived_by,archived_at,previous_banned_until) values(p_account,p_actor,stamp,u.banned_until);
 update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,''{}''::jsonb)||jsonb_build_object(''account_archived_at'',stamp),banned_until=stamp+interval ''100 years'',updated_at=stamp where id=p_account;
 -- Refresh tokens belong to sessions; revoke every existing session atomically.
 delete from auth.sessions where user_id=p_account;
 update public.push_devices set enabled=false,updated_at=stamp where user_id=p_account;
 -- Push registrations are retained, but delivery is disabled.
 update public.push_subscriptions set enabled=false where user_id=p_account;
 return stamp;
end;
$$;
revoke all on function public.archive_admin_account(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.archive_admin_account(uuid,uuid,timestamptz) to service_role;
alter table public.push_subscriptions add column enabled boolean not null default true;

alter function public.community_player_catalog(uuid[]) rename to community_player_catalog_before_archives;
revoke all on function public.community_player_catalog_before_archives(uuid[]) from public,anon,authenticated,service_role;
create function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='''' as $$
 select c.* from public.community_player_catalog_before_archives(p_ids) c
 left join public.players p on p.public_id=c.public_id
 where public.current_account_is_active() and (c.added or p.owner_id is null or not public.is_account_archived(p.owner_id));
$$;
revoke all on function public.community_player_catalog(uuid[]) from public;
grant execute on function public.community_player_catalog(uuid[]) to anon,authenticated,service_role;
create or replace function public.community_player_is_available(p_public_id uuid) returns boolean
language sql stable security definer set search_path='''' as $$
 select public.current_account_is_active() and exists(select 1 from public.players p where p.public_id=p_public_id and p.is_public
 and not public.is_account_archived(p.owner_id) and not public.players_blocked(auth.uid(),p.owner_id)
 and not exists(select 1 from public.community_player_moderation m where m.public_id=p_public_id));
$$;
revoke all on function public.community_player_is_available(uuid) from public,anon;
grant execute on function public.community_player_is_available(uuid) to authenticated,service_role;

create function public.prevent_archived_contact() returns trigger language plpgsql security definer set search_path='''' as $$
declare a uuid;b uuid;begin
 if tg_table_name in (''async_invitations'',''friend_challenges'') then
  if tg_op=''UPDATE'' then
   if new.status in (''cancelled'',''declined'',''deleted'') then return new;end if;
  end if;
 end if;
 if tg_table_name=''async_invitations'' then a:=new.creator_id;b:=new.recipient_id;
 elsif tg_table_name=''friend_challenges'' then a:=new.inviter_id;b:=new.claimed_user_id;
 elsif tg_table_name=''async_matches'' then a:=new.home_user_id;b:=new.away_user_id;
 elsif tg_table_name=''match_nudges'' then a:=new.sender_id;b:=new.recipient_id;
 else select home_user_id,away_user_id into a,b from public.async_matches where id=new.match_id;end if;
 if public.is_account_archived(a) or public.is_account_archived(b) then raise exception ''Contact unavailable'' using errcode=''PT410'';end if;
 return new;
end $$;
create trigger prevent_archived_invite before insert or update on public.async_invitations for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_challenge before insert or update on public.friend_challenges for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_match before insert or update on public.async_matches for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_chat before insert on public.match_trash_talk for each row execute function public.prevent_archived_contact();
create trigger prevent_archived_nudge before insert on public.match_nudges for each row execute function public.prevent_archived_contact();
revoke all on function public.prevent_archived_contact() from public,anon,authenticated,service_role;
notify pgrst,''reload schema'';
notify pgrst,''reload config'';
commit;
']);
create table public.roster_change_receipts(owner_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,primary key(owner_id,operation_id));
alter table public.roster_change_receipts enable row level security;
revoke all on public.roster_change_receipts from public,anon,authenticated;
grant select,insert on public.roster_change_receipts to authenticated;
create policy own_roster_receipts on public.roster_change_receipts for all to authenticated using(owner_id=auth.uid() and public.current_account_is_active()) with check(owner_id=auth.uid() and public.current_account_is_active());
-- Apply one durable client operation atomically, retaining existing RLS and player triggers.
create function public.apply_roster_change(p_change jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid();p jsonb:=p_change->'player';kind text:=p_change->'change'->>'kind';player_id text:=p_change->'change'->>'playerId';active_id text:=p_change->>'activeId';
begin
 if owner is null then raise sqlstate '42501' using message='Sign in to save players';end if;
 perform public.require_active_account();
 if p_change->>'id' is null then raise exception 'Missing operation identity';end if;
 if kind is null or kind not in ('save','delete') or player_id is null or length(player_id) not between 1 and 100 then raise exception 'Invalid player change';end if;
 -- All roster operations for one account serialize on its own RLS-protected profile.
 perform 1 from public.profiles where user_id=owner for update;
 if not found then raise exception 'Account profile unavailable';end if;
 if exists(select 1 from public.roster_change_receipts where owner_id=owner and operation_id=(p_change->>'id')::uuid) then return;end if;
 update public.players set is_active=false where owner_id=owner and is_active;
 if kind='delete' then
  delete from public.players where owner_id=owner and id=player_id;
 else
  if p->>'id' is distinct from player_id then raise exception 'Invalid player identity';end if;
  insert into public.players(owner_id,id,name,catchphrase,appearance,skills,handedness,is_public,published_skills,is_active)
  values(owner,player_id,p->>'name',p->>'catchphrase',p->'appearance',p->'skills',p->>'handedness',coalesce((p->>'isPublic')::boolean,false),nullif(p->'publishedSkills','null'::jsonb),false)
  on conflict(owner_id,id) do update set name=excluded.name,catchphrase=excluded.catchphrase,appearance=excluded.appearance,skills=excluded.skills,handedness=excluded.handedness,is_public=excluded.is_public,published_skills=excluded.published_skills;
 end if;
 if active_id is not null then
  update public.players set is_active=true where owner_id=owner and id=active_id;
 end if;
 insert into public.roster_change_receipts values(owner,(p_change->>'id')::uuid);
end $$;
revoke all on function public.apply_roster_change(jsonb) from public,anon;
grant execute on function public.apply_roster_change(jsonb) to authenticated;
notify pgrst,'reload schema';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202610020001','roster_changes',array['begin;
create table public.roster_change_receipts(owner_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,primary key(owner_id,operation_id));
alter table public.roster_change_receipts enable row level security;
revoke all on public.roster_change_receipts from public,anon,authenticated;
grant select,insert on public.roster_change_receipts to authenticated;
create policy own_roster_receipts on public.roster_change_receipts for all to authenticated using(owner_id=auth.uid() and public.current_account_is_active()) with check(owner_id=auth.uid() and public.current_account_is_active());
-- Apply one durable client operation atomically, retaining existing RLS and player triggers.
create function public.apply_roster_change(p_change jsonb) returns void
language plpgsql security invoker set search_path='''' as $$
declare owner uuid:=auth.uid();p jsonb:=p_change->''player'';kind text:=p_change->''change''->>''kind'';player_id text:=p_change->''change''->>''playerId'';active_id text:=p_change->>''activeId'';
begin
 if owner is null then raise sqlstate ''42501'' using message=''Sign in to save players'';end if;
 perform public.require_active_account();
 if p_change->>''id'' is null then raise exception ''Missing operation identity'';end if;
 if kind is null or kind not in (''save'',''delete'') or player_id is null or length(player_id) not between 1 and 100 then raise exception ''Invalid player change'';end if;
 -- All roster operations for one account serialize on its own RLS-protected profile.
 perform 1 from public.profiles where user_id=owner for update;
 if not found then raise exception ''Account profile unavailable'';end if;
 if exists(select 1 from public.roster_change_receipts where owner_id=owner and operation_id=(p_change->>''id'')::uuid) then return;end if;
 update public.players set is_active=false where owner_id=owner and is_active;
 if kind=''delete'' then
  delete from public.players where owner_id=owner and id=player_id;
 else
  if p->>''id'' is distinct from player_id then raise exception ''Invalid player identity'';end if;
  insert into public.players(owner_id,id,name,catchphrase,appearance,skills,handedness,is_public,published_skills,is_active)
  values(owner,player_id,p->>''name'',p->>''catchphrase'',p->''appearance'',p->''skills'',p->>''handedness'',coalesce((p->>''isPublic'')::boolean,false),nullif(p->''publishedSkills'',''null''::jsonb),false)
  on conflict(owner_id,id) do update set name=excluded.name,catchphrase=excluded.catchphrase,appearance=excluded.appearance,skills=excluded.skills,handedness=excluded.handedness,is_public=excluded.is_public,published_skills=excluded.published_skills;
 end if;
 if active_id is not null then
  update public.players set is_active=true where owner_id=owner and id=active_id;
 end if;
 insert into public.roster_change_receipts values(owner,(p_change->>''id'')::uuid);
end $$;
revoke all on function public.apply_roster_change(jsonb) from public,anon;
grant execute on function public.apply_roster_change(jsonb) to authenticated;
notify pgrst,''reload schema'';
commit;
']);
create index if not exists async_matches_home_created on public.async_matches(home_user_id,created_at desc,id desc);
create index if not exists async_matches_away_created on public.async_matches(away_user_id,created_at desc,id desc);
-- Service-only bounded projection. No checkpoint, secret, trajectory, or action history leaves SQL.
create function public.list_match_summaries(p_actor uuid,p_filter text,p_before_time timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or p_filter not in ('active','turn','completed','archived') then raise exception 'Invalid game filter';end if;
 select coalesce(jsonb_agg(summary order by created_at desc,id desc),'[]'::jsonb) into result from (
 select m.created_at,m.id,jsonb_build_object(
 'id',m.id,'version',m.version,'createdAt',m.created_at,'completedAt',m.completed_at,'status',m.status,
 'viewerTeam',case when m.home_user_id=p_actor then 'home' else 'away' end,
 'currentTeam',case when m.status<>'active' or m.friend_state in ('pending','cancelled') then null when m.current_action_user_id=m.home_user_id then 'home' when m.current_action_user_id=m.away_user_id then 'away' end,
 'accountIds',jsonb_build_object('home',m.home_user_id,'away',m.away_user_id),
 'archived',case when m.home_user_id=p_actor then m.archived_home else m.archived_away end,
 'endedEarly',m.ended_by is not null,'friendState',m.friend_state,'invitedName',m.invited_name,
 'court',coalesce(m.checkpoint->>'court','forest'),'courtTheme',coalesce(m.checkpoint->>'courtTheme','none'),
 'rules',m.checkpoint->'rules','score',m.checkpoint->'scoring'->'score',
 'roster',jsonb_build_object('you',m.checkpoint->'roster'->'you'->'design','partner',m.checkpoint->'roster'->'partner'->'design','opponent-left',m.checkpoint->'roster'->'opponent-left'->'design','opponent-right',m.checkpoint->'roster'->'opponent-right'->'design')
 ) as summary
 from public.async_matches m
 where p_actor in (m.home_user_id,m.away_user_id) and m.friend_state is distinct from 'cancelled'
 and (p_before_time is null or (m.created_at,m.id)<(p_before_time,p_before_id))
 and case when p_filter='archived' then case when m.home_user_id=p_actor then m.archived_home else m.archived_away end
 else not (case when m.home_user_id=p_actor then m.archived_home else m.archived_away end)
 and m.status=case when p_filter='completed' then 'completed' else 'active' end
 and (p_filter<>'turn' or (m.current_action_user_id=p_actor and m.friend_state is distinct from 'pending')) end
 order by m.created_at desc,m.id desc limit 51
 ) page;
 return result;
end $$;
revoke all on function public.list_match_summaries(uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_match_summaries(uuid,text,timestamptz,uuid) to service_role;
notify pgrst,'reload schema';

insert into supabase_migrations.schema_migrations(version,name,statements) values('202610020002','match_summaries',array['begin;
create index if not exists async_matches_home_created on public.async_matches(home_user_id,created_at desc,id desc);
create index if not exists async_matches_away_created on public.async_matches(away_user_id,created_at desc,id desc);
-- Service-only bounded projection. No checkpoint, secret, trajectory, or action history leaves SQL.
create function public.list_match_summaries(p_actor uuid,p_filter text,p_before_time timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare result jsonb;
begin
 if p_actor is null or p_filter not in (''active'',''turn'',''completed'',''archived'') then raise exception ''Invalid game filter'';end if;
 select coalesce(jsonb_agg(summary order by created_at desc,id desc),''[]''::jsonb) into result from (
 select m.created_at,m.id,jsonb_build_object(
 ''id'',m.id,''version'',m.version,''createdAt'',m.created_at,''completedAt'',m.completed_at,''status'',m.status,
 ''viewerTeam'',case when m.home_user_id=p_actor then ''home'' else ''away'' end,
 ''currentTeam'',case when m.status<>''active'' or m.friend_state in (''pending'',''cancelled'') then null when m.current_action_user_id=m.home_user_id then ''home'' when m.current_action_user_id=m.away_user_id then ''away'' end,
 ''accountIds'',jsonb_build_object(''home'',m.home_user_id,''away'',m.away_user_id),
 ''archived'',case when m.home_user_id=p_actor then m.archived_home else m.archived_away end,
 ''endedEarly'',m.ended_by is not null,''friendState'',m.friend_state,''invitedName'',m.invited_name,
 ''court'',coalesce(m.checkpoint->>''court'',''forest''),''courtTheme'',coalesce(m.checkpoint->>''courtTheme'',''none''),
 ''rules'',m.checkpoint->''rules'',''score'',m.checkpoint->''scoring''->''score'',
 ''roster'',jsonb_build_object(''you'',m.checkpoint->''roster''->''you''->''design'',''partner'',m.checkpoint->''roster''->''partner''->''design'',''opponent-left'',m.checkpoint->''roster''->''opponent-left''->''design'',''opponent-right'',m.checkpoint->''roster''->''opponent-right''->''design'')
 ) as summary
 from public.async_matches m
 where p_actor in (m.home_user_id,m.away_user_id) and m.friend_state is distinct from ''cancelled''
 and (p_before_time is null or (m.created_at,m.id)<(p_before_time,p_before_id))
 and case when p_filter=''archived'' then case when m.home_user_id=p_actor then m.archived_home else m.archived_away end
 else not (case when m.home_user_id=p_actor then m.archived_home else m.archived_away end)
 and m.status=case when p_filter=''completed'' then ''completed'' else ''active'' end
 and (p_filter<>''turn'' or (m.current_action_user_id=p_actor and m.friend_state is distinct from ''pending'')) end
 order by m.created_at desc,m.id desc limit 51
 ) page;
 return result;
end $$;
revoke all on function public.list_match_summaries(uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_match_summaries(uuid,text,timestamptz,uuid) to service_role;
notify pgrst,''reload schema'';
commit;
']);
do $$ begin if exists(select 1 from beta_counts where users<>(select count(*) from auth.users) or players<>(select count(*) from public.players) or matches<>(select count(*) from public.async_matches) or ownership<>(select count(*) from public.pack_ownership)) then raise exception 'Unexpected data row count change';end if;end $$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
