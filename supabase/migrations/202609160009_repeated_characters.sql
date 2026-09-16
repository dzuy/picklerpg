-- A character may occupy multiple independent court slots, including on both teams.
create or replace function public.record_match_players(p_id uuid,p_home_names text,p_away_names text,p_home_score integer,p_away_score integer,p_ended_early boolean,p_participants jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to save a match'; end if;
 if p_participants is null or jsonb_typeof(p_participants) <> 'array' then raise exception 'Invalid participants'; end if;
 if jsonb_array_length(p_participants) > 4 or exists (
  select 1 from jsonb_array_elements(p_participants) p
  where jsonb_typeof(p) <> 'object' or coalesce(length(p->>'player_id'),0) not between 1 and 100
   or coalesce(length(p->>'name'),0) not between 1 and 24 or coalesce(p->>'team','') not in ('home','away')
 )
 then raise exception 'Invalid participants'; end if;
 if p_ended_early then
  perform public.record_early_match(p_id,p_home_names,p_away_names,p_home_score,p_away_score);
 else
  perform public.record_match(p_id,p_home_names,p_away_names,p_home_score,p_away_score);
 end if;
 update public.match_history set participants=p_participants where owner_id=auth.uid() and id=p_id and participants is null;
end; $$;
revoke all on function public.record_match_players(uuid,text,text,integer,integer,boolean,jsonb) from public,anon;
grant execute on function public.record_match_players(uuid,text,text,integer,integer,boolean,jsonb) to authenticated;
