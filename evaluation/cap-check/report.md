# Match evaluation

Policy: Current local auto-play; allCourt tendencies; no LLM; home serves first. 4 games. Fixed simulation step: 0.1 s.

| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |
|---|---:|---:|---:|---:|---:|---:|
| equal-70 | 0 / 4 | — | — | — | 0 | 0 |

A/B refer to the configured teams, regardless of court side. Each seed runs both side assignments and both within-team orders. Mirrored games are correlated; summary.json reports standard error across complete four-game seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.

See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.
