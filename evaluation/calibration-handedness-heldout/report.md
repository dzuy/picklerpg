# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 640 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| fair-all-left | 320 / 0 | 50.0% | 56.3% | 4.08 | 4 | 40 |
| fair-mixed-handedness | 320 / 0 | 50.0% | 57.5% | 4.12 | 4 | 40 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| fair-all-left | 13480 | 4.7 | 11 | 24 |
| fair-mixed-handedness | 13420 | 4.7 | 11 | 32 |
