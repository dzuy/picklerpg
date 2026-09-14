# Simulation calibration certification

Date: 2026-09-13

## Decision

Ordinary-play simulation calibration is complete for the current Open Play engine. The engine has passed directional skill checks, side and role fairness checks, mixed-roster and handedness checks, personality stability checks, and progression-value classification.

The rare marathon-rally tail among four uniformly skill-90 players is explicitly deferred by product decision. It is an accepted edge case and is not part of this certification boundary. This report does not claim real-world DUPR calibration.

## Acceptance criteria

- Every one of the eleven skills improves its intended controlled mechanical outcome from low to high ratings.
- Full games complete without caps in ordinary-skill, mixed-roster, handedness, personality, intelligence, and progression scenarios.
- Symmetric A/B teams remain symmetric after court-side and within-team rotations.
- Home and opening-server point estimates remain plausible across fresh seed blocks; a result that leans in one small batch must be checked on held-out seeds.
- Personality changes tactics without breaking match completion or creating a persistent side advantage.
- Progression pricing reflects observed utility and diminishing returns rather than charging every attribute equally.

## Certification coverage

### Full games

| Suite | Games | Result |
|---|---:|---|
| Equal 50 and equal 70, 30 fresh seed blocks each | 480 | 480 complete; 0 capped |
| Star/support, complementary roles, all-left, and mixed-handed rosters | 640 | 640 complete; 0 capped |
| Held-out all-left and mixed-handed audit, 40 seed blocks | 640 | 640 complete; 0 capped |
| Six personalities and three intelligence settings | 540 | 540 complete; 0 capped |
| Every skill at 50→70 and 70→90 | 1,760 | 1,760 complete; 0 capped |
| Held-out weak/noisy adjacent skill steps | 960 | 960 complete; 0 capped |
| **Total completed certification games** | **5,020** | **5,020 complete; 0 capped** |

Artifacts: `calibration-fairness`, `calibration-rosters`, `calibration-handedness-heldout`, `calibration-policy`, `progression-certification`, and `progression-heldout`. The interrupted equal-90 extension in `calibration-fairness/games.jsonl` is outside the 5,020-game total and outside the accepted scope.

### Controlled mechanics

The current-source rerun contains 317,394 paired checks:

- 18,000 drive executions, 2,394 movement-grid cases, and 600 fixed incoming-drive receptions.
- 120,000 hands/counter/volley executions and 24,000 hands reception checks.
- 144,000 serve/return/drop/lob/dink/reset executions and 1,200 targeted dink-start rallies.
- 7,200 overhead finishing attempts across court directions, contacts, and targets.

Artifacts: `calibration-controlled-core`, `calibration-controlled-net`, `calibration-controlled-soft`, and `calibration-controlled-finishing`.

All shot skills show lower placement error and higher legality as rating rises. Movement expands reachable coverage from 590/798 cases at skill 50 to 636/798 at 70 and 656/798 at 90, while reducing mean timing pressure. Immediate overhead winners are not required to be monotonic because inaccurate shots can become accidental winners; legality and placement error are the accepted overhead measures.

## Fairness findings

| Scenario | Home wins | Notes |
|---|---:|---|
| Equal 50 | 46.7% | 30 paired seed blocks |
| Equal 70 | 48.3% | 30 paired seed blocks |
| Star + support on each team | 58.8% | A/B result is exactly 50% after rotations |
| Complementary attacker + controller | 57.5% | A/B result is exactly 50% after rotations |
| All-left heldout | 56.3% | 40 paired seed blocks |
| Mixed-handed heldout | 57.5% | 40 paired seed blocks |

The first 20-seed handedness batch leaned away from home (40.0% all-left and 36.3% mixed). That result did not reproduce on 40 new seeds. The held-out standard-error ranges span parity, so no handedness or side compensation was introduced.

Personality checks completed between 43.3% and 58.3% home wins. Their shot distributions are materially different: Banger favors drives, Grinder favors dinks, Technician and Wall favor resets, and Gambler plays shorter, more aggressive rallies. Equal-skill intelligence checks completed between 55.0% and 56.7%; intelligence is intentionally subtle when all physical skills and available tactical evidence are equal.

## Progression value targets

The economy should use relative costs rather than force equal win-rate effects. The following multipliers are the calibration targets for a future base skill-up cost:

| Tier | Multiplier | Skills | Rationale |
|---|---:|---|---|
| Premium | 1.25× | Return, hands | Broad, frequent influence; strongest adjacent-step game advantages |
| High | 1.10× | Drive, drop, reset, volley, counter | Reliable controlled gains and repeated full-game value |
| Standard | 1.00× | Serve, dink, overhead | Clear mechanics with opportunity limits or high-rating saturation |
| Situational | 0.85× | Movement | Reach and timing improve, but 50→70 was neutral in the 30-seed heldout full-game sample |

The held-out weak/noisy steps resolved to: serve 50→70 at 56.7% stronger-team wins, dink 70→90 at 51.7%, overhead 70→90 at 60.0%, and movement 50→70 at 50.0%. Controlled results remain monotonic for all four, so the latter two low-impact results are treated as opportunity/saturation signals and reflected in cost rather than altered physics.

These multipliers are a progression economy contract. They can be revised when Career Mode defines currency pace, but their relative ordering should remain unless new gameplay evidence supersedes this certification.

## Deferred and excluded

- Uniform skill-90 marathon rallies and their evaluation runtime.
- Mapping simulated ratings to official or real-world DUPR.
- Career Mode currency pace, XP awards, and exact upgrade prices.
- Real-time multiplayer or network-latency effects.

These exclusions do not block ordinary Open Play calibration.
