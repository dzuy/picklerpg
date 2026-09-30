-- Fun themes are presentation-only, permanently owned through Fun or Everything.
alter table public.async_invitations add column court_theme text not null default 'none'
 check (court_theme in ('none','disco','eighties','horrified','fairy'));
create or replace function public.premium_free_appearance(p_appearance jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; options jsonb; result jsonb:=p_appearance; defaults jsonb:='{"outfit":"none","outfitColor":"#36936c","facialHair":"none","facialHairColor":"#493629","expression":"happy","paddleShape":"squarish","presentation":"boy","face":"oval","hairStyle":"short","hat":"cap","glasses":"none","glassesColor":"#25272d","lensColor":"#b7dce5","shoeStyle":"court","skin":"#dba67f","hair":"#493629","jersey":"#f3dc86","accent":"#214d43","hatColor":"#214d43","bottomColor":"#214d43","top":"jersey","bottom":"shorts","accessory":"wristband","shoes":"#214d43","paddle":"#214d43"}';
begin
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (p_appearance->>k) then result:=jsonb_set(result,array[k],defaults->k); end if;
 end loop;return result-'funTheme'-'funVariant'-'funPaddle'-'funOverrides';
end $$;

create or replace function public.pack_appearance(p_appearance jsonb,p_owner uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare k text;options jsonb;result jsonb:=p_appearance;defaults jsonb:=public.premium_free_appearance(p_appearance);
begin
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (p_appearance->>k) and not public.pack_owned(p_owner,case when k='paddleShape' then 'fun' else 'style' end) then result:=jsonb_set(result,array[k],defaults->k);end if;
 end loop;if not public.pack_owned(p_owner,'fun') then result:=result-'funTheme'-'funVariant'-'funPaddle'-'funOverrides';end if;return result;
end $$;

create function public.check_fun_player() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; v text;
begin
 foreach k in array array['funTheme','funPaddle'] loop
  v:=coalesce(new.appearance->>k,'none');
  if v not in ('none','disco','eighties','horrified','fairy') then raise exception 'Invalid theme' using errcode='22023';end if;
  if v<>'none' and public.premium_enforced() and not public.pack_owned(new.owner_id,'fun')
   and not exists(select 1 from auth.users where id=new.owner_id and raw_app_meta_data->>'community_bot'='true')
   and (tg_op='INSERT' or new.appearance->k is distinct from old.appearance->k or (k='funTheme' and new.appearance->'funVariant' is distinct from old.appearance->'funVariant')) then
   raise exception 'Fun Pack is required for this theme.' using errcode='PT403';
  end if;
 end loop;
 if new.appearance ? 'funVariant' and new.appearance->>'funVariant' not in ('0','1') then raise exception 'Invalid theme look' using errcode='22023';end if;
 return new;
end $$;
create trigger check_fun_player before insert or update of appearance on public.players for each row execute function public.check_fun_player();
create function public.check_fun_invitation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.court_theme<>'none' and public.premium_enforced() and not public.pack_owned(new.creator_id,'fun') then raise exception 'Fun Pack is required to host this theme.' using errcode='PT403';end if;
 return new;
end $$;
create trigger check_fun_invitation before insert or update of court_theme on public.async_invitations for each row execute function public.check_fun_invitation();
create function public.apply_fun_match() returns trigger language plpgsql security definer set search_path='' as $$
declare theme text; owner uuid; invited public.async_invitations;
begin
 select * into invited from public.async_invitations where id=new.id;
 if found then theme:=invited.court_theme;owner:=invited.creator_id;
 else theme:=coalesce(new.checkpoint->>'courtTheme','none');owner:=new.home_user_id;end if;
 if theme not in ('none','disco','eighties','horrified','fairy') then raise exception 'Invalid theme' using errcode='22023';end if;
 if theme<>'none' and public.premium_enforced() and not public.pack_owned(owner,'fun') then raise exception 'Fun Pack is required to host this theme.' using errcode='PT403';end if;
 if theme<>'none' then new.checkpoint:=jsonb_set(new.checkpoint,'{courtTheme}',to_jsonb(theme));else new.checkpoint:=new.checkpoint-'courtTheme';end if;
 return new;
end $$;
create trigger apply_fun_match before insert on public.async_matches for each row execute function public.apply_fun_match();
revoke all on function public.check_fun_player(),public.check_fun_invitation(),public.apply_fun_match() from public,anon,authenticated;
create or replace function public.create_async_invitation(p_invite jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations;
begin
 perform pg_advisory_xact_lock(hashtextextended((p_invite->>'creator_id')||':'||(p_invite->>'request_id'),0));
 select * into i from public.async_invitations where creator_id=(p_invite->>'creator_id')::uuid and request_id=(p_invite->>'request_id')::uuid;
 if found then if i.request_hash<>p_invite->>'request_hash' then raise exception 'Invitation conflict' using errcode='PT409';end if;return to_jsonb(i);end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,court_theme,scoring,points_limit,request_id,request_hash) values((p_invite->>'id')::uuid,(p_invite->>'creator_id')::uuid,(p_invite->>'recipient_id')::uuid,p_invite->'team',p_invite->>'court',coalesce(p_invite->>'court_theme','none'),p_invite->>'scoring',coalesce((p_invite->>'points_limit')::integer,3),(p_invite->>'request_id')::uuid,p_invite->>'request_hash') returning * into i;
 return to_jsonb(i);
end $$;

create or replace function public.create_async_rematch(p_source uuid,p_actor uuid,p_invite jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source public.async_matches; invitation public.async_invitations; opponent uuid;
begin
 -- Serialize both players, including the race before the invitation exists.
 select * into source from public.async_matches where id=p_source for update;
 if not found or p_actor is null or (p_actor is distinct from source.home_user_id and p_actor is distinct from source.away_user_id) then raise exception 'Not found' using errcode='P0002';end if;
 if source.status<>'completed' or source.away_user_id is null then raise exception 'Finish this game first' using errcode='PT409';end if;
 select * into invitation from public.async_invitations where rematch_of=p_source;
 if found then
  if invitation.creator_id=p_actor and coalesce((p_invite->>'rematch_manual')::boolean,true) then
   update public.async_invitations set rematch_manual=true where id=invitation.id returning * into invitation;
  end if;
  return to_jsonb(invitation);
 end if;
 opponent:=case when p_actor=source.home_user_id then source.away_user_id else source.home_user_id end;
 if p_invite->>'creator_id' is distinct from p_actor::text or p_invite->>'recipient_id' is distinct from opponent::text
 or p_invite->>'scoring' is distinct from source.checkpoint#>>'{rules,scoring}'
 or p_invite->>'court' is distinct from coalesce(source.checkpoint->>'court','forest')
 then raise exception 'Invalid rematch' using errcode='22023';end if;
 insert into public.async_invitations(id,creator_id,recipient_id,team,court,court_theme,scoring,points_limit,request_id,request_hash,rematch_of,rematch_manual)
 values((p_invite->>'id')::uuid,p_actor,opponent,p_invite->'team',p_invite->>'court',case when not public.premium_enforced() or public.pack_owned(p_actor,'fun') then coalesce(source.checkpoint->>'courtTheme','none') else 'none' end,p_invite->>'scoring',coalesce((source.checkpoint#>>'{rules,target}')::integer,3),(p_invite->>'request_id')::uuid,p_invite->>'request_hash',p_source,coalesce((p_invite->>'rematch_manual')::boolean,true)) returning * into invitation;
 return to_jsonb(invitation);
end $$;
revoke all on function public.create_async_rematch(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_async_rematch(uuid,uuid,jsonb) to service_role;
