# Phase 2: two human teams on one device

Implemented September 14, 2026. This is the next approved increment after Phase 1. Phase 3 remote play remains deferred.

## Play

Open the match lobby, select **Two players · same device**, choose four athletes, and start. Player A controls both Team A athletes; Player B controls both Team B athletes. All contacts wait for human input. The banner identifies the acting team, and the camera rotates to that team's end. Choose a shot card or tap the opposing court to aim. At a reception pause, the selected timing and shot are submitted together. Next point is explicit. New two-player playtest matches end at the first team to 3 points, with no two-point margin required. Existing saved matches retain their original rules; start a new match to use the shorter format.

Every gameplay skill is 70, movement tendencies are equal, and every athlete is right-handed for this initial baseline. Names and appearance remain distinct. Handedness variation is deferred until balance is established. The match keeps detached, frozen roster copies; saved solo player records retain their original attributes. Solo mode retains its bots, player designer, custom commands, voice, and practice controls.

## Turn and persistence boundary

- `engine/controllers.ts` maps the four existing athlete slots to two human owners or the existing solo controllers. Ownership comes from the next receiver or server, not an alternating player flag.
- `Match.submitTurn` accepts a decision ID, local player ID, structured intent, and optional reception timing. It rejects stale decisions, wrong owners/athletes, illegal contacts/targets, and submissions during playback. It replans trajectories from the authoritative local context.
- `engine/turn.ts` exposes stateless `resolveTurn(checkpoint, action)`, returning the next checkpoint and before/after revisions. Match/UI and this entry point use the same submission logic. Timing plus shot is one action; a missed reception can end the point without an outgoing shot.
- Results commit before animation. Storage failure restores the entire prior decision, including offered choices and revision. Playback cannot reroll or award twice.
- Checkpoint schema 2 adds mode and revision, with `pickle-human-1` for symmetric reception behavior. Schema 1 solo saves migrate to schema 2 and retain `pickle-local-1` behavior.
- The existing account-scoped local save slot resumes either mode. It is still one current match, not a game list. Starting another match replaces that slot. Two-player results do not enter solo account history or progression.

These participant IDs are local control labels, not authentication. Checkpoints contain local seeds and planned outcomes. This is not a remote security boundary; authenticated server authority, redaction, atomic deduplication, and transport remain Phase 3. No new backend, database migration, account flow, or challenge UI was added.

## Verification

Validation: all 293 regression tests passed; after the final design-preservation adjustment, all 25 focused multiplayer/checkpoint/setup tests passed. Production build and `git diff --check` passed.

The suite covers full games from either initial serving end; serves and contacts by all four athletes; both reception timings for both teams, including different receivers; repeated same-owner decisions after point endings; round trips at every decision; a game starting at deuce and finishing by two; animation versus committed results; pure resolver parity; invalid and stale actions; storage rollback; fixed roster attributes; solo checkpoint migration; and coordinate rotation.

Browser checks on the isolated local preview covered lobby mode selection and equal ratings, Team A serve, Team B camera and manual return, away-side court targeting, Team A teammate input, combined reception choices, and reload at Team B's waiting decision. Existing solo tests and the production-server test remain part of validation.

Build retains the existing large-bundle warning. Full replay frames remain session-only, as in Phase 1. This phase is ready for same-device playtesting and review before remote work.

## Rally-scoring playtest preference

Scoring rules are selectable in Settings and the match lobby, and persist on this device. Rally is the default for new games; existing saves retain their own rules. Two-player tests stay first to 3, without a two-point margin. Solo retains its existing game length.

The implementation follows [USA Pickleball's 2026 rulebook, §14.A](https://fliphtml5.com/cksih/USAP-Official-Rulebook/): every rally awards a point; each service turn has one server; after losing serve, the other team's right-side player serves; score calls contain two numbers. Score parity determines athlete positioning. Receiving teams can score the winning point. The short first-to-3 finish is our explicit playtest modification.

The preference changes future games, not active checkpoints. Rally and side-out rules are serialized with the match, and invalid rally saves with a second-server state are rejected. Tests cover serving runs, immediate side-outs, receiving winners at 3–2, score calls, saved rules, and full rally-scored games restored after every action.

Rally-scoring validation: all 298 regression tests passed. Browser checks confirmed the default, persisted selection after reload, and matching lobby selection.
