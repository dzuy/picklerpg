begin;
-- Reports are viewer-specific: opponents receive different advice for the same game.
create table public.game_analyses (
 owner_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check(mode in ('solo','friends')),
 game_id uuid not null,
 analysis jsonb,
 model text,
 generated_at timestamptz,
 claim_token uuid,
 lease_until timestamptz,
 primary key(owner_id,mode,game_id),
 check ((analysis is null and claim_token is not null and lease_until is not null)
  or (analysis is not null and jsonb_typeof(analysis)='object' and analysis ? 'report' and analysis ? 'coverage'
   and generated_at is not null and model is not null and claim_token is null and lease_until is null))
);
alter table public.game_analyses enable row level security;
revoke all on public.game_analyses from public,anon,authenticated,service_role;
grant select,update,delete on public.game_analyses to service_role;

-- One generation across server instances. Abandoned claims recover after two minutes.
create function public.claim_game_analysis(p_owner uuid,p_mode text,p_game uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
 insert into public.game_analyses(owner_id,mode,game_id,claim_token,lease_until)
 values(p_owner,p_mode,p_game,p_token,now()+interval '2 minutes')
 on conflict(owner_id,mode,game_id) do update
 set claim_token=excluded.claim_token,lease_until=excluded.lease_until
 where game_analyses.analysis is null and game_analyses.lease_until<now()
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.claim_game_analysis(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_game_analysis(uuid,text,uuid,uuid) to service_role;
commit;
