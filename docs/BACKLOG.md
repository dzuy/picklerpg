# Pickle RPG backlog

Strategy first. Simulation second. Presentation third.

This is the agreed build order from the supplied roadmap. Preserve the numbering when updating progress. Check an item only after its acceptance criteria are implemented and verified; an existing prototype or type stub alone does not complete it. Original wording is preserved in [roadmap-source.txt](roadmap-source.txt).

## Current increment

**Player Design phase implemented.** Completed the six ordered increments in [PLAYER-DESIGN.md](PLAYER-DESIGN.md): saved roster, customizable athlete, live creator, skill sliders, game integration, then verification.

**Phase 8 visual pass ready for playtest.** Steps 48–54 are implemented; step 47 has verified dimensions and player scale, with final feel awaiting playtest. See [PHASE-8.md](PHASE-8.md).

Custom commands work alongside canned menus in full games and practice. Local and LLM parsers produce reviewed, validated shot intent; impossible contacts explain why rather than auto-substituting. Frequently played commands become quick actions. Left/right spin, spin strength, topspin drop, and slice float now affect flight; fine player-side targets remain disclosed approximations. See [CUSTOM-SHOTS.md](CUSTOM-SHOTS.md).

**Phase 7 voice increment implemented for playtest.** Added microphone input, local concise/richer commands, partner instructions, hands-free contact listening, and compact voice view. Local Whisper now works in the in-app browser, with flat-serve recognition corrections. User voice accuracy, end-to-end latency, and whole-game voice acceptance remain playtest gates. See [PHASE-7.md](PHASE-7.md).

## Additional requested features

- [ ] Sound effects
- [ ] Music
- [x] Game end screen — prominent final score, winning player names, full-game replay, and New Game; win-by-two scoring verified.
- [ ] Authentication / account creation

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
## Phase 7 — Voice-only mode
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
- [ ] **55.** Player creation / roster
- [ ] **56.** Skill progression
- [ ] **57.** Different partners
- [ ] **58.** Opponent teams
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
- multiplayer
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

- [ ] Evaluate removing the legacy “Choose your shot” dock and its Show shots expander entirely. The expander is currently hidden; keep the dock implementation until targeting-wheel coverage and accessibility have been reviewed.
