# High-skill rally calibration

## Changes

- Covered lob landings lose tactical preference based on defender positions. Lobs over an advanced defense remain available.
- All four players can aim legal overheads at either defender’s feet, rather than having only deep zone targets.
- Prepared, slow-ball swing reliability is unchanged. The hands-weakness factor is now linear for timing/pace pressure instead of squared. At hands 90, pressure 0.8 and incoming speed 20 m/s, the modeled miss chance rises from 0.86% to 5.58%; at zero pressure and 6 m/s it remains 0.335%. These are game-design rates, not measured pickleball statistics.
- The evaluator now records completed-rally shots and simulated seconds, with mean, 95th-percentile and maximum lengths in reports. Counts include serves and returns.

No score-dependent errors, rally-length-dependent penalties, forced winners or shortened evaluation limits were introduced. The same logic applies to both sides and to manual-play shot reception.

## Matched high-skill games

Uniform skill 90; seeds 5000–5019; both opening teams, rotation 0. These identical profiles make the other roster rotations duplicate observations, so this comparison uses 40 games over 20 independent seeds. Every run allows 100,000 simulation steps.

| Version | Games | Mean shots/rally | 95th percentile | Maximum | Home wins | Capped |
|---|---:|---:|---:|---:|---:|---:|
| Before | 40 | 48.2 | 136 | 265 | 50.0% | 0 |
| Tactical changes only | 40 | 45.3 | 131 | 443 | 47.5% | 0 |
| Tactics + pressure calibration | 40 | 27.1 | 76 | 235 | 40.0% | 0 |
| Fresh seeds 7000–7019 | 40 | 27.7 | 74 | 179 | 55.0% | 0 |

The paired mean change across seed blocks is -21.0 shots/rally (rough 2.1×SE interval -24.4 to -17.5). This is distinct from the pooled rally averages above. The tactical-only experiment did not solve the tail: its maximum reached 443 shots. The pressure change supplies the main measured improvement.

## Skill and side checks

Seeds 4000–4019, all four roster rotations and both opening teams, 160 games per scenario. A is the stronger-skill team in skill comparisons. Mirrored runs are correlated.

| Scenario | A wins | Home wins | Mean shots/rally | Completed |
|---|---:|---:|---:|---:|
| equal-70 | 50.0% | 52.5% | 4.6 | 160/160 |
| drive-90-vs-50 | 73.8% | 48.8% | 4.7 | 160/160 |
| movement-90-vs-50 | 57.5% | 55.0% | 4.6 | 160/160 |

Controlled checks still show increasing drive accuracy and movement coverage at skills 50/70/90. The incoming-drive reception sample records 178/200 successful receptions at all three movement values, with mean pressure decreasing 0.405 → 0.392 → 0.382. Movement improves preparation and fixed-grid reach; a small discrete reception sample need not have strictly increasing success counts.

## Validation and limits

- Build and all 254 tests pass, including both-side lob choices, overhead feet menus, strong-hands pressure risk, skill sensitivity and evaluator accounting.
- Very long rallies still occur. The change reduces their frequency and typical length; it does not establish real-world realism or eliminate the tail.
- The equal-skill side results are finite samples, not proof that every rating, handedness or personality is unbiased.
- Source hashes, seeds, scores and per-rally counts are retained in the directories above. `rally-pressure-controlled` contains the controlled skill checks. Earlier `lob-position-*` broad experiments were interrupted; their partial files are diagnostic only and are not used for the final tables.
- These local simulations do not write account match history.
