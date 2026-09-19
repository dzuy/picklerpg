# Authoritative shot-selection data

This is the contract for the first rivalry implementation slice. It collects private facts; it does not publish strategy stories or coaching. The hosted migration and two-device acceptance remain deployment gates.

## Authority and transaction boundary

`MatchService.act` captures offered choices and context from the authoritative match before `submitTurn`. After committed playback settles, it captures execution and terminal attribution **before** `nextPoint` can erase the old rally. The existing PostgreSQL commit RPC stores the receipt and the private event in the same transaction. A capture failure rolls back the turn; retry the same action ID.

The event key is `(match_id, action_id)`, with an additional unique `(match_id, to_version)` constraint. Chooser, opponent, team, design ID, pre-score, serving state, and rules are derived from the locked match and accepted receipt. Browser identity fields are never accepted. Browser roles cannot read or mutate events or execute the commit/backfill functions. Service role can select events and execute vetted RPCs, but cannot directly mutate them.

Both new and old server instances can call the migrated RPC. An older server omitting the optional capture still produces a `selected_only` event; it must never be treated as complete.

## Selection versus contact

One accepted action is one selection. A reception action chooses timing and a planned reply together, but the incoming ball can end the point before the reply is struck.

- `completedContacts` counts actual contacts before the decision.
- `execution.selectedShotExecuted` says whether the reply was struck.
- `execution.contactOrdinal` is a one-based ordinal within the point, or null.
- `execution.terminalContactOrdinal` and `terminalIntent` describe the last actually struck ball when this action resolves a point ending. That may be the opponent's preceding shot.
- `point_result` describes the point ending during this action. It is not, by itself, a winner/error classification of the selected reply. The result's responsible player and reason must also be considered.
- `point_index` is zero-based and captured before automatic point advancement. Rally keys are `(match_id, point_index)`.

Selection counts and contact/rally-length counts must remain separate. A terminal contact can be joined to its selection using match, point, and actual contact ordinal. Never attach a point result to whichever selection was most recently accepted without checking execution attribution.

## Opportunity semantics

`capture.offered` stores intent descriptors and timing, not planned trajectories or resolution outcomes. `capture.contexts` stores branch-specific contact context; `capture.players` records the pre-decision players' positions and handedness. No seed, resolution secret, or unchosen branch outcome is copied into the capture.

Availability is measured before a selection. Deduplicate repeated variants so one decision contributes at most one opportunity to a shot-family denominator. Preserve timing and hitter identity when defining branch-specific metrics. A choice between drive and drop requires both alternatives in the relevant eligible set.

The current engine's stage labels partly depend on shot type and are not independent opportunity definitions. Opening stages derive from actual contact ordinal; later contexts must be defined from pre-decision contact state and offered alternatives. Rates for different families need not sum to 100%.

Legality and menu membership are different: the engine accepts legal custom intents, while the normal browser preserves a menu variant and changes its aim. A metric must explicitly decide how to handle accepted selections outside the offered family/timing set. Until such a metric is defined, count them as raw selections only. Do not manufacture an opportunity because a shot was selected.

Input source is normalized to `menu` by the existing request parser. `input_source_quality='normalized'` means it cannot establish whether the player used voice or another UI. Menu-supplied spin, pace, and tactical intent describe the chosen variant, not necessarily independent deliberate choices. Coordinate targeting does not prove intent to target a backhand.

## Versioning and completeness

Capture schema version is 1; extraction/menu semantics are `selection-1`. Bump the definition version when availability, context, or execution interpretation changes. Events also retain the remote engine version. Future summaries must carry their own definition version and must not silently compare incompatible menu/ruleset cohorts.

`complete` means the selection snapshot and execution facts were captured by this server release. It does not mean every future derived metric is supported. `selected_only` has null capture: its accepted intent supports raw counts, but no opportunity rates, executed-contact counts, or shot-level outcome associations. Unknown historical point context remains null, never zero.

Backfill reads only `async_match_actions` and authoritative match identity. It does not read browser-reported `match_history`, synthetic profile records, or reconstruct menus using the current engine. Where a predecessor receipt exists it supplies the pre-score and point index. The first historical action may have no predecessor; its pre-context remains unknown. Backfill is insert-only, bounded, repeatable, and never overwrites live captures.

Frozen athlete design IDs are descriptive identifiers. The participation identity is match + team + hitter slot; identical designs can occupy multiple slots. Gameplay attributes are frozen, while cosmetic character edits can occur during friend matches.

## Competitive and privacy boundaries for later phases

Rivalry results require a normal authoritative completion, two account IDs, no `ended_by`, and an engine winner. `status='completed'` alone also includes abandoned games. Archiving is a viewer preference and must not remove qualifying history. Abandoned-match selections may be shown only in a separately labeled personal scope; default completed-match comparisons exclude them.

Raw events remain private. Later responses require a strict aggregate parser and separate owner-only, shared-pair, and explicitly shared audiences. Cross-opponent baselines are owner-only. No broader opponent analytics may appear in a shared story. Event retention and account-deletion handling must be settled before expanding public analytics; immutability here means no ordinary edits, not exemption from authorized deletion.

## Rollout and verification

1. Apply `202609180001_shot_selections.sql` before deploying the updated server. The optional final RPC argument supports the old server during rollout.
2. Deploy the server build. Existing pending requests, action hashes, and response formats remain compatible.
3. Run `npm run backfill:shot-selections` using the intended database's server environment. It reports counts only. Interruptions are safe; rerun to resume. No hosted backfill has been run by this implementation task.
4. Verify new receipts have exactly one `complete` event each, rejected requests have none, and the original multiplayer tests pass.
5. Complete the planned two-device drive/drop/dink/lob/overhead acceptance before marking the production collection exit gate complete.

Historical receipt responses use their own completion timestamp (or the receipt creation timestamp for older completed receipts). Later completion, leave, or archive mutations do not get overlaid onto an earlier action's gameplay snapshot; clients refresh the current match separately.

## Local validation

The full automated suite passes: 474 tests. This includes actual PostgreSQL role restrictions, wrong-owner/illegal/stale rejection without events, concurrent submissions, transaction rollback, restart and old-receipt stability, legacy-server compatibility, and bounded idempotent backfill. A deterministic engine fixture verifies that a missed reception records the selected reply without inventing a contact or attributing the preceding shot's terminal result to it. The production build also passes.

The existing push test now stops at match completion. The PostgreSQL test helper waits for client socket closure before restarting/stopping the database, removing the intermittent administrative-termination race without suppressing database errors.
