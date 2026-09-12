# Contextual decision menus — Step 10

`buildDecisionMenu` receives an actor, contact context and players. It offers a small tactical subset of canonical shot intents, then filters each through contact legality and trajectory feasibility. It does not modify the contact to accommodate a selected shot.

Serve/return openings offer the appropriate opening family. Deep bounced contacts offer drive/drop/lob. Low contacts favor soft resets/drops or kitchen dinks. Airborne attacks offer counter/block/volley; high contacts favor overheads. These are provisional sensible defaults, not an exhaustive list of every legal pickleball shot.

Shot lab's Your decision menu provides seven prepared contacts. The Available shot selector previews the selected option from the same location and incoming situation. Manual family/target/flight controls are disabled while contextual intent owns the shot. User menus take precedence over opponent previews; turning user menus off restores the opponent/manual settings. Execution variance remains available.

Choices are accepted only during a decision pause and must match an offered intent (input source may differ). The browser read tool exposes the full available list, and the play tool accepts those alternatives through the same validator. After playback, Restart returns to the decision for comparison. No score is awarded.

This increment is tested in isolated prepared-contact practice. It does not yet connect opponent responses and menus into a continuous unscripted point. The guided teaching pattern intentionally retains its prescribed shot. M2 remains incomplete pending decision pacing and point-engine integration.

Validation: menu contents for opening/deep/attack/kitchen contacts, legal trajectory generation, two-bounce and kitchen exclusions, input immutability, fixed contact across alternatives, stale/unavailable intent rejection, and user/opponent mode precedence. All 63 tests and the build pass; browser drop selection/playback checked.

## Phase 2 integration update

Full game mode now connects this component to continuous points and doubles scoring. Earlier isolated-increment limitations above describe the lab/guided modes; see [MATCH.md](MATCH.md) for the integrated game and current limitations.
