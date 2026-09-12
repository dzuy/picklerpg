# Automatic positioning — Step 8

`planPositions` computes destinations from player state, intent, ball endpoint, expected receiver, completed-shot count and flight duration. The generated guided provider now uses this planner rather than its legacy movement templates. Initial formation and receiver choice remain scenario policy.

Players retain left/right coverage lanes based on their current positions and shift toward the ball as a pair. The serving team holds at the baseline through the return flight. The returning side recovers toward the kitchen. Drives, drops and resets advance the hitting team incrementally; lob defense tracks deeper. The designated receiver prepares beside the upcoming contact, with elevated contact preparation outside the kitchen.

Non-receiver recovery is limited by a movement-skill-dependent distance budget (1.8–3.8 metres per second of flight). The engine interpolates destinations smoothly and freezes movement at human decisions or playback pauses. This budget limits total distance, not instantaneous acceleration or speed under the easing curve.

This is tactical positioning, not a physical interception solver. Receiver arrival remains guaranteed by the guided contact schedule and is exempt from the movement budget. Collision avoidance, reachability-based missed returns, and movement-derived execution balance are future integration work. Opponent shot choice is item 9; complete point endings are item 12. Shot lab continues to use prepared stationary contacts.

Validation covers opening discipline, receiver setup, coverage sensitivity to endpoint, advance behavior, movement skill/duration budgets, volley preparation on both sides, and paused/reset state. The complete guided sequence remains covered by the existing generated-rally test.

## Phase 2 integration update

Full game mode now connects this component to continuous points and doubles scoring. Earlier isolated-increment limitations above describe the lab/guided modes; see [MATCH.md](MATCH.md) for the integrated game and current limitations.
