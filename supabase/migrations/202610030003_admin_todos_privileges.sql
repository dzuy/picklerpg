begin;
-- Supabase default privileges may grant more than an explicit GRANT requests.
-- A list is never deleted as a row; task deletion is an item-array update.
revoke all on public.admin_todo_lists from service_role;
grant select, insert, update on public.admin_todo_lists to service_role;
commit;
