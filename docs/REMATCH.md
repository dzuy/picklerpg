# Match-end rematches

The primary action is **RUN IT BACK? / REMATCH NOW** for every match mode. A compact result heading precedes it; the small final score and XP summary, contained Rivalry Stats, analysis link, and navigation follow it. Skill Point upgrades remain prominent when available.

- Multiplayer counts down from 10 using elapsed time. Expiration sends one invitation, never consent. Two manual requests can join the same game; crossed automatic requests require an explicit acceptance.
- Automatic invitations show **REMATCH SENT** after server confirmation. The sender can deliberately confirm their intent; this lets a computer opponent accept. Computer opponents never accept an unconfirmed automatic invitation.
- Countdowns show **RUN IT BACK?… 10** through **RUN IT BACK?… 1** in the heading. Solo games automatically restart with the same players and settings at expiry. Your Games returns to the games list; New Game opens setup directly. Both cancel the countdown permanently for that match, as does lifecycle/navigation cancellation. Local two-human games still count down to **REMATCH READY** and require a tap.
- Secondary controls, stats, navigation, dialog closure, focus loss, and browser/native backgrounding cancel the active countdown. Manual rematch remains available after cancelling the countdown. Multiplayer reopening can restart it if no invitation exists.
- A local receipt is written when the countdown starts. Multiplayer records the first view on the server but permits a fresh ten-second countdown when reopening a completed game with no existing rematch invitation. An existing pending, accepted, or closed rematch prevents a new automatic countdown. Concurrent expiry still uses the unique invitation relationship. Failed eligibility checks leave manual rematch available.
- Incoming requests stop the countdown and show **ACCEPT REMATCH**. **Your games** is the single multiplayer exit and cancels the timer; pending invitations can be handled from the games list. A declined request cannot prompt again for the same completed match; a new challenge remains available.
- Sent invitations remain in Your Games until accepted or closed; declined invitations disappear automatically. Leaving the end screen does not withdraw an invitation already sent.
- Requests and acceptance use the existing unique rematch relationship and transactional invitation acceptance. Rematches preserve the source roster, court, and scoring rules.

`202609280001_rematch_intent.sql` was applied to production on 2026-09-28 before release `541904c`. Do not rerun it blindly. Automatic countdown eligibility is controlled by `rematch_auto_countdown`, initially only for `dzuy`; see [feature flags](FEATURE-FLAGS.md). Manual rematch remains available to other players.
