# Gameplay recording

New gameplay is collected as versioned rally records for analysis across games and accounts. Gameplay is not rebalanced by this recorder and client reports never grant XP or establish match results.

## Rollout

1. Apply `supabase/migrations/202609280001_gameplay_records.sql` to the intended Supabase database.
2. Deploy the server and browser build. Existing Friends servers remain compatible with the migration; missing captures are skipped.
3. Play one Solo and one Friends rally, then check `gameplay_rallies` using the service role. This change does not apply migrations or deploy automatically.

Solo games retain a durable outbox inside the account's existing local game saves. Uploads run after checkpoint saves, retry with backoff up to 60 seconds, and resume on reload or connectivity restoration. Acknowledgments are account-scoped. No signed-in account means local recording only. Failed analytics requests do not block shots, result saving, or XP. Uploading requires the correct current account. Clearing browser storage before an upload loses that local data.

Friends capture runs on the server, before advancing to the next rally, and commits atomically with the accepted action. Repeated action submissions and repeated Solo uploads do not create duplicate rallies. Older revisions cannot overwrite more complete records. Friends data includes human versus community-computer account control flags.

## Data and interpretation

- Schema, gameplay-definition and engine versions, game ID, point index, revision, court, scoring rules and score.
- Frozen skill profiles, calculated game ratings, handedness and tendencies for each slot. No display names, appearances, emails, commands, credentials or resolution seeds.
- Ordered executed shot/contact/bounce/point-end events, including power, pace, spin, targets, shot type and input source. A selected reply that was never struck is not counted as a shot.
- Execution geometry, placement error, quality, mishit flags and resolution where available at a saved boundary. Missing execution details must not be treated as zero error. These are engine diagnostics, not real-world measurements.
- Solo control flags, AI personality/intelligence, game completion and early-ending flags.

`solo-client` is client-reported and can be modified by a client. `friends-server` comes from authoritative server actions. Separate these populations in analyses. Human/computer control can change during a Solo game; use each shot's source as well as saved control settings. Source `menu` describes input routing, not a physical interaction measurement.

`GAMEPLAY_DEFINITION` in `src/persistence/gameplay-record.ts` must be bumped when tuning changes. Compare cohorts within a definition version. A game spanning an update may appear in multiple cohorts. Existing games are not retrospectively reconstructed: points recorded before this feature do not have cloud telemetry. Completion and coverage are separate concepts. `complete_event_coverage` requires contiguous points starting at zero, every point complete, and a game-complete marker. It does not guarantee full execution-diagnostic coverage. Check early-ending status separately.

Data is private: ordinary clients cannot read the analytics tables/views or write server-authoritative records. Only the authenticated Solo upload RPC and the private Friends trigger write records. Service-role analysts can query across players. Raw records include account identifiers for grouping; the export omits them. No retention expiry is applied automatically; records persist until operator cleanup or owner-account deletion.

## Query and export

`gameplay_games` exposes game completion, event coverage, scores, rally and shot counts. `gameplay_shots` exposes shot families, power, targets, spin, roster and preceding shot family. Raw `gameplay_rallies.record` retains events and available executions.

Examples (service role / database administrator):

```sql
-- Coverage before interpreting win rates.
select source, definition_version, count(*) games,
 count(*) filter(where complete_event_coverage) fully_recorded_games
from gameplay_games group by 1,2;

-- Power choices and responses to attacking shots.
select source, definition_version, previous_shot_type, shot_type,
 count(*) shots, avg(power) mean_power,
 avg((power >= 0.8)::int) fireball_share
from gameplay_shots group by 1,2,3,4;

-- Completed rally outcomes, including non-scoring side-outs.
select source, record->'rules' rules, e->'result' result, count(*)
from gameplay_rallies cross join lateral jsonb_array_elements(record->'events') e
where e->>'type'='point-end' group by 1,2,3;
```

For offline analysis:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/export-gameplay.ts --out gameplay.jsonl --since 2026-09-28
```

Uses `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`, only in a trusted terminal. The output contains completed rallies; a game can still be incomplete. It records the export cutoff and a completion footer, paginates past server row limits, and refuses to overwrite existing files. A missing footer indicates a partial export. The cutoff limits newly received rows, not a transactionally frozen snapshot; concurrent updates or account deletions may affect an export. Analyze the exported events as observations, not a reconstruction of unavailable history.
