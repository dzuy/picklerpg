# PickleBash installation and turn notifications

## Status

The feature was pushed to main as `007529a`; the user reports deploying the updated build. On 2026-09-15, migration `202609150001_turn_push.sql` was applied successfully through the Supabase SQL Editor to PickleBash production (`vwdtfnljcjbyokdvjiea`). All 10 post-migration checks passed: RLS on both tables, denied browser-role table access, service-role table access, server-only function execution, hardened function configuration, invalid-match rejection, expected columns, unique endpoint, and user lookup index. On 2026-09-15, all three Railway VAPID variables were configured and their values verified against a private, owner-only backup outside the repository. Configuration deployment `8c128131-7ffe-4178-8fd8-8dde40652ff5` became ACTIVE with Railway reporting Deployment successful. An actual iPhone end-to-end test remains the release acceptance gate.

Production verification query: https://supabase.com/dashboard/project/vwdtfnljcjbyokdvjiea/sql/f3fd8a37-65c7-4c51-971d-1e4a0827a8f3

## Architecture and files

- `public/manifest.webmanifest`, `public/icons/*`, `index.html`: PickleBash standalone app, root scope, multiplayer start URL, 192/512 PNG icons, maskable icon, iOS 180px touch icon. Icons are rasterizations of the existing pickleball favicon; no rebrand.
- `src/pwa.ts`, `src/pwa.css`, `src/bootstrap.ts`: early install-event capture, worker registration, Home Screen guidance, authenticated notification opt-in and subscription lifecycle. The lobby displays the benefit CTA after the account has a match. Installed detection supports display-mode and iOS standalone. Chromium prompts only on tap; iOS uses Share → Add to Home Screen → Add. “Not now” and dismissed install prompts persist on that device.
- `server/multiplayer/push.ts`: validated subscription storage, VAPID delivery, active-account suppression, delivery cleanup. Uses `web-push`, the existing Supabase service client and Railway Node process.
- `server/multiplayer/routes.ts`: bearer-authenticated `/api/multiplayer/push/config`, `/subscribe`, `/unsubscribe`, `/activity`. The existing same-origin checks and rate limits apply. The server derives account identity exclusively from verified auth, never a body field. No endpoint/key listing API exists. The public VAPID key is the only configuration sent to the browser.
- `server/multiplayer/service.ts`: after `repository.commit` succeeds and the receipt validates, an active next owner different from the actor produces a `TurnReady` event. Receipt replay returns early. A detached, caught promise invokes the notifier, so failed push cannot delay, fail, or roll back the committed gameplay response. The match engine has no Web Push dependency.
- `supabase/migrations/202609150001_turn_push.sql`: `push_subscriptions` with account, unique endpoint, key material, timestamps and activity lease; `turn_push_claims` with one version watermark per match. Both tables enable RLS and deny all anon/authenticated table access; only the server service role may access them. `claim_turn_push` is service-role-only, validates current owner/status/version and atomically rejects duplicate, stale, concurrent, and nonparticipant claims. Claims cascade with matches; subscriptions cascade with accounts.
- `public/sw.js`: installs/activates immediately without reloading the page; receives push, displays a match-tagged notification, and focuses/navigates an existing app window or opens one. Notification routes are reconstructed from validated match IDs on this origin. There is no fetch handler or API cache.
- `server/production.mjs`: serves manifest MIME correctly and revalidates worker/manifest files. Existing root-query URLs work without a new SPA fallback.
- `src/multiplayer/remote-main.ts`, `src/multiplayer/match-session.ts`: preserve a notification target through first-device sign-in, expose login on initial expired auth, remove cached state after 401/403/404, and reuse authoritative match refresh.
- `scripts/generate-vapid.mjs`, `package.json`, `.env.example`: standard dependency, private key generation command and Railway variable documentation.

## Subscription and delivery behavior

Permission is requested only by tapping **Enable Notifications**, before any network await. Granted permission creates and saves a subscription; denied permission displays settings guidance and hides the button; dismissed/default remains a voluntary CTA; unsupported browsers show a plain explanation. Existing opt-in is reconciled on auth/session restoration without requesting permission again. Explicit enablement handles a changed VAPID key by replacing the local subscription.

An account may register multiple endpoints. Saving the same endpoint updates a single row. Explicit account changes unsubscribe the old browser subscription; multiplayer logout removes the server registration and unsubscribes locally, leaving other devices intact. If the removal API is offline, local unsubscribe still invalidates that endpoint. Expired 404/410 provider responses delete the matching registration; transient errors are logged by status without endpoint/key material. Successful sends update `last_used_at`. TTL is five minutes, provider timeout five seconds, and payload contains only type, match ID, version and opponent display name.

The server restricts HTTPS subscription destinations to known Apple, Google, Mozilla and Windows push-service domains, preventing arbitrary outbound requests. The VAPID private key and Supabase service-role key never enter client configuration or payloads.

## Suppression

A subscribed page sends an authenticated activity heartbeat every 15 seconds while it exists, with an active lease only when visible and focused. Blur, hidden and pagehide send inactive; leases expire in 40 seconds if a process disappears. Any active registered device suppresses notification delivery for the account. Normal multiplayer polling/focus refresh continues unchanged.

Suppression occurs **before** contacting a provider. Safari requires every delivered push to display a notification; silently discarding it in the worker risks losing permission. See [WebKit’s Web Push requirements](https://webkit.org/blog/12945/meet-web-push/).

## Deep links

A tap opens `/?multiplayer=1&match=<UUID>`. An exact existing window is preferred, then a multiplayer window, then another same-origin window; navigation failures fall back to a new window. The normal persisted Supabase session and server participant authorization apply. First-device/login flows retain the query. A completed match loads its current result; missing/nonparticipant matches show the server error, clear any cached state and offer the existing games navigation. An expired initial session exposes login while retaining the destination. The push payload never substitutes for authoritative state.

## Deployment

1. Apply all migrations, including `202609150001_turn_push.sql`, to the existing Supabase project using the established migration process.
2. Generate keys **once**, into a private path outside the repository:
   ```sh
   npm run push:keys -- /absolute/private/path/picklebash-vapid.env
   ```
   The command writes a new file with owner-only permissions and refuses overwrite. Replace the contact placeholder with a real `mailto:` contact. Keep a secure backup of the key pair.
3. Set Railway **runtime** variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` alongside existing `MULTIPLAYER_ENABLED=true`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not prefix private values with `VITE_`. Keep the same key pair across deploys. Missing/invalid VAPID configuration disables push while gameplay remains available.
4. Use the existing Railway `npm run build` and `npm start` configuration. Serve the app on its production HTTPS origin; no separate worker or notification backend is needed. Browser auth must point to the same Supabase project.
5. Check `/healthz`, `/manifest.webmanifest` (`application/manifest+json`), `/sw.js` (JavaScript, `no-cache`), all four icons, and `/?multiplayer=1&match=<real-match-id>`. Authenticated `/api/multiplayer/push/config` should return only the public key. Verify no private VAPID key in the browser bundle or network responses.
6. Perform the physical-device checklist below before declaring the feature complete.

## Automated verification

Tests cover provider/key validation, multi-device fanout, 404/410 cleanup, delivery failure isolation, active/stale leases, account-scoped subscription operations, committed ownership changes, receipt replay, actual Postgres migration/RLS and concurrent claims, authenticated HTTP boundaries, permission/install states, worker click navigation and update lifecycle, production MIME/cache headers, stale completed-match resume and denied-access cache cleanup. See `tests/turn-push*.test.ts`, `tests/pwa-client.test.ts`, `tests/remote-session.test.ts`, and `tests/production-server.test.ts`.

Results from this workspace:

- `npm run build`: passed, including browser/server TypeScript and production bundling. Vite reports its existing large-chunk warning.
- Targeted push/client/worker/HTTP/Postgres/resume/production checks: **20/20 passed**.
- Final full regression suite: **349/350 passed**. The unrelated existing `remote-playback.test.ts` bounce assertion compared `1.9423515106829263` to `1.942351510682926` exactly. An isolated rerun passed that case but failed another exact-coordinate comparison (`0.7040999999999996` versus `0.7041`). Playback implementation/tests were not changed in this task.
- VAPID generator: verified key sizes, owner-only file mode, and refusal to overwrite; temporary test keys removed. Production keys were subsequently configured in Railway.
- `git diff --check`: passed.
- Follow-up browser QA: ran the actual app and `scripts/pwa-browser-check.mjs` in the Codex Chromium browser. Verified signed-out match URL retention and login-mode switching with no console errors; real service-worker activation; install fallback and dismissal; iPhone instruction modal; granted, denied, default, and unsupported UI states. The modal fit a 390px viewport without horizontal overflow. Granted permission requested once after the tap, saved the simulated subscription and sent activity; denied/unsupported requested no permission; default saved no subscription.
- Browser fixture uses the real PWA module, DOM, styles, and service worker, but simulates account, platform, permission and subscription results. It does not establish native installation or real provider/OS delivery. Run `node scripts/pwa-browser-check.mjs` and open the printed localhost URL to reproduce.
- No physical-device or live provider delivery test was performed.

Client and worker tests use simulated browser boundaries; they are not physical Safari or live push-provider verification.

## Mandatory real iPhone acceptance checklist — not yet run

Use a real iPhone with a supported iOS version (Home Screen Web Push requires iOS 16.4+) and the production HTTPS origin. [Apple/WebKit platform guidance](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

1. Open PickleBash in Safari and sign in to account A; create/resume a match with account B so the lobby install CTA appears.
2. Tap **Add PickleBash**. Follow **Share → Add to Home Screen → Add**.
3. Launch the Home Screen icon. Confirm it opens standalone, with the PickleBash icon and no Safari address bar.
4. Sign in to account A if needed. Verify the account and existing match restore.
5. In Your games, tap **Enable Notifications**, allow the system permission, and confirm **Notifications enabled**. Reload: there must be no new permission prompt.
6. Open the match, take a turn that hands an actionable decision to B, then close/background PickleBash and lock the phone.
7. On a second device/account B, take the turn that makes A the next action owner.
8. Confirm the iPhone receives **PickleBash — Chris played. Your turn.** (using B’s display name).
9. Tap it. Confirm the installed PickleBash app opens the **exact match**, reloads current server state, and permits the correct decision.
10. Repeat with the app already running in the background: tap must focus/navigate the existing app rather than create a duplicate.
11. Keep A visibly focused in PickleBash while B takes a turn. Confirm normal game refresh and no system push. Repeat with A active on another subscribed device.
12. Repeat steps 6–9 immediately after closing, then after force-quitting and waiting over 40 seconds. Record any lifecycle/lease race.

### Additional device/release checks — not yet run

- Deny permission on a fresh install: no automatic re-prompt, clear settings guidance, game still works. Dismiss the prompt on a browser that supports default/dismissal: no subscription saved.
- On Android/Chromium, accept and dismiss the browser install prompt; confirm correct CTA state after installation, dismissal and reload.
- Subscribe account A on an iPhone and a second supported device; close both and verify both receive the next turn. Re-enable on the same device and confirm the endpoint row count stays constant.
- Unsubscribe/revoke at device level, then send a turn: when the provider returns 404/410, its row disappears and other devices still receive push.
- Sign out: this device stops receiving future pushes, other devices remain registered. Switch accounts and explicitly enable: future pushes belong to the new account.
- Leave a notification visible, expire/sign out the session, then tap: sign-in must retain the match destination. A previously delivered lock-screen notification may remain after logout.
- Finish the match elsewhere before tapping an older notification: load the current completed result with no playable action.
- Tap with a different nonparticipant account (or a deleted match): access denied/missing state, no cached playable match.
- Retry the exact same multiplayer action concurrently: one committed version and at most one delivery attempt per endpoint.
- In staging, force a provider timeout/503 or remove notification DB access: gameplay still commits and can be read back. Failed notifications are not replayed automatically.
- Deploy a worker update with an app open: worker updates without automatic reload or API caching; next push and notification tap still work.
- Record iPhone model, iOS version, app origin, deployment revision, each result and any actual delivery delay.

## Known remaining limitations

- The user subsequently reported ordinary turn notifications working on an iPhone. The original production push migration and Railway VAPID configuration are applied. The full device checklist is not recorded as complete, and the new nudge migration/deployment and live-device acceptance remain pending.
- A lost inactive heartbeat or sudden process kill may suppress a turn during the remaining 40-second activity lease. An activity race in the opposite direction can allow a notification just as the player returns.
- Delivery is a best-effort post-commit side effect with an at-most-once database claim. A server crash between commit and delivery, a storage/provider failure after claiming, or OS/network restrictions can lose an alert. No durable retry worker is included in this slice.
- Other browser push-service domains need to be explicitly added to the endpoint allowlist if encountered. Standard Apple/Google/Mozilla/Windows destinations are covered; actual device subscriptions must verify this.

## Player nudges (September 15 follow-up)

Implemented locally; rollout requires applying `supabase/migrations/202609150002_match_nudges.sql` and deploying the updated server, client and service worker. Existing VAPID variables are reused.

- The court's waiting banner shows **Nudge opponent** with a countdown. It becomes eligible 30 minutes after the current actionable version was committed (or the match was created).
- Each outstanding version allows one nudge, permanently. Advancing gameplay starts a new turn clock; archiving does not reset it.
- A sender can nudge the same recipient once per rolling 24 hours across all their matches. Other opponents have independent limits.
- The button becomes **Already nudged** after the database accepts the request. This confirms the request, not device delivery. A recipient without a subscription, an active recipient, provider failure or server crash can consume the nudge without a visible alert; there is no automatic retry queue.
- Push copy is **“Luna nudged you. Your turn.”**, using the authenticated sender's display name. Existing opt-in, active-account suppression, dead-subscription cleanup and exact-match notification links apply.
- `GET /api/matches/:id/nudge` returns advisory eligibility and server time. `POST` accepts only `{expectedVersion}`; actor identity comes from authentication, recipient from the locked match. Match locks, a transaction-scoped sender/recipient lock, and a unique match/version claim enforce limits across tabs/devices and different matches. Database RPCs are service-role-only; ordinary clients cannot read or write nudge records.
- The client fails closed on offline, changed account/turn, stale responses and lost send responses; it refreshes authoritative status before offering another attempt. Delivery rechecks the version and current action owner immediately before querying subscriptions, though a move can still race provider delivery.

### Nudge checks

Real Postgres tests cover the 30-minute clock, concurrent requests within and across matches, authorization/RLS, stale turns, independent opponents, persisted limits after restart, unchanged game checkpoints, archive behavior, completed matches and cooldown expiry. Service/UI tests cover authenticated HTTP routes, body validation, rate limiting, double taps, stale async responses, account changes and lost responses. Push/worker tests cover message text, exact match links, active suppression and stale subscription removal.

Browser QA used the actual nudge control and app styles with simulated API responses (`node scripts/nudge-browser-check.mjs`, localhost:5188). At 390×844, the banner stayed within the viewport with no horizontal overflow; eligible, sent, daily limit and own-turn states behaved correctly with no console errors. This is not a real iPhone nudge delivery test.

After deployment, use two subscribed accounts: leave B's turn pending for 30 minutes, background B's app (wait over 40 seconds for its activity lease), and tap **Nudge opponent** as A. Verify B's notification and match link; reload A and confirm **Already nudged**. In a second A/B game, verify the 24-hour limit. Advance a turn and confirm the new 30-minute wait. User has reported ordinary turn notifications working on an iPhone; the new nudge path still needs this live-device check.

Final nudge verification: production build and diff whitespace checks passed; 22/22 targeted nudge/push/database checks passed with serial execution. Full parallel suite: 357/360 passed, with database shutdown errors in community-players and remote-database (both passed on serial rerun), plus the previously observed remote-playback floating-point exact-equality failure. No unrelated gameplay or test-harness changes were made.

### Temporary unlimited testing

Set the server-only `NUDGE_TEST_UNLIMITED=true` to skip the 30-minute wait, per-turn cap, rolling daily cap and HTTP nudge rate limit. It is enabled in this workspace's ignored `.env.local`. The server passes a privileged RPC flag; clients cannot choose it. Participant, current-turn, active-match and expected-version checks still apply. Successful sends return `ready` so the button can be tapped again. Set the variable to `false` (or remove it) and restart the API to restore normal limits. The local preview also defaults to immediate unlimited simulated sends. The pending nudge migration includes the optional RPC argument; real notifications still require that migration and VAPID configuration. Build and all 10 targeted nudge tests passed, including 15 repeated sends and the normal-limit cases.

### Nudge setup completed (September 15 local playtest)

Applied `202609150002_match_nudges.sql` to the existing PickleBash Supabase project. Preflight confirmed the table, function, and turn-clock column were absent. The timestamp backfill now updates only rows whose clock differs from `updated_at`. Verified row-level security, denied browser-role table/RPC access, and service-role RPC execution (all four checks passed).

Restored the existing VAPID configuration from the private backup into ignored, owner-only `.env.local`, without rotating keys. Vite reloaded the configuration. The actual waiting match returned `state: ready` and the browser displayed an enabled Nudge opponent button. Existing `NUDGE_TEST_UNLIMITED=true` remains in effect locally. No nudge was sent during verification; recipient-device delivery still needs a user-triggered test. This setup did not deploy application code to Railway.
