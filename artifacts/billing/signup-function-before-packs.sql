-- Production function captured before permanent-pack migrations, 2026-09-29.
-- Supabase scheduled physical backup: 2026-09-29 10:09:46 UTC.
CREATE OR REPLACE FUNCTION public.create_signup_player()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare player jsonb := new.raw_user_meta_data->'starter_player';
begin
 if new.raw_user_meta_data->>'username' is not null and player is not null
 and not exists(select 1 from public.players where owner_id=new.id) then
  insert into public.players(owner_id,id,name,appearance,skills,handedness,is_active)
  values(new.id,'starter',left(player->>'name',24),player->'appearance',player->'skills',player->>'handedness',true);
 end if;
 return new;
end
$function$;
