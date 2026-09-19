# Rivalry UI playtest

Run `npm run preview:rivalry`, then open http://127.0.0.1:5194/preview on this computer. The preview uses simulated Alex/Ryan accounts and a disposable local PostgreSQL database. It does not use hosted accounts or modify production data. Restarting it resets its sample games and URLs. Keep the process running while testing.

## What to try

1. Open **Streak broken — Alex**. Check the final score, streak-break headline, 1–3 series, and four games together. Older results show the record at that game's completion.
2. Tap **Rematch**. Stay on the waiting screen. From the preview index open the matching **Ryan** link in a second tab, then tap **Accept rematch**. Both tabs should enter the same new game with the original teams and rules. Reloading the waiting tab must preserve the request.
3. Try the first-game, tied-series, lead-change, streak, and milestone fixtures. The two accounts should see reversed scores and series records.
4. Open **Games and friend profiles**. Active cards show the current series. Open Friends → Ryan's profile to see the head-to-head record and recent results.
5. Open **Final shot playback → result** to check that the result screen waits until the final animation finishes. Try **Play an active game** to check normal turn controls.
6. On a narrow browser window, check wrapping, score readability, and all three completion actions. Also try Challenge a friend and Your games.

## Verification and release boundaries

- 490 automated tests pass, including rematch authorization, simultaneous requests, status reads, retry, stale-response handling, and deterministic story priority. Production build passes.
- Browser checked: completion display, reversed viewer records, shared rematch acceptance and automatic entry by the requester, lobby series lines, and friend history.
- Physical two-device/mobile acceptance remains a release check; the local server binds only to this computer.
- This is the rivalry presentation step. Per-match shot summaries are now available under Your shot selections; see MATCH-STRATEGY-DATA.md. Profile → Shot Mix now includes cross-match counts and opportunities (see SHOT-MIX.md). Evidence-qualified strategy stories and sharing remain later work.
- Hosted release still requires applying the migrations, rebuilding historical rivalry summaries, and deploying the application. See RIVALRY-DATA.md and SHOT-SELECTION-DATA.md.
