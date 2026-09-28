# Match-end rematches

The primary action is **RUN IT BACK? / REMATCH NOW** for every match mode. Results and rewards precede it; reports, stats, and navigation follow it.

- Multiplayer counts down from 10 using elapsed time. Expiration sends one invitation, never consent. Two manual requests can join the same game; crossed automatic requests require an explicit acceptance.
- Automatic invitations show **REMATCH SENT** after server confirmation. The sender can deliberately confirm their intent; this lets a computer opponent accept. Computer opponents never accept an unconfirmed automatic invitation.
- Solo/local games count down to **REMATCH READY**. They require a tap to restart, since there is no remote recipient to accept a request. Existing players and match settings are reused.
- Secondary controls, stats, navigation, dialog closure, focus loss, and browser/native backgrounding cancel the countdown permanently for that match. Manual rematch remains available after cancelling the countdown.
- A local receipt is written when the countdown starts. Multiplayer also claims the attempt on the server, once per account and completed match, across devices. If claiming fails, only manual retry is available.
- Incoming requests stop the countdown and show **ACCEPT REMATCH**. **Not Now** declines an incoming request; before a request, it only cancels the timer. A declined request cannot prompt again for the same completed match; a new challenge remains available.
- Sent invitations remain in Your Games until accepted or closed. Leaving the end screen does not withdraw an invitation already sent.
- Requests and acceptance use the existing unique rematch relationship and transactional invitation acceptance. Rematches preserve the source roster, court, and scoring rules.

Deploy `202609280001_rematch_intent.sql` before the corresponding server/client changes.
