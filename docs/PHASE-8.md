# Phase 8 — Visual presentation pass

## Implemented

- **47: Court scale.** Kept the engine’s 20 × 44 ft court and 7 ft kitchen. Athletes remain roughly 1.85 m tall including the cap. All playing lines sit above the surface; removed the thick decorative cream border so it no longer reads as an oversized boundary line. The perforated ball is approximately life-sized nearby and enlarged at distance for visibility. Final scale *feel* still needs user playtest.
- **48: Tactical camera.** Settings now exposes Courtside, Tactical and Overhead presets, plus distance/height adjustment and reset. Courtside includes the baseline athletes; portrait views can back up farther to fit the court. Dragging remains available for free orbit/pan/zoom.
- **49: Ball readability.** Added a short velocity streak, vertical height reference and expanding bounce marker. Existing team-colored trajectory previews remain. Streak and height reference follow the Flight guide setting; the brief bounce cue remains visible. Ball rotation and bounce timing use simulation time and freeze on pause. The visible shell has a bounded distance-based size, without changing physics.
- **50: Camera behavior.** Small reframing uses frame-rate-independent damping. Manual control wins until reset or a preset is selected. Automatic tracking stops while paused and when reduced motion is requested.
- **51: Athletes.** Uses the previously completed detailed/customizable player models.
- **52: Swings.** Added separate serve, forehand, backhand, soft-shot and overhead poses, with torso rotation, elbow/wrist movement and follow-through. Overheads keep the shoulder attached. Swing age spans flight legs, preventing a bounce from replaying the swing. Ready stance, walking stride and winner poses assign all relevant joints to avoid retained joint rotations.
- **53: Reactions.** Stretched and late/backward poses use execution feedback. Compact jammed poses are inferred for close-body volley/counter/block contacts; pop-up reactions are inferred from low-quality soft shots with high arcs. Brief text cues accompany these and overhead finishes. These are visual interpretations, not additional simulation outcomes.
- **54: Environment.** Existing stylized trees, slatted benches, bottles, net mesh and detailed posts provide the garden setting. Foreground trees fade when they obstruct the playable view.

## Verification

Production build and 125 tests pass. The added tests cover swing selection and handedness, timing across bounce boundaries, feedback reactions, marker bounds, bounce expiry and frame-rate-independent camera smoothing. Browser checks cover courtside framing, overhead preparation and follow-through, a 390 px mobile overhead view, and absence of browser errors. Existing tree-obstruction tests continue to pass.

## Playtest gate

Try a few points from **Settings → Court camera → Courtside** and **Tactical**. Confirm whether player scale, the ball’s visibility, and contact motion feel right. Step 47 remains open for that judgment; the presentation is stylized, not physical paddle/ball collision animation.
