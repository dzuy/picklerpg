# Personal Shot Mix

Profile → Shot Mix is private to the signed-in account. `GET /api/multiplayer/shot-mix` takes scope, opponent, athlete and stage filters; it does not accept another user's identity. Opponent and athlete options come only from that account's completed online games. Anonymous participants may use the authenticated API; the existing Profile sign-in gate remains unchanged.

## Scopes and denominators

- Recent: latest 10 matching completed games.
- Last 30 days: rolling 30-day window, inclusive at the cutoff.
- Lifetime: all matching completed online games, with cursor pagination and no silent record cap.
- Opponent: account identity, independent of home/away orientation.
- Athlete: immutable design ID in the choosing account's roster. Both slots contribute to the same athlete if they share that ID. Unknown historical designs remain a separate category. The most recent recorded name labels the option; identical names receive numeric suffixes.
- Stage: all, serve, return, third, fourth, fifth onward, or unknown. Ordinal stages use captured completed-contact counts. Richer kitchen-exchange/attack/defensive contexts remain deferred until separately versioned definitions are available; the UI does not infer them from a selected shot's name.

Serve and return counts/opportunities are shown separately from rally selections. Rally share divides a family's recorded selections by all recorded non-serve/return selections. Opportunity rates sum numerators and denominators across matches before division. Rates are never averages of per-game percentages. Captured menu variants count each offered family only once per decision. A selection that never reaches contact still counts as a choice.

Early-ended games and solo play are excluded entirely from this dashboard, including their raw counts. Archived normal completions remain included. Missing summaries retain their place in the sample and reduce availability rather than being replaced by older games. Selected-only historical data contributes counts but no invented opportunities.

## Recent comparison

Compare the latest 10 matching games with the preceding 10, with no overlap. These fixed comparison groups honor opponent, athlete and stage filters; they remain the same when the main Games scope changes, as stated in the UI. Show raw numerator/denominator pairs even for small samples. Percentage comparisons require at least 10 observed opportunities in each group. This is a readability threshold, not a statistical significance test. No confidence, causal improvement, recommendation, or win-effect claim is made. Coverage differences and mixed rule/engine versions are disclosed.

## Storage and release

`strategy-2` extends the rebuildable per-match summaries with per-athlete counts using the same reducer and complete point chains. Migration `202609180004_shot_mix.sql` upgrades the source function and summary version gate, and adds a private 50-row page RPC. Its output contains only the caller's cached summary plus slim match/roster metadata, never checkpoints or raw captures. Cold/stale summaries repair through the existing revision-checked path. Every dashboard request reads current cache revisions; no second lifetime counter can drift from match history.

Apply migrations in order before deploying this server. Run the shot-selection backfill followed by `npm run rebuild:strategies`. Older strategy definitions are rebuilt rather than silently mixed. No hosted migration, backfill or deployment was performed for this step.

## Playtest

Run `npm run preview:rivalry`, open its /preview page, and choose **Your personal Shot Mix**. Expand Shot Mix. The preview includes twelve additional real-engine games preferring drives first and drops later when offered. Older synthetic rivalry fixtures intentionally have no selection history, exercising partial-history labels.

Check recent vs lifetime totals, the athlete and third-shot filters, opportunity denominators, and small-sample comparison copy. Tests cover weighted aggregation, disjoint comparison groups, a multi-page lifetime, time/opponent/athlete filters, private SQL permissions, early-exit exclusion, stale-definition repair, and missing-summary coverage. Physical mobile acceptance remains pending.
