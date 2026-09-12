# Full doubles game — Phase 2, steps 11–14

Practice → Full game · doubles runs an unscripted game against Jules and Rio. You select shot and target for both You and Finn. The existing guided pattern and isolated labs remain available.

## Match loop

`Match` composes the reusable RallyEngine with a state-based provider. Home contacts use contextual menus with middle/open-court and wider alternatives. Away contacts use the existing rule-based policy. All shots pass through canonical intent validation, trajectory generation and seeded execution variance. The next contact is computed from the resulting trajectory, not a five-shot sequence.

The provider searches samples along the incoming flight for a reachable opposing contact, respecting contact height and the non-volley zone. The first two shots must bounce. Ground pickups wait for a readable rising contact. Serve return is restricted to the diagonally designated receiver. Other contacts choose the reachable opponent nearest the ball. Recovery destinations use the automatic positioning planner; the selected receiver's destination is limited by elapsed time, movement skill and a small paddle-reach allowance.

## Decisions and point endings

Low neutral dink/block contacts near the kitchen after the opening can auto-play. Transition, opening and attack choices remain pauses. Disable Auto-play low neutral contacts to control every home contact. Opponents always choose automatically. Pauses freeze simulation time.

Net faults truncate flight at the net. Out landings and serves outside the diagonal service box lose the point. An unreturned ground ball animates through a second bounce. Overhead winners and unreturned attacks have distinct explanations; a reached contact with no legal feasible reply is a failed return. There is no rally-length cap or predetermined winner.

Execution includes ordinary bounded error and a rare seeded mishit (probability 1.5% + 4% × quality deficit, sixfold endpoint/lift error). This permits occasional mistakes even during very safe exchanges. The mishit flag is included in execution diagnostics. These are provisional tuning constants, not calibrated error rates.

## Scoring

DoublesScore stores team scores, serving team, server identity, service-turn number, and each team's right-court player. Only the serving team scores. A scored point swaps that team's service court while the same person continues serving. On a lost rally, server one passes to their partner; server two triggers a side-out. The opening turn starts with server two. A side-out starts with the receiving team's right-court player as server one. Games end at 11 or more with a two-point lead.

References: [USA Pickleball scoring and positioning](https://usapickleball.org/strategies/pickleball-scoring-positioning-side-out-scoring/) and [rules overview](https://usapickleball.org/what-is-pickleball/how-to-play/).

The point result is applied once. Next point initializes the correct formation without resetting scores. Game completion prevents further point starts; New game resets the score and sequence. The browser read tool exposes match scoring/point state alongside the live rally and available intents.

## Verification and practical limits

Tests cover full games with multiple seeds/choices, hundreds of point samples, rallies longer than the original pattern, net/out/unreturned outcomes, serve rotation and parity, deuce, no double awards, deterministic restart, two-bounce opening and pause behavior. Browser checks cover the live menu and point flow. Production build passes.

Physics and locomotion remain intentionally approximate: sampled reachability, simple rebound arcs, no player collision solver, swing-footwork faults or net-cord deflections. A net contact is treated as a fault rather than simulating a playable deflection. Fatigue, persistent saves, difficulty settings and sophisticated opponent planning remain future work. The court ends remain fixed for camera readability. A refresh or Restart discards the current local game.

## Playtest revision

Home-team auto-play has been removed: all home contacts require explicit selection, overriding the earlier neutral-automation description. Match players now use the distinct profiles in player-profiles.ts, including lower opponent movement and weaker shot families. Full game exposes all eleven ratings. Hands is not yet used in contact resolution.
