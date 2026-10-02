# Simple admin analytics dashboard

Implemented locally on 2026-09-28 at `/admin/analytics` (trailing slash also works). It is not deployed by this change. The initial implementation used a clear setup state without a query credential; see the connection follow-up below for subsequent live validation. Do not present fixture counts as production results.

## Access and configuration

The page shell is public but contains no data. `GET /api/admin/analytics?days=7` validates the Supabase bearer token with `auth.getUser`, rejects guests, and requires the verified account UUID in `ANALYTICS_ADMIN_IDS` on every request, including cache hits. Empty allowlist denies everyone. Player-editable metadata, community moderation, Premium access and feature flags do not grant analytics access. Signed-out, expired-session and access-denied states offer a Sign in button that opens the shared username/email and password dialog directly on this page. Successful sign-in replaces the session and rechecks server authorization; signing in alone does not grant admin access.

Set server-only variables:

- `ANALYTICS_ADMIN_IDS`: explicit comma-separated approved Supabase UUIDs. Start with the owner's verified UUID; do not use usernames or emails as authority.
- `POSTHOG_PERSONAL_API_KEY`: personal API key limited to project 632654 with Query read access. This is separate from the public ingestion token. Store in the server secret manager, never `VITE_`, source, browser storage or chat.
- `POSTHOG_PROJECT_ID=632654`
- `POSTHOG_QUERY_HOST=https://us.posthog.com` (only this and the EU host are permitted).
- `ANALYTICS_COVERAGE_SINCE=2026-09-28T00:00:00Z`: earliest known collection boundary. Later missing data still requires investigation; this boundary alone does not prove completeness.

An authorized admin sees “Connect analytics” while key/project configuration is missing. Without an allowlist entry, the page instead says “Admin access required.” No credential creation, paid upgrade or deployment was performed as part of this implementation.

Local access follow-up (2026-09-28): at the owner’s request, verified their account against Supabase Auth and added its UUID to the ignored `.env.local` allowlist. The running local dashboard successfully returned the authorized “Connect analytics” setup state. This local grant does not configure production access; the PostHog query key is still missing.

## Architecture

- `src/admin-analytics.ts` / `.css`: separate lazy-loaded, responsive dashboard; definitions are expandable, not a separate analytics explorer. Seven-day default, optional 30-day range, explicit refresh, setup/sign-in/forbidden/error states.
- `src/analytics/dashboard-contract.ts`: aggregate-only response and ratio helper.
- `server/multiplayer/admin-analytics.ts`: separate configured handler, independent of multiplayer availability; fixed HogQL queries; no arbitrary query endpoint. PostHog provider can later be replaced while retaining the aggregate response.
- `server/production.mjs` and `vite.config.ts`: production/local page/API routing. Admin HTML is noindex and no-referrer; API responses are no-store. Admin-page loading skips the product analytics/replay adapter so dashboard visits do not inflate game activity.

Queries are bounded to two 7/30-day windows plus seven days for retention cohort alignment. Current and previous periods run concurrently, with six sequential aggregate queries per period (12 provider requests on a cache miss, at most two concurrent). Each request has an 8-second deadline and the group a 25-second deadline. Only successful validated results are cached for five minutes; requests coalesce per range. Failures trigger a one-minute cooldown and return a generic error, never upstream bodies/keys. Admin refresh is limited to 30 requests/minute per account per server process. Caches and this refresh limit are per-process, not distributed.

## Dashboard metric version 1

Windows are trailing 7 or 30 days through a five-minute UTC boundary, including the current partial day; previous windows have equal duration. All queries filter production. Human actors include guests and play against computer opponents. Multiplayer outcomes exclude solo/local games. Activity includes app opens or shots across modes; do not imply the game-rate denominator contains only multiplayer players.

- **Active players:** distinct merged PostHog persons with app opens or human shot events.
- **New accounts:** distinct persons with registered-account creation/guest upgrade events.
- **Games completed:** distinct multiplayer match IDs completed in the window, not participant-event count.
- **Completion rate:** distinct multiplayer games started in the window with an ordered completion before its end, divided by started games. Recent games can still be active.
- **Rematch rate:** completed multiplayer originals with an ordered server-owned manual/automatic request inside the same window, divided by completed originals. Requests do not imply acceptance. Request events do not carry `game_mode`, so they are filtered by server source and joined to multiplayer completed originals.
- **Games per player:** multiplayer completions per person among people active during the same full window, divided by active people. This is intentionally period-wide, not an average of the existing daily dashboard values.
- **Invite path:** invitations sent → accepted → first turn → first completion, joined by invitation ID with ordered nullable stage timestamps. Unlike the existing PostHog open-gated funnel, this compact path omits opens; missing client-view telemetry must not hide confirmed acceptance. Copy/share does not prove delivery. Existing users can accept.
- **Seven-day return:** registered signup cohorts from the selected window shifted seven days earlier, active on exactly UTC calendar day 7. Exclude cohorts until that entire day has elapsed (start of signup day + 8 days). This avoids an always-empty D7 card for a seven-day display window. It is not “any return within seven days” and not all-player retention.

Zero denominators display an em dash and “Not enough data yet.” Counts with partial history carry an early-data notice. Comparisons are suppressed if the previous window predates collection; D7 additionally requires the shifted cohort window to be covered. Known event loss or delays can still affect figures. The PostHog dashboards are unchanged; these simplifications are explicit, versioned definitions for this view.

## Validation and activation checklist

Automated HTTP tests cover unauthenticated/ordinary/guest denial, missing allowlist, setup state, query parameter/method restrictions, cache/coalescing, error redaction/cooldown, metric denominator behavior and production route handling. SQL structural assertions guard distinct match counting, null stages, ordered transitions and mature retention boundaries. Existing analytics tests also pass; these mocks do not validate the live HogQL engine or real totals.

`tests/browser/analytics-preview.html` is a local-only layout fixture with a prominent sample-data banner. `?setup=1` previews the connection state. It is not a production route or authentication bypass for the API.

Before enabling live data: configure the server key/allowlist, run all six queries against PostHog, reconcile current/previous results over a fixed period using the definitions above, test an authorized and unauthorized real account, and verify real retention/cohort edge cases. If query validation fails, the page shows unavailable rather than manufactured zeros. No database migration or new event collector is needed.

References: [PostHog query API implementation](https://github.com/PostHog/posthog/blob/master/posthog/api/query.py), [query execution modes](https://github.com/PostHog/posthog/blob/master/posthog/hogql_queries/query_runner.py). Verified the read/query API contract while implementing; live project permissions remain to be validated with the configured credential.

## Connection follow-up — 2026-09-28

The owner supplied a personal query key in ignored `.env.local`. Copied the key, project ID, query host, admin allowlist and coverage boundary to the PickleBash Railway production service (`picklerpg`); read-back verified matching values without printing secrets. Used `--skip-deploys`: variables are saved for the next deployment, and the dashboard code remains local/uncommitted. No production dashboard release is claimed.

PostHog accepted the key. All six current-period aggregate queries returned successfully after correcting retention date conversion to `toDate(toTimeZone(..., 'UTC'))` and the equivalent start-of-day expression. The local authenticated dashboard loaded real current/previous aggregates. Four focused tests and the production build passed. This validates execution, not complete metric reconciliation or mature retention cohorts; tracking history is still partial.

October 1 presentation follow-up (local): the Community sidebar links directly to this existing dashboard; browser verification loaded live aggregates for the authorized owner. Both admin pages now use canonical PickleBash colors and the unchanged logo. Metric definitions, authorization, provider queries, event ownership, identity, collection and flags are unchanged. Production build passed; this does not establish a hosted client release.
