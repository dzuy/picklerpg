begin;
create table public.match_trash_talk (
 match_id uuid not null references public.async_matches(id) on delete cascade,
 id uuid not null,
 sender_id uuid not null references auth.users(id) on delete cascade,
 player text not null check(player in ('you','opponent-left')),
 text text not null check(char_length(text) between 1 and 80),
 version bigint not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(match_id,id)
);
create index match_trash_talk_version on public.match_trash_talk(match_id,version,created_at);
alter table public.match_trash_talk enable row level security;
revoke all on public.match_trash_talk from public,anon,authenticated,service_role;

create function public.get_match_trash_talk(p_match_id uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; result jsonb;
begin
 select * into m from public.async_matches where id=p_match_id;
 if not found or p_actor is null or p_actor not in(m.home_user_id,m.away_user_id) then raise exception 'Match not found' using errcode='P0002'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'player',player,'text',text,'version',version,'createdAt',created_at) order by created_at,id),'[]'::jsonb) into result
 from public.match_trash_talk where match_id=m.id and (version>=m.version-1 or created_at>clock_timestamp()-interval '4 seconds');
 return jsonb_build_object('messages',result,'serverTime',clock_timestamp());
end $$;
create function public.send_match_trash_talk(p_match_id uuid,p_actor uuid,p_id uuid,p_text text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; old public.match_trash_talk;
begin
 -- Serialize with gameplay so each message belongs unambiguously to the next move.
 select * into m from public.async_matches where id=p_match_id for update;
 if not found or p_actor is null or p_actor not in(m.home_user_id,m.away_user_id) then raise exception 'Match not found' using errcode='P0002'; end if;
 select * into old from public.match_trash_talk where match_id=m.id and id=p_id;
 if found then
  if old.sender_id<>p_actor or old.text<>p_text then raise exception 'Message conflict' using errcode='PT409'; end if;
  return public.get_match_trash_talk(m.id,p_actor);
 end if;
 if exists(select 1 from public.match_trash_talk where match_id=m.id and sender_id=p_actor and created_at>clock_timestamp()-interval '3 seconds') then raise exception 'Chat cooldown' using errcode='PT429'; end if;
 insert into public.match_trash_talk(match_id,id,sender_id,player,text,version) values(m.id,p_id,p_actor,case when m.home_user_id=p_actor then 'you' else 'opponent-left' end,p_text,m.version);
 return public.get_match_trash_talk(m.id,p_actor);
end $$;
revoke all on function public.get_match_trash_talk(uuid,uuid),public.send_match_trash_talk(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.get_match_trash_talk(uuid,uuid),public.send_match_trash_talk(uuid,uuid,uuid,text) to service_role;
commit;
