import type {AdminTodo} from '../../src/admin-todos-contract';
/** Project BACKLOG.md plus the build-20 audit only. Server-only; never import into browser code. */
export const INITIAL_ADMIN_TODOS:AdminTodo[]=[
  {
    "id": "backlog-1",
    "title": "Theme undo restores the original player customizations",
    "notes": "Setup preserves saved designs, but current Undo restores the previous theme, which can leave players themed after multiple changes. In solo and friends setup, apply two different themes and Undo: restore the starting player appearance, including custom clothing, hair, accessories and paddle. Saved roster designs and the other account's players remain unchanged. Check existing themed players and manual overrides. Keep court atmosphere selection independent from player-look undo.",
    "group": "next",
    "done": false
  },
  {
    "id": "backlog-2",
    "title": "Player cards work on short phone screens",
    "notes": "Current full-width art, scrolling Close and five-row caption need a mobile pass. On a small portrait iPhone with safe areas, the card and actions fit an intentional layout; Close is readily reachable without hunting through the image. Caption does not dominate the screen. Share/Download/Copy Link remain accessible with a long name/caption. Failed generation and failed publishing clearly differ; publishing retry reuses the generated card, reports progress and enables sharing only after success. Check focus, scrolling and dismissal. Build 20 already separates generation/publishing errors and retries publishing without regenerating. Verify those paths; focus implementation on short-screen layout.",
    "group": "next",
    "done": false
  },
  {
    "id": "backlog-3",
    "title": "Solo completion polish \u2014 build 15",
    "notes": "Compact final score and rematch presentation; duplicate names, analysis and New Game hidden in solo completion. Finish a native solo game; final rally/celebration completes before the result; score and next action are clear. Rematch works, countdown cancellation/backgrounding behaves, and exit returns to the right screen.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-4",
    "title": "Gameplay theme music removed \u2014 build 15; purchase promise corrected in 17",
    "notes": "Solo/friends no longer instantiate theme music or expose its setting. Development-lab playback/assets remain. On iPhone, each theme stays music-free during play, rematch and resume, including with the old music preference enabled. Paddle/ball effects retain their independent sound control. Do not treat development assets as an outstanding gameplay feature.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-5",
    "title": "Early guest signup \u2014 build 15",
    "notes": "iOS-only offer after three completed solo/friends points, once per guest identity, at a safe pause; Not now preserves play. Check fresh solo and friends guests, modal/celebration deferral, dismissal and relaunch. No repeated nagging or mid-shot prompt. Successful registration retains the guest identity, players, progress and current game; existing-account sign-in remains clear. See `tests/guest-progress-prompt.test.ts`.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-6",
    "title": "Invite, turn, resume and rematch loop",
    "notes": "Existing lobby, invitation acceptance, checkpoints, turn controls and rematch coordination. Two physical devices complete a match and rematch. Check first serve/shot clarity, waiting state, hours-apart return, close/reopen, interrupted network, retries/stale clients and authentication recovery. No duplicate turns/rematches or reopened completed game. Do not rebuild the lobby or turn system without a demonstrated failure.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-7",
    "title": "Native notifications and badges",
    "notes": "APNs integration, contextual opt-in, invitation/turn routing, authoritative badges and browser fallback exist; earlier development-device delivery was user-confirmed. Validate the current TestFlight build while foregrounded, backgrounded and terminated: correct recipient/game, no duplicate alerts, appropriate activity/mute suppression, badge clearing, permission denial/retry and account/device switching. Follow [native push checks](NATIVE_PUSH.md); prior development success is not current TestFlight acceptance.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-8",
    "title": "Rivalry history and strategic summaries",
    "notes": "Normalized records, viewer-relative results/streaks, rematch UI, authoritative shot summaries and evidence-qualified story code exist. Verify current hosted migration/backfill/deployment state before labelling anything absent. Two devices see reversed but consistent records, early exits do not count, history survives rematches and older results stay anchored. Story acceptance needs genuine qualifying history and privacy/failure-isolation checks. See [rivalry data](RIVALRY-DATA.md), [story evidence](RIVALRY-STORIES.md) and [ordered plan](RIVALRY-STRATEGY-PLAN.md).",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-9",
    "title": "Analytics and flags",
    "notes": "Typed client/server events, committed fact export, privacy controls and PostHog dashboards/flags are implemented. Validate the invite \u2192 match \u2192 rematch funnel against genuine domain facts, including guest registration, retries, account switches and offline/provider failure. Use existing `turn_completed` semantics rather than adding the old checklist's `turn_taken` alias. Verify ownership, actor grain, deduplication and friend-pair return milestones; distinguish match starts from completed rivalry counts. Follow [analytics](ANALYTICS.md), [architecture](ANALYTICS-ARCHITECTURE.md) and [flag workflow](FEATURE-FLAGS.md); no instrumentation or definition change is authorized here.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-10",
    "title": "Pack purchases, ownership and account safety",
    "notes": "Store/Restore, receipt-conflict preflight (18), deletion requests, reporting and blocking are implemented. Build 18 passed 879 tests and distribution checks. Physical receipt-conflict checks and clean-receipt purchase/restore remain open; prior Apple refund/revocation/saved-choice fallback tests remain deferred, not waived. Validate native deletion/report/block controls without deleting real accounts as a test shortcut. Follow [release gaps](TESTFLIGHT.md), [purchase testing](PURCHASE-TESTING.md) and [account safety](ACCOUNT-SAFETY.md). Metadata validation alone is not full public-billing acceptance.",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-11",
    "title": "Guest-first identity and gameplay quality",
    "notes": "Display names, customizable avatars, cloud roster/guest upgrade, XP/skill budgets and the existing simulation are implemented. On native iOS, new players get into play before account/customization friction; web beta requires registration before play. On both platforms, identity survives return and registration. Player tests confirm understandable serve/shot choices, varied meaningful decisions, believable outcomes and no obvious dominant strategy. Preserve current balance and progression while evaluating; see [XP progression](XP_PROGRESSION.md).",
    "group": "acceptance",
    "done": false
  },
  {
    "id": "backlog-12",
    "title": "Forgot password",
    "notes": "Requested October 2. Existing recovery-link verification and password-update UI live in `src/multiplayer/remote-main.ts`, but the current sign-in dialog has no Forgot password entry and no reset-email initiation was found in application source. Add a discoverable initiation flow and verify the existing completion path on web/iOS: request/reset delivery, valid link, expired/used link, cancellation and retry. Return safely to the same account with its players, games and purchases intact; never create a replacement account or silently switch identities.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-13",
    "title": "Google authentication / sign-in",
    "notes": "Requested October 2. Design Google sign-in and account linking so guest players, progress and active games survive registration, and existing accounts do not duplicate or merge silently. Verify applicable iOS sign-in requirements during design; do not assume Sign in with Apple already exists. Define sign-in, linking, cancellation and recovery acceptance before implementation or OAuth setup.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-14",
    "title": "Drills section",
    "notes": "Requested October 2; scope to define. Decide where Drills appears, what players do and how a drill finishes or gives feedback before scheduling implementation. Prior solo strategy minigame / Decision Quiz ideas\u2014game situations, choices and consequence feedback, potentially generated situations\u2014are context to evaluate, not locked requirements.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-15",
    "title": "Android build",
    "notes": "Requested October 2; future platform work. Define supported devices, native integration requirements, testing and distribution before scheduling the build. Verify game, sign-in, notifications and pack-access behavior on Android; decide its purchase/distribution approach rather than assuming it matches iOS. No Android build or store submission is authorized by this backlog entry.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-16",
    "title": "Make Stripe payments work for web",
    "notes": "Requested October 2; supersedes the earlier no-web-sales goal. Inspect existing checkout, provider readiness, webhook handling and shared entitlements before deciding what needs fixing. Verify sandbox checkout success/cancellation/failure, verified ownership across web and iOS, duplicate-purchase protection, refund/revocation and account isolation without disturbing Apple purchases. Confirm pricing, tax, legal and rollout configuration before seeking separate authorization to enable live payments; no credentials or payment switches change as part of backlog grooming.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-17",
    "title": "Golden Pass \u2014 $4.99/month, access to all new content",
    "notes": "Requested October 2; future subscription concept. Define what \u201call new content\u201d covers, whether existing content is included, cancellation/expiry access rules and interaction with permanently purchased packs. Preserve current purchases; do not assume they are removed or converted. Define purchase, renewal, cancellation and entitlement acceptance before implementation.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-18",
    "title": "VIP pass \u2014 $9.99 option for price anchoring",
    "notes": "Requested October 2; billing period and benefits undecided. Preserve the proposed price and anchoring intent. Define differentiated real benefits, billing period, content coverage and access rules before implementation; do not assume $9.99/month or copy Golden Pass benefits. Resolve its relationship to Golden Pass and permanent purchases as a product decision.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-19",
    "title": "Shorter-match pacing",
    "notes": "Compare first-to-11, first-to-7 and first-to-5. Measure turn, rally and match length; test satisfying one-shot turns, same-session play and hours-apart replies. Select a default only after player evidence. Changing target/scoring must preserve match/rematch consistency.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-20",
    "title": "Pirate theme for the Fun Pack",
    "notes": "Requested September 29. Define the theme's appearance/court additions and acceptance before scheduling it. Preserve the existing one-time pack model; no new price or bundle promise is implied.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-21",
    "title": "Player-specific backhand strengths/weaknesses",
    "notes": "Requested September 20. Extend beyond the low-contact penalty while respecting handedness, position, height and shot type. Equivalent strong/weak-backhand trials show a tactical advantage without guaranteed failure. Keep defender ratings out of the shot selector's Pressure indicator.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-22",
    "title": "Profile \u201cYour Game\u201d / shot-mix insights",
    "notes": "Existing aggregate/UI code; profile entry currently hidden. Decide player value, placement, visibility/access policy and understandable sample/denominator copy before restoring the entry. No subscription or new stats monetization is assumed. Preserve private scopes and incomplete-history disclosure; see [shot mix](SHOT-MIX.md).",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-23",
    "title": "More strategy stories, sharing and co-presence",
    "notes": "Initial history/summary/story foundations already exist. Follow the later packages in [the rivalry plan](RIVALRY-STRATEGY-PLAN.md); qualify evidence, privacy and player value before expanding story families, sequences or sharing. Current first-story acceptance stays in the section above.",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-24",
    "title": "China mainland and Vietnam expansion",
    "notes": "Required future markets; no target date. Obtain the applicable approvals/publishing support, localization/data review, aligned app/IAP availability and regional tests before distribution. Temporary launch exclusions do not abandon either market; see [market follow-up](TESTFLIGHT.md#required-future-markets-china-mainland-and-vietnam).",
    "group": "later",
    "done": false
  },
  {
    "id": "backlog-25",
    "title": "Remote preview infrastructure",
    "notes": "Owner-deferred. Do not provision or restart the paused preview branch without reprioritization.",
    "group": "deferred",
    "done": false
  },
  {
    "id": "backlog-26",
    "title": "Recently completed lobby browsing",
    "notes": "Excluded from V1; existing rivalry/history results do not reopen this scope.",
    "group": "deferred",
    "done": false
  },
  {
    "id": "backlog-27",
    "title": "Additional modes and progression",
    "notes": "Archived: Career/Arcade, tournaments, stamina/fatigue, scouting and extra progression. Existing XP and skill budgets are implemented.",
    "group": "deferred",
    "done": false
  },
  {
    "id": "backlog-28",
    "title": "Voice, real-time multiplayer and deeper simulation",
    "notes": "Deferred unless reprioritized.",
    "group": "deferred",
    "done": false
  },
  {
    "id": "backlog-29",
    "title": "Earlier Plus subscription details",
    "notes": "Archived. Golden Pass/VIP are distinct future concepts; preserve permanent pack purchases.",
    "group": "deferred",
    "done": false
  },
  {
    "id": "build20-roster",
    "title": "Protect saved players from stale roster overwrites",
    "notes": "Implemented and released in build 20, source 9a6fb1b. Revision checks, idempotent saves and durable conflict recovery are present. Build 20 submitted for review; broad device acceptance remains tracked separately.",
    "group": "next",
    "done": true
  }
];
