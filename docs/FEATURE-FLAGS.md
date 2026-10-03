# Feature flags

Application code uses `FeatureFlags.isEnabled(name)` or `FeatureFlags.getVariant(name)` from `src/analytics`. Official SDK calls stay in the adapters. Boolean enablement means strictly `true`; a multivariate string must be handled explicitly, e.g. `getVariant('experimental_gameplay') === 'variant_b'`.

| Flag | Safe fallback | Initial PostHog rollout |
| --- | --- | --- |
| `rematch_auto_countdown` | OFF; existing manual rematch | ON for 100% of all users, including guests (September 28 follow-up) |
| `decision_quiz` | OFF | OFF, reserved for future behavior |
| `xp_progression` | ON | ON; descriptive foundation, does not revoke or alter existing XP economics |
| `advanced_stats` | OFF | OFF, reserved |
| `plus_features` | OFF | OFF, reserved; never substitutes for trusted entitlement checks |
| `experimental_gameplay` | OFF | OFF, reserved for future experiments |

[Manage flags](https://us.posthog.com/project/632654/feature_flags). PostHog provides account targeting, property/cohort rules, percentages and variants. The initial rematch flag has one Distinct ID condition and 100% within that condition, with no all-users rollout. Live flag evaluation was verified true for `dzuy`, false for a non-target ID without recording synthetic events. The test account ID is stored in PostHog, not hardcoded into the application.

The client defaults OFF until flag loading succeeds, invalidates eligibility on account change, returns fallback offline or after 60 seconds without fresh configuration, refreshes every 45 seconds/on reconnection, and limits requests to two seconds. Rematch timers consult the flag while running. The server independently evaluates the authenticated actor on automatic-request and countdown-claim routes, with a 1.8-second fail-closed deadline. Manual rematching remains available if PostHog fails. A remote switch can take up to the refresh/cache interval to reach a client, while the server provides the final authority for automatic requests.

`rematch_prompt_shown.countdown_enabled` records actual UI eligibility once per original match; PostHog's feature-flag events support later experiment exposure. Do not classify unobserved users as “control” merely because they have no flag event. No experiment or assignment statistics system is implemented locally.

To develop locally, set `VITE_ANALYTICS_DEBUG=true` and `VITE_FEATURE_FLAG_OVERRIDES={"rematch_auto_countdown":true}` in ignored `.env.local`. Overrides never apply to production builds and local analytics sends nothing. The server intentionally stays OFF without an enabled production/staging flag provider; use unit/integration tests for automatic server transitions instead of bypassing production authorization.

For a new feature: add a typed name and safe fallback, wrap only the new behavior, test provider failure and OFF behavior, then enable internal accounts. Expand to a named tester cohort, then a small production percentage, evaluate the predefined completion/retention/error measures in PostHog, and expand progressively. Keep each cohort/variant stable during an experiment. Do not change established progression, pricing or entitlement rules just because a flag exists.

After a full rollout has remained stable and supported native versions no longer depend on the fallback, remove the conditional and obsolete exposure instrumentation in code, deploy, then archive the flag in PostHog. Preserve historical insight definitions. To roll back earlier, disable the flag; do not ship a second ad hoc override or remove manual recovery behavior.

Local test follow-up: the ignored `.env.local` enables `rematch_auto_countdown` through the existing development override. Eligible solo countdowns now show “Rematching in 10…” and start another solo game at expiry. Cancelling, leaving, backgrounding, or disabling the flag prevents that start. This local change does not expand production targeting or bypass server authorization for multiplayer.

Release follow-up: `8af8c6b` reached Active on Railway on September 28, 2026. TestFlight 1.0 (7) uploaded with production analytics configuration; Apple processing completed; export compliance, tester assignment, and physical-device checks remain pending. This release does not change remote flag targeting, event ownership, privacy rules, or dashboard metric definitions. See [release record](TESTFLIGHT.md).

September 28 all-player rollout: at the user’s explicit request, removed the Distinct ID restriction on live flag 914756 and retained a 100% rollout with no property filters, for both client and server. Luna and guest identities are now included. Build 7 already contains the heading countdown; no new binary is needed for this setting. Existing clients refresh flags every 45 seconds; a screen opened before refresh may need to be reopened. Existing invitation and lifecycle cancellation rules still apply.

Homepage routing follow-up (local, not deployed): marketing at `/` does not evaluate product flags. `/play`, legacy game links and native entry retain the existing game flag behavior and fallbacks. Live flag configuration is unchanged.

### Permanent pack rollout controls (local, 2026-09-29)

Billing does not evaluate `plus_features` to grant pack ownership. `PACK_STORE_ENABLED` activates the migrated subsystem only after its schema is installed. The service-owned database row `premium_configuration.enforcement_enabled` stages court/cosmetic restrictions; `BILLING_PURCHASES_ENABLED` plus required provider/webhook/policy configuration stages checkout. Both default off. These are operational rollout controls, independent of per-account pack ownership and PostHog targeting. See [BILLING.md](BILLING.md) for deployment order; no live flag targeting was changed by this implementation.

Purchase-sandbox follow-up (2026-09-29): the separate Railway service and TestFlight 1.0 (8) use only sandbox database facts, with client/server PostHog and replay explicitly disabled and no ingestion keys copied. Standard account audit hooks were restored after schema-only branching; their facts remain local to that database. Event ownership, privacy rules, metric definitions and production remote targeting are unchanged. See [purchase testing](PURCHASE-TESTING.md) for the dated deployment and physical-test status.

Web tax preparation (local, September 29, 2026): `STRIPE_AUTOMATIC_TAX_ENABLED` is a server billing configuration setting, default false, independent of PostHog flags, ownership and purchase enablement. Enable it only after tax settings/categories/registrations are verified. Checkout requires a current billing address and avoids reusing sessions with a different tax policy. No analytics events, identity/privacy rules, metric definitions or remote flag targeting change; see BILLING.md for pending setup facts and deployment state.

Owner admin follow-up (local, October 1, 2026): `/admin` provides account management for the verified dzuy UUID, independently of analytics access. Both `/admin` and `/admin/*` skip product identity binding, capture and replay. Per-account game counts are retained database records, not changed analytics metrics. Event ownership, privacy, identity and remote flag targeting are unchanged. Account removal now archives records and blocks access; existing analytics histories and metric definitions are retained. Owner-requested erasure remains a separate process. See [owner administration](ADMIN.md) for access, audit and release status.


Web beta entry follow-up (October 2, 2026): `/` remains public marketing without auth or product telemetry. Web game entry now resolves the existing auth client at the account gate before loading gameplay. Existing account-dialog onboarding events, identity binding, app-open behavior for game-entry routes, privacy rules, and metric definitions are retained; opening the gate is not evidence of successful registration or gameplay. Native entry and admin authorization remain unchanged. Beta access uses registered-session state, not a feature flag or Premium entitlement. No new marketing events, flag targeting, or production configuration changes were made. See [homepage beta access](HOMEPAGE.md#web-beta-access--october-2-2026).

Owner To-do List follow-up (local, October 3, 2026): `/admin/todos` uses the existing `/admin/*` exclusion from product identity binding, capture and replay. Task content stays in service-only storage behind immutable-owner authorization. No analytics events, metric definitions, entitlements, feature flags or remote targeting changed. The private-table migration was installed with explicit approval on October 3; web rollout verification is tracked separately. See [owner administration](ADMIN.md#private-to-do-list--local-implementation-october-3-2026).
