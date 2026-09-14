# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 1760 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| serve-70-vs-50 | 80 / 0 | 47.5% | 32.5% | 4.38 | 0 | 10 |
| serve-90-vs-70 | 80 / 0 | 60.0% | 45.0% | 5.25 | 0 | 10 |
| return-70-vs-50 | 80 / 0 | 70.0% | 45.0% | 5.33 | 4 | 10 |
| return-90-vs-70 | 80 / 0 | 77.5% | 62.5% | 4.75 | 0 | 10 |
| drive-70-vs-50 | 80 / 0 | 60.0% | 50.0% | 4.30 | 0 | 10 |
| drive-90-vs-70 | 80 / 0 | 72.5% | 42.5% | 5.65 | 2 | 10 |
| drop-70-vs-50 | 80 / 0 | 60.0% | 55.0% | 4.95 | 2 | 10 |
| drop-90-vs-70 | 80 / 0 | 67.5% | 62.5% | 4.13 | 0 | 10 |
| dink-70-vs-50 | 80 / 0 | 65.0% | 45.0% | 4.95 | 0 | 10 |
| dink-90-vs-70 | 80 / 0 | 47.5% | 37.5% | 4.10 | 0 | 10 |
| reset-70-vs-50 | 80 / 0 | 70.0% | 50.0% | 4.60 | 0 | 10 |
| reset-90-vs-70 | 80 / 0 | 62.5% | 42.5% | 4.70 | 0 | 10 |
| volley-70-vs-50 | 80 / 0 | 65.0% | 55.0% | 4.47 | 0 | 10 |
| volley-90-vs-70 | 80 / 0 | 72.5% | 42.5% | 4.67 | 0 | 10 |
| counter-70-vs-50 | 80 / 0 | 62.5% | 47.5% | 4.47 | 0 | 10 |
| counter-90-vs-70 | 80 / 0 | 70.0% | 35.0% | 4.47 | 0 | 10 |
| overhead-70-vs-50 | 80 / 0 | 65.0% | 45.0% | 5.20 | 0 | 10 |
| overhead-90-vs-70 | 80 / 0 | 55.0% | 55.0% | 4.97 | 0 | 10 |
| movement-70-vs-50 | 80 / 0 | 52.5% | 57.5% | 5.20 | 2 | 10 |
| movement-90-vs-70 | 80 / 0 | 62.5% | 47.5% | 4.00 | 2 | 10 |
| hands-70-vs-50 | 80 / 0 | 60.0% | 35.0% | 5.53 | 2 | 10 |
| hands-90-vs-70 | 80 / 0 | 80.0% | 50.0% | 5.58 | 0 | 10 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| serve-70-vs-50 | 3350 | 4.6 | 11 | 20 |
| serve-90-vs-70 | 2872 | 4.9 | 11 | 23 |
| return-70-vs-50 | 2658 | 4.7 | 11 | 21 |
| return-90-vs-70 | 3308 | 5.0 | 11 | 20 |
| drive-70-vs-50 | 3344 | 4.7 | 10 | 20 |
| drive-90-vs-70 | 2756 | 5.0 | 11 | 29 |
| drop-70-vs-50 | 3406 | 4.6 | 10 | 22 |
| drop-90-vs-70 | 3064 | 5.2 | 11 | 27 |
| dink-70-vs-50 | 2988 | 4.7 | 10 | 19 |
| dink-90-vs-70 | 3130 | 4.9 | 11 | 30 |
| reset-70-vs-50 | 3172 | 4.6 | 10 | 26 |
| reset-90-vs-70 | 3232 | 5.0 | 11 | 31 |
| volley-70-vs-50 | 3118 | 4.6 | 10 | 20 |
| volley-90-vs-70 | 3096 | 5.0 | 11 | 29 |
| counter-70-vs-50 | 3198 | 4.7 | 10 | 20 |
| counter-90-vs-70 | 3096 | 4.9 | 11 | 20 |
| overhead-70-vs-50 | 2884 | 4.7 | 10 | 28 |
| overhead-90-vs-70 | 3102 | 4.8 | 11 | 23 |
| movement-70-vs-50 | 3090 | 4.8 | 10 | 25 |
| movement-90-vs-70 | 3232 | 4.8 | 11 | 19 |
| hands-70-vs-50 | 2912 | 4.5 | 10 | 23 |
| hands-90-vs-70 | 2878 | 5.2 | 12 | 27 |
