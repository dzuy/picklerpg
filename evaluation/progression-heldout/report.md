# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 960 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| serve-70-vs-50 | 240 / 0 | 56.7% | 43.3% | 4.53 | 0 | 30 |
| dink-90-vs-70 | 240 / 0 | 51.7% | 53.3% | 4.59 | 0 | 30 |
| overhead-90-vs-70 | 240 / 0 | 60.0% | 53.3% | 4.84 | 0 | 30 |
| movement-70-vs-50 | 240 / 0 | 50.0% | 56.7% | 4.88 | 0 | 30 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| serve-70-vs-50 | 10040 | 4.6 | 11 | 25 |
| dink-90-vs-70 | 9950 | 4.8 | 11 | 26 |
| overhead-90-vs-70 | 9706 | 4.7 | 11 | 25 |
| movement-70-vs-50 | 9576 | 4.7 | 10 | 25 |
