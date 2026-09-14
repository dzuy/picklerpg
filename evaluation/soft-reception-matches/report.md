# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 640 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| equal-70 | 160 / 0 | 50.0% | 50.0% | 4.00 | 0 | 20 |
| drop-90-vs-50 | 160 / 0 | 81.3% | 41.3% | 5.81 | 8 | 20 |
| dink-90-vs-50 | 160 / 0 | 62.5% | 50.0% | 5.11 | 0 | 20 |
| reset-90-vs-50 | 160 / 0 | 86.3% | 51.2% | 5.83 | 2 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| equal-70 | 7152 | 5.0 | 11 | 29 |
| drop-90-vs-50 | 5702 | 5.1 | 11 | 28 |
| dink-90-vs-50 | 6212 | 4.9 | 11 | 24 |
| reset-90-vs-50 | 5932 | 4.9 | 11 | 25 |
