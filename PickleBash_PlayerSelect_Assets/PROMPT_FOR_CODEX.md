# Build the responsive PickleBash Player + Court Select screen

Use the assets in this folder and the two reference screenshots in `/reference/` as the visual target.

## Non-negotiable
Do NOT implement the page as one large screenshot/background image.
Build the actual interface as responsive HTML/CSS/components so it works cleanly on phones, tablets, laptops, and wide desktop screens.

The raster assets are for branding and character/location artwork only.
All labels, player data, borders, selection states, arrows, team banners, VS treatment, buttons, and layout must be real UI.

## Product behavior
This is the pre-match setup screen for PickleBash, a pickleball strategy game.

There are four player slots:
- Slot 1 = the current user's player and is fixed. Label it `YOU` or `P1 SELECTED`.
- Slot 2 = user's partner.
- Slots 3 and 4 = opponents.
- The other three players are initially randomized from the roster, excluding the user's player.
- Each of those three slots must have previous/next controls and should also support horizontal swipe on touch devices.
- Never allow the same player to occupy two slots.
- Each card shows only:
  - player name
  - player type / archetype
  - DUPR
- Do NOT put skill bars on this screen.

Use this initial data:
```js
[
  { id: "ema", name: "Ema", type: "All-Around", dupr: 3.99, team: "A", art: "/assets/players/ema-card-art.jpg" },
  { id: "leo", name: "Leo", type: "Banger", dupr: 3.36, team: "A", art: "/assets/players/leo-card-art.jpg" },
  { id: "maya", name: "Maya", type: "Net Specialist", dupr: 3.90, team: "B", art: "/assets/players/maya-card-art.jpg" },
  { id: "jax", name: "Jax", type: "Grinder", dupr: 4.05, team: "B", art: "/assets/players/jax-card-art.jpg" }
]
```

The current user is Ema for this prototype.

## Court selector
Current playable location:
- The Forest

Future locked locations:
- The Beach
- The Mountaintop

Use:
- `/assets/locations/forest.jpg`
- `/assets/locations/beach.jpg`
- `/assets/locations/mountaintop.jpg`

The Forest should default to selected.
Locked locations should look clearly unavailable but still visually enticing.
Make the location selector horizontally scrollable on mobile and a row on desktop.

## Responsive layout

### Mobile first: under ~700px
Follow the mobile reference closely:
1. Logo at top.
2. `TEAM A` ribbon.
3. Two Team A cards in a two-column row.
4. Large `VS` burst centered below Team A.
5. `TEAM B` ribbon.
6. Two Team B cards in a two-column row.
7. `CHOOSE A LOCATION`.
8. Horizontal location carousel.
9. Large full-width `START MATCH` CTA.
10. Small utility actions at bottom if needed.

Cards should be large enough for the character art to dominate.
The screen should feel like a game lobby, not a web dashboard.

### Tablet: ~700–1023px
Keep the two-team vertical flow, but increase card widths and spacing.
Allow the location cards to show more content at once.

### Desktop: 1024px+
Match the desktop reference:
- Team A group on the left with two cards.
- Team B group on the right with two cards.
- Big VS centered between teams.
- Team labels span above each pair.
- Court selector runs below the matchup.
- Start Match CTA sits prominently at the lower right.
- Max content width around 1500–1650px.
- Keep generous negative space around the main matchup.

## Visual language
The old product UI used too much dark tennis green. Do not use that style.

Use the PickleBash neon arcade identity:
- deep navy background
- cyan / electric blue
- hot pink / coral
- lime
- yellow
- white typography
- energetic diagonal strokes
- angular team ribbons
- subtle halftone / paint textures
- neon edge glow
- bold condensed display type
- clean sans-serif for secondary text

Use `/assets/design-tokens.json` as the base palette.

Decorative SVGs are provided in `/assets/decor/`:
- paint-cyan.svg
- paint-pink.svg
- paint-lime.svg
- paint-yellow.svg
- vs-burst.svg

Use them sparingly as scalable accents. Do not turn the interface into visual noise.

## Player cards
Build real card components.

Each card should contain:
- full-bleed character art occupying roughly 70–78% of card height
- bottom metadata strip
- name: large
- archetype: colored secondary label
- `DUPR` label + score
- optional previous/next buttons for changeable slots
- selected user card gets lime outline/glow and a `YOU` / `P1 SELECTED` badge

Art should use:
```css
object-fit: cover;
object-position: center;
```

Maintain consistent card proportions across breakpoints.
Recommended aspect ratio around 0.78–0.85 width/height on mobile and slightly wider on desktop.

## Interactions and motion
Keep motion quick and game-like:
- hover: 4–6px lift + stronger glow
- selection change: short slide/fade
- VS: very subtle pulse, not constant flashing
- Start Match: slight scale/glow on hover/tap
- swipe transitions on mobile should feel responsive
- respect `prefers-reduced-motion`

## Start Match
Use a large lime CTA inspired by `/assets/ui-reference/start-match-button-reference.png`, but recreate it as HTML/CSS rather than using baked-in button text.

Text: `START MATCH`
Optional chevron icon on the right.

Enable only when:
- all four players are unique
- a playable location is selected

## Background
Do not use the reference screenshot as the page background.
Create the environment with CSS:
- deep navy base
- radial cyan/purple glows
- subtle arena/stadium feeling
- faint court-line geometry
- optional blurred light circles
- dark vignette around edges

The page needs enough contrast for the cards while still feeling like the nighttime PickleBash world.

## Accessibility
- All interactive controls must be real `<button>` elements.
- Player selector arrows need aria-labels.
- Cards need useful alt text.
- Keyboard selection must work.
- Focus states should be visible.
- Do not bake essential information into imagery.

## Asset paths
Assume this folder is copied into the app as `/public/assets/picklebash-select/`.

Use paths like:
`/assets/picklebash-select/brand/picklebash-logo.png`
`/assets/picklebash-select/players/ema-card-art.jpg`
etc.

## Implementation priority
1. Responsive layout
2. Match the visual hierarchy and energy of the references
3. Player cycling behavior
4. Location selection
5. Start Match enabled state
6. Small motion/polish

Do not spend time on backend persistence yet.
Keep player/court data local and componentized so we can wire it to real game state later.
