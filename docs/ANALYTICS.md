# PickleBash analytics

For decision rationale, a source-code map, and the proposed path to our own dashboard, read [Architecture decisions and dashboard handoff](ANALYTICS-ARCHITECTURE.md). Implementation and release evidence below is a **2026-09-28 snapshot**, not a live deployment check. The web/server release is now deployed; see the release record below.

## Architecture and identity

`src/analytics/events.ts` is the typed product contract; `core.ts` is the provider-neutral, fail-open controller. Application code imports `Analytics` / `FeatureFlags` from `src/analytics`. Only that adapter imports the official `posthog-js` SDK. The Vite web app and Capacitor iOS WebView share this implementation; there is no React Native client. `auth-session.ts` binds the singleton Supabase auth client before route loading. SDK loading is asynchronous and never gates gameplay.

Use the stable Supabase user UUID, including persistent guest UUIDs. Guest registration keeps that UUID; do not alias email addresses. Account changes/reset clear the prior identity before the new one is installed. SDK startup waits for the initial auth result; queued events cannot cross account switches. Person properties are `is_guest`, `account_created_at`, and trusted `has_full_game_analysis`; counts and acquisition properties can be added through `setUserProperties` when an authoritative value is available. There is deliberately no invented global `is_plus`: see [Premium](PREMIUM.md).

`server/multiplayer/analytics.ts` uses official `posthog-node`. A small background adapter reads **existing committed game, invitation, shot and XP facts**, through the service-role-only `product_analytics_page` view/function. No ingestion service, custom warehouse, queue table, funnel engine or session recorder was added. New account/player/skill/entitlement transitions append to the existing audit ledgers. These audit triggers catch failures so analytics cannot reject gameplay or account updates.

Delivery starts only with explicit configuration and a rollout timestamp. It runs outside requests, uses a fixed one-minute-delayed cutoff and keyset pagination, retries failed ingestion without advancing the cursor, overlaps five minutes, and reconciles the rollout window every six hours/restart. Stable PostHog UUIDs include environment, event and actor/domain receipt. PostHog owns ingestion and eventual duplicate compaction; repeated retries can briefly appear before compaction. An in-process bounded receipt set avoids repeated sends during overlapping scans. SDK shutdown is awaited by the production server. Domain facts remain recoverable if PostHog is down; client UX events are best effort, with bounded startup buffering and 2,000 account-scoped local receipts.

## Event catalog and ownership

All product names are snake_case. Standard SDK adapter properties: `environment`, `platform` (`web`, `ios`, or `server`), `app_version`, `event_source`. PostHog supplies event timestamps/session IDs; backend timestamps are the original committed transition times. Backend events additionally retain `domain_timestamp_ms` for exact ordering: ingestion clock adjustments can shift otherwise simultaneous acceptance/start timestamps. The rematch query uses this domain time, with second-resolution fallback for the initial commissioning data. Identity is `distinct_id`, not a redundant email/user-name property.

| Events | Owner / meaning |
| --- | --- |
| `app_opened` | Client launch/foreground, no automatic pageviews |
| `onboarding_started`, `onboarding_completed` | Client account dialog and shared-challenge tutorial milestones |
| `account_created` | Database non-guest creation or persistent guest upgrade; one per UUID |
| `player_created` | Committed cloud-roster creation, retained in existing XP audit |
| `invite_created`, `invite_sent` | Backend invitation creation; shared-link copy or successful native share are the closest observable delivery boundary, not proof that a recipient read a message |
| `invite_opened` | Backend shared-link open; client in-app invitation view |
| `invite_accepted` | Committed accepted invitation |
| `invited_player_activated` | Invited recipient's first committed turn in that invitation's match |
| `invited_player_first_match_completed` | First completed match resulting from that invitation; recipient may already have an account |
| `match_created`, `match_started` | Backend multiplayer; a match starts when playable/accepted. Client solo/local checkpoints |
| `match_completed`, `match_abandoned` | Backend multiplayer terminal state, one event per human participant; solo persisted validated result; client local two-human completion |
| `turn_started` | Client multiplayer own decision presentation, once per decision ID |
| `shot_selected`, `turn_completed` | Committed multiplayer human decisions, once per action; client solo/local human shots; no animation events or bot decisions |
| `rematch_prompt_shown`, `rematch_request_received` | Client observed UI, deduplicated by original match/invitation |
| `rematch_manual_requested`, `rematch_auto_requested`, `rematch_accepted`, `rematch_declined`, `rematch_started`, `rematch_completed` | Backend committed multiplayer lifecycle; solo/local rematch request/start/completion from client, preserving manual or automatic origin |
| `xp_earned`, `skill_point_earned` | Existing committed XP receipts, unchanged award economics |
| `skill_point_allocated`, `skill_points_reallocated` | Committed custom-player/community-player skill edits; allocation increases used budget, other changed builds are reallocation |
| `plus_paywall_viewed` | Historical event; no longer emitted by the V1 report UI |
| `plus_entitlement_changed` | Change to trusted `app_metadata.full_game_analysis`, including revocation |
| `cosmetic_viewed`, `cosmetic_equipped` | Existing roster appearance preview/save |
| `plus_purchase_started`, `plus_purchase_completed`, `plus_purchase_restored`, `cosmetic_purchase_started`, `cosmetic_purchase_completed` | Typed foundation only: no billing provider/checkout exists, so no fake purchase events are emitted |

Match context includes IDs, game mode, score, result, elapsed wall-clock duration and turn count where the authoritative model supplies them. Multiplayer also supplies player match number, pair match number and rematch ancestry. Rematches use `original_match_id` and `rematch_match_id`; the original automatic/manual request kind is immutable even if the requester subsequently confirms it. Prompt events carry `countdown_enabled`, enabling exposed vs fallback comparisons. Invitations use opaque `invite_id`/`inviter_id`/`resulting_match_id`, never the secret link token.

Backend multiplayer events are participant-grained. Count **distinct `match_id`** for match volume; count users for participation/retention. Bots are excluded as actors; `opponent_is_bot` permits filtering human-vs-bot matches. Do not add a client multiplayer completion event alongside the backend event. Use PostHog `person_id` for SQL user counts so anonymous/identified aliases do not inflate DAU.

## Adding an event

1. Add its typed properties and runtime required keys to `events.ts`, and safe scalar properties to the allowlist in `privacy.ts`.
2. Choose one owner. Record success after a committed transition, not after a tap. Prefer existing authoritative domain receipts.
3. Client: `Analytics.track('match_started', {match_id, game_mode: 'solo'}, match_id)`. The last argument is an optional stable once key; use domain IDs, not random IDs generated during rendering.
4. Backend: expose the existing committed fact with a stable actor/domain `event_id`. Use the adapter; never await analytics in a gameplay transaction/request.
5. Test retries, reloads, account changes and unavailable SDK behavior; add a PostHog insight only when it answers a product question.

`validProductEvent` rejects missing/empty required scalars at storage boundaries. The runtime allowlist strips arbitrary objects, free text, credentials and unknown fields. Never send player names, email, passwords, voice input, chat, shot commands, report text, invitation tokens, auth fragments or full URLs. General SDK URL/referrer attribution is stripped too.

## Configuration

Use the existing environment system. `.env.example` contains names/defaults; `.env.local` is ignored. The saved local public project token is disabled by default. It is an ingestion token, **not** a secret management API key. No management key is needed at runtime.

| Variable | Production value / purpose |
| --- | --- |
| `VITE_POSTHOG_KEY`, `POSTHOG_KEY` | Project ingestion token from PostHog settings; never paste keys into this document |
| `VITE_POSTHOG_HOST`, `POSTHOG_HOST` | `https://us.i.posthog.com` |
| `VITE_POSTHOG_ENABLED`, `POSTHOG_ENABLED` | `true` to enable respective client/server adapter |
| `VITE_ANALYTICS_ENVIRONMENT`, `ANALYTICS_ENVIRONMENT` | `production` or `staging`; default `development` sends nothing |
| `VITE_APP_VERSION`, `APP_VERSION` | Matching release/version identifier |
| `VITE_POSTHOG_REPLAY_ENABLED` | `true` for the reviewed production build; local default `false` |
| `POSTHOG_EXPORT_SINCE` | Keep `2026-09-28T00:00:00Z` as the initial rollout/reconciliation boundary |
| `VITE_ANALYTICS_DEBUG` | `true` locally to log sanitized events/flag decisions |
| `VITE_FEATURE_FLAG_OVERRIDES` | Development-only JSON, e.g. `{"rematch_auto_countdown":true}` |

`VITE_` values are **build-time** values: set them before Railway build and before `npm run ios:sync`. Server values are runtime configuration. Development builds and browser localhost refuse live delivery even with copied keys. Capacitor's bundled localhost origin is explicitly exempt, but still requires production/staging build configuration. For staging, use a separate PostHog project token when available; explicit environment properties and production-filtered dashboards are the current practical isolation. Never point staging at production Supabase facts while labeling them staging.

Production database migration: `supabase/migrations/202609280003_product_analytics.sql`. Its final definition was applied via the production SQL editor on 2026-09-28, including in-app invitation activation/completion coverage. No migration-history row was fabricated. The separate `202609280001_rematch_intent.sql` migration was applied transactionally before the release later on 2026-09-28; its columns/function and denial of direct authenticated-client execution were verified. See [rematches](REMATCH.md). Do not rerun either already-applied migration blindly.

For a bounded dry-run/recovery, use `POSTHOG_EXPORT_SINCE=... node --env-file=.env.local --import tsx scripts/sync-product-analytics.ts`. Add `--send` only with enabled production/staging configuration. It reports aggregate counts, never player data. A real production commissioning export since the rollout boundary delivered 221 domain events on 2026-09-28; no synthetic test users/events were ingested.

## PostHog configuration and interpretation

US project [632654](https://us.posthog.com/project/632654/home) was reused. All initial insights filter `environment=production`.

- [PickleBash Health](https://us.posthog.com/project/632654/dashboard/2143407): distinct merged PostHog persons across app opens **or** human shots, new accounts, match volume/completion, matches per active player and daily retention through D30. Completion rate uses a multiplayer started-match cohort, and the participation average includes only players active that day.
- [Core Game Loop](https://us.posthog.com/project/632654/dashboard/2143405): account → first multiplayer start/completion → second start/completion, plus repeat-play retention. Player match numbering is authoritative only for multiplayer.
- [Rematch Loop](https://us.posthog.com/project/632654/dashboard/2143408): pipeline keyed by original match, manual/automatic request volume, prompt exposure, same-pair follow-on completion percentage.
- [Invite Loop](https://us.posthog.com/project/632654/dashboard/2143406): cross-person stages joined by invite ID, volume, invited/direct signup retention. Anonymous link opens use the inviter's identity with `attribution_scope=invite_link`; never interpret these as invitee person conversions.

The observed-90-day same-pair metric counts each unordered human pair's distinct completed matches `n`: `100 * sum(greatest(n-1,0)) / sum(n)`. It answers the requested match-level follow-on question for that observation window, not “percentage of pairs with two matches.” Recent final matches are censored by the current observation date. Missing rematch stages stay NULL; all downstream stages require the preceding stages in order. D7/D30 require mature cohorts. No pre-rollout account/onboarding history was fabricated.

Client IP storage is disabled in project privacy settings. Replay is enabled in PostHog at 10%, 30-day retention, total text/image masking; console/network/headers/bodies/canvas off. Challenge and auth-capability URLs are blocklisted. Code additionally masks all inputs/text/attributes, blocks private input elements, disables network capture, requires resolved identity, and refuses replay on challenge/auth URLs. Canvas gameplay itself is intentionally absent; replay is for menus and transitions. Verify a real iOS build and a web session before expanding capture; remote recordings do not prove native background/foreground correctness.

## Known limits and release checks

- Browser blockers/offline behavior can drop client exposure events; committed backend facts are recoverable. No exact-once guarantee is claimed for ephemeral client UI telemetry.
- Solo results are validated client reports persisted server-side, not a replay of every authoritative turn. Local two-human play has only the active account identity. Multiplayer is the reliable basis for ordered match funnels.
- Existing older completed matches can fall inside a date window while their starts precede it. Interpret volume ratios accordingly; cohort completion queries must constrain the starting match set.
- The commissioning export contains backend facts only. Client onboarding/open/prompt/replay data starts after release; current empty UI stages are not evidence of abandonment.
- Initial rollout captures future account/player/skill transitions; it does not reconstruct deleted players, old skill edits, historical account-created events, or old decline timestamps. Signup-source attribution uses the existing referral record.
- Share success means the native share sheet succeeded; link copy means copied, not delivered. Recipient opening, activation and completion are separate facts. Existing users can accept invitations.
- The cosmetic pack backend verifies ownership. Any future purchase analytics must use verified provider transactions and transaction-ID deduplication.
- Web/server release: commit `541904c` was pushed to GitHub `main` on 2026-09-28 after explicit release authorization. Railway deployment `3358e09f-405d-4501-bfbd-1f4095b7e494` reached Active with all 12 analytics variables applied. The production build passed, `https://picklebash.app/healthz` returned `{"status":"ok"}`, and live browser assets contain the analytics adapter and production PostHog host. The release includes the rematch implementation required by the flag integration. iOS still requires a configured rebuild/sync and device smoke test; no native binary was released. Full two-account gameplay/replay smoke checks below remain follow-up work.
- Smoke-test two separate accounts: first/second match, invite acceptance, auto request for `dzuy`, manual fallback for non-target, flag off while countdown is active, logout/account change, offline mode, one completion/XP receipt after retry, masked web/iOS replay. See [feature flags](FEATURE-FLAGS.md).

Validation: `npm test` passed all 771 tests, including real PostgreSQL migrations, XP invariants, rematch races and analytics retry/identity/privacy tests. `npm run build` passed for client and server; the existing large-bundle warning remains. Live flag evaluation, SQL-view aggregate validation and PostHog ingestion counts were independently checked.

SDK references: [JavaScript](https://posthog.com/docs/libraries/js), [Node](https://posthog.com/docs/libraries/node), [feature flags](https://posthog.com/docs/feature-flags), [replay privacy](https://posthog.com/docs/session-replay/privacy).

September 28 follow-up (released in `8af8c6b`): solo countdown expiry now restarts the match and records `rematch_auto_requested` and `rematch_started` after reset, with automatic origin retained through completion. Local two-human games remain manual. Existing multiplayer event ownership and metric definitions are unchanged.

Release follow-up: `8af8c6b` reached Active on Railway on September 28, 2026. TestFlight 1.0 (7) uploaded with production analytics configuration; Apple processing completed; export compliance, tester assignment, and physical-device checks remain pending. This release does not change remote flag targeting, event ownership, privacy rules, or dashboard metric definitions. See [release record](TESTFLIGHT.md).

September 28 subsequent rollout: `rematch_auto_countdown` enabled for 100% of all users, including guests, at the user’s request. This supersedes the initial dzuy-only targeting recorded above. Event ownership, privacy, and metric definitions are unchanged; see [feature flags](FEATURE-FLAGS.md).

## Simple admin dashboard (local implementation)

A private aggregate dashboard is implemented at `/admin/analytics`, with a separate allowlisted server API. It is not yet deployed or connected to a PostHog query credential; the user requested a clear setup state first. See [setup, architecture and metric version 1](ADMIN-ANALYTICS.md). Admin page visits are excluded from product telemetry/replay. Existing event ownership and live flag targeting are unchanged.

Dashboard connection follow-up (2026-09-28): the local dashboard now loads live PostHog aggregates. Its server-only query settings and owner allowlist are saved on Railway for the next deployment; the dashboard code has not been deployed. See [dashboard connection and validation record](ADMIN-ANALYTICS.md#connection-follow-up--2026-09-28).

Homepage routing follow-up (local, not deployed): `/` now serves public marketing without initializing the product adapter, auth identity, replay, or flags. `app_opened` still means a game launch/foreground, including `/play`, recognized legacy game links, and native launches; ordinary homepage traffic is excluded even for signed-in players. No marketing events, new identifiers, or metric formulas were added. See [homepage routing](HOMEPAGE.md).

### Billing implementation handoff (2026-09-29; local)

Permanent pack ownership now lives in server-owned billing tables; see [billing operations](BILLING.md). Purchase buttons and checkout redirects do not emit completed/restored payment facts. `plus_entitlement_changed` and `has_full_game_analysis` still describe historical trusted analysis metadata, not pack ownership. Existing metric/event ownership remains unchanged. The complimentary administration form is excluded from capture; account identifiers and reasons must never enter product events. The report UI no longer emits `plus_paywall_viewed` or routes to a subscription upsell. No new billing events are introduced; provider records and grant audits remain authoritative.

Purchase-sandbox follow-up (2026-09-29): the separate Railway service and TestFlight 1.0 (8) use only sandbox database facts, with client/server PostHog and replay explicitly disabled and no ingestion keys copied. Standard account audit hooks were restored after schema-only branching; their facts remain local to that database. Event ownership, privacy rules, metric definitions and production remote targeting are unchanged. See [purchase testing](PURCHASE-TESTING.md) for the dated deployment and physical-test status.


## Account-safety preparation — September 29, 2026

Safety dialogs are blocked from menu session recording. Passwords, report details, message evidence and blocked-player lists produce no new analytics events/properties. Account deletion requests require exact-UUID PostHog provider cleanup before the operator marks external cleanup complete; this is a manual procedure, not deployed automation.

Owner admin follow-up (local, October 1, 2026): `/admin` provides account management for the verified dzuy UUID, independently of analytics access. Both `/admin` and `/admin/*` skip product identity binding, capture and replay. Per-account game counts are retained database records, not changed analytics metrics. Event ownership, privacy, identity and remote flag targeting are unchanged. Account removal now archives records and blocks access; existing analytics histories and metric definitions are retained. Owner-requested erasure remains a separate process. See [owner administration](ADMIN.md) for access, audit and release status.
