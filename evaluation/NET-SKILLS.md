# Hands, counter and volley evaluation

## Finding

Controlled skill curves behave in the expected direction. No gameplay tuning was made in this pass; the changes add repeatable evaluation coverage and regression tests. Match results below distinguish direct skill effects from end-to-end outcomes.

## Controlled contacts

All other attributes stay at 70. Seeds 0–1999 are reused at each rating (30, 50, 70, 90). These are game diagnostics, not measured real-world skill benchmarks.

| Check | Skill 50 | Skill 90 |
|---|---:|---:|
| Prepared counter/volley in court | 71.8% | 99.7% |
| Rushed counter/volley in court | 54.8% | 96.3% |
| Prepared counter/volley placement error | 0.966 m | 0.142 m |
| Hands: return a fixed rushed incoming ball | 68.3% | 96.4% |
| Hands: rushed outgoing volley mishits | 17.9% | 7.5% |

Counter and volley use the same execution benchmark curve, so identical prepared contacts produce matching accuracy figures. They apply to different shot families. Volley also controls blocks. Flicks use the lower of volley and hands: with hands fixed at 70, raising volley from 70 to 90 correctly leaves flick accuracy unchanged.

Hands has little effect on an easy, prepared volley but a substantial effect on rushed execution and reception. A strong shot skill cannot replace hands when the incoming ball is difficult to reach or handle. Incoming reception rates do not include success of the subsequent outgoing shot.

## Full games

Each row uses 20 seeds, four roster rotations and both opening teams (160 games). Other attributes stay at 70. Large gaps use seeds 8000–8019; smaller gaps use fresh seeds 8100–8119. The intervals below use 2.1× the standard error of the 20 seed-block win fractions, rather than treating mirrored games as independent. They are approximate and unadjusted for multiple comparisons.

| Attribute | Stronger vs weaker | Stronger-team game wins | Approx. interval | Stronger-team rally wins | Completed |
|---|---|---:|---:|---:|---:|
| hands | 90 vs 50 | 98.8% | 96.1%–100.0% | 60.4% | 160/160 |
| hands | 70 vs 50 | 75.0% | 66.5%–83.5% | 54.7% | 160/160 |
| hands | 90 vs 70 | 85.0% | 77.0%–93.0% | 56.9% | 160/160 |
| counter | 90 vs 50 | 68.8% | 57.4%–80.1% | 53.2% | 160/160 |
| counter | 70 vs 50 | 53.8% | 44.2%–63.3% | 50.4% | 160/160 |
| counter | 90 vs 70 | 63.7% | 55.7%–71.8% | 53.0% | 160/160 |
| volley | 90 vs 50 | 88.8% | 79.1%–98.4% | 56.6% | 160/160 |
| volley | 70 vs 50 | 63.7% | 55.7%–71.8% | 52.0% | 160/160 |
| volley | 90 vs 70 | 67.5% | 55.4%–79.6% | 53.3% | 160/160 |

## Interpretation and limits

- A persistent rally advantage compounds over a full game: hands 90 vs 50 won 60.4% of rallies but 98.8% of games in this sample.
- A small win-rate edge with an interval crossing 50% is inconclusive at this sample size; use the controlled tests to establish the direct mechanical effect.
- Hands affects reception across shot families, while counter is used only when choosing counters. Equal-sized attribute increases should not be assumed to produce identical win-rate changes.
- The smaller-gap comparisons use different seeds from the 90-vs-50 comparisons. Their win rates are not a paired additive decomposition of the larger gap.
- These checks establish direction and sensitivity, not an ideal balance among attribute costs or calibrated real-world DUPR values. Progression still needs explicit design targets for the relative value of improvements.
- Controlled contacts cover three situations and match profiles vary one attribute on both teammates. Mixed partners, handedness and different personalities remain outside this pass.
- Build and all 257 tests pass. New tests protect shot-skill accuracy, hands under pressure, and the hands-limited flick plateau.
- Detailed artifacts: `net-skills-controlled/report.md`, `net-skills-matches/report.md`, and `net-skills-level-matches/report.md`. Match manifests include source hashes and reproduction settings. Simulations do not write account history.
