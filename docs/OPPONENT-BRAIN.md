# Phase 4 — opponent brain (20–26)

Full game → Opponent brain selects Local adaptive or LLM with local fallback, a personality, and tactical intelligence. Changes apply at the next opponent request; a request already in progress keeps its original snapshot. Physical ratings and the user's control over every home shot remain unchanged.

## Snapshot and boundary

A detached versioned tactical snapshot contains metre coordinates, actor, ball position/velocity, stage, bounces, score, player skills/positions/tendencies, personality/intelligence, memory summary, and legal canonical intents. It excludes generated trajectories, random seeds, precomputed point results and execution feedback. The model returns only `{choice: integer}` selecting an offered intent. The existing engine executes it. Extra fields, invalid indices, refusals, timeouts and request failures trigger local fallback. Restart aborts the pending request and invalidates late replies. Thinking freezes at an opponent contact; home contacts never auto-submit.

## Memory, adaptation and personalities

Memory stores the last 40 completed home shots across points and clears on New game/Restart. It tracks drives, speed-up families, target counts, the last eight shot types, advancement of more than 1.2 m, and low-backhand execution faults. These are observations and coarse proxies: they do not prove a permanent weakness, and drive/counter/volley counts approximate speed-ups rather than measuring an actual acceleration.

Local personalities bias selection: Banger attacks; Grinder favors dinks/drops; Technician favors soft construction; Gambler favors attacking wide; Wall favors blocks/resets; Chess Player favors open court. Aware/adaptive intelligence enables responses to repeated drives, frequent speed-ups, predictable targets and crashing, plus pressure at the feet after low-backhand faults. High intelligence considers the actor's shot rating. Physical skill values do not change. Candidate availability limits every personality. LLM mode receives the same context and may interpret those patterns more deeply, within the same option boundary.

## Enable actual model calls

1. Copy `.env.example` to `.env.local` and fill `OPENAI_API_KEY` and `OPENAI_MODEL` with an accessible model supporting Responses Structured Outputs. Never use a `VITE_` prefix for the key. Do not put secrets in the chat or repository.
2. Run `npm run opponent-server` in a separate terminal (recent Node supporting `--env-file-if-exists` required). It listens only on 127.0.0.1:5174.
3. Run/restart `npm run dev`; Vite proxies `/api/opponent` to that service.
4. Select LLM with local fallback in the game and Apply. Calls use API credits. A status distinguishes LLM selection, thinking and local fallback.

The server restricts browser origins to localhost:5173, limits request size, accepts one concurrent request, imposes a five-second model timeout, never returns credentials or upstream errors, and requests `store:false`. The browser has a six-second deadline. The server is a local development adapter, not a publicly deployable authenticated backend. Production static preview alone cannot call it.

[Official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) informed the Responses `text.format` JSON schema integration. No SDK dependency was needed; Node fetch is used.

## Verification and remaining live check

84 automated tests pass, including full games, detached snapshots, restricted output, bounded memory/adaptation, mocked structured API calls, invalid-output fallback and stale replies after Restart. Build and browser settings checks pass. No API key/model is configured in the current process, so a real provider response has NOT been verified. Local adaptive mode is playable now; live model latency, availability and tactical quality require the configuration above and a follow-up playtest.

## Codex-plan development provider (current default)

`npm run opponent-server` now defaults to `OPPONENT_PROVIDER=codex`. It invokes the installed Codex CLI with your existing ChatGPT login, model `gpt-5.6-luna`, low reasoning effort, ephemeral sessions, an isolated temporary directory and read-only sandbox. User configuration is excluded, the model is instructed not to use tools, and the output is restricted to the same choice schema. No authentication files are read or copied by the game. Each decision consumes Codex allowance; this is a private local development workflow, not an API entitlement or a public backend.

A live Codex smoke test returned a valid choice in about 5.8 seconds. CLI requests have a 25-second limit; the browser deadline is 30 seconds. The direct API provider retains its five-second deadline. Startup/model latency may be visible at each opponent contact. Do not expose this server to other users.

For the later direct API switch, set `OPPONENT_PROVIDER=api`, `OPENAI_API_KEY=...`, and optionally `OPENAI_MODEL` in `.env.local`, then restart the opponent server. API and Codex defaults are GPT-5.6 Luna; no automatic switch to API billing occurs. Override CLI binary with `CODEX_BINARY` if it is not on PATH. The API default model remains overrideable.

Official references: [Codex authentication](https://learn.chatgpt.com/docs/auth), [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna). 86 tests and build pass; direct Responses API billing path remains mock-tested only.
