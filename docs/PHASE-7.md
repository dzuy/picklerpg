# Phase 7 — Voice input

Local Whisper is now the default in full game and pattern practice, including the in-app browser. It uses microphone PCM capture and a background WASM worker, independent of the browser’s SpeechRecognition service. No API key is required. The model and runtime download on first use and are cached when browser storage permits. Microphone audio stays on the device; the resulting text still uses the existing local/LLM command parser.

## Using it

- Tap the microphone icon beside **Call your shot**, wait for **Listening**, say one command, and pause briefly. Recording ends automatically and the final transcript enters the validated shot pipeline. A second tap can also finish early. “Listening…” and a microphone level meter appear during capture. Three thinking dots appear during transcription and command interpretation.
- While listening, tapping the active microphone icon finishes and submits the recording. Escape cancels it. While preparing or transcribing, the icon cancels that operation. Escape also disables hands-free and restores menus.
- Enable **Hands-free** to listen at each home decision and point end. Recognition errors disable it and require an explicit retry.
- **Voice view** is in Settings. It keeps the court, score, transcript, and microphone controls; use Settings → **Show menus** or Escape to return.
- “Him”, “her”, “his”, and “them” use the visible Jules/Rio selector. Naming a player overrides this selection. These words do not infer player gender.
- Say “next point” / “next variation”, “pause”, “resume”, “show menus”, “voice mode”, or “stop listening”. Next point requires a completed point; after game completion it starts a new game.
- Opening settings, Player Design, more options, replay, another game mode, or hiding the page stops listening and disables hands-free.
- The optional **Browser speech service** is under Voice help. The in-app browser previously opened the microphone but returned a speech-service `network` error. Chrome worked in the user's test but misheard “serve flat” as “sir flat”. Local Whisper avoids that service dependency.

Capture starts immediately while the model loads in parallel, so early speech is retained. The microphone uses one steady active highlight. Thinking dots respect reduced-motion preferences. Quiet-input detection is more sensitive, and manual finish supports short commands. Local capture ends after about 0.9 seconds of silence following speech, waits up to 6 seconds for initial speech, and caps a recording at 12 seconds. Quiet input or background voices can affect silence detection. Model downloads and inference have bounded timeouts. Cancellation releases audio resources and ignores late results, including a microphone permission prompt resolving after cancellation.

## Shot commands

“Serve flat”, “drive middle”, “drop crosscourt”, “jam him”, “reset”, “hard drive at her right hip”, and “pull him wide and keep it soft” resolve locally without an LLM round trip. The last phrase maps to a soft wide dink; exact player-relative placement and hip height remain targeting approximations.

“Sir flat” and “surf flat” are narrowly corrected to “serve flat”. Corrections apply only to a misheard leading serve word followed by known shot vocabulary. Other unrelated uses of “sir” are preserved. The original transcript and normalized command appear in feedback when they differ. Flat serve explicitly selects flat shape, including in the typed custom-command path.

Other wording uses the existing command provider and timeout. Invalid contacts explain the problem without substituting a shot. Spoken shots retain `source: voice` in history. Transcripts, per-shot timings, and intermediate interpretation messages are omitted from the play UI. Failed commands remain editable with one error message. Regular, normal, standard, basic, plain, and default serves execute locally without the command provider.

## Partner instructions

“Finn, target her backhand”, “crash when I drive”, and “stop speeding up at him” change Finn’s future recommendations and movement. They do not submit a home shot or enable Finn auto-play. If the user separately enabled auto-play, it follows the recommendations. Instructions apply when the next contact is prepared and survive new points and games in the current session; “clear instructions” removes them.

- Backhand targeting uses the same legal intent/target resolver as custom shots; soft player-relative landing remains an approximation.
- Stop speeding up favors an available soft family across Finn’s play. It is a conservative preference, not a hard target-specific ban; if no soft family is legal, Finn keeps a legal recommendation.
- Crash raises Finn’s approach tendency on your drives. Movement remains limited by skill, flight duration, and court rules.
- Manual shot choices remain available.

## Verification and remaining gates

- Production build and all 170 automated tests pass. These include voice/capture tests covering cancellation, late permission, silence, final-result delivery, source/validation, command corrections, partner instructions, and movement limits.
- The actual in-app worker transcribed the synthetic “Serve flat” audio fixture correctly and produced the expected normalized command. Cached model initialization plus inference took about 7.4 seconds; a warm run took about 4.6 seconds on this machine. These are single development samples, not latency guarantees.
- The game’s microphone capture reached local transcription in the in-app browser; the microphone was stopped afterward. User voice accuracy and full-game flow still need playtesting.
- Reproduce the browser fixture with the dev server at `/tests/voice-browser.html`. The synthetic WAV is in `tests/fixtures`; neither is included in the production build. The fixture avoids recording the developer during verification.
- Dependency audit is clean. Overrides patch unused Node-side image/archive dependencies pulled in by Transformers.js. The browser bundle uses its web runtime.

**42 remains open:** measured end-to-end latency, noise tolerance, and local/LLM command flow need a rally playtest and further performance tuning.

**46 remains open:** complete a whole game in voice view with hands-free, partner contacts, invalid commands, pauses, and next-point transitions.

## Implementation references

Local ASR uses [Transformers.js speech recognition](https://huggingface.co/docs/transformers.js/en/api/pipelines) with `Xenova/whisper-tiny.en`, q8 weights, and single-threaded WASM for embedded-browser compatibility. Basic graph optimization avoids the [ORT quantized-Whisper optimizer regression](https://github.com/microsoft/onnxruntime/issues/28306). The optional browser adapter follows [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), whose service availability varies by browser.

Microphone interaction regression: the real in-app AudioWorklet captured the synthetic “Serve flat” stream, manual finish submitted it to local Whisper, and the resulting voice intent started a flat serve (`phase: flight`). This exercises capture → finish → transcription → validated shot, rather than only testing an audio file against the model.

Hands-free sits below Call your shot. A short chime plays when recording starts, including each hands-free contact after the user enables audio. The Voice help card is removed; transcription and pronoun-target preferences live in Settings.

Local transcription streams decoded words into Call your shot before the final transcript. Browser speech interim results use the same preview callback. Partial words never submit a shot, and cancelled or stale contacts ignore them. Local Whisper still begins inference after the recording ends; streaming reduces the wait for visible text, not model loading or audio encoding time.

Tiny trial (2026-09-12): switched the default local model to whisper-tiny.en, keeping the 0.9-second silence threshold unchanged. The synthetic “Serve flat” capture-to-shot test passed in the Codex browser with partial text delivery: 7.92 seconds on initialization and 3.26 seconds with the model already loaded, including audio playback and silence detection. These single-fixture measurements do not establish general recognition accuracy or a controlled speed comparison with Base. Production build passed.

High-contact drive commands now defer automatically during a rally: an unbounced ball follows the existing wait/bounce/rebound animation before the drive, while an already-bounced ball drops to a lower contact without a second bounce. Delayed drives use reduced execution balance (0.7), lowering quality and increasing dispersion, with “Delayed drive” in execution feedback. Target, pace, spin, and input source are preserved; serve/return opening restrictions remain in force.

Lob loft modifiers: “lob high” requests 4 m net clearance; “lob super high”, “very high lob”, and equivalent intensifiers request 7 m. These gameplay settings raise the arc and extend hang time. Higher loft also increases depth dispersion and reduces execution quality, giving the same intended landing target a greater chance of going long. The command schema exposes optional loft for LLM interpretation; ordinary lob behavior remains the default. A seeded 400-shot comparison verifies increased long-ball risk.

The same loft modifiers also apply to lob serves, including “super high lob serve” and “serve really high”. They preserve serve targeting and opening validation while adding height, hang time, and depth-control risk. Ordinary lob serves retain their existing 2.5 m clearance.

“Smash” is a local synonym with distinct defaults: a fast overhead aimed at open court. It requires an overhead-height contact; low dink and reset contacts still explain that a higher ball is required rather than converting the call into a physically different shot.

Point-result regression: execution dispersion can no longer leave a shot on the hitter's side and classify its subsequent bounces as an unreturned winner. A sampled endpoint that fails to cross the net plane is a fault for the hitter. Double-bounce results are tested to ensure both bounces occur on the receiving side and the hitting team receives the rally result.

Directional placement: “dink far left” and “dink far right” parse locally into explicit sideline zones at kitchen depth, with a 0.25 m intended sideline margin. These use the fixed court left/right convention and do not follow opponent positions or switch sides with the hitter’s contact. Execution error still applies.

ATP: “ATP”, “A T P”, and “around the post” parse locally into a drive with the optional atp technique. The intended path is low and straight outside the post toward the same-side deep corner. Both wide-contact and net-plane clearance checks apply; inside or blocked angles are rejected rather than redirected over the net. Drive skill and ordinary execution errors still apply, and opponents can return the shot. The technique is preserved in structured intent and replay.

ATP execution uses the lower of the hitter's drive and hands ratings because the shot needs both pace and precise timing. Its ATP-specific failure curve makes ordinary 70-rated players miss most attempts, while ratings above 90 improve the odds. Even a 100-rated player retains roughly a one-in-three baseline failure chance. Failed attempts are marked as mishits and sent wide; successful attempts still receive ordinary contact, balance, and dispersion errors.

Reception timing: after the required serve and return bounces, every playable opponent shot pauses exactly at the net plane. That single pause shows complete moves such as **Volley · before bounce** and **Dink · after bounce**. Selecting one resumes the ball and executes it automatically at contact, so there is no second shot menu. The custom shot input follows the same queued path: a typed or spoken call selects its contact branch and executes when the ball reaches it. Shoulder/head-high contacts qualify as overheads from 1.45 m, and airborne reach keeps the receiver's feet legally outside the kitchen while allowing a normal reach over the line.
