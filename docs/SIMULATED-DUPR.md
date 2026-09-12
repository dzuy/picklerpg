# Simulated DUPR — research and provisional mapping

Research checked September 11, 2026.

DUPR's current [How it works](https://www.dupr.com/how-it-works) page states a 2.000–8.000 scale and bases updates on performance versus expectation, match type, recency and volume. Doubles team ratings use the average of individual ratings. Its reliability score measures confidence from match history; it is not a skill score. There is no published attribute-to-DUPR conversion in these sources. Some older DUPR explanatory pages describe different update details; this implementation does not attempt to reproduce the proprietary system.

[USA Pickleball's skill definitions](https://usapickleball.org/player-skill-rating-definitions/) and [4.0/4.5 descriptions](https://usapickleball.org/skill-level/level-four/) describe consistency, soft/hard play and strategy. These are useful qualitative context, explicitly not official ratings or a numerical conversion to DUPR. Our arbitrary 0–100 attributes have not been empirically aligned to those descriptions.

## Implementation

Hover the 3D character or its name; keyboard focus on the name also shows the tooltip. It reads “Simulated DUPR ≈ X.X · provisional skill estimate, not an official rating.” It uses current player state, so lab skill controls and match archetypes update the estimate. Escape dismisses it. It is informational and does not change execution or scoring.

The level anchors are 0→2.0, 40→3.0, 60→3.5, 70→4.0, 80→4.5, 90→5.0, 100→5.5. They now drive execution via `skill-benchmarks.ts`: ordinary placement spread, lift error, mishit rate and pressure sensitivity all decrease with level. The hover summary converts each skill to its benchmark level, averages four dimensions (serve/return, soft game, attack, movement/hands), then blends 80% of the overall average with 20% of the weakest dimension. Thus a single great serve cannot imply a complete 5.0 game. Balanced profiles retain their anchor rating. This is still a design prior, not an official conversion.

Routine 5.0 regression targets use 2,000 fixed seeds: deep serves land in court beyond 4.8 m more often than the 3.0 profile; net rates for routine serve/drive/drop/dink are below 3%; average endpoint error is less than half that of 3.0. The tests use balanced profiles, set feet and low incoming pace, not match-wide guarantees. A 5.0 player can still struggle with a weak individual skill, difficult contact or risky target. Shot lab → Execution offers labeled 3.0, 4.0 and 5.0 presets for direct comparison.

The anchors are our design choices, NOT values derived from DUPR research. Accurate real-world translation requires calibration against players with established DUPRs, representative match results and validated simulation performance. Even internal simulated match results can establish only relative strength without external anchors. Future work should fit and validate this mapping rather than treating it as a measured rating.
