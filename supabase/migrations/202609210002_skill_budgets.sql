-- Account budgets are derived from server-completed online matches, never editable metadata.
create function public.account_skill_budget(p_owner uuid) returns integer
language sql stable security definer set search_path='' as $$
 select 35+least(10,(count(*)/10)::integer) from public.async_matches
 where status='completed' and ended_by is null and winner_user_id is not null and (home_user_id=p_owner or away_user_id=p_owner);
$$;
revoke all on function public.account_skill_budget(uuid) from public,anon,authenticated;
grant execute on function public.account_skill_budget(uuid) to service_role;
create function public.my_skill_budget() returns integer language sql stable security definer set search_path='' as $$select public.account_skill_budget(auth.uid());$$;
revoke all on function public.my_skill_budget() from public,anon;
grant execute on function public.my_skill_budget() to authenticated;

create function public.skill_points(p_skills jsonb) returns integer language plpgsql immutable set search_path='' as $$
declare groups jsonb:='[["serve","drive","overhead"],["drop","dink"],["movement"],["volley","counter","hands"],["return","reset"]]';g jsonb;k text;v numeric;total integer:=0;s numeric;
begin
 for g in select value from jsonb_array_elements(groups) loop
 s:=0;for k in select jsonb_array_elements_text(g) loop
 if jsonb_typeof(p_skills->k) is distinct from 'number' then raise exception 'Invalid skill';end if;
 v:=(p_skills->>k)::numeric;if v<0 or v>100 or v<>floor(v) then raise exception 'Invalid skill';end if;s:=s+v;
 end loop;total:=total+ceil(s/(jsonb_array_length(g)*10));end loop;return total;
end;$$;
create function public.normalize_skill_budget(p_skills jsonb,p_budget integer) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb:=p_skills;k text;v integer;cap integer:=case when p_budget>35 then 100 else 90 end;factor numeric;g jsonb;chosen jsonb;cost integer;best integer;topkey text;topval integer;
begin
 perform public.skill_points(p_skills);
 for k in select unnest(array['serve','drive','overhead','drop','dink','movement','volley','counter','hands','return','reset']) loop result:=jsonb_set(result,array[k],to_jsonb(least(cap,(result->>k)::integer)));end loop;
 if public.skill_points(result)<=p_budget then return result;end if;
 factor:=p_budget::numeric/public.skill_points(result);
 for k in select jsonb_object_keys(result) loop result:=jsonb_set(result,array[k],to_jsonb(floor((result->>k)::numeric*factor)::integer));end loop;
 while public.skill_points(result)>p_budget loop
 best:=-1;
 for g in select value from jsonb_array_elements('[["serve","drive","overhead"],["drop","dink"],["movement"],["volley","counter","hands"],["return","reset"]]'::jsonb) loop
 select ceil(sum((result->>value)::numeric)/(jsonb_array_length(g)*10)) into cost from jsonb_array_elements_text(g);
 if cost>best then best:=cost;chosen:=g;end if;
 end loop;
 topval:=-1;for k in select jsonb_array_elements_text(chosen) loop if (result->>k)::integer>topval then topval:=(result->>k)::integer;topkey:=k;end if;end loop;
 result:=jsonb_set(result,array[topkey],to_jsonb(topval-1));
 end loop;return result;
end;$$;

alter table public.players add column published_skills jsonb;
-- Preserve original skill data for support/recovery before normalizing existing accounts.
create table public.skill_budget_migration_backup as select owner_id,id,skills from public.players;
alter table public.skill_budget_migration_backup enable row level security;
revoke all on public.skill_budget_migration_backup from public,anon,authenticated;
update public.players set published_skills=public.normalize_skill_budget(skills,35),skills=public.normalize_skill_budget(skills,public.account_skill_budget(owner_id));

create function public.enforce_player_skill_budget() returns trigger language plpgsql security definer set search_path='' as $$
declare budget integer:=public.account_skill_budget(new.owner_id);limit_value integer:=case when budget>35 then 100 else 90 end;
begin
 if public.skill_points(new.skills)>budget or exists(select 1 from jsonb_each_text(new.skills) where value::numeric>limit_value) then raise exception 'Player exceeds account skill budget';end if;
 if new.published_skills is null then new.published_skills:=public.normalize_skill_budget(new.skills,35);end if;
 if public.skill_points(new.published_skills)>35 or exists(select 1 from jsonb_each_text(new.published_skills) where value::numeric>90) then raise exception 'Community builds have 35 points and a maximum of 9 per skill';end if;
 return new;
end;$$;
create trigger enforce_player_skill_budget before insert or update on public.players for each row execute function public.enforce_player_skill_budget();

alter table public.community_player_selections add column player_snapshot jsonb;
alter table public.community_player_selections add column creator_name text;
update public.community_player_selections s set player_snapshot=jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.published_skills,'handedness',p.handedness),creator_name=coalesce(nullif(u.raw_user_meta_data->>'player_name',''),'Community creator') from public.players p join auth.users u on u.id=p.owner_id where p.public_id=s.public_id;
alter table public.community_player_selections drop constraint community_player_selections_public_id_fkey;
alter table public.community_player_selections alter column player_snapshot set not null;
create function public.snapshot_community_player() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.community_player_is_available(new.public_id) then raise exception 'This player is no longer available';end if;
 select jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.published_skills,'handedness',p.handedness),coalesce(nullif(u.raw_user_meta_data->>'player_name',''),'Community creator') into new.player_snapshot,new.creator_name from public.players p join auth.users u on u.id=p.owner_id where p.public_id=new.public_id;
 return new;
end;$$;
create trigger snapshot_community_player before insert on public.community_player_selections for each row execute function public.snapshot_community_player();
create function public.save_community_skills(p_public_id uuid,p_skills jsonb) returns void language plpgsql security definer set search_path='' as $$
declare budget integer:=public.account_skill_budget(auth.uid());
begin
 if auth.uid() is null then raise exception 'Sign in';end if;
 if public.skill_points(p_skills)>budget or exists(select 1 from jsonb_each_text(p_skills) where value::numeric>case when budget>35 then 100 else 90 end) then raise exception 'Player exceeds account skill budget';end if;
 update public.community_player_selections set player_snapshot=jsonb_set(player_snapshot,'{skills}',p_skills) where owner_id=auth.uid() and public_id=p_public_id;
 if not found then raise exception 'Add this player to your roster first';end if;
end;$$;
revoke all on function public.save_community_skills(uuid,jsonb) from public,anon;
grant execute on function public.save_community_skills(uuid,jsonb) to authenticated;

create or replace function public.community_player_catalog(p_ids uuid[] default null)
returns table(public_id uuid,player jsonb,creator_name text,added boolean)
language sql stable security definer set search_path='' as $$
 select s.public_id,s.player_snapshot,s.creator_name,true from public.community_player_selections s
 where s.owner_id=auth.uid() and (p_ids is null or s.public_id=any(p_ids))
 union all
 select p.public_id,jsonb_build_object('id','community-'||p.public_id::text,'name',p.name,'catchphrase',coalesce(p.catchphrase,''),'appearance',p.appearance,'skills',p.published_skills,'handedness',p.handedness),coalesce(nullif(u.raw_user_meta_data->>'player_name',''),'Community creator'),false
 from public.players p join auth.users u on u.id=p.owner_id
 where p.is_public and (p_ids is null or p.public_id=any(p_ids))
 and not exists(select 1 from public.community_player_moderation m where m.public_id=p.public_id)
 and not exists(select 1 from public.community_player_selections s where s.owner_id=auth.uid() and s.public_id=p.public_id);
$$;
create function public.community_roster_for_owner(p_owner uuid,p_ids uuid[]) returns table(player jsonb)
language sql stable security definer set search_path='' as $$select player_snapshot from public.community_player_selections where owner_id=p_owner and public_id=any(p_ids);$$;
revoke all on function public.community_roster_for_owner(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.community_roster_for_owner(uuid,uuid[]) to service_role;
-- Trigger functions and internal helpers need no client execution privileges.
revoke all on function public.enforce_player_skill_budget(),public.snapshot_community_player(),public.skill_points(jsonb),public.normalize_skill_budget(jsonb,integer) from public,anon,authenticated;
notify pgrst,'reload schema';
create function public.my_skill_progress() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('budget',35+least(10,(count(*)/10)::integer),'games',count(*),'nextAt',case when count(*)>=100 then null else (count(*)/10+1)*10 end)
 from public.async_matches where status='completed' and ended_by is null and winner_user_id is not null and (home_user_id=auth.uid() or away_user_id=auth.uid());
$$;
revoke all on function public.my_skill_progress() from public,anon;
grant execute on function public.my_skill_progress() to authenticated;
