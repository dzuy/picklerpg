# Auto-play balance retest

All automatic players now share decision rules, shot menus, and reception selection. Live games draw fresh seeds; evaluations retain explicit seeds. No side receives a compensating skill or outcome bonus.

Fresh-seed check: **396/800 home wins (49.5%)**, four identical 70-skill players (displayed 3.5), 100 new seeds, both opening servers, and four side/position rotations.
Approximate 95% interval across 100 seed blocks: 43.0%–56.0%. Rotations of identical teams are correlated; 800 games are not 800 independent trials. This supports removing the large observed bias, not a guarantee of perfect balance at every rating.

| Opening server | Home wins |
|---|---:|
| home | 212/400 (53.0%) |
| away | 184/400 (46.0%) |

## Skill suite

The rerun completed 384 games: 16 scenarios × three seeds × four rotations × both opening servers. No games were capped. This is a small seed sample for skill sensitivity.

| Scenario | Stronger/A team win rate | Home win rate |
|---|---:|---:|
| equal-50 | 50.0% | 33.3% |
| equal-70 | 50.0% | 66.7% |
| equal-90 | 50.0% | 83.3% |
| 90-vs-70 | 100.0% | 50.0% |
| 70-vs-50 | 100.0% | 50.0% |
| serve-90-vs-50 | 58.3% | 41.7% |
| return-90-vs-50 | 100.0% | 50.0% |
| drive-90-vs-50 | 41.7% | 25.0% |
| drop-90-vs-50 | 83.3% | 66.7% |
| dink-90-vs-50 | 58.3% | 41.7% |
| reset-90-vs-50 | 58.3% | 41.7% |
| volley-90-vs-50 | 58.3% | 58.3% |
| counter-90-vs-50 | 58.3% | 25.0% |
| overhead-90-vs-50 | 75.0% | 41.7% |
| movement-90-vs-50 | 41.7% | 41.7% |
| hands-90-vs-50 | 91.7% | 58.3% |

Uniformly stronger teams won all their games in these samples. Individual skill effects remain uneven: return and hands helped strongly, while drive and movement did not consistently improve wins. Policy opportunity, contact difficulty, targeting risk and sample size still need calibration before progression can be considered validated. Equal-50 and equal-90 results in this suite use only three seeds and need broader confirmation.

## Validation

Build passed. The 246-test full suite passed after the shared-policy and replay-capture changes. Eight focused tests passed after the final live-seed change, including deterministic replay, both opening servers, equivalent menus, mirrored contact difficulty, and fresh live seeds. Evaluation games never write cloud history.
