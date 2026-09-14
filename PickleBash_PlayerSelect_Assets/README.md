# PickleBash Player Select Asset Pack

This pack separates the artwork from the UI so the screen can be implemented responsively instead of as a fixed image.

## Folder contents

- `brand/picklebash-logo.png`
  - Transparent PickleBash logo.
- `players/*-card-art.jpg`
  - Character artwork to use inside responsive player-card components.
- `locations/*.jpg`
  - Location artwork.
- `decor/*.svg`
  - Scalable neon paint strokes and VS burst accents.
- `reference/player-select-mobile-reference.png`
  - Mobile visual reference.
- `reference/player-select-desktop-reference.png`
  - Desktop visual reference.
- `ui-reference/start-match-button-reference.png`
  - Visual reference only. Rebuild the CTA in CSS/HTML.
- `design-tokens.json`
  - Suggested PickleBash colors, radii, type stacks, and effects.
- `PROMPT_FOR_CODEX.md`
  - Copy/paste this into Codex after adding the folder to the project.

## Important implementation rule

The references are NOT production backgrounds.
Use the individual assets and recreate the interface as components.

Text, cards, team banners, selectors, arrows, selection states, VS, and Start Match button should remain responsive HTML/CSS.

## Current prototype roster

- Ema — All-Around — DUPR 3.99
- Leo — Banger — DUPR 3.36
- Maya — Net Specialist — DUPR 3.90
- Jax — Grinder — DUPR 4.05

Current location: The Forest.
The Beach and The Mountaintop are future locked locations.
