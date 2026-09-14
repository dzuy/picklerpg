alter table public.match_history add column if not exists ended_early boolean not null default false;
create or replace function public.record_early_match(p_id uuid,p_home_names text,p_away_names text,p_home_score integer,p_away_score integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to save a match'; end if;
 if p_id is null or p_home_names is null or p_away_names is null or
 char_length(p_home_names) not between 1 and 120 or char_length(p_away_names) not between 1 and 120 or
 p_home_score is null or p_away_score is null or least(p_home_score,p_away_score)<0 or greatest(p_home_score,p_away_score)>10000 then
 raise exception 'Invalid match'; end if;
 insert into public.match_history(owner_id,id,home_names,away_names,home_score,away_score,won,xp,ended_early)
 values(auth.uid(),p_id,p_home_names,p_away_names,p_home_score,p_away_score,false,0,true) on conflict(owner_id,id) do nothing;
end; $$;
revoke all on function public.record_early_match(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.record_early_match(uuid,text,text,integer,integer) to authenticated;
create or replace view public.account_progress with (security_invoker=true) as
select owner_id,count(*)::integer as games,count(*) filter(where won)::integer as wins,
count(*) filter(where not won)::integer as losses,sum(xp)::bigint as xp,
(1+sum(xp)/500)::integer as level,
array_remove(array[case when count(*)>=1 then 'First match' end,case when bool_or(won) then 'First win' end,
case when count(*)>=10 then 'Regular on court' end],null) as unlocks
from public.match_history where not ended_early group by owner_id;
