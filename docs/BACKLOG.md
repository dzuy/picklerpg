# PickleBash V1 launch checklist

This is the canonical checklist for building, validating, and finalizing the PickleBash V1 launch. When deciding what to build next, use this list as the source of truth.

Check an item only after it has been implemented and verified at the level implied by the item. Features that already exist still remain unchecked until their V1 behavior has been explicitly confirmed.

## Product direction

**Social-first asynchronous pickleball with friends.** The core loop is invite → play a short strategic match → return when it is your turn → finish → play again. Prioritize making that loop easy, enjoyable, and worth returning to.

Owner direction, October 1, 2026: iOS is the primary product with pack sales; web is a lower-priority demo without pack sales. This is planning context. The platform/sales split has not been implemented or deployed by the guest signup prompt work.

Local iOS signup follow-up: after three completed points in solo or friends play, offer guests the existing username/email/password account modal with save-progress copy and **Not now**. Wait for point playback/celebrations, defer to other dialogs, and offer once per guest identity. Reuse the identity-preserving guest upgrade. Native/device validation and inclusion in the next TestFlight batch remain pending; build 13 does not contain this follow-up. Other reported UI polish and theme-music removal remain separate backlog work.

The ordered implementation and acceptance plan for persistent rivalries, authoritative shot-selection analytics, evidence-qualified strategy stories, sharing, and co-presence is [Rivalry and strategy stories](RIVALRY-STRATEGY-PLAN.md). Follow its reviewed implementation sequence (the phase numbers identify work packages); this launch checklist remains the source of truth for overall V1 readiness.

## Core social loop

- [ ] Invite a friend in a few taps.
- [ ] Recipient gets into the match quickly.
- [ ] First turn is obvious.
- [ ] Waiting state is obvious.
- [ ] Turn notification arrives reliably.
- [ ] Notification opens the exact game.
- [ ] Match resumes correctly after leaving.
- [ ] Match ends cleanly.
- [ ] Rematch is one obvious tap.
- [ ] Rivalry record updates immediately.

## Games lobby

- [x] **Your Turn** games are visually prioritized.
- [x] **Waiting** games are clearly different.
- [x] Opponent name/avatar is prominent.
- [x] Current score is visible.
- [x] One tap opens a game.
- [x] Multiple simultaneous games are easy to scan.
- ~~Recently completed games are accessible.~~ **Removed from V1 scope.**
- [x] Start New Game is obvious.
- [x] No unnecessary traditional-game menu clutter.

## Navigation improvements

- [x] **Remove the Home icon from the main navigation** (added and verified locally September 29, 2026).
- [x] **Combine Play and Friends into one screen called “Play”** (added and verified locally September 29, 2026). My Games, My Friends, and Community share the existing top tab system with fixed tab positions and an animated pink highlight. The title was simplified from Play With Friends to Play on September 29; reduced-motion preferences skip the animation. My Games retains the games list; Create a New Game remains in the top-right corner. One main navigation entry replaces the separate Play and Friends entries; existing Friends/Community links still open the matching tab.
- [x] **Add Store to the main navigation and remove it from Profile** (added September 29, 2026). Store sits immediately left of Profile and displays its contents on a full page without a modal close button. The Profile shortcut has been removed; verified locally.

## Turn experience

- [x] Player instantly knows which team they control.
- [x] Player instantly knows whose turn it is.
- [x] Available shot choices are obvious.
- [x] Target selection is obvious.
- [x] Submitted shot has clear feedback.
- [x] Opponent's previous shot is understandable when returning later.
- [x] Transition from opponent action → your decision feels natural.
- [x] No accidental double-submit.
- [x] Refreshing never changes the result.

## Async pacing

Test explicitly:

- [ ] How long does one turn feel?
- [ ] How many turns does an average rally take?
- [ ] How many turns does an average match take?
- [ ] How long does a real async match take to finish?
- [ ] Does first-to-11 feel too long?
- [ ] Test first-to-7.
- [ ] Test first-to-5.
- [ ] Does one-shot-per-turn remain satisfying?
- [ ] Does a match still feel good when players reply hours apart?
- [ ] Does it feel fast when both players happen to be online?

## Match completion

Implementation available in the [local rivalry playtest](RIVALRY-PLAYTEST.md). These acceptance checks remain open until player testing and hosted rollout.

- [ ] Winner/result is unmistakable.
- [ ] Final score is prominent.
- [ ] Head-to-head series is shown.
- [ ] Current streak is shown.
- [ ] Total matches together is shown.
- [ ] **REMATCH** is the primary CTA.
- [ ] Rematch preserves the relationship/history.
- [ ] Starting Match #2 requires almost no setup.

## Identity

- [ ] Player has a display name.
- [ ] Player has recognizable avatar/character.
- [ ] Opponent always feels like a real person.
- [ ] Identity carries across games.
- [ ] Customization does not block getting into the first match.

## Notifications

- [ ] Only notify when action is required.
- [ ] Never notify repeatedly for the same turn.
- [ ] Suppress push when player is already active.
- [ ] Notification names the opponent.
- [ ] Notification deep-links correctly.
- [ ] Push works after app/browser is closed.
- [ ] Denied/disabled notification state has understandable UX.

## Onboarding

- [ ] New user understands how to serve.
- [ ] New user understands shot selection.
- [ ] New user understands that turns are asynchronous.
- [ ] New user understands they can leave and come back.
- [ ] Account/profile friction comes after first useful interaction.
- [ ] No lengthy tutorial before playing a friend.

## Strategic/gameplay quality

- [ ] Outcomes feel like believable pickleball.
- [ ] Shot choices create meaningful decisions.
- [ ] No obvious dominant choice.
- [ ] Different rallies feel meaningfully different.
- [ ] Randomness adds uncertainty without feeling arbitrary.
- [ ] Equal multiplayer attributes keep matches fair.
- [ ] UI never makes the game feel like training/homework.

## Reliability

- [ ] Two devices can play through a complete match.
- [ ] Closing/reopening never loses state.
- [ ] Network failure does not duplicate a turn.
- [ ] Stale clients recover cleanly.
- [ ] Completed games cannot accidentally reopen.
- [ ] Rematches do not create duplicate matches.
- [ ] Authentication recovery does not lose active games.

## Analytics — minimum

Instrument:

- [ ] `invite_sent`
- [ ] `invite_accepted`
- [ ] `match_started`
- [ ] `turn_taken`
- [ ] `match_completed`
- [ ] `rematch_started`

Track friend pairs reaching:

- [ ] Match #2 started.
- [ ] Match #3 completed.
- [ ] 10 completed.
- [ ] 25 completed.
- [ ] 100 completed.

## Scope guardrails

Career Mode, Arcade Mode, RPG progression, tournament ladders, skill unlocks, stamina/fatigue, scouting, and long-term character development are archived ideas, not V1 launch requirements. Voice improvements, real-time multiplayer, and deeper physical simulation are also outside the V1 launch scope unless explicitly reprioritized.

## Future gameplay improvements

- [ ] **Player-specific backhand strengths and weaknesses** (added September 20, 2026). Extend the current low-backhand penalty so forehand/backhand contact and each defender’s ability meaningfully affect return execution at normal heights too. Respect handedness, positioning, contact height, and shot type; targeting a weak backhand should provide a tactical advantage without guaranteeing failure. Validate strong versus weak backhands in equivalent situations. Keep defender skill ratings out of the shot selector’s Pressure indicator so players learn opponents’ weaknesses through play. Backlogged for later; not a new V1 launch requirement.

## PickleBash+ and monetization

- [ ] **Add a pirate theme to the Fun Pack** (added September 29, 2026).

- [ ] **Bring back “Your Game” on the profile page** (added September 23, 2026). Keep the section hidden until the PickleBash+ offering and monetization approach are defined. Then revisit its shot-mix insights and decide which features belong in the free experience versus PickleBash+ before restoring it. Deferred; not a V1 launch requirement. Existing shot-mix UI remains in `src/multiplayer/shot-mix-view.ts`; the profile entry point is `src/multiplayer/profile.ts`.

## History and references

- [Historical roadmap and implementation log](BACKLOG-HISTORY.md) — original numbering and older decisions; not an active task list.
- [Original supplied roadmap](roadmap-source.txt).
- [Multiplayer architecture and acceptance plan](../TURN_BASED_MULTIPLAYER_PLAN.md).
- [Remote implementation and rollout notes](PHASE-3-REMOTE.md).
- [Push notification implementation and acceptance notes](PWA-TURN-NOTIFICATIONS.md).

Current user-confirmed status and this checklist supersede older pending-deployment, pending-playtest, and roadmap-priority notes in the historical documents.
