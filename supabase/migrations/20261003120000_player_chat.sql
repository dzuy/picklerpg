begin;
-- Pair identity survives team changes, rematches and removal of individual games.
create table public.player_conversations (
 id uuid primary key default gen_random_uuid(),
 low_user_id uuid not null references auth.users on delete cascade,
 high_user_id uuid not null references auth.users on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 unique(low_user_id,high_user_id), check(low_user_id<high_user_id)
);
create table public.player_messages (
 conversation_id uuid not null references public.player_conversations on delete cascade,
 id uuid not null, sender_id uuid not null references auth.users on delete cascade,
 match_id uuid references public.async_matches on delete set null,
 version bigint not null, text text not null check(char_length(text) between 1 and 500),
 created_at timestamptz not null default clock_timestamp(),
 primary key(conversation_id,id)
);
create index player_messages_history on public.player_messages(conversation_id,created_at desc,id desc);
create index player_messages_replay on public.player_messages(match_id,version);
create table public.player_chat_preferences (
 conversation_id uuid references public.player_conversations on delete cascade,
 owner_id uuid references auth.users on delete cascade,
 muted boolean not null default false, primary key(conversation_id,owner_id)
);
alter table public.player_conversations enable row level security;
alter table public.player_messages enable row level security;
alter table public.player_chat_preferences enable row level security;
revoke all on public.player_conversations,public.player_messages,public.player_chat_preferences from public,anon,authenticated,service_role;
-- No general client/admin chat listing. All application access is through scoped RPCs.
insert into public.player_conversations(low_user_id,high_user_id)
 select distinct least(m.home_user_id,m.away_user_id),greatest(m.home_user_id,m.away_user_id)
 from public.async_matches m join public.match_trash_talk t on t.match_id=m.id
 where m.away_user_id is not null and m.home_user_id<>m.away_user_id on conflict do nothing;
insert into public.player_messages(conversation_id,id,sender_id,match_id,version,text,created_at)
 select c.id,t.id,t.sender_id,t.match_id,t.version,t.text,t.created_at from public.match_trash_talk t
 join public.async_matches m on m.id=t.match_id
 join public.player_conversations c on c.low_user_id=least(m.home_user_id,m.away_user_id) and c.high_user_id=greatest(m.home_user_id,m.away_user_id)
 on conflict do nothing;

-- Explicit NULL checks avoid SQL's three-valued membership bypass for pending invites.
create function public.require_player_chat(p_match_id uuid,p_actor uuid) returns public.player_conversations
language plpgsql security definer set search_path='' as $$
declare m public.async_matches; c public.player_conversations;
begin
 select * into m from public.async_matches where id=p_match_id;
 if not found or p_actor is null or m.away_user_id is null or m.home_user_id=m.away_user_id or (p_actor<>m.home_user_id and p_actor<>m.away_user_id) then raise exception 'Match not found' using errcode='P0002';end if;
 if public.is_account_archived(p_actor) then raise exception 'Contact unavailable' using errcode='PT410';end if;
 insert into public.player_conversations(low_user_id,high_user_id) values(least(m.home_user_id,m.away_user_id),greatest(m.home_user_id,m.away_user_id)) on conflict do nothing;
 select * into c from public.player_conversations where low_user_id=least(m.home_user_id,m.away_user_id) and high_user_id=greatest(m.home_user_id,m.away_user_id);
 return c;
end $$;
create function public.get_player_chat(p_match_id uuid,p_actor uuid,p_before_time timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.player_conversations;m public.async_matches;other_id uuid;result jsonb;replay jsonb;next_cursor jsonb;is_blocked boolean;own_block boolean;is_muted boolean;other_name text;
begin
 c:=public.require_player_chat(p_match_id,p_actor);
 select * into m from public.async_matches where id=p_match_id;
 other_id:=case when c.low_user_id=p_actor then c.high_user_id else c.low_user_id end;
 is_blocked:=public.players_blocked(p_actor,other_id) or public.is_account_archived(other_id);
 select exists(select 1 from public.player_blocks where owner_id=p_actor and blocked_id=other_id) into own_block;
 select coalesce((select muted from public.player_chat_preferences where conversation_id=c.id and owner_id=p_actor),false) into is_muted;
 select left(coalesce(raw_user_meta_data->>'username',raw_user_meta_data->>'player_name','Opponent'),24) into other_name from auth.users where id=other_id;
 with page as (
  select * from public.player_messages where conversation_id=c.id and not is_blocked
  and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id)) order by created_at desc,id desc limit 51
 ), visible as (select * from page order by created_at desc,id desc limit 50)
 select coalesce((select jsonb_agg(jsonb_build_object('id',id,'senderId',sender_id,'matchId',match_id,'player',case when sender_id=m.home_user_id then 'you' else 'opponent-left' end,'text',text,'version',version,'createdAt',created_at) order by created_at,id) from visible),'[]'::jsonb),
 case when (select count(*) from page)>50 then (select jsonb_build_object('time',created_at,'id',id) from visible order by created_at,id limit 1) else null end into result,next_cursor;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'senderId',sender_id,'matchId',match_id,'player',case when sender_id=m.home_user_id then 'you' else 'opponent-left' end,'text',text,'version',version,'createdAt',created_at) order by created_at,id),'[]'::jsonb) into replay
 from public.player_messages where conversation_id=c.id and match_id=m.id and not is_blocked and version>=m.version-1;
 return jsonb_build_object('conversationId',c.id,'opponentName',other_name,'messages',result,'replayMessages',replay,'nextCursor',next_cursor,'muted',is_muted,'blocked',is_blocked,'blockedByYou',own_block,'serverTime',clock_timestamp());
end $$;
create function public.send_player_chat(p_match_id uuid,p_actor uuid,p_id uuid,p_text text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.player_conversations;old public.player_messages;m public.async_matches;
begin
 c:=public.require_player_chat(p_match_id,p_actor);
 -- Serialize sends across ALL matches for this pair; duplicate retries precede cooldown.
 perform 1 from public.player_conversations where id=c.id for update;
 if public.players_blocked(c.low_user_id,c.high_user_id) or public.is_account_archived(c.low_user_id) or public.is_account_archived(c.high_user_id) then raise exception 'Contact unavailable' using errcode='PT410';end if;
 if p_id is null or p_text is null or char_length(btrim(p_text)) not between 1 and 500 then raise exception 'Invalid message' using errcode='22023';end if;
 select * into old from public.player_messages where conversation_id=c.id and id=p_id;
 if found then
  if old.sender_id<>p_actor or old.text<>p_text then raise exception 'Message conflict' using errcode='PT409';end if;
  return public.get_player_chat(p_match_id,p_actor);
 end if;
 if exists(select 1 from public.player_messages where conversation_id=c.id and sender_id=p_actor and created_at>clock_timestamp()-interval '3 seconds') then raise exception 'Chat cooldown' using errcode='PT429';end if;
 select * into m from public.async_matches where id=p_match_id;
 insert into public.player_messages(conversation_id,id,sender_id,match_id,version,text) values(c.id,p_id,p_actor,p_match_id,m.version,p_text);
 return public.get_player_chat(p_match_id,p_actor);
end $$;
create function public.set_player_chat_muted(p_match_id uuid,p_actor uuid,p_muted boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.player_conversations;
begin
 c:=public.require_player_chat(p_match_id,p_actor);
 if p_muted is null then raise exception 'Invalid preference' using errcode='22023';end if;
 insert into public.player_chat_preferences(conversation_id,owner_id,muted) values(c.id,p_actor,p_muted) on conflict(conversation_id,owner_id) do update set muted=excluded.muted;
 return public.get_player_chat(p_match_id,p_actor);
end $$;
-- The reporter must belong to the conversation and may only report the other sender.
-- Snapshot is copied into the existing, restricted player_reports review queue.
create function public.player_chat_report_evidence(p_match_id uuid,p_actor uuid,p_message_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.player_conversations;result jsonb;
begin
 c:=public.require_player_chat(p_match_id,p_actor);
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) into result from (
  select id,text,created_at,match_id from public.player_messages where conversation_id=c.id and sender_id<>p_actor and (p_message_id is null or id=p_message_id) order by created_at desc,id desc limit 10
 ) e;
 if p_message_id is not null and jsonb_array_length(result)=0 then raise exception 'Message unavailable' using errcode='P0002';end if;
 return jsonb_build_object('conversationId',c.id,'messages',result);
end $$;
revoke all on function public.require_player_chat(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_player_chat(uuid,uuid,timestamptz,uuid),public.send_player_chat(uuid,uuid,uuid,text),public.set_player_chat_muted(uuid,uuid,boolean),public.player_chat_report_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_player_chat(uuid,uuid,timestamptz,uuid),public.send_player_chat(uuid,uuid,uuid,text),public.set_player_chat_muted(uuid,uuid,boolean),public.player_chat_report_evidence(uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
