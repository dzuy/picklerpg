-- Casual match history: client reports results; database validates scores and awards XP.
-- This is not an authoritative competitive match server.
create table if not exists public.match_history (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 completed_at timestamptz not null default now(),
 home_names text not null,
 away_names text not null,
 home_score integer not null,
 away_score integer not null,
 won boolean not null,
 xp integer not null,
 primary key(owner_id,id)
);
alter table public.match_history enable row level security;
revoke all on public.match_history from anon, authenticated;
grant select on public.match_history to authenticated;
create policy history_owner on public.match_history for select to authenticated using (auth.uid() = owner_id);
create or replace function public.record_match(p_id uuid,p_home_names text,p_away_names text,p_home_score integer,p_away_score integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to save a match'; end if;
 if p_id is null or p_home_names is null or p_away_names is null or
 char_length(p_home_names) not between 1 and 120 or char_length(p_away_names) not between 1 and 120 or
 p_home_score is null or p_away_score is null or least(p_home_score,p_away_score)<0 or
 greatest(p_home_score,p_away_score)>10000 or
 not ((greatest(p_home_score,p_away_score)=11 and least(p_home_score,p_away_score)<=9) or
 (greatest(p_home_score,p_away_score)>11 and abs(p_home_score-p_away_score)=2)) then
 raise exception 'Invalid completed match'; end if;
 insert into public.match_history(owner_id,id,home_names,away_names,home_score,away_score,won,xp)
 values(auth.uid(),p_id,p_home_names,p_away_names,p_home_score,p_away_score,p_home_score>p_away_score,case when p_home_score>p_away_score then 100 else 50 end)
 on conflict(owner_id,id) do nothing;
end; $$;
revoke all on function public.record_match(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.record_match(uuid,text,text,integer,integer) to authenticated;
create or replace view public.account_progress with (security_invoker=true) as
select owner_id,count(*)::integer as games,count(*) filter(where won)::integer as wins,
count(*) filter(where not won)::integer as losses,sum(xp)::bigint as xp,
(1+sum(xp)/500)::integer as level,
array_remove(array[case when count(*)>=1 then 'First match' end,case when bool_or(won) then 'First win' end,
case when count(*)>=10 then 'Regular on court' end],null) as unlocks
from public.match_history group by owner_id;
grant select on public.account_progress to authenticated;
