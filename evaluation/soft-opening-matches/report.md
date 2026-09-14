# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 800 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| serve-90-vs-50 | 160 / 0 | 63.7% | 48.8% | 4.46 | 2 | 20 |
| return-90-vs-50 | 160 / 0 | 90.0% | 45.0% | 5.85 | 6 | 20 |
| drop-90-vs-50 | 160 / 0 | 77.5% | 45.0% | 5.20 | 4 | 20 |
| dink-90-vs-50 | 160 / 0 | 60.0% | 57.5% | 4.59 | 2 | 20 |
| reset-90-vs-50 | 160 / 0 | 68.8% | 41.3% | 5.60 | 4 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| serve-90-vs-50 | 6416 | 4.8 | 10 | 24 |
| return-90-vs-50 | 5484 | 4.7 | 10 | 28 |
| drop-90-vs-50 | 5960 | 4.8 | 10 | 24 |
| dink-90-vs-50 | 6278 | 4.9 | 10 | 24 |
| reset-90-vs-50 | 5830 | 4.9 | 10 | 28 |
