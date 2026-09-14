# Soft-shot reception fix

## Root causes and changes

1. Receivers kept their feet outside the kitchen but could still reach roughly 1.6 m horizontally to volley a short ball. Reception planning now caps horizontal feet-to-ball reach at 1.2 m. A later reachable contact or bounce remains available; airborne shots within reach remain legal.
2. A family arc-height floor overrode soft shots’ requested net clearance. Drop, dink, reset and block now use the arc needed for the requested clearance. Lob and attacking-shot shape behavior remain unchanged.

The reach limit is a game-design constraint, not a measured biomechanical claim. No forced dinks, skill bonuses or rally-length limits were added.

## Controlled evidence

Same 200 seeds for each drop/dink/reset in both court directions, skill 90, fixed short targets:

| Measurement | Before | After |
|---|---:|---:|
| Bounced receptions / 1,200 incoming shots | 0 | 956 |
| Mean requested clearance | 0.25 m | 0.25 m |
| Actual drop/reset clearance | 0.53 m | 0.25 m |
| Actual dink clearance | 0.34 m | 0.25 m |
| Typical horizontal reception reach | 1.58–1.62 m | 0.52–0.65 m |

After the fix, 241 of the 1,200 balls still had airborne receptions and three had no reception. Lower clearance did not make every short ball bounce; reach and actual trajectory determine the contact.

## Full-game results

All non-varied attributes stay at 70. Main skill runs use seeds 9000–9019; the held-out dink check uses seeds 9200–9219. Each uses four roster rotations and both opening teams, 160 games per comparison.

| Scenario | Stronger-team wins before | After | Dink shot share before | After |
|---|---:|---:|---:|---:|
| drop 90 vs 50 | 77.5% | 81.2% | 0.49% | 4.82% |
| dink 90 vs 50 | 60.0% | 62.5% | 1.04% | 4.16% |
| reset 90 vs 50 | 68.8% | 86.2% | 0.80% | 4.18% |
| dink 90 vs 50, fresh seeds | 41.2% | 75.0% | 0.91% | 4.68% |

Combined dink wins are 68.8% across 320 games (40 seed blocks; rough 2.1×SE interval 61.1%–76.4%), compared with 50.6% before. The same seeds are reused for the before/after comparisons. Mirrored games are correlated; these are exploratory estimates, not progression-cost calibration.

Equal-70 control: home wins 50.0% over 160 games, dink share 4.56%, mean rally 5.0 shots.

## High-skill tradeoff

Uniform skill 90, seeds 7000–7019, both opening teams and one equivalent roster rotation (40 games).

| Metric | Before | After |
|---|---:|---:|
| Dink share | 0.0% | 11.2% |
| Mean rally shots | 27.7 | 42.5 |
| 95th percentile | 74 | 119 |
| Maximum | 179 | 271 |
| Home wins | 55.0% | 65.0% |

More playable kitchen exchanges lengthen high-skill rallies. This pass fixes short-ball reception and demonstrates increased dink utility, but does not solve the rare long-rally tail. The high-skill side sample is small and needs further checking; the equal-70 split does not certify every rating.

## Validation and follow-up

- All 840 final games completed. Build and all 261 tests pass.
- New regressions check both sides, exact soft-shot clearance, bounded horizontal reach, and continued availability of reachable volleys.
- The routine-shot benchmark fixture now requests the same 0.25 m soft clearance as the game menu, retaining its existing net-error threshold. Its prior 0.10 m setting had been masked by the arc floor.
- Reproduce geometry diagnostics with `node --import tsx scripts/evaluate-soft-opportunities.ts evaluation/my-soft-opportunities`. Match manifests retain source hashes, seeds and lineup settings.
- Next: high-skill finishing/overhead sensitivity and the longer rally tail, followed by broader rating/side checks before progression tuning.
- These evaluations do not write account history.
