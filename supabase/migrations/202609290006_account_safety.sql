begin;
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
commit;
