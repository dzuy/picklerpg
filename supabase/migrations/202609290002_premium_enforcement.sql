begin;
-- Generated from player-customization-tiers.ts and DEFAULT_APPEARANCE; parity-tested.
create function public.premium_cosmetic_options() returns jsonb language sql immutable set search_path='' as $$ select '{"hairStyle":["bun","side-part","curls","mohawk","long","pigtails","twin-buns","side-braid","long-waves","high-fade","afro"],"facialHair":["goatee","long-beard","chops"],"expression":["angry","crying","confident"],"hat":["beanie","bucket","crown","tiara","viking","cowboy","santa","sombrero"],"top":["polo","hoodie","long-sleeve"],"bottom":["pleated-skirt","pants"],"glasses":["wraparound","cat-eye","hexagon","stars","flowers","hearts","diamonds","oversized"],"outfit":["frog","dinosaur","lion","bear","butterfly","bee"],"accessory":["watch","dinosaur-tail","cape"],"paddleShape":["rectangular","circular","squarish-circles","squarish-lines","rounded-circles","rounded-lines"]}'::jsonb $$;
create function public.premium_free_appearance(p_appearance jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; options jsonb; result jsonb:=p_appearance; defaults jsonb:='{"outfit":"none","outfitColor":"#36936c","facialHair":"none","facialHairColor":"#493629","expression":"happy","paddleShape":"squarish","presentation":"boy","face":"oval","hairStyle":"short","hat":"cap","glasses":"none","glassesColor":"#25272d","lensColor":"#b7dce5","shoeStyle":"court","skin":"#dba67f","hair":"#493629","jersey":"#f3dc86","accent":"#214d43","hatColor":"#214d43","bottomColor":"#214d43","top":"jersey","bottom":"shorts","accessory":"wristband","shoes":"#214d43","paddle":"#214d43"}';
begin
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (p_appearance->>k) then result:=jsonb_set(result,array[k],defaults->k); end if;
 end loop;return result;
end $$;
create function public.check_premium_player() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; options jsonb;
begin
 if not public.premium_enforced() or public.premium_active(new.owner_id) or exists(select 1 from auth.users where id=new.owner_id and raw_app_meta_data->>'community_bot'='true') then return new; end if;
 for k,options in select * from jsonb_each(public.premium_cosmetic_options()) loop
  if options ? (new.appearance->>k) and (tg_op='INSERT' or (old.appearance->k) is distinct from (new.appearance->k)) then
   raise exception 'PickleBash+ is required for this appearance choice.' using errcode='PT403';
  end if;
 end loop;return new;
end $$;
create trigger check_premium_player before insert or update of appearance on public.players for each row execute function public.check_premium_player();
create function public.check_premium_court() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; court text;
begin
 if not public.premium_enforced() then return new; end if;
 if tg_table_name='async_invitations' then owner:=new.creator_id;court:=new.court;
 else owner:=new.inviter_id;select checkpoint->>'court' into court from public.async_matches where id=new.match_id;
 end if;
 if coalesce(court,'forest') not in ('forest','arizona','venice') and not public.premium_active(owner) then
  raise exception 'PickleBash+ is required to host this court.' using errcode='PT403';
 end if;return new;
end $$;
create trigger check_premium_invitation before insert on public.async_invitations for each row execute function public.check_premium_court();
create trigger check_premium_challenge before insert on public.friend_challenges for each row execute function public.check_premium_court();
-- Pin effective looks only for a new game or newly claimed guest slot. Never change a running game's visuals.
create function public.apply_premium_match_appearance() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; slot text; slots text[]; entitled boolean;
begin
 if not public.premium_enforced() then return new; end if;
 foreach owner in array array[new.home_user_id,new.away_user_id] loop
  if owner is null then continue; end if;
  if exists(select 1 from auth.users where id=owner and raw_app_meta_data->>'community_bot'='true') then continue;end if;
  entitled:=public.premium_active(owner);
  if entitled then continue;end if;
  slots:=case when owner=new.home_user_id then array['you','partner'] else array['opponent-left','opponent-right'] end;
  foreach slot in array slots loop
   if new.checkpoint#>array['roster',slot,'design','appearance'] is not null then
    new.checkpoint:=jsonb_set(new.checkpoint,array['roster',slot,'design','appearance'],public.premium_free_appearance(new.checkpoint#>array['roster',slot,'design','appearance']));
   end if;
  end loop;
 end loop;return new;
end $$;
create trigger apply_premium_match_insert before insert on public.async_matches for each row execute function public.apply_premium_match_appearance();
create trigger apply_premium_match_claim before update of away_user_id on public.async_matches for each row when(old.away_user_id is distinct from new.away_user_id) execute function public.apply_premium_match_appearance();
revoke all on function public.premium_cosmetic_options(),public.premium_free_appearance(jsonb),public.check_premium_player(),public.check_premium_court(),public.apply_premium_match_appearance() from public,anon,authenticated;
grant execute on function public.premium_cosmetic_options(),public.premium_free_appearance(jsonb) to service_role;
-- Older clients can still submit a randomly chosen Premium starter in auth metadata.
-- Normalize only this new starter; existing player designs are never rewritten.
create or replace function public.create_signup_player() returns trigger
language plpgsql security definer set search_path='' as $$
declare player jsonb:=new.raw_user_meta_data->'starter_player'; appearance jsonb;
begin
 if new.raw_user_meta_data->>'username' is not null and player is not null
 and not exists(select 1 from public.players where owner_id=new.id) then
  appearance:=player->'appearance';
  if public.premium_enforced() and not public.premium_active(new.id) then appearance:=public.premium_free_appearance(appearance);end if;
  insert into public.players(owner_id,id,name,appearance,skills,handedness,is_active)
  values(new.id,'starter',left(player->>'name',24),appearance,player->'skills',player->>'handedness',true);
 end if;return new;
end $$;
commit;
