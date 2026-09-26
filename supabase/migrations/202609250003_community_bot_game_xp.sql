-- Human players earn Friends XP against community bots too.
create or replace function public.friends_game_xp() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;c jsonb;r jsonb;won boolean;
begin
 if new.status<>'completed' or old.status='completed' or new.ended_by is not null or new.winner_user_id is null or new.away_user_id is null then return new;end if;
 select config into c from public.xp_config;r:=c->'friends';
 for owner in select id from auth.users where id in(new.home_user_id,new.away_user_id) and coalesce(raw_app_meta_data->>'community_bot','false')<>'true' order by id loop
 won:=owner=new.winner_user_id;
 perform public.grant_xp(owner,'game:'||new.id,'friends',(r->>0)::integer+case when won then (r->>1)::integer else 0 end,new.id,'friends',null,won,jsonb_build_object('completion_xp',(r->>0)::integer,'win_xp',case when won then (r->>1)::integer else 0 end));
 end loop;
 update public.xp_invites set first_game_completed=true where invited_account_id in(new.home_user_id,new.away_user_id);
 perform public.activate_invite_xp(new.home_user_id);perform public.activate_invite_xp(new.away_user_id);
 return new;
end;$$;
