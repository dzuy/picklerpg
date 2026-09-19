# Match strategy definition: strategy-2

A summary belongs to one completed online match and one choosing account. Match GET exposes only the authenticated chooser's summary; list responses and action receipts do not carry it. Raw events, menus, positions, and the other player's summary remain server-only. Shared rally lengths count both teams' contacts.

`strategy-2` preserves the strategy-1 metric definitions and adds per-athlete summaries for [Personal Shot Mix](SHOT-MIX.md). Migration 202609180004 updates the cache gate; old summaries rebuild automatically.

## Definitions

- **Selections**: accepted authoritative events chosen by this account, including selections that failed before contact. Family, semantic target, pace, explicit spin and tactical-intent mixes are counts of these selections. Custom point targets are grouped as `point`; player targets retain aim category, never player identity. Missing spin is `unspecified`, not inferred.
- **Stage**: count of completed contacts before the decision: 0 serve, 1 return, 2 third, 3 fourth, 4+ later. Unknown context is a separate stage. These are ordinal opening stages, not inferred tactical phases.
- **Eligible opportunities**: one decision whose captured offered menu contains the family, deduplicating target and air/bounce variants. The numerator counts selections of that family within those same eligible decisions. It does not count every contact where today's engine would permit the shot. No current-engine reconstruction of old menus.
- **Executed**: the capture confirms one added contact. If any game decision is missing or any of the account's recorded selections lacks supported context, its total executed count is unknown (`null`); family execution counts remain observed counts within context coverage.
- **Terminal points won/lost**: associations with the actual last executed contact, only for a complete point chain. A failed reply is not that contact. These are not causal win rates or skill judgments, and are not labeled winners/unforced errors. Engine reasons alone do not reliably distinguish those sporting classifications.
- **Rallies**: complete captured point chains starting at zero contacts and ending with a matching terminal contact ordinal. Average and maximum refer to executed contacts, including the serve. Exclude incomplete chains; report the number of qualifying rallies. Never join adjacent point indexes.
- **Attack opportunities**: deduplicated decisions offering any of drive, flick, volley, overhead or counter; numerator is an offered selection of one of those families. This is menu availability, not a claim that attacking was tactically correct.
- **Kitchen entries**: intentionally `null`. Selection snapshots do not define a reliable continuous movement boundary. No fabricated entry count or causal improvement claim is emitted.
- **Completeness**: expected count is the authoritative completed match version. Coverage is complete only if all event versions 1..N exist and every capture uses supported `selection-1` semantics. Selected-only history contributes mix counts but not unsupported context metrics. Empty/missing history is visibly partial.

## Persistence and recovery

Migration `202609180003_match_strategy.sql` creates private per-match revision rows and per-user summaries. Event inserts (including backfills) updates and deletes bump the source revision. Cache writes compare that revision under a row lock, preventing stale reducers from overwriting newer history. Match deletion cascades through the cache. Service-role functions are unavailable to anon/authenticated SQL roles.

Normal completion builds both players' summaries after the authoritative commit. A reducer/storage failure does not reject the accepted turn. Completed-match reads repair missing/stale summaries, so a process crash between commit and projection is recoverable. Existing valid summaries avoid loading raw events. The public projection explicitly selects numeric summary fields and omits private identifiers.

Apply the migration before deploying the server. Run `npm run backfill:shot-selections` first for legacy receipts, then `npm run rebuild:strategies` to rebuild historical completed matches using bounded match pages. Re-running is safe and produces the same structured summary for a fixed source and definition. A definition change must update the code constant, SQL version gate, docs and tests together, then rebuild. No hosted migration or backfill was performed during this implementation.

## Testing

`tests/strategy.test.ts` covers offered-menu deduplication, a selected-but-unexecuted reply, previous-contact attribution, stage boundaries, incomplete history, duplicate rejection, deterministic rebuild, cache invalidation, stale-write rejection, per-chooser totals and SQL permissions. The full suite protects existing action receipts, multiplayer retries and rematches.

For the UI, run `npm run preview:rivalry` and choose **Final shot playback → result**, then expand **Your shot selections**. That fixture is played through the real engine. The older synthetic rivalry fixtures intentionally have no shot events and demonstrate partial history. Rematch stays the primary action; the shot details are secondary. Physical mobile/two-device acceptance remains a release check.
