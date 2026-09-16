-- Preserve the selected invitation team instead of substituting the account’s active appearance.
create or replace function public.create_friend_challenge(p_invite jsonb,p_match jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.friend_challenges; m jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended((p_invite->>'inviter_id')||':'||(p_invite->>'request_id'),0));
 select * into i from public.friend_challenges where inviter_id=(p_invite->>'inviter_id')::uuid and request_id=(p_invite->>'request_id')::uuid;
 if found then
 if i.request_hash<>p_invite->>'request_hash' then raise exception 'Changed request' using errcode='PT409'; end if; return to_jsonb(i); end if;
 m:=public.create_async_test_match(p_match||jsonb_build_object('away_user_id',null));
 update public.async_matches set friend_state='pending',invited_name=p_invite->>'invited_name' where id=(m->>'id')::uuid;
 insert into public.friend_challenges(id,match_id,token,inviter_id,inviter_name,invited_name,request_id,request_hash)
 values((p_invite->>'id')::uuid,(m->>'id')::uuid,p_invite->>'token',(p_invite->>'inviter_id')::uuid,p_invite->>'inviter_name',p_invite->>'invited_name',(p_invite->>'request_id')::uuid,p_invite->>'request_hash') returning * into i;
 return to_jsonb(i);
end $$;

create or replace function public.friend_character_saved() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.async_matches; slot text; design jsonb;
begin
 if TG_OP='UPDATE' and not new.is_active and old.name=new.name and old.appearance=new.appearance then return new;end if;
 for m in select * from public.async_matches where friend_state='accepted' and status='active' and new.owner_id in(home_user_id,away_user_id) order by id for update loop
 for slot in select unnest(case when m.home_user_id=new.owner_id then array['you','partner'] else array['opponent-left'] end) loop
 if m.home_user_id=new.owner_id and m.checkpoint#>>array['roster',slot,'design','id'] is distinct from new.id then continue;end if;
 design:=m.checkpoint#>array['roster',slot,'design'];
 design:=design||jsonb_build_object('name',new.name,'appearance',new.appearance);
 update public.async_matches set checkpoint=jsonb_set(checkpoint,array['roster',slot,'design'],design),updated_at=now() where id=m.id;
 insert into public.invite_events(event_key,event,actor_id,invite_id,game_id) select 'character:'||new.owner_id,'guest_character_created',new.owner_id,id,m.id from public.friend_challenges where match_id=m.id on conflict do nothing;
 end loop;
 end loop;return new;
end $$;
