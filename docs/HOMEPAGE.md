# Public homepage and game entry

The web beta direction (October 2, 2026) is **Get Beta Access → create an account → start playing immediately**. Existing players can sign in. This is an early-access sneak peek for partners and their friends, with no manual approval, waitlist, purchase requirement, or invented capacity limit. Native iOS guest play is unchanged. Release verification and deployment scope are recorded below. The September 30 live-homepage observations below are historical evidence, not a verification of current production behavior. No public App Store or TestFlight download URL is advertised.

`index.html` contains the crawlable marketing content, using the existing hero and court artwork and shared design tokens through scoped `src/homepage.css`. `src/bootstrap.ts` selects marketing or checks web beta access before lazy-loading `src/game-bootstrap.ts`. Native entry skips the web gate. The two existing admin routes keep their independent authorization. The homepage does not initialize authentication, game modules, product analytics, replay, or notifications. No session check redirects signed-in homepage visitors.

`src/entry-route.ts` recognizes explicit legacy game parameters and account callback fragments at the root and normalizes their path to `/play`, preserving query parameters and fragments. Campaign parameters and homepage section anchors remain on the homepage. `/challenge/:token`, legacy `#guestChallenge` links, and `/admin/analytics` remain supported. Native Capacitor launches go directly to the game. The installed web-app manifest retains its existing `/` identity and scope, but starts at `/play?multiplayer=1`; older installed root launch URLs with game parameters still work. New game share and web push links point to `/play`.

Before publishing, verify Supabase's allowed email redirect URLs include `https://picklebash.app/play` (and approved local/native origins). Existing root callback URLs remain recognized. Auth credentials and saved player data are unchanged. Real email round trips and physical iOS launch/push behavior need release smoke checks; they are not established by routing unit tests. Keep server support for both `/play` paths when deploying; Vite's development fallback alone is not sufficient.

To add store downloads later, replace the informational card with real, tested App Store / Google Play links and choose the primary call to action. Do not claim a store release before it exists.

## Outreach design review

Copy leads with a casual pickleball strategy game played with friends, then explains choosing shots and trading turns. The mobile hero is compact enough to show the game illustration in the first screen. Decorative slogan strips and stickers have been removed.

`public/images/homepage/gameplay.mp4` comes from the user’s original `/Users/dzuy/Desktop/IMG_8929.MOV`, which is preserved. Native AVFoundation exported a 32.43-second portrait H.264 MP4 (540 × 978, 30 fps, approximately 3.9 MB at a controlled 1 Mbps video bitrate), cropped by 440 source pixels at the top to exclude the device status bar and player scoreboard. Audio is omitted, and the file is optimized for progressive network playback. It retains genuine shot selection, the rally, and the point result; game UI and scenes were not recreated. `gameplay.jpg` is the source frame at nine seconds, with the same privacy crop and output dimensions. Frame inspection found no notifications or account details in the retained area; the remaining Emma/Maya labels are in-game opponent names.

The portrait media slot is `.marketing-game-preview` in `#how-to-play`; it sits beside the short game explanation on desktop and between the introduction and the play steps on mobile. Video uses native controls, inline mobile playback, metadata preloading, an inspected poster, and a short textual description. It has no autoplay or loop, so reduced-motion visitors see a still poster until they choose to play.

Validation: build/typechecks and all 844 tests passed; design token validation passed (the shared white-on-pink contrast advisory remains elsewhere; homepage buttons now use dark text at 4.77:1). Browser QA covers desktop/mobile layouts, section navigation, keyboard skip/focus, media playback, and no horizontal overflow at 320, 390, 620, 768, 1024, and 1440 pixels. Live `/play` independently reached the game menu in the local browser; no signup or remote matches were created. Beta inquiry mailto targets were checked without sending email.

## Social and customization refinement

The local review restores the reasons to play: challenging real pickleball friends off the court, making individual players, and dressing up matches with the Fun Pack. It does not imply group-management or group-chat functionality. Style and theme images in `public/images/homepage/` are actual 256px avatar PNGs exported from the current `storePackPreview` / `AvatarThumbnails` renderer using its existing examples. Theme names and contents follow `src/fun-themes.ts`, `src/pack-catalog.ts`, and the current Premium/Fun documentation; the stale SVG manifest is not evidence of deployment. Court SVGs remain unchanged.

The page distinguishes free customization and locations from Style/Court extras, names the single Fun Pack, and contains no pricing, purchase CTA, or claim that purchases or new theme deployment are live. These are the approved marketing changes.

This refinement passed build/typechecks, the three entry-routing tests, design-token validation, and `git diff --check`. The previous full 844-test pass remains applicable: this follow-up changes only static homepage content, CSS, and rendered image assets. Desktop (1440px) and mobile (390px) screenshots were inspected; all images loaded and widths from 320 through 1440px showed no horizontal overflow. Keyboard skip navigation remains visible on focus. The authentic gameplay video and browser/beta destinations are unchanged. The later production inspection below verifies the advertised pack content is deployed; new-account purchase readiness remains separate from content availability.

## Follow-up before publishing

Read-only production inspection on September 30, 2026 found the deployed `/play` editor and Store include current Style outfits and all four Fun themes. The public entry bundle `index-B-pSZCqU.js` loads `target-picker-BL1aDtIO.js`, whose catalog marks Style, Court, Fun, and Everything content-ready. The existing signed-in account showed all packs Owned, with real Style/Court/Fun previews; no account, entitlement, purchase, or match was changed. This supersedes the older local-only Fun deployment snapshot. It does not prove purchase availability for a new account: Owned controls conceal that state, and the last documented billing-switch snapshot says purchases are disabled. Exact present payment and new-account entitlement enforcement require a fresh server-status/configuration read or an already authorized unowned account. Do not imply every featured look is free or that a purchase is currently available.

The hero now includes a native disabled button labeled App Store — coming soon. It has no URL or click action. Apple’s marketing guidelines prohibit altered download badges and standalone Apple logos, so this uses a generic phone icon and plain text rather than modified official badge artwork. Browser play remains active.

The `#courts` section is now a real gameplay screenshot gallery, replacing the court illustrations. Its anchor is retained for existing links.

## Supplied gameplay screenshot gallery

The user supplied `IMG_8920.PNG`, `IMG_8921.PNG`, and `IMG_8922.PNG` through Library. Original 942 × 2048 PNGs are preserved privately in `artifacts/homepage/source-gameplay/` with their Library identity/version metadata; do not include those source images in a release commit. They include player names and device/TestFlight bars at the top. Only derived images in `public/images/homepage/` are used by the page. Native CoreGraphics cropped each source to `(0, 360, 942, 1640)` and exported a 720 × 1254 JPEG, stripping those names/bars while retaining genuine game UI. No UI was recreated.

`aim-shot.jpg`, `topspin-shot.jpg`, and `beach-match.jpg` are ordered as aiming, topspin, then customized players on the Beach court. They total 383,204 bytes (about 375 KiB) instead of the original 1,583,706 bytes. Each derived image was inspected. Desktop shows three columns; mobile shows a horizontal gallery with a partial next card, swipe hint, native scrollbar, keyboard access, and visible focus. Captions and alternative text describe actual content. No autoplay or automatic slide motion is introduced.

Final gallery verification passed build/typechecks, all three entry-routing tests, design-token validation, and `git diff --check`. Desktop/mobile screenshots were inspected. All gallery images loaded, the final mobile slide was reached, keyboard scrolling and focus were checked, and no page overflow was found at 320, 390, 620, 768, 1024, or 1440px. The existing video, social/customization copy, disabled App Store coming-soon control, and browser/beta routes remain unchanged.

The gameplay video is framed by the generic, scalable `public/images/homepage/phone-frame.svg` inside `.marketing-phone`. Its screen preserves the video aspect ratio and native playback controls; decorative frame imagery has empty alternative text and cannot intercept clicks. No device status bar, account data, or altered game UI is added. The Fun Pack eyebrow now reads “FUN PACK THEMES TO KEEP THE PARTY GOING.”

## Scroll and interaction polish

`src/homepage-motion.ts` runs only when bootstrap selected the homepage. IntersectionObserver triggers short, one-time reveals for section introductions, the phone, and visual galleries; card reveals are gently staggered. Content is visible by default, so missing scripting, observer, or animation support cannot leave it hidden. Animations use opacity and individual translate, preserving the customization cards’ existing rotations. Reduced-motion preferences disable reveals and CSS motion, including when changed during a visit. Video remains manual-play. Hover details apply only to precise-pointer devices; mobile galleries keep native scrolling.

## App Store badge update

The hero now uses the user-supplied official black “Download on the App Store” SVG badge, preserved unchanged in `public/images/homepage/app-store-badge.svg`. It remains in a disabled button with an accessible coming-soon label until the user supplies the destination URL. The hero browser button uses white text. This supersedes the generic phone-icon control described above.

## Landing page polish

The header now contains a larger logo with no browser button. The hero’s “A multiplayer pickleball strategy game” eyebrow has been removed. The hero action reads “Demo in browser” in white, and the unchanged App Store badge has a visible “Coming soon” caption while its destination is pending. The footer keeps the logo and legal links; the competition tagline and play link are removed. Scroll reveals now include staggered screenshot cards and a gentle settling motion. Browser buttons shimmer, the hero illustration gently floats, and hover details animate step numbers and screenshot cards. Reduced-motion preferences disable all these effects, including when changed during a visit.

## Gameplay video playback

The gameplay video now autoplays muted and loops, with inline playback and native controls retained. Its source has no audio track. This supersedes the manual-play behavior documented above; reduced-motion settings still disable decorative page animations. Browser autoplay policies may require a visitor to use the retained play control.


## Web beta access — October 2, 2026

`src/beta-access.ts` reuses the account creation and sign-in dialogs. Only a session with `user.is_anonymous === false` permits web game entry. Direct `/play`, legacy game links, saved games, and challenge links all pass through the gate before gameplay initializes. Dismissing a dialog leaves an accessible entry screen with signup, sign-in, and a homepage link; it never starts guest gameplay. Sign-out returns to the gate. Authentication failures remain visible and retryable.

The existing register endpoint confirms new accounts immediately, and the existing guest upgrade retains the original account identity. Existing guest-player staging and cloud transfer are reused. The optional `completionDestination` / `returnDestination` arguments preserve the original internal route through account transfer and registration, including invites and saved games. Other callers retain their existing welcome destination. Native auth, access, purchases, and release setup are unchanged. The existing server configuration `MULTIPLAYER_CREATE_ENABLED=true` is required for registration; read-only production verification is recorded below; no configuration change was required.

All homepage play links now say Get Beta Access; an existing-player Sign in link is available in the hero. The App Store badge and request-by-email CTA have been removed from the page. Earlier badge, demo, and autoplay descriptions above are superseded by this section.

The supplied `Desktop/picklebash brand/social posts/01-bodybag.mp4` and `02-character-creator.mp4` were inspected and exported to `public/images/homepage/bodybag.mp4` (540 × 966, 12.25 seconds, approximately 1.2 MB) and `character-creator.mp4` (540 × 1102, 15.63 seconds, approximately 1.6 MB). H.264, 30 fps, approximately 850 kbps target bitrate, progressive playback, no audio track. Supplied matching covers are resized JPEGs. Originals are untouched. All three homepage clips use native controls, muted inline playback, no autoplay/loop, and `preload="none"`. Playing one pauses the others; leaving the viewport or backgrounding the page pauses playback.

### Verification and release scope — October 2, 2026

The release is isolated from concurrent iOS/Rally Studio work on production base `26f49c5`. Its canonical `npm test` passed **914/914 tests**, and client/server typechecks, production build, migration-version checks, design-token checks, and `git diff --check` passed. The existing large-chunk and 3.55:1 primary-color contrast advisories remain. Earlier shared-checkout testing needed a temporary CSS loader for an unrelated scene change; the isolated release needs no workaround.

Nineteen isolated browser scenarios cover direct entry, signup/sign-in, dismissal/reentry, reload/back, registered and anonymous sessions, invite/return routes, and native-platform bypass. Both new videos decoded/played and mobile/desktop layouts were inspected. The browser fixture replaces auth persistence and the game-import boundary; it is a local test server only. Current browser verification uses the supported Codex in-app browser.

The existing purchase sandbox (`drdvwfjkbyvfqnmxkksl`) initially lacked required application migrations and public players. With explicit approval, seven reviewed migrations were applied in one transaction; count assertions preserved existing users, players, matches, and ownership. Four disposable public test players were added. No production database changes were made. The real local app uses sandbox auth and server APIs with analytics, purchases, and community bots disabled only for that preview.

Real signup created a confirmed, non-anonymous session, immediately reached the game menu and rendered solo court, and successfully played a serve. Username/password sign-in, registered-session direct entry, logout re-gating, and challenge-route preservation passed. An unconfirmed account returned `email_not_confirmed`, received no session, and remained gated. Anonymous users remained gated. Guest signup retained the original account UUID and saved player appearance/skills, then returned to its invitation. The invitation was accepted with that saved player, opened the real court, and persisted a first-turn API action from version 0 to 1. The isolated release restored the saved match after sign-in. Native branching was tested in a browser; physical iOS testing remains unrun and no native files or Apple submission settings changed.

Before release, read-only Railway inspection confirmed production registration is already enabled (`MULTIPLAYER_CREATE_ENABLED=true`) and client/server Supabase URLs match production project `vwdtfnljcjbyokdvjiea`. No hosted configuration changes were needed. Publishing uses the existing GitHub main → Railway workflow; only the scoped beta gate, auth return-route support, homepage assets/copy, tests, and these references belong in this release.

Local evidence remains in `artifacts/beta-access/`: browser results, screenshots, build/test logs, guest-upgrade verification and invitation first-turn verification. It contains test artifacts and is not part of the shipped bundle. The isolated sandbox-connected review preview is `http://127.0.0.1:5191/`; the shared-worktree sandbox preview is `http://127.0.0.1:5189/`.

### Shared phone frames and account icons — October 2, 2026

Both additional homepage clips reuse the existing `.marketing-phone` wrapper and decorative `phone-frame.svg`. Shared video sizing and `object-fit:contain` preserve each source’s full aspect ratio within the phone screen; the character-creator clip is letterboxed rather than cropped. Playback controls, muted manual playback, `preload="none"`, and the stacked mobile layout remain in place. Shared account/HUD icon colors now load through `hud-button.css` before signup/sign-in appears, as well as during gameplay. Build/typechecks and design checks passed; fresh desktop/mobile in-app-browser visual verification was blocked by unavailable browser tools in the follow-up execution context.
