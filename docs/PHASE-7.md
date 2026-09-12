# Phase 7 — Voice input increment

Implemented in full game and pattern practice. Browser microphone playtesting remains open; this is not a claim that recognition accuracy or end-to-end latency has passed a live rally test.

## Using it

- Tap **Speak** for one command. A final transcript immediately enters the same validated shot pipeline as text. Interim transcripts never submit.
- Enable **Hands-free** to listen at each home decision and point end. A command can be retried at the same contact. Speech service errors or silence require tapping Speak again; there is no automatic error/retry loop.
- **Voice view** keeps the court, score, transcript, microphone controls, and an always-visible **Show menus** exit. Escape stops listening, disables hands-free, and restores menus.
- “Him”, “her”, “his”, and “them” use the visible Jules/Rio selector. Naming a player overrides this selection. These words do not infer player gender.
- Say “next point” / “next variation”, “pause”, “resume”, “show menus”, “voice mode”, or “stop listening”. Next point requires a completed point; after game completion it starts a new game.
- Opening settings, Player Design, more options, replay, another game mode, or hiding the page stops listening and disables hands-free.

## Shot commands

“Drive middle”, “drop crosscourt”, “jam him”, “reset”, “hard drive at her right hip”, and “pull him wide and keep it soft” resolve locally, without an LLM round trip. The last phrase maps to a soft wide dink; exact player-relative placement and hip height remain the existing targeting approximation. Other wording uses the existing command provider and timeout. Invalid contacts explain the problem without substituting a shot. Spoken shots retain `source: voice` in history.

The displayed timing measures final transcript → interpretation/play, not time spent recognizing speech. Device recognition and provider latency still require measurement.

## Partner instructions

“Finn, target her backhand”, “crash when I drive”, and “stop speeding up at him” change Finn’s future recommendations and movement. They do not submit a home shot or enable Finn auto-play. If the user has separately enabled auto-play, it follows the recommendations. Instructions apply when the next contact is prepared and survive new points and games in the current session; “clear instructions” removes them.

- Backhand targeting uses the same legal intent/target resolver as custom shots; soft player-relative landing remains an approximation.
- Stop speeding up currently favors an available soft family across Finn’s play. It is a conservative preference, not a hard target-specific ban; if no soft family is legal, Finn keeps a legal recommendation.
- Crash raises Finn’s approach tendency on your drives. Movement remains limited by skill, flight duration, and court rules.
- Manual shot choices remain available.

## Recognition and verification

The browser adapter feature-detects `SpeechRecognition` / `webkitSpeechRecognition`. It requests microphone access only after Speak or Hands-free is enabled. Browser recognition may send audio to its provider; help text discloses this. No microphone authorization is saved by the game. Unsupported browsers retain typed input. Denied permission, missing microphone, silence, service errors, cancelled sessions, duplicate results, and late transcripts have explicit handling.

Reference: [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). Browser availability and whether recognition uses a remote service vary.

Eleven automated tests cover recognition events, cancellation, original-contact capture, local roadmap commands, partner/control routing, voice source, invalid shots, persistent/clearable partner instructions, recommendation changes, and bounded crash movement. Browser UI checks verified the rendered controls, compact court view, and menu exit. No live microphone recording was performed during implementation.

Remaining acceptance gates:

- 41: microphone permission, accurate transcription, and spoken-shot execution on the user's chosen browser/device.
- 42: timed live rally playtest including no-speech recovery, background noise, local commands, and LLM wording. Tune against measured results.
- 46: a whole game using voice view and hands-free, including partner contacts, invalid commands, pauses, and next-point transitions.

Verification snapshot: production build passes; all 11 voice tests pass. The broader run completed with 138/140 passing, with “Invalid or disconnected flight legs” in full-game termination and player-design restart tests. Spin/trajectory files and their tests were being edited concurrently; those failures remain outside this voice increment and the full suite is not claimed green.
