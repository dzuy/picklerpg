# PickleBash UI design system

The approved direction is **Daylight Arcade**: warm cream, white cards, deep teal text, pink primary actions with white labels, pink social accents, and cyan navigation. The supplied design-system markdown is the starting palette; the moodboard informs energy and friendliness. Preserve the current logo.

This replaces the earlier [neon arena guide](archive/STYLE-GUIDE-NEON.md) for application UI. Character art, models, outfits, court materials, and gameplay remain unchanged. Marketing artwork and the legacy asset pack are not automatically recolored.

## Court thumbnails

All new and revised court-selection thumbnails must match the approved illustration family:

- Use a straight-on view from behind the near baseline, centered along the length of the court. The court must be a symmetrical four-sided trapezoid in perspective, with a wider near baseline and narrower far baseline.
- Keep both baselines, the net, and kitchen lines horizontal. Keep the service centerline vertical and centered; sidelines converge symmetrically toward the background. No three-quarter, isometric, diagonally rotated, or top-down courts.
- Use flat, stylized SVG artwork with simple geometric scenery, restrained shading, and the court's recognizable colors. Place themed details around and behind the court while keeping the playing lines readable.
- For new assets, use a `640 320` viewBox. Use the centered court geometry in [Skyline](../public/images/city-court.svg), [Winter Wonderland](../public/images/winter-wonderland.svg), or [Autumn Park](../public/images/autumn-park.svg) as a starting point, changing the palette and scenery rather than inventing a new viewing angle.
- The perspective references are [La Fortuna](../public/images/jungle-court.svg), [Glowball](../public/images/glowball-court.svg), [Arizona Desert](../public/images/arizona-desert.svg), and [The Beach](../public/images/venice-sunset.svg). Their existing framing remains approved.
- Verify new thumbnails beside the existing set and at the selector's actual crop (`240 × 108` desktop and `220 × 108` mobile, using `object-fit: cover`). The court, net, and theme must remain recognizable at that size.

This rule governs thumbnail artwork; it does not change the interactive 3D camera or gameplay geometry.

## Source of truth

Edit [tokens.css](../src/design-system/tokens.css). This is the single editable palette for product UI. [components.css](../src/design-system/components.css) defines reusable controls; existing feature styles consume the same semantic roles. [page-theme.css](../src/page-theme.css) loads both for every route. Do not create another per-feature palette.

| Purpose | Token | Initial value |
| --- | --- | --- |
| Page canvas | `--pb-bg` | Warm Cream `#FFF9EF` |
| Cards and menus | `--pb-surface` | White `#FFFFFF` |
| Primary text | `--pb-text` | Deep Teal `#123F56` |
| Secondary text | `--pb-text-secondary` | `#3B6D7C` |
| Primary action | `--pb-primary` | Action Pink `#D92364` |
| Social accent | `--pb-social` | Bash Pink `#FF3D7A` |
| Information/navigation | `--pb-info` | Court Cyan `#14CFE8` |
| Positive state | `--pb-success` | Mint Pop `#70E5C2` |
| Pending state | `--pb-warning` | Sunshine `#FFD45C` |
| Destructive/error | `--pb-danger` | `#BB2645` |

Primitive brand swatches feed semantic roles. Components use semantic roles: `--pb-primary`, not `--pb-lime`. A different brand can therefore change the primary action independently from other uses of lime. Palette replacement includes foreground, background, hover, focus, and status pairs; it is not simply replacing six hex values.

For text on pale surfaces use the `*-ink` variants. Bright pink/cyan/mint are not normal-size text colors. Social buttons use a dark foreground because white on the reference pink does not provide sufficient normal-text contrast. Metadata also uses a darker accessible variant of the starter's soft slate. Use `--pb-border-strong` for control boundaries that need to be visually identifiable; soft borders are for grouping.

## Components and states

- **Primary:** pink, white text, fully rounded pill corners. Play, start, accept, continue, and save.
- **Social:** pink or blush with a readable foreground. Invitations, friends, and rematches.
- **Secondary:** white or pale blue, teal text, subtle outline. Back, cancel, inspect, edit.
- **Destructive:** danger text or danger fill with white text; never use social pink as the error role.
- **Navigation:** light surface, a filled primary-pink icon for the active destination, outlined inactive icons, and readable teal labels. Retain existing links and destinations.
- **Inputs:** white/pale surface, dark text, visible boundary, separate focus outline. Preserve native input and dialog behavior.
- **Cards:** white, 20px radius, soft tinted border and shadow. Decorative player accents remain separate from text contrast.
- **HUD:** compact white scoreboard; settings, replay, and reactions use white SVG icons without background containers; home/away accents have their own semantic roles. Retain service dots, labels, disabled states, and all existing interactions.
- **Skill summary:** DUPR uses royal blue (`--pb-royal`), white text, and 8px corners. Creator meters use primary pink for Power, cyan for Control, lime for Speed, lavender for Hands, and mint for Defense. Defense groups Return and Reset; Control groups Drop and Dink. These summaries do not change stored skill values or the rating formula.
- **Typography:** DM Sans body and controls; Manrope headings. The existing logo keeps its expressive display lettering. Doodle copy and fixed artwork can retain their own type.
- **Motion:** short existing transitions; respect reduced motion. Do not introduce animation that blocks input.

Shared examples use `.pb-button` with `--primary`, `--social`, and `--danger` modifiers, `.pb-input`, `.pb-card`, and `.pb-tag`. Feature components keep their existing selectors and layouts while consuming the same tokens. Do not replace meaningful buttons with clickable decoration.

## Internal preview and iteration

Run `npm run dev` and open `/design-system.html`. The preview is a separate development page, not a player-facing setting or a production build entry. It includes shared controls, disabled states, keyboard focus, status tags, HUD SVGs, and an embedded real app at phone or available width.

Name a palette and use **Save as new style** to keep a separate version. Select a saved style to load it, edit it, then choose **Update saved style** to revise its colors or name. Saved palettes live in `art/design-system/styles.json`, survive reloads/server restarts, and can be committed with the project. Duplicate names are rejected instead of silently overwriting another palette.

**Use in app** applies the selected saved palette to the canonical CSS tokens and matching browser/PWA canvas metadata. Save pending edits first; applying is disabled for unsaved changes. Updating a saved style does not silently reapply it. The production app receives the chosen palette on its next build/deployment. The initial library includes Original Daylight and the user's captured Hot Pink experiment (`#FF2E77` primary).

Unsaved palette/name edits are recovered from this browser's local storage after refresh. **Revert to saved style** discards the draft. **Show CSS changes** remains available for inspection. The save/apply API exists only on the localhost Vite development server; it is absent from production. The internal preview can interact normally with the embedded game, but palette controls never alter player data.

Colors are saved and applied exactly as chosen. Contrast checking reports advisory notes without darkening or rejecting intentional brand colors. Named styles currently contain all exposed palette controls; component geometry and typography continue to use the shared system.

After edits:

1. Run `npm run check:design` for missing/circular tokens and advisory contrast checks.
2. Inspect start, Open Play, roster/editor, settings, setup, gameplay, and result/dialog states at mobile and desktop sizes.
3. Inspect actual screenshots: automated token checks cannot prove contrast over every image or overlapping surface.
4. Run the production build and relevant existing regression tests when markup changes.
5. Record accepted changes here. Update shared roles before adding exceptions.

## Explicit boundaries and exceptions

- Player color data, swatches, model geometry, materials, lighting, animations, and court/environment palettes are outside this UI theme.
- Existing logo, start-screen illustration, player illustrations, and decorative asset-pack graphics have baked colors. They remain fixed assets; do not use CSS filters to simulate recoloring.
- Start menu and Start Match buttons, team heading text, scoreboard, and HUD control frames are now themeable instead of baked control images.
- CSS mask colors define transparency, not brand color; keep them independent.
- `public/assets/picklebash-select/design-tokens.json` is historical asset-pack metadata, not a runtime theme. Do not copy its neon palette into new components.
- Browser/PWA launch colors must match `--pb-bg`. **Use in app** updates these static metadata values in `index.html` and `public/manifest.webmanifest` automatically; manual canvas edits must keep them in sync.

## Change log

- September 29, 2026: Player Creator Appearance/Skills tabs match Play with a primary pink sliding highlight, keyboard tab navigation, and reduced-motion support. Paid appearance groups show a Premium badge beside their pack name.

- September 29, 2026: single-choice dropdowns use a shared 40px height, compact vertical padding, and a text-colored chevron inset 15px from the right edge. Native selection and forced-color controls remain available. Game Settings uses smaller gaps between the court heading, thumbnails, Theme, and scoring fields.

- September 2026: adopted the markdown Daylight palette for UI; superseded the dark cobalt guide; centralized UI tokens, replaced raster control treatments, and added an internal preview and contrast/token check. Character and court restyling explicitly deferred.

- September 21, 2026: primary action buttons changed to pink with white labels; use `--pb-primary` / `--pb-on-primary`. Action pink is slightly deeper than the decorative Bash Pink to meet normal-text contrast. Lime ball illustrations and selection accents stay independent.

- September 21, 2026: all standard action buttons use fully rounded pills through `--pb-radius-button`; cards and inputs retain separate shape tokens. Circular icon buttons remain circular.

- September 21, 2026: added project-backed named styles, save/update/load, local draft recovery, and explicit Use in app. Preserved the user’s current Hot Pink palette without changing its colors.

- September 23, 2026: Open Play reuses the forest court-selection artwork in a white empty-state card, with a compact pink Create a game pill and responsive image/text layout. Removed the decorative paddle and schematic court drawings.

### PickleBash+ customization preparation

Hair, facial hair, expressions, hats, tops, bottoms, glasses, accessories, and paddles now have separate horizontally scrolling Standard (free) and PickleBash+ (premium) rows inside each category card. Explicit item assignments live in `src/player-customization-tiers.ts`. Free hair options are None (first), Ponytail, Short, Bob, and Spiky; all remaining hair options are premium. Free expressions are Happy (default), Serious, and Determined; Angry, Crying, and Confident are premium. Free glasses are None (first), Square, Round, and Oval; Sport wraparound, Cat eye, and Hexagon are premium. Sunglasses and Sport shades are excluded from the picker and appearance shuffle; existing saved appearances remain supported. Free hats are None (first), Cap, Cap back, Visor, and Headband; other hats are premium. Beanie and Bucket remain excluded from the picker and shuffle. Free paddles are Squarish, Squarish stripes, Rounded, and Rounded stripes; other paddle styles are premium. Rectangular and Circular remain hidden. Other categories keep “None” and default appearance items standard. All existing color palettes and custom color controls stay shared and free. This content-organization pass keeps both tiers selectable; premium visual treatment and subscription enforcement are a later step.

Premium headwear includes Viking hat, Cowboy hat, Santa hat, and Large sombrero, built as bone-attached 3D accessories. Their main material uses the existing free Hat Color palette, with fixed decorative trim; wide hat thumbnails use a wider camera framing.

The premium Dinosaur tail accessory attaches to the pelvis and curves outward for visibility in the editor. Accessories Color controls the tail, with lighter matching spikes and a dedicated rear-angle thumbnail.

Free facial hair options are None (first), Mustache, and Short beard; Goatee, Long beard, and Chops are premium. Facial Hair Color remains free.

Premium glasses include Stars, Flowers, Hearts, Diamonds, and Large oversized frames with matching lens shapes. They use the existing free frame/lens colors and translucency controls. Glasses thumbnails use wider framing to show the complete frames.

### Full-body Outfits

Outfits follows Accessories in the editor. Frog, Dinosaur, Lion, Bear, Butterfly, and Bee are all PickleBash+ costumes; None removes the costume without requiring premium access. Each open-face suit replaces visible hair, hats, tops, bottoms, shoes, socks, and accessories with rig-attached costume parts while preserving saved selections. Expressions, glasses, facial hair, and paddles stay available. Each outfit starts with a recognizable default color and supports the shared free Outfit Color palette with Custom Color first. Costumes and their colors persist in saved players, with older records defaulting to no outfit. As with the other premium categories, subscription locking remains a later step.

Toucan has been retired; saved Toucan selections normalize to None. Bee wings project farther behind the suit, and both insect suits have a gentle three-second wing flap. The editor keeps the wings moving while the character pose is still, respecting reduced-motion preferences. Dinosaur head spikes are smaller and seated within the hood.

The crown has raised multicolor faceted jewels around its band. Cape is a premium accessory attached at the shoulders, with folded cloth and a rear-view thumbnail. It uses the existing free Accessories Color control and is hidden while a full-body outfit is worn.

Tiara is premium headwear with an open-backed band, five jewel arches, colored faceted stones, and pearl tips. Its band uses the existing free Hat Color control.

### Player collection cards

The character editor exports a 1080 × 1350 neon collectible card matching the supplied September 29 reference. This fixed marketing artwork is an explicit exception to the Daylight application palette: `--pb-collectible-*` tokens define deep navy, electric cyan, hot pink, lime, lavender and mint. The dialog itself retains standard UI tokens. Cards use a generated tropical court background, the unchanged PickleBash logo, a large real equipped character cutout, a shaded perforated ball with recessed holes and tapered glowing motion ribbons, a beveled foil frame, a lower nameplate, and ten-segment glowing skill meters. Keep live player names and all numbers out of baked artwork. Fit wide accessories within the illustration; scale long names to fit. The DUPR badge is temporarily omitted from card exports. The footer preserves `picklebash.app`. See [player card behavior](PLAYER-CARDS.md).