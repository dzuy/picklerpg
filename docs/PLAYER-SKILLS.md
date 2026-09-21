# Phase 3 — player skills

## 16: Visible rating effects

Shot lab → Execution compares 62 and 92 on the same intent, seed and contact. Quality is a tuning score, not a success probability; spread is the ordinary error bound before rare mishits. Full game displays skill, quality, contact difficulty and actual deviation during/after execution. No sampled outcome is revealed before submission. Existing shot ratings affect error, movement affects reach, and hands now reduces the pressure penalty on airborne shots.

## 17: Contact difficulty

The shared difficulty evaluator uses paddle reach, handedness/facing, contact height, court depth and backward movement. Shot lab exposes comfortable forehand, stretched forehand, low backhand, moving backward and transition-ball-at-feet presets. Invalid family/contact combinations remain unavailable. Live match contact preparation preserves lateral reach differences and passes movement from the preceding flight to execution. These are approximate penalties; no skeleton/biomechanical solver or fatigue model is implied.

## 18: Archetypes

Full game → Choose archetypes offers attacker, right-side setup, grinder, all-court and defensive reset for any player. Applying choices explicitly starts a new game. Profiles persist through points and Restart but not page refresh. Original profiles remain available. Archetypes affect actual execution, movement and policy, not just labels. The setup archetype describes a skill emphasis; it does not implement stacking or lock a player to one court side.

## 19: Finn's identity

Finn's shot skills and hands affect his execution; movement skill affects reach; kitchen-approach tendency changes advancement. His aggression, middle preference and counter skill inform recommendations through the existing tactical policy. Recommended families are marked in his decision buttons; target alternatives remain yours to select. No home-team shot is automated. Opponents likewise use their chosen archetype's tendencies.

Tests verify same-contact skill comparison, difficulty penalties, handedness, archetype application, prepared previews and existing full-game/control regressions. Browser verified comparison changes under stretch and applying Finn's defensive profile. Ratings and penalty constants remain prototype tuning, not calibrated DUPR predictions.

## Recovery after contact

The hitter now spends simulation time recovering before moving toward coverage. Movement skill controls the baseline delay (0.04–0.54 seconds). A stretched reach, wide court position, or pressured contact adds recovery time; strong movement reduces that additional cost. Serves are exempt. The remaining flight time determines how far the hitter can recover at their existing movement speed. Slower replies therefore buy time, while quick exchanges preserve openings. Thinking time between turns never buys recovery time.

This first pass changes recovery timing and distance, not tactical destination quality. Partners retain their current positioning behavior. Delay is stored with the planned shot and carried into multiplayer animation so the pause is visible during live play and replay. Existing saved shots without delay remain compatible.


### Erne opportunities

An Erne can develop from a normal lane position behind the kitchen line. The player jumps diagonally over the corner, lands outside the sideline, and immediately volleys. A rally ball must be airborne, within 0.55 m of a sideline and within paddle reach; the receiver must already be within 0.65 m of that same sideline before moving; both opening bounces must be complete. The reception planner checks a bounded corner jump or a legal outside run, and applies its movement/time budget. A decision pauses before takeoff; choosing the bounced reception cancels the jump. Recovery stays outside until the player is behind the kitchen line again.

An eligible contact adds **Erne Alert!** to the normal target picker. It never opens the picker or selects an aim automatically. Execution uses the lowest of volley, hands, and movement, with an additional timing/error cost. The normal trajectory and defense simulation determine whether the fast volley succeeds; the alert does not guarantee a winner. Existing risk/pressure estimates use the selected target.

Try `/tests/browser/erne-practice.html` for a repeatable, unsaved sideline feed through the real shot planner. Its prepared receiving player starts in their lane at the kitchen line with high movement skill. Local simulation and multiplayer playback share the same jump path. Multi-segment approach routes are not implemented yet.

### Bait and punish: pressured soft returns

During a rally, a low dink, reset, drop, or block can float up when the hitter is stretched, late, or retreating. The chance uses the selected shot's skill and hands; a reset/block reduces the chance compared with an attacking touch. Lower touch skills carry a small baseline pop-up chance even on comfortable contacts. Lateness, paddle reach, backward movement, and incoming pace increase it sharply; strong touch skills remain protective. These are game tuning values, not measured real-world probabilities.

A pop-up adds height and depth along the attempted lane. It does not change the intended target, guarantee an in-ball, reveal an upcoming error, or award a winner. The real flight determines reachable attacking contacts. The committed incoming shot is labeled **High pop-up incoming** in local and multiplayer selectors. Existing positioning/recovery still determines the open space.

Try `/tests/browser/bait-practice.html`: **Try wide dink** and **Compare middle dink** replay seed 15 with the same players and a soft-return preference. This example demonstrates a wide setup creating an overhead opportunity while a comfortable middle reply stays low. **Stronger touch** changes defender dink/reset/hands skills; **Free targeting** varies the seed and lets you place your own setup. Both home teammates are user-controlled. The practice match is unsaved and does not change an account's games.


Pop-up tuning check (2,000 deterministic executions per cell, dink and hands set to the listed skill): at skill 40, comfortable / late / late-and-stretched contacts produced approximately 9% / 31% / 60% pop-ups; skill 60: 4% / 22% / 42%; skill 80: 1% / 13% / 24%; skill 95: under 1% / 4% / 10%. These controlled contact results are not per-rally guarantees; geometry, chosen reply, and other execution errors still matter.
