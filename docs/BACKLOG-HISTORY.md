# Historical simulation and solo roadmap

Archived when PickleBash shifted to a social-first roadmap. This is a record of earlier plans and implementation notes, not the current build order. Unchecked items here are not active commitments. See [the current backlog](BACKLOG.md). Original numbering and historical claims below are preserved.

# Pickle RPG backlog

Strategy first. Simulation second. Presentation third.

This is the agreed build order from the supplied roadmap. Preserve the numbering when updating progress. Check an item only after its acceptance criteria are implemented and verified; an existing prototype or type stub alone does not complete it. Original wording is preserved in [roadmap-source.txt](roadmap-source.txt).

## Current increment

**Player Design phase implemented.** Completed the six ordered increments in [PLAYER-DESIGN.md](PLAYER-DESIGN.md): saved roster, customizable athlete, live creator, skill sliders, game integration, then verification.

**Phase 8 visual pass ready for playtest.** Steps 48–54 are implemented; step 47 has verified dimensions and player scale, with final feel awaiting playtest. See [PHASE-8.md](PHASE-8.md).

**Ordinary-play simulation calibration complete.** All eleven skills have current controlled and full-game coverage; equal, mixed-roster, handedness, personality, and intelligence variants completed certification. Progression costs have explicit utility tiers. The rare equal-90 long-rally tail is accepted as a deferred edge case and is not a calibration gate. See [CALIBRATION-CERTIFICATION.md](../evaluation/CALIBRATION-CERTIFICATION.md).

Custom commands work alongside canned menus in full games and practice. Local and LLM parsers produce reviewed, validated shot intent; impossible contacts explain why rather than auto-substituting. Frequently played commands become quick actions. Left/right spin, spin strength, topspin drop, and slice float now affect flight; fine player-side targets remain disclosed approximations. See [CUSTOM-SHOTS.md](CUSTOM-SHOTS.md).

**Phase 7 voice increment implemented; further work deferred to the far future.** Added microphone input, local concise/richer commands, partner instructions, hands-free contact listening, and compact voice view. Local Whisper now works in the in-app browser, with flat-serve recognition corrections. User voice accuracy, end-to-end latency, and whole-game voice acceptance remain playtest gates. See [PHASE-7.md](PHASE-7.md).

## Current priorities — updated 2026-09-13

- Keep **Open Play** as the active development focus for the foreseeable future: free-form tactical play, match flow, and continued gameplay tuning.
- The **targeting wheel** is the preferred shot interface. Remove the legacy shot dock and its Show shots expander.
- De-prioritize voice work to the far future; it is not a gate for current releases.

## Additional requested features

- [ ] Sound effects
- [ ] Music
- [x] Game end screen — prominent final score, winning player names, full-game replay, and New Game; win-by-two scoring verified.
- [x] Authentication / account creation — guest-first accounts, passwordless email protection/sign-in, cloud player sync, match history, and sign-out are implemented. Password accounts are deferred.
- [x] Ordinary-play simulation calibration — skill direction, side/role fairness, mixed rosters, handedness, personalities, and progression-value tiers certified. High-skill marathon rallies are deferred.
- [ ] Updated design and consistent **PickleBash** naming everywhere — screens, navigation, page titles, metadata, and player-facing copy.
- [ ] Game modes
  - [ ] **Open Play** — continue developing the current free-form format as the primary near-term focus.
  - [ ] **Career Mode** — define and build a progression-based mode.
  - [ ] **Arcade Mode** — define and build an arcade format.
- [ ] **Online, turn-based multiplayer** — plan and implement online match turns and shared match state; turn timing and detailed rules remain to be defined.

## Playtest decisions

- Keep canned menus for now. Future open-ended input must allow unconventional choices, including kitchen lobs and aggressive roll speed-ups; sensible recommendations must not become mandatory choices.
- Remove home-team auto-play. Even obvious decisions require explicit user action. Recommendations may be added later, but never auto-submit.
- Other players felt too strong. Initial profiles lower movement and introduce shot-specific weaknesses; continue tuning from actual play.

## Milestone gates

- [x] **M1 — Reusable shot/rally engine:** Phase 1 items 1–7 implemented; current guided rally becomes a scenario powered by the same engine.
- [x] **M2 — Complete unscripted point:** generated shots, rule-based responses, contextual decisions, movement, and reliable point endings (items 8–12).
- [x] **M3 — Complete responsive game:** real doubles scoring and a full game against opponents that respond to tactical state (items 13–14). Rule-based AI is sufficient here; LLM integration follows in Phase 4.

## Change log

- Player Design visual redesign: adopted the supplied character/mockup references, added visual outfit/equipment choices and look presets, rebuilt athlete proportions and hair, and preserved existing saved profiles with outfit defaults. See [PLAYER-DESIGN.md](PLAYER-DESIGN.md).

- Phase 8 visual pass: added shot-specific articulated swings and reactions, camera presets, frame-rate-independent tracking with reduced-motion support, bounce/height/speed cues, and distance-aware ball sizing. Verified low and overhead views, mobile framing, and 125 automated tests. Court-scale feel remains a playtest gate.

- Player Design: added a saved local roster, live avatar editor, all eleven skill sliders, and explicit Save & play integration. All six PD increments verified; see [PLAYER-DESIGN.md](PLAYER-DESIGN.md).

- 2026-09-11: Continued the 3D pass with smooth articulated athletes, distinct skin/hair palettes, numbered jerseys, detailed shoes and paddles, displacement-driven leg motion, cylindrical net posts and slatted benches. Raised kitchen/sideline markings above the surface. Verified the tactical and close views and rally playback; production build and all 110 tests pass. Phase 7 voice remains deferred.

- 2026-09-11: Deferred Phase 7 by playtest decision and began Phase 8 with a visual-readability pass: richer court materials and lighting, clearer player teams, brighter ball/trail treatment, more expressive contact motion, and subtle automatic camera tracking that yields to manual control.

- Completed Phase 3 in order: rating feedback, contact difficulty, selectable archetypes, and partner recommendations/movement tendencies.

- Playtest revision: removed home auto-play, saved open-ended choice feedback without expanding menus, and completed item 15 with distinct visible player profiles.

- 2026-09-11: Completed items 11–14 and integrated items 7–10 into Full game mode. Added reachable contacts, side-out doubles scoring, neutral automation and game completion. Next: Phase 3.

- 2026-09-11: Completed item 10. Added contextual user menus, shared intent validation and prepared-contact playback. Next: item 11.

- 2026-09-11: Completed item 9. Added legal rule-based opponent choices and playable prepared-contact previews. Next: item 10.

- 2026-09-11: Completed item 8. Replaced guided movement templates with tactical positioning. Next: item 9.

- 2026-09-11: Completed item 7. Added reusable seeded execution and Shot lab comparison controls. Next: item 8.

- 2026-09-11: Completed item 6. Added full-intent trajectory generation, live flight controls/metrics and generated guided-rally integration. Next: item 7.

- 2026-09-11: Completed item 5. Added state-aware target resolution and lab controls; separated ground landings from raised player-contact endpoints. Next: item 6.

- 2026-09-11: Completed item 4. Implemented family flight profiles and contact gates; added an unscored browser Shot lab. Next: item 5.

- 2026-09-11: Completed item 3. Added semantic player/zone targets, tactical purpose, aggression, strict parsing and shared JSON Schema. Separated authored aim points; bumped game state to v2 for the nested intent contract. Next: item 4.

- 2026-09-11: Completed item 2. Added versioned snapshots, ball kinematics, player profiles and event history; migrated renderer, providers, browser tools and tests. Next: item 3.

- 2026-09-11: Completed item 1. Extracted the guided scenario from the engine; added explicit contact/outcome provider contracts and tactical stages. Verified branching options, partner turns, repeatable exchanges, either-team outcomes, and original browser playthrough. Next: item 2.

- 2026-09-11: Saved the full supplied roadmap. Began item 1. Existing prototype provides a regulation court and one guided pattern; later roadmap items are intentionally not marked complete merely because placeholders exist.

## Phase 1 — Turn the 5-shot prototype into a real rally engine
- [x] **1.** Replace the scripted sequence with a reusable rally state machine
   - serve
   - return
   - third
   - fourth
   - transition
   - kitchen exchange
   - attack/counter/reset
   - point end
- [x] **2.** Create a canonical game-state object
   - ball position / height / velocity
   - four player positions
   - player facing / handedness
   - score
   - current hitter
   - team possession
   - rally history
   - shot history
   - player skills
   - opponent tendencies
- [x] **3.** Create a canonical shot-intent object
   Every input method should eventually resolve to this:
   - shot type
   - target player / target zone
   - pace
   - trajectory / shape
   - tactical intent
   - aggression level
- [x] **4.** Build basic shot families
   - serve
   - drive
   - drop
   - dink
   - volley
   - reset
   - lob
   - overhead
   - counter
- [x] **5.** Build targeting
   - middle
   - crosscourt
   - line
   - wide
   - body
   - feet
   - backhand side
   - open court
- [x] **6.** Make trajectories generated from shot intent instead of hard-coded animation paths
- [x] **7.** Add execution variance
   Separate:
   - tactical choice
   - execution quality
   Execution should depend on:
   - player skill
   - ball difficulty
   - contact height
   - movement/balance
   - fatigue later
   - controlled randomness
## Phase 2 — Make a complete playable point
- [x] **8.** Automatic positioning between contacts
   No manual positioning decisions yet.
- [x] **9.** Opponent shot selection
   Start rule-based if needed before LLM integration.
- [x] **10.** Contextual decision menus
       Only show sensible shots for the current situation.
- [x] **11.** Preserve user control at every team contact (revised after playtest)
       No automatic home-team shots; future recommendations still require a click.
- [x] **12.** Point-ending logic
    - winner
    - net
    - out
    - double bounce
    - failed return
    - unreturned attack
- [x] **13.** Real pickleball scoring
    - doubles serve rotation
    - server numbers
    - side-out scoring
    - game to 11 / win by 2
- [x] **14.** Play a full game against one generic opponent team
That is probably the next major milestone:
I can play an unscripted game of pickleball entirely by making tactical shot decisions.

## Phase 3 — Player skill system
- [x] **15.** Create initial player ratings
       Keep the first version compact:
    - serve
    - return
    - drive
    - drop
    - dink
    - reset
    - volley
    - counter
    - overhead
    - movement
    - hands
- [x] **16.** Make ratings visibly matter
       A 92 drop player and a 62 drop player should create noticeably different outcomes.
- [x] **17.** Add shot difficulty
       Same character should perform differently on:
    - comfortable forehand
    - stretched forehand
    - low backhand
    - moving backward
    - transition ball at feet
- [x] **18.** Add player archetypes
    - attacker
    - right-side setup player
    - grinder
    - all-court
    - defensive/reset specialist
- [x] **19.** Add partner skill and tendencies
       Partner should not feel like an extension of the user.
## Phase 4 — LLM opponent brain
- [x] **20.** Define the structured tactical snapshot sent to the LLM
- [x] **21.** Have the LLM choose opponent intent — live Codex-plan provider verified; direct API path remains mock-tested
       The LLM chooses what it wants to do.
       The simulation determines whether it succeeds.
- [x] **22.** Never allow the LLM to alter physical game state directly
- [x] **23.** Add short-term match memory
       Opponents recognize:
    - repeated drives
    - preferred targets
    - weak backhand
    - frequent speed-ups
    - aggressive crashing
    - predictable patterns
- [x] **24.** Let opponents adapt during the match
- [x] **25.** Create opponent personalities
       Examples:
    - Banger
    - Grinder
    - Technician
    - Gambler
    - Wall
    - Chess Player
- [x] **26.** Vary tactical intelligence independently from physical skill
This is when the game should start feeling like:
I’m playing pickleball against ChatGPT.

## Phase 5 — Pattern-rep game design
- [x] **27.** Create a pattern library
       Examples:
    - pressure middle → weak block → finish
    - third-shot drive → fifth-shot drop
    - pull opponent wide → attack gap
    - dink behind middle-shading player
    - attack high ball / reset low ball
    - target weak backhand
    - counter aggressive speed-up
    - one-up/one-back exploitation
- [x] **28.** Generate variations of the same pattern
       Do not repeat identical setups.
- [x] **29.** Add guided practice mode
       The current prototype is already essentially the first version of this.
- [x] **30.** Add free-play mode
       No declared lesson. Patterns emerge naturally.
- [x] **31.** Track pattern exposure
       Not just wins/losses:
    - situations encountered
    - choices made
    - recurring tactical mistakes
    - successful recognitions
- [x] **32.** Add lightweight post-point feedback
       Keep it short:
    - Good choice
    - Risky
    - Better target available
    - Correct idea, poor execution
- [x] **33.** Add optional deeper replay analysis
       Never force it during play.
## Phase 6 — Free-form shot selection
- [x] **34.** Add text command input
Example:
“Body bag the right player with a hard drive.”

- [x] **35.** LLM parses free-form language into shot intent
- [x] **36.** Support natural pickleball language
    - rip it middle
    - dink behind him
    - jam her right hip
    - drop to his backhand
    - roll at her feet
    - lob the left player
- [x] **37.** Validate commands against current game state
       The player cannot magically overhead an ankle-high ball.
- [x] **38.** Handle impossible commands gracefully
       Infer closest valid intent or explain briefly.
- [x] **39.** Allow menu + custom input simultaneously
       Menus remain the fast default.
       Free-form is the creative escape hatch.
- [x] **40.** Learn frequently used custom tactics
       Eventually surface them as quick actions.
## Phase 7 — Voice-only mode (deferred to the far future)
Existing voice features remain implemented. Further voice development and outstanding playtest gates are de-prioritized and do not block Open Play work.
- [x] **41.** Speech-to-intent input
       Local Whisper capture/transcription verified in the in-app browser; browser speech remains optional.
- [ ] **42.** Make voice commands fast enough that they don’t break rally flow
- [x] **43.** Support concise commands
    - “Drive middle.”
    - “Drop crosscourt.”
    - “Jam him.”
    - “Reset.”
- [x] **44.** Support richer commands
    - “Hard drive at her right hip.”
    - “Pull him wide and keep it soft.”
- [x] **45.** Add voice communication with your AI partner
    - “Target her backhand.”
    - “Crash when I drive.”
    - “Stop speeding up at him.”
- [ ] **46.** Eventually support near-zero-UI voice mode
       Court + score + rally + voice.
       Compact view and hands-free controls implemented; whole-game voice playtest pending.
## Phase 8 — Improve the 3D representation
- [ ] **47.** Tune court dimensions and player scale until they feel unquestionably right
       Regulation dimensions and roughly 1.85 m capped athletes verified; courtside framing and ball display scale improved. Final feel awaits user playtest.
- [x] **48.** Tune tactical camera
       Probably more important than character art.
- [x] **49.** Improve ball readability
    - arc
    - bounce
    - height
    - speed
    - shadows
    - trajectory visibility
- [x] **50.** Add subtle camera behavior
       Small reframing only.
       Never disorient the player.
- [x] **51.** Replace placeholders with stylized low-poly/cartoon athletes
- [x] **52.** Improve basic swing animations
       Prioritize readability over realism.
- [x] **53.** Add recognizable reactions
    - jammed
    - stretched
    - late
    - pop-up
    - overhead finish
- [x] **54.** Add simple environments
       Do not overbuild venues.
## Phase 9 — RPG / progression layer
Only after the core strategy game is genuinely fun.
- [x] **55.** Player creation / roster — implemented and verified in the Player Design phase.
- [ ] **56.** Skill progression
- [x] **57.** Different partners — selectable in matchup setup.
- [x] **58.** Opponent teams — selectable players in matchup setup; career-specific teams remain part of future Career Mode design.
- [ ] **59.** Tournament ladder
- [ ] **60.** Unlock harder tactical patterns
- [ ] **61.** Player strengths/weaknesses
- [ ] **62.** Stamina/fatigue
- [ ] **63.** Scouting
- [ ] **64.** Longer-term tendencies and style development
## What I would tell Codex not to build yet
Do not prioritize:
- photorealistic graphics
- sophisticated physical paddle collision
- motion capture
- equipment simulation
- large environments
- crowds
- cosmetics
- real-time multiplayer — online turn-based multiplayer is requested above
- manual player movement
- complex RPG inventory
- character creator
- dozens of stats
- advanced positioning controls
Those are all downstream.
## The next three milestones should be:
- [ ] Milestone 1: Turn the existing scripted 5-shot sequence into a reusable shot/rally engine.
- [ ] Milestone 2: Play one complete unscripted point using contextual decisions.
- [ ] Milestone 3: Play a complete game against an AI opponent whose decisions respond to the tactical state.
Once those three work, you have the actual game. Everything after that makes it deeper or prettier.

## Simulated DUPR display

- Added character/name hover and keyboard-focus estimates derived from current skills; see [research and mapping](SIMULATED-DUPR.md).
- Follow-up: validate provisional attribute anchors against real rated players and match performance. No accurate or official DUPR conversion is claimed.

- Behavior benchmark v1: simulated levels now control placement, lift error, mishits and pressure tolerance. Balanced 3.0/4.0/5.0 lab presets and 2,000-seed consistency regressions provide tuning targets. Playtest follow-up: tune net and depth consistency by shot/contact, not just the aggregate rating.

- Development provider: GPT-5.6 Luna through the existing ChatGPT-signed-in Codex CLI, live smoke-tested without API key. 86 tests pass. Direct API can be enabled later explicitly.

- Custom-shot UX revision: one Play custom shot action, automatic local/LLM routing, no preview confirmation. Valid commands execute immediately; invalid commands explain without substituting. Quick actions follow the same flow.

## Shot selection UI follow-up

- [ ] Remove the legacy “Choose your shot” dock and its Show shots expander entirely. User approved removal on 2026-09-13; the targeting wheel is the preferred system. Preserve custom text input and other still-used controls when removing legacy UI.

## Individual player histories — 2026-09-13

- Implemented stable player IDs and historical names in new match results, with a player selector in Settings → Match history. Records show each player's own team score, wins, losses, and early exits; renames do not split histories.
- Database migration `supabase/migrations/202609130004_player_history.sql` applied by the user; Supabase SQL Editor success verified on 2026-09-13. Full new-game save/readback remains a playtest check.
- Legacy name-only results stay account-only; do not infer player identity from matching names.
- Current attribution uses the lineup at game end. Before supporting progression with mid-game substitutions, define and implement participation credit.
- Player histories provide the match ledger for future progression; skill growth and per-player XP awards remain unfinished.

## Automated match evaluation — 2026-09-13

- Added a seeded, headless evaluation runner using actual auto-play decisions, paired side/position rotations, uniform skill matchups, and isolated comparisons for all eleven attributes. See [GAME-EVALUATION.md](GAME-EVALUATION.md).
- Reports include completion limits, win rates, home advantage, margins, shutouts, slot-level shot/error metrics, and optional shot traces. Evaluation games never enter account history.
- Next: use the equal-skill controls to fix role bias, then assess skill sensitivity with larger seed batches before implementing progression.

## Auto-play parity fix — 2026-09-13

- Unified all four automatic players' shot menus, decision policy, intelligence/personality settings and recent-choice memory. Removed the partner-only recommendation bias from unattended play while retaining explicit partner instructions.
- Automatic receivers now use the same contact-selection path on both sides; manual home reception choices remain. Full auto-play uses shared local tactics and does not request opponent-only background strategy.
- Restricted the manual opponent's historical crash-to-lob preference to current slow, lower contacts with both defenders near the kitchen, preventing an unconditional persistent lob bonus.
- Evaluations now test either opening server, with side/position swaps and seed-block uncertainty. Added parity regressions and an option to skip visual replay capture in evaluations, verified to preserve outcomes.
- Build and 246 tests pass. Fresh-seed balance results are recorded in `evaluation/BALANCE-RESULTS.md`. Individual-skill calibration remains separate follow-up work.

## Drive and movement calibration — 2026-09-13

- Added repeatable controlled execution, reach-grid, and actual reception-planning checks (`npm run evaluate:skills`).
- Confirmed drive and movement curves already improve accuracy/reach. Larger pre-change match samples reverse the misleading conclusion from three seeds.
- Fixed faster players taking earlier, more rushed contacts: prefer prepared contacts, retain emergency options, never select from sampled miss outcomes.
- Matched skill reruns, lower-rating held-out fairness, and high-rating limit rechecks are documented in `evaluation/SKILL-CALIBRATION.md`.
- Follow-up: high-skill rally length (one checked seed took ~46 simulated minutes), larger high-rating fairness samples, and remaining individual skills before progression calibration is considered complete.

## High-skill rally calibration — 2026-09-13

- Added completed-rally shot counts/durations and mean, 95th-percentile and maximum lengths to automated evaluation reports.
- Made lob preference account for defender coverage and added legal overhead feet targets for every player slot.
- Tactical changes alone did not address extreme rallies. Removed the squared hands-weakness factor from timing/pace swing pressure, retaining it for prepared-swing reliability; strong players now retain meaningful risk under pressure.
- Matched high-skill mean rally length fell from 48.2 to 27.1 shots, with a 27.7-shot mean on fresh seeds. Matched 95th percentile fell from 136 to 76. All 560 final evaluation games completed; stronger drive/movement teams won 73.8%/57.5% in their respective 160-game checks.
- Build and 254 tests pass. See `evaluation/LONG-RALLIES.md` for evidence, intermediate experiments and limitations.
- Next: validate pressure sensitivity across hands and counter/volley skill ranges, then address the remaining high-skill long-rally tail before treating the simulator as calibrated for progression.

## Hands, counter and volley evaluation — 2026-09-13

- Added `npm run evaluate:net-skills` for paired 30/50/70/90 execution and reception checks, including block coverage and the hands-limited flick plateau.
- Completed 1,440 games across nine comparisons (90-vs-50, 70-vs-50, 90-vs-70 for each attribute), with opening-server and roster rotations.
- Controlled effects match expectations; no gameplay curves changed. Stronger teams won 98.8% for hands, 88.8% for volley and 68.8% for counter in the largest-gap samples. Counter 50→70 remains statistically inconclusive in full games despite a clear controlled accuracy improvement.
- Report: `evaluation/NET-SKILLS.md`. Build and 257 tests pass.
- Next: evaluate serve/return and soft-game skills, then remaining overhead sensitivity. Relative progression costs, mixed-roster balance and the rare long-rally tail remain open calibration work.

## Serve, return and soft-game evaluation — 2026-09-13

- Added controlled 30/50/70/90 opening and soft-shot checks, including legal service boxes, target depth and drop-to-lob skill mapping.
- Completed 960 games and 1,200 targeted dink-start rallies. Main higher-skill team win rates: serve 63.8%, return 90.0%, drop 77.5%, reset 68.8%.
- Dink accuracy and targeted-rally results improve, but main/fresh full-game wins were 60.0%/41.3% (50.6% combined). Dinks account for roughly 1% of ordinary shots; full-game usefulness remains unproven. No gameplay curves changed.
- Build and 260 tests pass. Report: `evaluation/SOFT-OPENING-SKILLS.md`.
- Next: investigate soft-shot attackability, airborne-versus-bounce selection and useful dink opportunities. Overhead calibration and progression-cost design remain outstanding.

## Soft reception and dink opportunities — 2026-09-13

- Fixed excessive horizontal paddle reach while feet stayed outside the kitchen; reception contacts now respect a 1.2 m horizontal reach limit and can occur later or after a bounce.
- Soft placements now honor requested net clearance rather than an oversized family arc floor. Controlled bounced receptions increased from 0/1,200 to 956/1,200; reachable volleys remain available.
- Dink share rose to roughly 4–5% in ordinary skill-70 games. Combined stronger-dink wins improved from 50.6% to 68.8% across the same 320 games. All 840 final games completed; equal-70 home wins were 50% across 160 games.
- High-skill rallies lengthened from 27.7 to 42.5 shots on matched seeds; the 40-game high-skill batch had 65% home wins and needs a broader side audit. Do not treat this pass as completion of overall balance or long-rally work.
- Build and 261 tests pass. Report: `evaluation/SOFT-RECEPTION-FIX.md`.
- Next: evaluate high-skill finishing/overhead sensitivity and longer rallies, then broaden rating/side checks before progression tuning.

## Overhead finishing and fresh side audit — 2026-09-13

- Added overhead diagnostics for net, retreating and staggered-defense contacts. Higher overhead skill improves accuracy, but fixed targets can produce accidental winners at lower accuracy, so immediate winners alone are not a skill-quality metric.
- Automatic overhead choices now estimate defender preparation time on intended trajectories, including bounced reception. No execution seed or sampled result is consulted. Discarded a distance-only targeting trial that worsened controlled outcomes.
- Fresh pre-change high-skill audit split home wins 50/50 across 80 games; the earlier 65% did not repeat. Final high-skill batches had 55% and 40% home wins, with broad seed-block intervals; overall side balance is not certified.
- Stronger-overhead wins changed from 70% to 76.3% on matched seeds, an uncertain increase. Mean high-skill rallies fell from roughly 43 to 39 shots, but the maximum reached 425 in the fresh batch. Long-rally realism remains unresolved.
- All 600 final games completed; build and 263 tests pass. Report: `evaluation/FINISHING-AND-SIDES.md`.
- Next: mixed-roster/handedness checks and progression-value targets, with the long-rally tail retained as an open simulation issue.

## Simulation calibration certification — 2026-09-13

- Completed the remaining mixed-roster, handedness, personality, intelligence, adjacent skill-step, and held-out sensitivity checks. All 5,020 accepted certification games used the current engine and completed without caps.
- Re-ran 317,394 paired controlled samples across all eleven attributes. Every skill improves its intended mechanical outcome; full-game value varies with opportunity and saturation.
- Equal-50 and equal-70 home wins were 46.7% and 48.3%. Mixed-skill rosters were 57.5–58.8%. The 40-seed handedness holdout produced 56.3% all-left and 57.5% mixed-handed home wins; uncertainty spans parity and the earlier mixed-handed lean did not reproduce.
- Six personalities completed at 43.3–58.3% home wins with distinct shot distributions. Three intelligence settings completed at 55.0–56.7% in equal-skill checks.
- Progression cost multipliers are now defined from current full-game utility: premium 1.25× (return, hands), high 1.10× (drive, drop, reset, volley, counter), standard 1.00× (serve, dink, overhead), situational 0.85× (movement). These are relative game-economy targets, not real-world DUPR claims.
- The rare equal-90 marathon-rally tail is explicitly deferred by product decision and excluded from ordinary-play calibration acceptance. See `evaluation/CALIBRATION-CERTIFICATION.md` for evidence and limitations.


## October 1 V1 checklist snapshot — superseded October 2, 2026

The following checklist preserves the previous goals and local verification notes. Its unchecked boxes are historical acceptance reminders, not proof of absent implementation or current submission blockers. Build 15 included early guest signup, solo completion polish and gameplay music removal; builds 17–18 superseded earlier purchase/review preparation. The owner confirmed Apple submission and Waiting for Review on October 2. The exact final submitted binary is not independently confirmed locally. Subscription assumptions and historical pending-release statements below are superseded by [the current backlog](BACKLOG.md) and [Premium policy](PREMIUM.md).

### PickleBash V1 launch checklist

This is the canonical checklist for building, validating, and finalizing the PickleBash V1 launch. When deciding what to build next, use this list as the source of truth.

Check an item only after it has been implemented and verified at the level implied by the item. Features that already exist still remain unchecked until their V1 behavior has been explicitly confirmed.

#### Product direction

**Social-first asynchronous pickleball with friends.** The core loop is invite → play a short strategic match → return when it is your turn → finish → play again. Prioritize making that loop easy, enjoyable, and worth returning to.

Owner direction, October 1, 2026: iOS is the primary product with pack sales; web is a lower-priority demo without pack sales. This is planning context. The platform/sales split has not been implemented or deployed by the guest signup prompt work.

Local iOS signup follow-up: after three completed points in solo or friends play, offer guests the existing username/email/password account modal with save-progress copy and **Not now**. Wait for point playback/celebrations, defer to other dialogs, and offer once per guest identity. Reuse the identity-preserving guest upgrade. Native/device validation and inclusion in the next TestFlight batch remain pending; build 13 does not contain this follow-up. Other reported UI polish and theme-music removal remain separate backlog work.

The ordered implementation and acceptance plan for persistent rivalries, authoritative shot-selection analytics, evidence-qualified strategy stories, sharing, and co-presence is [Rivalry and strategy stories](RIVALRY-STRATEGY-PLAN.md). Follow its reviewed implementation sequence (the phase numbers identify work packages); this launch checklist remains the source of truth for overall V1 readiness.

#### Core social loop

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

#### Games lobby

- [x] **Your Turn** games are visually prioritized.
- [x] **Waiting** games are clearly different.
- [x] Opponent name/avatar is prominent.
- [x] Current score is visible.
- [x] One tap opens a game.
- [x] Multiple simultaneous games are easy to scan.
- ~~Recently completed games are accessible.~~ **Removed from V1 scope.**
- [x] Start New Game is obvious.
- [x] No unnecessary traditional-game menu clutter.

#### Navigation improvements

- [x] **Remove the Home icon from the main navigation** (added and verified locally September 29, 2026).
- [x] **Combine Play and Friends into one screen called “Play”** (added and verified locally September 29, 2026). My Games, My Friends, and Community share the existing top tab system with fixed tab positions and an animated pink highlight. The title was simplified from Play With Friends to Play on September 29; reduced-motion preferences skip the animation. My Games retains the games list; Create a New Game remains in the top-right corner. One main navigation entry replaces the separate Play and Friends entries; existing Friends/Community links still open the matching tab.
- [x] **Add Store to the main navigation and remove it from Profile** (added September 29, 2026). Store sits immediately left of Profile and displays its contents on a full page without a modal close button. The Profile shortcut has been removed; verified locally.

#### Turn experience

- [x] Player instantly knows which team they control.
- [x] Player instantly knows whose turn it is.
- [x] Available shot choices are obvious.
- [x] Target selection is obvious.
- [x] Submitted shot has clear feedback.
- [x] Opponent's previous shot is understandable when returning later.
- [x] Transition from opponent action → your decision feels natural.
- [x] No accidental double-submit.
- [x] Refreshing never changes the result.

#### Async pacing

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

#### Match completion

Implementation available in the [local rivalry playtest](RIVALRY-PLAYTEST.md). These acceptance checks remain open until player testing and hosted rollout.

- [ ] Winner/result is unmistakable.
- [ ] Final score is prominent.
- [ ] Head-to-head series is shown.
- [ ] Current streak is shown.
- [ ] Total matches together is shown.
- [ ] **REMATCH** is the primary CTA.
- [ ] Rematch preserves the relationship/history.
- [ ] Starting Match #2 requires almost no setup.

#### Identity

- [ ] Player has a display name.
- [ ] Player has recognizable avatar/character.
- [ ] Opponent always feels like a real person.
- [ ] Identity carries across games.
- [ ] Customization does not block getting into the first match.

#### Notifications

- [ ] Only notify when action is required.
- [ ] Never notify repeatedly for the same turn.
- [ ] Suppress push when player is already active.
- [ ] Notification names the opponent.
- [ ] Notification deep-links correctly.
- [ ] Push works after app/browser is closed.
- [ ] Denied/disabled notification state has understandable UX.

#### Onboarding

- [ ] New user understands how to serve.
- [ ] New user understands shot selection.
- [ ] New user understands that turns are asynchronous.
- [ ] New user understands they can leave and come back.
- [ ] Account/profile friction comes after first useful interaction.
- [ ] No lengthy tutorial before playing a friend.

#### Strategic/gameplay quality

- [ ] Outcomes feel like believable pickleball.
- [ ] Shot choices create meaningful decisions.
- [ ] No obvious dominant choice.
- [ ] Different rallies feel meaningfully different.
- [ ] Randomness adds uncertainty without feeling arbitrary.
- [ ] Equal multiplayer attributes keep matches fair.
- [ ] UI never makes the game feel like training/homework.

#### Reliability

- [ ] Two devices can play through a complete match.
- [ ] Closing/reopening never loses state.
- [ ] Network failure does not duplicate a turn.
- [ ] Stale clients recover cleanly.
- [ ] Completed games cannot accidentally reopen.
- [ ] Rematches do not create duplicate matches.
- [ ] Authentication recovery does not lose active games.

#### Analytics — minimum

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

#### Scope guardrails

Career Mode, Arcade Mode, RPG progression, tournament ladders, skill unlocks, stamina/fatigue, scouting, and long-term character development are archived ideas, not V1 launch requirements. Voice improvements, real-time multiplayer, and deeper physical simulation are also outside the V1 launch scope unless explicitly reprioritized.

#### Future gameplay improvements

- [ ] **Player-specific backhand strengths and weaknesses** (added September 20, 2026). Extend the current low-backhand penalty so forehand/backhand contact and each defender’s ability meaningfully affect return execution at normal heights too. Respect handedness, positioning, contact height, and shot type; targeting a weak backhand should provide a tactical advantage without guaranteeing failure. Validate strong versus weak backhands in equivalent situations. Keep defender skill ratings out of the shot selector’s Pressure indicator so players learn opponents’ weaknesses through play. Backlogged for later; not a new V1 launch requirement.

#### PickleBash+ and monetization

- [ ] **Add a pirate theme to the Fun Pack** (added September 29, 2026).

- [ ] **Bring back “Your Game” on the profile page** (added September 23, 2026). Keep the section hidden until the PickleBash+ offering and monetization approach are defined. Then revisit its shot-mix insights and decide which features belong in the free experience versus PickleBash+ before restoring it. Deferred; not a V1 launch requirement. Existing shot-mix UI remains in `src/multiplayer/shot-mix-view.ts`; the profile entry point is `src/multiplayer/profile.ts`.

#### History and references

- [Historical roadmap and implementation log](BACKLOG-HISTORY.md) — original numbering and older decisions; not an active task list.
- [Original supplied roadmap](roadmap-source.txt).
- [Multiplayer architecture and acceptance plan](../TURN_BASED_MULTIPLAYER_PLAN.md).
- [Remote implementation and rollout notes](PHASE-3-REMOTE.md).
- [Push notification implementation and acceptance notes](PWA-TURN-NOTIFICATIONS.md).

Current user-confirmed status and this checklist supersede older pending-deployment, pending-playtest, and roadmap-priority notes in the historical documents.
