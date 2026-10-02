begin;
-- Curated public builds may span 3.5–4.8. Personal budgets and creator publishing remain unchanged.
create or replace function public.enforce_player_skill_budget() returns trigger language plpgsql security definer set search_path='' as $$
declare budget integer:=public.account_skill_budget(new.owner_id);curated boolean:=current_setting('role',true) in ('service_role','none');
begin
 if public.skill_points(new.skills)>budget or exists(select 1 from jsonb_each_text(new.skills) where value::numeric>100) then raise exception 'Player exceeds account skill budget';end if;
 if new.published_skills is null then new.published_skills:=public.normalize_skill_budget(new.skills,35);end if;
 if public.skill_points(new.published_skills)>50 or exists(select 1 from jsonb_each_text(new.published_skills) where value::numeric>100) then raise exception 'Community build exceeds skill limits';end if;
 if public.skill_points(new.published_skills)>35 and not curated then
  if tg_op='INSERT' then raise exception 'Creator community builds have 35 points';end if;
  if new.published_skills is distinct from old.published_skills then raise exception 'Creator community builds have 35 points';end if;
 end if;
 return new;
end;$$;
notify pgrst,'reload schema';
commit;
