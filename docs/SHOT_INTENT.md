# Canonical shot intent — version 1

Every menu selection, scripted response, and future text, voice or AI adapter produces this JSON object. `parseShotIntent` validates and returns a detached, normalized object; `SHOT_INTENT_SCHEMA` exposes the same contract to browser tools. Neither intent format nor source grants permission to mutate physical state.

```json
{
  "schemaVersion": 1,
  "actor": "you",
  "type": "drive",
  "target": { "kind": "zone", "zone": "middle", "depth": "deep" },
  "pace": "fast",
  "shape": "flat",
  "intendedNetClearance": 0.4,
  "tacticalIntent": "pressure",
  "aggression": 0.75,
  "source": "menu"
}
```

| Field | Values / semantics |
| --- | --- |
| `schemaVersion` | Exactly `1`. No implicit migration of old payloads. |
| `actor` | `you`, `partner`, `opponent-left`, `opponent-right`. |
| `type` | serve, return, drive, block, overhead, drop, dink, volley, reset, lob, counter. These identify intent; generated shot families arrive in item 4. |
| `target` | Exactly one of the two target forms below. No execution coordinates. |
| `pace` | soft, medium, fast. Desired ball pace; no numerical speed resolver yet. |
| `shape` | arc, flat, descending. Broad desired trajectory profile. |
| `intendedNetClearance` | Finite nonnegative metres above the net; desired clearance, not a guaranteed outcome. |
| `tacticalIntent` | pressure, advance, neutralize, finish, sustain. Machine-readable tactical purpose. |
| `aggression` | Finite number from 0 to 1: desired risk/commitment. Independent of pace; a soft shot may still be aggressive. No execution effects yet. |
| `source` | menu, script, text, voice, ai. Provenance only; it never changes execution or bypasses validation. |

Targets:

- Zone: `{ "kind": "zone", "zone": "crosscourt", "depth": "deep" }`. Zone is middle, crosscourt, line, wide or open-court; depth is kitchen, transition or deep. These are relative tactical destinations on the receiving side.
- Player: `{ "kind": "player", "playerId": "opponent-right", "aim": "feet" }`. Aim is body, feet or backhand-side. The player must be on the opposing team at the contact.

These destinations are now resolved by Step 5; see [TARGETING.md](TARGETING.md). The existing authored `RallyShot.aimPoint` is now separate from `ShotIntent.target`; it keeps the current flight guide intact. Authored path legs and outcomes remain execution data outside the intent.

## Validation boundary

1. Reject missing/unknown fields, wrong types, unknown enum values, mixed target forms, unsupported versions, nonfinite numbers and out-of-range aggression. Do not coerce strings or silently strip an injected outcome.
2. Validate provider intents through the same parser; player targets cannot point at the actor's own team.
3. At submission, require a decision window and compare with the offered contact intents. Compare normalized fields, ignoring only source. A valid shape alone does not make a shot available: an overhead at an unavailable contact is rejected.
4. Execute the selected offered shot and record the actual source in both shot history and rally events. Input never supplies flight legs, ratings, score or a winner.

The current guided mode has one offered intent per decision. It does not implement text parsing, speech recognition, LLM calls, general shot legality or full intent-driven trajectories. Canonical fields describe those future inputs without pretending those systems exist.

`GameState.schemaVersion` is now **2**, because nested shot-history and rally-event payloads changed. The old coordinate target and free-text `tacticalGoal` are not retained as duplicate aliases; explanatory coaching copy remains in the scenario's description/cue.
