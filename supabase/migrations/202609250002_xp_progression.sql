-- Config seed mirrors src/xp-config.json; verified by the XP database tests.
create table public.xp_config (id boolean primary key default true check(id), config jsonb not null);
insert into public.xp_config values(true,'{"XP_PER_SKILL_POINT": 100, "STARTING_SKILL_BUDGET": 35, "MAX_SKILL_BUDGET": 43, "solo": {"easy": [2, 1], "normal": [3, 2], "hard": [5, 3], "expert": [7, 5]}, "friends": [5, 2], "invite": {"joined": 25, "first_game": 25}, "playerCreation": {"xp": 5, "limit": 3}, "streak": [[1, 1], [2, 1.25], [3, 1.5], [5, 1.75], [7, 2]]}');
alter table public.xp_config enable row level security;
revoke all on public.xp_config from public,anon,authenticated;

create table public.account_xp (
 account_id uuid primary key references auth.users(id) on delete cascade,
 lifetime_xp bigint not null default 0 check(lifetime_xp>=0),
 current_play_streak integer not null default 0,
 last_eligible_game_completion_date date,
 lifetime_player_creation_xp_awards integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.xp_events (
 account_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, source text not null, game_id uuid, game_type text, difficulty text,
 completed boolean, won boolean, base_xp integer not null, streak_multiplier numeric not null,
 final_xp integer not null, lifetime_xp bigint not null, current_skill_budget integer not null,
 skill_points_earned integer not null, streak_days integer not null,
 details jsonb not null default '{}', awarded_at timestamptz not null default now(),
 primary key(account_id,event_key)
);
create index xp_events_game on public.xp_events(account_id,game_id);
create table public.xp_invites (
 invited_account_id uuid primary key references auth.users(id) on delete cascade,
 inviter_account_id uuid not null references auth.users(id) on delete cascade,
 joined_reward_granted boolean not null default false,
 first_game_reward_granted boolean not null default false,
 first_game_completed boolean not null default false,
 check(invited_account_id<>inviter_account_id)
);
create table public.xp_analytics (
 account_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, event text not null, properties jsonb not null,
 created_at timestamptz not null default now(), primary key(account_id,event_key,event)
);
alter table public.account_xp enable row level security;
alter table public.xp_events enable row level security;
alter table public.xp_invites enable row level security;
alter table public.xp_analytics enable row level security;
revoke all on public.account_xp,public.xp_events,public.xp_invites,public.xp_analytics from public,anon,authenticated;
grant select on public.account_xp,public.xp_events to authenticated;
create policy own_xp on public.account_xp for select to authenticated using(account_id=auth.uid());
create policy own_xp_events on public.xp_events for select to authenticated using(account_id=auth.uid());
grant select on public.account_xp,public.xp_events,public.xp_invites,public.xp_analytics,public.xp_config to service_role;

create function public.xp_budget(p_xp bigint) returns integer language sql stable security definer set search_path='' as $$
 select least((config->>'MAX_SKILL_BUDGET')::integer,(config->>'STARTING_SKILL_BUDGET')::integer+(p_xp/(config->>'XP_PER_SKILL_POINT')::integer)::integer) from public.xp_config;
$$;
create or replace function public.account_skill_budget(p_owner uuid) returns integer language sql stable security definer set search_path='' as $$
 select public.xp_budget(coalesce((select lifetime_xp from public.account_xp where account_id=p_owner),0));
$$;
-- All awards serialize on the account row. Ledger insertion and totals commit together.
create function public.grant_xp(p_owner uuid,p_key text,p_source text,p_base integer,p_game uuid default null,p_type text default null,p_difficulty text default null,p_won boolean default null,p_details jsonb default '{}')
returns public.xp_events language plpgsql security definer set search_path='' as $$
declare a public.account_xp;e public.xp_events;c jsonb;m numeric:=1;days integer;today date:=(now() at time zone 'UTC')::date;before_budget integer;after_budget integer;amount integer;
begin
 select config into c from public.xp_config;
 insert into public.account_xp(account_id) values(p_owner) on conflict do nothing;
 select * into a from public.account_xp where account_id=p_owner for update;
 select * into e from public.xp_events where account_id=p_owner and event_key=p_key;
 if found then return e;end if;
 if p_base<0 then raise exception 'Invalid XP';end if;
 days:=a.current_play_streak;
 if p_type is not null then
 if a.last_eligible_game_completion_date is distinct from today then
 days:=case when a.last_eligible_game_completion_date=today-1 then days+1 else 1 end;
 end if;
 select (value->>1)::numeric into m from jsonb_array_elements(c->'streak') where (value->>0)::integer<=days order by (value->>0)::integer desc limit 1;
 if a.last_eligible_game_completion_date is distinct from today then
 insert into public.xp_analytics values(p_owner,p_key,'streak_updated',jsonb_build_object('streak_days',days,'multiplier',m),now());end if;
 end if;
 amount:=round(p_base*m);before_budget:=public.xp_budget(a.lifetime_xp);after_budget:=public.xp_budget(a.lifetime_xp+amount);
 update public.account_xp set lifetime_xp=lifetime_xp+amount,current_play_streak=days,
 last_eligible_game_completion_date=case when p_type is not null then today else last_eligible_game_completion_date end where account_id=p_owner;
 insert into public.xp_events values(p_owner,p_key,p_source,p_game,p_type,p_difficulty,case when p_type is not null then true end,p_won,p_base,m,amount,a.lifetime_xp+amount,after_budget,after_budget-before_budget,days,p_details,now()) returning * into e;
 insert into public.xp_analytics values(p_owner,p_key,'xp_earned',jsonb_build_object('source',p_source,'base_xp',p_base,'multiplier',m,'final_xp',amount,'lifetime_xp',e.lifetime_xp,'current_skill_budget',after_budget),now());
 if after_budget>before_budget then insert into public.xp_analytics values(p_owner,p_key,'skill_point_earned',jsonb_build_object('new_skill_budget',after_budget,'lifetime_xp',e.lifetime_xp,'points_earned',after_budget-before_budget),now());end if;
 if p_type is not null then insert into public.xp_analytics values(p_owner,p_key,'game_xp_awarded',jsonb_build_object('game_type',p_type,'difficulty',p_difficulty,'won',p_won,'base_xp',p_base,'streak_multiplier',m,'final_xp',amount),now());
 elsif p_source='invite' then insert into public.xp_analytics values(p_owner,p_key,'invite_xp_awarded',p_details,now());
 elsif p_source='player_creation' then insert into public.xp_analytics values(p_owner,p_key,'player_creation_xp_awarded',p_details,now());end if;
 return e;
end;$$;

create or replace function public.my_skill_progress() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('lifetimeXp',coalesce(a.lifetime_xp,0),'currentSkillBudget',public.xp_budget(coalesce(a.lifetime_xp,0)),
 'earnedSkillPoints',public.xp_budget(coalesce(a.lifetime_xp,0))-(c.config->>'STARTING_SKILL_BUDGET')::integer,
 'maxSkillBudget',(c.config->>'MAX_SKILL_BUDGET')::integer,'xpPerSkillPoint',(c.config->>'XP_PER_SKILL_POINT')::integer,
 'currentXpTowardNextSkillPoint',coalesce(a.lifetime_xp,0)%(c.config->>'XP_PER_SKILL_POINT')::integer,
 'currentPlayStreak',case when a.last_eligible_game_completion_date>=(now() at time zone 'UTC')::date-1 then a.current_play_streak else 0 end,
 'lastEligibleGameCompletionDate',a.last_eligible_game_completion_date,'lifetimePlayerCreationXpAwards',coalesce(a.lifetime_player_creation_xp_awards,0))
 from public.xp_config c left join public.account_xp a on a.account_id=auth.uid();
$$;

-- Convert previously earned online-game budget into XP, capped to the V1 maximum.
-- No historic Solo XP is imported: the old 50/100 economy was unrelated.
select public.grant_xp(owner,'migration:v1','migration',least((count(*)/10)::integer,
 (select (config->>'MAX_SKILL_BUDGET')::integer-(config->>'STARTING_SKILL_BUDGET')::integer from public.xp_config)) *
 (select (config->>'XP_PER_SKILL_POINT')::integer from public.xp_config))
from (select home_user_id as owner from public.async_matches where status='completed' and ended_by is null and winner_user_id is not null
union all select away_user_id from public.async_matches where status='completed' and ended_by is null and winner_user_id is not null and away_user_id is not null) games
group by owner having count(*)>=10;

-- Existing creations consume lifetime slots; do not retroactively award unverified history.
insert into public.account_xp(account_id,lifetime_player_creation_xp_awards)
 select owner_id,least(count(*),(select (config->'playerCreation'->>'limit')::integer from public.xp_config)) from public.players group by owner_id on conflict(account_id) do update set lifetime_player_creation_xp_awards=excluded.lifetime_player_creation_xp_awards;
create function public.player_creation_xp() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;c jsonb;
begin
 select config into c from public.xp_config;
 insert into public.account_xp(account_id) values(new.owner_id) on conflict do nothing;
 select lifetime_player_creation_xp_awards into n from public.account_xp where account_id=new.owner_id for update;
 if n<(c->'playerCreation'->>'limit')::integer then
 n:=n+1;
 perform public.grant_xp(new.owner_id,'creation:'||n,'player_creation',(c->'playerCreation'->>'xp')::integer,p_details=>jsonb_build_object('rewarded_creation_number',n));
 update public.account_xp set lifetime_player_creation_xp_awards=n where account_id=new.owner_id;
 end if;return new;
end;$$;
create trigger player_creation_xp after insert on public.players for each row execute function public.player_creation_xp();

-- Bind a single inviter at first accepted challenge, even if activation happens later.
create function public.activate_invite_xp(p_invited uuid) returns void language plpgsql security definer set search_path='' as $$
declare i public.xp_invites;c jsonb;
begin
 select * into i from public.xp_invites where invited_account_id=p_invited for update;
 if not found or exists(select 1 from auth.users where id=p_invited and (is_anonymous or raw_app_meta_data->>'community_bot'='true')) then return;end if;
 select config into c from public.xp_config;
 if not i.joined_reward_granted then
 perform public.grant_xp(i.inviter_account_id,'invite:joined:'||p_invited,'invite',(c->'invite'->>'joined')::integer,p_details=>' {"stage":"joined"}');
 update public.xp_invites set joined_reward_granted=true where invited_account_id=p_invited;
 end if;
 if not i.first_game_reward_granted and (i.first_game_completed or exists(select 1 from public.xp_events where account_id=p_invited and game_type='friends')) then
 perform public.grant_xp(i.inviter_account_id,'invite:first_game:'||p_invited,'invite',(c->'invite'->>'first_game')::integer,p_details=>'{"stage":"first_game"}');
 update public.xp_invites set first_game_reward_granted=true where invited_account_id=p_invited;
 end if;
end;$$;
create function public.invite_xp_claimed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='accepted' and new.claimed_user_id is not null and old.status='pending' then
 insert into public.xp_invites(invited_account_id,inviter_account_id) values(new.claimed_user_id,new.inviter_id) on conflict do nothing;
 perform public.activate_invite_xp(new.claimed_user_id);
 elsif new.status='accepted' and old.status='accepted' and new.claimed_user_id is distinct from old.claimed_user_id then
 -- The existing server-only recovery path can move a guest seat. Move its
 -- referral flags too, without re-awarding or merging either account's XP.
 update public.xp_invites set invited_account_id=new.claimed_user_id,
 first_game_completed=first_game_completed or exists(select 1 from public.xp_events where account_id=old.claimed_user_id and game_type='friends')
 where invited_account_id=old.claimed_user_id and not exists(select 1 from public.xp_invites where invited_account_id=new.claimed_user_id);
 end if;return new;
end;$$;
create trigger invite_xp_claimed after update on public.friend_challenges for each row execute function public.invite_xp_claimed();
create function public.invite_xp_activated() returns trigger language plpgsql security definer set search_path='' as $$
begin if old.is_anonymous and not new.is_anonymous then perform public.activate_invite_xp(new.id);end if;return new;end;$$;
create trigger invite_xp_activated after update on auth.users for each row execute function public.invite_xp_activated();

create function public.friends_game_xp() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;c jsonb;r jsonb;won boolean;
begin
 if new.status<>'completed' or old.status='completed' or new.ended_by is not null or new.winner_user_id is null or new.away_user_id is null then return new;end if;
 -- Community bots are not real-human Friends games.
 if exists(select 1 from auth.users where id in(new.home_user_id,new.away_user_id) and raw_app_meta_data->>'community_bot'='true') then return new;end if;
 select config into c from public.xp_config;r:=c->'friends';
 for owner in select id from auth.users where id in(new.home_user_id,new.away_user_id) order by id loop
 won:=owner=new.winner_user_id;
 perform public.grant_xp(owner,'game:'||new.id,'friends',(r->>0)::integer+case when won then (r->>1)::integer else 0 end,new.id,'friends',null,won,jsonb_build_object('completion_xp',(r->>0)::integer,'win_xp',case when won then (r->>1)::integer else 0 end));
 end loop;
 update public.xp_invites set first_game_completed=true where invited_account_id in(new.home_user_id,new.away_user_id);
 perform public.activate_invite_xp(new.home_user_id);perform public.activate_invite_xp(new.away_user_id);
 return new;
end;$$;
create trigger friends_game_xp after update on public.async_matches for each row execute function public.friends_game_xp();

-- Solo remains client-reported, like existing casual history. Validate the declared rules/result.
create function public.record_solo_xp(p_id uuid,p_home_names text,p_away_names text,p_home_score integer,p_away_score integer,p_ended_early boolean,p_participants jsonb,p_difficulty text default 'normal',p_target integer default 11)
returns void language plpgsql security definer set search_path='' as $$
declare c jsonb;r jsonb;e public.xp_events;h public.match_history;
begin
 if auth.uid() is null then raise exception 'Sign in';end if;
 select config into c from public.xp_config;r:=c->'solo'->p_difficulty;
 if r is null or p_target is null or p_target not between 1 and 99 or p_ended_early is null or p_id is null or p_home_names is null or p_away_names is null or length(p_home_names) not between 1 and 120 or length(p_away_names) not between 1 and 120 or p_home_score is null or p_away_score is null or least(p_home_score,p_away_score)<0 or greatest(p_home_score,p_away_score)>10000 or jsonb_typeof(p_participants) is distinct from 'array' then raise exception 'Invalid result';end if;
 if not p_ended_early and not ((greatest(p_home_score,p_away_score)=p_target and abs(p_home_score-p_away_score)>=2) or (greatest(p_home_score,p_away_score)>p_target and abs(p_home_score-p_away_score)=2)) then raise exception 'Incomplete game';end if;
 insert into public.match_history(owner_id,id,home_names,away_names,home_score,away_score,won,xp,ended_early,participants) values(auth.uid(),p_id,p_home_names,p_away_names,p_home_score,p_away_score,p_home_score>p_away_score,0,p_ended_early,p_participants) on conflict do nothing;
 if not found then return;end if;
 if not p_ended_early then
 e:=public.grant_xp(auth.uid(),'game:'||p_id,'solo',(r->>0)::integer+case when p_home_score>p_away_score then (r->>1)::integer else 0 end,p_id,'solo',p_difficulty,p_home_score>p_away_score,jsonb_build_object('completion_xp',(r->>0)::integer,'win_xp',case when p_home_score>p_away_score then (r->>1)::integer else 0 end));
 update public.match_history set xp=e.final_xp where owner_id=auth.uid() and id=p_id;
 end if;
end;$$;
revoke all on function public.xp_budget(bigint),public.grant_xp(uuid,text,text,integer,uuid,text,text,boolean,jsonb),public.player_creation_xp(),public.activate_invite_xp(uuid),public.invite_xp_claimed(),public.invite_xp_activated(),public.friends_game_xp(),public.record_solo_xp(uuid,text,text,integer,integer,boolean,jsonb,text,integer) from public,anon,authenticated;
grant execute on function public.record_solo_xp(uuid,text,text,integer,integer,boolean,jsonb,text,integer) to authenticated;
notify pgrst,'reload schema';

create or replace function public.normalize_skill_budget(p_skills jsonb,p_budget integer) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb:=p_skills;k text;v integer;cap integer:=100;factor numeric;g jsonb;chosen jsonb;cost integer;best integer;topkey text;topval integer;
begin
 perform public.skill_points(p_skills);
 for k in select unnest(array['serve','drive','overhead','drop','dink','movement','volley','counter','hands','return','reset']) loop result:=jsonb_set(result,array[k],to_jsonb(least(cap,(result->>k)::integer)));end loop;
 if public.skill_points(result)<=p_budget then return result;end if;
 factor:=public.skill_points(result);
 for k in select jsonb_object_keys(result) loop result:=jsonb_set(result,array[k],to_jsonb(floor((result->>k)::numeric*p_budget/factor)::integer));end loop;
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

create or replace function public.enforce_player_skill_budget() returns trigger language plpgsql security definer set search_path='' as $$
declare budget integer:=public.account_skill_budget(new.owner_id);limit_value integer:=100;
begin
 if public.skill_points(new.skills)>budget or exists(select 1 from jsonb_each_text(new.skills) where value::numeric>limit_value) then raise exception 'Player exceeds account skill budget';end if;
 if new.published_skills is null then new.published_skills:=public.normalize_skill_budget(new.skills,35);end if;
 if public.skill_points(new.published_skills)>35 or exists(select 1 from jsonb_each_text(new.published_skills) where value::numeric>100) then raise exception 'Community builds have 35 points and a maximum of 10 per skill';end if;
 return new;
end;$$;

create or replace function public.save_community_skills(p_public_id uuid,p_skills jsonb) returns void language plpgsql security definer set search_path='' as $$
declare budget integer:=public.account_skill_budget(auth.uid());
begin
 if auth.uid() is null then raise exception 'Sign in';end if;
 if public.skill_points(p_skills)>budget or exists(select 1 from jsonb_each_text(p_skills) where value::numeric>100) then raise exception 'Player exceeds account skill budget';end if;
 update public.community_player_selections set player_snapshot=jsonb_set(player_snapshot,'{skills}',p_skills) where owner_id=auth.uid() and public_id=p_public_id;
 if not found then raise exception 'Add this player to your roster first';end if;
end;$$;

-- Service-only reporting; raw ledger supports arbitrary cohort/date-window queries.
create view public.xp_account_metrics as
select a.account_id,a.lifetime_xp,public.xp_budget(a.lifetime_xp) as current_skill_budget,
 (c.config->>'MAX_SKILL_BUDGET')::integer as max_skill_budget,
 a.current_play_streak,a.last_eligible_game_completion_date,a.lifetime_player_creation_xp_awards,
 sum(e.final_xp) filter(where e.source<>'migration')::numeric/nullif(count(distinct (e.awarded_at at time zone 'UTC')::date) filter(where e.game_type is not null),0) as average_xp_per_active_day,
 sum(e.final_xp) filter(where e.game_type is not null)::numeric/nullif(count(distinct (e.awarded_at at time zone 'UTC')::date) filter(where e.game_type is not null),0) as average_gameplay_xp_per_active_day,
 avg(e.final_xp) filter(where e.game_type is not null) as average_xp_per_completed_game,
 coalesce(sum(e.final_xp) filter(where e.game_type='solo'),0) as solo_xp,
 coalesce(sum(e.final_xp) filter(where e.game_type='friends'),0) as friends_xp,
 coalesce(sum(e.final_xp) filter(where e.source='invite'),0) as invite_xp,
 coalesce(sum(e.final_xp-e.base_xp) filter(where e.game_type is not null),0) as streak_bonus_xp,
 extract(epoch from (min(e.awarded_at) filter(where e.lifetime_xp>=(c.config->>'XP_PER_SKILL_POINT')::integer)-a.created_at))/86400 as days_to_first_skill_point
from public.account_xp a cross join public.xp_config c left join public.xp_events e on e.account_id=a.account_id
group by a.account_id,c.config;
create view public.xp_budget_milestones as
select a.account_id,budget,min(e.awarded_at) as reached_at,
 extract(epoch from (min(e.awarded_at)-a.created_at))/86400 as days_to_budget
from public.account_xp a cross join public.xp_config c
cross join lateral generate_series((c.config->>'STARTING_SKILL_BUDGET')::integer+1,(c.config->>'MAX_SKILL_BUDGET')::integer) budget
join public.xp_events e on e.account_id=a.account_id and e.current_skill_budget>=budget
group by a.account_id,budget;
revoke all on public.xp_account_metrics,public.xp_budget_milestones from public,anon,authenticated;
grant select on public.xp_account_metrics,public.xp_budget_milestones to service_role;
grant execute on function public.xp_budget(bigint) to service_role;
