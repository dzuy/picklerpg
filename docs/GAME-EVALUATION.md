# Automatic game evaluation

Run the real Match engine in Node, with all four players on auto-play. Replay-frame capture is disabled for evaluation speed; parity tests check that this does not change outcomes. These runs do not open a browser, call an LLM, write cloud records, or change saved players. The evaluator measures the current game, including its different home/partner/opponent decision paths; it does not substitute a supposedly fair policy.

## Commands

```sh
# Quick baseline: 48 games (3 scenarios × 2 seeds × 4 rotations × 2 opening servers)
npm run evaluate:games -- --scenario equal-70,90-vs-70,70-vs-50 --seeds 2 --out evaluation/quick

# Default suite: 640 games, including each individual skill
npm run evaluate:games -- --seeds 5 --out evaluation/baseline

# Larger equal-player audit: 800 games
npm run evaluate:games -- --scenario equal-70 --seeds 100 --out evaluation/equal-audit

# Calibration certification: side/roster/handedness/personality fairness
npm run evaluate:games -- --suite calibration-fairness --seed 14000 --seeds 30 --out evaluation/calibration-fairness

# Two adjacent 20-point progression steps for every skill
npm run evaluate:games -- --suite progression --seed 15000 --seeds 20 --out evaluation/progression-certification

# Reproduce one game, with shot diagnostics
npm run evaluate:games -- --scenario equal-70 --seed 1741 --seeds 1 --rotation 0 --opening-team home --trace true --out evaluation/repro
```

Each seed runs four rotations: A at home, A at home with partners exchanged, B at home, B at home with partners exchanged. Both opening servers are tested for every rotation by default. Use `--opening-team home` or `--opening-team away` to isolate one. The same seed is reused across rotations, and fresh seeds are used across blocks. IDs follow players through the swaps. Appearance and names do not affect the evaluation. All players use allCourt movement tendencies; handedness defaults to right. The default suite varies raw skill attributes, not the displayed rating.

The suite includes equal 50/70/90 teams; 90 versus 70 and 70 versus 50 teams; and eleven isolated-skill comparisons. In each isolated comparison, A has 90 and B has 50 in that skill, with every other skill fixed at 70. A skill that the policy rarely uses may have little effect on match results; inspect shot counts alongside win rates.

## Custom profiles

Pass `--config path/to/scenarios.json`. The file is an array of scenarios shaped as follows:

```json
[{"id":"custom-matchup","a":[{"id":"a1","skills":{"serve":70,"return":70,"drive":90,"drop":70,"dink":70,"reset":70,"volley":70,"counter":70,"overhead":70,"movement":70,"hands":70}},{"id":"a2","skills":{"serve":70,"return":70,"drive":90,"drop":70,"dink":70,"reset":70,"volley":70,"counter":70,"overhead":70,"movement":70,"hands":70}}],"b":[{"id":"b1","skills":{"serve":70,"return":70,"drive":50,"drop":70,"dink":70,"reset":70,"volley":70,"counter":70,"overhead":70,"movement":70,"hands":70}},{"id":"b2","skills":{"serve":70,"return":70,"drive":50,"drop":70,"dink":70,"reset":70,"volley":70,"counter":70,"overhead":70,"movement":70,"hands":70}}]}]
```

All eleven skills must be present and within 0–100. IDs must be unique within a scenario. Profiles optionally accept `handedness: "left"`.

## Reports and interpretation

- `report.md`: matchup win rates, home win rates, margins, shutouts, and completion counts.
- `summary.json`: additionally includes per-slot shot distributions, fault counts, mishit rates, mean execution quality, and mean endpoint deviation in metres.
- `games.jsonl`: one record per game with seed, rotation, score, player IDs by slot, point outcomes, and optional per-shot traces.
- `manifest.json`: complete skills, display ratings, policy, simulation timestep, seed range, Git revision/dirty state, runtime version, and source fingerprint.

Reuse the same config, seeds and timestep in a separate output directory after a gameplay change. Compare home advantage and skill advantages as well as margins and error frequencies. A/B win rates alone conceal role bias: identical teams must average 50% across mirrored sides even if home always wins.

Mirrored games are correlated. Standard error is calculated across complete seed blocks; it includes both A-win and home-win standard errors. Three to five seeds are useful for finding glaring bugs, not for certifying balance. Increase the number of seeds and confirm with manual playtests before choosing tuning thresholds. The current report deliberately does not fail a run for an arbitrary win-rate threshold.

CLI games stop at 25,000 simulation steps or 150 points by default. Use `--max-steps` and `--max-points` to change those limits. Capped games are explicitly reported and excluded from outcome averages; the CLI exits with code 2 if any are capped. Errors stop the run, leaving already written game records available. An output directory is replaced on rerun; use distinct directories to retain comparisons.

Fault counts use the engine's responsible-player attribution. Net/out rates can be calculated per shot, but reception failures such as missed swings should not be interpreted as per-shot execution errors. Shot traces contain the first flight leg endpoint, which can be an intercepted contact rather than a ground landing. Out-ball continuation animation is excluded from that endpoint. These diagnostics are evaluation artifacts, not persistent in-game replay history.

## Initial finding

The first 24-game smoke run reproduced the imbalance: equal-70 teams had a 100% home win rate across eight games. Both uniform skill advantages (90 vs 70 and 70 vs 50) won all eight games in their respective matchups. This shows that attributes affect outcomes, while the equal-player control still exposes a severe role advantage. The sample is small and shares seeds across rotations.

The wider baseline completed 192 games across all 16 scenarios with no caps (three seeds × four rotations). Equal-70 and equal-90 controls each had 100% home wins; equal-50 had 66.7%. Both uniform skill advantages won all their games. Single-skill results were mixed and often dominated by home advantage. See `evaluation/baseline/report.md`; this remains a small seed sample.

## Auto-play parity update

All four automatic players now share menus, personality/intelligence settings and per-player recent-choice history. Automatic receptions use the same contact-selection path on both sides. Manual-player reception prompts and explicit partner instructions remain available. Full auto-play uses the shared local policy; background opponent strategy remains available for manual play. Re-run older baselines with `--opening-team home` for matching opening-server conditions.

## Controlled skill checks

Run `npm run evaluate:skills -- evaluation/controlled-skills` to isolate drive execution and movement from match policy. This saves repeatable 50/70/90 comparisons for 2,000 identical drive seeds at comfortable, stretched and sideline contacts, a fixed movement coverage grid, and 200 identical incoming drives through actual match reception planning. These are internal gameplay diagnostics, not real-world DUPR benchmarks. Match results remain a separate end-to-end check.

Run `npm run evaluate:net-skills -- evaluation/net-skills-controlled` for hands, counter and volley at 30/50/70/90. All other attributes stay at 70. The same 2,000 seeds cover prepared, rushed and wide-target execution, plus fixed incoming-ball reception scenarios for hands. Volley checks include blocks and flicks; flicks intentionally plateau when the unchanged hands attribute becomes the limit. Execution in-court percentages are measured before defenders intercept the ball, while reception rates stop before executing the outgoing shot.

The reproducible smaller-gap match config is `evaluation/net-skills-levels.json`. Run it with `npm run evaluate:games -- --config evaluation/net-skills-levels.json --seed 8100 --seeds 20 --out evaluation/my-net-skill-levels`. See `evaluation/NET-SKILLS.md` for the measured effects and sampling limits.

Run `npm run evaluate:soft-skills -- evaluation/soft-opening-controlled` for serve, return, drop, dink and reset at 30/50/70/90, including lob execution via drop skill. Legal landing and target-depth metrics distinguish staying in bounds from hitting the kitchen or deep court. The command also runs 1,200 dink-start practice rallies, followed by normal auto-play, at home dink 50/70/90 against fixed skill-70 opponents. These drills supply targeted exposure; their home win rates are not symmetric-match balance tests. See `evaluation/SOFT-OPENING-SKILLS.md` for results and the unresolved scarcity of dinks in ordinary games.

Reception planning now prefers the earliest contact with preparation pressure at or below 0.4, retaining the least-rushed reachable emergency contact when no prepared option exists. It never chooses based on the sampled miss outcome. This prevents improved movement from automatically forcing a player into an earlier, less prepared shot.

## Rally-length diagnostics

`npm run evaluate:finishing -- evaluation/finishing-controlled` isolates overhead skill at 50/70/90 from net, retreating and staggered-defense contacts in both court directions. It reports intended landing legality separately from immediate winners, faults and returned balls. More precise placement need not produce more immediate winners for every fixed target; inaccurate balls sometimes create accidental winners.

Automatic overhead choices also estimate defender preparation time against the intended trajectory, including a possible bounce and the kitchen reach constraint. The estimate uses no execution seed, dispersion or hit/miss result. It favors targets that leave less preparation time and supplements the existing personality and variation policy. See `evaluation/FINISHING-AND-SIDES.md` for matched outcomes and the fresh side audit.

`node --import tsx scripts/evaluate-soft-opportunities.ts evaluation/soft-opportunities` measures requested versus actual soft-shot clearance and whether the actual reception planner chooses an airborne or bounced contact, in both court directions. It uses 200 identical seeds per shot/direction, skill-90 players, and fixed kitchen targets. This is a controlled reach diagnostic, not a symmetric match or a real-world biomechanical benchmark.

Soft placements (drop/dink/reset/block) now derive their arc from requested net clearance rather than a family-height floor. Planned reception feet must be within 1.2 m horizontally of the ball, including while standing outside the kitchen; short balls beyond reach can be received later or after bouncing. No dink-frequency target or forced-bounce rule is used.

Each game now records completed rallies with shot counts and simulated seconds. The summary and report include mean, 95th-percentile and maximum rally shot counts. Counts include the serve and return. Completed rallies from capped games are included; unfinished rallies are excluded, so inspect caps alongside these statistics. Repeated rotations are correlated and do not add independent evidence.

Automatic lob selection now accounts for how closely defenders cover the intended landing. Covered lobs lose preference; lobs over an advanced defense remain available. This uses current positions and intended targets, without looking at execution outcomes or changing player skills.

Overhead menus also offer shots at either defender's feet, subject to trajectory legality, on all four player slots. Previously they offered deep zone targets only, making many overheads pass defenders at a comfortable blocking height.

Swing misses retain a quadratic hands-skill benefit for an unpressured, slow ball. Timing pressure and incoming pace now scale with hands weakness linearly, so strong players can still miss rushed swings. This is a gameplay calibration, not a measured real-world error rate. It is independent of team, score and rally length; there is no forced ending or shot-count cap. See `evaluation/LONG-RALLIES.md` for matched and fresh-seed results.
