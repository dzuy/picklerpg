-- Read-only release evidence. Run against the intended project's SQL editor
-- or through an existing direct database connection. No account rows are read.
-- A missing migration-history relation is a blocker, not permission to invent it.
begin read only;

select current_database() as database_name,
       current_setting('transaction_read_only') as read_only;

select version, to_jsonb(m)->>'name' as name,
       jsonb_array_length(coalesce(to_jsonb(m)->'statements','[]'::jsonb)) as statement_count,
       md5(coalesce((to_jsonb(m)->'statements')::text,'')) as statement_fingerprint
from supabase_migrations.schema_migrations m
order by version;

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('gameplay_rallies','admin_user_actions','account_archives','api_rate_limits','roster_change_receipts');

select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and
 ((table_name='async_invitations' and column_name='rematch_manual') or
  (table_name='async_matches' and column_name='rematch_countdown_seen'));

select p.oid::regprocedure::text as signature,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'execute') as anon_execute,
       has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'execute') as service_execute,
       pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('enforce_player_skill_budget','create_async_rematch','claim_rematch_countdown',
  'consume_api_rate_limit','apply_roster_change','list_match_summaries');

rollback;
