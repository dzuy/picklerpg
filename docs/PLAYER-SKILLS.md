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
