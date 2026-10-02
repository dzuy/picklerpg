# Audit release — October 2, 2026

## Database evidence and reconciliation

Verified through the Codex browser in production project `vwdtfnljcjbyokdvjiea` (PickleBash). Before this release the ledger contained only:

- `202609290006 account_safety`
- `20260929182826 remote_schema` (803 statements)
- `202609300001 community_creator_usernames`

The legacy schema is represented by a remote snapshot, not an individual record for every historical local migration. Do not run a blanket `supabase db push --include-all` against it: that would attempt to replay legacy changes. This release uses an explicit incremental transaction over the inspected snapshot and preserves its existing history. A wholesale conversion of legacy history to per-file tracking is outside this release.

Both duplicate pairs were already installed. Seven relevant function bodies matched the disposable local schema after whitespace normalization; both rematch columns existed; gameplay/admin tables had RLS; relevant constraints and function permissions were inspected. The admin action constraint already included the later account-archive change. The existing service-role table grants differ in breadth from the original admin migration; no grants were broadened or rewritten during reconciliation.

Assigned unique versions without changing migration contents:

| Previous filename | Reconciled filename |
| --- | --- |
| `202609280001_rematch_intent.sql` | `20260928000101_rematch_intent.sql` |
| `202610010001_curated_community_skills.sql` | `20261001000101_curated_community_skills.sql` |

Recorded all four verified legacy changes with explicit reconciliation comments in the ledger; their DDL was not replayed. Installed `202610020001_roster_changes.sql` and `202610020002_match_summaries.sql` in the same transaction. The SQL editor returned all six expected versions after commit. Repeating the transaction succeeded using the stored version/name/source checks.

## Repeatable release procedure

`node scripts/admin/audit-release-sql.mjs` emits the reviewed SQL. It requires the expected production snapshot, checks installed function fingerprints and required structures, rejects conflicting version ownership, takes a transaction advisory lock, and applies only missing new versions. Migration DDL and ledger writes commit together. Existing new-version entries must have the exact source text and name. Lock timeout is five seconds; statement timeout is sixty seconds. This generator is specific to this inspected release, not a generic migration runner.

The upgrade test starts from the pre-October-2 local schema plus the observed ledger shape, applies the release, verifies all nine ledger rows, repeats it without changes, and rejects a conflicting recorded migration name. The separate read-only inspection SQL is `scripts/admin/inspect-audit-release.sql`. Normal builds now check local migration version uniqueness before compiling.

## Application release

Database upgrade and web/server deployment complete. Native distribution remains pending App Store Connect sign-in. The shared working directory contains unrelated concurrent Rally Studio/UI work; the release checkout excludes it.

No billing settings, remote feature flags, analytics metric definitions, or account records were changed by the migration release.

## Verified before application deployment

- Isolated source: **911/911 tests passed**, zero skipped/failed, with two test workers. This excludes unrelated concurrent Rally Studio/UI changes; earlier audit counts included some of that shared work. The production build and migration-uniqueness check passed. Vite retains its existing large-chunk warning.
- A production transaction created a temporary guest fixture, saved a player, saved a newer edit, replayed the first operation, deleted the player, and replayed the first operation again. Assertions confirmed the newer edit survived replay, deletion did not resurrect, and exactly three receipts existed. The whole fixture transaction rolled back.
- Production access checks: roster RPC denies anonymous execution and permits authenticated execution with invoker RLS; match-summary RPC denies anon/authenticated execution and permits only the server service role (plus administrative owners).
- App Store Connect requires sign-in in the Codex browser before verifying and distributing the native update. Older native clients omit the new paid-route bearer header and require a compatible update; local fallback opponents remain available.

## Production application verification

Released commit `26f49c56208d49acf0e572d18fb828361d728c10` to `main`. Railway deployment `d6bec854-5165-4c7f-b1ba-87de01eed30a` reached **Active / Deployment successful** in the Codex browser on October 2. The compatible browser client is served at https://picklebash.app/play.

Live checks at 16:15 UTC passed:

- `/healthz`: 200, status `ok`.
- `/api/opponent` and `/api/command`: 401 with no bearer token and with an invalid token (four checks).
- A temporary anonymous guest authenticated successfully; `/api/multiplayer/match-summaries?filter=active` returned 200 with an empty match list and no next cursor.
- One authenticated guest command returned 200 with a valid seven-field soft-dink command. This was one real provider request.
- The deployed browser client loaded and launched a Quick Solo Match to the serve screen with the 3D court and score visible ([browser evidence](../artifacts/audit-release/solo-launch.jpg)). No match was played through.
- The temporary guest was deleted after the check. No existing player account was edited or removed. Rate-limit counters and routine service logs from smoke traffic may remain.

Evidence: [live check results](../artifacts/audit-release/production-smoke.json), [Railway active release](../artifacts/audit-release/web-deployment.jpg), [installed migrations](../artifacts/audit-release/database-migrations.jpg), [RPC permissions](../artifacts/audit-release/database-permissions.jpg), and [transactional roster replay check](../artifacts/audit-release/roster-recovery.jpg).

**Remaining release step:** sign in to App Store Connect in the open Codex browser tab, inspect the latest build number, and distribute a compatible iPhone build. No new native build was uploaded by this release. Older native clients omit the paid-route bearer header and now receive 401 for those calls; local fallback opponents remain available. Real-device offline/reconnect and memory/GPU soak checks, browser storage-full interaction, populated production pagination, and production capacity tests remain unperformed. Corresponding automated correctness checks passed; these do not substitute for those device/load checks.
