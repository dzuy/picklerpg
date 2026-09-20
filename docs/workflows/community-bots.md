# Generate community bot accounts

Use this workflow when asked to seed the community or create more bot players.

1. Choose the requested count and a new descriptive batch name (for example `community-2026-09-17`). Each batch contains up to 200 accounts. The count is the target size of that batch, not an increment. Reuse the batch name to retry a partial run or grow that batch; use a new name to add another independent batch.
2. Run from the project root with the configured Supabase service credentials:

   ```sh
   node --env-file=.env.local --import tsx scripts/admin/seed-community-bots.ts --batch community-2026-09-17 --count 10
   ```

3. Verify the command reports the requested number ready. Refresh Community after the server's account cache refreshes (up to 60 seconds for bot control, 5 seconds for the directory).
4. Report the batch and usernames to the user. Never print credentials or passwords. Do not create matches on the user's behalf unless requested.

The generator uses real Auth accounts, unique usernames, saved player/partner designs, public rosters, and `dzuy` as a starting friend. Reserved `.invalid` email addresses avoid contacting real people; random passwords are never printed or persisted by the script. Only server-owned `app_metadata.community_bot` identifies an automated account. Existing human accounts are never overwritten. Repeating a batch repairs missing roster rows without creating duplicates.

The normal multiplayer server runs the worker automatically while it is running. Challenges and rematches to a generated bot are accepted immediately in the invitation request, using its saved team, and the bot plays its opening turn before the game opens for the challenger. Only server-owned bot flags authorize this. The worker recovers pending invitations after 8–25 seconds if immediate acceptance fails, and submits subsequent legal turns after 4–14 seconds, plus up to 2 seconds polling latency. Timing varies per invitation/turn and survives restarts; version checks and idempotent action IDs protect concurrent workers. Bots use the same invitation and match services as humans. They stop at game completion and can send occasional friendly reactions through the participant-authorized reaction API. Surprise invitations are enabled only for human accounts with server-owned `app_metadata.bot_invites_since` set to an ISO timestamp. The first arrives 15–90 minutes after enabling; later invitations wait 24–72 hours after the most recent bot invitation. Pending bot invitations block new ones. Remove the metadata field to disable. `COMMUNITY_BOTS_ENABLED=false` disables automation without deleting accounts. A continuously running server is required; these are not external scheduled jobs.

Validation:

```sh
node --import tsx --test tests/community-bots.test.ts
npm run build
```

Personas now mix plain handles, numbers, nicknames, and occasional underscores. Avatars independently vary skin, hair, face, headwear, glasses, clothing, colors, and handedness. Seeded win–loss baselines live in server-owned `app_metadata.bot_seed_record`; real completed matches are added to that baseline without inserting fake match history.

To refresh an existing bot batch's usernames and appearances when explicitly requested, append `--refresh true`. This preserves account IDs, friendships, games, and existing seed statistics. Normal runs do not rerandomize existing bots. The initial 10 were refreshed using this option.

New bot seed records start with 70–99 games played and varied win rates. Actual completed games add to these totals.

Activity rewards: new bots receive a simulated event timeline consistent with their seeded win–loss record. To backfill rewards and varied earned titles for existing bots without replacing avatars or games:

```sh
node --env-file=.env.local --import tsx scripts/admin/seed-bot-rewards.ts
```

Real player rewards are computed from completed game history. Synthetic bot timelines remain in server-owned `bot_seed_activity` metadata. Selected titles are validated against earned milestones before display.
