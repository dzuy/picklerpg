# Canonical game state — schema version 2

`GameState` in `src/engine/model.ts` is the shared simulation contract. The renderer reads this state; input adapters and providers receive detached copies through `RallyEngine.snapshot()`. The browser's `read_pickleball_state` tool exports the same snapshot. It contains only JSON values and no Three.js objects, functions, references to live state, or hidden provider state. It is an observation contract, not a save-game/restore API.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `2`. Change deliberately when the serialized contract changes. |
| `simulationTime` | Seconds of played simulation time since reset; excludes manual pauses and decision time. |
| `ball.position` | Metres; `y` is contact/ball height above the court. No duplicate height property. |
| `ball.velocity` | Metres per simulation second, analytic derivative of the authored trajectory. |
| `players` | Four players: ID, team, position, facing, handedness, skills and tendencies. |
| `phase` | `decision`, `flight`, or `complete`. |
| `stage` | Tactical stage, independently tracked from playback. |
| `currentHitter` | Player awaiting contact in a decision, or player whose shot is in flight. `null` at point end. |
| `possession` | Team of `currentHitter`; `null` at point end. This describes contact control, not serve ownership. |
| `shotHistory` | Accepted intents in contact order, including actual input source. |
| `rallyHistory` | Ordered typed events: rally start, contact, shot, bounce, point end. |
| `bounces` | Cumulative bounce count for the current rally. |
| `score` | Current demonstration point tally by team. Side-out scoring and server rotation come in item 13. |
| `result` | Explicit winning team and reason, or `null` before point end. |
| `shotIndex`, `legIndex`, `elapsed` | Zero-based contact/path indices and seconds elapsed within the current path leg. |
| `paused` | Manual playback pause; a decision is already frozen through `phase`. |

## Units and lifecycle

Positive X is across the court to the user's right, positive Y is up, and positive Z is toward the user's baseline. Facing is rotation in radians around +Y: zero faces -Z; PI faces +Z. The scene consumes facing directly and mirrors the paddle side for left-handed players. Facing remains fixed in this scenario; dynamic tracking is separate movement/animation work.

Velocity uses the authored curve derivative and updates at every simulation step, at launch, and when entering a new leg after a bounce. It retains the incoming velocity while paused at contact, so future tactical logic can read pace and direction. Pausing does not set it to zero or scale it by playback speed. Initial serve and finished point velocity are zero. This is scripted kinematics, not a physical collision model.

Event times use `simulationTime`. Contact events capture the incoming ball position/velocity and hitter; shot events capture accepted intent and contact position. Both carry `shotIndex`, connecting them to `shotHistory`. Bounces record their actual leg endpoint. Point-end records the explicit outcome exactly once. Terminal state and events do not advance further. Reset clears the tally, time, shot history and event history, then records a fresh rally start and initial contact; no cross-rally memory is implied yet.

## Profiles

Skills are named values in [0, 100]: serve, return, drive, drop, dink, reset, volley, counter, overhead, movement, hands. Tendencies are values in [0, 1]: aggression, middle preference, kitchen approach. Both exist on every player, including the partner. Setup validates finite values and ranges, player identity, position, team, facing and handedness before replacing state.

The guided fixture initializes all skills to 70 and tendencies to 0.5. These are neutral placeholder data, not calibrated ratings or learned preferences. They do not yet change execution or shot choice. Rating effects, archetypes and adaptation remain in their agreed later backlog steps.

## Scope boundary

The former `state.ball` vector is now `state.ball.position`; the former `state.history` is now `state.shotHistory`. Consumers are migrated without duplicate aliases. Canonical shot intent version 1 is documented in [SHOT_INTENT.md](SHOT_INTENT.md). State schema version 2 reflects that nested contract change. Server numbers, game-to-11 rules, fatigue, match memory, replay reconstruction and persistence are not implemented by this contract.
