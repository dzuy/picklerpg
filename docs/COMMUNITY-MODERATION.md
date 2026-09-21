# Community moderation

Installed in the picklebash Supabase project on September 21, 2026 via SQL Editor. Verified one community admin (@dzuy), moderation RLS enabled, direct authenticated table writes denied, and anonymous moderation RPC execution denied. No players were hidden during installation.

The `community_admin` flag in trusted Supabase **app metadata** grants moderation. It is never read from user-editable metadata. The account grant script verifies both @dzuy and dzuylinh@gmail.com before setting this flag, preserving all other metadata.

Apply `supabase/migrations/202609210001_community_moderation.sql` before using the button. With a database URL saved as `SUPABASE_DB_URL` in `.env.local`, run:

```sh
node --env-file=.env.local --import tsx scripts/admin/apply-community-moderation.ts
```

The script verifies the expected admin account in the target database and applies the migration in a transaction. The UI checks `is_community_admin()` against the current authenticated account; the mutation RPC independently enforces this permission.

“Remove from community” records moderation in a separate protected table. It does not delete players, edit their sharing flag, change existing selections, or change match snapshots. Hidden players remain available to accounts that already selected them. Existing selections now use independent personal snapshots (see SKILL-PROGRESSION.md); hiding affects discovery. New additions are blocked by row-level security even with an old catalog or a direct API request. Owner edits cannot clear moderation.

Starting Lineup entries are bundled game assets, not community-published players, and do not receive a community moderation button.
