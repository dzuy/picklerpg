# Phase 3.1 — iOS push and turn badges

## Implementation and current limits

Native APNs delivery is implemented alongside the existing Web Push notifier. **This checkout has no SMS implementation, phone-number storage, SMS credentials, or SMS provider dependency.** No SMS code was removed. `NotificationService` accepts an optional `smsFallback: TurnNotifier` adapter, invoked when no native delivery succeeds, but production does not wire an unknown SMS provider. Existing Web Push remains the configured fallback. Do not consider SMS verified or deploy an invented SMS provider: locate the external implementation first, then supply its existing adapter in `configuredPush`.

The migration was applied to the production PickleBash Supabase project on September 25, 2026. Both new tables have RLS enabled and deny direct anon/authenticated access. Apple Push Notifications is enabled. Key 4PHS9B8LYT is configured in Railway, and commit 4196d72 is deployed to production. The signed app is installed on the connected iPhone; permission and APNs token registration succeeded. A test turn push received APNs HTTP 200 with badge 1, matching the account’s one active awaiting game. The user confirmed the notification, badge, and opening the correct game all work on the physical iPhone. Broader multi-device and full-match physical checks remain on the checklist.

## Apple Developer and Xcode configuration

1. In Apple Developer → Certificates, Identifiers & Profiles → Identifiers, select the explicit App ID **com.picklebash.app** and enable **Push Notifications**. Use the same team that signs PickleBash.
2. Under Keys, create an Apple Push Notification service (APNs) authentication key. Allow this topic and both development/production environments if Apple's key configuration asks for them. Download the `.p8` once into secure storage outside the repository. Record the Key ID and Team ID. No Firebase project or APNs certificate is required.
3. Open `ios/App/App.xcodeproj`, select the **App** target → Signing & Capabilities, select the correct team and automatic signing, and add/confirm **Push Notifications**. Refresh provisioning profiles to include `aps-environment`.
4. The project already references `App/App.entitlements`. Debug sets `APS_ENVIRONMENT=development`; Release sets `APS_ENVIRONMENT=production`. The native bridge reads the embedded provisioning profile to determine the actual APNs environment: a locally signed Release build may still be development. App Store/TestFlight builds without an embedded profile use production. Inspect the signed archive entitlements before distribution.
5. Run `npm ci` and `npm run ios:sync`, then build to a connected iPhone. For TestFlight use a Release archive, increment the build number, and upload through Organizer as usual. TestFlight tokens use production APNs; local development-signed device builds use sandbox. Both can coexist in the same backend.
6. No Universal Links or Background Modes capability is required for this implementation. Taps use an internal route. Badge-only APNs messages use the `alert` push type with `aps.badge`; they do not depend on JavaScript background execution or silent-push support.

References: [Capacitor 8 Push Notifications](https://capacitorjs.com/docs/apis/push-notifications), [Apple APNs requests](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns), [Apple token authentication](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).

## Server environment and deployment order

Set these in the Railway backend's secret/environment settings, never in `VITE_` variables or bundled app configuration:

| Variable | Value |
| --- | --- |
| `APNS_KEY_ID` | The Apple APNs authentication key ID |
| `APNS_TEAM_ID` | Your Apple Developer team ID |
| `APNS_PRIVATE_KEY` | Complete `.p8` PEM content; actual newlines or literal `\n` both work |
| `APNS_TOPIC` | `com.picklebash.app` |

Keep existing `SUPABASE_SERVICE_ROLE_KEY`, Supabase settings, and all `VAPID_*` settings. `.p8` files are now ignored by Git; do not paste private keys into tracked files. The backend requires outbound TLS/HTTP2 to `api.push.apple.com:443` and `api.sandbox.push.apple.com:443`.

Apply `supabase/migrations/202609250001_native_push.sql` using your normal migration process **before deploying the backend**. Deploy the backend with the APNs variables, then distribute the new iOS app. An absent or invalid APNs configuration leaves Web Push available and shows a retryable unavailable message when enabling native notifications.

## Database changes

- `push_devices`: installation UUID primary key, authenticated `user_id`, iOS platform, APNs token, environment, enabled flag, created/updated/last-seen timestamps. Unique `(environment, device_token)` prevents duplicate delivery. Each installation has its own row; user records have no token field.
- `register_push_device`: service-only atomic registration RPC; advisory locking serializes registration of the same token. Token rotation updates the installation row; explicit registration can transfer that installation to the signed-in user without affecting their other devices.
- `push_badge_jobs`: durable dirty-user queue with revision UUIDs. A trigger on match insert/update/delete marks affected users, including bots, invitation acceptance, turns, and endings/leave RPCs. A worker processes up to 100 users every five seconds and retains failed jobs. Conditional revision acknowledgement cannot erase a newer mutation.
- `turn_badge_count`: authoritative count of active matches assigned to the user, excluding pending/cancelled invitations. Muting or archiving does not remove an active turn from the count.
- Both tables use RLS and revoke access from `anon` and `authenticated`; only the bearer-authenticated backend with service-role access can read/write tokens or counts. Existing Web Push tables and turn claim logic are retained.

## Architecture decisions

`NotificationService` reuses the existing committed turn event, deduplication claim and per-game mute checks. It attempts APNs across every enabled device. If at least one APNs request is accepted, it does not also invoke the fallback. If all attempts fail or no active devices exist, it invokes the configured legacy fallback (Web Push in this checkout; injectable SMS adapter described above). A rejected/expired APNs token is disabled with guards against stale responses affecting rotated tokens. Transient failures preserve the token.

APNs uses ES256 provider JWTs cached for 50 minutes and fixed Apple HTTP/2 endpoints. Requests have five-second timeouts and five-minute expiry. Logs omit tokens, JWTs and private keys. Alerts carry `type: "your_turn"`, `gameId`, title `Your turn`, and body `{opponentName} just played. You're up.` Nudges reuse the native channel with their own type/title.

`src/platform/notifications.ts` owns permission, registration, token refresh, lifecycle, internal tap routing and badges. It exposes `requestNativeNotifications()` and `showNativeTurnPrompt()` for contextual UX. The existing API response boundary emits a game-refresh event; after a successful action transitions to waiting, the native prompt offers Enable Notifications. Permission is never requested on launch. Existing opted-in installations re-register after resume/auth refresh/network recovery without re-prompting. Registration/backend failures remain retryable. Explicit logout disables the backend row before unregistering, so offline logout must be retried; other devices remain enabled. Auth switches also attempt to detach the old account.

Badge values always come from the server's game count, never from delivered/unread notifications. Every alert carries the count; the durable queue sends badge-only updates to all registered devices, and foreground game refresh/resume fetches the count directly. A tiny local Capacitor plugin applies the absolute count (including zero). Native sends are serialized per user within a server process, and foreground refreshes ignore stale responses.

APNs acceptance does not prove device receipt; iOS settings, connectivity and APNs delivery ordering can delay or suppress notifications/badges. Foreground resume repairs the count. The existing turn alerts are still detached best-effort side effects, with the existing claim semantics; they are not a new durable alert outbox. Badge jobs are durable. Multiple backend replicas may send redundant badge updates; all contain absolute counts, and resume rechecks authority.

## Physical-iPhone checklist (not yet performed)

Use two player accounts A/B and, for multiple-device cases, two physical installations for A. Test both a Debug build and TestFlight.

- [ ] Fresh installation: launch, sign in, browse/play; no iOS permission dialog appears automatically.
- [ ] Complete a turn that leaves the game waiting. Tap Enable Notifications on the explanatory prompt; only then does iOS ask for permission.
- [x] Allow permission. Verify one enabled `push_devices` row for the authenticated account with the expected environment and updated last-seen timestamp. Do not copy tokens into screenshots or logs.
- [ ] Deny permission, dismiss the prompt, and simulate offline registration/backend failure. Gameplay continues; a later contextual enable can retry, or permission can be changed in iPhone Settings. Resume detects revoked permission and disables delivery on that installation.
- [ ] Background/lock A's iPhone; B plays. Verify `Your turn` / `B just played. You're up.` and the correct app badge.
- [ ] Tap the notification with the app foregrounded, backgrounded and fully terminated; each opens the specified game. Sign-in and server participant authorization must still apply. Try an ended game notification too.
- [ ] Put A's turn in two active games: badge is 2. Complete A's turn in one: badge drops by one when ownership changes. Finish/leave the other: badge clears to 0. Repeat while acting from the web or A's second device; allow a queue cycle.
- [ ] Mute an active game: no turn alert for that game, but it still contributes to A's turn count. Pending invitations and completed games contribute zero. Unread notification banners do not change the count.
- [ ] Resume after offline play changes; badge reconciles to the server count. Repeat when a notification arrives while app is open.
- [ ] Enable A on two devices: two rows, both receive pushes. Rotate/re-register one token; no duplicate row or corruption of the other device. Simulate APNs `Unregistered`; only that exact stale registration is disabled.
- [ ] Sign out A on one device and sign in B: A's other device remains enabled, the signed-out installation receives no A alerts, and B opts in independently. Repeat a failed/offline logout and retry.
- [ ] Remove/disable native devices or simulate an APNs rejection: existing Web Push fallback still works, including its mute/activity suppression. Verify SMS separately **after locating and wiring the missing SMS implementation**; it is not implemented by these credentials.

## Local validation

Commands used for automated checks:

```sh
npm run build
npm test
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/picklebash-push-build CODE_SIGNING_ALLOWED=NO build
```

New tests cover ES256 signing/APNs headers, registration validation, native-first/fallback selection, all-device delivery and stale-token cleanup, badge-zero payloads, real PostgreSQL permissions/rotation/concurrency/counts/queue revisions, contextual permission behavior, routing, registration errors and account changes. Mocked native tests and unsigned Xcode builds cannot establish physical-iPhone permission/APNs delivery or distribution signing correctness.

Verified locally: all 622 regression tests passed, including the new PostgreSQL/native tests; the web build, unsigned Debug iOS Simulator build, and unsigned Release iPhone SDK build succeeded. Native client tests were rerun successfully after serializing token uploads. Physical-iPhone and live APNs/SMS tests remain pending.

Deployment verification (September 25, 2026): production health and native-push config return HTTP 200, native availability is true, a temporary guest badge count returned zero, and the temporary guest was removed. Production push tables have RLS enabled and deny anon/authenticated reads. The real iPhone registered an enabled sandbox device; its authoritative badge count matched its active games and the durable badge queue drained to zero. The APNs private key remains in an ignored .p8 file with owner-only filesystem permissions, and in Railway server secrets. It was not committed.

Physical confirmation: the user enabled notifications and confirmed the test notification, badge 1, and correct game navigation all work. This was a development-signed local iPhone installation; no new TestFlight build was uploaded during this deployment. SMS remains unverified because no SMS provider exists in this checkout.
