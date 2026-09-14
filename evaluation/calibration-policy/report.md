# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest. 540 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| fair-personality-banger | 60 / 0 | 45.0% | 45.0% | 4.28 | 0 | 0 |
| fair-personality-grinder | 60 / 0 | 43.3% | 43.3% | 4.48 | 1 | 0 |
| fair-personality-technician | 60 / 0 | 43.3% | 43.3% | 4.80 | 2 | 0 |
| fair-personality-gambler | 60 / 0 | 53.3% | 53.3% | 4.53 | 0 | 0 |
| fair-personality-wall | 60 / 0 | 58.3% | 58.3% | 4.22 | 0 | 0 |
| fair-personality-chess-player | 60 / 0 | 56.7% | 56.7% | 4.37 | 0 | 0 |
| fair-intelligence-02 | 60 / 0 | 55.0% | 55.0% | 4.28 | 0 | 0 |
| fair-intelligence-05 | 60 / 0 | 55.0% | 55.0% | 4.28 | 0 | 0 |
| fair-intelligence-09 | 60 / 0 | 56.7% | 56.7% | 4.37 | 0 | 0 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments, both within-team orders, and the configured opening servers. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.

## Rally length

Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.

| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |
|---|---:|---:|---:|---:|
| fair-personality-banger | 2362 | 5.0 | 11 | 27 |
| fair-personality-grinder | 2485 | 6.1 | 14 | 29 |
| fair-personality-technician | 2481 | 6.3 | 16 | 42 |
| fair-personality-gambler | 2416 | 4.2 | 9 | 21 |
| fair-personality-wall | 2480 | 6.8 | 19 | 43 |
| fair-personality-chess-player | 2592 | 4.7 | 10 | 26 |
| fair-intelligence-02 | 2602 | 4.7 | 10 | 26 |
| fair-intelligence-05 | 2602 | 4.7 | 10 | 26 |
| fair-intelligence-09 | 2592 | 4.7 | 10 | 26 |
