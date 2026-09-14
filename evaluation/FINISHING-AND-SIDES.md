# Overhead finishing and side audit

## What changed

Automatic overhead choices now estimate how much preparation time defenders have against the intended shot, including airborne and bounced reception, movement/hands skills and the kitchen reach constraint. Targets that leave less preparation time receive a tactical preference. Personality and recent-choice variety remain active.

This heuristic sees intended geometry and current player positions only. It does not see execution seeds, placement errors or sampled swing misses. The execution, targeting and skill curves were left unchanged. A trial based solely on path distance was discarded because it worsened controlled finishing outcomes.

## Side audit

The earlier 65% home-win result was 26 of 40 high-skill games. The fresh pre-change batch did not reproduce it. All high-skill batches use uniform skill 90, both opening teams, and rotation 0 because swapping identical roster profiles duplicates the observation. Intervals use 2.1× SE across seed blocks, not independent-game intervals.

| Batch | Games / seeds | Home wins | Approx. interval |
|---|---:|---:|---:|
| Previous sample, 7000–7019 | 40 / 20 | 65.0% | 47.8%–82.2% |
| Fresh before change, 11000–11039 | 80 / 40 | 50.0% | 39.4%–60.6% |
| Matched after change, 7000–7019 | 40 / 20 | 55.0% | 40.0%–70.0% |
| Fresh after change, 11000–11039 | 80 / 40 | 40.0% | 29.2%–50.8% |

These samples are evidence about the tested configuration, not proof of zero bias across all ratings, handedness and personalities. No score correction or side-specific compensation was introduced.

## Finishing and skill sensitivity

All other attributes remain 70. Seeds 11000–11019, four roster rotations and both opening teams (160 games per scenario).

| Scenario | Stronger-team wins |
|---|---:|
| Overhead 90 vs 50, before | 70.0% |
| overhead-90-vs-50 | 76.2% |
| dink-90-vs-50 | 63.7% |
| Equal 70, home wins | 52.5% |

The paired overhead-team win-rate change is 6.2 percentage points (rough seed-block interval -11.6 to 24.1). This is one profile configuration, not a target win rate for progression.

Controlled overhead checks at skill 50/70/90 cover net, retreating and staggered-defense contacts. Greater skill consistently improves placement accuracy. Immediate winners need not increase at every fixed target: a poorly placed ball can become an accidental winner. The chosen target and defender preparation also matter.

## Rally length

| Batch | Mean shots | 95th percentile | Maximum |
|---|---:|---:|---:|
| 7000–7019 before | 42.5 | 119 | 271 |
| 7000–7019 after | 39.4 | 111 | 282 |
| 11000–11039 before | 42.7 | 121 | 353 |
| 11000–11039 after | 39.3 | 110 | 425 |

The extreme rally tail remains. Modest average changes should not be presented as a complete pacing or realism fix.

## Validation and reproduction

- Build and all 263 tests pass. All 600 final games completed.
- `npm run evaluate:finishing` repeats 7,200 controlled overhead attempts across skills, targets, positions and court directions.
- Match artifacts: `finishing-pressure-high`, `finishing-pressure-side-audit`, `finishing-pressure-regression`; pre-change baselines: `soft-reception-high-skills`, `high-side-heldout`, `overhead-sensitivity`.
- `finishing-final-controlled` contains fixed-shot results. The other `finishing-lanes*`, `finishing-high-matches`, `finishing-regression`, and partial `finishing-side-heldout` artifacts belong to the discarded distance-only trial.
- Next: wider mixed-roster/handedness checks and explicit progression-value targets; long-rally realism remains open.
- Evaluations do not write account history.
