-- Save a starter in the same transaction as account creation or guest upgrade.
create or replace function public.create_signup_player() returns trigger
language plpgsql security definer set search_path='' as $$
declare player jsonb := new.raw_user_meta_data->'starter_player';
begin
 if new.raw_user_meta_data->>'username' is not null and player is not null
 and not exists(select 1 from public.players where owner_id=new.id) then
  insert into public.players(owner_id,id,name,appearance,skills,handedness,is_active)
  values(new.id,'starter',left(player->>'name',24),player->'appearance',player->'skills',player->>'handedness',true);
 end if;
 return new;
end $$;
revoke all on function public.create_signup_player() from public,anon,authenticated;
create trigger create_signup_player after insert or update of raw_user_meta_data on auth.users
for each row execute function public.create_signup_player();
