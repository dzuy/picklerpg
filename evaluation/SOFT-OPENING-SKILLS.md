# Serve, return and soft-game evaluation

## Findings

Serve, return, drop and reset show clear controlled accuracy improvements and positive full-game results in this sample. Dink accuracy and targeted-rally results improve strongly, but its benefit in ordinary matches remains unproven. No gameplay curves changed in this pass.

## Full games

All other attributes remain 70. Each main comparison uses seeds 9000–9019, four roster rotations and both opening teams (160 games). Dink was also checked on fresh seeds 9200–9219. Approximate intervals use 2.1× standard error across seed blocks; mirrored games are correlated. These are unadjusted exploratory intervals.

| Attribute / batch | Games | Stronger-team wins | Approx. interval | Family share of shots |
|---|---:|---:|---:|---:|
| serve / main | 160 | 63.7% | 54.1%–73.4% | 21.03% |
| return / main | 160 | 90.0% | 84.1%–95.9% | 20.20% |
| drop / main | 160 | 77.5% | 65.5%–89.5% | 6.27% |
| dink / main | 160 | 60.0% | 49.6%–70.4% | 1.04% |
| dink / fresh | 160 | 41.2% | 34.4%–48.1% | 0.91% |
| dink / combined | 320 | 50.6% | 43.7%–57.5% | 0.98% |
| reset / main | 160 | 68.8% | 58.1%–79.4% | 7.38% |

Drop skill also controls lobs. In its comparison, drops account for 6.27% of shots and lobs another 12.70%, so the win-rate benefit cannot be attributed to drops alone.

## Controlled placement

The same 2,000 seeds and prepared, low/rushed, or wide-target situations were repeated at skill 30/50/70/90. Other attributes stay at 70. Serve pressure uses a faster, flatter serve instead of an incoming-ball challenge.

| Prepared shot | Skill 50: target depth | Skill 90: target depth |
|---|---:|---:|
| serve | 94.4% | 100.0% |
| return | 94.1% | 100.0% |
| drop | 76.4% | 99.7% |
| dink | 75.7% | 99.7% |
| reset | 76.4% | 99.7% |

Target depth requires a legal landing in the kitchen for soft shots or beyond 4.5 m for serve/return/lob. These values describe landing accuracy before interception, not whether a defender can attack the ball. A sampled 100% is not a guarantee.

## Targeted dink rallies

Existing wide and behind practice layouts start with the same wide dink, then normal auto-play continues. Home dink varies; all other attributes and opponent skills stay at 70. Each setup/rating uses seeds 10000–10199. Home always starts; compare ratings within the drill, not against an assumed 50% baseline. All 1,200 rallies completed.

| Setup | Dink skill | Home rally wins | Opening fault rate |
|---|---:|---:|---:|
| wide | 50 | 22.5% | 54.0% |
| behind | 50 | 24.5% | 54.0% |
| wide | 70 | 41.5% | 27.0% |
| behind | 70 | 41.5% | 27.0% |
| wide | 90 | 60.0% | 0.0% |
| behind | 90 | 58.5% | 0.0% |

The targeted results show that dink skill works when dinks occur. Ordinary-game results (60% initially, 41.3% fresh, 50.6% combined) do not establish a match-win benefit. Low exposure is a plausible contributor, not proof of the sole cause. The planner prioritizes reachable airborne contacts; the decision menu generally offers dinks for low or bounced kitchen contacts. Investigate that interaction and soft-shot trajectories before tuning dink skill itself.

## Validation and next work

- Added `npm run evaluate:soft-skills`, covering opening/soft execution, lob mapping, and controlled dink-start rallies.
- Build and all 260 tests pass. All 960 games and 1,200 targeted rallies completed; no account history was written.
- Next: evaluate when soft shots create attackable balls, when receivers should let them bounce, and whether auto-play creates useful dink opportunities. Overhead sensitivity and progression costs remain separate checks.
- These profiles are one-attribute comparisons, not certification of all DUPR ratings, mixed rosters or personalities.
- Reproduction artifacts: `soft-opening-controlled`, `soft-opening-matches`, `dink-heldout-matches`. Match manifests retain source hashes and seeds.
