# Execution variance — Step 7

`executeShot` consumes canonical intent, shot context, players and explicit seed/balance conditions. It preserves the intended trajectory and returns a separate sampled flight, quality, dispersion, endpoint deviation and geometric outcome. Skill uses the shot-specific 0–100 rating (lob uses drop; block uses volley). Inputs are not mutated.

Quality combines skill with penalties for incoming speed, low contact and lack of balance. Quality controls bounded lateral/depth, lift and duration error. These are prototype constants, not measured probabilities or player ratings. The displayed quality is a tuning score, not a chance of success. Fatigue is deferred as requested.

A seeded Mulberry32 sample makes comparisons repeatable, independent of frame rate and input source. Replay and Restart retain the sample; New execution sample increments its seed. Changing conditions reuses that seed so differences are attributable to the changed conditions.

Shot lab defaults to ideal flight. Enable Execution variance to animate the actual sample. The marker remains the intended target. The guide follows the sample, with net contact truncating the curve; peak and clearance readouts are explicitly labeled intended. Endpoint deviation measures the unimpeded endpoint even when the net stops the flight.

Net checks include ball radius and net width. Ground endpoints are checked against court boundaries with ball-radius tolerance. These are preview diagnostics, not complete point adjudication: service-box faults, net-post collisions, low intermediate ground collisions and opponent interception are future point-engine work. Elevated player targets are target-plane previews. No score is awarded in the lab.

The reusable adapter is exercised in Shot lab; the guided five-shot provider deliberately continues to use ideal execution. Dynamic positioning and responses (Phase 2) must handle deviated contacts before variance can drive a full unscripted rally safely. Balance is an explicit lab input pending automatic movement integration.

Validation: 50 passing tests cover replay/source independence, input immutability, skill and difficulty effects, net/out/in samples, invalid parameters and actual lab playback. Build passes. Browser tested balance changes, new samples and net-stop playback.

## Phase 2 integration update

Full game mode now connects this component to continuous points and doubles scoring. Earlier isolated-increment limitations above describe the lab/guided modes; see [MATCH.md](MATCH.md) for the integrated game and current limitations.
