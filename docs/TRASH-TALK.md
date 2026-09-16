# Multiplayer reactions

The bottom-right message icon opens a compact composer with 18 instant-send emoji reactions and a 40-character custom input. Messages are shown above the sender’s first team member (`you` for home, `opponent-left` for away), expire five seconds after server acceptance, and replace that player’s previous bubble. There is no conversation log in the UI. Game settings includes a device-local mute preference, which also hides replay bubbles.

The authenticated `/api/matches/:id/trash-talk` endpoint filters common English profanity to comic symbols before storage. GET returns the current and previous move’s messages plus any still-live message. POST accepts `{id, text}`; its UUID is an idempotency key. Database membership checks and a per-sender, per-match three-second cooldown apply even across devices. Messages do not change game versions, turn ownership, notification clocks, or checkpoints.

Migration `supabase/migrations/202609160001_match_trash_talk.sql` was applied to the PickleBash Supabase project on 2026-09-15. It adds an RLS-protected message table and service-role-only RPCs. Original uncensored text is not stored. Messages are retained with the match and deleted when the match is deleted.

The existing replay covers the last move. Messages recorded at version N appear at the beginning of move N+1 for up to five seconds of replay time; if multiple messages were sent by one player while waiting, that player’s latest one appears. Pausing and scrubbing replay also pause and scrub bubble visibility. Messages after the final move are live only because there is no subsequent move.

Validation: `node --import tsx --test tests/trash-talk.test.ts tests/remote-http.test.ts tests/remote-session.test.ts tests/remote-match.test.ts` and `npm run build`. The database test starts temporary local PostgreSQL. `node scripts/trash-talk-browser-check.mjs` serves the real chat component with a simulated API at localhost:5189 for desktop/mobile visual checks.
