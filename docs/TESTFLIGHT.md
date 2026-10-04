# TestFlight release record

## 2026-09-28 — 1.0 (6)

- App: PickleBash, bundle `com.picklebash.app`, App Store Connect app `6815925616`, Apple team `MB6W7WXD2R`.
- Source: deployed commit `2726b4e37ce8564d927ec776230c1c4ded3c516d`. Built in an isolated managed worktree; newer uncommitted changes in the main working folder were deliberately excluded.
- Build: Xcode 26.6, Release, generic iOS device, marketing version `1.0`, build number `6` supplied as archive build-setting overrides. The project's older checked-in build number was not used or edited.
- Production web assets were rebuilt and synced with `VITE_POSTHOG_ENABLED=true`, `VITE_ANALYTICS_ENVIRONMENT=production`, `VITE_POSTHOG_REPLAY_ENABLED=true`, and `VITE_APP_VERSION=1.0(6)`. Only public `VITE_` client configuration was copied into the isolated build; server secrets were not copied.
- Verified archive bundle ID/version/build, embedded analytics version, PostHog host, and production backend URL. Native archive succeeded.
- Uploaded with `xcodebuild -exportArchive`, automatic signing, `method=app-store-connect`, `destination=upload`, existing team, and `manageAppVersionAndBuildNumber=false`. Xcode reported `Upload succeeded` and `EXPORT SUCCEEDED` at approximately 09:14 Costa Rica time.
- App Store Connect visibly lists 1.0 (6) as Processing. Upload acceptance is not yet tester availability or App Review approval.
- Archive: `/tmp/PickleBash-1.0-6.xcarchive`; build and upload logs: `/tmp/picklebash-ios6-archive.log`, `/tmp/picklebash-ios6-upload.log`. These temporary paths are not durable release storage.
- Physical-device gameplay, rematch, identity, replay masking, and production push checks still need to be performed on the installed TestFlight build.

[TestFlight builds](https://appstoreconnect.apple.com/teams/69a6de6e-ab8b-47e3-e053-5b8c7c11a4d1/apps/6815925616/testflight/ios)

## 2026-09-28 — 1.0 (7)

- Source: `8af8c6b10e7044136f4c73b5a16dce127e02e3b4`, pushed to `main`. Includes rematch/end-screen cleanup, invitation alerts and badges, recent opponents, skill-editor navigation, and multiplayer responsiveness/rate-limit fixes.
- Validation: all 790 tests passed; production build and client/server type checks passed.
- Railway deployment `d8af22b9-d548-4562-9449-7d968ad6305f` reached Active; production `/healthz` returned `{"status":"ok"}`. Database migrations `202609280004`, `202609280005`, and `202609280006` were applied before rollout. Production defaults to shared database rate counters.
- Production assets rebuilt/synced with analytics and replay enabled, environment `production`, debug disabled, and `VITE_APP_VERSION=1.0(7)`. Archive bundle `com.picklebash.app`, version/build, backend URL, and analytics configuration verified.
- Signed Release archive succeeded. App Store Connect upload succeeded at 11:43 Costa Rica time. The TestFlight page shows processing Complete and Missing Compliance. The platform-only encryption selection was prepared, but the App Store Connect Save control did not respond through browser automation. The open dialog is left for user completion; no tester group is assigned yet. No physical-device invitation-delivery claim is made.
- Archive `/tmp/PickleBash-1.0-7.xcarchive`; logs `/tmp/picklebash-ios7-archive.log`, `/tmp/picklebash-ios7-upload.log`, and `/tmp/picklebash-release-tests-final.log`. Temporary paths are not durable release storage.
- Install build 7 when available to test invitation tap routing, rematches, skill upgrades, badges, and foreground/background notification behavior on a physical iPhone.

## Next release

Read [iOS build instructions](IOS.md), [analytics configuration](ANALYTICS.md), and [native push requirements](NATIVE_PUSH.md). Check the latest build number in App Store Connect before archiving; do not reuse 7. Build from an explicit reviewed revision, configure production client variables before syncing, and verify the archive contents before uploading. Confirm processing, export-compliance state, and the intended existing tester groups in App Store Connect; do not assume upload success means testing is enabled.

## 2026-09-29 — 1.0 (8), purchase sandbox only

- Source `011367f` in `codex/permanent-pack-release`; production main/deployment unchanged. Test backend `https://purchase-sandbox-purchase-sandbox.up.railway.app`, Supabase `drdvwfjkbyvfqnmxkksl`; separate test accounts and no production grants. Analytics/replay disabled; no push/report credentials copied.
- Native public configuration built with `ios:purchase-sandbox`; archive verified correct bundle/version, test origin/database, Apple public SDK key and absence of every actual server secret value. 22 billing/database tests and client/server build passed. Signed Release archive succeeded.
- Upload succeeded 18:51 UTC using `testFlightInternalTestingOnly=true`; Apple processing is Complete. Build ID `1b3f5f4d-0b67-45f0-b0b8-323601a07085`. What to Test saved. The user saved the platform-only compliance selection. At 19:30 UTC, assigned build 8 to the existing one-person PickleBash Internal group and verified Apple reports Installed 1.0 (8) for the owner’s iPhone 16 Pro, iOS 26.4.2. External Friends & Players remains unchanged. Apple Style sandbox purchase was verified at 19:42 UTC; restore and account isolation were subsequently confirmed by the physical tester.
- Temporary archive `/tmp/PickleBash-Purchase-Sandbox-1.0-8.xcarchive`; logs `/tmp/picklebash-purchase-sandbox-archive.log` and `/tmp/picklebash-purchase-sandbox-upload.log`. These are not durable archive storage.
- Stripe test payment/refund, bundle and account isolation checks passed on the deployed sandbox. Physical Apple Style purchase and authenticated web ownership passed on September 29. Restore/account-switching passed by explicit user confirmation. Cross-provider device use, free-opponent cosmetic/court visibility, and paid-court host restrictions also passed by explicit user confirmation; see [purchase testing](PURCHASE-TESTING.md). Build 7 uses production and must not be used for these checks.

## 2026-09-29 — 1.0 (9), completed packs purchase sandbox

Source `54bc2ba`; existing isolated sandbox only. All four approved Fun themes and the $6.99 Everything bundle without exclusive items are included. Signed archive and internal-only upload succeeded at 22:18 UTC. Archive checks passed for database/origin isolation, included assets, and no server secrets. Temporary archive: `/tmp/PickleBash-Purchase-Sandbox-1.0-9.xcarchive`; logs `/tmp/picklebash-fun-sandbox-archive.log` and `/tmp/picklebash-fun-sandbox-upload.log`. Hosted Fun ownership/free-opponent API checks passed. Physical rendering/audio and Apple Fun/Everything purchases remain pending; see [purchase testing](PURCHASE-TESTING.md#physical-checklist-for-build-9).

Apple processing and the platform-only compliance save are complete for build ID `89380daa-9835-4e49-8502-0dba8c0e5647`. What to Test is saved. At 22:26 UTC, build 9 was assigned to the existing one-person PickleBash Internal group. The prepared compliance dialog initially needed a manual Save; the subsequent page showed the requirement cleared before assignment. The build is ready for the owner to update in TestFlight. No external test group was added. At assignment time, physical results were pending; see the subsequent build 9 acceptance record below.

## Build 9 physical Fun acceptance — user-confirmed, 2026-09-29

The owner updated to TestFlight 1.0 (9), signed in as purchase_phone, and explicitly confirmed the Fun purchase completed and Fun showed Owned. After the content checklist, the owner reported purchasing worked as expected and confirmed a Spooky game with purchase_free also worked as expected. Record the Fun purchase/unlock and physical themed-match/free-opponent experience as passed based on the tester’s report. This is user acceptance evidence, not a new independent provider/receipt verification.

Court-selection thumbnails still show the original base locations in build 9; themes appear in the actual match. This is a known preview limitation, separate from payment or entitlement correctness. Theme-aware thumbnails were recommended but have not been implemented or authorized as a new task here.

Everything’s Apple purchase has not been explicitly confirmed: the most recent guided steps asked the owner to leave it unpurchased while testing Fun. Next, test the Everything Apple product on a designated account that does not already own all three packs, then relaunch/Restore Purchases and verify shared web ownership. Existing Stripe Everything coverage and build 8 restore/account-isolation results remain passed. Apple refund/revocation and saved-choice fallback checks remain outstanding. No production settings changed.

## Redundant Everything purchase correction — 2026-09-29

The owner identified that Everything must be disabled after buying all three individual packs. The previous instruction to buy Everything on purchase_phone was incorrect and is withdrawn. Store copy now shows “All packs owned” with a disabled button; native Apple preflight refreshes ownership and blocks before StoreKit purchase, and Stripe checkout rejects with HTTP 409 before creating/reusing a session. Bundle SKU ownership remains distinct, preserving independent refund/grant accounting. Partial ownership retains the existing fixed-price policy. These changes require a new native build; build 9 still has the old behavior. Test the bundle with an account that has not already acquired all three packs.

Validation: 19 focused billing/ownership checks and the client/server production build passed. Sandbox deployment `e8e9b2e6-e541-4d6f-8c12-71396ea6159d` succeeded from source `e931765`. A refreshed purchase_phone status independently confirmed exactly Style, Court and Fun; attempting Everything checkout returned 409 `already_owned` with no checkout URL. Existing bundle ownership is not synthesized. Evidence: `artifacts/billing/redundant-bundle-check.json`.

Native build 1.0 (10) compiled and signed successfully, and its archive passed test-origin/database, public SDK key, included theme assets, corrected bundle-copy and secret-exclusion checks. Internal-only upload succeeded at 22:44 UTC; Apple processing is complete for build ID `4c320373-e90b-4199-b2f8-b1f1ee398ebb`. Corrected What to Test is saved. The owner saved the unchanged platform-only compliance answer. At 22:50 UTC, build 10 was assigned to the existing one-person PickleBash Internal group. No external group was added. The owner subsequently confirmed on build 10 that Everything is disabled after owning all three individual packs. Record the physical disabled-offer check as passed by explicit user report. The latest message did not separately describe the restore step; earlier restore results remain documented above. Build 9’s What to Test was corrected and saved to withdraw the redundant purchase instruction. No production deployment or billing switch changed.


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


## App Store submission preparation — 1.0 (12)

Production-configured native archive compiled from the completed V1 pack release with the dedicated Apple review-account server setup. This archive uses the production API/database and public Apple SDK key; no internal-only export option is intended. Upload, processing, screenshot evidence and review availability must be verified separately. Build 11 remains the isolated refund test build with its device refund and Everything purchase deferred.


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


### Privacy publication verified — September 29, 2026

Owner completed publication. App Privacy visibly reports Published by Dzuy Linh, with all 11 categories configured. Evidence: artifacts/billing/apple-privacy-published.png. Add for Review validation returned an unexpected error with no specific missing field. Retry was blocked by automatic approval review because metadata completion did not explicitly authorize the submission workflow; specific approval requested. IAP list/detail pages loaded without their details, so current purchase readiness is not reverified. No submission/release or payment/enforcement change occurred.


### Gameplay screenshot uploads — September 29, 2026

Owner provided IMG_8920–IMG_8924, each 1206 × 2622. Resized full screenshots to Apple's 6.5-inch 1284 × 2778 slot without cropping or changing depicted UI; originals remain unchanged. Uploaded all five and verified all filename buttons after reload: eight total screenshots including the existing three. Uploads auto-save; draft remains Prepare for Submission. Copies: artifacts/billing/gameplay-screenshots/. Proof: artifacts/billing/apple-gameplay-screenshots-uploaded.png. No review submission or release performed.


### Submission readiness audit — September 29, 2026

Current App Store draft remains Prepare for Submission with build 12 and eight screenshots. All four non-consumable purchases are listed as Prepare for Submission; successful attachment/validation in a review submission remains unverified. Account-creation implementation has no identified in-app account-deletion flow in the release source; published policy currently directs deletion requests to email. Apple requires initiation of account deletion within account-creating apps: https://developer.apple.com/support/offering-account-deletion-in-your-app . This is an implementation gap before declaring readiness. Further release audit should verify user-content reporting/blocking/moderation and regional eligibility. Prior metadata completion is not proof of full review compliance. No submission or code/configuration change made by this audit.


## Account safety and next review build — September 29, 2026

Owner explicitly holds submission: build 12 is not final. Implemented locally: Profile account/guest deletion requests with acknowledgement and password verification, player reports and symmetric blocking, blocked-player management, broader public-name filtering, private operator queues and owned hosted-card cleanup. See ACCOUNT-SAFETY.md for scope, manual 30-day processing, deployment order, operator responsibilities and device tests. No real account was deleted, no new binary was uploaded, and live payments/enforcement were not enabled. Database migration and application deployment remain pending; the local implementation is not live. UI polish must be included in the next final build.

Validation: 52 focused tests passed across account safety, database cleanup, HTTP authentication/origin protection, Community moderation, invitations/challenges, player design, chat, team directory, card publishing and legal routes. Production build and design-token validation passed. Existing chunk-size/contrast advisory notes remain. Phone-width dialogs were checked and fit without clipping. Evidence: artifacts/billing/account-safety-delete-phone.png and account-safety-report-phone.png. Device-level deletion/report/block testing remains required against the migrated sandbox and then the final native build.

Apple pricing audit found no app starting price; configured and verified United States $0.00 with comparable free prices. Mac and Vision Pro availability were disabled and verified on a fresh pricing page. The shared native project now targets iPhone only; no iPad/Mac/Vision support is claimed for the next archive. Revisit other devices only after testing and appropriate screenshots. No review submission/release occurred.

Territory audit: the app availability page now shows 144 available / 31 not available, with China mainland, Vietnam, Afghanistan and Morocco visibly Not Available in addition to the existing EU exclusions. The attempt to confirm those four changes was rejected by automatic approval review for lacking explicit territory authorization; the subsequent read-only UI nevertheless showed these persisted values. Attribution of the intervening UI change is unverified; no retry or workaround was performed. A specific owner confirmation is pending for applying the same exclusions to all four IAP listings. Court Pack was verified as Prepare for Submission with 148/175 selected and its review screenshot/notes present; pack-region alignment remains pending. China/Vietnam require additional game approval/licensing according to Apple's app-information reference; Afghanistan/Morocco were flagged unavailable by the age rating. Evidence: apple-release-availability-audit.png, apple-app-free-price-saved.png and apple-iphone-distribution-saved.png.

After UI polish: migrate/deploy and test safety, archive a new production-configured iPhone build, update screenshots/reviewer notes to match that build, confirm pricing/territories for all four packs, attach the final binary and all four initial non-consumables to the new-version review submission, and run Apple validation before asking for final submission approval. Final submission validation is deliberately deferred while the owner holds build 12. Apple device refund/revocation/fallback and direct Everything purchase remain pending as previously recorded; do not mark them passed.

Reference: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information


## Required future markets: China mainland and Vietnam

Owner decision, September 29, 2026: **China mainland and Vietnam are required future distribution markets for PickleBash.** Their initial exclusions are temporary launch deferrals, not a decision to abandon either market. Revisit this item during post-launch market expansion planning and before changing territorial availability. No target date is set. This note does not authorize a new availability change or waive regional requirements.

- [ ] Recheck current Apple and local game-distribution requirements for both markets. The September 29 reference is a starting point, not proof of future eligibility.
- [ ] Determine and obtain the necessary China mainland game registration/approval and Vietnam game-publishing license, including any local publishing partner requirements.
- [ ] Review localization, privacy/data handling, content, age ratings and purchase/payment eligibility for each market.
- [ ] Configure the required compliance information in App Store Connect and align availability for the app and all four V1 pack purchases.
- [ ] Test account access, gameplay, purchase verification and restoration in each market before enabling distribution.

Track this as a required market-expansion follow-up. Keep it separate from the present UI-polish/final-build submission work. Reference: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information

## TestFlight update — September 30, 2026

At the owner's request, production-configured iPhone build **1.0 (13)** was archived and uploaded successfully. Source: main revision `e33595dba6c09c9f1a8dc58c5200b0cd12250e9d`, plus the local native metadata addition `ITSAppUsesNonExemptEncryption=false`, matching the platform-only declaration previously saved for build 12. Includes the current Store, community, player cards, customization previews, account deletion/report/block controls, and settings improvements. Native startup continues directly into the game.

Production web compilation/typechecks and Capacitor sync passed; the same source's release suite passed 844 tests. Signed Release archive and macOS signature verification passed. Archive inspection confirms production API/database, the public Apple purchase SDK key, production analytics with version `1.0(13)`, four theme music files, iPhone-only support, and absence of configured server secrets. Development flag overrides/debug logging were excluded. No live billing, entitlement, or remote flag configuration was changed.

Xcode reported `Upload succeeded` and `EXPORT SUCCEEDED` at approximately 21:19 Costa Rica time. Apple reported that the uploaded package was processing. Export used automatic signing and `app-store-connect` distribution, without an internal-only restriction. Apple processing completion, existing tester-group assignment, and install availability are **not verified**: this execution environment has Xcode upload authentication but no App Store Connect browser or API access. Once processed, confirm build 13 is assigned to the existing internal tester group; do not expand external testers or submit App Review as part of this update.

Evidence: [archive verification](../artifacts/billing/testflight-13-archive-verification.json). Local temporary archive: `/tmp/PickleBash-TestFlight-1.0-13.xcarchive`; build/sync/upload logs: `/tmp/picklebash-ios13-archive.log`, `/tmp/picklebash-ios13-sync.log`, `/tmp/picklebash-ios13-upload.log`. These temporary paths are not durable backups. Native metadata and this release record remain local and uncommitted.

Physical-device checks remain pending for this build, especially account deletion/report/block flows, native push delivery, and gameplay. Previously deferred Apple refund/revocation/fallback and direct Everything purchase tests remain pending. No App Review submission or public App Store release occurred.


## Prepared update — October 1, 2026 — 1.0 (14), upload held

Production-configured iPhone build **1.0 (14)** was compiled, signed and exported locally. Source: main `6e4f9cae10a32c55f25ad58186b71c65fc3e976d` plus the local iOS guest save-progress prompt, its shared account-dialog changes/tests, and the existing platform-only encryption declaration. An isolated source snapshot preserves the original dirty checkout and excludes the unfinished private-preview branch. No commit, push, Railway deployment or App Store review submission was performed for this build.

The exact snapshot passed all 852 tests, production client/server compilation/typechecks, Capacitor sync and design-token validation. Existing bundle-size and contrast advisories remain. The archive signature, version, bundle ID, iPhone-only configuration, production backend/public purchase SDK configuration, secret exclusion and all four theme music files were verified. App Store distribution export and signature verification passed; the exported IPA has the production push entitlement. The initial archive has development push signing, which distribution export correctly replaced.

**No upload was attempted.** The owner explicitly requested a preview before TestFlight. Build 14 is the next number after the last locally verified upload (13); current App Store Connect build numbering has not been independently read in this execution environment. Verify it remains unused before eventual upload. Apple processing, tester-group assignment and device acceptance are therefore not claimed.

Evidence: [build 14 verification](../artifacts/billing/testflight-14-archive-verification.json). Local archive `/tmp/PickleBash-TestFlight-1.0-14.xcarchive`; distribution IPA `/tmp/PickleBash-TestFlight14-Distribution/App.ipa`; snapshot `/tmp/picklebash-testflight14-source`; test/build/signing logs `/tmp/picklebash-ios14-snapshot-tests.log`, `/tmp/picklebash-ios14-sync.log`, `/tmp/picklebash-ios14-archive.log` and `/tmp/picklebash-ios14-distribution.log`. Temporary paths are not durable backups. Local/native preview and renewed upload authorization remain pending.


## TestFlight update — October 1, 2026 — 1.0 (15)

Owner authorized pushing all current changes to main and uploading build **1.0 (15)**. This supersedes the preview hold for build 14; build 14 remains unuploaded. Includes the UI polish, guest character preservation/default lineup fixes, free-only randomization without Premium access, community opponent eligibility, and compact invitation/profile/pack designs. Profile's web fallback and native project build number are updated to 15.

Release preparation: production client/server compilation and design-token validation passed. App Store Connect was read directly: newest listed build was 13, assigned to PickleBash Internal; build 15 was unused. Upload, processing and tester availability will be recorded after verification. No App Review submission, public release, external tester expansion, or live billing configuration change is part of this update.

Main revision `38918814d2e7b96e13b144affba2627d612e08b0` was pushed successfully. The complete release suite passed **872/872 tests** after updating a test boundary mock for the shared Profile account gate. Production compilation/typechecks, Capacitor sync, and design-token validation passed. Railway's commit status reports success, production health is OK, and uncached production pages serve the updated assets/contact.

An isolated `git archive` of that revision, with only public production build variables and version `1.0(15)`, produced the signed iPhone Release archive. Signature, bundle/version/build, production API/database/public Apple SDK, production analytics, disabled development overrides, encryption declaration, and configured server-secret exclusion passed inspection. Archive push signing is development; App Store export must replace it with production signing.

Xcode reported **Upload succeeded / EXPORT SUCCEEDED** at 15:27 Costa Rica time. The exact distribution IPA passed signature verification and has `aps-environment=production` with `get-task-allow=false`. Apple processing and internal assignment are being verified. Evidence: [build 15 verification](../artifacts/billing/testflight-15-archive-verification.json). Archive `/tmp/PickleBash-TestFlight-1.0-15.xcarchive`; preserved IPA `/tmp/PickleBash-TestFlight15-Distribution/App.ipa`; build/sync/upload logs `/tmp/picklebash-ios15-archive.log`, `/tmp/picklebash-ios15-sync.log`, `/tmp/picklebash-ios15-upload.log`. Temporary files are not durable backups.

App Store Connect now lists build 15 (`6bdca917-c607-44d9-950b-db072e8fbcff`) as **Ready to Submit** and confirms the saved **PickleBash Internal** group assignment (one existing internal tester). Testing notes were saved. This makes build 15 available to that internal group; actual physical-device installation and acceptance testing remain pending. No external group, App Review submission, or public release was added. Proof: [internal availability](../artifacts/billing/testflight-15-internal-ready.png).


## TestFlight update — October 1, 2026 — 1.0 (16)

Owner authorized pushing all pending changes to main and uploading a new TestFlight build. Build 16 includes bundled iOS paddle-sound loading, player/team name focus-zoom fixes, immediate invitation cancellation removal and reachable exits, Store complimentary-form removal, simplified Profile actions, signed-out Sign In navigation, the Play AI Bots setup label, startup loading-link removal, and authenticated home-screen account-button cleanup. User-created player names remain unchanged.

Main source `15bfae43a620b4fdb3303af14e5f8c8dee68d6a7` was pushed successfully. All **876 tests** passed with local test networking enabled; production compilation, Capacitor sync and design checks passed. The main commit's deployment status reports success and production `/healthz` returns OK.

The isolated production archive passed bundle/version/build, iPhone-only, platform-only encryption, production backend/public Apple SDK/analytics, development-override exclusion, server-secret exclusion and signature checks. Capacitor sync adjusted only local Swift package paths to the shared dependency directory. The distribution IPA passed signature verification with production push and debug entitlement disabled. Evidence: [build 16 verification](../artifacts/billing/testflight-16-archive-verification.json). Archive `/tmp/PickleBash-TestFlight-1.0-16.xcarchive`; preserved IPA `/tmp/PickleBash-TestFlight16-Distribution/App.ipa`; test/build/upload logs `/tmp/picklebash-ios16-tests-release.log`, `/tmp/picklebash-ios16-production-sync.log`, `/tmp/picklebash-ios16-archive.log`, and `/tmp/picklebash-ios16-upload.log`.

Xcode reported **Upload succeeded / EXPORT SUCCEEDED** at **16:40 Costa Rica time** and confirmed that the uploaded package began processing. The initial upload stalled awaiting package analysis; retrying the same signed archive succeeded. Successful upload log: `/tmp/picklebash-ios16-upload-retry.log`. Processing completion and internal tester assignment remain unverified because the App Store Connect browser session expired and requires owner sign-in. Physical-device checks remain pending. This update does not submit App Review or change billing configuration.


## Submission preparation — October 1, 2026 — builds 17 and 18

Build 17, source `1647a5632078761ef512f93eafd0ef91f6cdc63b`, removes disabled theme music from the pack purchase promise. All 876 tests, production compilation/sync, design validation and native archive verification passed. App Store Connect upload succeeded at 17:25:50 Costa Rica time; Apple processed the build and it was selected on the version 1.0 draft. Current native Home and Store captures (1284 × 2778) replace the outdated authenticated Home and Store assets. StoreKit loaded actual $6.99 Everything and $2.99 Style prices in the native simulator. This is product-lookup evidence, not a simulator purchase.

Saved Apple listing/review notes identify the current Store/Restore/account-safety paths and omit disabled music. All four products now align to 144 territories, excluding EU, Afghanistan, Morocco, mainland China and Vietnam, with future-territory inclusion disabled. Party is the display name of the unchanged Fun product. The app and four non-consumables passed Add for Review validation in one existing draft. No Submit for Review or release occurred.

Build 18 supersedes 17 to prevent a receipt already associated with another saved account from opening a new Apple purchase sheet, explain receipt conflicts, reveal purchase errors, and avoid unverified success copy. The user’s Everything transaction is independently verified on its original isolated test account; see [billing investigation](BILLING.md#review-account-receipt-conflict--october-1-2026). Review-account physical purchase/restore and previously deferred refund/revocation tests remain incomplete. No global billing switch, restore policy, tester expansion, or complimentary grant changed. Build 18 upload and processing will be recorded after verification.

The receipt-conflict release source `9dc2130` passed **879/879 tests**, TypeScript client/server checks, production build/Capacitor sync and design validation. Main push succeeded. Native archive/upload/processing are pending; do not use the saved build-18 review notes as proof of a selected build until the picker is updated.

Build 18’s signed production archive and preserved App Store IPA passed signature, bundle, version, production configuration/secret exclusion and entitlement checks (`aps-environment=production`, `get-task-allow=false`). Upload succeeded at **18:05:31 Costa Rica time**. Apple completed processing (`f6cdceb5-4620-4e5d-9675-09ff09d2d097`); the existing **PickleBash Internal** group is assigned with one internal tester. Testing notes were saved. Build 18 is selected/saved on the app version and passed Add for Review in the original four-purchase draft. Main’s deployment status reports success for `d19ce52a-ca8a-472b-8968-a8df670d28df`. Evidence: [build 18 verification](../artifacts/billing/testflight-18-archive-verification.json), [internal testing availability](../artifacts/billing/testflight-18-internal-ready.jpg). No final submission or release occurred.

Temporary release files: `/tmp/PickleBash-TestFlight-1.0-18.xcarchive`, `/tmp/PickleBash-TestFlight18-Distribution/App.ipa`, `/tmp/picklebash-testflight18-source`, `/tmp/picklebash-ios18-tests.log`, `/tmp/picklebash-ios18-production-sync.log`, `/tmp/picklebash-ios18-archive.log`, `/tmp/picklebash-ios18-upload.log`, `/tmp/picklebash-ios18-distribution.log`. These are not durable backups. Physical build-18 receipt-conflict/preflight checks, clean-receipt review-account purchase/restore, prior refund/revocation/fallback checks and native account-safety acceptance remain pending. Do not declare the app fully ready for public billing from metadata validation alone.

Final Apple draft verification: **Items Ready to Submit (5)** contains **iOS App 1.0 (18)** and **In-App Purchases (4)**. The draft is still unsubmitted. Proof: [combined draft](../artifacts/billing/app-review-18-draft-ready.jpg).


## Submission withdrawn — October 2, 2026

The owner requested cancellation and explicitly deferred resubmission until after additional updates. The signed-in Codex browser confirmed iOS 1.0 build 18 was Waiting for Review, submitted October 1 at 6:18 PM. Removed version 1.0 from review and confirmed submission `a42d59e4-dfa9-4130-9260-75649b89e721` reached **Removed**. All five items show Removed: iOS App 1.0 (18), Style, Court, Fun/Party and Everything purchases. These items were removed from this review submission, not deleted from the app record.

No replacement build was uploaded or resubmitted. **Hold native submission until the owner requests it after the additional updates.** Build 18 also needs the paid-route authentication compatibility change described in [the audit release record](AUDIT-RELEASE-2026-10-02.md). Evidence: [cancelled submission](../artifacts/audit-release/apple-submission-removed.jpg).


## Resubmission candidate — October 2, 2026 — 1.0 (19)

The owner requested a TestFlight build that could become a resubmission candidate. Uploaded production **1.0 (19)** from exact main revision `e945ff79a8ba94d975962d7881313546300a0bea`, using an isolated source snapshot. This includes the deployed paid-route bearer authentication compatibility fix, account/roster recovery and bounded history updates, the beta-entry native bypass, and shared account close-icon styling. Unfinished Rally Studio and other concurrent shared-checkout edits were excluded. The build/version values were passed as archive settings; the shared native project was not edited.

All **914 tests passed** with two test workers. Production client/server compilation, Capacitor sync, design checks, signed Release archive, and App Store distribution export passed. Archive verification confirmed bundle `com.picklebash.app`, iPhone-only configuration, production backend/database/public purchase SDK/analytics with `VITE_APP_VERSION=1.0(19)`, platform-only encryption declaration, no development overrides, and no configured server secrets in bundled files. The initial restricted-shell signature check could not access the trust store; the same archive passed when verified against the Mac's signing trust store. Distribution signature verification passed with `aps-environment=production` and `get-task-allow=false`.

Xcode reported **Upload succeeded / EXPORT SUCCEEDED** at **19:42 Costa Rica time**, October 2, and Apple reported that the package began processing. Export uses `app-store-connect` distribution without an internal-only restriction, so it can be selected later for review. Current App Store Connect build numbering could not be independently read because browser/API access was unavailable; Apple accepted the build-19 upload without a duplicate-number error. Processing completion, export-compliance status, saved testing notes and PickleBash Internal availability remain **unverified**. Local proposed testing notes were prepared but not saved to Apple. No external tester group or App Review submission was changed. The review-submission hold remains in effect pending a separate owner decision.

Physical iPhone gameplay, offline/reconnect, native notifications/audio, account safety and purchase/restore acceptance remain pending. This is a candidate upload, not a claim of review readiness or public billing acceptance.

Evidence: [archive/distribution verification](../artifacts/testflight-19/archive-verification.json), [upload log](../artifacts/testflight-19/upload.log), [tests](../artifacts/testflight-19/tests.log), [proposed testing notes](../artifacts/testflight-19/what-to-test.txt). Temporary archive `/tmp/PickleBash-TestFlight-1.0-19.xcarchive`; distribution IPA `/tmp/PickleBash-TestFlight19-Distribution/App.ipa`; isolated source `/tmp/picklebash-testflight19-source`. Temporary paths are not durable backups. This release record and evidence are local; no new source commit was needed for the version override.

## TestFlight roster fix — October 2, 2026 — 1.0 (20)

At the owner's request, built production **1.0 (20)** from exact main revision `9a6fb1b858da4dd765e326e92064389e5e4c50ac`. Main already contained the deployed roster revision fix; the isolated native source excludes unrelated shared-checkout work. App Store Connect was inspected before upload: 19 was the latest build and 20 was unused.

The release source passed all **916 tests**. Production compilation/typechecks, Capacitor sync, design validation, signed iPhone archive and App Store distribution export passed. Archive verification confirms the roster revision/conflict-recovery code, production API/database/public purchase SDK/analytics with `1.0(20)`, platform-only encryption declaration, no development overrides or configured server secrets, and valid signatures. The distribution IPA has `aps-environment=production` and `get-task-allow=false`.

Xcode reported **Upload succeeded / EXPORT SUCCEEDED** at **22:00 Costa Rica time**, October 2. App Store Connect independently showed build 20 processing. Final processing and group status follow below. No App Store review submission or public release is part of this update. Physical-device acceptance remains pending.

Evidence remains local under `artifacts/testflight-20/`: archive/distribution verification, upload/build/design/test logs and testing notes. Archive `/tmp/PickleBash-TestFlight-1.0-20.xcarchive`; distribution `/tmp/PickleBash-TestFlight20-Distribution/App.ipa`; isolated source `/tmp/picklebash-testflight20-source`. Temporary paths are not durable backups.

Apple processing completed for build `d3e2a0b7-6a2f-4a90-aaf5-21953e3696d7`. The build detail page confirms **PickleBash Internal**, one existing internal tester, and no individual testers. Testing notes were saved. Internal TestFlight installation is available; actual device installation/acceptance is not claimed. No external group was changed and no App Review submission occurred.

## App Review resubmission — October 2, 2026 — 1.0 (20)

The owner reported completing testing and explicitly requested submission, lifting the prior review hold. Submitted **iOS App 1.0 (20)** with the four existing in-app purchases (Court, Everything, Fun/Party and Style). App Store Connect confirmed **5 Items Submitted**, and all five items show **Waiting for Review**, submitted October 2 at **22:13 Costa Rica time**. Submission ID: `974094bf-16bc-4ef9-a8d9-ab3a41d94b9d`.

Build 20 replaced build 18 in the version draft. Review notes identify build 20 and the roster save-conflict fix. Existing reviewer access and purchase metadata were retained. **Manual release remains selected**; this submission does not publish the app or enable ordinary-account purchases.

[Apple review submission](https://appstoreconnect.apple.com/apps/6815925616/distribution/reviewsubmissions/details/974094bf-16bc-4ef9-a8d9-ab3a41d94b9d)
