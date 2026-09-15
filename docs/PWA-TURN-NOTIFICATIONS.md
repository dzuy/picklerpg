# PickleBash installation and turn notifications

## Status

Implementation is in the workspace. Production deployment, the Supabase migration, Railway VAPID variables, and real-device delivery have **not** been performed by this task. An actual iPhone end-to-end test remains the release acceptance gate.

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
- VAPID generator: verified key sizes, owner-only file mode, and refusal to overwrite; temporary test keys removed. No production private key was generated or deployed.
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

- Physical iPhone acceptance and live provider delivery remain unverified, and production migration/secrets/deployment still need to be applied.
- A lost inactive heartbeat or sudden process kill may suppress a turn during the remaining 40-second activity lease. An activity race in the opposite direction can allow a notification just as the player returns.
- Delivery is a best-effort post-commit side effect with an at-most-once database claim. A server crash between commit and delivery, a storage/provider failure after claiming, or OS/network restrictions can lose an alert. No durable retry worker is included in this slice.
- Other browser push-service domains need to be explicitly added to the endpoint allowlist if encountered. Standard Apple/Google/Mozilla/Windows destinations are covered; actual device subscriptions must verify this.
