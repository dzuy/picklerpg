-- An unclaimed away slot has no auth identity. All writes remain server-only.
alter table public.async_matches alter column away_user_id drop not null;
alter table public.async_matches add column friend_state text check(friend_state in ('pending','accepted','cancelled'));
alter table public.async_matches add column invited_name text;
create table public.friend_challenges (
 id uuid primary key, match_id uuid not null unique references public.async_matches(id),
 token text not null unique check(token ~ '^[A-Za-z0-9_-]{43}$'),
 inviter_id uuid not null references auth.users(id), inviter_name text not null, invited_name text not null,
 status text not null default 'pending' check(status in ('pending','accepted','cancelled')),
 recipient_is_guest boolean, claimed_user_id uuid references auth.users(id), created_at timestamptz not null default now(), accepted_at timestamptz,
 request_id uuid not null, request_hash text not null, unique(inviter_id,request_id)
);
alter table public.friend_challenges enable row level security;
revoke all on public.friend_challenges from public,anon,authenticated;
grant select on public.friend_challenges to service_role;
create function public.create_friend_challenge(p_invite jsonb,p_match jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.friend_challenges; m jsonb; appearance jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended((p_invite->>'inviter_id')||':'||(p_invite->>'request_id'),0));
 select * into i from public.friend_challenges where inviter_id=(p_invite->>'inviter_id')::uuid and request_id=(p_invite->>'request_id')::uuid;
 if found then
 if i.request_hash<>p_invite->>'request_hash' then raise exception 'Changed request' using errcode='PT409'; end if; return to_jsonb(i); end if;
 m:=public.create_async_test_match(p_match||jsonb_build_object('away_user_id',null));
 update public.async_matches set friend_state='pending',invited_name=p_invite->>'invited_name' where id=(m->>'id')::uuid;
 select p.appearance into appearance from public.players p where p.owner_id=(p_invite->>'inviter_id')::uuid order by p.is_active desc,p.updated_at desc limit 1;
 if appearance is not null then update public.async_matches set checkpoint=jsonb_set(checkpoint,'{roster,you,design,appearance}',appearance) where id=(m->>'id')::uuid;end if;
 insert into public.friend_challenges(id,match_id,token,inviter_id,inviter_name,invited_name,request_id,request_hash)
 values((p_invite->>'id')::uuid,(m->>'id')::uuid,p_invite->>'token',(p_invite->>'inviter_id')::uuid,p_invite->>'inviter_name',p_invite->>'invited_name',(p_invite->>'request_id')::uuid,p_invite->>'request_hash') returning * into i;
 return to_jsonb(i);
end $$;
create function public.claim_friend_challenge(p_token text,p_actor uuid,p_name text,p_cancel boolean default false,p_guest boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.friend_challenges; m public.async_matches; appearance jsonb;
begin
 select * into i from public.friend_challenges where token=p_token for update;
 if not found then raise exception 'Unavailable challenge' using errcode='PT409'; end if;
 select * into m from public.async_matches where id=i.match_id for update;
 if p_cancel then
 if i.inviter_id<>p_actor or i.status<>'pending' then raise exception 'Cannot cancel' using errcode='PT409'; end if;
 update public.friend_challenges set status='cancelled' where id=i.id returning * into i;
 update public.async_matches set friend_state='cancelled' where id=m.id;
 return to_jsonb(i);
 end if;
 if i.status='accepted' and i.claimed_user_id=p_actor then return to_jsonb(i); end if;
 if i.status<>'pending' or i.inviter_id=p_actor then raise exception 'Already claimed or unavailable' using errcode='PT409'; end if;
 update public.friend_challenges set status='accepted',recipient_is_guest=p_guest,claimed_user_id=p_actor,accepted_at=now() where id=i.id returning * into i;
 update public.async_matches set away_user_id=p_actor,friend_state='accepted',
 checkpoint=jsonb_set(checkpoint,'{roster,opponent-left,design,name}',to_jsonb(p_name)),updated_at=now() where id=m.id;
 select p.appearance into appearance from public.players p where p.owner_id=p_actor order by p.is_active desc,p.updated_at desc limit 1;
 if appearance is not null then update public.async_matches set checkpoint=jsonb_set(checkpoint,'{roster,opponent-left,design,appearance}',appearance) where id=m.id;end if;
 return to_jsonb(i);
end $$;
-- Guard the authoritative commit path as well as the service.
create function public.guard_pending_friend_turn() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.async_matches where id=new.match_id and friend_state in ('pending','cancelled')) then raise exception 'Challenge unavailable' using errcode='PT409'; end if;
 return new;
end $$;
create trigger guard_pending_friend_turn before insert on public.async_match_actions for each row execute function public.guard_pending_friend_turn();
revoke all on function public.create_friend_challenge(jsonb,jsonb),public.claim_friend_challenge(text,uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.create_friend_challenge(jsonb,jsonb),public.claim_friend_challenge(text,uuid,text,boolean,boolean) to service_role;

-- Durable funnel events: no names, email addresses, or bearer invite tokens.
create table public.invite_events (
 event_key text primary key,event text not null,actor_id uuid,invite_id uuid references public.friend_challenges(id),
 game_id uuid references public.async_matches(id),created_at timestamptz not null default now()
);
alter table public.invite_events enable row level security;
revoke all on public.invite_events from public,anon,authenticated;
grant select,insert on public.invite_events to service_role;
create function public.friend_funnel_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
 insert into public.invite_events values('created:'||new.id,'invite_created',new.inviter_id,new.id,new.match_id,now()) on conflict do nothing;
 if exists(select 1 from public.friend_challenges where claimed_user_id=new.inviter_id and recipient_is_guest) then
 insert into public.invite_events values('sent:'||new.inviter_id,'guest_sent_first_invite',new.inviter_id,new.id,new.match_id,now()) on conflict do nothing;
 end if;
 elsif new.status='accepted' and old.status='pending' then
 insert into public.invite_events values('accepted:'||new.id,'invite_accepted',new.claimed_user_id,new.id,new.match_id,now()) on conflict do nothing;
 end if;return new;
end $$;
create trigger friend_funnel_event after insert or update on public.friend_challenges for each row execute function public.friend_funnel_event();
create function public.friend_turn_event() returns trigger language plpgsql security definer set search_path='' as $$
declare i public.friend_challenges;
begin
 select * into i from public.friend_challenges where match_id=new.match_id;
 if found and i.recipient_is_guest then
 if new.actor_id=i.claimed_user_id then insert into public.invite_events values('first-turn:'||i.id,'guest_first_turn_completed',new.actor_id,i.id,i.match_id,now()) on conflict do nothing;end if;
 if new.result->>'status'='completed' then insert into public.invite_events values('completed:'||i.id,'guest_game_completed',i.claimed_user_id,i.id,i.match_id,now()) on conflict do nothing;end if;
 end if;return new;
end $$;
create trigger friend_turn_event after insert on public.async_match_actions for each row execute function public.friend_turn_event();

-- Character saves change cosmetics only, under the same match row lock as turns.
-- The slot, gameplay skills, checkpoint revision, ball and scoring remain intact.
create function public.friend_character_saved() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.async_matches; slot text; design jsonb;
begin
 if TG_OP='UPDATE' and not new.is_active and old.name=new.name and old.appearance=new.appearance then return new;end if;
 for m in select * from public.async_matches where friend_state='accepted' and status='active' and new.owner_id in(home_user_id,away_user_id) order by id for update loop
 slot:=case when m.home_user_id=new.owner_id then 'you' else 'opponent-left' end;
 design:=m.checkpoint#>array['roster',slot,'design'];
 design:=design||jsonb_build_object('name',new.name,'appearance',new.appearance);
 update public.async_matches set checkpoint=jsonb_set(checkpoint,array['roster',slot,'design'],design),updated_at=now() where id=m.id;
 insert into public.invite_events(event_key,event,actor_id,invite_id,game_id) select 'character:'||new.owner_id,'guest_character_created',new.owner_id,id,m.id from public.friend_challenges where match_id=m.id on conflict do nothing;
 end loop;return new;
end $$;
create trigger friend_character_saved after insert or update of name,appearance,is_active on public.players for each row execute function public.friend_character_saved();
