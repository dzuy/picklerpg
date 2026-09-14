# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; both opening servers tested by default. 384 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| equal-50 | 24 / 0 | 50.0% | 33.3% | 5.00 | 0 | 3 |
| equal-70 | 24 / 0 | 50.0% | 66.7% | 5.67 | 0 | 3 |
| equal-90 | 24 / 0 | 50.0% | 83.3% | 4.33 | 0 | 3 |
| 90-vs-70 | 24 / 0 | 100.0% | 50.0% | 10.92 | 22 | 3 |
| 70-vs-50 | 24 / 0 | 100.0% | 50.0% | 9.00 | 6 | 3 |
| serve-90-vs-50 | 24 / 0 | 58.3% | 41.7% | 4.75 | 0 | 3 |
| return-90-vs-50 | 24 / 0 | 100.0% | 50.0% | 6.00 | 0 | 3 |
| drive-90-vs-50 | 24 / 0 | 41.7% | 25.0% | 5.17 | 0 | 3 |
| drop-90-vs-50 | 24 / 0 | 83.3% | 66.7% | 6.67 | 0 | 3 |
| dink-90-vs-50 | 24 / 0 | 58.3% | 41.7% | 5.33 | 0 | 3 |
| reset-90-vs-50 | 24 / 0 | 58.3% | 41.7% | 4.83 | 0 | 3 |
| volley-90-vs-50 | 24 / 0 | 58.3% | 58.3% | 5.50 | 0 | 3 |
| counter-90-vs-50 | 24 / 0 | 58.3% | 25.0% | 6.33 | 0 | 3 |
| overhead-90-vs-50 | 24 / 0 | 75.0% | 41.7% | 4.00 | 0 | 3 |
| movement-90-vs-50 | 24 / 0 | 41.7% | 41.7% | 5.33 | 0 | 3 |
| hands-90-vs-50 | 24 / 0 | 91.7% | 58.3% | 7.17 | 2 | 3 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments and both within-team orders. Mirrored games are correlated; summary.json reports standard error across complete four-game seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.
