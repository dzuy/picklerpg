# Activity rewards

Activity comes first: 15 milestones celebrate completed games (1, 10, 25, 50, 100, 250), distinct playing days (10, 30), different opponents (5), best daily streaks (3, 7), best weekly streaks (4, 12), and best win streaks (3, 5). There is no rating or leaderboard.

Community cards show the selected earned badge/title. Profiles show all earned badges, progress toward locked milestones, current streaks, and personal bests. Players choose their display title in Profile. If no eligible title is selected, the highest completed-game milestone is displayed. No games means no earned title.

Completion timestamps determine UTC days and Monday-start UTC weeks. Current streaks remain alive during the current day/week if the previous period was active. Multiple games in one period count once toward attendance streaks. A loss resets the current win streak; ending a game early awards nothing. Archived completed games count. Duplicate match IDs count once. Historical bests preserve earned badges when current streaks lapse. Titles cannot unlock badges.

Human progress derives from saved completed solo game history and authoritative online matches. Unsynced browser-only games are not published as community achievements. Bots use separate simulated activity consistent with their seeded totals, combined with their actual completed matches.

Run `node --import tsx --test tests/activity-rewards.test.ts tests/team-directory.test.ts` to validate calculations and directory integration.
