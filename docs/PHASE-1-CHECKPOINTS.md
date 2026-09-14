# Phase 1: local checkpoints and resume

Implemented for full solo matches only. Multiplayer product decisions are recorded in `TURN_BASED_MULTIPLAYER_PLAN.md` §9. No Phase 2 control changes, remote APIs, tables, challenge flows or notifications are included.

## Architecture

The app installs `Match.onCheckpoint` as a synchronous local commit sink. Headless/legacy simulation and practice can still use Match without a sink. With the sink installed:

1. Validate the player's or CPU's chosen intent at the existing engine boundary.
2. Copy the logical engine into a headless resolver using explicit state fields.
3. Advance along the existing flight legs to a contact, net reception choice or point end; do not use browser frames or make external calls.
4. Award any point through DoublesScore exactly once. Capture the resulting checkpoint and synchronously save it.
5. Let the existing engine animate the accepted flight using an in-memory committed boundary. At its endpoint it accepts that boundary instead of calling the gameplay provider again.

`Match.exportCheckpoint()` returns the committed logical state even while `match.state` still presents the animation. This is an incremental compatibility seam: existing UI reads remain intact. Consumers that need authority use exportCheckpoint, not the legacy display snapshot.

Timing plus an already selected/queued shot resolves and saves together. Its incoming and outgoing animation segments are in-memory playback copies. A timing-only legacy solo selection saves the resulting contact; it remains supported without defining multiplayer cadence. Phase 2 will add the explicit symmetric action/controller interface. Neither the checkpoint codec nor advance-to-boundary helper has a network transport or polling timer.

The only provider extraction is `Match.nextContact`, shared by new/restored engines. The existing execution, positioning, reception and shot planning algorithms remain in use. DoublesScore now reads an explicit rules object, with the unchanged default of side-out doubles to 11, win by two. No shorter-format UI was added.

## Implemented persisted contract

The authoritative source is `src/engine/checkpoint.ts` (`MatchCheckpoint`, `RallyCheckpoint`, `FrozenAthlete`). Its top-level contract is:

```ts
interface MatchCheckpoint {
  schemaVersion: 1;
  engineVersion: 'pickle-local-1';
  matchId: string;
  rules: ScoringRules; // scoring, target, winBy; Phase 1 accepts existing defaults
  scoring: {
    score: Record<Team, number>;
    serving: Team;
    server: PlayerId;
    serverNumber: 1 | 2;
    right: Record<Team, PlayerId>;
    winner: Team | null;
  };
  pointIndex: number;
  seed: number;
  openingTeam: Team;
  roster: Record<PlayerId, FrozenAthlete>;
  rally: RallyCheckpoint;
  context: ShotContext | null;
  customIndex: number;
  solo: {
    partnerAutonomy: boolean;
    playerAutonomy: boolean;
    brainMode: 'local' | 'llm';
    personality: Personality;
    intelligence: number;
    memory: Observation[];
    recentChoices: Partial<Record<PlayerId, OpponentChoiceHistory[]>>;
    strategy: OpponentStrategy | null;
    strategyPoint: number;
    partnerInstructions: {
      backhand?: 'jules' | 'rio';
      soft?: 'jules' | 'rio';
      crash?: boolean;
    };
    recommendationType: string | null;
  };
}
```

Each roster entry stores its design (name/appearance/identity), effective skills, tendencies and handedness. This snapshot survives roster-library edits/deletions and supplies subsequent point starts on restore. Explicit existing solo substitutions remain possible and update the saved roster; multiplayer roster locking remains a later-mode responsibility.

RallyCheckpoint contains:

- `kind`: contact, reception, or point-end. A point-end with scoring.winner is match completion.
- `state`: logical GameState fields (phase/stage, ball/players, shot/bounce indices, score/possession/hitter/result, current-rally shot and event history).
- `options` and `shot`: already planned local choices/current shot, including required incoming reception branches. Restoring never resamples them.
- `receptionOrigin`: movement origins at a net decision; null otherwise.

A net checkpoint retains geometric branch information, not an arbitrary flight progress value. Hydration derives the canonical net crossing from the incoming leg and reconstructs the internal engine bookkeeping. Its ball/player positions are restored exactly. The codec validates versions, scoring/formation, actor IDs, geometry, numeric bounds, histories, CPU configuration and roster data before hydration. Unsupported/corrupt saves are kept intact until explicitly discarded.

This local record is **not** a future browser-to-server request DTO. Phase 3 must keep seeds and unchosen sampled outcomes private; its public choices will be regenerated/redacted server-side. The logical codec and headless advancement are reusable there. Schema and engine versions are separate; incompatible engines currently reject a save rather than silently change its physics.

## Intentionally transient

No animation elapsed/progress/leg cursor, simulation clock, camera/orbit state, effects, hover, playback timer, replay cursor/frames, open menus/dialogs, microphone state, text draft, busy flag or pending network request is saved. Event history omits presentation timestamps. Existing user preferences stay in their separate settings store.

Accepted CPU strategy and seeded choice history are retained. A received strategy is saved before it can affect a later action; a failed save restores the previous accepted strategy. Pending external interpretations are discarded on restore, and stale reception command replies cannot mutate the restored decision. Future external strategy responses are not promised to be reproducible; shots already committed from them are.

## Restore lifecycle

```text
valid action
→ headless resolution and score award
→ synchronous localStorage checkpoint write
→ optional playback
→ browser closes
→ app starts and finds the account-scoped checkpoint
→ runtime validation
→ Match.restoreCheckpoint / RallyEngine hydration (no reset/reseed)
→ restore designs, court positions, score and controls
→ enter court directly
→ continue from the committed decision
```

An existing cached checkpoint can load without waiting on cloud roster networking. If authentication resolves to a different account, the app reloads into that account's save scope. A new session without a checkpoint retains the existing setup flow. Storage is one full-game record per account and origin, under `pickle-rpg-match-v1:<owner>`, falling back to `local` when no account exists.

The current solo Next point button/timer remains: the point result and rotated service state are already saved; Next point initializes and saves the next formation. Restoring a completed rally never re-awards it. Reset explicitly starts a fresh match ID. Explicitly ending a solo match early discards its resume record; completed match records remain resumable as final results.

Completed solo history now uses the persisted match ID instead of generating a fresh result ID on each browser session. The existing database RPC's idempotency therefore also prevents duplicate completion records after reload. There is no multiplayer history/statistics change.

Storage failure rolls an attempted shot/reception back to its previous logical checkpoint and shows an error. No unload event is needed for normal saves. Corrupt/future saves block replacement and expose an explicit Discard saved match action. localStorage write success is the browser's persistence guarantee; clearing site data removes local saves.

## Verification

New tests are in `tests/checkpoint.test.ts` and `tests/local-match-store.test.ts`. They cover:

- Detached JSON round trips, initial serve, return, rally contacts and full-game boundary progression.
- Both air and bounce branches, combined timing/shot, and playback that cannot invoke the logical provider again.
- Point-ending custom serve, deuce at 11–10, win at 12–10, right-side rotation and repeated completion hydration without extra scoring.
- Frame partitions, paused/skipped animation and repeated restore yielding identical committed outcomes.
- Frozen roster on later point starts, CPU memory, and retries that cannot accumulate CPU choice history or alter sampling.
- Rejected malformed/future saves, account isolation, explicit discard, storage failure rollback and cancellation of stale text interpretation.

Browser checks on an isolated local preview verified direct court restoration with identical score/players, and reload immediately after a submitted serve continuing beyond that serve. Existing solo animations and court rendering were visually checked. A separate browser reload at a later 1–0 serve verified service-side formation preservation.

Final automated validation: all **285 tests passed**, including all **16 new checkpoint/storage tests**; `npm run build` passed; `git diff --check` passed. The production-server test was run with permission to bind a local port. The normal production build emits the existing large-chunk advisory; it is not a checkpoint failure.

## Remaining limits and Phase 2 readiness

- One local save per account/origin; clearing storage removes it. Cross-device transfer and same-match concurrent tabs are not supported yet (last local writer wins). Those need the planned remote authorization/version/atomic-write boundary.
- Only full solo games resume. Practice and prior-session replay frames remain transient; replay controls cannot recover past frames after reload.
- The local codec retains planned options and private seed material for faithful restoration. Phase 3 must not expose this record unchanged to opponents or accept it from browsers as trusted state.
- Restore supports the current engine/schema release only. Future engine changes need explicit compatibility/migration work; unknown versions are safely rejected today.

Phase 1 provides the serializable state and deterministic commit/playback seam needed to begin Phase 2. It does not implement symmetric human control: away-side CPU triggers, home-specific targeting/context gates and reception generation still need the planned controller refactor. Those are Phase 2 work, not a reason to rewrite the engine. Stop here for review.
