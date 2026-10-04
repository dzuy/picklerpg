Local web beta review, October 2, 2026.

browser-results.json: isolated browser acceptance results. Authentication/API state and the game-import boundary are mocked; the real bootstrap, account forms, transfer orchestration, homepage and videos are exercised. Native entry is a Capacitor platform simulation, not physical-device QA.
Screenshots: inspected homepage, account dialog, dismissed access screen and added clips on desktop/mobile.
tests.log: 37 focused auth/routing/analytics tests.
build.log: client/server production build, including typechecks and migration-name check.

No production accounts, matches, credentials, deployment settings, or Apple submissions were changed. Hosted auth was subsequently verified against the existing isolated purchase sandbox; see staging-results.json, sandbox-auth-inspection.json, and staging-followup.json. Physical iOS remains unrun.

Follow-up verification: canonical npm test 916 pass / one CSS-import failed file. A temporary external CSS loader allows all 919 tests to pass. No concurrent release source was modified to address the loader issue. Design/migration/diff checks pass.

Actual current app + sandbox Supabase/server handler: signup, sign-in, direct registered entry, logout, pending-email rejection, and challenge-route return passed. The sandbox lacks is_account_archived, so online game/invite acceptance tests are blocked by authenticated API 503s. No sandbox migration or deployment was performed. Disposable auth test accounts were created only in the verified sandbox.

Actual Quick Solo failed its court-ready check because the sandbox has insufficient public players (staging-extra.json). Actual anonymous auth and custom guest staging passed separately (staging-guest.json). Full real guest upgrade/invite acceptance/first turn await the sandbox migration and roster preparation, not production test data.
