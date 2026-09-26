# V1 account XP and skill progression

## Architecture

PostgreSQL is the authority for account XP, streaks, budgets, idempotency and analytics. All rewards lock the account row and write the account total, immutable event receipt and analytics in the same transaction. Clients have read access only to their own totals and receipts; they cannot call the internal award function. Budget and earned points are deterministic projections of lifetime XP and the current configuration. Each roster member independently uses the entire budget; no points are assigned automatically.

Friends completion is an AFTER UPDATE trigger on the server-owned `async_matches` table. Both participants earn rewards. Early exits, incomplete games and matches involving server-designated community bots earn no Friends XP. Repeated games with the same friend are fully rewarded.

Solo uses `record_solo_xp`, replacing the client's old casual history RPC. It validates scores against the game's target, inserts history, awards XP, and updates history's XP atomically. A previously recorded ID cannot be rewarded again or changed from abandoned to completed. Offline results retain the existing account-scoped pending queue. Solo is still client-reported: this prevents accidental duplicate awards, not fabricated results from a modified client. Authoritative Solo play would require a separate gameplay/server project.

Player insert triggers reward the first three lifetime creation slots. Upserts that update an existing player do not count. Deletion does not reset slots. Existing saved players consume slots at migration without retroactive creation rewards.

The first accepted friend challenge binds one inviter per invited account. Anonymous claims do not reward joining. A nonanonymous claim or subsequent anonymous-account upgrade grants the joined reward. The first eligible Friends completion grants the other reward; if it precedes registration, registration releases both rewards. Flags and ledger keys make each stage once-only.

`account-xp.ts` provides reusable account progress and game receipt rendering. Profile and editor show account progress; Solo/Friends game-end panels show the reward breakdown, streak multiplier, progress, and roster CTA when points are earned. The editor refreshes after cloud saves and when opened. Invite/creation receipts also appear as the latest reward in account progress.

## Configuration

The source configuration is `src/xp-config.json`: 100 XP per point, budget 35–43, all four Solo tiers, Friends rewards, invite stages, creation slots/rewards and streak thresholds. The effective database configuration after all migrations is verified against this file by integration tests.

After changing the JSON, generate a **new** migration using:

```sh
node scripts/xp-config-migration.mjs > supabase/migrations/YYYYMMDDNNNNNN_tune_xp.sql
```

Use an actual unused migration timestamp. Review and apply the generated migration with the app release. Do not edit applied migrations. Runtime awards and progress use the database configuration; changing only frontend JSON does not tune the server.

## Doubled gameplay rewards

`202609250004_double_game_xp.sql` doubles completion and win XP for future games. Existing XP and receipts stay unchanged. Solo Easy pays 4 + 2 for a win, Normal 6 + 4, Hard 10 + 6, and Expert 14 + 10. Friends pays 10 + 4. Streak multipliers still apply afterward. A Normal win now earns 10 XP before streaks: ten wins earn one Skill Point. A Friends loss also earns 10 XP.

The 100-XP conversion, 35–43 budget, invite rewards, creation rewards and streak multipliers are unchanged. Apply this migration after the preceding XP migrations when deploying the configuration update. The XP help UI reads the shared JSON and automatically displays the new amounts. The doubled Solo/Friends reward values were applied directly to the active database configuration on September 25, 2026 and read back successfully. The SQL migration remains the reproducible deployment change; no migration-history row was added by this configuration-only update. Previously issued receipts retain their original awards.

## Database changes and rollout

Apply `supabase/migrations/202609250002_xp_progression.sql` before releasing the new client. This migration has only been exercised against temporary local databases, not applied to a live project.

New tables: `xp_config`, `account_xp`, `xp_events`, `xp_invites`, `xp_analytics`.

Updated functions: `account_skill_budget`, `my_skill_progress`, skill normalization/enforcement, and community skill saving. New functions/triggers handle transactional awards, player insert rewards, authoritative Friends completion, challenge activation, auth upgrade and Solo history recording. Personal and published skills now support the requested maximum of 10, with total budgets still enforced.

`xp_account_metrics` and `xp_budget_milestones` are service-only reporting views. They expose total/gameplay XP per active UTC day, XP per completed game, Solo/Friends mix, invite XP, streak bonus XP, days to the first point and days to every budget level (including thresholds crossed in one reward). `xp_analytics` persists all six requested event names with their properties. No external analytics vendor is required.

Migration converts the previously earned online-match budget to XP, capped at 43. Legacy 44/45 budgets become 43; existing skills are normalized by the editor on load/save, not silently rewritten by this migration. Historical Solo 50/100 XP is not converted. Existing history remains readable. Legacy clients can still write old history but will not earn V1 XP; coordinate the client release.

## Assumptions and remaining product decisions

- Existing Solo has opponent selection but no named difficulty modes. Current gameplay reports **Normal**. All four tiers are implemented and tested in the backend; connecting Easy/Hard/Expert to actual gameplay requires a difficulty definition. No fake difficulty selector was added.
- Streaks use the server's UTC calendar and receipt date. Multiple games the same day use the same multiplier. An offline game synced later counts on the sync day. A missed day resets the next game to day one.
- Short/custom-target games receive full rewards. Decide whether very short games need a minimum eligible target before a competitive launch.
- Anonymous accounts can earn gameplay and creation XP; inviter activation waits for registration. Existing registered accounts accepting a challenge qualify as joined. Decide whether acquisition rewards should instead require newly registered users.
- The first accepted inviter wins attribution. Guest seat recovery carries referral flags forward when the destination has no existing attribution, without re-awarding XP. Account XP itself is not merged into a different anonymous identity. Decide account-merge semantics before promising cross-device guest progression.
- Existing deleted characters have no complete lifetime creation audit. Migration reserves slots for currently saved characters, then enforces lifetime limits going forward.
- Community-bot matches do not count as Friends. Define a Solo-equivalent tier for those matches if they should grant XP.
- Changing conversion thresholds or lowering the maximum recalculates budgets from lifetime XP. Review any reduction/grandfathering policy before tuning those parameters.

## Files changed for this implementation

- `src/xp-config.json`, `scripts/xp-config-migration.mjs`: centralized rewards and tuning migration generator.
- `supabase/migrations/202609250002_xp_progression.sql`: schema, rewards, permissions, migration and reporting.
- `src/account-xp.ts`, `src/account-xp.css`: reusable progress and reward UI.
- `src/account-skill-budget.ts`, `src/skill-budget.ts`, `src/player-creator.ts`: account budgets, 10-point caps, editor refresh and remaining points.
- `src/cloud-players.ts`, `src/account-panel.ts`, `src/main.ts`: Solo result persistence, retry queue, account history and completion feedback.
- `src/multiplayer/profile.ts`, `src/multiplayer/remote-main.ts`: profile and Friends completion feedback.
- `tsconfig.json`: JSON module imports.
- `tests/xp-progression.test.ts`, `tests/skill-budget-database.test.ts`, `tests/browser/xp-preview.html`: economy/security coverage, updated budget regression and visual preview.
- `docs/XP_PROGRESSION.md`: implementation, rollout and test checklist.

Other pre-existing workspace changes were left intact.

## Verification checklist

Automated command:

```sh
node --import tsx --test tests/skill-budget.test.ts tests/skill-budget-database.test.ts tests/xp-progression.test.ts tests/guest-registration.test.ts tests/friend-challenges.test.ts tests/solo-launch.test.ts
npm run build
```

Covered: every Solo reward tier and win/loss, exact 100-XP boundaries, multi-point rewards, cap and continued XP, same-day streaks, each multiplier tier, missed days, concurrent duplicate Solo submissions, abandoned games, custom target completion, Friends rewards, immutable completion receipts, player deletion/recreation limits, guest claim/registration, once-only invitation stages, write/RPC permission denials, account read isolation, reporting access, restart persistence and SQL/client skill normalization parity.

Manual release checks:

- Finish a Solo game; check breakdown and XP total. Disconnect during save, reconnect, and confirm exactly one receipt.
- Complete a human Friends game; verify both devices receive their completion/win awards and repeated matches still pay.
- End either mode early; verify zero XP and no streak advancement.
- Cross a threshold; use “Upgrade your roster,” verify every player has a free point, no automatic assignment, and redistribution works.
- Create/delete/recreate four players; only three lifetime creations pay.
- Accept a challenge as a guest, register, finish a Friends game; check inviter rewards once each.
- Verify account switching and reopening an old completion show only the signed-in account's receipt.
- Review the progress component at `/tests/browser/xp-preview.html` during development, and test completion dialogs on a small phone. The isolated normal/capped component has been visually checked; full authenticated live-device flows remain a release check.
