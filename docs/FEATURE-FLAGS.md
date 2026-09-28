# Feature flags

Application code uses `FeatureFlags.isEnabled(name)` or `FeatureFlags.getVariant(name)` from `src/analytics`. Official SDK calls stay in the adapters. Boolean enablement means strictly `true`; a multivariate string must be handled explicitly, e.g. `getVariant('experimental_gameplay') === 'variant_b'`.

| Flag | Safe fallback | Initial PostHog rollout |
| --- | --- | --- |
| `rematch_auto_countdown` | OFF; existing manual rematch | ON only for the verified internal account `dzuy`, targeted by stable Distinct ID |
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
