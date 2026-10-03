begin;
alter table public.players add column revision bigint not null default 1 check(revision between 1 and 9007199254740991);
-- Reject older clients that still replace a cached roster directly. Selection-only
-- updates remain compatible and do not advance the player content revision.
create function public.guard_player_revision() returns trigger
language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new)-'is_active'-'updated_at'-'revision') is distinct from (to_jsonb(old)-'is_active'-'updated_at'-'revision') then
  if current_user in ('authenticated','anon') and new.revision<>old.revision+1 then
   raise exception 'This player changed elsewhere. Reload the saved player before editing again.';
  end if;
  new.revision:=old.revision+1;
 elsif new.revision<>old.revision and new.revision<>old.revision+1 then
  raise exception 'Invalid player revision';
 end if;
 return new;
end $$;
create trigger guard_player_revision before update on public.players for each row execute function public.guard_player_revision();
create or replace function public.apply_roster_change(p_change jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid();p jsonb:=p_change->'player';kind text:=p_change->'change'->>'kind';player_id text:=p_change->'change'->>'playerId';active_id text:=p_change->>'activeId';expected bigint;current_revision bigint;
begin
 if owner is null then raise sqlstate '42501' using message='Sign in to save players';end if;
 perform public.require_active_account();
 if p_change->>'id' is null then raise exception 'Missing operation identity';end if;
 if kind is null or kind not in ('save','delete') or player_id is null or length(player_id) not between 1 and 100 then raise exception 'Invalid player change';end if;
 -- All roster operations for one account serialize on its own RLS-protected profile.
 perform 1 from public.profiles where user_id=owner for update;
 if not found then raise exception 'Account profile unavailable';end if;
 if exists(select 1 from public.roster_change_receipts where owner_id=owner and operation_id=(p_change->>'id')::uuid) then return;end if;
 if p_change->>'previousOperation' is not null and not exists(select 1 from public.roster_change_receipts where owner_id=owner and operation_id=(p_change->>'previousOperation')::uuid) then
  raise exception 'This player changed elsewhere. An earlier edit was not synced.';
 end if;
 expected:=(p_change->>'expectedRevision')::bigint;
 select revision into current_revision from public.players where owner_id=owner and id=player_id for update;
 if expected is null or expected<0 or expected<>coalesce(current_revision,0) then
  raise exception 'This player changed elsewhere. Your edits are kept on this device. Reload the saved player before editing again.';
 end if;
 update public.players set is_active=false where owner_id=owner and is_active;
 if kind='delete' then
  delete from public.players where owner_id=owner and id=player_id;
 else
  if p->>'id' is distinct from player_id then raise exception 'Invalid player identity';end if;
  insert into public.players(owner_id,id,name,catchphrase,appearance,skills,handedness,is_public,published_skills,is_active,revision)
  values(owner,player_id,p->>'name',p->>'catchphrase',p->'appearance',p->'skills',p->>'handedness',coalesce((p->>'isPublic')::boolean,false),nullif(p->'publishedSkills','null'::jsonb),false,expected+1)
  on conflict(owner_id,id) do update set name=excluded.name,catchphrase=excluded.catchphrase,appearance=excluded.appearance,skills=excluded.skills,handedness=excluded.handedness,is_public=excluded.is_public,published_skills=excluded.published_skills,revision=excluded.revision;
 end if;
 if active_id is not null then
  update public.players set is_active=true where owner_id=owner and id=active_id;
 end if;
 insert into public.roster_change_receipts values(owner,(p_change->>'id')::uuid);
end $$;
notify pgrst,'reload schema';
commit;
