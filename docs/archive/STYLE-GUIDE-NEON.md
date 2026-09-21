# PickleBash style guide

Status: foundation for product and future marketing content. Color direction agreed September 15, 2026; typography, logo rules, and marketing templates still need a dedicated pass.

## Core direction

Cobalt-to-indigo gradients with neon cyan, lime/electric yellow, and hot pink accents. The feel is energetic, playful, and competitive, inspired by a floodlit pickleball arena and collectible character cards.

Use this as the default for new design work. Build depth with saturated blue gradients rather than flat, greenish teal-navy panels. Keep neon selective: it should highlight actions and moments, not compete with every other element.

## Palette and roles

The exact accent values below are a starting palette drawn from the current product, not a claim that every existing screen has already been standardized.

| Role | Color | Use |
| --- | --- | --- |
| Cobalt | `#0848C4` | Bright areas of the page gradient |
| Deep blue | `#082270` | Page base and gradient edges |
| Indigo shadow | `#06194F` | Darkest page areas |
| Panel blue | `#10265F` | Darker surfaces over the page |
| Panel edge | `#4264A4` | Subtle borders and separators |
| Neon cyan | `#12E1F3` | Links, focus, secondary emphasis, light effects |
| Lime / electric yellow | `#D1EF62` | Primary calls to action, readiness, positive highlights |
| Hot pink | `#FF3D7D` | Opponents, competition, occasional visual highlights |
| Cool white | `#EDF5FF` | Primary text |
| Pale blue | `#D0E1F5` | Secondary text |

Pink is a competitive accent, not inherently an error color. Pair status colors with text or icons; never make color the only way to understand state.

## Gradients

The product source of truth is [src/page-theme.css](../src/page-theme.css). Reuse its tokens instead of duplicating gradient definitions across screens.

Page canvas:

```css
radial-gradient(ellipse at 85% 12%, #00c8ff55, transparent 46%),
radial-gradient(ellipse at 8% 52%, #087dff70, transparent 55%),
linear-gradient(160deg, #082270 0%, #0848c4 43%, #062d91 72%, #06194f 100%)
```

Panel surface:

```css
linear-gradient(145deg, #183982 0%, #10265f 58%, #0b1b49 100%)
```

For design tools, use the same color stops and visually match the direction; gradient angle conventions can differ from CSS. Place broad cyan-blue glows above the base gradient. Panels should stay darker than the surrounding page, with cool blue borders. Preserve clear hover, selected, and keyboard-focus states.

## Product treatments

- Use the shared page gradient on page canvases and major drawers. Keep the actual game court's environment artwork separate.
- Use darker cobalt/indigo surfaces for cards, setup panels, and controls. Avoid returning to flat greenish slate/teal backgrounds.
- Keep primary action buttons lime with dark text. Use cyan for supporting emphasis and pink sparingly.
- Character art can use vivid diagonal streaks, colored glows, and accent borders. Keep those decorations behind the character.
- Catchphrases belong in small, readable speech bubbles within the hero artwork, clear of faces. Allow natural wrapping; do not split words or force long phrases into oversized rotated text.
- Character portraits may use varied ready and low swing poses. Animation should respect reduced-motion preferences and avoid arms intersecting the torso or oversized head.

## Graphic motifs: streaks and halftone dots

Approved direction: sharp, irregular diagonal streaks paired with dotted/halftone textures. These should feel exciting, energetic, and playful, like motion marks on a sports poster.

- **Streaks:** tapered, angular slashes with slightly broken or brush-like edges. Use neon cyan, lime/electric yellow, and hot pink over the blue foundation. Vary length and width instead of making uniform stripes.
- **Halftone dots:** clusters of repeated dots that change in size, density, or opacity and fade into the background. Use brighter blue/cyan for texture; occasional neon accents can echo nearby streaks.
- **Placement:** favor corners, outer edges, and behind character art. Let the marks point toward the main subject, with calmer space around text and controls.
- **Layering:** blue gradient first, quieter dotted texture next, then a few stronger streaks. Keep characters, headlines, and calls to action visually dominant.
- **Restraint:** use motifs as framing and emphasis, not a dense pattern across every surface. At small sizes, simplify the dots and streaks rather than crowding the layout.
- **Motion:** these patterns can communicate energy while static. Animation is optional; avoid flashing effects and respect reduced-motion preferences.

Use this vocabulary in future product decoration and marketing templates. This records the visual direction; it does not mean every existing page needs decorative patterns added immediately.

## Applying this to marketing

Carry the same blue foundation and accent hierarchy into social graphics, landing pages, promotional banners, and presentation material. Start with a cobalt/indigo field, establish one main character or message, then add a restrained cyan, lime, or pink highlight.

Diagonal streaks and arena-like lighting can add movement. Leave quieter space behind headlines and calls to action. Do not place essential text directly over busy streaks, bright glows, or detailed character art. Use cool white text or a contrasting text panel and check legibility at the final display size.

The visual reference establishes palette and energy; it does not require every asset to include a stadium, palm trees, lightning, or the same composition. Screenshots used in marketing should retain the product's real colors and behavior.

For web assets, check contrast in the actual composition: target WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Neon colors are accents, not a substitute for readable text. Check mobile crops as well as desktop layouts.

## Still to define

- Approved logo variants, clear space, minimum sizes, and placement.
- Display and body typography, licensing, and size hierarchy.
- Brand voice, headline examples, and catchphrase guidance.
- Social, launch announcement, feature highlight, and presentation templates.
- Export dimensions, safe areas, and print color conversions.
- A consolidated set of accent tokens and any semantic success/warning/error colors.

Keep these items open rather than treating the current prototype's mixed fonts and assets as final brand standards.
