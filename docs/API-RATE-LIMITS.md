# Multiplayer request limits

Released September 28, 2026 in `8af8c6b`: Railway deployment reached Active and health passed. Included in uploaded TestFlight 1.0 (7), pending export compliance; see [release record](TESTFLIGHT.md).

Authenticated requests are keyed by account and traffic type: 300 reads, 60 turn submissions, and 120 other writes per minute. Existing sensitive route limits (sign-in, invitations, analysis, nudges, and others) still apply. Background reads cannot consume turn allowances. Authenticated traffic does not share an IP quota; anonymous requests retain network-based protections. Registration is limited per network rather than globally across all players.

`TRUSTED_PROXY_HOPS` defaults to zero: forwarded headers are ignored. Set it only after verifying the deployment proxy chain and preventing direct access that could spoof that chain. The address is selected from the right of X-Forwarded-For, not from an arbitrary client-provided first entry. Shared Wi-Fi still shares anonymous limits, but never authenticated gameplay limits. Edge-level connection and authentication abuse controls remain necessary.

Limits return HTTP 429 with Retry-After. The client pauses requests in the affected read/turn/write-path category during the cooldown. A rate-limited read does not mark an otherwise playable match offline. A throttled turn remains saved and retries the same action ID after the delay; disposing the session cancels the timer. Successful shot receipts render before background reconciliation.

Badge checks run only with visible navigation. Game-state reads no longer trigger badge requests; the five-second navigation poll and mutation/return events update counts. Concurrent badge refreshes are coalesced and event bursts are bounded to one request per second.

For a single local server the default store is in-memory, with expired counters swept rather than rejecting all new players at a 5,000-counter ceiling. For multiple server instances, apply `202609280005_api_rate_limits.sql` first, then set `RATE_LIMIT_STORE=database` on every instance and deploy. This uses atomic database counters shared across instances, hashes limiter keys, and restricts the RPC to service_role. Store failures return 503 rather than silently bypassing limits. The migration was applied to the shared database on September 28, 2026 before this release. The production entry point defaults to the shared database store; local Vite remains in-memory. Do not enable the database store before applying it. Expired rows are cleaned in bounded batches during traffic.

Validation covers separate accounts sharing a connection address, exhausted reads followed by a valid turn, more than 5,000 counters, Retry-After client backoff, replay-safe automatic turn retry, concurrent database calls, counter expiry, and RPC access restrictions. These are correctness checks, not a production capacity benchmark. Measure database latency and 429 rates under representative load before increasing rollout or server count; database-backed limiting adds an RPC per applicable quota.


## October 2 audit remediation — web/server deployed

Production `/api/opponent` and `/api/command` require a valid, active Supabase account token; anonymous guest sessions qualify. Clients obtain the current bearer token before these requests. The production handler fails closed if authentication configuration or the database limiter is unavailable. Local Vite and the loopback-only opponent development server explicitly use a development bypass.

These paid routes have separate persistent budgets: 300 authentication attempts per network per minute before token validation, 60 provider requests per account per minute, and 300 provider requests globally per minute. These counters always use the shared database store in production, independent of the multiplayer limiter setting. The network budget deliberately bounds authentication cost, so players sharing a network also share this pre-authentication allowance. Successful calls consume all applicable allowances; rejected/failed attempts may consume a preceding allowance. Existing eight-request concurrency and 60 KB input limits remain, and external output is capped at 1,024 tokens per request.

The compatible browser client and protected server are live in `26f49c5`; the shared limiter function is installed. Live checks confirmed 401 without valid credentials and successful guest command access. The native update remains pending App Store Connect sign-in: older clients that omit the bearer header receive 401. Migration collisions have been reconciled. See the [verified release record](AUDIT-RELEASE-2026-10-02.md) for evidence and remaining device/load checks.
