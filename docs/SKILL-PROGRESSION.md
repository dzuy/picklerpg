# Account skill budgets

Installed in Supabase on September 21, 2026 with migration `202609210002_skill_budgets.sql`.

## Rules

- Each account starts with 35 points. Every character gets the full budget independently.
- Power, Control, Speed, Hands and Defense display on a 0–10 scale; the engine retains 0–100 values and the existing DUPR calculation.
- Starting builds have a 9/10 cap. Earning the first bonus point unlocks 10/10; the total budget still applies.
- Every 10 completed online games adds one account point, up to 45 points after 100 games. Wins and losses both count. Historical completed games count. Early exits and unfinished games do not.
- Solo/local games do not earn points in this version: rewards use server-owned match results. Referral/share rewards are not implemented.
- Fine-tuned subskills cost their area's average rounded up to a whole point. Every subskill must obey the cap.
- Reallocation is free. Randomization uses the full available budget. Existing builds are proportionally reduced when needed, preserving identity and appearance.

## Community copies

Creators configure a separate 35-point community starting build. Adding a player snapshots its appearance, identity, creator attribution and starting skills into the recipient's roster. The recipient may customize skills with their account budget, without changing the original or other copies. Later source edits, unpublishing, moderation or deletion do not change existing copies. Removing and re-adding a publicly available player takes a new snapshot.

## Enforcement and rollout

Database triggers validate owned and published builds; personal community skill edits use an authenticated owner-scoped RPC. Budget and progress are computed from match records, never user metadata or browser storage. Multiplayer entry points normalize submitted owned builds and resolve community teams from the account's stored copy.

The migration saved original owned skills in `skill_budget_migration_backup` before normalization. This table is protected from application roles. Existing in-progress match snapshots and gameplay formulas are unchanged.

The profile shows current budget and progress to the next point. The creator shows assigned/remaining points, disables unavailable increases and explains how to free points.

Validation: budget/randomization tests, PostgreSQL authorization and normalization tests, reward thresholds/cap/early-exit tests, snapshot independence/deletion tests, multiplayer team resolution tests, production build and 390px editor inspection.
