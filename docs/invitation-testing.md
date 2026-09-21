# Invitation testing without a second device

Run `npm run preview:invites`, then open <http://127.0.0.1:5195/__lab>.

The lab runs four localhost origins with independent browser storage:

| Port | Player | Scenario |
| --- | --- | --- |
| 5195 | Alice | Registered sender |
| 5196 | Bob | Registered returning recipient |
| 5197 | Bob | Guest; sign-in survives reload |
| 5198 | Bob | Guest; localStorage and sessionStorage throw SecurityError |

Accounts, authentication, and invitation persistence are simulated. The invitation screens, browser-storage fallback, navigation, court, match engine, and turn API are real application code. Nothing connects to Supabase or sends emails/messages. No credentials are needed. The lab replaces auth imports and bypasses the normal Vite configuration and environment files. Do not use real account credentials in it.

## Share a link

1. From Alice’s launcher, open her games and choose Play With Friends.
2. Enter **Bob guest** (a name not in the simulated directory) to create a link invitation rather than a direct account invitation. Choose Start Game, then Copy Link.
3. Return to the launcher in another tab, paste the link, and choose a recipient scenario. The launcher changes only the local origin; it preserves the challenge token.
4. Accept as Bob if prompted, then start the game. Registered Bob chooses his team; guests enter with the assigned team.
5. Play the opening serve and check Alice’s game list: it should change to YOUR TURN. Close the recipient’s court and verify the game appears in their list too.

Create a separate challenge for each recipient scenario. An accepted invitation belongs to the recipient that claimed it. The normal guest origin retains that guest between page loads; the blocked-storage origin loses the guest on every reload. Restart the lab to reset all simulated matches and accounts. Existing tabs must reload after a restart.

## Regression checklist

- Registered recipient: accept, choose team, enter court, reload, reopen from Games.
- Normal guest: accept, serve, close court, reload; game remains available.
- Blocked-storage guest: accept and serve without a document reload; close court and find the game. Deliberately reload afterward: sign-in is lost, as expected.
- Open an accepted link from a different identity: it must not transfer ownership.
- Cancel a pending invitation as Alice and open its link: it must show unavailable.
- Copy a URL through the share UI and paste it into the launcher; the token must remain unchanged.

Automated local checks: `node --import tsx --test tests/invite-lab.test.ts tests/browser-storage.test.ts tests/open-challenge-game.test.ts tests/challenge-link.test.ts`.

## Coverage limits

The lab deliberately reproduces storage failures; it does not determine what caused a particular phone to block storage. It does not reproduce iOS native share sheets, embedded message-app browsers, real Supabase session refresh, email delivery, database claim transactions, or production configuration. Guest registration and non-link invitations are outside its scope. Its simulated challenge service is not a replacement for the existing SQL and live-auth tests.

For release acceptance, also test the deployed app using two separate browser profiles and dedicated real test accounts. Those profiles can open the exact same production link without changing its origin. Copy/pasting tests the receiving flow without sending a real message; native iOS sharing still benefits from a device smoke test.

Verified in the in-app browser: Alice creates and copies a challenge; a guest with both storage APIs blocked accepts it, reaches the real court, submits the first serve, and returns to a games list; Alice sees YOUR TURN. The local regression tests cover ownership, recipient-first serve, turn persistence, replayed acceptance, cancellation, and a new guest being unable to access the old guest’s game.

## Real-account release checks

Prepare dedicated QA accounts explicitly with `node --env-file=.env.local --import tsx scripts/prepare-invite-test-accounts.ts --run-live`. This uses the configured Supabase admin credential and stores generated passwords only in ignored `.multiplayer-test-accounts.json`. It reuses existing QA identities.

Run `node --env-file=.env.local --import tsx tests/browser/hosted-preview.ts` for two isolated local origins using real Supabase authentication and the real multiplayer API. No separate API server is needed. Open the temporary sign-in links printed by the helper. Transfer a challenge from port 5178 to 5179 by changing only the origin. These sessions are isolated by origin; they are not separate physical devices.

After deployment, run `node --env-file=.env.local --import tsx scripts/test-live-invitation.ts --run-live`. This creates one new match between dedicated QA accounts on picklebash.app and verifies team selection, first serve, fresh password sign-in, and both game lists. It writes `evaluation/invitation-release-smoke.json` without credentials or invitation tokens. Set `INVITE_TEST_BASE=http://127.0.0.1:5178` to check the local candidate first.

Release candidate verification: all 586 tests pass and the production build passes. Two real Supabase accounts were tested in isolated local browser origins: create/copy invitation, accept, choose team, enter court, play the first serve, and verify the sender sees YOUR TURN.
