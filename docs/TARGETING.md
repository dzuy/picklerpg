# Targeting — Step 5

In **Practice → Shot lab**, choose a target, then play the shot. Zone targets offer kitchen, transition or deep placement. Player targets let you select Jules or Rio and change that opponent's handedness. The **Opponent positions** control shifts both defenders so you can see how the seam and open-court targets respond.

`resolveTarget(target, context)` in `src/engine/targeting.ts` is a pure geometry function. It consumes the canonical target, hitter, contact, player positions/facing/handedness and shot type. It returns a point in metres and either `landing` or `intercept`. It neither chooses a tactic nor predicts interception or a winner.

| Target | Resolution |
| --- | --- |
| Middle | Midpoint between the two opponents' X positions at the requested depth. This follows their seam rather than always using the court center. |
| Crosscourt | Opposite lateral side from contact, at least 1.2 m off center. |
| Line | Same lateral X as contact. |
| Wide | Opposite-side sideline with 0.25 m safety inset. |
| Open court | At the requested depth, choose the candidate farthest from its nearest defender. Uses five lateral candidates and a stable tie-break. |
| Body | Selected opponent's X/Z at 1.05 m height. An interception endpoint, not a ground landing. |
| Feet | 0.2 m toward the net from the opponent at ball-radius height, marked as a landing. |
| Backhand side | 0.45 m to the opponent's anatomical backhand side, derived from facing and handedness, at 0.9 m height. An interception endpoint. |

Depths are 1.25 m (kitchen), 3.5 m (transition) and 5.6 m (deep) from the net. The receiving end is derived from the contact's Z sign, so the geometry works from either end. Destinations are inset from sidelines/baselines and kept across the net. Player targets must refer to an opposing player across the net. Serves reject player targets and destinations that are not diagonal and beyond the kitchen.

Open-court resolution measures present geometric spacing only. It does not model reach, reaction time, movement speed or who will intercept. Boundary clamping may reduce a backhand offset near the sideline. These are deliberate first-pass geometry choices, not guaranteed tactical success.

Shot lab uses the resolved point in the existing family flight builder. Body/backhand previews stop at contact height and show **Target reached**, without recording a bounce. Ground targets show **Shot landed**. Neither preview awards points or simulates a response. Raised targets have a raised marker; ground targets use the court ring.

The original guided rally remains authored. Step 6 will connect the full shot intent (pace, shape and other fields) to generated execution and rally integration. Step 7 adds execution variance.

## Tap-to-target shot selection

In full game and pattern practice, tap/click the opponent's court at a manual decision to place an exact landing target. The translucent pie wheel uses the same available intents as the “Choose your shot” dock, including its displayed reception choices and their before/after-bounce timing. Choices that differ only in target location are combined; the remaining choices receive equal slices. Invalid choices are omitted rather than disabled. Serve labels and flight settings match the dock; body serves remain in the dock because they target a player instead of a floor spot. Choose a slice to play immediately. Clicking or tapping outside the wheel cancels the target and consumes that click; Escape also cancels.

The `point` target stores world-space `x` and `z` without snapping or adding a safety margin at the lines. Its intended height is ball radius at landing. Shot execution uses the current hitter's family skill, contact difficulty, and the existing deterministic seed. Higher skills reduce dispersion rather than guaranteeing a hit. The marker remains at the intended target during the shot; flight and feedback show actual execution. Reception choices select an airborne branch for overheads, counters, blocks and volleys, or a bounced branch for ground-only shots. Families supporting either timing prefer a legal airborne contact, falling back to a legal bounced contact. Targets clear at the next contact, reset, replay, or mode change.

Flick is an airborne wrist attack with medium topspin and fast pace. It requires a contact from 0.35–1.6 m and obeys kitchen and opening-bounce rules. Accuracy uses the lower of volley and hands skills.

Serve styles preserve the tapped destination: topspin uses strong topspin, slice adds backspin and side curve, lob requests high clearance, and shallow uses soft pace. For a shallow landing, place the target just beyond the kitchen line. All styles use serve skill and the diagonal service-box rules.

Opening returns offer Deep, Drive, Topspin, Slice, Lob, and Short variants, all as return intents after the serve bounces. Rally menus include Lob whenever its contact validation succeeds (0.08–3.2 m contact height), including kitchen exchanges and airborne receptions. Reception displays retain all legal choices so Lob is not dropped by a menu-size cap. The wheel preserves each return variant while combining repeated directional targets.
