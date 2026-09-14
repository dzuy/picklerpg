# Drive and movement calibration

## What changed

Receivers now prefer a prepared contact instead of the first barely reachable ball. If no prepared contact is available, they keep the least-rushed emergency option. Selection does not use the sampled hit/miss outcome. The same logic applies on both sides. Drive accuracy and movement-speed curves were left unchanged because controlled tests already demonstrated monotonic improvement.

The earlier three-seed match sample was too small to conclude that drive or movement did not matter. In the larger pre-change sample, stronger-drive teams won 67.5% and stronger-movement teams won 65.0%, each over 160 paired games.

## Controlled evidence

- Drive 50 → 90: comfortable-contact in-court rate 68.3% → 99.7%; mean placement error 0.943 m → 0.138 m across the same 2,000 seeds. Stretched and sideline contacts also improved.
- Movement 50 → 90: fixed-grid reach increased from 590/798 to 656/798 cases. This is diagnostic coverage, not a match return percentage.
- Actual reception planning before the fix: mean pressure rose from 0.842 at movement 50 to 0.865 at movement 90, despite the faster player.
- After the fix: mean pressure falls from 0.403 to 0.380; successful receptions rise from 184 to 185 out of the same 200 incoming drive samples (nine incoming drives were faults).

## Match rerun

| Scenario | Games | A win rate | Home win rate | Seed blocks | Approx. A win interval |
|---|---:|---:|---:|---:|---:|
| equal-70 | 160 | 50.0% | 52.5% | 20 | 50.0%–50.0% |
| drive-90-vs-50 | 160 | 68.8% | 48.8% | 20 | 57.4%–80.1% |
| movement-90-vs-50 | 160 | 62.5% | 50.0% | 20 | 50.2%–74.8% |
| equal-50 | 400 | 50.0% | 49.0% | 50 | 50.0%–50.0% |
| equal-90 | 80 | 50.0% | 40.0% | 10 | 50.0%–50.0% |

A denotes the higher-skill team in skill comparisons. Equal-team A win intervals collapse by mirror construction and do not measure fairness: use home win rates and independent seeds. Games within each seed block are correlated. Approximate skill intervals use a 2.1× standard-error band across seeds, not independent-game intervals. The 65% → 62.5% movement win-rate change is small relative to seed variation; this does not establish a match-win improvement from the timing fix. Its demonstrated benefit is preparation quality.

## Limits and follow-up

The equal-90 check used ten seeds. One away-opening seed exceeded 25,000 steps in all four equivalent rotations; raising the cap completed them at 27,623 steps. The table replaces those four capped runs with their completed reruns and preserves the original files. That unusually long game (~46 simulated minutes) merits high-skill rally-length tuning; this batch is not a certification of all rating levels.

Run `npm run evaluate:skills -- evaluation/my-controlled-check` for the controlled suite. Use the match evaluator with the same seeds for future paired comparisons. All runs are local diagnostics and do not alter account history.
