-- Keep terminal invitations for idempotency; deleting dismisses the sender's card.
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.async_invitations'::regclass and contype='c' and pg_get_constraintdef(oid) like '%status%' loop
 execute format('alter table public.async_invitations drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.async_invitations add constraint async_invitation_status check(status in ('pending','accepted','declined','cancelled','deleted'));
alter table public.async_invitations add constraint async_invitation_match check((status='accepted' and match_id is not null) or (status<>'accepted' and match_id is null));
create or replace function public.accept_async_invitation(p_id uuid,p_actor uuid,p_hash text,p_match jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations; m jsonb;
begin
 select * into i from public.async_invitations where id=p_id for update;
 if not found or i.recipient_id<>p_actor then raise exception 'Not found' using errcode='P0002';end if;
 if i.status='accepted' then
  if i.accept_hash<>p_hash then raise exception 'Acceptance conflict' using errcode='PT409';end if;
  select to_jsonb(x) into m from public.async_matches x where id=i.match_id;return m;
 end if;
 if i.status<>'pending' then raise exception 'Invitation is no longer pending' using errcode='PT409';end if;
 if p_match->>'id'<>i.id::text or p_match->>'home_user_id'<>i.recipient_id::text or p_match->>'away_user_id'<>i.creator_id::text or p_match->>'creation_request_id'<>i.id::text
 or p_match#>>'{checkpoint,rules,scoring}'<>i.scoring
 or p_match#>'{checkpoint,roster,opponent-left,design}' is distinct from i.team->0
 or p_match#>'{checkpoint,roster,opponent-right,design}' is distinct from i.team->1
 then raise exception 'Invalid accepted match' using errcode='22023';end if;
 m:=public.create_async_test_match(p_match);
 update public.async_invitations set status='accepted',accept_hash=p_hash,match_id=i.id where id=i.id;
 return m;
end $$;

create function public.close_async_invitation(p_id uuid,p_actor uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.async_invitations; target text;
begin
 select * into i from public.async_invitations where id=p_id for update;
 if not found or (p_action='decline' and i.recipient_id<>p_actor) or (p_action in ('cancel','delete') and i.creator_id<>p_actor) then raise exception 'Not found' using errcode='P0002';end if;
 target:=case p_action when 'decline' then 'declined' when 'cancel' then 'cancelled' when 'delete' then 'deleted' else null end;
 if target is null then raise exception 'Invalid action' using errcode='22023';end if;
 if i.status=target then return to_jsonb(i);end if;
 if (p_action in ('decline','cancel') and i.status<>'pending') or (p_action='delete' and i.status<>'declined') then raise exception 'Invitation changed' using errcode='PT409';end if;
 update public.async_invitations set status=target where id=p_id returning * into i;
 return to_jsonb(i);
end $$;
revoke all on function public.close_async_invitation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.close_async_invitation(uuid,uuid,text) to service_role;
