# Rivalry and strategy stories

This is the ordered implementation plan for turning PickleBash matches into persistent social relationships with trustworthy strategic history.

The core retention story is:

> I need another game with Ryan.

The supporting strategic story is:

> Something about how I play Ryan is changing, and I want to see what happens next.

PickleBash remains a game first. It may help players notice shot selection and tactical patterns that are relevant to real pickleball, but it does not promise instruction, skill transfer, or real-world improvement.

## Product principles

1. **The relationship progresses.** Head-to-head history matters more than character power, generic XP, or a battle pass.
2. **Every claim is backed by authoritative game data.** The browser never awards itself rivalry results or trusted shot statistics.
3. **Compare equivalent decisions.** A third-shot drive rate is measured against eligible third-shot choices, not every contact in the game.
4. **Observation comes before interpretation.** Prefer “during this streak” and “when you mixed in drops” over an unsupported “because you dropped more.”
5. **Insights feel like discoveries, not homework.** Present one interesting, specific story at a time.
6. **Recent history can create a new story.** A player losing the lifetime series can still have momentum in the last four games.
7. **Rematching is the natural next action.** Results and insights should create unfinished business, not a dead-end statistics screen.
8. **No hidden competitive advantage.** Analytics describe play; they do not change athlete attributes or match outcomes.

## Implementation sequence after architecture review

The numbered phases below remain work-package identifiers. Implement them in this dependency order:

1. Settle authoritative selection/contact semantics, metric definitions, privacy scopes, and existing multiplayer regressions. Instrument the core funnel from the beginning.
2. Phase 1: collect authoritative events before any strategy claims. Historical incompleteness must remain explicit.
3. Phases 3 and 4: normalized rivalry history, then rivalry-first completion and rematch UX. Keep recently completed lobby browsing outside V1 unless explicitly reprioritized in BACKLOG.
4. Phase 5 before Phase 2: shared versioned metric reducers and rebuildable summaries, then personal aggregates and shot-mix UI.
5. Phase 6: qualify and test a small set of descriptive strategy stories, including unchanged/noisy histories.
6. Phase 8 can begin with rivalry-only text sharing after Phase 4; strategy sharing follows Phase 6. Phase 7 sequences are a later expansion.
7. Phase 9 pacing improvements follow observed social-loop friction; they are not blocked by analytics. Phase 10 instrumentation and evaluation run throughout, with release decisions after sufficient observation.

The first implementation slice is documented in [Authoritative shot-selection data](SHOT-SELECTION-DATA.md). It includes private transactional capture, a bounded historical backfill, reception/contact attribution, and historical-receipt completion metadata fixes. Production migrations and backfills are deployed. A completed live test game has verified complete event capture and both summaries; broader two-device acceptance remains open (see [story verification](RIVALRY-STORIES.md)). Aggregate endpoints and their strict public response parser belong to the subsequent metrics slice, before any aggregates are exposed.

## Definitions

- **User/manager:** the authenticated person choosing a shot for a team.
- **Athlete:** the frozen designed character in the hitter slot. Statistics may be viewed by user or by athlete, but they must not be conflated.
- **Shot selection:** the intent explicitly chosen by the user: type, target, pace, shape, spin, and tactical intent.
- **Eligible opportunity:** a decision where the engine actually offered the relevant shot family.
- **Immediate outcome:** what happened during the committed action, including a point-ending result when present.
- **Sequence outcome:** what happened later in the same rally, such as a drop leading to a kitchen exchange or a dink preceding an attack.
- **Rivalry:** completed, non-abandoned online matches between the same unordered pair of account IDs.
- **Strategy story:** a deterministic observation connecting relationship history to a meaningful change in contextual shot selection or rally behavior.

## Target data flow

```text
authoritative turn commit
        |
        +-- immutable shot-selection event
        |       selected intent + offered choices + match context
        |
        +-- completed match
                |
                +-- per-user match strategy summary
                |
                +-- normalized rivalry projection
                            |
                            +-- evidence-qualified story candidates
                                        |
                                        +-- result screen
                                        +-- game cards
                                        +-- friend profile
                                        +-- notification/share copy
```

Raw events remain the source of truth. Summaries and rivalry records are rebuildable projections. Player-facing prose is selected from structured facts rather than stored as the only representation of an insight.

## Phase 1 — Authoritative shot-selection events

### Goal

Begin collecting complete, retry-safe shot-selection data before building analytics UI.

### Build

- Add a private server-owned `shot_selection_events` table.
- Insert one event in the same database transaction as each accepted remote action.
- Use `(match_id, action_id)` or `(match_id, turn_version)` as the idempotency boundary.
- Distinguish the accepted selection from an executed contact. Capture reception timing, whether the selected reply was struck, and the actual terminal contact/intent before automatic point advancement.
- Record:
  - match, action, version, point index, and server timestamp;
  - chooser account, opponent account, team, hitter slot, and frozen athlete design ID;
  - score, rally stage, serving state, and relevant contact context;
  - selected shot type, target, pace, shape, spin, tactical intent, and input source;
  - offered intent descriptors grouped by timing and hitter, plus independently defined pre-decision context;
  - whether the action ended the point, point winner, and ending reason.
- Deny browser roles direct table access, following the existing multiplayer storage model.
- Add a backfill for historical accepted actions. Mark records that cannot reconstruct the complete offered-choice context as `selected_only`; opportunity-based insights must ignore those incomplete fields.
- Define a private typed event contract here. Before exposing aggregates in the metrics slice, add a shared TypeScript contract and strict parser for that public response. Raw private events are never returned to the browser wholesale.

### Automated acceptance

- One accepted action creates exactly one event.
- Exact request retries and concurrent retries create no duplicate events.
- Rejected, stale, illegal, and wrong-owner actions create no event.
- The event chooser is derived from authenticated match ownership, never request-supplied identity.
- Selected intent exactly matches the accepted action.
- Offered shot families match the authoritative pre-action checkpoint.
- Home and away users, hitter slots, athlete design IDs, score, stage, and point result are recorded correctly.
- Browser database roles cannot read, insert, update, or delete events.
- Existing remote-match, rematch, guest, and turn-notification tests remain green.

### Manual acceptance

- Play a short two-device game containing a drive, drop, dink, lob, and overhead when available.
- Verify each selection once in a server-side diagnostic query and confirm no private checkpoint or seed is exposed to the client.

### Exit gate

Production is collecting trustworthy events for new online matches. No player-facing strategic claim ships yet.

## Phase 2 — Shot aggregates and personal shot mix

### Goal

Turn raw selections into understandable, opportunity-aware personal statistics.

### Build

- Add an authenticated aggregate service, initially supporting:
  - one completed match;
  - recent completed matches;
  - lifetime online play;
  - games against one opponent;
  - one athlete within those scopes.
- Calculate both raw counts and eligible-opportunity rates.
- Separate serves and returns from open-rally shot mix.
- Provide contextual groups such as third shot, kitchen exchange, attack, counter, and defensive/reset situations.
- Include explicit sample sizes and data-completeness markers.
- Add a compact match-recap shot mix and a deeper Profile → Shot Mix view.
- Keep low-sample data descriptive: counts are allowed, recommendations are not.

### Automated acceptance

- Aggregates deduplicate retried actions.
- Drive rate uses only decisions where a drive was offered; third-shot drive rate uses only eligible third-shot decisions.
- Dink, overhead, reset, and lob opportunity rates use their corresponding eligible contexts.
- Filters by time window, opponent, and athlete return the correct subset.
- Abandoned matches are identified and excluded from competitive outcome associations while their shot counts follow an explicit documented policy.
- Historical `selected_only` records contribute to raw counts but not unavailable opportunity denominators.
- Aggregate endpoints authorize the requesting user and expose no other player’s private cross-opponent history.

### Manual acceptance

- A deliberately drive-heavy game produces the expected recap.
- Switching to drops and dinks changes the recent view without rewriting lifetime totals.
- The mobile recap remains quick to scan and does not compete with Rematch.

### Exit gate

A player can accurately answer “What shots do I choose?” and “What do I choose when another option is actually available?”

## Phase 3 — Persistent rivalry projection

Backend implementation and automated coverage are documented in [Persistent rivalry records](RIVALRY-DATA.md). Hosted migration/backfill are complete and a three-game live rivalry has been verified; the full two-device acceptance matrix remains pending. The visible completion/lobby experience follows in Phase 4.

### Goal

Make every completed match advance the history between two specific people.

### Build

- Add a normalized rivalry projection keyed by the sorted pair of account IDs.
- Track:
  - completed competitive matches;
  - wins for each member;
  - current streak owner and length;
  - best streaks;
  - recent ordered results;
  - closest score;
  - latest match and completion time;
  - relationship milestones such as 2, 3, 5, 10, 25, and 100 completed matches.
- Exclude early-ended matches from wins, losses, and streaks. Preserve an explicit separate count only if abandoned-game history becomes useful.
- Update the projection transactionally when a match first becomes completed.
- Backfill it from existing authoritative completed matches.
- Batch-load rivalry summaries with the match list; do not create one network request per game card.
- Make the projection independent of home/away orientation, inviter identity, guest origin, roster selection, and rematch orientation.

### Automated acceptance

- First completion creates a 1–0 rivalry.
- Alternating home/away orientation updates the same pair.
- A tie in the series, lead change, streak start, streak extension, and streak break are correct.
- Retried completion, process restart, and concurrent reads do not double-count.
- Early-ended matches do not alter the competitive record.
- Guest-to-registered upgrade preserves the rivalry because the account ID is preserved.
- Backfill and a full rebuild produce the same projection as incremental updates.

### Manual acceptance

- Two accounts complete enough short games to create a tie, a three-game streak, and a streak break.
- Both devices show the same viewer-relative rivalry record immediately after each result.

### Exit gate

The server can answer “What is the ongoing story between these two people?” quickly and consistently.

## Phase 4 — Rivalry-first completion and lobby experience

### Goal

Make rivalry history visible at the moments most likely to produce another game.

### Build

- Add a pure, deterministic rivalry headline selector.
- Headline priority:
  1. streak broken or series lead changed;
  2. series tied or tiebreaker created;
  3. meaningful streak extended;
  4. relationship milestone reached;
  5. recent split or comeback story;
  6. plain viewer-relative series record.
- Redesign the completion card around final score, one rivalry headline, and **Rematch** as the primary action.
- Preserve the existing shared, idempotent rematch behavior.
- Add concise rivalry context to active and completed game cards.
- Add head-to-head history to friend profiles.
- When the first player requests a rematch, show a clear pending state; when the opponent taps Rematch, enter the new game directly.

### Automated acceptance

- Headline selection is deterministic for fixed history.
- Viewer-relative language reverses correctly.
- Exactly one primary headline is shown.
- Simultaneous Rematch taps still create one invitation and one new match.
- The completion screen never appears before final playback finishes.
- Lobby and profile rendering handle no rivalry, one game, long names, missing avatars, and unavailable aggregate data.

### Manual acceptance

- Verify tie, lead change, streak, streak-break, and milestone layouts on phone and desktop.
- A player can start or accept the next match with one obvious action.

### Exit gate

Finishing a match creates visible unfinished business with the same opponent.

## Phase 5 — Match strategy summaries

### Goal

Create stable per-match facts that can be compared across a rivalry without repeatedly scanning every raw action.

### Build

- Add one rebuildable strategy summary per completed match and user.
- Include:
  - shot counts and eligible-opportunity rates by type and stage;
  - target, pace, spin, and tactical-intent mix;
  - average and longest rally length;
  - point-ending winners and errors by selected shot type;
  - kitchen-entry and attack-opportunity counts where definitions are reliable;
  - data completeness and sample sizes.
- Define each derived metric in code and documentation before exposing it.
- Generate summaries on completion and provide an idempotent rebuild command for migrations or definition changes.
- Version summary definitions so old and new metrics are never silently compared under different meanings.

### Automated acceptance

- Summary totals equal the underlying authoritative events.
- Rebuilding is idempotent and produces byte-equivalent structured values for a fixed definition version.
- Rally boundaries and point indexes do not mix events from adjacent points.
- Immediate point-ending associations attach to the correct selection.
- Incomplete historical records are labeled and excluded from unsupported metrics.

### Manual acceptance

- Inspect summaries for purpose-built drive-heavy, drop-heavy, kitchen-heavy, and short-error matches.
- Confirm every displayed number can be traced to a small set of known turns.

### Exit gate

Every completed online match has a compact, trustworthy strategic fingerprint.

## Phase 6 — Evidence-qualified rivalry strategy stories

The first owner-only third-shot drop/drive slice is implemented locally; see [definitions, limits, and verification](RIVALRY-STORIES.md). Production rollout, measurement, and broader story families remain open.

### Goal

Connect strategic change to rivalry history without overstating causation.

### Build

- Add a deterministic story-candidate engine that compares:
  - the latest match with the player’s recent baseline;
  - a current winning or losing run with the immediately preceding comparable window;
  - play against this opponent with the player’s broader recent style;
  - the two rivals’ contrasting selection patterns when both sides may see the same fact.
- Each candidate carries structured evidence:
  - metric and context;
  - numerator and denominator for both windows;
  - absolute and relative change;
  - match IDs and time range;
  - completeness level;
  - allowed language strength.
- Establish conservative initial thresholds. Recommended starting gate:
  - at least 10 eligible opportunities in each comparison window;
  - at least 15 percentage points of absolute change;
  - multiple completed matches rather than one unusual game;
  - no recommendation when the offered-choice context is incomplete.
- Rank candidates by novelty, relationship importance, evidence strength, and repetition cooldown.
- Return a structured story key plus evidence values. Format player-facing copy separately and test it.
- Use observational language unless a future analysis genuinely supports a stronger conclusion.

### Initial story families

- Increased or decreased third-shot drop mix.
- Drive dependence or increased shot variety.
- More kitchen exchanges or longer rallies.
- Targeting change toward middle, line, body, feet, or backhand side.
- Increased use of resets under pressure.
- A rival changing tactics after a streak.
- A player reverting to or breaking a prior pattern.

### Safe example

> Four straight wins over Ryan. During this run, you chose drops on 42% of eligible third shots, up from 18% in your previous four games.

### Disallowed first-version claim

> You beat Ryan because drops are better than drives.

### Automated acceptance

- No story is emitted below its sample threshold.
- Equivalent-opportunity denominators are used.
- Winning and losing windows are ordered correctly and never cherry-picked from future matches.
- A percentage cannot be displayed without its traceable counts.
- Causal wording is absent from observational evidence levels.
- Replaying or rebuilding the same history chooses the same candidate.
- Cooldown prevents the same unchanged message after every match.
- Fallback always produces a correct rivalry-only headline when no strategic story qualifies.

### Manual acceptance

- Run scripted rivalry histories that intentionally change shot mix and confirm the expected story.
- Run noisy and low-sample histories and confirm no strategic conclusion appears.
- Have both players read the same shared story and confirm it is understandable from either perspective.

### Exit gate

PickleBash can tell one interesting, defensible story about how a rivalry’s strategy is evolving.

## Phase 7 — Rally sequences and richer tactical observations

### Goal

Move from frequency observations to sequences that better resemble strategic pickleball thinking.

### Build

- Derive ordered rally sequences from shot events and authoritative point boundaries.
- Define and validate a small initial vocabulary:
  - third-shot drop → kitchen exchange;
  - dink exchange → attack opportunity;
  - lob → overhead response;
  - reset → neutral continuation;
  - repeated target → changed opponent response.
- Report sequence counts and conditional rates, not assumed causality.
- Compare tactical sequences within a rivalry and across recent periods.
- Add carefully phrased experiments such as “Try mixing in…” only when an alternative was frequently available and the player has enough history.

### Automated acceptance

- Sequences never cross point or match boundaries.
- The same turn cannot be counted twice in one sequence definition.
- A “led to” event uses an explicit maximum sequence distance defined per metric.
- A lob answered by an overhead is distinguished from an overhead produced by another situation.
- Recommendations cite the opportunity context and remain absent with insufficient evidence.

### Manual acceptance

- Purpose-built rallies trigger each supported sequence exactly when expected.
- The resulting language sounds like an interesting game observation, not professional instruction.

### Exit gate

The game can describe recognizable tactical patterns while remaining honest about what its simulation demonstrates.

## Phase 8 — Shareable rivalry moments

The first rivalry-only text share/copy flow is implemented locally; see [sharing behavior and release checks](RIVALRY-SHARING.md). Native-device acceptance and funnel measurement remain open.

### Goal

Turn real rivalry developments into invitations and stories players want to send.

### Build

- Add user-initiated sharing from the completion screen.
- Start with structured text through the existing native share/copy flow:
  - final score;
  - rivalry headline;
  - one qualified strategic observation;
  - challenge or rematch link when appropriate.
- Add a compact visual share card only after text sharing proves useful.
- Never expose email, internal account IDs, private checkpoints, unpublished roster data, or a recipient’s broader private analytics.
- Let the user preview the exact text/card before sharing.
- Track share opened, share completed when detectable, link opened, challenge accepted, and resulting first turn without storing share text.

### Automated acceptance

- Share facts match the authoritative result and rivalry projection.
- Links deep-link to the correct challenge, rematch, or viewable result flow.
- Unauthorized viewers cannot retrieve private rivalry or shot history.
- Native-share cancellation is not counted as completion.
- Duplicate opens and retries follow documented analytics semantics.

### Manual acceptance

- Share from iPhone and Android/Chromium where available.
- Verify the fallback copy flow.
- Open the link while signed out, as the intended opponent, and as an unrelated account.

### Exit gate

A meaningful match story can naturally bring the same friend back or invite a new friend into a game.

## Phase 9 — Faster co-presence and return-to-turn polish

### Goal

Make asynchronous play feel nearly live when both rivals happen to be present, while preserving the durable async model.

### Build

- Add match-scoped presence with short leases; do not infer presence solely from account-wide notification activity.
- Show a restrained “Ryan is here” state only while presence is fresh.
- Increase refresh responsiveness while both players are present, then return to the normal async cadence.
- Preserve authoritative version checks, saved pending turns, replay-first return flow, and notification suppression.
- Improve important-moment presentation for match point, streak breaks, rivalry milestones, and qualified strategy stories.
- Keep ordinary shots fast and skippable.

### Automated acceptance

- Presence expires after disconnect, backgrounding, or lease timeout.
- Presence never grants turn authority or changes game state.
- Two active clients exchange turns without duplicate submission or stale-choice acceptance.
- Push remains suppressed for active users and resumes after presence expires.
- A later notification still deep-links to the exact match and shows the unseen committed action.

### Manual acceptance

- Two devices play continuously, alternate between foreground/background, lose connectivity, and resume hours later.
- Confirm the game feels faster while both are present but remains correct when either disappears.

### Exit gate

The same match supports both slow asynchronous play and lively back-and-forth sessions.

## Phase 10 — Measurement, tuning, and release decision

### Goal

Determine whether rivalry and strategy stories produce healthy repeat play and sharing.

### Required events

- `match_completed`
- `rivalry_match_number_reached`
- `rivalry_headline_shown`
- `strategy_story_shown`
- `strategy_story_expanded`
- `rematch_requested`
- `rematch_accepted`
- `share_opened`
- `share_completed` when detectable
- `shared_link_opened`
- `shared_challenge_accepted`

Events must use stable IDs and categorical story keys, not names, emails, rendered prose, or raw shot history.

### Primary measures

- Match-completion → rematch-request rate.
- Rematch-request → rematch-start rate.
- Player pairs reaching match 2 started, 3 completed, 10, 25, and 100.
- Weekly returning player pairs.
- Median time from turn-ready to next action.
- Strategy-story expansion rate.
- Share → link open → accepted game → first turn funnel.
- Retention split by pairs shown rivalry-only, shot-mix, and qualified strategy stories.

### Guardrails

- Rematch declines, abandoned matches, notification disables, and reaction mutes.
- Error rates and latency for match list, completion, aggregate, and rematch endpoints.
- Repeated or contradictory insight reports from playtesters.
- Whether strategic copy feels judgmental, repetitive, or too much like coaching.

### Release gate

Keep and expand features that increase repeat games between real pairs without degrading match completion, trust, or enjoyment. Revise or remove story families that users cannot understand or that overstate the data.

## Cross-phase testing strategy

Every phase should add tests at the narrowest reliable layer:

- Pure functions for aggregation, viewer-relative records, thresholds, candidate ranking, and copy parameters.
- PostgreSQL tests for transactionality, uniqueness, permissions, backfills, rebuilds, and concurrent retries.
- Service tests for authorization, batching, public projection, and failure isolation.
- Browser tests for completion, lobby, profile, sharing, and mobile layout.
- Two-device acceptance for rematches, notification links, guest upgrades, and co-presence.

Use deterministic fixtures that describe the intended history in readable terms. Include at minimum:

- tied and lopsided lifetime series;
- recent reversal despite a poor lifetime record;
- active streak and streak break;
- alternating home/away orientation;
- early-ended game;
- low-sample shot mix;
- strong eligible-opportunity shift;
- apparent raw shift that disappears under contextual denominators;
- incomplete historical data;
- simultaneous rematch and duplicated action requests.

## Explicitly deferred

- LLM-generated coaching or unrestricted natural-language analysis. Deterministic, evidence-backed stories come first.
- Claims of real-world improvement or causal training benefit.
- Rankings, wagering, public leaderboards, power progression, and rewards that affect match fairness.
- Opponent-private analytics outside facts visible within the shared rivalry.
- Real-time networking that replaces the authoritative async engine.

## Ordered build checklist

- [ ] Foundation — event/metric/privacy contracts and multiplayer regression baseline
- [ ] Phase 1 — Authoritative shot-selection events (deployed; live complete-event capture verified, broader acceptance pending)
- [ ] Phase 3 — Persistent rivalry projection (deployed; live three-game rivalry verified, broader acceptance pending)
- [ ] Phase 4 — Rivalry-first completion and lobby experience (implemented; [local playtest](RIVALRY-PLAYTEST.md) ready, hosted/mobile acceptance pending)
- [ ] Phase 5 — Match strategy summaries (implemented; [definitions and playtest](MATCH-STRATEGY-DATA.md), hosted acceptance pending)
- [ ] Phase 2 — Shot aggregates and personal shot mix (core dashboard implemented; [definitions and playtest](SHOT-MIX.md); richer tactical contexts and hosted/mobile acceptance pending)
- [ ] Phase 6 — Evidence-qualified rivalry strategy stories (first two personal story families implemented locally; production acceptance and measurement pending)
- [ ] Phase 8 — Shareable rivalry moments (rivalry-only text may start after Phase 4)
- [ ] Phase 7 — Rally sequences and richer tactical observations
- [ ] Phase 9 — Faster co-presence and return-to-turn polish (prioritize from early playtests)
- [ ] Phase 10 — Measurement, tuning, and release decision (instrumentation throughout)

