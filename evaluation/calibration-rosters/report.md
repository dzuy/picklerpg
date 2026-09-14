# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 640 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| fair-star-support | 160 / 0 | 50.0% | 58.8% | 4.94 | 4 | 20 |
| fair-complementary | 160 / 0 | 50.0% | 57.5% | 4.67 | 2 | 20 |
| fair-all-left | 160 / 0 | 50.0% | 40.0% | 5.10 | 8 | 20 |
| fair-mixed-handedness | 160 / 0 | 50.0% | 36.3% | 4.80 | 8 | 20 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| fair-star-support | 6564 | 5.0 | 12 | 29 |
| fair-complementary | 6442 | 4.7 | 10 | 25 |
| fair-all-left | 6180 | 4.7 | 11 | 21 |
| fair-mixed-handedness | 6234 | 4.8 | 11 | 21 |
