-- PostHog reads existing committed facts; no analytics warehouse or duplicate event store.
-- Preserve account conversions in the existing invitation/onboarding audit ledger.
begin;
create function public.capture_product_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_anonymous and (TG_OP='INSERT' or old.is_anonymous) then
  insert into public.invite_events(event_key,event,actor_id) values('account:'||new.id,'account_created',new.id) on conflict do nothing;
 end if;
 if TG_OP='UPDATE' and coalesce(old.raw_app_meta_data->'full_game_analysis','false'::jsonb) is distinct from coalesce(new.raw_app_meta_data->'full_game_analysis','false'::jsonb) then
  insert into public.xp_analytics(account_id,event_key,event,properties) values(new.id,'entitlement:'||gen_random_uuid(),'plus_entitlement_changed',jsonb_build_object('feature','full_game_analysis','enabled',coalesce(new.raw_app_meta_data->'full_game_analysis'='true'::jsonb,false),'source','trusted_metadata'));
 end if;
 return new;
exception when others then raise warning 'Product analytics audit unavailable';return new;
end;$$;
create trigger capture_product_account after insert or update of is_anonymous,raw_app_meta_data on auth.users for each row execute function public.capture_product_account();

-- Skill edits already commit on the server. Retain facts in the existing XP audit ledger.
create function public.capture_product_skills() returns trigger language plpgsql security definer set search_path='' as $$
declare before_points integer;after_points integer;before_build jsonb;after_build jsonb;player_key text;
begin
 before_build:=coalesce(to_jsonb(old)->'skills',to_jsonb(old)#>'{player_snapshot,skills}');after_build:=coalesce(to_jsonb(new)->'skills',to_jsonb(new)#>'{player_snapshot,skills}');
 if after_build is not distinct from before_build then return new;end if;
 player_key:=coalesce(to_jsonb(new)->>'id','community-'||(to_jsonb(new)->>'public_id'));
 before_points:=public.skill_points(before_build);after_points:=public.skill_points(after_build);
 insert into public.xp_analytics(account_id,event_key,event,properties) values(new.owner_id,
 'skills:'||player_key||':'||gen_random_uuid(),case when after_points>before_points then 'skill_point_allocated' else 'skill_points_reallocated' end,
 jsonb_build_object('player_id',player_key,'points_used',after_points,'source','roster'));
 return new;
exception when others then raise warning 'Product analytics audit unavailable';return new;
end;$$;
-- Function name for skill-budget accounting is checked by the migration tests.
create trigger capture_product_skills after update of skills on public.players for each row execute function public.capture_product_skills();
create trigger capture_product_community_skills after update of player_snapshot on public.community_player_selections for each row execute function public.capture_product_skills();
create function public.capture_product_player() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.xp_analytics(account_id,event_key,event,properties) values(new.owner_id,'player:'||new.id,'player_created',jsonb_build_object('player_id',new.id,'source','cloud_roster')) on conflict do nothing;return new;
exception when others then raise warning 'Product analytics audit unavailable';return new;end;$$;
create trigger capture_product_player after insert on public.players for each row execute function public.capture_product_player();

-- Preserve the original request kind when the sender later confirms an automatic offer.
alter table public.async_invitations add column rematch_requested_automatically boolean;
update public.async_invitations i set rematch_requested_automatically=coalesce((to_jsonb(i)->>'rematch_manual')::boolean=false,false);
create function public.stamp_rematch_request_kind() returns trigger language plpgsql set search_path='' as $$begin
 if TG_OP='INSERT' then new.rematch_requested_automatically:=coalesce((to_jsonb(new)->>'rematch_manual')::boolean=false,false);
 else new.rematch_requested_automatically:=old.rematch_requested_automatically;end if;return new;end;$$;
create trigger stamp_rematch_request_kind before insert or update on public.async_invitations for each row execute function public.stamp_rematch_request_kind();
alter table public.async_invitations add column declined_at timestamptz;
create function public.stamp_invitation_decline() returns trigger language plpgsql set search_path='' as $$begin if new.status='declined' and old.status='pending' then new.declined_at:=now();end if;return new;end;$$;
create trigger stamp_invitation_decline before update of status on public.async_invitations for each row execute function public.stamp_invitation_decline();

create view public.product_analytics_events as
with participants as (
 select m.*,p.actor_id,case when p.actor_id=m.home_user_id then m.away_user_id else m.home_user_id end opponent_id,
  i.rematch_of,not i.rematch_requested_automatically rematch_manual,
  coalesce(f.accepted_at,m.created_at) started_at,
  row_number() over(partition by p.actor_id order by coalesce(f.accepted_at,m.created_at),m.id) player_match_number,
  row_number() over(partition by p.actor_id,case when p.actor_id=m.home_user_id then m.away_user_id else m.home_user_id end order by m.created_at,m.id) match_number_between_players
 from public.async_matches m cross join lateral (values(m.home_user_id),(m.away_user_id)) p(actor_id)
 join auth.users u on u.id=p.actor_id
 left join public.async_invitations i on i.match_id=m.id
 left join public.friend_challenges f on f.match_id=m.id
 where p.actor_id is not null and coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false)=false
 and (m.friend_state is null or m.friend_state='accepted')
),match_facts as (
 select p.*,jsonb_strip_nulls(jsonb_build_object('match_id',p.id,'game_mode','multiplayer','opponent_id',p.opponent_id,
 'opponent_is_bot',coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false),
 'match_number_between_players',match_number_between_players,'player_match_number',player_match_number,
 'rematch_of_match_id',rematch_of,'manual_vs_auto',case when rematch_of is not null then case when rematch_manual=false then 'automatic' else 'manual' end end)) props
 from participants p left join auth.users u on u.id=p.opponent_id
)
select 'match:'||id||':'||actor_id||':'||e.event event_id,actor_id,e.event,e.occurred_at,props||e.extra properties
from match_facts cross join lateral (values
 ('match_created',created_at,'{}'::jsonb),('match_started',started_at,'{}'::jsonb),
 (case when ended_by is null then 'match_completed' else 'match_abandoned' end,completed_at,
 jsonb_build_object('won',winner_user_id=actor_id,'home_score',checkpoint#>'{scoring,score,home}','away_score',checkpoint#>'{scoring,score,away}',
 'number_of_turns',version,'duration_seconds',greatest(0,extract(epoch from completed_at-started_at))))
) e(event,occurred_at,extra) where e.occurred_at is not null
union all
select 'rematch:'||id||':'||actor_id||':'||e.event,actor_id,e.event,e.occurred_at,
 props||jsonb_build_object('original_match_id',rematch_of,'rematch_match_id',id)
from match_facts cross join lateral(values('rematch_started',started_at),('rematch_completed',case when ended_by is null then completed_at end)) e(event,occurred_at)
where rematch_of is not null and e.occurred_at is not null
union all
select 'solo:'||h.id||':'||h.owner_id,h.owner_id,case when h.ended_early then 'match_abandoned' else 'match_completed' end,h.completed_at,
 jsonb_build_object('match_id',h.id,'game_mode','solo','won',h.won,'home_score',h.home_score,'away_score',h.away_score,'result_authority','validated_client_report')
from public.match_history h
union all
select 'xp:'||x.account_id||':'||x.event_key||':'||x.event,x.account_id,x.event,x.created_at,x.properties
from public.xp_analytics x where x.event in ('xp_earned','skill_point_earned','skill_point_allocated','skill_points_reallocated','plus_entitlement_changed','player_created')
union all
select 'invite:'||i.id||':'||e.event||':'||e.actor_id,e.actor_id,e.event,e.occurred_at,
 jsonb_strip_nulls(jsonb_build_object('invite_id',i.id,'inviter_id',i.creator_id,'opponent_id',case when e.actor_id=i.creator_id then i.recipient_id else i.creator_id end,
 'resulting_match_id',i.match_id,'invite_method','in_app','original_match_id',i.rematch_of,'rematch_match_id',case when i.rematch_of is not null then i.match_id end,
 'manual_vs_auto',case when i.rematch_requested_automatically then 'automatic' else 'manual' end))
from public.async_invitations i left join public.async_matches m on m.id=i.match_id
cross join lateral(values
 ('invite_created',i.creator_id,i.created_at),('invite_sent',i.creator_id,i.created_at),
 ('invite_accepted',i.recipient_id,case when i.status='accepted' then m.created_at end),
 ('rematch_declined',i.recipient_id,case when i.rematch_of is not null then i.declined_at end),
 (case when i.rematch_requested_automatically then 'rematch_auto_requested' else 'rematch_manual_requested' end,i.creator_id,case when i.rematch_of is not null then i.created_at end),
 ('rematch_accepted',i.creator_id,case when i.rematch_of is not null and i.status='accepted' then m.created_at end),
 ('rematch_accepted',i.recipient_id,case when i.rematch_of is not null and i.status='accepted' then m.created_at end)
) e(event,actor_id,occurred_at) join auth.users u on u.id=e.actor_id
where e.occurred_at is not null and coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false)=false
union all
select 'friend:'||v.event_key,coalesce(v.actor_id,f.inviter_id),
 case v.event when 'invite_link_opened' then 'invite_opened' when 'invite_link_copied' then 'invite_sent'
 when 'invite_share_completed' then 'invite_sent' when 'guest_first_turn_completed' then 'invited_player_activated'
 when 'guest_game_completed' then 'invited_player_first_match_completed' else v.event end,
 v.created_at,jsonb_strip_nulls(jsonb_build_object('invite_id',v.invite_id,'inviter_id',f.inviter_id,'resulting_match_id',v.game_id,
 'signup_source',case when exists(select 1 from public.xp_invites x where x.invited_account_id=v.actor_id) then 'invite' else 'direct' end,
 'invite_method',case when v.event='invite_link_copied' then 'link_copy' when v.event='invite_share_completed' then 'native_share' end,
 'attribution_scope',case when v.actor_id is null then 'invite_link' else 'actor' end))
from public.invite_events v left join public.friend_challenges f on f.id=v.invite_id
where v.event in ('account_created','invite_created','invite_accepted','invite_link_opened','invite_link_copied','invite_share_completed')
and coalesce(v.actor_id,f.inviter_id) is not null
union all
select 'friend-activation:'||f.id,f.claimed_user_id,'invited_player_activated',a.first_turn,
 jsonb_build_object('invite_id',f.id,'inviter_id',f.inviter_id,'resulting_match_id',f.match_id)
from public.friend_challenges f join lateral(select min(created_at) first_turn from public.async_match_actions where match_id=f.match_id and actor_id=f.claimed_user_id) a on a.first_turn is not null
union all
select 'friend-completion:'||f.id,f.claimed_user_id,'invited_player_first_match_completed',m.completed_at,
 jsonb_build_object('invite_id',f.id,'inviter_id',f.inviter_id,'resulting_match_id',f.match_id)
from public.friend_challenges f join public.async_matches m on m.id=f.match_id
where f.claimed_user_id is not null and m.status='completed' and m.ended_by is null
union all
select 'invite-activation:'||i.id,i.recipient_id,'invited_player_activated',a.first_turn,
 jsonb_build_object('invite_id',i.id,'inviter_id',i.creator_id,'resulting_match_id',i.match_id)
from public.async_invitations i join auth.users u on u.id=i.recipient_id
join lateral(select min(created_at) first_turn from public.async_match_actions where match_id=i.match_id and actor_id=i.recipient_id) a on a.first_turn is not null
where coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false)=false
union all
select 'invite-completion:'||i.id,i.recipient_id,'invited_player_first_match_completed',m.completed_at,
 jsonb_build_object('invite_id',i.id,'inviter_id',i.creator_id,'resulting_match_id',i.match_id)
from public.async_invitations i join public.async_matches m on m.id=i.match_id join auth.users u on u.id=i.recipient_id
where m.status='completed' and m.ended_by is null and coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false)=false
union all
select 'turn:'||s.match_id||':'||s.action_id||':'||e.event,s.chooser_id,e.event,s.created_at,
 jsonb_build_object('match_id',s.match_id,'game_mode','multiplayer','opponent_id',s.opponent_id,'turn_number',s.to_version,
 'shot_type',s.intent->>'type','home_score',s.pre_score->'home','away_score',s.pre_score->'away')
from public.shot_selection_events s join auth.users u on u.id=s.chooser_id
cross join (values('shot_selected'),('turn_completed')) e(event)
where s.provenance='live' and coalesce((u.raw_app_meta_data->>'community_bot')::boolean,false)=false;
revoke all on function public.capture_product_account(),public.capture_product_skills(),public.capture_product_player(),public.stamp_invitation_decline(),public.stamp_rematch_request_kind() from public,anon,authenticated;
revoke all on public.product_analytics_events from public,anon,authenticated;
grant select on public.product_analytics_events to service_role;
-- Keyset pagination at a fixed cutoff. No OFFSET skipping of newly committed facts.
create function public.product_analytics_page(p_since timestamptz,p_until timestamptz,p_after_time timestamptz,p_after_id text,p_limit integer default 100)
returns setof public.product_analytics_events language sql stable security definer set search_path='' as $$
 select * from public.product_analytics_events where occurred_at>=p_since and occurred_at<p_until
 and (p_after_time is null or (occurred_at,event_id)>(p_after_time,p_after_id))
 order by occurred_at,event_id limit least(greatest(p_limit,1),1000);
$$;
revoke all on function public.product_analytics_page(timestamptz,timestamptz,timestamptz,text,integer) from public,anon,authenticated;
grant execute on function public.product_analytics_page(timestamptz,timestamptz,timestamptz,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
