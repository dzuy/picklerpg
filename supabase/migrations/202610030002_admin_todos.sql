begin;
-- Service-only persistence; authorization uses the existing immutable admin owner.
create table public.admin_todo_lists (
 owner_id uuid primary key check (owner_id = 'dda6d51d-cfbd-4204-a03d-b240e3f9e4a0'::uuid),
 version integer not null default 1 check (version > 0),
 items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 500)
);
alter table public.admin_todo_lists enable row level security;
revoke all on public.admin_todo_lists from public, anon, authenticated;
grant select, insert, update on public.admin_todo_lists to service_role;
comment on table public.admin_todo_lists is 'Private owner checklist. Empty lists remain initialized; never reseed deleted items.';
commit;
