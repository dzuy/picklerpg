# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 960 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| volley-70-vs-50 | 160 / 0 | 63.7% | 41.3% | 5.17 | 2 | 20 |
| volley-90-vs-70 | 160 / 0 | 67.5% | 55.0% | 4.90 | 2 | 20 |
| counter-70-vs-50 | 160 / 0 | 53.8% | 48.8% | 4.38 | 0 | 20 |
| counter-90-vs-70 | 160 / 0 | 63.7% | 36.3% | 5.00 | 2 | 20 |
| hands-70-vs-50 | 160 / 0 | 75.0% | 42.5% | 5.56 | 0 | 20 |
| hands-90-vs-70 | 160 / 0 | 85.0% | 55.0% | 5.85 | 4 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| volley-70-vs-50 | 6018 | 4.6 | 9 | 19 |
| volley-90-vs-70 | 6282 | 5.0 | 11 | 31 |
| counter-70-vs-50 | 6430 | 4.7 | 10 | 20 |
| counter-90-vs-70 | 6264 | 4.8 | 10 | 23 |
| hands-70-vs-50 | 5886 | 4.5 | 9 | 19 |
| hands-90-vs-70 | 5470 | 5.1 | 12 | 30 |
