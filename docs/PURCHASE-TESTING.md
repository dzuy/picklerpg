# Isolated purchase testing

2026-09-29: isolated web purchase/refund and bundle tests passed. TestFlight 1.0 (8) uploaded and processing completed. **Main purchase acceptance flow passed, including physical restore, account isolation, cross-platform access and social visibility.** At 19:30 UTC, compliance was saved, build 8 was assigned to the one-person PickleBash Internal group, and Apple reported it installed on the owner’s iPhone 16 Pro (iOS 26.4.2). Production purchases/enforcement remain off.

## Environment inventory

| Component | Test configuration |
|---|---|
| Supabase | `purchase-sandbox`, `drdvwfjkbyvfqnmxkksl`; schema-only branch |
| Database URL | `https://drdvwfjkbyvfqnmxkksl.supabase.co` |
| Railway project | `a973140b-6db3-42da-bc92-6ddca5fc6342` |
| Railway environment | `purchase-sandbox`, `a605715d-00e4-47eb-b035-c5d12d279487` |
| Railway service | `purchase-sandbox`, `0f856c06-00dc-41a7-ad53-0c848a90b626` |
| Active origin | `https://purchase-sandbox-purchase-sandbox.up.railway.app` |
| Stripe | Account `acct_1T6JFCCgYYn1Kru6`, test mode; restricted key saved locally and in Railway |
| RevenueCat | Project `7e323d60`, Apple app `app7c277a5c52`; sandbox-only webhook `whintgr1306eee317`, provider TEST returned 200 |
| Apple | Existing bundle/products; internal-only 1.0 (8), assigned to PickleBash Internal; owner installation reported |

Supabase compute is $0.01344/hour plus usage/taxes until removal; user explicitly approved. Railway deployment `68d5e8bd-d510-4d33-ae18-9d52d581af10` reached SUCCESS, from source `011367f`. No production data or credentials were copied automatically. Never merge test data/settings into production.

Verified after `scripts/purchase-sandbox-seed.sql`: zero users, four packs, five paid courts, zero ownership rows, enforcement true. Schema-only branching requires catalog/configuration seed rows. Do not rerun the initial seed against a populated database. New test accounts start without gifts.

## Isolation rules

- `BILLING_ENVIRONMENT` defaults to `production`; explicit `sandbox` accepts only sandbox transactions. Unknown values fail closed. `REVENUECAT_ALLOW_SANDBOX` is obsolete in this update.
- Stripe keys, prices, sessions, intents, charges and signed events must match the environment. Sandbox billing requires the explicitly confirmed separate database URL and rejects the known production project.
- `BILLING_TEST_CATALOG=true` permits unfinished-catalog testing only in sandbox. All four V1 packs are now content-ready in source. The deployed sandbox notice explains test purchases and separate ownership; production still uses its earlier build with purchases disabled.
- Use fresh sandbox account UUIDs. Do not use production UUIDs or transfer purchases between accounts. RevenueCat retains original-account restore behavior.
- Client/server PostHog and replay remain disabled; no production analytics, APNs/VAPID or report-generation credentials belong here. Event definitions and remote flag targeting are unchanged.

## Completed setup and evidence

- Explicit user approval covered the restricted Stripe TEST key, sandbox RevenueCat webhook, and saving test DB/provider credentials locally and in Railway. Private files are mode 0600 and ignored; no credentials appear here. Production configuration was not changed.
- Stripe test endpoint `we_1UL5vTCgYYn1Kru6aImMtTz0` receives seven checkout/refund/dispute events. Test prices: Style `price_1UL5vRCgYYn1Kru6IIX1rdeR`, Court `price_1UL5vSCgYYn1Kru63QfowjAl`, Fun `price_1UL5vSCgYYn1Kru6rbi7PKVH`, Everything `price_1UL5vTCgYYn1Kru6jaqq9mNG`. All one-time USD 299/299/299/699 cents.
- Railway uses explicit sandbox billing, the isolated Supabase URL, enforcement true, test catalog true, test Stripe key, separate webhook secrets, existing RevenueCat verification/public Apple SDK keys, and disabled analytics/replay/push/report generation. Test purchases enabled only here; no auto-deploy branch attached.
- Four named accounts were created without gifts. Following the completed tests, phone owns Apple Style and Stripe Court, free/web own nothing, and bundle owns Everything from the verified Stripe test purchase. Passwords and email identifiers are in local `.purchase-sandbox-logins.md`, not this document.
- Browser smoke exposed omitted `auth.users` triggers and the absent XP configuration row in the schema-only branch. Applied `scripts/purchase-sandbox-bootstrap.sql` to this branch: restored five standard existing account hooks, seeded the checked-in XP defaults, reconciled profiles/usernames/starters. Verified four usernames/players, one XP configuration row, five auth triggers; extra profiles are browser-created guests. Username authentication and XP RPC now succeed for all four named accounts. No event definitions or XP economics changed; no synthetic data exported to PostHog.
- Style hosted Checkout completed with Stripe's fake card for 299 cents, `livemode=false`; provider callback granted Style. Duplicate checkout returned 409. Test refund `re_3UL6DeCgYYn1Kru60s3xHtvg` succeeded and callback removed Style. Other named accounts remained unchanged.
- Everything hosted Checkout completed for 699 cents, `livemode=false`; ownership became Everything. All four repeat-purchase attempts return 409, and the browser displays all four offers as Owned. It does not add future packs.
- RevenueCat's own sandbox TEST delivery returned 200. Invalid authorization is 401. Stripe accepts signed test events and rejects signed live events with 400. These delivery probes do not establish Apple StoreKit purchase/restore success.
- Native assets built through `npm run ios:purchase-sandbox`, signed archive uploaded at 18:51 UTC as **1.0 (8)** with `testFlightInternalTestingOnly=true`. Verified sandbox origin/database, correct bundle/version, public Apple SDK key, absence of production database reference and every actual server secret value. Apple processing completed. Saved “What to Test” clearly labels separate accounts and purchase testing. No external group added. The user completed compliance Save. Assigned the existing one-person PickleBash Internal group and verified Apple reports Installed 1.0 (8) for the owner. This confirms installation, not successful purchase/restore.

Evidence in local `artifacts/billing/`: `purchase-sandbox-smoke.json`, `purchase-sandbox-payment-refund.json`, `purchase-sandbox-final-check.json`, `purchase-sandbox-archive-verification.json`, `revenuecat-sandbox-test-200.png`, `purchase-sandbox-store.png`, `purchase-sandbox-everything-owned.png`, `purchase-sandbox-bootstrap.png`, `testflight8-compliance-prepared.png`, `testflight8-internal-assigned.png`, `testflight8-installed.png`.

## Rebuilding / recreating

Use the separate checkout and `.env.purchase-sandbox.example`. Never build this test app from a checkout with ordinary `.env`, `.env.local` or production dotenv files. `node scripts/build-purchase-sandbox.mjs --check` validates setup; `npm run ios:purchase-sandbox` allowlists public build variables, disables analytics/replay and syncs iOS. Check App Store Connect for the next unused build number.

For a new empty schema-only branch, run `purchase-sandbox-seed.sql`, then `purchase-sandbox-bootstrap.sql`, before creating accounts. The bootstrap is restricted to the four named purchase accounts and anonymous guests; execute only after verifying the project reference. Do not copy production users, grants, transactions or analytics cursors.

## Ready for the physical test

Open TestFlight build 1.0 (8), sign in as purchase_phone using the private local login guide, and run the checklist below. Apple reports build 8 installed on the owner’s iPhone; purchase completion is now verified; remaining checks are recorded below. Do not use build 7: it targets production.

## Physical iPhone checklist — build 1.0 (8)

Use a provided test PickleBash account; live logins/gifts are separate. Confirm the purchase-testing notice before buying. Apple transactions must run in sandbox.

1. Confirm all four localized prices and featured Everything offer. Cancel a purchase; no ownership should appear.
2. Buy Style; it becomes Owned and paid clothing is selectable. Court remains locked.
3. Relaunch and Restore Purchases. Style remains owned without a second charge.
4. Sign into the same test account on the test website: Apple-bought Style appears. Buy Court using Stripe test checkout, then refresh the iPhone: Court appears there too.
5. Switch to a free second account. Restore must not transfer the first account's purchases. Return to the original account and restore successfully.
6. Test Fun/Everything on designated accounts. Everything includes all three V1 packs; individual ownership alone does not grant Everything. This verifies billing, not missing content.
7. Host a paid court and wear paid cosmetics against a free opponent. The opponent sees/joins them but cannot independently select paid content.
8. Verify test refunds/revocation, saved-choice fallbacks, retry handling and independent complimentary grants.

Record actual results and event/transaction IDs, never secrets. A webhook TEST or unit-test result is not evidence of a real sandbox transaction or device restore. Do not enable live billing based on setup alone.

## Verification and cleanup

22 billing/database tests passed; client/server build and native archive passed. Checks cover both directions of environment mismatch, unknown receipt environment, test-only catalog availability, isolated-database guard and native HTTPS origin validation. Real Stripe sandbox purchases/refund passed; real Apple Style sandbox purchase and authenticated web ownership are verified. The physical tester explicitly confirmed Restore Purchases preserves ownership on the original account and does not transfer it to the free account. Cross-provider use on a device, free-opponent visibility/joining, and denial of paid-court hosting by the free account passed by explicit user confirmation.

Keep the test service/database available for physical testing. After testing, disable its purchase switch and provider test webhooks, then pause/remove test infrastructure after preserving needed results. Do not delete the database or revoke test credentials mid-test. Supabase compute is about $0.32/day plus usage/taxes; Railway usage is separate. Never merge this branch's data into production. Fun and Everything content is now approved without bundle-only items. Live launch still requires updated hosted/device verification, Apple purchase/refund coverage, review assets/submission, and tax/market checks.

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


## Apple Everything preflight — September 29, 2026, 22:57 UTC

Fresh provider/database checks confirm `purchase_web` has no effective packs and no RevenueCat non-subscription transactions. Its earlier Stripe Style purchase remains refunded/inactive. Use this account for the Everything Apple test; preserve `purchase_phone` and `purchase_free`.

A fresh PickleBash login alone is insufficient: RevenueCat's "Keep with original App User ID" also applies to NEW purchases when an Apple receipt belongs to another identified user. Keep this restore policy unchanged. Use a separate Sandbox Apple Account for `purchase_web` instead of the Apple Account previously used for `purchase_phone`.

App Store Connect currently has no explicit sandbox testers. The New Tester form has been prepared with first name PickleBash, last name Bundle and US storefront. Owner completion is pending: enter an unused email, choose/confirm a password and submit Create. No tester account has been created by this preparation. Credentials must stay outside tracked files.

Once created, follow Apple's TestFlight procedure: retain installed build 10; sign out of Media & Purchases only (not iCloud), then sign into the Sandbox Apple Account under Settings > Developer. This requires Developer Mode and temporarily affects access to production purchased media. Sign into PickleBash as purchase_web, confirm the empty store, purchase Everything in the no-charge test sheet, verify all three packs, relaunch and Restore. Verify the same account on the sandbox website and independently inspect provider/database evidence before marking PASS. Restore normal Media & Purchases sign-in when sandbox testing is complete.

Apple refund/revocation is still pending. Apple's documented sandbox flow uses an in-app StoreKit refund sheet. The installed RevenueCat Capacitor SDK exposes beginRefundRequestForProduct, but the current store does not expose a refund request control; prepare a sandbox-only route before that physical test. Clearing sandbox history or editing backend grants is not evidence of an Apple refund notification.

References: [RevenueCat restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior), [Apple TestFlight sandbox sign-in](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox), [Apple refund testing](https://developer.apple.com/documentation/storekit/testing-refund-requests). Evidence: artifacts/billing/apple-everything-preflight.json. Production remains unchanged.


### Sandbox Apple tester created

The owner created the dedicated PickleBash Bundle sandbox tester. App Store Connect was refreshed and independently showed one tester, US storefront, and no Last Purchase. The email/password are not recorded in tracked documentation. Next physical step: sign into this tester under iPhone Developer > Sandbox Apple Account after signing out of Media & Purchases, then use purchase_web in installed TestFlight build 10 for the Everything purchase/restore test. Purchase, shared web ownership and Apple refund results remain pending.


## No-sign-out test route — September 29, 2026

The owner explicitly declined signing out of the phone. The earlier Sandbox Apple Account sign-in instructions are withdrawn. Leave the newly created tester unused; do not change Media & Purchases, iCloud, or RevenueCat restore policy. Keep the existing purchase_phone identity and Apple Account.

The internal purchase-sandbox build now includes a collapsed Purchase test tools section for exact active RevenueCat pack sources only. Test refund controls require iOS, the purchase-sandbox build marker, fresh sandbox server ownership, fresh RevenueCat sandbox entitlement and an exact non-consumable product. Stripe/grant/effective bundle ownership alone does not expose a refund for an individual product. Requests open Apple's refund sheet via RevenueCat; they never directly revoke database ownership. Production/web stores have no test refund controls.

Physical sequence: install the updated internal build; remain purchase_phone; preserve a selected Fun cosmetic/theme; request Test refund · Fun Pack; choose a normal refund reason in Apple's sheet. After Apple confirms and Refresh packs reconciles it, verify Fun is no longer owned, Style/Court remain owned, saved choices remain stored with free fallbacks and new games cannot host Fun themes. Only then purchase Everything for the no-charge $6.99 test, confirm all three packs, relaunch/Restore, and verify server/web ownership. If needed, refund Everything afterward to check that independent Style/Court purchases survive. Do not substitute manual grant/database edits for provider refund evidence.

Validation: 22 focused tests pass, including production/wrong-source/wrong-product rejection and cancellation/error handling. Browser UI simulation confirms only Apple Style/Fun refund buttons, no Stripe Court refund, Everything becomes available after simulated Fun removal, and production/web controls are absent. Sandbox web build, iOS sync and native archive pass. These checks are setup evidence only; the real Apple refund and Everything purchase remain pending. Build 11 is being prepared. No server deployment or production billing change is needed for this native control. Shared checkout's independently changed store copy is preserved; only the new refund behavior is synchronized there.


### Build 11 ready: existing-account Apple refund and bundle test

TestFlight 1.0 (11), source `eb460cd`, uploaded at 23:11:47 UTC on September 29, 2026. Apple finished processing build `49e0bcc5-3468-46c4-8567-cbf7b3f54c21`; its status is **Testing**, assigned to the existing one-person PickleBash Internal group, with the no-sign-out instructions saved. No additional manual compliance step is pending. The owner can update TestFlight, remain purchase_phone and use Profile → Store → Purchase test tools → Test refund · Fun Pack. Stop after refund/revocation and fallback checks for provider verification before purchasing Everything. This replaces the earlier separate Apple sandbox-account route; no phone Apple sign-out is needed.

22 focused tests, simulated UI checks, sandbox build, native archive and archive configuration/secret checks pass. The 23:10:59 UTC baseline confirms active Apple sandbox Style/Fun and Stripe Court, with no Everything. Apple refund and Everything device results remain **pending**, not passed. Production and the hosted sandbox server deployment are unchanged. Evidence: `artifacts/billing/apple-refund-release.json`, `apple-refund-before.json`, `apple-refund-archive-verification.json`, and `testflight11-ready.png`.


### Build 11 refund sheet connection failure — September 29, 2026

The owner tapped Test refund · Fun Pack. Apple's sheet presented but displayed “Cannot Connect - Retry”; Retry repeated the error. No reason could be selected and no successful request was reported. Independent RevenueCat/database/web reads at 23:21:55 UTC show Fun and Style still active as Apple sandbox purchases, neither marked refunded, with Stripe Court unchanged. Evidence: `artifacts/billing/apple-refund-connect-error.json`. Refund/revocation and the subsequent Apple Everything purchase remain **incomplete**; no ownership reset, guard bypass, production change or phone account sign-out was performed.

Code inspection confirms the Capacitor bridge forwards the exact product ID to RevenueCat, which obtains StoreKit's latest verified transaction and calls Transaction.beginRefundRequest(for:in:). The reported drawer is the Apple-provided sheet. A firsthand developer report describes the same symptom, but Apple's engineer requested diagnostics rather than identifying a definite cause: https://developer.apple.com/forums/thread/797488 . This is evidence of similar failures, not proof of a universal Apple outage or proof that this app's integration cannot be involved.

Next low-impact diagnostic: dismiss the sheet, change from Wi-Fi to cellular if available, reopen PickleBash and retry the Fun test refund once. Preserve all Apple sign-ins. If it repeats, stop this device refund attempt and retain the pending status; further diagnosis needs device logs or another test environment, not a blind entitlement edit or another unverified release. The no-sign-out approach was implemented and passed local checks, but has not completed the provider refund test.


### Refund testing deferred by owner — September 29, 2026

The cellular retry produced the same Apple refund-sheet connection error. The owner explicitly asked to leave this pending and move on. Stop requesting further refund retries or phone sign-in changes. Apple refund/revocation and saved-choice fallback remain pending, and Apple Everything purchase coverage remains pending because the chosen sequence depended on that refund. Earlier successful purchase, restore, duplicate-protection, Stripe refund and social-visibility results remain valid. Do not mark either pending test as passed or silently waive it. Continue App Review preparation and launch-readiness work with production payments unchanged.
