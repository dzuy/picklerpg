# Codebase audit — October 1, 2026

Status: **audit completed October 1; remediation implemented October 2, 2026. Database and web/server release live; iPhone update pending App Store Connect sign-in.**

See [October 2 release evidence](AUDIT-RELEASE-2026-10-02.md) for the latest verified state. Earlier sections retain dated findings and prior blockers.

The findings below preserve the original audit evidence and line references. See [remediation status](#october-2-remediation-status) for changes made after review; original “not implemented” labels describe the audit snapshot.

The audit identified **10 actionable findings: 3 high priority (P1), 7 medium priority (P2)**. The first items to review are unauthenticated paid-provider access and two paths that can silently lose saved work. No critical vulnerability was confirmed. Passing tests do not cover the failure scenarios reproduced below.

## Scope and evidence

- Reviewed the local working tree, including the staged work present when the audit began. By the final check, that work was committed as `862e5da5a85bbcd5ae8126f75bcfd204dbb30442` (`Polish game UI and loading flows; add owner account administration`). This audit did not create that commit or alter those changes.
- Focused inspection covered HTTP routing, authentication and authorization, account administration and safety, billing verification, push destinations, database permissions and migration history, match transactions, cloud/local persistence, graphics disposal, caches, polling, background workers, and analytics delivery. The repository contains 234 client TypeScript files, 45 server TypeScript/JavaScript files, and 63 SQL migrations; this was a risk-focused audit, not a claim that every statement received exhaustive review.
- **896/896 existing tests passed**, with zero skipped tests, including disposable PostgreSQL and local HTTP integration checks. Both client and server TypeScript checks passed.
- The first sandboxed test run could not bind loopback sockets: 827 passed and 69 failed. The subsequent authorized local run passed all 896. Those initial environment failures are not application findings.
- Isolated reproductions confirmed the missing authentication gate, storage failover behavior, cloud-save acknowledgement error, deletion resurrection on merge, and missing skeleton disposal. They used fake providers/storage or local objects; no real paid request was made. Temporary reproduction scripts did not change application or test files.
- A read-only npm advisory check found **3 moderate package entries from one underlying development dependency advisory**, discussed separately below. No dependencies were changed.
- No production database, deployed settings, real account records, payment system, or production endpoint was inspected or modified. No browser heap/GPU soak test, production load test, penetration test, or iOS device test was performed. Deployment exposure and resource-growth magnitude need separate verification.

Priority: P1 means address promptly before expanding exposure or relying on the affected save path. P2 means a material correctness, reliability, or scaling issue to schedule. “Reproduced” means a local execution demonstrated the mechanism; “source-confirmed” means the code path is present, with its deployment/device impact not measured.

## Findings at a glance

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| A01 | P1 | Paid opponent/command routes accept unauthenticated requests | Reproduced with stub provider |
| A02 | P1 | Storage exhaustion silently abandons durable saves and hides existing state | Reproduced with quota failure |
| A03 | P1 | A later cloud save clears the dirty flag for an earlier failed edit | Reproduced with failed/successful saves |
| A04 | P2 | Offline or failed player deletions reappear after reconnect | Reproduced merge; recovery path inspected |
| A05 | P2 | Athlete disposal does not release skeleton textures | Reproduced missing disposal event |
| A06 | P2 | Lobby polling repeatedly fetches and reconstructs all historical matches | Source-confirmed |
| A07 | P2 | Gameplay authentication waits on a full account-directory scan | Source-confirmed |
| A08 | P2 | Solo saves synchronously rewrite an unbounded history and telemetry archive | Source-confirmed |
| A09 | P2 | Two migration version collisions undermine tracked deployment | Duplicate filenames confirmed; deployment not tested |
| A10 | P2 | Avatar thumbnail caches retain every appearance indefinitely | Source-confirmed |

### A01 — Paid opponent/command routes accept unauthenticated requests

**Locations:** `server/opponent.mjs:10–24`; `server/production.mjs:11,27`; provider request at `server/opponent.mjs:4`.

`/api/opponent` and `/api/command` accept POST bodies without checking a bearer identity. Origin checking runs only when the client supplies an Origin header; a non-browser caller can omit it. The production server sends these routes directly to the opponent handler, outside the multiplayer authentication and rate-limit pipeline. Its eight-request concurrency limit restricts simultaneous work, not sustained use, account usage, or cost. The external request also has no explicit output-token budget.

**Impact:** if the deployed service has a working provider key and no separate edge protection, an unauthenticated caller can consume paid requests or occupy the shared slots, disrupting legitimate command interpretation. The concurrency guard and 60 KB body cap help but do not close this boundary. Live exposure was not tested.

**Reproduction:** invoke `createOpponentHandler` with a counting fake `choose`, then feed a POST to `/api/opponent` with `{version:1,options:[{}]}` and no Authorization or Origin. Observed: provider invoked once, HTTP 200. No external provider was contacted.

**Suggested direction, not implemented:** apply a guest-compatible identity/abuse boundary, persistent per-caller and global budgets, and explicit input/output limits before provider invocation. Preserve legitimate guest gameplay; this is separate from Premium report entitlement.

**Acceptance check:** missing/invalid identity and exhausted budgets must not invoke the provider; ordinary guest/account commands must still work; repeated sequential calls must be bounded, including across server replicas.

### A02 — Storage failure silently changes durable saves into memory-only saves

**Locations:** `src/browser-storage.ts:12–45`; consumers include `src/auth-session.ts:9`, `src/persistence/open-play-store.ts:36`, and `src/multiplayer/match-session.ts:52`.

On any primary storage read/write exception, `FailoverStorage` permanently switches to an initially empty memory store. Existing keys are not copied. A quota exception on one new save therefore makes previously readable games, roster data, and authentication storage appear absent through the wrapper. The attempted new save succeeds in memory, and the exported persistence indicator remains the value computed at startup.

**Impact:** the application can report a successful save that disappears on reload. Error handling in `OpenPlayStore.write` cannot display its storage-full message because the wrapper swallowed the exception. Pending multiplayer actions can likewise lose their intended durability. Existing primary data is not physically deleted by this operation; it becomes hidden for the current wrapper instance.

**Reproduction:** begin with two durable keys, allow the startup probe, then make primary `setItem` throw `QuotaExceededError`. A new write returns successfully; both old keys read as `null`; the new key exists only in memory; `persistent` is still `true`. All four assertions passed.

**Suggested direction, not implemented:** distinguish unavailable-at-start storage from failure after successful use; preserve access to existing data, report durability failures to critical save callers, and expose current persistence state. A volatile fallback must not acknowledge durable game progress.

**Acceptance check:** inject quota exhaustion during a checkpoint and pending-turn write. Existing data must remain accessible, the UI must report the unsaved state, and reload/retry must not silently lose or duplicate the action.

### A03 — A later successful cloud edit acknowledges earlier failed work

**Locations:** `src/cloud-players.ts:166–181`; reconnect selection at `src/cloud-players.ts:139–148`.

The cloud queue catches and absorbs each save failure. A subsequent successful save persists only its own changed player, then clears the single library-wide dirty flag if it is the latest version. There is no outstanding-operation ledger or retry of the previously failed player. Reconnect uses the cloud library when the dirty flag is absent.

**Impact:** editing player A during a temporary outage, then successfully saving player B, can leave A stale on the server while the UI reports “saved.” Reconnection can overwrite A's local edit with its old cloud version. This is different from a visible failed request: the later success removes the recovery signal.

**Reproduction:** inject a client whose first upsert fails and second succeeds; call `save` for A and then B. Observed writes: only B. A was never retried, the dirty flag was removed, and the final status was `saved`.

**Suggested direction, not implemented:** track acknowledgements per operation/player or reconcile the full dirty library transactionally before clearing the aggregate dirty state. Preserve account ownership and ordering across retry.

**Acceptance check:** A fails, B succeeds, then restart/reconnect. A's edit must remain pending or be retried, never silently acknowledged. Include failed deletes and active-player changes in the same scenario.

### A04 — Offline deletions have no durable tombstone and are resurrected

**Locations:** `src/cloud-players.ts:55–60,139–148,166–168,175–176,183–186`.

When saving is unavailable, `save` records only a generic dirty bit. On reconnect, `mergePlayerLibraries` starts with all cloud players and overlays local players. A player absent locally because it was deleted is indistinguishable from a cloud-only player that should be retained. `replaceCloudLibrary` upserts the merged roster and never applies missing deletes.

**Impact:** a player deleted offline, or whose delete request failed, reappears after reconnect. Its public listing can also remain available if it was previously published. Users cannot rely on local disappearance as evidence that deletion reached the account.

**Reproduction:** merge an empty local roster representing an offline deletion with a cloud roster containing `deleted-while-offline`. The resulting roster contains that player again. The inspected reconnect path uses this merge when the dirty flag is set.

**Suggested direction, not implemented:** keep account-scoped deletion tombstones or a durable operation queue until the server acknowledges deletion. Do not solve this by deleting all cloud-only players: those are intentionally preserved by the current merge contract.

**Acceptance check:** delete offline, restart, reconnect, and verify both local and cloud absence while an unrelated player created on another device remains intact.

### A05 — Athlete cleanup omits skeleton GPU resources

**Locations:** `src/athlete.ts:48–54,80`; `src/avatar-preview.ts:38–39,49–75`; `src/scene.ts:256–264`.

Athletes clone a skinned model. `disposeAthlete` disposes owned geometry and materials but never disposes each cloned mesh's skeleton. Rendering a skeleton allocates its bone texture. Thumbnail generation, preview replacement, and court substitutions repeatedly create and discard athletes while retaining the renderer.

**Impact:** discarded characters leave a GPU-resource cleanup gap in a live renderer. Repeated customization or thumbnail rendering can increase texture allocations and memory pressure. A measured device memory slope or crash threshold was not established.

**Reproduction:** create a `SkinnedMesh`, attach a skeleton, call `computeBoneTexture`, subscribe to the texture's dispose event, then call `disposeAthlete`. No disposal event fires and the skeleton still owns its texture. Explicit `skeleton.dispose()` releases it. This checks lifecycle behavior without requiring a WebGL context. The installed Three.js implementation agrees with the [official Skeleton disposal contract](https://threejs.org/docs/pages/Skeleton.html).

**Suggested direction, not implemented:** dispose unique instance-owned skeletons alongside instance materials/geometry. Deduplicate skeletons shared within one avatar and preserve shared base-model resources.

**Acceptance check:** repeatedly replace previews and generate uncached thumbnails in a real browser; texture counts and memory should settle after cleanup. Verify that other avatars sharing base geometry still render correctly.

### A06 — Every lobby refresh reloads full historical match state

**Locations:** `server/multiplayer/repository.ts:46–49`; `server/multiplayer/service.ts:29–40,77–87`; `src/multiplayer/remote-main.ts:534–541,724–735`.

The match repository pages through every match for the account using `select('*')`, including full checkpoints, animation data, completed games, and archived games. `MatchService.list` reconstructs every checkpoint into a `Match`, builds public state, and then loads rivalry summaries. The lobby requests that list every five seconds. Its refresh function has no in-flight guard, so requests can overlap when service latency exceeds the interval; each client request has a 15-second deadline, but server work is not explicitly cancelled by it.

**Impact:** response size, database reads, reconstruction CPU, and client rendering grow with lifetime history, even when the visible tab needs only active-game cards. A malformed or unsupported historical checkpoint can fail the whole list. Mutable `updated_at` ordering combined with offset pagination also permits repeated or skipped rows when games move between pages during a scan.

**Evidence:** inspected the repository's unbounded pagination loop, `publicMatch` reconstruction, list mapping, and polling caller. No production volume benchmark was run. This is unbounded work per request, not a demonstrated infinite loop.

**Suggested direction, not implemented:** use a lightweight, paginated summary endpoint with server-side status filters; fetch full gameplay state only when opening a game. Add single-flight polling and stable cursor/snapshot semantics. Keep completed/rivalry metrics consistent with their existing definitions.

**Acceptance check:** test an account with thousands of archived games. Active-lobby response size/work should be bounded; delayed responses should not accumulate overlapping polls; a historical unsupported game should not prevent access to current games.

### A07 — Account-wide scans are on the gameplay authentication path

**Locations:** `server/multiplayer/routes.ts:174–179`; `server/multiplayer/accounts.ts:37–43`; related scans in `server/multiplayer/team-directory.ts:43–63` and `server/multiplayer/admin-users.ts:76–88`.

After verifying a token, the configured multiplayer authenticator waits for `refreshTesters`. Its cache lasts only five seconds. Refresh walks the entire auth directory in pages of 100, even for a request concerning one authenticated actor and one match. The promise is shared within a process, which avoids duplicate simultaneous scans there, but all affected requests wait for it. Directory/profile requests scan again; the admin's nominally paginated listing also fetches the full directory before slicing 50 users.

**Impact:** growth in registered and guest accounts increases latency and auth-provider load on otherwise unrelated turns and reads. Directory failure can make valid authenticated gameplay fail. At 10,000 auth users, a refresh needs about 100 list calls, independent of how few players are currently active.

**Evidence:** source-confirmed request dependency and pagination. No claim that current account volume already causes an outage.

**Suggested direction, not implemented:** resolve actor eligibility without a global scan, use a bounded indexed public directory, and refresh discovery separately from gameplay. Preserve current server-owned archive and bot authorization checks; a longer cache alone must not delay access revocation.

**Acceptance check:** seed a large guest/account population, measure authenticated turn/read latency, and inject directory-list failure. Valid match access should not depend on a complete directory refresh; archived users must still be rejected immediately.

### A08 — Solo history grows indefinitely and is rewritten synchronously

**Locations:** `src/persistence/open-play-store.ts:12–36`; `src/persistence/game-analysis.ts:13–19`; `src/persistence/gameplay-sync.ts:18–27`; checkpoint caller in `src/main.ts:650`.

Every checkpoint save reads/parses/validates the entire saved game array, updates one game, then serializes and writes all games and accumulated per-point telemetry back to one browser storage key. Archiving changes a boolean; it does not remove or compact data. There is no retention/size limit. Gameplay synchronization also traverses all saved points and repeatedly rewrites its growing acknowledgement object.

**Impact:** longer histories increase synchronous main-thread work during play and eventually pressure browser storage quotas. Combined with A02, quota pressure can turn into silent nondurable saves. One malformed game entry can also prevent the whole local list from loading, because all checkpoints are parsed together.

**Evidence:** source-confirmed storage layout and traversal. No specific number of games to fill a device is asserted; that depends on rally lengths, telemetry size, browser quota, and other stored data.

**Suggested direction, not implemented:** store games/points independently in asynchronous storage, separate durable pending uploads from historical display data, and define a safe compaction/retention policy. Preserve unsynced telemetry and resumable games before evicting anything.

**Acceptance check:** grow representative history across hundreds of games; measure save duration and byte size, inject a corrupt historical entry, and force quota exhaustion. Current-game recovery and pending uploads must remain usable.

### A09 — Migration versions collide, while tests bypass version tracking

**Locations:** `supabase/migrations/202609280001_gameplay_records.sql`; `supabase/migrations/202609280001_rematch_intent.sql`; `supabase/migrations/202610010001_admin_user_actions.sql`; `supabase/migrations/202610010001_curated_community_skills.sql`; `tests/helpers/postgres.ts:34`.

Two distinct migrations use version `202609280001`, and two use `202610010001`. A filename scan confirmed both collisions. Supabase's [migration workflow](https://supabase.com/docs/guides/deployment/database-migrations) tracks timestamped migration versions; duplicate versions cannot independently represent both changes in a version-keyed history. The repository's own manual migration helper also inserts history by `version` with `on conflict(version) do nothing` (`scripts/admin/apply-community-moderation.ts:17`).

**Impact:** a version-tracked deployment/reconciliation can reject a duplicate or consider one change already applied after only its sibling ran, depending on the runner and existing history. The passing database tests do not rule this out: they read every SQL file in filename order and execute the contents without a migration-history ledger. No live migration ledger or actual CLI deployment was inspected.

**Suggested direction, not implemented:** reconcile the existing deployment ledger first, give unapplied changes unique versions, and add a uniqueness check plus a deployment-path validation. Do not blindly rename already-applied migrations or rerun their contents against production.

**Acceptance check:** all local versions are unique and a disposable version-tracked migration runner applies the complete schema once, then performs a clean no-op second run. Separately reconcile the actual deployed ledger before release.

### A10 — Thumbnail caches retain every appearance for the page lifetime

**Locations:** `src/avatar-preview.ts:45–75`; persistent users include `src/community-section.ts:15,33`, `src/multiplayer/team-lobby.ts:24,141`, `src/setup-player-card.ts:7–10`, and `src/player-creator.ts:66–67,314`.

`AvatarThumbnails` caches a PNG data URL keyed by the entire appearance, category, and handedness. Nothing evicts or clears entries, and the class has no disposal API. Multiple separate long-lived instances cache portraits at different sizes. Changing a color or another appearance field creates another entry even if old images are no longer displayed.

**Impact:** long sessions browsing many players or repeatedly editing appearances retain an increasing number of encoded images. This is JavaScript heap retention, separate from the skeleton GPU cleanup in A05. Page teardown releases the cache; growth within a live page is unbounded by code.

**Evidence:** source-confirmed map insertion without eviction and persistent call sites. No heap-size estimate was measured.

**Suggested direction, not implemented:** cap caches by entries or bytes, evict unused entries, and define renderer/cache ownership and disposal. Consider sharing portrait renderers where that fits existing UI lifetimes.

**Acceptance check:** generate thousands of distinct appearances, remove their UI, and verify cache size stays bounded without breaking portraits still on screen. Revisit recent appearances to verify the chosen cache policy behaves correctly.

## Dependency advisory triage

`npm audit --json --ignore-scripts` reported zero high/critical advisories and three moderate package entries: `@capacitor/cli@8.5.2 → xcode@3.0.1 → uuid@7.0.3`. These are three affected package nodes from **one advisory**, not three independently demonstrated exploits. All three lockfile entries are development dependencies.

The underlying [GHSA-w5hq-g745-h8pq / CVE-2026-41907](https://github.com/advisories/GHSA-w5hq-g745-h8pq) concerns bounds validation when specific UUID APIs receive an output buffer. The inspected Xcode helper uses `uuid.v4()` without a caller-supplied buffer (`node_modules/xcode/lib/pbxProject.js:90`), so this audit did not establish reachability of the vulnerable API through the normal native build path. Track dependency remediation as low-priority maintenance unless another affected call path is found. The audit's proposed Capacitor version change is not a reviewed upgrade plan; no automatic fix/downgrade was run.

## Known risks and follow-up checks, separate from the findings

- **Solo XP is intentionally client-reported.** `record_solo_xp` can award account skill progression from caller-supplied results with fresh game IDs. This is already explicitly documented in `docs/XP_PROGRESSION.md:9`, not a newly discovered bypass of authoritative multiplayer validation. Review whether that accepted trust boundary still fits the progression economy; the multiplayer HTTP limiter does not cover direct Supabase RPC calls.
- **Registration intentionally auto-confirms email.** `server/multiplayer/accounts.ts:28–35` uses the admin create-user path with `email_confirm:true`. This permits claiming an unused email without proving mailbox control. It is documented as a playtest policy in the code; review it before broad registration, without presenting existing confirmation metadata as proof of mailbox ownership.
- **Pre-auth abuse controls need deployment verification.** In `server/multiplayer/routes.ts:45,52–53`, failed-token rate accounting occurs after the authentication attempt. A rejected request can therefore still cause an auth-provider call. Check the actual edge protection and proxy-hop configuration before deciding whether further application protection is needed. This is also called out in `docs/API-RATE-LIMITS.md`.
- **Cloud roster updates are multi-request operations.** Clearing the active flag, saving/deleting a player, and selecting the new active player are separate calls (`src/cloud-players.ts:172–186`). Mid-operation failure or concurrent tabs can leave no selected player or conflicting choices. Include this in the transactional-sync design review for A03/A04; no concurrent-tab integration reproduction was performed here.
- **Production-specific boundaries remain unverified.** Check the deployed archive pre-request hook, RLS grants, service secrets, payment webhook credentials, billing enablement, external deletion cleanup, and PostHog privacy/retention settings using read-only deployment evidence. Dated setup documentation is not proof of current settings. No configuration change is proposed by this audit alone.

## Controls that held up in the reviewed paths

- Multiplayer actions validate actor membership, expected version and legal choices; database receipts support idempotency and transactional commits. Existing integration tests cover races and rollback.
- Administrative access uses a verified owner UUID and fresh server-owned archive state, rather than an editable username. Analytics administration and Premium access are separate authorization paths.
- Stripe webhook signatures and RevenueCat webhook authorization are checked; pack ownership is resolved server-side. Existing billing tests passed. This does not establish that live provider settings are correct.
- Web push destinations are restricted to recognized HTTPS provider hosts. Public card uploads validate bounded PNG content and strip metadata.
- Sampled dynamic HTML paths use fixed markup, escaping, or text insertion. No confirmed stored/reflected XSS or SQL injection was established by this review. A limited high-confidence key/private-key pattern scan of source, scripts, public assets, tests, migrations and docs returned no matches; it is not a complete repository-history secret scan.
- Reviewed session refreshes and several background workers have concurrency guards; gameplay loops have finite-state/time advancement and extensive tests. No reproducible infinite gameplay loop was found. The actionable loop issues here concern growing work and overlapping lobby polling.

## Suggested review order

1. Decide on A01's guest-compatible abuse boundary and review A02/A03's silent-loss scenarios first.
2. Review cloud persistence together (A03/A04 and active-player atomicity), then browser persistence and retention (A02/A08).
3. Reconcile A09 before the next version-tracked database deployment.
4. Address graphics lifecycle/cache growth together (A05/A10), then bound gameplay-facing list and directory work (A06/A07).
5. Explicitly accept or revise the known Solo XP and email-verification policies; track the development dependency advisory separately.

The initial audit changed only this report. The subsequent authorized implementation is recorded below.


## October 2 remediation status

The database and web/server release are live in `26f49c5`. The native client update is pending App Store Connect sign-in. See the [verified release record](AUDIT-RELEASE-2026-10-02.md) for ledger reconciliation, 911 passing isolated-release tests, production smoke results, and remaining verification limits.

| Finding | Implemented behavior | Remaining scope |
| --- | --- | --- |
| A01 | Production opponent/command handlers require a verified current account, including guests. Shared database limits cap authentication attempts, per-account use, and global provider use. Output is capped at 1,024 tokens. Clients send the current bearer token. Missing configuration fails closed. | Server and compatible browser client are deployed; live guest/authentication checks passed. Local development explicitly bypasses authentication. Existing installed native clients without the bearer header still need an update. Verify the actual proxy chain and production quota behavior. |
| A02 | Once browser storage is acquired, subsequent failures propagate instead of switching to an empty memory store. Full storage at startup remains readable. Quota tests preserve existing records and confirm retry recovery. | Storage unavailable from the outset retains the existing volatile mode. This does not promise durable saves in private/blocked environments. |
| A03 / A04 | Account-scoped, durable, per-operation roster outboxes retain edits and deletion tombstones. Only successful RPC operations are acknowledged. Receipts make retries idempotent; a transaction serializes each account's player mutation and active-player selection. Connection races retain pending work. | Roster migration and browser client are deployed; live transactional replay checks passed. Initial legacy roster import and explicit account-transfer code still use their older multi-request path. Offline work retries on a later save or reconnect; no background retry scheduler was added. |
| A05 | Athlete disposal releases each instance skeleton once, along with owned geometry/materials, while retaining shared base geometry. | GPU/heap soak testing on real devices remains unperformed. |
| A06 | New lobby endpoint returns at most 50 summaries plus a cursor, without engine reconstruction or private checkpoint data. SQL returns at most 51 matching rows per page, with participant/creation indexes. Clients coalesce matching in-flight refreshes, page older games explicitly, and avoid polling completed/archived or expanded lists. | Summary migration and web/server release are deployed; a live empty-guest summary request passed. Legacy full-state list and profile-stat paths remain for compatibility; this is not a complete history-query overhaul. |
| A07 | Gameplay authentication validates the current account without waiting for a global directory scan. Directory/config discovery refreshes at most once per minute; invitations check their specific opponent directly. | Discovery and bot work still use account-directory scans. An indexed directory is a separate scaling improvement. |
| A08 | Local game payloads are stored separately. Active checkpoint saves and scheduled uploads touch the current game rather than parsing and rewriting historical telemetry. Legacy archives migrate only after all payload writes succeed; acknowledgements use per-point keys. | Current-game/index writes remain synchronous; history views and recovery sync still scan all games. Retention, asynchronous storage, cross-tab coordination, and browser capacity are not fully addressed. |
| A09 | Reconciled both duplicate pairs against the actual production snapshot, installed the two new migrations atomically, and recorded verified history. Ordinary builds now enforce unique versions; upgrade and no-op replay checks passed. | Legacy history still uses a remote snapshot; do not blanket-replay historical local migrations. Use the release-specific guarded procedure documented in the release record. |
| A10 | Thumbnail caches evict least-recently-used entries at 96 entries or an estimated 2 MiB per instance. Oversized entries are not retained. Explicit thumbnail renderer disposal is available. | Real-device soak testing remains outstanding. Memory limits are estimates of retained strings, not total GPU/process memory. |

### Original release order and migration blocker (resolved for web/server)

1. Read the actual deployed `supabase_migrations.schema_migrations` ledger and inspect the schema corresponding to both colliding pairs: `202609280001_gameplay_records.sql` / `202609280001_rematch_intent.sql`, and `202610010001_admin_user_actions.sql` / `202610010001_curated_community_skills.sql`. Repository notes indicate some changes were previously applied, so blindly renaming or replaying these migrations is unsafe. No database connection was configured in this checkout for that verification.
2. Reconcile filenames and history based on that evidence, then require `npm run check:migrations` to pass. The check currently fails intentionally on those two pairs. It is a separate release gate, not part of the ordinary application build. Validate the version-tracked deployment path and its second no-op run on a disposable database; the current integration harness runs every SQL file without that ledger.
3. Apply the new roster and summary migrations, preserving existing RLS, player constraints, entitlement triggers, and service-only summary access. Confirm the existing shared rate-limit migration is present.
4. Release the server and clients together. Older native clients cannot call the newly protected paid routes without the bearer-header update. Smoke-test guest commands, offline edit/delete recovery, lobby pagination, and storage-full feedback before expanding rollout.

### Original implementation validation (before isolated release)

- Added regression coverage for fail-closed paid routes, guest access, shared sequential/global budgets, pre-authentication quotas and limiter/authentication outages; failed roster edit followed by another save; offline deletion persistence; concurrent outbox acknowledgements; connection-time edits; gameplay availability during directory failure; skeleton texture disposal; and bounded thumbnail caching.
- Disposable PostgreSQL tests cover atomic roster rollback, idempotent replay, account isolation, unrelated cloud players, bounded/stable summary pagination, historical engine compatibility, archive filtering, and RPC grants.
- Local storage tests verify partitioned game writes, legacy migration recovery, and quota errors without hiding existing state. Existing cancellation tests now wait for the provider request to begin after credential preparation, retaining their stale-response assertions.
- **Final verification: 912/912 tests passed**, zero failed/cancelled/skipped, including local HTTP and disposable PostgreSQL checks. **`npm run build` passed**, including client/server TypeScript checks. Vite retains its large-chunk warning; this was not treated as a build failure. `git diff --check` passed.
- **`npm run check:migrations` failed as intended** on the two pre-existing duplicate versions; deployment is not ready until they are reconciled.
- No live-provider, production-load, browser-interaction, or device soak verification was performed for this implementation. Unrelated work already present or arriving in the shared working tree was preserved.

### Initial October 2 release attempt — access blocked (superseded)

The subsequent release request authorized reconciliation and deployment. Limited **read-only** production checks used the existing service connection to project `vwdtfnljcjbyokdvjiea`. Zero-row REST requests confirmed that `gameplay_rallies`, `admin_user_actions`, and `async_invitations.rematch_manual` are exposed. These checks establish presence only, not complete definitions or migration-history correctness. `roster_change_receipts` was absent from the REST schema cache (`PGRST205`); the new roster migration is not verified as installed.

The API rejected the migration-history schema (`PGRST106: Invalid schema: supabase_migrations`). No direct database URL, Supabase management token, Railway token, or Railway CLI was configured. Computer access to the signed-in Chrome dashboards was not approved. The service API key cannot substitute for database/management access to reconcile this history.

Prepared [read-only release inspection SQL](../scripts/admin/inspect-audit-release.sql) for the intended project's SQL editor or direct database connection. It returns ledger names/fingerprints, relevant schema definitions, and RPC permissions without reading account records. Its disposable PostgreSQL integration test passed. This query neither repairs history nor applies migrations. The previously verified 912-test suite and production build remain the application validation baseline; the additional inspection test passed separately.

**At the end of this initial attempt:** obtain dashboard or configured database/deployment access; inspect and reconcile the actual ledger; validate the version-tracked upgrade and no-op repeat; install the two new migrations; release compatible clients/server; and complete live smoke checks. No historical migration files were renamed, no production data/schema/history was changed, and no release was pushed or deployed during this attempt.

### Completed web/database rollout

The subsequent Codex-browser release reconciled the ledger, installed both new migrations, deployed `26f49c5`, and passed live health, authentication, guest command, and summary checks. The isolated release passed 911 tests and the production build. The iPhone update remains pending App Store Connect sign-in. Full evidence and verification limits are in [the October 2 release record](AUDIT-RELEASE-2026-10-02.md).
