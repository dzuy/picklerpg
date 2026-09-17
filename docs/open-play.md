# Open Play experiment

Main remains the rollback point at 7626403. Work lives on codex/open-play.

## Experience

- Home: Open Play, Practice, Roster.
- Open Play: Start a Game, private Invite a Friend, one Your Games list.
- Start a Game: ready matchup, Team A vs Team B, adjustable athletes and court.
- Humans manage teams. Team A is yours; Team B is computer managed for now.
- Friend invitations are private, team-level invitations. Each manager chooses their athletes.
- Leave and resume games; starting another game must never replace the earlier one.
- Practice has a separate entry, with drill gameplay to be designed independently.

## First implementation

Reuse the current match engine, wheel, character abilities and scoring. Keep existing remote invitations and remote matches compatible. Add an account-scoped multi-game local store and include its games in the Open Play list, with active, finished and archived filters. Preserve the legacy save for rollback. Browser-saved games retain their court and committed decision boundary.

Local Open Play games are saved on this browser. Private friend games remain server saved and cross-device. Public human matchmaking and cloud sync for bot games are future work; bots must not be presented as named human accounts. No new drill rules or progression in this slice.

## Validation

Exercise multiple saves, exact resume, legacy migration, owner separation, failed storage, archive/restore and ended games. Verify home navigation, setup, wheel serve, exit/resume and private team-level invitation copy in the browser. Build and run relevant persistence/gameplay tests.

## Team lobby

Open Play has three tabs: Games (the default, with existing game filters and invitations), Friends, and Community. Friends and Community show individual account names and profile avatars, with Challenge actions; roster athletes and skills appear only in Your Team. Friends is a personal saved-player list (adding a player does not send a friend request). No online presence or fabricated match records are shown.

Default lineups (`open_play_team`), team names (`team_name`), and saved players (`open_play_friends`), and independent profile appearances (`profile_avatar`) are stored in the current user's auth metadata. The authenticated directory endpoint returns only team-facing fields, not email addresses or private roster rows. The directory currently uses the existing playtest eligibility rules, capped at the first 1,000 registered accounts; larger launch populations will need a paginated public-team table.

Create a Match opens the existing friend-link flow. Challenge Team opens the registered-manager invitation setup with that recipient fixed; final submission remains explicit. Invitation retries are scoped by recipient. Saved own lineups seed creation and acceptance pickers, including duplicate athletes; recipients can change their lineup when accepting. Existing games live in the Games tab, while Your Team and Create a Match remain available across all tabs. Profile avatars use a stable default appearance until changed through the avatar chooser. Changing a lineup never changes the profile avatar. Quick bot play remains accessible separately.

## Mobile navigation and game layers

The start screen selects Open Play or Practice (currently the existing coming-soon screen). Open Play keeps Home, Games, Friends, Roster, and Profile in its bottom navigation. Home returns to the start screen. Tab changes update the URL so reloading Friends or Profile retains that destination.

Solo setup and saved solo games open through `openGameSurface` as a full-screen modal containing the game runtime. The originating page, selected tab, and scroll remain mounted behind the modal. Setup Back and the court X close the surface; Games refreshes its saved-game list on close. Direct game links still return to Games. Roster and Profile also expose game launch actions.

Friends' Start Game opens the existing opponent-specific team selector. Private setup and invitation details fill the viewport above navigation; closing returns to the current lobby tab. Online invitations still use the existing account and invitation flow.

Roster now mounts one reusable PlayerCreator inside the Open Play runtime. Its navigation callback switches lobby tabs without document navigation, while cloud player syncing, editing, team names, and history remain connected. The canonical route is `/?openplay=1&tab=roster`; standalone legacy roster bookmarks normalize to this route.
