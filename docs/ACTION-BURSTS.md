# Comic action bursts

`ActionBurst` in `src/action-burst.ts` draws an SVG overlay in the game's pink, lime, cyan and teal palette. Import `src/action-burst.css` at the view entry point. The host must be positioned (for example, `position: relative`). Create one instance per independently visible burst and dispose it when removing the host.

Call `render({text, age, x, y, tone, reduced, visible})` each frame. Coordinates are pixels relative to the host; project a world-space impact point through the camera first. `age` is seconds since the event, so replay seeks and pauses work without timers. Text is inserted with `textContent`. Tones are `pink` (default), `cyan`, and `lime`; duration defaults to 1.25 seconds. Call `clear()` when skipping or cancelling an event.

The bodybag reaction uses `BAGGED!`. Future events can use the same component with `SMASH!` for an overhead or `SKY HIGH!` for a lob. Those triggers are not enabled yet; each should fire once at its chosen gameplay moment rather than on every frame of a shot.

The body-hit animation lab at `/tests/browser/body-hit.html` uses the same component as gameplay. Scrub the first 1.25 seconds to inspect the pop and fade. Reduced motion keeps the label still.
