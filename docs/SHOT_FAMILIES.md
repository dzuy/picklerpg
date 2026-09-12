# Basic shot families and Shot lab

Choose **Practice → Shot lab** in the header, select a family and **Typical contact**, then **Play shot**. Compare the fast drive with a drop or a lob. Try **Overhead + Ankle-high contact**, or **Volley + Inside kitchen, before bounce**, to see an unavailable contact and its reason. Replay, pause, speed, camera and guide controls work in this mode. Choose **Guided rally** to return to the original point.

`src/engine/shot-families.ts` implements serve, drive, drop, dink, volley, reset, lob, overhead and counter, plus return and block for compatibility with the initial rally. Each has a flight profile and contact requirements. `buildFamilyFlight` accepts a family, a contact context and an explicit resolved landing point; it returns a continuous flight leg usable by the existing renderer/sampler. It does not interpret semantic shot targets.

| Family | Baseline horizontal speed (m/s) | Baseline arc lift (m) | Contact mode |
| --- | --- | --- | --- |
| Serve | 7 | 1.3 | Opening serve |
| Return | 7.5 | 1.8 | After bounce |
| Drive | 14 | 0.5 | Ground or air |
| Drop | 5 | 1.5 | After bounce |
| Dink | 3.5 | 0.85 | After bounce, near kitchen |
| Volley | 10 | 0.25 | Before bounce |
| Reset | 4.5 | 1.5 | Ground or air |
| Lob | 4.5 | 4 | Ground or air |
| Overhead | 17 | 0.04 | High, before bounce |
| Counter | 15 | 0.25 | Before bounce, incoming attack |
| Block | 5 | 0.9 | Before bounce, incoming attack |

These are readable prototype tuning values, not measured player data. Arc lift is increased only as needed to clear the net at the crossing. Flights land at the supplied point with a bounce marker. Family height bands and incoming-speed thresholds are simplified suitability gates, not a full rulebook implementation. For example, this overhead family models an overhead volley, not every possible overhead after a bounce.

The context explicitly declares whether the ball has bounced, whether the two-bounce opening is complete, the opening role, player foot position and incoming speed. Gates reject premature volleys, volleys with feet in the kitchen, low overheads, deep-court dinks, and counters/blocks without an incoming attack. Serve checks cover opening role, behind-baseline position, diagonal landing and kitchen exclusion. Paddle-contact rules, momentum faults, reach, full service legality, and opponent interception remain future work.

`src/shot-lab.ts` provides isolated preview playback with four players and resolved targets. It uses the same family flight builder and trajectory sampler, but does not award points, simulate an opponent reply or produce a rally history. Browser state reads explicitly identify `mode: lab`; previews must not be treated as match results. Switching modes resets the selected mode. Invalid conditions show the contact without a misleading valid flight guide.

Step 4 does not replace the guided five-shot fixture yet. Step 5 now resolves semantic targets in Shot lab (see [TARGETING.md](TARGETING.md)); Step 6 will connect full intent-driven execution to rallies; item 7 adds variance. The raw family profiles and single-shot preview are complete, while those later integrations remain queued.
