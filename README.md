# Pickle RPG — Pattern Lab

A strategy-first Three.js doubles prototype. No engine editor, backend, accounts, or API keys required.

## Run

```sh
npm install
npm run dev
```

Open the local URL Vite prints. `npm run build` checks TypeScript and creates `dist/`; `npm run preview` serves that production build. `npm test` runs simulation checks.

## First milestone

An elevated camera behind your team, four procedural stylized players, regulation court geometry, intent-generated ball arcs and automatic positioning, and the guided sequence:

1. Choose a deep diagonal serve.
2. Opponent returns deep crosscourt, then advances.
3. Pause at your contact after the return bounce; choose a drive through the middle.
4. Opponent blocks high into transition.
5. Pause at overhead contact; finish into the open deep corner.

The two required bounces occur before the third shot. Overhead contact and foot positions stay behind the kitchen. Completion awards one demonstration point; replay resets to 0–0. This is a guided scenario, not a complete scoring engine or match.

Click the shot card or press Space at a decision. During flight, Space pauses/resumes. R restarts. Controls include three playback speeds, tactical/lower camera views, and a flight guide toggle. Keyboard shortcuts do not override focused buttons or selects.

## Backlog and build order

The complete agreed roadmap is tracked in [docs/BACKLOG.md](docs/BACKLOG.md), with the original supplied text in [docs/roadmap-source.txt](docs/roadmap-source.txt). Work proceeds in numbered increments; Phase 2 is complete through item 14; Phase 3 player ratings come next.

The shared state contract, units, velocity semantics and event lifecycle are documented in [docs/GAME_STATE.md](docs/GAME_STATE.md).

The shared shot contract and validation boundary are documented in [docs/SHOT_INTENT.md](docs/SHOT_INTENT.md).

Try **Practice → Shot lab** to see and replay each implemented family. See [docs/SHOT_FAMILIES.md](docs/SHOT_FAMILIES.md) for behavior, contact gates and limits.

Target controls and geometry are documented in [docs/TARGETING.md](docs/TARGETING.md).

Expand **Flight intent** in Shot lab to compare pace, shape and clearance. See [docs/TRAJECTORIES.md](docs/TRAJECTORIES.md) for the deterministic mapping and guided-rally integration.

## Architecture

- `src/simulation.ts`: app composition root that defaults to the generated guided pattern.
- `src/engine/shot-intent.ts`: canonical intent parser, JSON Schema, target labels and source-independent semantic matching.
- `src/engine/shot-families.ts`: family contact gates and flight primitives.
- `src/shot-lab.ts`: isolated, unscored preview with prepared contacts and targets.
- `src/engine/targeting.ts`: state-aware semantic target resolution to ground or player-contact points.
- `src/engine/trajectory.ts`: full-intent flight generation, geometric metrics and exact interception slicing.
- `src/scenarios/generated-pressure.ts`: default guided policy using generated flights and contacts.
- `src/engine/model.ts`: shared court constants, state, intent, contact, provider and outcome contracts.
- `src/engine/rally-engine.ts`: reusable contact/decision/flight/point-end lifecycle, tactical stages, input validation and trajectory playback. It does not import the five-shot scenario.
- `src/scenarios/pressure-middle.ts`: legacy authored contacts retained for regression; the generated provider reuses its tactical/presentation templates.
- `src/scene.ts`: procedural Three.js court, players, net, cameras, target and flight rendering. It reads state without making tactical decisions.
- `src/main.ts`: menu input adapter, playback controls, display, optional browser-native WebMCP tools.
- `tests/shot-intent.test.ts`: zone/player targets, source equivalence, malformed inputs, contextual validation and provider validation.
- `tests/game-state.test.ts`: snapshot isolation, serialization, velocity and bounce behavior, paused time, event ordering, reset and profile validation.
- `tests/simulation.test.ts`: original guided-rally progression, pauses, reset, input validation, path continuity, dimensions and net clearance.
- `tests/rally-engine.test.ts`: procedural 13-shot exchange, repeatable tactical stages, early point endings, either-team results, branching options, partner contacts, snapshot isolation and invalid provider output.

World units are metres: X across court, Y height, positive Z toward your team. Dimensions are 20 × 44 feet, 7-foot kitchen each side, 2-inch lines measured inside outer court extents. Kitchen boundary lines lie inside the kitchen. Net top measures 34 inches at center and 36 inches at sidelines with a gentle quadratic sag. Source: [USA Pickleball official rulebook](https://usapickleball.org/docs/2025-USA-Pickleball-Rulebook.pdf).

`ShotIntent` contains schema version, actor, shot type, target player or zone, pace, shape, intended clearance, tactical intent, aggression, and input source. Menu, future text/voice, and scripted opponents use this format. `submitIntent` validates against the current contact’s available options before changing state. Playback state (`decision`, `flight`, `complete`) is separate from tactical stage (`serve`, `return`, `third`, `fourth`, `transition`, `kitchen-exchange`, `attack`, `counter`, `reset`, `point-end`). Opening stages are contact-count based; later stages use shot intent and current positioning. Providers receive cloned snapshots and return either the next contact or a point result. Terminal outcomes are explicit and awarded once. Fault detection and full doubles scoring are still future steps. Future LLM calls should receive a serialized state snapshot and return an intent; they must never mutate renderer or state directly. A separate execution resolver can later apply skill ratings, execution variance, and shot outcomes.

## Deliberate limits

Only the displayed shot is supported at each decision in the guided pattern. The separate Shot lab demonstrates family presets without opponent responses. Opponents are deterministic scripts, not LLM-powered. Trajectories are generated from intent; movement and swing gestures remain authored for readability rather than simulated physics. The ball is enlarged visually for tracking; court dimensions are exact. No open-ended shot selection, stochastic outcomes, RPG progression, match rules, network play, or text/voice parser is implemented yet. Optional WebMCP support is feature-detected; ordinary browsers use the UI.

## Execution variance

In Shot lab, expand **Execution** and turn variance on. Compare skill, balance and incoming pace; replay retains the same sample, while **New execution sample** draws another. The target marker remains the intended aim and the guide shows the sampled flight. Net misses stop at the net. See [execution notes](docs/EXECUTION.md).

Automatic positioning now drives the guided rally: coverage shifts with the ball, serving players wait for the return bounce, and hitters recover or advance. See [positioning notes](docs/POSITIONING.md).

## Opponent decisions

In Shot lab, expand **Opponent decisions**, choose an opponent contact and compare Aggressive versus Patient style. Press **Play shot** to animate the selected response from the far side. Player skill and incoming pace under Execution also affect choice. These prepared contacts exercise the shared rule-based policy; the guided five-shot pattern remains scripted. See [opponent policy notes](docs/OPPONENTS.md).

## Contextual choices

In Shot lab → **Your decision menu**, choose a prepared **Your contact**, select an **Available shot**, then play it. Deep bounced balls offer Drive, Drop and Lob from the same contact. Restart returns to the decision so you can compare another option. See [decision notes](docs/DECISIONS.md).

## Play a full game

Select **Full game · doubles** in Practice. Choose shot and target for You or Finn at decision pauses. Opponents respond automatically. Low neutral kitchen exchanges can auto-play; uncheck the toggle to make every team decision. Click **Next point** after a rally and **New game** after the result. Space selects the first offered shot, pauses flight, or starts the next point; R restarts the game.

Side-out doubles scoring starts 0–0–2 and plays to 11, win by two. The serve call and current server are shown beside the court. Movement and contact reach use a simplified model, with seeded execution error. Games are local and are not saved across refresh. [Match architecture and limitations](docs/MATCH.md).

## Latest playtest changes

Every home-team contact now waits for your selection; the auto-play toggle has been removed. Full game → Player skills shows distinct profiles and weaknesses. Canned choices remain for now; open-ended choices are saved in the backlog. Hands is currently a displayed placeholder; shot skills and movement already affect play.

## Phase 3 skills

Full game → Choose archetypes lets you start a game with different skills for each player. Finn's recommendations never auto-submit. Shot feedback reports skill and contact difficulty. Shot lab → Execution offers five difficulty presets and a same-contact 62/92 comparison. [Player skills guide](docs/PLAYER-SKILLS.md).

## Phase 4 opponent brain

Full game → Opponent brain offers six personalities and independent tactical intelligence. Local adaptive mode uses recent play observations. Optional LLM mode selects legal intents through a server-only Responses adapter, with local fallback. Configure `.env.local`, run `npm run opponent-server`, then select LLM mode. [Setup and verification status](docs/OPPONENT-BRAIN.md). Live API access has not yet been verified.

### Develop with your Codex plan

The local opponent service defaults to your ChatGPT-signed-in Codex CLI using GPT-5.6 Luna (low reasoning). Run `npm run opponent-server` and select **LLM with local fallback** in the game. No API key needed for this local workflow; opponent decisions consume Codex usage. Later set `OPPONENT_PROVIDER=api` and `OPENAI_API_KEY` in `.env.local` and restart the service.

## Pattern practice

Full game → Practice focus → choose a pattern → Start selected practice/game. Play the point, read the short feedback, and choose Next variation. Optional replay lets you scrub the latest rally and review choices. Free play remains available with no declared lesson. Session exposure records are cleared by page refresh. [Practice guide and limits](docs/PATTERN-PRACTICE.md).

## Custom text shots

At your team contact in Full game/practice, enter a shot under Your custom shot. Preview, review and explicitly play. Choose local parsing for common phrases or Language model for flexible wording. Repeat commands become quick actions. Menus remain available. [Supported language and approximation notes](docs/CUSTOM-SHOTS.md).

Custom shots now use one action: **Play custom shot** or Enter. Parsing switches automatically between local and language-model interpretation. There is no preview step; valid shots execute and invalid shots explain why.


### Player Design

Use **Player Design** in the header to create and name players, customize faces, skin, hair, hats, glasses and clothing colors, and adjust all eleven execution skills. **Save player** stores a profile locally; **Save & play** starts a new full game with that avatar, name, skill set and handedness. Saved profiles also apply in pattern practice and survive reloads on the same browser/origin. Guided rally and Shot lab retain their own benchmark skills. See [the phase plan and completed steps](docs/PLAYER-DESIGN.md).
