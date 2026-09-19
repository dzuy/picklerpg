-- Rebuildable, private, account-pair history. async_matches remains authoritative.
begin;
create table public.async_rivalries (
 low_user_id uuid not null references auth.users(id),
 high_user_id uuid not null references auth.users(id),
 summary jsonb not null,
 primary key(low_user_id,high_user_id),
 check(low_user_id<high_user_id)
);
create table public.async_rivalry_results (
 match_id uuid primary key references public.async_matches(id) on delete cascade,
 low_user_id uuid not null references auth.users(id),
 high_user_id uuid not null references auth.users(id),
 completed_at timestamptz not null,
 fact jsonb not null,
 at_completion jsonb not null,
 check(low_user_id<high_user_id)
);
create index async_rivalry_results_pair on public.async_rivalry_results(low_user_id,high_user_id,completed_at,match_id);
create index async_matches_rivalry_pair on public.async_matches(least(home_user_id,away_user_id),greatest(home_user_id,away_user_id),completed_at,id)
 where status='completed' and ended_by is null and away_user_id is not null;
alter table public.async_rivalries enable row level security;
alter table public.async_rivalry_results enable row level security;
revoke all on public.async_rivalries,public.async_rivalry_results from public,anon,authenticated,service_role;
grant select on public.async_rivalries,public.async_rivalry_results to service_role;

-- Pure reducer shared by live refresh and backfill. Facts are ordered oldest first.
create function public.advance_rivalry_summary(p_previous jsonb,p_fact jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare
 n integer:=coalesce((p_previous->>'games')::integer,0)+1;
 lo integer:=coalesce((p_previous->>'winsLow')::integer,0);
 hi integer:=coalesce((p_previous->>'winsHigh')::integer,0);
 streak integer; winner text:=p_fact->>'winner'; recent jsonb; closest jsonb;
begin
 if winner='low' then lo:=lo+1;else hi:=hi+1;end if;
 streak:=case when p_previous#>>'{streak,owner}'=winner then (p_previous#>>'{streak,length}')::integer+1 else 1 end;
 recent:=jsonb_build_array(p_fact)||coalesce(p_previous->'recent','[]'::jsonb);
 if jsonb_array_length(recent)>10 then recent:=recent-10;end if;
 closest:=p_previous->'closest';
 if closest is null or abs((p_fact->>'scoreLow')::integer-(p_fact->>'scoreHigh')::integer)<=abs((closest->>'scoreLow')::integer-(closest->>'scoreHigh')::integer) then closest:=p_fact;end if;
 return jsonb_build_object('definitionVersion',1,'games',n,'winsLow',lo,'winsHigh',hi,
  'streak',jsonb_build_object('owner',winner,'length',streak),
  'previousStreak',p_previous->'streak',
  'bestLow',greatest(coalesce((p_previous->>'bestLow')::integer,0),case when winner='low' then streak else 0 end),
  'bestHigh',greatest(coalesce((p_previous->>'bestHigh')::integer,0),case when winner='high' then streak else 0 end),
  'recent',recent,'closest',closest,
  'milestones',(select coalesce(jsonb_agg(value order by value),'[]'::jsonb) from unnest(array[2,3,5,10,25,100]) value where value<=n));
end $$;
revoke all on function public.advance_rivalry_summary(jsonb,jsonb) from public,anon,authenticated,service_role;

-- Serialize all completions/rebuilds for the same pair, even across different matches.
-- Re-read authoritative history after acquiring the lock; never lock match rows here.
-- Re-folding also handles out-of-order transaction timestamps and late historical imports.
create function public.rebuild_async_rivalry(p_a uuid,p_b uuid) returns void
language plpgsql security definer set search_path='' as $$
declare lo uuid:=least(p_a,p_b);hi uuid:=greatest(p_a,p_b);m public.async_matches;s jsonb;f jsonb;ids uuid[]:='{}';
begin
 if p_a is null or p_b is null or p_a=p_b then raise exception 'Invalid rivalry pair' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('rivalry:'||lo::text||':'||hi::text,0));
 for m in select * from public.async_matches
  where least(home_user_id,away_user_id)=lo and greatest(home_user_id,away_user_id)=hi
   and away_user_id is not null and status='completed' and ended_by is null
   and (friend_state is null or friend_state='accepted') and completed_at is not null
   and checkpoint#>>'{scoring,winner}' in ('home','away')
   and winner_user_id=case checkpoint#>>'{scoring,winner}' when 'home' then home_user_id else away_user_id end
  order by completed_at,id
 loop
  f:=jsonb_build_object('matchId',m.id,'completedAt',to_char(m.completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
   'winner',case when m.winner_user_id=lo then 'low' else 'high' end,
   'scoreLow',(m.checkpoint#>>array['scoring','score',case when m.home_user_id=lo then 'home' else 'away' end])::integer,
   'scoreHigh',(m.checkpoint#>>array['scoring','score',case when m.home_user_id=hi then 'home' else 'away' end])::integer,
   'rules',m.checkpoint->'rules');
  s:=public.advance_rivalry_summary(s,f);ids:=array_append(ids,m.id);
  insert into public.async_rivalry_results(match_id,low_user_id,high_user_id,completed_at,fact,at_completion)
   values(m.id,lo,hi,m.completed_at,f,s)
   on conflict(match_id) do update set low_user_id=excluded.low_user_id,high_user_id=excluded.high_user_id,
    completed_at=excluded.completed_at,fact=excluded.fact,at_completion=excluded.at_completion
   where (async_rivalry_results.low_user_id,async_rivalry_results.high_user_id,async_rivalry_results.completed_at,async_rivalry_results.fact,async_rivalry_results.at_completion)
    is distinct from (excluded.low_user_id,excluded.high_user_id,excluded.completed_at,excluded.fact,excluded.at_completion);
 end loop;
 delete from public.async_rivalry_results where low_user_id=lo and high_user_id=hi and not(match_id=any(ids));
 if s is null then delete from public.async_rivalries where low_user_id=lo and high_user_id=hi;
 else
  insert into public.async_rivalries values(lo,hi,s) on conflict(low_user_id,high_user_id)
   do update set summary=excluded.summary where async_rivalries.summary is distinct from excluded.summary;
 end if;
end $$;
revoke all on function public.rebuild_async_rivalry(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rebuild_async_rivalry(uuid,uuid) to service_role;

create function public.complete_async_rivalry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and old.status='active' and new.ended_by is null and new.away_user_id is not null
  and (new.friend_state is null or new.friend_state='accepted') and new.checkpoint#>>'{scoring,winner}' in ('home','away') then
  perform public.rebuild_async_rivalry(new.home_user_id,new.away_user_id);
 end if;
 return new;
end $$;
create trigger complete_async_rivalry after update of status on public.async_matches
 for each row execute function public.complete_async_rivalry();
revoke all on function public.complete_async_rivalry() from public,anon,authenticated,service_role;

-- One database request per batch, including both the live record and match-time snapshot.
-- Only matches owned by the authenticated API actor are returned; absent keys are unavailable.
create function public.get_async_rivalries(p_actor uuid,p_match_ids uuid[]) returns jsonb
language plpgsql security definer stable set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or p_match_ids is null or cardinality(p_match_ids)>100 then raise exception 'Invalid rivalry batch' using errcode='22023';end if;
 select coalesce(jsonb_object_agg(m.id,jsonb_build_object('viewerIsLow',m.home_user_id is not null and p_actor=least(m.home_user_id,m.away_user_id),
  'current',r.summary,'atCompletion',h.at_completion)),'{}'::jsonb) into result
 from public.async_matches m
 left join public.async_rivalries r on r.low_user_id=least(m.home_user_id,m.away_user_id) and r.high_user_id=greatest(m.home_user_id,m.away_user_id)
 left join public.async_rivalry_results h on h.match_id=m.id
 where m.id=any(p_match_ids) and p_actor in(m.home_user_id,m.away_user_id);
 return result;
end $$;
revoke all on function public.get_async_rivalries(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.get_async_rivalries(uuid,uuid[]) to service_role;

-- Cursor-based, restartable rebuild. Existing projections are included to remove stale pairs.
create function public.rebuild_async_rivalries(p_after_low uuid default null,p_after_high uuid default null,p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pair record;n integer:=0;last_lo uuid;last_hi uuid;
begin
 if p_limit is null or p_limit<1 or p_limit>100 or (p_after_low is null)<>(p_after_high is null) then raise exception 'Invalid rebuild batch' using errcode='22023';end if;
 for pair in
  select low_id,high_id from (
   select least(home_user_id,away_user_id) low_id,greatest(home_user_id,away_user_id) high_id
    from public.async_matches where away_user_id is not null and status='completed'
   union select low_user_id,high_user_id from public.async_rivalries
  ) pairs where p_after_low is null or (low_id,high_id)>(p_after_low,p_after_high)
  order by low_id,high_id limit p_limit
 loop
  perform public.rebuild_async_rivalry(pair.low_id,pair.high_id);
  n:=n+1;last_lo:=pair.low_id;last_hi:=pair.high_id;
 end loop;
 return jsonb_build_object('processed',n,'afterLow',last_lo,'afterHigh',last_hi);
end $$;
revoke all on function public.rebuild_async_rivalries(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.rebuild_async_rivalries(uuid,uuid,integer) to service_role;
commit;
