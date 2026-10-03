# Player roster save conflicts

Player content has a server revision. Each editor save carries the revision it was based on, a durable operation ID, and (for consecutive offline edits) the preceding save operation ID. The server checks both revision and predecessor before atomically changing the player and selection. Retries remain idempotent. A failed preceding save cannot make a later stale edit valid merely because its predicted revision matches.

Reconnect reads the server roster. It never uploads an entire cached roster over existing players. A first connection can import previously unclaimed players only when their IDs are absent remotely; the operation still checks for a concurrent insert. A recovery copy of the original local library is retained. Conflicting operations are retained under account-scoped `pickle-roster-conflict-v1` keys, removed from automatic retries, and reported visibly. Reloading obtains the latest saved player; recovery copies are not silently reapplied.

`202610030001_player_revisions.sql` adds revision checks and blocks content writes from older clients that do not advance the revision. Selection-only changes remain compatible. Older browser tabs must reload the new client; native installations need a compatible build to edit existing players. Never remove the guard to accommodate an old client.

A running match retains its starting player snapshot. Restoring an overwritten roster player should use the intended match snapshot and the original player ID, with a conditional update against the currently inspected revision. Do not rewrite match history or create a duplicate identity.

Validation: stale revisions, legacy direct writes, failed-save descendants, duplicate delivery, deletion, account isolation, durable conflict recovery, and unrelated saves are covered by regression tests. Release status is recorded separately; this document does not establish deployment state.
