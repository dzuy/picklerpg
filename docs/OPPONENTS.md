# Opponent shot selection — Step 9

`chooseOpponentShot(actor, context, players)` returns a canonical intent with source `ai` and a tactical reason, or null when no candidate is legal and feasible. The ordered policy is deterministic and does not mutate player or contact state. It does not award points.

Opening contacts select serve or return. High contacts favor overheads into open court. Low contacts favor resets from transition or dinks near the kitchen. Fast airborne balls invite counters when aggression, counter skill and contact height support them; otherwise a block absorbs pressure. Bounced deep balls invite a drive for aggressive players or a drop for patient players. Legal neutral options provide fallbacks. Every candidate passes existing contact constraints and trajectory generation, including two-bounce and kitchen volley restrictions.

Targets use existing semantic resolution. Middle preference chooses seam versus crosscourt; overheads select open court from opponent positions. Tuning thresholds are provisional strategy rules, not coaching grades or learned behavior. Balance, fatigue, opponent history and deeper planning are not yet policy inputs.

To test, open Shot lab → Opponent decisions. Prepared situations include incoming attack, low transition, high put-away, serve return, deep bounced ball and kitchen exchange. Aggressive versus Patient changes tactics; Player skill and Incoming pace in Execution also influence decisions. Manual family, target and flight controls are disabled while the policy owns intent. Play animates the far-side opponent's chosen shot, including optional execution variance. The response explanation and canonical intent are exposed in the existing read-state browser tool.

The prepared opponent contact is not derived from a preceding user shot. This increment implements and exercises decision selection in isolation. The guided rally retains its authored tactical sequence. A continuous adaptive point still needs contextual user menus, receiver/contact integration and point-ending behavior; the Phase 2 milestone remains open. No LLM service or keys are required.

Validation covers six situations, style and skill branches, canonical intent validation, mirrored far-side playback, determinism, immutability, opening/kitchen restrictions, execution integration and return to manual mode. All 59 tests and the build pass.

## Phase 2 integration update

Full game mode now connects this component to continuous points and doubles scoring. Earlier isolated-increment limitations above describe the lab/guided modes; see [MATCH.md](MATCH.md) for the integrated game and current limitations.
