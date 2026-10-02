begin;
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
commit;
