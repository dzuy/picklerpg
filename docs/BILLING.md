# V1 permanent pack billing handoff

## Product mapping

Create **non-consumable** products in App Store Connect, linked individually to RevenueCat entitlements. Do not attach them to the old universal Premium entitlement. The SDK fetches exact products directly; it does not use the old monthly default offering.

| Pack | Apple product ID | RevenueCat entitlement | Stripe env | USD |
|---|---|---|---|---:|
| Style | `com.picklebash.app.pack.style` | `pack_style` | `STRIPE_STYLE_PRICE_ID` | 2.99 |
| Court | `com.picklebash.app.pack.court` | `pack_court` | `STRIPE_COURT_PRICE_ID` | 2.99 |
| Fun | `com.picklebash.app.pack.fun` | `pack_fun` | `STRIPE_FUN_PRICE_ID` | 2.99 |
| Everything | `com.picklebash.app.pack.everything` | `pack_everything` | `STRIPE_EVERYTHING_PRICE_ID` | 6.99 |

Everything expands to the three V1 packs in our shared backend, not every future entitlement. Keep stable product/price IDs; replacing Stripe prices requires a historical price mapping before retiring the old ID, otherwise reconciliation will stop recognizing old purchases.

## Setup and launch order

1. Finish Fun content and bundle exclusives; wire each asset to its required pack, verify free choices and opponent visibility, then mark those offers ready in `src/pack-catalog.ts`. All four offers exist now; incomplete offers cannot be purchased.
2. Create the four Apple non-consumables above with localized names/descriptions, US base prices and Apple local prices, non-EU availability, review screenshots and required review metadata. No subscription should be submitted.
3. Add all four Apple products in RevenueCat, one matching entitlement each. Set restore behavior to **Keep with original App User ID** for production and sandbox. The previous subscription-era setting was “Transfer if there are no active subscriptions” and is not appropriate for these permanent packs. Validate actual dashboard state before launch.
4. Keep the existing Apple bundle `com.picklebash.app` (Apple ID `6815925616`), RC project `7e323d60`, Apple app `app7c277a5c52`. Existing Apple credentials/notifications were configured previously; no private key is in the repository. Revalidate them. Old product `com.picklebash.app.plus.monthly` and entitlement `picklebash_premium` are deferred and ignored by the V1 code.
5. Create four Stripe products with **one-time USD prices**, no recurring interval. Set their price IDs above. Use account-bound Checkout created by the server; do not hand out a standalone Payment Link. Configure Stripe account taxes/market settings before live sales.
6. Configure server secrets `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; public SDK key `VITE_REVENUECAT_APPLE_KEY`; HTTPS `BILLING_RETURN_ORIGIN` (origin only), `BILLING_PRIVACY_URL`, `BILLING_TERMS_URL`; server-only `PREMIUM_ADMIN_IDS`.
7. Back up and apply migrations `202609290001`, `002`, `003` in order. The third supersedes the subscription access policy, migrates tester gifts, and disables old service-role subscription writes. Inspect cohort and pack grant audit before enabling restrictions. Enable `PACK_STORE_ENABLED=true` after schema rollout; leave purchases/enforcement disabled until validation.
8. Configure authenticated RevenueCat webhook `/api/multiplayer/billing/webhooks/revenuecat`. Stripe webhook `/api/multiplayer/billing/webhooks/stripe`: Checkout completed/async success/async failure, charge refunded, dispute created/updated/closed. Never expose secrets to the client. RC events cause fresh verified subscriber reads; Stripe events cause current payment reconciliation.
9. Sandbox test each pack, Everything, cancel, duplicate taps, partial ownership, restore/reinstall, account switching, wrong original account, web→iOS and iOS→web, refunds/disputes, concurrent/stale provider updates and grant independence. Sandbox receipts are rejected in production by default (`REVENUECAT_ALLOW_SANDBOX=false`). Use isolated staging for sandbox.
10. After successful tests and content verification, enable payment switch `BILLING_PURCHASES_ENABLED=true` and separately set `premium_configuration.enforcement_enabled=true`. A server/client build with default-off settings does not launch purchases or restrictions.

## Implementation decisions

- StoreKit non-consumables through RevenueCat; direct exact-product lookup and Restore Purchases. SDK identity operations are serialized and bound to the saved account UUID.
- Shared `pack_ownership`, `pack_bundle_contents`, provider snapshot timestamps, admin audit, explicit court mapping. All writes are service-only RPCs; authenticated clients cannot self-grant.
- Stripe `mode: payment`, actual mapped line items and successfully paid, unrefunded charges required. Any partial refund removes that transaction's pack entitlement; another valid transaction or source can preserve access. Open disputes revoke until won/closed. Historical subscriptions do not grant packs.
- Complimentary tester Everything is permanent and distinct from separate analysis permission. The owner can grant/revoke any pack, including Everything, without affecting other sources.
- No new purchase analytics are emitted; dashboard event definitions are unchanged. Never equate a button click with payment.
- No upgrade credit/proration, annual plan, subscription management, currency wallet, ads, or future content promise.

## Current limits

No live payment has been made. Production schema and tester grants are now installed (see latest rollout entry below); billing deployment, provider delivery tests, Apple review and real-device sandbox testing remain required. Provider setup must match this new mapping; old monthly setup is insufficient. New content is intentionally not fabricated by this billing task. Earlier dated entries below are historical snapshots, not current production state.

## Dashboard verification — 2026-09-29, 16:08 UTC

RevenueCat now has all four Apple **non-consumable** records and each is attached only to its matching new entitlement:

| Pack | RevenueCat product | Entitlement record |
|---|---|---|
| Style | `prod7c4702658a` | `entl177e00d54f` |
| Court | `prod0fba7044cd` | `entl81d8a62bef` |
| Fun | `prod7a563fd902` | `entl5e64e612e7` |
| Everything | `prod056a118e7a` | `entl21aaf138fd` |

Restore policy saved as **Keep with original App User ID**; sandbox override is off so it uses the same behavior. Old monthly offering remains deferred and unused by the new exact-product SDK flow.

### Apple and Stripe follow-up — 2026-09-29

All four Apple non-consumable records now exist, with independently verified saved English (U.S.) names/descriptions and review notes. USD base prices are 2.99/2.99/2.99/6.99. Each has 148/175 territories selected (all 27 EU countries excluded, automatic future territories off). No product has been submitted for review; screenshots and a new app version are still required. Family Sharing remains off. Catalog evidence: `artifacts/billing/apple-permanent-products.png` and `artifacts/billing/stripe-permanent-products.png`.

| Pack | Apple record ID | Stripe live product | Stripe live one-time price |
|---|---|---|---|
| Style | `6817427488` | `prod_VLlLRQSIp68x6m` | `price_1UL3oaCgYYn1Kru6hMAevFXU` |
| Court | `6817429178` | `prod_VLlMgKUTQKvuV5` | `price_1UL3ptCgYYn1Kru6tJp7YB7H` |
| Fun | `6817432439` | `prod_VLlMkfSKNq2Ee2` | `price_1UL3qFCgYYn1Kru6ZjAjmFyx` |
| Everything | `6817433589` | `prod_VLlN5rUPcnZsxp` | `price_1UL3qHCgYYn1Kru6yyqu6UHP` |

Stripe account: Automatica Labs, LLC (`acct_1T6JFCCgYYn1Kru6`), live catalog. Prices verified as one-off USD 2.99/2.99/2.99/6.99. No public Payment Links or transactions were created. These IDs are staged in ignored `.env.local`, not deployed. `PACK_STORE_ENABLED` and `BILLING_PURCHASES_ENABLED` remain false.

User-provided planned legal pages: `https://picklebash.app/privacy` and `https://picklebash.app/tos`; return origin `https://picklebash.app`. URLs are locally configured, but the pages are not yet published and remain a launch requirement. Configuration alone is not evidence of published legal pages.

User approved creating the Stripe restricted key and completed email/authenticator verification. The live restricted key “PickleBash server — one-time packs” was created; saved permissions were independently verified. The user subsequently rotated the uncaptured key and saved the full replacement restricted live key in ignored `.env.local`. Read-only Stripe API verification succeeded for all four configured prices: active live one-time USD 299/299/299/699 cents. The secret was not displayed or written to documentation. Requested scopes: Customers and Checkout Sessions Write; Prices, Products, Payment Intents, Charges and Refunds, Payment Disputes Read. All other scopes None. `STRIPE_SECRET_KEY` and `REVENUECAT_SECRET_KEY` are now configured locally only; webhook credentials remain outstanding. Both local store/purchase switches remain false. This verifies authentication and price-read access, not checkout creation or end-to-end payment handling. RevenueCat/Stripe webhook setup, production migration/deployment, device sandbox checks, tax/market configuration and final content remain outstanding.

## Local validation

The full 814-test suite passed after the pack conversion. Subsequent added checks also passed: 20 targeted billing/analysis tests and 5 database tests (including fixed bundle scope and source independence). TypeScript client/server checks, production build, Capacitor iOS synchronization and desktop/390px store preview passed. Restore was exercised with injected preview services; that is UI validation, not a real StoreKit transaction. Provider/device sandbox purchases remain untested.

## Server setup follow-up — 2026-09-29

- With explicit user approval, generated the RevenueCat V1 secret key `PickleBash server — purchase verification` and saved it as `REVENUECAT_SECRET_KEY` in ignored `.env.local` with owner-only permissions. Verified exactly one definition and expected key format without displaying the secret. The dashboard key is hidden again. Evidence: `artifacts/billing/revenuecat-server-key-created.png`. This is local configuration only; API authentication and actual purchase verification remain untested.
- Read-only production Supabase GET checks returned PGRST205 for `pack_catalog` and `premium_configuration`; billing schema rollout remains outstanding. HEAD checks returned misleading empty results and are not evidence of table presence.
- Railway is accessible. Production service `33989bdf-b765-490a-bf45-a7be1a7f252b`, project `a973140b-6db3-42da-bc92-6ddca5fc6342`, environment `8721453d-eb1a-45fc-909e-0f7426fcfaef`. Existing legal-page deployment `9aed4545-a3bd-41a6-a93f-7cab4134f3b3` was queued, and Railway displayed an API-degradation incident. No deployment or variables changed by this follow-up.
- Re-ran 14 billing tests successfully. The shared embedded database helper needed the Supabase-provided `storage.buckets` table fixture after the new player-card migration was added. This fixture change affects local tests only. Failed-run child processes were stopped. No real purchase, webhook delivery, or device restore has yet been verified.

## Production rollout progress — 2026-09-29

- Verified Supabase scheduled physical backup at 10:09:46 UTC and saved the pre-migration signup function in local `artifacts/billing/signup-function-before-packs.sql`. This was an existing provider backup, not a newly created full export.
- Applied migrations 001/002/003 in one transaction. Verified four catalog packs, 12 eligible human testers, 12 active permanent Everything gifts, 12 grant audit records, enforcement false and no authenticated self-grant privilege. Evidence: local `artifacts/billing/production-pack-migration.png`.
- Saved and read-back verified the Stripe/RevenueCat keys, public Apple SDK key, four prices, return/privacy/terms URLs, `PACK_STORE_ENABLED=true`, `BILLING_PURCHASES_ENABLED=false` and `REVENUECAT_ALLOW_SANDBOX=false` in Railway without triggering deployment. Configured the confirmed owner account as the sole complimentary pack admin, independently of analytics permissions.
- Prepared an isolated billing release based on legal-page commit `87c83e6`. Full suite: **806/806 passed**; 25 targeted billing/analysis/database tests passed; production build passed. The different full-suite count reflects the isolated release excluding unrelated unfinished work.
- Railway legal-page deployment `9aed4545-a3bd-41a6-a93f-7cab4134f3b3` subsequently reached SUCCESS. Billing release and live legal-page smoke checks remain to be recorded.
- Both provider connections were created with explicit approval: RevenueCat `whintgrfd9dfe158f` (production, Apple app only) and Stripe `we_1UL50WCgYYn1Kru6hniaRElh` (seven configured checkout/refund/dispute events, own account, API version `2026-02-25.clover`). Authentication secrets are saved in ignored local configuration and Railway and verified to match. The existing unrelated Stripe destination is unchanged.
- RevenueCat V1 authentication succeeded against the owner UUID (201 with valid subscriber/timestamp). Production health and both valid/invalid webhook authentication probes passed once the new server began receiving traffic. Stripe probes were signed synthetic events without a customer, not real provider deliveries or payments.
- Live RevenueCat dashboard TEST initially returned 503 because its synthetic UUIDs are not application accounts. The handler now acknowledges authenticated TEST events without refreshing ownership; a regression test also verifies that unauthenticated TEST remains rejected. Ten targeted billing tests passed after this correction. A successful provider retry is still required after deploying the correction.
- Base billing release `9c0af3f` was pushed to main; the completed configuration deployment is `1320c96b-3308-4c9f-b5f7-77ecd8d9e1b3`. Both legal pages were verified HTTP 200 with correct titles. Purchases, enforcement, Fun/Everything readiness and production sandbox acceptance remain off.
- Saved automation test-account passwords returned invalid credentials; no passwords were reset. Live multi-account API checks remain outstanding. Database-backed checks confirmed the owner has Everything and grant administration; automation accounts have no packs or admin privileges.
