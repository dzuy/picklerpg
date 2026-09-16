-- Accepted games retain their existing checkpoint, including on retries.
drop function public.claim_friend_challenge(text,uuid,text,boolean,boolean);
create function public.claim_friend_challenge(p_token text,p_actor uuid,p_name text,p_cancel boolean default false,p_guest boolean default true,p_opening_checkpoint jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 -- Build the opening rally with the game engine; install it only while claiming
 -- an untouched challenge under the same lock as participant assignment.
 if m.version<>0 or m.friend_state<>'pending' or
    p_opening_checkpoint is null or
    p_opening_checkpoint->>'matchId' is distinct from m.id::text or
    p_opening_checkpoint->>'engineVersion' is distinct from 'pickle-human-1' or
    p_opening_checkpoint->>'mode' is distinct from 'local-human' or
    p_opening_checkpoint->>'revision' is distinct from '0' or
    p_opening_checkpoint->>'pointIndex' is distinct from '0' or
    p_opening_checkpoint->>'openingTeam' is distinct from 'away' or
    p_opening_checkpoint#>>'{rally,kind}' is distinct from 'contact' or
    p_opening_checkpoint#>>'{rally,state,possession}' is distinct from 'away' or
    p_opening_checkpoint#>>'{scoring,serving}' is distinct from 'away' or
    p_opening_checkpoint#>>'{scoring,server}' is distinct from 'opponent-left' or
    p_opening_checkpoint#>'{scoring,score}' is distinct from m.checkpoint#>'{scoring,score}' or
    p_opening_checkpoint->'roster' is distinct from m.checkpoint->'roster' or
    p_opening_checkpoint->'rules' is distinct from m.checkpoint->'rules' then
   raise exception 'Invalid opening serve' using errcode='PT409';
 end if;
 update public.friend_challenges set status='accepted',recipient_is_guest=p_guest,claimed_user_id=p_actor,accepted_at=now() where id=i.id returning * into i;
 update public.async_matches set away_user_id=p_actor,friend_state='accepted',current_action_user_id=p_actor,
 checkpoint=jsonb_set(p_opening_checkpoint,'{roster,opponent-left,design,name}',to_jsonb(p_name)),updated_at=now() where id=m.id;
 select p.appearance into appearance from public.players p where p.owner_id=p_actor order by p.is_active desc,p.updated_at desc limit 1;
 if appearance is not null then update public.async_matches set checkpoint=jsonb_set(checkpoint,'{roster,opponent-left,design,appearance}',appearance) where id=m.id;end if;
 return to_jsonb(i);
end $$;
revoke all on function public.claim_friend_challenge(text,uuid,text,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.claim_friend_challenge(text,uuid,text,boolean,boolean,jsonb) to service_role;
