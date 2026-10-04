# Owner account administration

`/admin` (and `/admin/`) is a separate account-management page. Its public shell only offers login; account data and mutations require a server-verified Supabase bearer session belonging to the immutable owner UUID in `server/multiplayer/admin-owner.ts`. That UUID was verified against the existing dzuy username and owner email on October 1, 2026. User-editable names/metadata, Community moderation, Premium access and the analytics allowlist cannot grant this access. Guests are denied. The owner cannot be edited or archived through this API.

Admin pages share a left sidebar linking Community, Game Analytics, and To-do List, with the current page highlighted. Signed-in identity and Sign out sit at the bottom and update on session changes. Game Analytics links to the existing `/admin/analytics` dashboard. All pages consume the canonical PickleBash tokens and unchanged logo, with cyan navigation, pink primary actions, and the current app canvas. This navigation does not grant access or change analytics collection.

## Capabilities

- Paginated account list, 50 accounts per page, including guests and trusted Community bots. Active, Archived and All views paginate separately. Search and filters explicitly apply to the current page.
- Registered/guest/bot/owner status, email verification, archive status, existing sign-in ban, creation and last-sign-in timestamps, and pending deletion requests. Last sign-in is not online presence.
- Details include saved-player counts and retained active/completed multiplayer records. These are database counts, not PostHog metrics or historical solo totals.
- Edit username, account display name (`user_metadata.player_name`) and registered-account email. Existing username constraints and uniqueness triggers remain authoritative. Other metadata, roles, passwords, purchases and entitlements are preserved. Guest email changes are rejected to avoid unintended guest conversion. Email changes affect sign-in; the endpoint never requests email confirmation. Existing email confirmation status may persist according to Supabase's administrative update behavior.
- Remove account opens a simple confirmation with an Archive account button; no typed account ID is required. The server rejects stale timestamps and archives atomically. Archived accounts cannot sign in or use existing access/refresh sessions, disappear from discovery and new contact, and stop receiving notifications. Players, games, hosted cards and purchases are retained. Archived records remain visible read-only in the Archived view; no restore UI is included.

Edits and archives write a service-only intent to `admin_user_actions` before changing accounts. Missing audit/archive schema prevents mutations. Pending/failed audit entries require operator review. Historical `remove` audits describe permanent deletions and still require the external-provider cleanup in [account safety](ACCOUNT-SAFETY.md); new `archive` actions preserve records and do not perform erasure. Direct browser access to audit and archive records is denied. Do not place identifiers, emails, changes or reports in product analytics.

Admin HTML is noindex/no-referrer. APIs are no-store, validate authentication on every request, use strict JSON/field/route validation, protect the owner, reject cross-origin requests, and limit the owner to 60 requests/minute per process. Account switching/sign-out immediately clears the list and private dialogs; late responses from the prior session are discarded. `/admin` and `/admin/*` skip product identity binding, capture and replay. There are no new product events or feature-flag changes.

## Setup and validation

The server uses existing `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service key in browser configuration. The pinned owner UUID intentionally grants no access in an unrelated database with a different owner identity.

Apply `supabase/migrations/202610010001_admin_user_actions.sql` and `supabase/migrations/202610010002_account_archives.sql` to the intended database before enabling account mutations. The existing account-safety and published-card migrations are also required. Deployment uses the regular client/server build; no additional service or flag is needed. `/admin/analytics` retains its separate existing authorization and metric definitions.

Tests cover authorization, owner protection, stale revisions, private auditing, metadata preservation, archive pagination/status, preserved account records, session revocation, archived contact/discovery exclusion, and access denial through old tokens including REST RPC, RLS and private Storage. The local fixture `tests/browser/admin-users-preview.html` uses clearly labeled sample accounts and is not a production route or API authorization bypass.

The archive migration installs a Data API pre-request check and restrictive policies on existing public RLS tables and storage.objects. Future authenticated tables must retain the active-account guard. It refuses to replace an unrelated existing pre-request hook; compose that hook before applying in another environment. Service-only functions must continue checking active accounts themselves.

Implementation is in the shared local checkout; no web/server release is claimed. No real account was archived while developing this behavior. The earlier explicitly authorized guest cleanup permanently removed 64 guest accounts; archiving applies to future removals.

External cleanup review (private SQL Editor/operator connection):

```sql
select id, target_id, status, created_at, completed_at
from public.admin_user_actions
where action = 'remove' and external_cleanup_completed_at is null
order by created_at;
```

Investigate pending/failed operations before retrying. After verifying all required external cleanup, record `external_cleanup_completed_at` for the exact completed audit entry. Existing owner-requested deletions continue to use their independent request queue and processor.

Database setup follow-up (October 1, 2026): installed the audit migration through the Codex browser SQL Editor in the verified `picklebash` project (`vwdtfnljcjbyokdvjiea`, main/Production), with an additional owner-identity guard in the transaction. SQL execution succeeded, service-role read access and public-client denial were verified afterward. No account mutation was performed. Client/server deployment is still pending. Do not rerun the already-installed table creation blindly or treat this database setup as a released `/admin` page.

Archive follow-up (October 1, 2026): archive code is local. The full suite passed 889 tests before the final notification guard; the affected archive/notification suite passed 18 tests afterward, and the production build passed. Database integration tests use disposable local PostgreSQL data. The sample-only Codex browser fixture verified the button-only archive confirmation. The archive migration has not been installed live: automatic approval review rejected running it against the Production project because production-wide access-policy/session changes require explicit deployment authorization. The new API fails closed until that migration is applied; do not deploy this server version first. The already-installed audit migration remains unchanged.

Approved archive installation (October 1, 2026): the user explicitly approved applying the migration to live PickleBash. The first transaction rolled back because Supabase owns its managed storage.buckets_vectors table. The corrected migration guards existing public RLS tables and storage.objects, leaving unused managed storage tables untouched; the disposable database archive test passed again. Installed the corrected migration in project vwdtfnljcjbyokdvjiea, main/Production through the Codex browser SQL Editor. SQL execution succeeded and the service-role archive lookup returned false for the owner. The archive table contained zero rows; no real account was archived. The local `/admin` refreshed successfully and loaded 30 accounts. This supersedes the pending database installation status above; hosted client/server deployment remains separate.

## Private To-do List — local implementation, October 3, 2026

`/admin/todos` has its own **To-do List** sidebar item. The owner can add/edit titles and notes, change groups, complete/reopen tasks, and confirm deletion. Search and Open/Completed/All filters apply to the entire list. The groups are Next fixes, Acceptance checks, Later ideas, and Deferred / archived. Failed saves retain the editor draft; its refresh action reloads the latest revision without losing typed text. Stale-tab writes return 409 instead of silently overwriting another edit.

`/api/admin/todos` verifies an active, non-anonymous Supabase session against the same immutable owner UUID on every read and write. Names, flags, moderation roles, and analytics access never grant access. Responses are no-store; cross-origin requests are rejected. Requests are bounded and limited to 120/minute per process. Task strings render as text, not HTML. Session changes clear private content and dialogs and invalidate in-flight responses. Existing `/admin/*` telemetry exclusion applies; no task content enters product analytics or browser storage.

Persistence requires `supabase/migrations/202610030002_admin_todos.sql` and `202610030003_admin_todos_privileges.sql`. The table enables RLS, revokes all public/anon/authenticated access, and grants only server service-role reads/inserts/updates. Its owner constraint pins the owner UUID. The server seeds the audited project backlog once, on the first authorized load, using conflict-ignore insertion. It never imports assistant notes or local memory. Existing edits and completed/deleted tasks survive reloads, server restarts, and future seed changes; an empty saved list is never reseeded. Updates use an atomic version comparison.

**Approved release, October 3, 2026:** the private table and least-privilege correction are installed in production, and the web implementation is deployed. No iOS build or submission changed. The final release evidence is in the isolated `codex/admin-todos-release` worktree and GitHub main.

Validation: owner API authorization and CRUD tests, real disposable PostgreSQL role-denial/persistence/concurrent-seeding/revision tests, existing account-admin and beta-route tests, production route checks, and client/server production build. Local sample preview: `node --import tsx tests/browser/admin-todos-preview.ts`, then `http://127.0.0.1:5187/admin/todos`. It ignores environment files and uses fake identities with sample-only tasks persisted under `/tmp`; its Owner/Non-owner/Signed out controls are test fixtures, never production authorization. Browser interaction/visual QA remains pending when browser tooling is available.

Final approved web release: `6d09babed43737778729baf1e5079a94e9d1999c` is active in Railway deployment `b2099815-031a-40bc-9a5a-8e3aaadcccc0`. Public route/assets and health return 200; unauthenticated and invalid-token checklist requests return 401/no-store. Task deletion through the array-update path passes after the service DELETE grant is revoked; all 30 original tasks remain unchanged. Owner browser and live signed-in non-owner/guest acceptance remain untested because browser controls/sessions are unavailable. See local [final verification](../artifacts/admin-todos-release/final-verification.json).
