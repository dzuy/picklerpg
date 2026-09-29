# Legal pages

Standalone public HTML lives in `public/privacy.html` and `public/tos.html`, with `public/legal.css`. The production server maps `/privacy` and `/tos` (including trailing slashes) to these files. They do not import the game, create guest accounts, or initialize analytics. Account creation links to both published URLs. Purchase availability, billing settings, and access restrictions are unchanged.

## Release preparation — September 29, 2026

Prepared in the isolated `codex/legal-pages` worktree from production branch commit `57886ba`. Owner-confirmed operator: Automatica Labs, LLC, Texas, United States; contact: dzuy@automaticalabs.com; minimum player age: 13. Both policies have an effective date of September 29, 2026. Publication verification is recorded below once complete.

Reviewed account/authentication, local and cloud saves, social/game records, voice processing, hosted coaching, notifications, analytics masking, and the documented V1 one-time cosmetic pack policy. Purchase provisions are conditional on offers actually being available; they do not activate a store. No automatic retention expiry, in-app deletion control, consent gate, or analytics opt-out is asserted. Publication alone does not implement those features or establish legal compliance. Counsel should review suitability for the operator and launch territories.

Drafting references: [California privacy policy guidance](https://oag.ca.gov/sites/all/files/agweb/pdfs/cybersecurity/making_your_privacy_practices_public.pdf), [FTC children's privacy guidance](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business). An age statement alone does not establish COPPA compliance for a child-directed service.

## Release checks

Run `node --import tsx --test tests/legal-pages.test.ts tests/production-server.test.ts` and `npm run build`. Review rendered documents, replace all placeholders, verify contact details, then publish only this isolated change to the Railway-linked main branch. Check public GET/HEAD responses, content, CSS, cross-links, and `/healthz` after Railway reports Active. Record the deployed commit and verification here. Keep later feature changes consistent with the disclosures and update effective dates when policy changes.
