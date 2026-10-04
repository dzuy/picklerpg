begin;
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
commit;
