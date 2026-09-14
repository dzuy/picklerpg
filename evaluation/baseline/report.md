# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; home serves first. 192 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| equal-50 | 12 / 0 | 50.0% | 66.7% | 4.00 | 0 | 3 |
| equal-70 | 12 / 0 | 50.0% | 100.0% | 9.00 | 4 | 3 |
| equal-90 | 12 / 0 | 50.0% | 100.0% | 8.00 | 0 | 3 |
| 90-vs-70 | 12 / 0 | 100.0% | 50.0% | 10.83 | 10 | 3 |
| 70-vs-50 | 12 / 0 | 100.0% | 50.0% | 8.83 | 4 | 3 |
| serve-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 8.67 | 4 | 3 |
| return-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 7.50 | 2 | 3 |
| drive-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 9.50 | 2 | 3 |
| drop-90-vs-50 | 12 / 0 | 83.3% | 66.7% | 7.17 | 2 | 3 |
| dink-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 9.00 | 4 | 3 |
| reset-90-vs-50 | 12 / 0 | 33.3% | 83.3% | 7.83 | 2 | 3 |
| volley-90-vs-50 | 12 / 0 | 66.7% | 83.3% | 5.83 | 0 | 3 |
| counter-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 8.33 | 0 | 3 |
| overhead-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 8.00 | 2 | 3 |
| movement-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 7.17 | 2 | 3 |
| hands-90-vs-50 | 12 / 0 | 50.0% | 100.0% | 7.17 | 2 | 3 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments and both within-team orders. Mirrored games are correlated; summary.json reports standard error across complete four-game seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.
