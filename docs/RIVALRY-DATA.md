# Persistent rivalry records

The rivalry projection is implemented as the next slice after private shot capture. This slice supplies authoritative, viewer-relative history to match reads. Result-screen headlines and other player-facing presentation are the next work package; hosted rollout and two-device acceptance have not been performed.

## Identity and eligibility

The sorted pair of authenticated account UUIDs identifies a rivalry. Home/away orientation, invitation direction, roster design, cosmetics, court, and rematch source do not change that pair. Guest registration preserves the existing account ID and therefore the rivalry. Losing a guest account or signing into a different account does not merge identities automatically.

Only `async_matches` supplies competitive results. A qualifying match has:

- two account IDs;
- `status='completed'` and a completion timestamp;
- no `ended_by`;
- no pending/cancelled friend challenge;
- an engine checkpoint winner consistent with `winner_user_id`.

Leaving an active match assigns a status and winner for the existing multiplayer lifecycle, but never contributes to rivalry wins, losses, or streaks. Archiving a game is a viewer preference and does not remove its result. Client-reported solo history, synthetic profile records, and active games are never counted. Actual authoritative online games count regardless of roster choice.

## Storage, ordering, and concurrency

`async_rivalry_results` contains one normalized fact per qualifying match and the cumulative summary at that result. `async_rivalries` contains the current projection keyed by the sorted pair. Both are private, RLS-enabled tables with no browser access or direct service-role write grants.

The final match update invokes a database trigger in the existing accepted-action transaction. A pair-scoped advisory transaction lock serializes distinct matches finishing concurrently and coordinates them with rebuilds. A failure writing history rolls back the result, action receipt, and shot event together. Exact action retries never reapply completion.

History order is `(completed_at, match_id)` ascending. Timestamps reflect the existing server/database completion timestamp, not match creation or browser time. UUID order breaks equal timestamps. An older transaction can finish later, so the reducer re-folds the pair's authoritative ordered history rather than assuming every new completion appends at the end. Rebuilds and incremental refreshes use the same reducer.

The reducer records total games, wins for each member, current and previous streak, each member's best streak, ten recent ordered results, closest final score, and reached milestones (2, 3, 5, 10, 25, 100). Each result includes scoring rules and final scores. Closest means the smallest absolute final score margin; ties choose the latest ordered result. It does not imply equivalent competitive closeness across different scoring formats or target scores.

Read cost is a projection lookup. Completion/rebuild cost is linear in that pair's history, with unchanged result snapshots left untouched. This deliberately simple first implementation supports the planned early rivalry histories; measure long-pair completion latency before expanding scale. A future optimized reducer must preserve the same late-result and rebuild semantics.

## Match API contract

`GET /api/matches` and `GET /api/matches/:id` optionally include:

```
rivalry: {
  current: RivalrySummary | null,
  atCompletion: RivalrySummary | null
}
```

`current` is the pair's record now. `atCompletion` is the record through the requested qualifying result, so an old result does not inherit later wins or streaks. Active and abandoned matches have no completion snapshot. The latest result's previous streak supports a future streak-break headline without guessing.

The public summary uses `wins`, `losses`, `you`, and `opponent`, independent of home/away. Results are newest first. It contains no names, email, private rosters, shot events, checkpoints, or cross-opponent analytics. `definitionVersion=1` identifies the metric semantics. A strict shared parser rejects incompatible, malformed, or internally inconsistent responses. The server whitelists fields before passing them through this parser.

A missing `rivalry` field means history is unavailable, including an older repository implementation, a failed read, or invalid projection data. A present null summary means no qualifying record was found. Clients must not turn unavailable data into a fabricated 0–0 record. The match and rematch flows continue when a history read fails.

The match-list repository loads summaries in batches of at most 100 IDs, not once per game card. The database RPC checks that the API actor owns every returned match. An unrelated account receives no entry for another pair's match. Only the authenticated server can execute the RPC; browsers cannot supply a forged database actor.

Action receipts intentionally remain historical gameplay snapshots and do not acquire changing current rivalry fields. The existing client refreshes the match after an accepted action; that refresh observes the transactionally updated rivalry immediately. Consumers adding a new completion path must perform the same current-match read.

## Rebuild and rollout

1. Apply `202609180002_rivalries.sql` after the shot-selection migration and existing multiplayer migrations. The completion trigger immediately covers new qualifying results.
2. Run `npm run rebuild:rivalries` against the intended server database using server-only environment credentials. This backfills existing completed matches and replaces existing projections from authoritative history. It logs counts only.
3. Deploy the updated server. Complete backfill before presenting rivalry records to players, so a missing old projection is not mistaken for no history.
4. Verify both participants see reversed wins/losses for the same pair, then complete rematches, a streak break, and an early exit on two devices before checking the production phase gate.

The rebuild RPC processes up to 25 pairs per CLI batch (hard maximum 100) in stable pair order. Rerunning starts from the beginning and safely repeats completed work. Each batch commits atomically and uses the same pair locks as live completion. Existing projection pairs are included in the scan so an administrative source correction can remove obsolete records. Historical corrections may intentionally change old as-of summaries; ordinary later matches do not rewrite their meaning. Deletion/account-erasure workflows must coordinate source removal with this rebuild before publishing affected derived data.

No separate persistent prose is stored. Strategic summaries, causal claims, sharing, and co-presence are outside this slice.

## Local verification

The full suite passes: 478 tests, plus the production build. Added coverage includes normalized orientation, series ties and streak breaks, current versus historical snapshots, independent opponent histories, archived and early-ended matches, viewer reversal, role restrictions, guest identity continuity, durable restart, idempotent cursor backfill, simultaneous completions, live completion versus rebuild, rollback of an injected projection-write failure, old-action retries, batch loading, strict parsing, and unavailable-history fallback. These automated checks do not replace hosted or two-device acceptance.
