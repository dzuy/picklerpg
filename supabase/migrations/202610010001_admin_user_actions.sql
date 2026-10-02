begin;
-- Private operator audit survives target deletion; no user-editable roles or PII payloads.
create table public.admin_user_actions (
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 target_id uuid not null,
 action text not null check (action in ('edit','remove')),
 changed_fields text[] not null default '{}',
 status text not null default 'pending' check (status in ('pending','completed','failed')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 external_cleanup_completed_at timestamptz
);
alter table public.admin_user_actions enable row level security;
revoke all on public.admin_user_actions from public,anon,authenticated;
grant select,insert,update on public.admin_user_actions to service_role;
grant usage,select on sequence public.admin_user_actions_id_seq to service_role;
notify pgrst,'reload schema';
commit;
