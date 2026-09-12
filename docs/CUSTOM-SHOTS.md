# Phase 6 — text shot selection

In Full game or pattern practice, every home decision includes Your custom shot. Describe the shot, choose Instant local parser or Language model, and press Preview command. Review shot family, semantic target, pace and any approximation notes, then press Play custom shot. Menus stay available throughout. Nothing automatically submits an interpretation.

The local parser handles lob, roll, overhead/smash, dink, drop, reset, block, counter, volley, return, serve, drive/rip/jam/body bag/speed-up, topspin, slice, and side spin. Targets include middle, wide, line, crosscourt, open gap, left/right player and Jules/Rio; aim can be body, feet, backhand or behind. A direction next to “spin,” “slice,” or “curve” controls ball bend; a direction next to “player” or “opponent” controls the target. Light, medium, and strong change spin intensity. Local ambiguous pronouns ask for a player name or side. It is deliberately a small parser, not arbitrary language understanding.

Language model mode uses the existing server/Codex-plan provider or configured API provider. It returns a strict four-field description, not game state. The client validates this and maps it to canonical ShotIntent, then generates and validates a custom shot from the unchanged contact. Actor is always the current hitter. Illegal shots receive an explanation, never an automatic substitute. The model parser may interpret ambiguous wording imperfectly; review is mandatory. Timed-out or failed language calls report an error and suggest local parsing, without silently guessing.

Roll is a drive on a bounced contact or a volley on an airborne contact. Spin is not simulated. Hip/body uses the body target. Soft backhand drops, behind-player dinks and lobs over a player use lane/depth approximations, disclosed in the preview; they do not implement exact coordinate placement. High player targets have simple continuation if not intercepted. This increment expands intent choices without advanced ball physics.

After a command is played twice, it becomes a quick action. At most five frequent actions display, from up to 30 command strings remembered during the session. Clicking one reinterprets/revalidates it for the current contact before offering Play. Records are in memory only and clear on refresh. Unknown sophisticated LLM-only wording may still require selecting Language model again rather than the quick local path.

Testing covers parsing, strict schema, off-menu lob, fixed contact until commit, impossible overhead, curved side spin, topspin drop, exact spin interception, body-target execution and stale LLM results after reset. Existing regression suites also pass. Endpoint and provider setup use the same local service; restart it after updating server code.

## Updated interaction: automatic interpretation and direct play

The parser dropdown and preview step have been removed. Play custom shot (or Enter) uses instant parsing only when the command is entirely within its recognized vocabulary; otherwise it requests language-model interpretation. After contact/intent validation, the shot plays immediately. Invalid or unavailable interpretation leaves the ball at the same decision and reports an error; there is no automatic substitute. Quick actions also interpret and play directly. Duplicate requests during interpretation are ignored; late replies after a changed contact or Restart cannot play. Earlier preview instructions above describe the superseded flow.

Lob serve fix: “lob serve,” “high serve,” and “lofted serve” map to the serve family with an arc and 2.5 m requested net clearance, defaulting to the diagonal deep service box. A plain “serve” also defaults diagonally. Explicit targets still pass serve legality checks. Plain rally lobs are unchanged; lob serves are unavailable mid-rally. These phrases use the instant parser.

### Nasty Nelson body serves

`nasty nelson the left side player` now parses locally as a fast, flat serve at that opponent's body. Right, Jules, and Rio also work. Generic `serve at Jules body` uses the same canonical serve + player/body intent. Serve contact restrictions still apply; this cannot be played mid-rally. Untargeted Nasty Nelson requests ask for a player.

Full matches model body contact before landing. A hit awards the serving team the point; on a miss or dodge the original parabola continues to ground and the diagonal service-box rules apply. This follows 2026 USA Pickleball rule 7.E.5 (receiver fault on pre-bounce contact), and 7.E.1–2 (invalid serve landing): https://fliphtml5.com/cksih/USAP-Official-Rulebook/ .

The body envelope and seeded lateral dodge are prototype approximations. Hands skill and available flight time influence avoidance; these probabilities are design values, not measured player behavior. Only the deliberately targeted player's body is checked, not general swept collisions with all players. The shot lab demonstrates trajectories; full-match play resolves hits and dodges.
