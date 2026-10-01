# V1 permanent pack billing handoff

Current source status: all four V1 packs are content-ready, with no bundle-only items. See [the latest content decision](#content-completion-and-bundle-decision--2026-09-29). Production remains on the earlier deployment described below; sandbox acceptance results follow it.

## Production setup snapshot — 2026-09-29, 18:06 UTC

The store, production schema, 12 permanent tester gifts, owner grant controls, Stripe connection and RevenueCat connection are deployed. Purchases and database enforcement remain **off**. RevenueCat's provider test delivery and both providers' authentication smoke checks passed; no real purchase was made. See [final verification](#final-verification--2026-09-29-1806-utc) for deployment IDs, evidence and remaining launch requirements. Earlier dated setup entries are historical and may describe blockers that were subsequently resolved.

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

1. All four offers are content-ready. Integrate the approved Fun release, apply `202609290005_fun_themes.sql` before its server/client deployment, and verify hosted free-opponent visibility plus device rendering/audio. Everything includes the three V1 packs without exclusive items.
2. Create the four Apple non-consumables above with localized names/descriptions, US base prices and Apple local prices, non-EU availability, review screenshots and required review metadata. No subscription should be submitted.
3. Add all four Apple products in RevenueCat, one matching entitlement each. Set restore behavior to **Keep with original App User ID** for production and sandbox. The previous subscription-era setting was “Transfer if there are no active subscriptions” and is not appropriate for these permanent packs. Validate actual dashboard state before launch.
4. Keep the existing Apple bundle `com.picklebash.app` (Apple ID `6815925616`), RC project `7e323d60`, Apple app `app7c277a5c52`. Existing Apple credentials/notifications were configured previously; no private key is in the repository. Revalidate them. Old product `com.picklebash.app.plus.monthly` and entitlement `picklebash_premium` are deferred and ignored by the V1 code.
5. Create four Stripe products with **one-time USD prices**, no recurring interval. Set their price IDs above. Use account-bound Checkout created by the server; do not hand out a standalone Payment Link. Configure Stripe account taxes/market settings before live sales.
6. Configure server secrets `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; public SDK key `VITE_REVENUECAT_APPLE_KEY`; HTTPS `BILLING_RETURN_ORIGIN` (origin only), `BILLING_PRIVACY_URL`, `BILLING_TERMS_URL`; server-only `PREMIUM_ADMIN_IDS`.
7. Back up and apply migrations `202609290001`, `002`, `003` in order. The third supersedes the subscription access policy, migrates tester gifts, and disables old service-role subscription writes. Inspect cohort and pack grant audit before enabling restrictions. Enable `PACK_STORE_ENABLED=true` after schema rollout; leave purchases/enforcement disabled until validation.
8. Configure authenticated RevenueCat webhook `/api/multiplayer/billing/webhooks/revenuecat`. Stripe webhook `/api/multiplayer/billing/webhooks/stripe`: Checkout completed/async success/async failure, charge refunded, dispute created/updated/closed. Never expose secrets to the client. RC events cause fresh verified subscriber reads; Stripe events cause current payment reconciliation.
9. Sandbox test each pack, Everything, cancel, duplicate taps, partial ownership, restore/reinstall, account switching, wrong original account, web→iOS and iOS→web, refunds/disputes, concurrent/stale provider updates and grant independence. The test-isolation update uses `BILLING_ENVIRONMENT=production` (default) or `sandbox`; only transactions matching that environment are accepted. `REVENUECAT_ALLOW_SANDBOX` is obsolete in that update. Use the isolated environment described in [purchase testing](PURCHASE-TESTING.md).
10. After successful tests and content verification, enable payment switch `BILLING_PURCHASES_ENABLED=true` and separately set `premium_configuration.enforcement_enabled=true`. A server/client build with default-off settings does not launch purchases or restrictions.

## Implementation decisions

- StoreKit non-consumables through RevenueCat; direct exact-product lookup and Restore Purchases. SDK identity operations are serialized and bound to the saved account UUID.
- Shared `pack_ownership`, `pack_bundle_contents`, provider snapshot timestamps, admin audit, explicit court mapping. All writes are service-only RPCs; authenticated clients cannot self-grant.
- Stripe `mode: payment`, actual mapped line items and successfully paid, unrefunded charges required. Any partial refund removes that transaction's pack entitlement; another valid transaction or source can preserve access. Open disputes revoke until won/closed. Historical subscriptions do not grant packs.
- Complimentary tester Everything is permanent and distinct from separate analysis permission. The owner can grant/revoke any pack, including Everything, without affecting other sources.
- No new purchase analytics are emitted; dashboard event definitions are unchanged. Never equate a button click with payment.
- No upgrade credit/proration, annual plan, subscription management, currency wallet, ads, or future content promise.

## Current limits

No live payment has been made. Billing deployment, schema rollout, tester grants and notification authentication checks are complete. Remaining launch requirements include Fun/Everything Apple purchase coverage, Apple refund/revocation checks, hosted/device Fun checks, production deployment, Apple review, and tax/market configuration. Fun and Everything content is approved; bundle-only items are no longer planned. Stripe's signed smoke probe is not evidence of a real Stripe payment or provider-originated delivery. Earlier dated entries below are historical snapshots, not current production state.

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

### Final verification — 2026-09-29, 18:06 UTC

- Railway deployment `1b0cf4d5-2dcb-449f-97fe-aeaaa6ac5220` reached SUCCESS with commit `a2940613c35a39e13aaa9fa649af9d065dde782e` (the authenticated TEST-event correction). Production build passed; the 10 relevant billing tests passed after the correction, following the earlier 806-test release suite.
- RevenueCat's own dashboard test delivery returned **200**, body `{"ok":true}`. Evidence: `artifacts/billing/revenuecat-webhook-delivery-success.png`. A TEST response is delivery/authentication evidence, not purchase verification.
- Live smoke results: health 200; invalid RevenueCat authorization 401; valid RevenueCat synthetic UUID TEST 200; invalid Stripe signature 400; valid signed Stripe no-customer probe 200. No transactions or ownership changes were induced by these probes. Evidence: `artifacts/billing/production-webhook-smoke.json`.
- The signed-in owner’s live Profile → Store displayed all four packs as Owned and the complimentary grant form. Refresh packs completed successfully and preserved complimentary Everything. Evidence: `artifacts/billing/production-store-overview.png` and `production-store-owned.png`.
- Store is live for inspection; purchases and database enforcement remain disabled. Both provider connections and production secrets are installed. Remaining launch requirements: isolated Stripe sandbox payment/refund tests; real iPhone sandbox purchase/restore/account-switching tests; completed Fun/bundle-exclusive content; Apple review screenshots/submission; tax/market configuration. No live payment was made.

## Purchase sandbox verification — 2026-09-29

The isolated setup is deployed and verified; see [PURCHASE-TESTING.md](PURCHASE-TESTING.md) for exact resources, tests, remaining device steps, costs and cleanup. Supabase branch `drdvwfjkbyvfqnmxkksl` and Railway deployment `68d5e8bd-d510-4d33-ae18-9d52d581af10` use source `011367f`, explicit test billing, fresh test accounts, and separate webhook credentials. User-approved credentials are saved locally and in the test service only.

Stripe hosted fake-card purchases succeeded for Style ($2.99) and Everything ($6.99), both `livemode=false`. Provider callbacks granted the correct ownership; duplicate purchases were blocked; a Stripe test refund removed Style without affecting other accounts. Everything covers the three V1 packs. RevenueCat's sandbox TEST returned 200; Apple Style sandbox purchase was subsequently verified (see physical result below). Tests and native archive contain environment guards; no actual server secret values were found in the archive. Client/server analytics and replay are disabled here.

TestFlight **1.0 (8)** is processed and internal-only. Saved test instructions identify the separate backend/accounts. The user completed Apple's compliance Save. At 19:30 UTC, build 8 was assigned to the one-person PickleBash Internal group; Apple reports Installed 1.0 (8) on the owner’s iPhone 16 Pro. Apple Style purchase was subsequently verified; remaining physical checks are tracked in PURCHASE-TESTING.md. No external group was added. Production purchases and enforcement remain disabled and were not changed.

## Physical Apple purchase result — 2026-09-29, 19:42 UTC

The owner reported the requested test flow worked without errors and supplied IMG_8916.PNG, IMG_8917.PNG and IMG_8918.PNG. Screenshots confirm localized prices, Apple's TestFlight Style Pack sheet ($2.99 one-time, explicitly no charge), and Style becoming Owned while Court and Everything remain purchasable. RevenueCat independently reports `com.picklebash.app.pack.style`, store `app_store`, `is_sandbox=true`, purchased 19:39:59 UTC, no refund. Sandbox ownership has an active RevenueCat Style source for purchase_phone. A fresh authenticated web API session reports exactly Style owned, establishing shared server ownership. Evidence: `artifacts/billing/apple-sandbox-style-verification.json`.

The screenshots directly establish purchase completion; cancellation, relaunch/restore, cosmetic equipping, account switching and opponent visibility are not separately shown. User reports no errors across their test. The subsequent restore/account-isolation result is recorded below; continue with remaining cross-provider/device checks before live launch. No production configuration changed.

## Restore and account isolation — user-confirmed, 2026-09-29

On TestFlight 1.0 (8), the owner explicitly confirmed all three requested checks passed: switching to purchase_free and invoking Restore Purchases left Style unowned; switching back to purchase_phone and restoring kept Style Owned. Record device restore and cross-account isolation as passed based on the physical tester's report. No additional screenshots or provider calls were required for this confirmation.

Remaining device/gameplay checks: Stripe-bought Court appearing on iOS under the same account; owned court/cosmetics visible to a free opponent; Apple refund/revocation and fallback behavior. Fun/Everything Apple purchases still need coverage when their final content is ready. Production purchases/enforcement remain off.

## Cross-platform ownership and social visibility — 2026-09-29

The owner confirmed every step of the provided web/iPhone/free-opponent checklist passed: Court purchased through Stripe test Checkout under purchase_phone appeared on iPhone alongside Apple Style; the paid cosmetic could be equipped; purchase_free could join the paid court and see the cosmetic while remaining unable to host that paid court independently. This is physical tester evidence for device/gameplay behavior.

Independent read-only database verification at 19:57 UTC confirms purchase_phone has active Style from RevenueCat and Court from Stripe, while purchase_free has no active pack sources. Evidence: `artifacts/billing/cross-platform-packs-verification.json`. The main purchase/restore/account-isolation/cross-platform/social-visibility acceptance flow has passed. No production settings were changed.

Remaining before launch: Apple refund/revocation and fallback checks; final Fun and Everything exclusive content plus corresponding Apple purchase coverage; production build with the reviewed billing changes; Apple review screenshots/submission; tax/market configuration. Existing sandbox Stripe refund, duplicate prevention, bundle coverage, and complimentary-source independence checks already passed. Keep live billing/enforcement off until launch readiness is separately established.

## Content completion and bundle decision — 2026-09-29

The owner confirmed Fun Pack complete and removed bundle-only items. All four offers are now content-ready in source. Everything remains a permanent $6.99 purchase of Style, Court, and Fun (individual total $8.97), with no future paid packs included. This supersedes earlier entries requiring exclusive content. Existing product IDs, entitlements, prices, and ownership sources remain unchanged.

The purchase release now incorporates approved Fun commit `175620c` on top of `cbf1d73`, preserving sandbox isolation. Before the next hosted/device test, apply `202609290005_fun_themes.sql` to the isolated sandbox and deploy an updated server and TestFlight build. TestFlight 1.0 (8) does not contain this new content. Verify Fun and Everything Apple purchases, themed free-opponent visibility, native rendering/audio, and Apple refund/revocation fallback. Production deployment, provider metadata/review assets, Apple submission and tax/market checks remain separate release work. No deployment, provider configuration, production billing switch, or production enforcement change was made for this content decision.

Validation of the integrated purchase release: all 23 focused billing, environment-isolation, Fun model and database-ownership checks passed, as did the client/server production build. These are automated local results; the new hosted/device checks above remain pending.

## Completed packs sandbox deployment — 2026-09-29

Source `54bc2ba` deployed successfully to the existing isolated Railway service as deployment `470c5561-b63a-4bc5-9331-6aaba811fca6`. Migration `202609290005_fun_themes.sql` was applied transactionally to `drdvwfjkbyvfqnmxkksl` first. Before/after checks show the invitation theme column added, four ownership source rows preserved, and enforcement still true. Production was untouched.

All four existing sandbox accounts sign in successfully with unchanged ownership: purchase_phone owns Apple Style and Stripe Court; purchase_bundle owns Stripe Everything; purchase_free and purchase_web have none. All four offers are available with test billing enabled. The deployed browser store has the completed Fun description, the $6.99 three-pack bundle, and no exclusive/unfinished-content promises.

A real hosted API match between purchase_bundle and purchase_free verified: Everything can host Disco on Forest; a free account cannot host that theme; the free guest can accept and sees the host’s themed roster while keeping their own appearance. Match `d2e852f9-c22a-4077-80ee-f7a3407ec4bf` is a disposable sandbox fixture. The free account’s hosted browser view also visibly rendered the Disco decorations and host outfits (`artifacts/billing/fun-free-opponent.png`). This establishes hosted server/browser behavior, not physical iPhone rendering/audio.

TestFlight **1.0 (9)** archive and internal-only upload succeeded at 22:18 UTC. Archive verification confirms the test origin/database, public Apple SDK key, four theme audio assets, absence of production database references/server secrets, and removal of exclusive copy. Apple processing and internal-group readiness are recorded separately below. Evidence: `artifacts/billing/fun-sandbox-readiness.json`, `fun-sandbox-archive-verification.json`, `fun-hosted-smoke.json`, and the migration/store screenshots.

### Physical checklist for build 9

Use the existing private `.purchase-sandbox-logins.md` credentials. Wait for build 9 to be marked ready; build 8 does not contain Fun content. Keep purchase_free free.

1. Update to TestFlight 1.0 (9), sign in as purchase_phone, and confirm the purchase-testing notice. Existing Style and Court should still be Owned.
2. Buy Fun for the displayed localized $2.99-equivalent test price. The Apple sheet must state this is a test with no charge. Confirm Fun becomes Owned.
3. In player customization, try Disco Inferno, 80’s Night, Spooky and Fairy Tales; save a look. In game setup, select a Theme and optionally apply matching player looks. Check decorations, paddles, celebrations and music after enabling sound. Turn Theme to None and check the normal court returns.
4. Host against purchase_free on the test website. The free opponent should see the chosen theme and outfit and join successfully, while remaining unable to select a paid theme independently.
5. Use a designated account that does not already own all three individual packs to test Everything. Do not buy it on purchase_phone after Fun: the bundle adds no content. Everything and all three individual offers should show Owned after a valid bundle purchase; there are no additional exclusive items.
6. Close/reopen the app and Restore Purchases. Confirm the same ownership on the same account in the test website.

Apple refund/revocation and saved-choice fallback testing is a separate follow-up after these purchase/content checks. Do not enable live purchases based on this setup alone.

Apple processing and the platform-only compliance save are complete for build ID `89380daa-9835-4e49-8502-0dba8c0e5647`. What to Test is saved. At 22:26 UTC, build 9 was assigned to the existing one-person PickleBash Internal group. The prepared compliance dialog initially needed a manual Save; the subsequent page showed the requirement cleared before assignment. The build is ready for the owner to update in TestFlight. No external test group was added. At assignment time, physical results were pending; see the subsequent build 9 acceptance record below.

## Build 9 physical Fun acceptance — user-confirmed, 2026-09-29

The owner updated to TestFlight 1.0 (9), signed in as purchase_phone, and explicitly confirmed the Fun purchase completed and Fun showed Owned. After the content checklist, the owner reported purchasing worked as expected and confirmed a Spooky game with purchase_free also worked as expected. Record the Fun purchase/unlock and physical themed-match/free-opponent experience as passed based on the tester’s report. This is user acceptance evidence, not a new independent provider/receipt verification.

Court-selection thumbnails still show the original base locations in build 9; themes appear in the actual match. This is a known preview limitation, separate from payment or entitlement correctness. Theme-aware thumbnails were recommended but have not been implemented or authorized as a new task here.

Everything’s Apple purchase has not been explicitly confirmed: the most recent guided steps asked the owner to leave it unpurchased while testing Fun. Next, test the Everything Apple product on a designated account that does not already own all three packs, then relaunch/Restore Purchases and verify shared web ownership. Existing Stripe Everything coverage and build 8 restore/account-isolation results remain passed. Apple refund/revocation and saved-choice fallback checks remain outstanding. No production settings changed.

## Redundant Everything purchase correction — 2026-09-29

The owner identified that Everything must be disabled after buying all three individual packs. The previous instruction to buy Everything on purchase_phone was incorrect and is withdrawn. Store copy now shows “All packs owned” with a disabled button; native Apple preflight refreshes ownership and blocks before StoreKit purchase, and Stripe checkout rejects with HTTP 409 before creating/reusing a session. Bundle SKU ownership remains distinct, preserving independent refund/grant accounting. Partial ownership retains the existing fixed-price policy. These changes require a new native build; build 9 still has the old behavior. Test the bundle with an account that has not already acquired all three packs.

Validation: 19 focused billing/ownership checks and the client/server production build passed. Sandbox deployment `e8e9b2e6-e541-4d6f-8c12-71396ea6159d` succeeded from source `e931765`. A refreshed purchase_phone status independently confirmed exactly Style, Court and Fun; attempting Everything checkout returned 409 `already_owned` with no checkout URL. Existing bundle ownership is not synthesized. Evidence: `artifacts/billing/redundant-bundle-check.json`.

Native build 1.0 (10) compiled and signed successfully, and its archive passed test-origin/database, public SDK key, included theme assets, corrected bundle-copy and secret-exclusion checks. Internal-only upload succeeded at 22:44 UTC; Apple processing is complete for build ID `4c320373-e90b-4199-b2f8-b1f1ee398ebb`. Corrected What to Test is saved. The owner saved the unchanged platform-only compliance answer. At 22:50 UTC, build 10 was assigned to the existing one-person PickleBash Internal group. No external group was added. The owner subsequently confirmed on build 10 that Everything is disabled after owning all three individual packs. Record the physical disabled-offer check as passed by explicit user report. The latest message did not separately describe the restore step; earlier restore results remain documented above. Build 9’s What to Test was corrected and saved to withdraw the redundant purchase instruction. No production deployment or billing switch changed.


### Build 11 ready: existing-account Apple refund and bundle test

TestFlight 1.0 (11), source `eb460cd`, uploaded at 23:11:47 UTC on September 29, 2026. Apple finished processing build `49e0bcc5-3468-46c4-8567-cbf7b3f54c21`; its status is **Testing**, assigned to the existing one-person PickleBash Internal group, with the no-sign-out instructions saved. No additional manual compliance step is pending. The owner can update TestFlight, remain purchase_phone and use Profile → Store → Purchase test tools → Test refund · Fun Pack. Stop after refund/revocation and fallback checks for provider verification before purchasing Everything. This replaces the earlier separate Apple sandbox-account route; no phone Apple sign-out is needed.

22 focused tests, simulated UI checks, sandbox build, native archive and archive configuration/secret checks pass. The 23:10:59 UTC baseline confirms active Apple sandbox Style/Fun and Stripe Court, with no Everything. Apple refund and Everything device results remain **pending**, not passed. Production and the hosted sandbox server deployment are unchanged. Evidence: `artifacts/billing/apple-refund-release.json`, `apple-refund-before.json`, `apple-refund-archive-verification.json`, and `testflight11-ready.png`.


### Build 11 refund sheet connection failure — September 29, 2026

The owner tapped Test refund · Fun Pack. Apple's sheet presented but displayed “Cannot Connect - Retry”; Retry repeated the error. No reason could be selected and no successful request was reported. Independent RevenueCat/database/web reads at 23:21:55 UTC show Fun and Style still active as Apple sandbox purchases, neither marked refunded, with Stripe Court unchanged. Evidence: `artifacts/billing/apple-refund-connect-error.json`. Refund/revocation and the subsequent Apple Everything purchase remain **incomplete**; no ownership reset, guard bypass, production change or phone account sign-out was performed.

Code inspection confirms the Capacitor bridge forwards the exact product ID to RevenueCat, which obtains StoreKit's latest verified transaction and calls Transaction.beginRefundRequest(for:in:). The reported drawer is the Apple-provided sheet. A firsthand developer report describes the same symptom, but Apple's engineer requested diagnostics rather than identifying a definite cause: https://developer.apple.com/forums/thread/797488 . This is evidence of similar failures, not proof of a universal Apple outage or proof that this app's integration cannot be involved.

Next low-impact diagnostic: dismiss the sheet, change from Wi-Fi to cellular if available, reopen PickleBash and retry the Fun test refund once. Preserve all Apple sign-ins. If it repeats, stop this device refund attempt and retain the pending status; further diagnosis needs device logs or another test environment, not a blind entitlement edit or another unverified release. The no-sign-out approach was implemented and passed local checks, but has not completed the provider refund test.


### Refund testing deferred by owner — September 29, 2026

The cellular retry produced the same Apple refund-sheet connection error. The owner explicitly asked to leave this pending and move on. Stop requesting further refund retries or phone sign-in changes. Apple refund/revocation and saved-choice fallback remain pending, and Apple Everything purchase coverage remains pending because the chosen sequence depended on that refund. Earlier successful purchase, restore, duplicate-protection, Stripe refund and social-visibility results remain valid. Do not mark either pending test as passed or silently waive it. Continue App Review preparation and launch-readiness work with production payments unchanged.


### App Review preparation after refund deferral — September 29, 2026

All four App Store Connect non-consumables remain Prepare for Submission. No IAP review screenshot is attached to any of them. Saved and independently verified English Fun metadata describing the four finished themes; saved and independently verified Everything metadata removing bundle-only exclusives and documenting the all-three-owned purchase guard. Style and Court metadata were inspected and retained. Existing prices and territories were not changed. Stripe live Fun and Everything descriptions were also corrected and confirmed in the dashboard; their existing one-time prices remain $2.99 and $6.99. No payment or publication was performed.

A fresh filtered Railway variable read confirmed production PACK_STORE_ENABLED=true and BILLING_PURCHASES_ENABLED=false; BILLING_ENVIRONMENT is unset (production default). This check does not independently reverify the database enforcement setting. Production Fun migration and latest application release remain outstanding.

Before submission:

- Capture current, genuine iPhone review screenshots for all four purchases; older captures promise removed exclusives and should not be reused as current evidence.
- Prepare an App Store submission archive. Recent sandbox archives were uploaded with internal-only distribution and cannot serve as the submission build.
- Resolve review purchase validation: Apple reviews IAP using sandbox transactions, while server/multiplayer/premium.ts currently accepts only transactions whose is_sandbox matches the global billing environment. A production release therefore needs a tested, explicitly scoped review-account/environment design before submission. Do not globally accept sandbox receipts for ordinary production accounts or simply point the public app at the test service. Account purchase readiness, provider refresh and webhook routing must agree. No exception has been implemented or deployed.
- Apple refund/revocation/fallback and direct Apple Everything purchase remain pending by owner request. Earlier successful results remain recorded separately.

Apple guidance: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/ ; RevenueCat review troubleshooting: https://www.revenuecat.com/docs/test-and-launch/app-store-rejections .

Evidence screenshots: artifacts/billing/apple-everything-metadata-updated.png, apple-fun-metadata-updated.png, stripe-everything-metadata-updated.png, stripe-fun-metadata-updated.png.


### App Store review preparation — September 29, 2026

Implemented a server-owned exact UUID allowlist for dedicated non-paying Apple review accounts. This permits verified Apple sandbox receipts through the normal purchase/restore flow while ordinary production purchases remain disabled. Web checkout is disabled for those accounts even if the global payment switch is later enabled. RevenueCat webhook routing filters each identity against its configured environment, including transfer identities; event claims never grant packs. Production notification connection now sends both environments to the existing authenticated endpoint; the isolated sandbox connection remains unchanged.

Created `picklebash_review` without owned packs, complimentary grants or administrator permissions. Its password and account UUID are saved only in ignored owner-only `.app-review.local.json` / `.app-review-logins.md`, not in this reference. Keep this identity permanently separate from paying users. Review credentials still require explicit approval before transmission to Apple through the browser.

Production Fun migration `202609290005_fun_themes.sql` applied transactionally. Verified `async_invitations.court_theme` exists, all 12 existing ownership records remain, and enforcement remains false. The global production purchase switch remains false. These switches require an explicit release decision before public launch; the prepared review build uses the same completed game and production backend.

Validation: 25 focused billing/review/isolation tests and 10 theme/pack/database checks passed. Client/server build and signed iOS 1.0 (12) archive compiled. Submission upload, processing, screenshots, deployed review account checks and App Store draft completion are tracked in the subsequent release evidence; archive compilation alone is not proof of submission readiness. Apple refund/revocation/fallback and direct Apple Everything physical purchase remain deferred, not passed.


### App Review preparation progress — September 29, 2026 (local)

Build 1.0 (12), source `0f68970`, uploaded successfully as an App Store eligible build; no internal-only export option was used. Archive verification confirms production API/database and public Apple SDK configuration, included theme audio, corrected bundle copy, and absence of actual server secrets. Evidence: `artifacts/billing/app-store-12-archive-verification.json`. Apple processing/compliance and attachment to the app draft are not yet verified.

Production deployment `4f85d725-1b56-4362-baaf-35fe71d0bd5c` succeeded. The Fun court-theme migration is applied, the 12 existing complimentary Everything grants remain intact, and global purchases and database access enforcement remain disabled. The dedicated review account has zero owned packs and no admin access; hosted checks show Apple ready, web checkout disabled, and scoped sandbox verification active. RevenueCat's existing production notification connection now accepts both environments; server identity filtering excludes sandbox events for ordinary production accounts. Evidence: `artifacts/billing/app-review-production-check.json`.

App draft description, keywords, support URL, business contact, review notes, and manual-release selection were saved. Reviewer credentials are not yet saved with Apple; specific permission has been requested. Fresh native simulator Home and Store captures are 1284 × 2778 and saved in `artifacts/billing/app-review-home.png` and `app-review-store-v1.png`. Screenshot uploads remain pending. Apple's browser session expired before the remaining upload/build steps; the owner must sign back into App Store Connect. The draft has not been submitted or released. Apple device refund/revocation/fallback and direct Everything purchase remain explicitly pending.


### Signed-in Apple draft follow-up — September 29, 2026

Apple processing is Complete for App Store eligible build 12, ID `b730aa21-80a1-4b5e-8138-6044b325beba`. Platform-only encryption compliance was saved; TestFlight reports Ready to Submit. Build 12 is attached and saved on the version 1.0 distribution draft. No TestFlight group was added and no submission/release occurred.

Three genuine 1284 × 2778 native simulator captures (Home, player creator and roster) are uploaded to the iPhone 6.5-inch listing. The current native Store screenshot is uploaded to Review Information for each of Style, Court, Fun and Everything; each upload visibly completed with a SOURCE image and was saved automatically. This screenshot is review-only, not a public listing screenshot, and contains the dedicated review account's sandbox notice. These are current UI evidence, not additional device purchase or refund test results.

App Privacy's published policy URL is now `https://picklebash.app/privacy`. App classification is Games with Sports and Strategy subcategories. Audit found the App Privacy data-collection questionnaire, age-rating questionnaire, and content-rights declaration have not been completed. The review login fields remain blank pending specific permission to transmit the dedicated account credentials to Apple. The draft is therefore not ready to submit. General purchases and database enforcement remain disabled; refund/revocation/fallback and direct Apple Everything purchase remain deferred.

Evidence: `artifacts/billing/app-review-build12-saved.png`, `apple-app-screenshots-saved.png`, `apple-fun-review-screenshot-saved.png`, `apple-privacy-url-saved.png`, and `apple-game-categories-saved.png`.


### App Review declarations — September 29, 2026

Owner authorized completing the review login, privacy questionnaire, age rating and content-rights declaration. Dedicated review credentials were entered into Apple's draft and saved. Reload verified sign-in required and both credential fields populated, with Save disabled; the browser redacts their values, so a direct value comparison is not valid evidence. No credentials are included in committed evidence. Build 12 remains attached, and no app submission/release occurred.

Content rights saved as Yes, necessary rights to third-party content. The original Fun art/music, licensed dependencies/fonts and user-created shared content informed the declaration. Age rating saved without override: 13+ for 172 countries/regions, with Vietnam/Korea 12+ and Brazil A12. Earlier-than-26 operating systems show global 12+ with regional exceptions. UGC/chat and frequent competitive contests are declared; infrequent profanity/crude humor and horror/fear reflect filtered messages and the optional Spooky theme. No ads, gambling, loot boxes, violence or age-assurance mechanism is declared. Apple's calculation warns Afghanistan/Morocco unavailable; regional permits and distribution eligibility still require final launch review.

All 11 privacy categories and their purposes/identity/tracking answers are saved. Final Publish is pending owner confirmation because Apple's dialog includes an agreement that responses are accurate, compliant and promptly updated when practices change. This is not yet a published completed privacy label. General live payments and database enforcement were not changed. Deferred Apple device refund/revocation/fallback and direct Everything purchase remain pending.

Evidence: `artifacts/billing/apple-age-rating-saved.png`, `apple-review-login-verification.json`, `apple-review-draft-saved.png`, and `apple-privacy-publish-declaration.png`.


September 29, 2026 follow-up: owner published Apple privacy responses; verified Published status and all 11 configured types. Prior publication-pending snapshot is superseded. Evidence: artifacts/billing/apple-privacy-published.png. Submission readiness remains unverified; see TESTFLIGHT.md.


### Required future markets — September 29, 2026

China mainland and Vietnam are required future markets, per owner direction. Any initial exclusions are temporary. Revisit local game approvals/licensing and purchase eligibility, then align app and pack availability and test purchases/restoration before enabling either market. The actionable checklist is in [TESTFLIGHT.md](TESTFLIGHT.md#required-future-markets-china-mainland-and-vietnam). No expansion date or new distribution change is authorized by this note.

### Fresh web launch audit — September 29, 2026 (Costa Rica)

Read-only live Stripe checks confirmed the configured restricted live key authenticates and all four current products/prices are active, one-time USD 299/299/299/699 cents. Privacy, Terms and the return origin respond HTTP 200. Stripe account status visibly reports Payments and Payouts active, with no active tasks. The restricted key intentionally cannot read account status/webhook configuration; those were verified in the signed-in dashboard without expanding permissions.

Live destination `we_1UL50WCgYYn1Kru6hniaRElh` is Active at `https://picklebash.app/api/multiplayer/billing/webhooks/stripe`, subscribing to the seven required checkout/refund/dispute events. It reports zero provider-originated deliveries this week. A signed no-customer smoke probe returned 200; an invalid signature returned 400. This verifies endpoint/signing configuration, not a real payment or provider delivery. Prior isolated Stripe payment/refund and Everything tests remain documented in PURCHASE-TESTING.md. All 13 current premium/Stripe regression tests passed.

Production still runs deployment `4f85d725-1b56-4362-baaf-35fe71d0bd5c`, with `PACK_STORE_ENABLED=true` and `BILLING_PURCHASES_ENABLED=false`. Local settings have both false. A read-only service readiness check with a temporary in-memory purchase switch returned `webReady=true` and all four available packs; no persisted settings or ownership were changed. Database enforcement is false. The owner retains Everything ownership. Local Store/navigation presentation changes require deployment separately.

Stripe Tax displays its initial Get started screen, and current Checkout creation does not request automatic tax or apply a sales-country policy. The owner must specify intended web sales countries and tax handling before configuring those business choices; the absence of Stripe Tax does not by itself establish a legal collection requirement. No tax subscription, registration, payment, refund, live purchase switch or access enforcement change was made. After sales setup is resolved, enable the relevant purchase settings, verify Checkout for a non-owning account, and have the owner complete a controlled real purchase before independently confirming provider delivery and pack access. Apple product approval and deferred Apple refund/Everything coverage remain separate pending work.

Evidence: `artifacts/billing/live-readiness-audit.json`, `artifacts/billing/live-server-readiness.json`.

### Web tax preparation — September 29, 2026 (Costa Rica)

Owner authorized preparing tax setup and selected the iOS app's configured countries as the intended web sales scope. A fresh App Store Connect read confirms 144 configured available territories and 31 unavailable: the 27 EU member states, Afghanistan, China mainland, Morocco and Vietnam. The app remains Prepare for Submission, so configured availability is not evidence of a public release. No Apple territory settings were changed. Web country restrictions are not yet implemented; the scope must be enforced before enabling broad web sales.

Opened Stripe Tax's Get started flow. Its setup screen shows the existing business address and general electronically supplied services default as prefilled/completed; registrations and automatic collection are Not Started. No registration was fabricated, tax filing subscribed to, or tax collection enabled. Confirm Automatica Labs, LLC's actual operating/head-office location and existing permits with the owner before recording registrations. A Texas account address alone is insufficient to determine nexus or legal tax classification. Stripe Tax Basic's published Checkout pricing is 0.5% per transaction in registered collection locations, with no recurring fee; registration/filing services are separate. Final paid agreement/registration steps remain pending as needed.

Local server code now supports `STRIPE_AUTOMATIC_TAX_ENABLED=true`: new Checkout sessions request automatic tax, require a billing address, and save the current address to the existing Stripe customer for tax calculation. Reuse requires matching tax mode and the billing-address policy version; idempotency keys distinguish modes. This operational setting defaults false and has not been enabled locally or on Railway. It does not register the business, determine collection obligations, or turn on purchases. Existing provider verification and pack ownership are unchanged. Fifteen premium/Stripe tests and server TypeScript checks passed, including stale untaxed-session rejection and configured-session reuse.

Sources: https://docs.stripe.com/tax/set-up ; https://docs.stripe.com/tax/checkout/page ; https://stripe.com/tax/pricing ; https://comptroller.texas.gov/taxes/sales/faq/permit.php . Tax setup needs confirmed business facts, applicable registrations, verified product categories/tax behavior, country scope enforcement, isolated tax Checkout verification, and deployment before enabling live purchases.

### Owner business-location clarification — September 29, 2026 (Costa Rica)

Owner confirmed PickleBash payments go through their single-owner Automatica Labs business, its operating location is Costa Rica, and it has no sales-tax permit. This supersedes the earlier unresolved Texas operating-location question. Do not infer a Texas head office or create a Texas registration from the existing Stripe account address. Payment processing through the LLC is distinct from the owner's personal identity; legal seller/establishment must be confirmed before changing Stripe's tax head-office or business-entity fields.

Fresh Stripe documentation lists Costa Rica as supported for customer-location digital VAT calculations but not as a supported business location for Stripe Tax. The current US account's eligibility through its US legal entity versus actual Costa Rica operations requires confirmation with Stripe and qualified tax advice; no misleading US address should be recorded to bypass geographic eligibility. No business address, registration, collection setting or purchase switch was changed. Direct web sales into the full 144 configured iOS territories still require applicable registration/collection/filing coverage. For example, HMRC states overseas businesses have no UK registration threshold for taxable service supplies; ordinary Stripe processing is not a merchant-of-record service. Stripe Managed Payments is a possible alternative for eligible digital products, but likewise requires business-location/account eligibility review and has a smaller supported geography, so it must not be presented as covering all 144 territories or enabled without review.

Sources checked: https://docs.stripe.com/tax/supported-countries ; https://docs.stripe.com/payments/managed-payments/eligibility ; https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers ; https://www.gov.uk/guidance/vat-place-of-supply-of-services-notice-741a . Local automatic-tax code remains prepared, disabled and undeployed while seller/location eligibility and tax obligations are resolved.

### US LLC confirmation — September 30, 2026 (Costa Rica)

Owner confirmed Automatica is a US-based LLC. Preserve this alongside the previous owner statement that operations are in Costa Rica and no sales-tax permit exists. US incorporation/payment-account country is not proof of a US operating head office or Texas tax registration. Stripe Tax documentation defines head office as the business location and lists US business locations as supported, Costa Rica as unsupported. Eligibility for this US LLC with Costa Rica operations still needs Stripe confirmation before changing tax head-office settings or enabling tax collection. The role of the existing Texas address remains unconfirmed. No live billing, address, registration, or entitlement changes were made by this clarification.

### Texas operations clarification — September 30, 2026 (Costa Rica)

Owner clarified that the existing Texas address is mailing-only and Automatica operated from both Texas and Costa Rica, mostly Texas. This supersedes the earlier description of exclusively Costa Rica operations and resolves the mailing address's role. The wording does not establish whether Texas operations are current or historical, or identify the actual operating address. Do not use the mailing address as a verified physical head office. Confirm current operations and the actual business location before completing Stripe Tax or a permit application.

Texas Comptroller guidance treats operating locations and business activity in Texas as relevant to being engaged in business; this is distinct from merely having a Texas mailing address. Predominant operations alone do not resolve pack taxability or registrations in every intended customer jurisdiction. No head-office setting, registration, live collection, or purchase switch changed. Sources: https://docs.stripe.com/tax/set-up ; https://comptroller.texas.gov/taxes/publications/94-108.php .

### Address and permit route verification — September 30, 2026 (Costa Rica)

Owner supplied a Houston address in response to the operating-address question. It exactly matches the existing Stripe Tax head-office address, so no address entry or modification was necessary. The full street address is intentionally omitted here. Preserve the previous mailing-only clarification; the supplied address does not independently establish how that property is used.

Inspected Stripe's Texas registration flow. It offers paid partner registration, direct registration with Texas, or recording an existing permit. Viewed the direct-registration instructions without buying a service or asserting an existing registration. The official Texas permit page estimates 2–3 weeks and lists required identity/business documentation. Its Apply for Permit via eSystems link redirected to `https://cpamessage.com/maintenance/`, displaying “THIS PAGE IS TEMPORARILY UNAVAILABLE.” No application was started or submitted. Stripe registrations and live tax/purchase switches remain unchanged. Registration can resume when the official application is available; product taxability and international sales scope remain separate launch requirements.

Sources: https://comptroller.texas.gov/taxes/permit/ ; https://docs.stripe.com/tax/supported-countries/united-states/collect-tax?tax-jurisdiction-united-states=texas .

### Web purchase scope undecided — September 30, 2026 (Costa Rica)

Owner is considering a lightweight free web version directing players to the iOS app, but explicitly has not decided. Preserve the Stripe integration and current web scope; keep live web purchases disabled. Stripe Tax preparation is separate from iOS release preparation and may be deferred while web checkout remains disabled. Do not treat the possible free-web direction as authorization to remove checkout or change product availability. Before enabling direct web purchases, resolve pack taxability and applicable registration/collection obligations; inspecting the Texas permit route did not establish a definitive legal requirement for these specific packs.


## Review-account receipt conflict — October 1, 2026

The owner tested Everything in production-configured TestFlight 16 while signed in as `picklebash_review`. Apple completed a sandbox Everything transaction at 23:24:02 UTC, but RevenueCat attached it to the earlier `purchase_phone` identity, whose Apple receipt already contains Style and Fun. Review-account restore returned receipt-already-in-use; its RevenueCat record and production ownership remain empty. The confirmed Keep with original App User ID policy applies to new purchases as well as restore. This is not an entitlement transfer or missing Everything product mapping. The earlier instruction to test on the same Apple receipt with a different game account was incorrect. Do not purchase again or change the restore policy.

A signed-in refresh against the isolated purchase sandbox returned HTTP 200 with Everything, Fun, Style and independently purchased Stripe Court. Evidence: [original-account verification](../artifacts/billing/apple-everything-original-account-verification.json). This verifies the Apple Everything transaction and server ownership on the original account, but does not establish physical relaunch/restore on the review account. Prior Apple refund-sheet connectivity and refund/revocation/fallback checks remain incomplete. No grant, manual provider transfer or production ownership change was performed.

The client now synchronizes the existing receipt before opening the purchase sheet and rechecks server ownership. Receipt conflicts stop checkout and explain which game account to use. Store purchase errors scroll into view, and success text requires verified server access. Focused regression checks cover conflict-before-charge, newly restored duplicate ownership, and an Apple completion without a verified unlock. A fresh Apple sandbox receipt or a separate testing device is required to exercise the dedicated review account; the existing phone receipt cannot be transferred merely for testing.
