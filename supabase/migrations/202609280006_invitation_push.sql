begin;
alter table public.async_invitations add column push_claimed_at timestamptz;
create function public.claim_invitation_push(p_invitation_id uuid,p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.async_invitations set push_claimed_at=clock_timestamp()
 where id=p_invitation_id and recipient_id=p_user_id and status='pending' and push_claimed_at is null;
 return found;
end $$;
revoke all on function public.claim_invitation_push(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_invitation_push(uuid,uuid) to service_role;
commit;
