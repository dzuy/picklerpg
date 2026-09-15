# PickleBash backlog

## Product direction

**Social-first asynchronous pickleball with friends.** The core loop is invite → play a short strategic match → return when it is your turn → finish → play again. Prioritize making that loop easy, enjoyable, and worth returning to.

This backlog supersedes the earlier simulation/solo/RPG build order. Existing solo play, player creation, and simulation remain supporting capabilities. Their presence does not make career progression or additional game modes roadmap commitments.

## Verified foundation

- [x] Local save/resume and same-device two-human doubles.
- [x] Server-authoritative remote matches, authenticated turns, and persistent shared state. User confirmed a successful two-physical-device playtest.
- [x] Creating matches and joining friends' matches. User confirmed these flows work.
- [x] Multiplayer home/game list exists. User confirmed it needs considerable visual design improvement.
- [x] Rally/side-out scoring preference. New test matches default to rally scoring, first to 3 without win-by-two; existing matches retain their rules.

Other implemented capabilities include invitations with acceptance/decline/cancellation, player rosters/customization, community players, team stats, and last-move replay. These are foundations to refine, not features to rebuild from scratch. Existing team stats do not by themselves complete friend-pair rivalry or rematches.

## Current priority: multiplayer home design

- [ ] Redesign the multiplayer home/game list to fit PickleBash's visual identity.
- [ ] Make Your turn, Waiting, invitations, and Finished easy to distinguish and scan.
- [ ] Improve match cards: opponent/team identity, score, latest activity, and a clear resume action.
- [ ] Refine mobile layout, typography, spacing, hierarchy, and navigation.
- [ ] Polish empty, loading, offline, and error states alongside the normal flow.

Acceptance: a returning player immediately understands which game needs attention and reaches that game easily on a phone. Build on the working creation/join/resume flows.

## Next social-loop priorities

1. **Match pacing.** Tune rally length and the number/clarity of decisions, so games feel satisfying and short enough to finish with friends. First-to-3 rally scoring is a testing choice, not a final format decision. Preserve strategic agency.
2. **Rematches and rivalry.** Make playing the same friend again easy; add or complete rematch requests, head-to-head history, series lead, and streaks. Audit existing completion and team-stat features before implementing overlaps.
3. **Turn and invitation notifications.** Add an opt-in return path with a direct match link, preferences, and suppression of stale alerts. Choose the external delivery channel before implementation; in-app turn status already exists.
4. **Trash talk chat system.** Let players exchange playful messages within a match, with muting, blocking, reporting, and sensible moderation safeguards.

These are the next priorities, not authorization to implement them all in one pass. Use the [multiplayer plan](../TURN_BASED_MULTIPLAYER_PLAN.md) for technical acceptance criteria, checking them against current code and confirmed playtests.

## Supporting polish and reliability

- [ ] Sound effects and music, with user controls.
- [ ] Consistent PickleBash naming and design across screens, navigation, titles, and copy.
- [ ] Finish the previously requested targeting-wheel cleanup; audit the remaining legacy shot dock/expander and retain necessary input/accessibility paths.
- [ ] Improve invite, account recovery, and return-to-match UX based on actual friction; basic account and invitation flows already work.
- [ ] Broaden reconnect, retry, long-inactive-match, and old-engine compatibility checks.
- [ ] Backup/restore and rollback drills, performance under load, and useful operational diagnostics.

Core authorization, transaction, retry, and persistence safeguards are already implemented and tested. Reliability work here extends coverage for wider use rather than treating the existing remote implementation as unfinished.

## Outside the active roadmap

Career Mode, Arcade Mode, RPG progression, tournament ladders, skill unlocks, stamina/fatigue, scouting, and long-term character development belong to the earlier solo-oriented plan. They are **archived ideas, not promised later phases**. Reconsider only if they clearly support the social experience and are explicitly prioritized.

Voice improvements, real-time multiplayer, and deeper physical simulation are also outside the current focus. Preserve working functionality; do not expand it by default.

## History and references

- [Historical roadmap and implementation log](BACKLOG-HISTORY.md) — original numbering and older decisions; not an active task list.
- [Original supplied roadmap](roadmap-source.txt).
- [Multiplayer architecture and acceptance plan](../TURN_BASED_MULTIPLAYER_PLAN.md).
- [Remote implementation and rollout notes](PHASE-3-REMOTE.md).

Current user-confirmed status supersedes older pending-deployment and pending-playtest notes in the historical documents.
