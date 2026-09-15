# Phase 3 — Remote asynchronous test slice

Implemented and deployed to the existing PickleBash service. Hosted database/Auth acceptance and two isolated real-login browser sessions passed. The user has now confirmed that the two-physical-device playtest works. Later invitation and lobby work is recorded below; the original Phase 3 scope is retained as historical context.

## What is implemented

Open `/?multiplayer=1` for the tester lobby. A configured tester selects another tester, starts an equal-skill doubles match, and shares the resulting `/?multiplayer=1&match=<uuid>` URL with that already-enrolled account. Each account controls its two athletes. Names and appearance come from the creator's local saved athletes (with default athletes filling empty slots); gameplay attributes and handedness are fixed at the Phase 2 baseline. This is controlled tester setup, not the public invitation flow planned for Phase 4.

The default is rally scoring, first to 3 without a two-point margin, following the latest Phase 2 playtest preference. Side-out remains selectable at creation. Rules and roster are frozen per match. Solo and same-device saved games are unchanged.

The browser renders the existing CourtScene using a public display projection. It never hydrates a private checkpoint, resolves a remote shot, awards a point, or reports a remote result to solo history. Aim on the opposing court and choose a shot; reception timing and the shot are one request. The camera stays on the viewer's side. Point results prepare the next serve in the same server transition. Animation can be skipped and never advances authority.

## Server and storage

- `server/multiplayer/routes.ts`: bearer-token verification with Supabase Auth `getUser`, same-origin checks, body limits, per-process request limits, and feature/tester configuration.
- `server/multiplayer/service.ts`: canonical request validation, fixed team ownership, legality checks through the shared engine, explicit public projection, and committed animation sampling. No AI calls in resolution.
- `server/multiplayer/repository.ts`: production Supabase adapter. The latest authoritative checkpoint and append-only action receipts live in Postgres, never process memory.
- `supabase/migrations/202609140001_async_matches.sql`: private tables, indexes, row locks, creation idempotency, turn idempotency, grants, and atomic update/receipt functions. Anonymous and authenticated browser roles have neither table access nor commit-function execution. The service role has table SELECT and RPC execution, not direct INSERT/UPDATE/DELETE grants.
- `src/multiplayer/match-session.ts`: account/match-scoped cache and persisted pending action ID. Storage succeeds before POST. Lost responses reuse the same ID; exact old receipts cannot replace newer state. Authentication changes cannot resume another account's pending request. A choice made before an in-flight refresh cannot be silently moved to a newer decision. Remote play requires an existing session instead of silently creating a new guest on expiry. The Solo & settings link preserves a validated internal match destination through the email sign-in return URL.

Remote rows pin `pickle-remote-1`, the existing `pickle-human-1` checkpoint engine, and seed derivation version 1. A private per-match 256-bit secret derives decision seeds through HMAC-SHA256 using engine/point/shot context, independent of action ID or retries. Public state and historical receipts omit all secrets, sampled option results, reception branch outcomes, and engine internals. Only committed movement is sent for optional animation. Unsupported versions fail without a write; this release supports this one pinned remote resolver.

The database version increments once for each accepted action. Point advancement is included in that version. An action row and its resulting checkpoint are committed in one transaction, with a unique `(match_id, action_id)` and `(match_id, to_version)`. Exact actor/payload retries return the original receipt even after subsequent turns or completion. Changed payloads and stale versions conflict.

## Configure a hosted test environment

1. Choose the Supabase test project and verify the existing four migrations/auth configuration there. Apply the new additive migration through that project's normal SQL/migration workflow. All six repository migrations have been exercised together on disposable local Postgres; this does not verify the hosted project.
2. Use two existing or newly established **recoverable** accounts in that same project. Protect guest accounts with the existing email flow before testing cross-device recovery. Add their auth UUIDs to `MULTIPLAYER_TESTER_IDS`. Never use athlete IDs as account IDs.
3. Set the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the server; never expose the latter through `VITE_` or client files.
4. Set `MULTIPLAYER_ENABLED=true`, `MULTIPLAYER_CREATE_ENABLED=true`, and optionally `VITE_MULTIPLAYER_ENABLED=true` to show the main-menu test link. Production reads server environment variables; local development loads `.env.local` in `npm run multiplayer-server`.
5. Run `npm run multiplayer-server` alongside `npm run dev` locally. Vite proxies match APIs to `MULTIPLAYER_PORT` (default 5175); this workspace uses 5193 because another Vite session occupies 5175. The proxy preserves the browser Host for same-origin validation. For deployment, `npm run build` type-checks and emits `dist-server/multiplayer.mjs`; `npm start` serves it alongside the existing static/health/AI endpoints. Railway's existing build/start commands remain valid.
6. Sign in as each tester on independent devices, open the same match URL, finish the game, close/reopen browsers between turns, and restart the deployed Node process during the game. Verify exactly one action row per accepted turn, persistent completion, no solo progression, and outsider rejection.

Set `MULTIPLAYER_CREATE_ENABLED=false` to stop creation while preserving existing read/turn access. `MULTIPLAYER_ENABLED=false` disables the entire remote API. Solo remains available in either case; failed remote submissions never fall back to local resolution.

## Validation

- Final full suite passed: 311 tests, including actual PostgreSQL migrations, role/grant enforcement, concurrent submissions, injected transaction failure/rollback, database restart, durable exact receipts, and full-game completion.
- Built Node HTTP tests exercise remote routes alongside static/health/AI routing, request/body/origin rejection, participant authorization, and duplicate handling.
- Browser checks used the real server, engine, and disposable Postgres with test-only injected identities: A served, B aimed and returned from the rotated camera, A reloaded to resume, and both completed the game at 2–3. This validates the two-session UI, not hosted Supabase authentication or two physical devices.
- Browser testing found and fixed an animation offset earlier than its receipt timestamp; a focused regression test covers negative elapsed time and unchanged authoritative state during playback.
- Production build and `git diff --check` passed. Build retains the pre-existing large-client-bundle warning.

`node --import tsx --test tests/remote-*.test.ts` runs the focused checks. `node --import tsx tests/browser/remote-preview.ts` starts the **disposable local UI fixture** on `127.0.0.1:5177`, with test account A by default and B via `&viewer=b`. The fixture is under `tests/`, supplies fake identities only within that test Vite process, uses a separate real local database, and is absent from production bundles and routes. Stopping it deletes only its temporary database.

## Remaining Phase 3 acceptance work

The existing `picklebash` project (`vwdtfnljcjbyokdvjiea`) now has both Phase 3 migrations applied through its authenticated Dashboard SQL Editor. Server credentials and the two dedicated test accounts plus the existing protected account are configured locally in ignored files. The Node service has since been deployed to picklebash.app (see Railway rollout below). The user subsequently confirmed the two-physical-device test, completing that outstanding Phase 3 acceptance step.

Public invites, social home, rematch/rivalry, notifications, and release-wide resilience remain later phases. The tester list is deliberately small and unpaginated (latest 30 games), and rate limiting is per process for the controlled beta. Animation is a compact committed movement sample, not full replay persistence. Persistent notification delivery and multiple retained remote engine implementations are not part of this increment.

## Existing-project acceptance — September 14, 2026

The opt-in `node --env-file=.env.local --import tsx scripts/test-hosted-multiplayer.ts --run-live` test used real Supabase password authentication, the hosted Data API, and the built production Node server. Dedicated test users use reserved `.invalid` email addresses; credentials are stored only in ignored `.multiplayer-test-accounts.json`. It did not send email or modify existing users or solo results. Test games remain in the tester lobby, including two partial games from failed diagnostic runs.

- Rally scoring finished **3–1**, with **29** accepted actions.
- Side-out scoring finished **2–3**, with **38** accepted actions.
- Creation retries, identical and competing action IDs, wrong-owner/outsider/forged-score rejection, role restrictions, restart retries, old receipts after completion, public payload redaction, exact history counts, and unchanged solo history passed. Sanitized evidence: [hosted report](../evaluation/phase3-hosted-report.json).
- Hosted testing exposed a hanging response when business conflicts used SQL serialization code `40001`. The additive `202609140002_async_conflict_status.sql` replaces those business errors with `PT409`; direct Data API verification and both full games passed afterward. The adapter maps this to HTTP 409.
- Two independent localhost browser origins signed into real Supabase accounts, resumed the same match, exchanged turns including a reception choice, reloaded and resumed, and reopened the same completed 2–3 result with no shot controls. The away camera was visually verified. Browser testing caught and fixed Vite's changed Host header on proxied POSTs.

`node --env-file=.env.local --import tsx tests/browser/hosted-preview.ts` starts the localhost-only real-login helper on ports 5178 and 5179 alongside the multiplayer API. It prints temporary sign-in URLs for the dedicated test accounts. It is excluded from production; never deploy this helper. These are two browser sessions on one computer, not the remaining two-physical-device acceptance test.

## Phone-to-computer playtest and lobby refresh

The remote lobby now presents active games as cards, puts your-turn games first, and offers In play / Your turn / Finished filters. Cards show team names, viewer-relative scores, scoring rules, and an action. The responsive new-game panel replaces the raw tester/debug layout.

For a same-Wi-Fi test, build the app and run `node --env-file=.env.local --import tsx tests/browser/phone-preview.ts --lan`. It binds port 5180 to a private network interface and serves only the production build plus the remote API. The console prints the phone pairing URL and a one-use code valid for 15 minutes. Pairing signs into dedicated Player 2; use the existing localhost port 5178 session as Player 1 on the computer. Select the other player and open the same game from each lobby. Keep the computer awake and both devices on the same Wi-Fi. After initial pairing, return to the network address with `/?multiplayer=1`; the phone retains its session. Restart the helper for a fresh code if necessary.

This helper is for local-network testing, not public deployment. It never sends the service-role key or test-account password to the browser. Pairing rejects other origins, reused/expired codes, oversized requests, and more than ten code attempts. Production deployment does not include these routes. Cross-network testing still requires deployment.

Validation: production build passed; the lobby was visually checked at 390px width; finished-game filtering passed; pairing through the actual private-network address established a real Supabase session and rejected reuse. Physical phone connectivity still requires the user's check (Wi-Fi/firewall settings cannot be verified from a browser on this computer).

## Railway rollout

The user authorized deployment to main and selected the dedicated password-based test accounts. The multiplayer page now offers direct email/password sign-in and device-local sign-out, using Supabase Auth without a local pairing server. The existing Railway service at `https://picklebash.app` has the server-only Supabase credential, URL, creation/API/menu flags, and tester IDs configured. Password sign-in does not require an email redirect or a redirect allowlist change. Phone credentials are kept in ignored `.multiplayer-phone-logins.md`, never committed or bundled. Full pre-deployment suite: 311 passed; production build passed. Physical two-phone acceptance remains a user test after deployment.

## Fresh email playtest accounts

The user requested a fresh account on each device, without email confirmation during this playtest. The remote page signs out previous sessions once for this rollout and clears the prior match/link fragment. New accounts use email and a password of at least 12 characters; registration creates a new Supabase user with email confirmation skipped and an admin-owned playtest enrollment flag. Existing email identities are never overwritten or reconfirmed. This is specific to new playtest registration; global Supabase confirmation settings remain unchanged. Registration closes with `MULTIPLAYER_CREATE_ENABLED=false`, rejects foreign origins, and is limited to six requests per minute per process.

The opponent directory now includes only newly enrolled accounts, identified by email. Old shared tester accounts are excluded from new-game creation. Existing games are retained. The header displays the signed-in email and controlled team; match details display the opposing email and shared game ID. Each device should register with a different email, then only one device creates the game and the other opens it from its game list.

Player names are now required at signup (1–32 characters), saved in account display metadata, and shown in the opponent directory, game cards, and match identity. The signed-in header retains the email alongside the name. Existing accounts without a name receive a one-time name-completion form after sign-in. Enrollment still relies only on admin-owned metadata.

### Shared court targeting and player names

Remote play uses the same court targeting wheel as single player. Tap the opposing court, then choose a shot; the server-provided shot variant and reception timing are preserved. Tapping outside the wheel or pressing Escape dismisses it. The wheel closes when the decision changes or a turn is pending/offline. The optional Shot list retains default targets.

Each account labels one roster slot (`you` for home, `opponent-left` for away) in the public match view, including existing games. Partner names and saved gameplay checkpoints are preserved. Multiplayer keeps the active player's name visible while choosing a shot.

Local browser fixture: `node --import tsx tests/browser/remote-preview.ts` creates a disposable match and prints its URL. Reload once after the first-entry signup reset, then use the printed match URL; add `&viewer=b` for the other team. This fixture uses a disposable database and simulated auth, never production accounts.

### Invitation acceptance and team setup

New games use a pending invitation before creating a playable match. The creator selects their player, partner, opposing account, scoring, and court. The Forest is the only enabled location, matching current solo availability. Incoming lobby cards say “NEW GAME · INVITATION”; outgoing cards show who must accept. The recipient selects their own player and partner, then accepts. Waiting creators automatically enter the game after acceptance.

Migration `202609140003_async_invitations.sql` adds participant-restricted invitation storage and atomic, idempotent creation/acceptance procedures. It has been applied to the shared playtest database. Acceptance fixes the creator's stored lineup, stores the recipient as the home team, and creates exactly one match with the recipient serving first. Existing matches remain playable. Production routing rejects immediate match creation when the invitation service is configured.

Validation: 22 invitation/remote tests passed, including concurrent acceptance, unauthorized access, no match before acceptance, preserved lineups, and recipient first serve. A disposable two-account browser test verified incoming/outgoing cards, player selection, acceptance, automatic creator entry, and opposite turn banners. The acceptance layout fits a 390px viewport without horizontal overflow. Production build passed. Code is local pending the next push.

### Decline, cancel, and dismiss invitations

Recipients can decline pending invitations. Declined invitations stay in the sender's lobby until the sender deletes the card. Senders can cancel pending invitations, removing them from both lobbies. Terminal rows are retained internally so retried requests cannot recreate invitations. Only pending invitations can be accepted, and all transitions lock the same row to prevent acceptance/cancellation races. Existing matches cannot be cancelled through invitation actions.

Migration `202609140004_invitation_lifecycle.sql` was applied to the shared database. Database tests cover permissions, retries, declined visibility, sender deletion, and accept-versus-decline/cancel races. The disposable browser test covered all three user flows. Production build passed; code awaits push.

### Community Players

Custom players are private by default. The creator can enable “Anyone can use this player” in the editor. A separate Community Players section in the roster and team setup lets other accounts browse designs and add/remove them from their selections. These selections reference the creator's design; they are not editable copies. Only the owner can update, unpublish, or delete the original.

New games resolve the latest public design. Existing match and invitation lineups retain their saved snapshots, including after updates or deletion. Unpublishing hides the character from new selections; deletion also removes saved community selections. Public catalog responses expose the design and creator display name, not account identifiers or email addresses.

Migration `202609140005_community_players.sql` has been applied to the shared database, with all existing players remaining private. Nineteen targeted tests passed, including database ownership restrictions, opt-in visibility, canonical server resolution, and preserved match snapshots. The disposable browser fixture verified browsing, adding a Community Player, selecting them, and sending an invitation. Production build passed. No existing user character was published during testing; application code awaits push.

### Your Roster and player discovery

Your Roster contains owned custom players, added Community Players, and selected Starting Lineup characters. Emma and Leo are included by default. Community and Starting Lineup appear below as sources with Add to roster actions; adding a shared player preserves the existing creator reference. Starting Lineup membership is saved in account metadata (or locally when signed out). Team selection uses roster membership for the user's two slots; solo opponents can still come from the full Starting Lineup. Existing matches retain their lineups. Cards share the roster design, full-width names, and blue DUPR badges.

Migration `202609140006_community_creator_names.sql` uses the creator's signup player name and has been applied to the shared database.

## Current Phase 3 verification

A fresh verification confirmed HTTP 200 from the deployed health endpoint and HTTP 401 from the multiplayer match endpoint without credentials. All 16 focused remote engine/session/playback/targeting, disposable PostgreSQL, and emitted-server HTTP tests passed. This check did not deploy or alter live match data. The user subsequently confirmed successful two-physical-device play and creating/joining friends’ matches. Earlier real-login browser acceptance is documented above.
