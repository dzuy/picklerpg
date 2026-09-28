begin;
create table public.api_rate_limits (
 key text primary key,
 window_start timestamptz not null,
 request_count integer not null
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public,anon,authenticated;
create index api_rate_limits_expiry on public.api_rate_limits(window_start);
create function public.consume_api_rate_limit(p_key text,p_limit integer) returns integer
language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp(); b public.api_rate_limits;
begin
 if p_limit<1 or p_limit>10000 or length(p_key)<>64 then raise exception 'Invalid rate limit'; end if;
 insert into public.api_rate_limits as limits(key,window_start,request_count) values(p_key,t,1)
 on conflict(key) do update set
 window_start=case when limits.window_start<=t-interval '1 minute' then t else limits.window_start end,
 request_count=case when limits.window_start<=t-interval '1 minute' then 1 else least(limits.request_count+1,p_limit+1) end
 returning * into b;
 if random()<0.01 then
  delete from public.api_rate_limits where key in
   (select key from public.api_rate_limits where window_start<t-interval '2 minutes' limit 1000);
 end if;
 if b.request_count>p_limit then return greatest(1,ceil(extract(epoch from b.window_start+interval '1 minute'-t))::integer); end if;
 return 0;
end $$;
revoke all on function public.consume_api_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,integer) to service_role;
commit;
