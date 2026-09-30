# Legal pages

Standalone public HTML lives in `public/privacy.html` and `public/tos.html`, with `public/legal.css`. The production server maps `/privacy` and `/tos` (including trailing slashes) to these files. They do not import the game, create guest accounts, or initialize analytics. Account creation links to both published URLs. Purchase availability, billing settings, and access restrictions are unchanged.

## Release preparation — September 29, 2026

Prepared in the isolated `codex/legal-pages` worktree from production branch commit `57886ba`. Owner-confirmed operator: Automatica Labs, LLC, Texas, United States; contact: dzuy@automaticalabs.com; minimum player age: 13. Both policies have an effective date of September 29, 2026. Publication verification is recorded below once complete.

Reviewed account/authentication, local and cloud saves, social/game records, voice processing, hosted coaching, notifications, analytics masking, and the documented V1 one-time cosmetic pack policy. Purchase provisions are conditional on offers actually being available; they do not activate a store. No automatic retention expiry, in-app deletion control, consent gate, or analytics opt-out is asserted. Publication alone does not implement those features or establish legal compliance. Counsel should review suitability for the operator and launch territories.

Drafting references: [California privacy policy guidance](https://oag.ca.gov/sites/all/files/agweb/pdfs/cybersecurity/making_your_privacy_practices_public.pdf), [FTC children's privacy guidance](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business). An age statement alone does not establish COPPA compliance for a child-directed service.

## Release checks

Run `node --import tsx --test tests/legal-pages.test.ts tests/production-server.test.ts` and `npm run build`. Review rendered documents, replace all placeholders, verify contact details, then publish only this isolated change to the Railway-linked main branch. Check public GET/HEAD responses, content, CSS, cross-links, and `/healthz` after Railway reports Active. Record the deployed commit and verification here. Keep later feature changes consistent with the disclosures and update effective dates when policy changes.

## Publication attempt — September 29, 2026

Finalized code commit `87c83e6e3c3c48ea7cd8cd977e5929300bedb4dc` was pushed to GitHub `main`. Railway deployment `9aed4545-a3bd-41a6-a93f-7cab4134f3b3` remains **Queued** during Railway's [API/deployment incident](https://status.railway.com/incident/YYTG8I10). Do not describe the pages as live until public content is verified. The existing production `/healthz` still returns `{"status":"ok"}`. Both focused HTTP tests and the isolated production build passed; the current working checkout also passes the legal and production-server tests. The release excludes the other unreleased feature changes.

The policy files and scoped routing/account-link changes have also been copied into the original working checkout while preserving its in-progress work. Its unreleased marketing homepage now links to both policies. Before any later production release, incorporate the existing main-branch legal commit and preserve these routes and content.


## App Store privacy disclosure setup — September 29, 2026

Saved questionnaire for app 6815925616, based on account/social/game records, native push tokens, analytics configuration and RevenueCat purchase verification. No runtime data practices were changed. All categories are linked to identity; none used for Apple's advertising/data-broker tracking definition. Final publication awaits explicit acceptance of Apple's accuracy/compliance/update declaration.

| Data type | Saved purposes |
| --- | --- |
| Name; Email Address | App Functionality |
| Contacts | App Functionality (in-app friend/social graph; no address-book upload asserted) |
| Emails or Text Messages | App Functionality (in-game messages) |
| Gameplay Content; User ID | Analytics, Product Personalization, App Functionality |
| Customer Support | App Functionality |
| Device ID | Analytics, App Functionality (push/installation identifiers; no IDFA asserted) |
| Purchase History | Analytics, App Functionality |
| Product Interaction; Other Diagnostic Data | Analytics, App Functionality |

Masked menu replay and operational connection/error logs inform diagnostic disclosure. Raw voice recordings are not retained by the app's own systems; recognized gameplay commands are covered by gameplay data. This does not claim external speech processing is absent. No advertising/marketing, location, payment-card details, health, photo/video, browsing/search or dedicated crash/performance collection is declared. Reassess when implementations or SDK integrations change; questionnaire completion alone is not legal compliance certification.

References: [Apple definitions](https://developer.apple.com/app-store/app-privacy-details/) and [RevenueCat Apple privacy guidance](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy). Purchase History uses RevenueCat's documented Analytics and App Functionality purposes; account-mapped App User IDs are disclosed as linked User IDs. Evidence: `artifacts/billing/apple-privacy-publish-declaration.png`. Age/content/review-login results are recorded in TESTFLIGHT.md.


September 29, 2026 follow-up: owner published Apple privacy responses; verified Published status and all 11 configured types. Prior publication-pending snapshot is superseded. Evidence: artifacts/billing/apple-privacy-published.png. Submission readiness remains unverified; see TESTFLIGHT.md.


## Account-safety preparation — September 29, 2026

Privacy/Terms/Support source updated for in-app deletion requests (30-day manual processing), report/block controls and owned hosted-card cleanup. Changes are prepared locally, not published. Earlier email-only deletion wording is superseded only once this release is deployed; the policy must match the deployed functionality.
