# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 480 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| equal-70 | 160 / 0 | 50.0% | 47.5% | 4.55 | 0 | 20 |
| drive-90-vs-50 | 160 / 0 | 65.0% | 47.5% | 4.60 | 0 | 20 |
| movement-90-vs-50 | 160 / 0 | 56.3% | 56.3% | 4.28 | 0 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| equal-70 | 6376 | 4.9 | 11 | 25 |
| drive-90-vs-50 | 6266 | 5.0 | 11 | 27 |
| movement-90-vs-50 | 6340 | 4.9 | 11 | 27 |
