# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 480 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| volley-90-vs-50 | 160 / 0 | 88.8% | 43.8% | 5.54 | 8 | 20 |
| counter-90-vs-50 | 160 / 0 | 68.8% | 48.8% | 4.94 | 2 | 20 |
| hands-90-vs-50 | 160 / 0 | 98.8% | 48.8% | 6.58 | 8 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| volley-90-vs-50 | 6072 | 4.7 | 10 | 20 |
| counter-90-vs-50 | 6334 | 4.9 | 11 | 26 |
| hands-90-vs-50 | 5310 | 4.7 | 10 | 20 |
