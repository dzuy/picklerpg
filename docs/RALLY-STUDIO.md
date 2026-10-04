# Rally Studio

Run `npm run dev` and open `/rally-studio.html`. This is a development-only clip-making page; the normal production entry does not include it. It never starts a stored game, awards rewards, writes the player roster, or emits match analytics.

Describe a rally using a hit count (1–40, including ranges), shot names, ATP/Erne, and an optional ending (body bag, winner, net, out). The interpreted brief is shown before search. Other prose is not a general-purpose instruction language. New shot types in `SHOT_TYPES` automatically become searchable by name; new custom language or outcome predicates belong in `parseRallyBrief`.

Choose complete rally to count from the serve, or finishing excerpt to keep the last requested contacts of a longer point. Court and atmosphere change live. Player controls support locally saved characters, names, jersey colors, and the current gameplay skill archetypes. Saved skills preserves the character's actual skill distribution. Both game types use the existing doubles scoring modes; singles is not implemented by the game engine.

The search worker runs the real `Match` class with local autonomous controllers. It uses real shot execution, movement, reach, reception timing, collision and outcome logic. It does not author ball paths, force endings, or replace gameplay rules. Candidates advance to engine boundaries; accepted candidates are re-run at 60 Hz through `Match.update` and rechecked before display. Unmatched or impossible requests report no match rather than inventing a result. Search budgets are bounded; cancel terminates the worker. Gameplay changes therefore flow through the studio without a second animation implementation.

The renderer is the existing `CourtScene`, including body-hit reactions. Scrubbing and speed use recorded state; a body-hit take retains the full reaction. Recording view hides controls and gives a three-second lead-in; Escape exits. Capture the portrait rectangle with an external screen recorder. Dimensions are CSS pixels (the renderer follows device pixel ratio). Loop, slow motion, branding and name labels are optional. Browser-local studio settings persist independently of game saves; takes are regenerated after reload. Reuse the accepted seed, roster, scope and brief to reproduce a take on the same engine version.

Checks: `node --import tsx --test tests/rally-studio.test.ts`, `npx tsc --noEmit`, and `npm run build`. Browser smoke: generate default body-hit request; pause, scrub and replay; toggle court/format; enter recording mode and Escape; cancel a long search; inspect an invalid brief and an unmatched search.

## Capture overlays and wardrobe

The studio randomizes clothing and accessories across the full cosmetic catalog, including Premium parts, using a separate saved wardrobe seed. Shuffle outfits updates the current take immediately while leaving recorded skills and outcomes intact. This preview access exists only in the development studio; it does not grant account ownership or change purchase enforcement. Saved character identity and skills remain intact.

Show player names and Show guide lines control the existing court renderer. The custom shot-selector overlay has been removed. “Show gameplay shot selector for” mounts the actual `CourtTargetPicker` inside the recording frame for one selected player, defaulting to Player 1. Each contact gets a three-second presentation window: the normal shot list appears, then the existing `attachShotPower` control demonstrates the recorded power before play resumes. Menu rendering, risk/pressure assessment, illustrations, hold-state effects and CSS are shared with gameplay. A replay-only adapter supplies recorded engine options and assessment contexts without submitting a new shot. Choose Nobody for continuous playback. Scrubbing and speed include these presentation windows.

Player labels use `CourtScene` and its shared `player-label.css`, extracted from the existing gameplay styles. The studio does not override their markup, thinking indicators, contact reactions, or appearance. Check the real gameplay feature before adding any further studio UI.
