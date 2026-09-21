# PickleBash application-wide design system plan

Status: UI migration implemented locally; ready for visual review.

## Approved scope (supersedes broader proposals below)

- Start from the supplied markdown palette; internal theme tools only.
- Preserve the current logo and all character models, outfits, saved designs, materials, presets, and rendering.
- Preserve existing court designs and all gameplay, mechanics, flows, and functionality.
- Migrate UI colors, controls, menus, navigation, scoreboard, and cosmetic presentation. Replace raster button labels with native text.
- Use CSS tokens as the UI source of truth. The proposed Three.js theme adapter, character styling, and court styling are deferred and are not part of this implementation.
- Historical proposals below remain for context; the approved scope above takes precedence.

## Intent and reference hierarchy

Create a maintained design system that makes app-wide palette and visual changes predictable across HTML/CSS, Three.js, character presentation, and court environments.

The supplied `PickleBash_Design_System.md` is a starting proposal, not an implementation instruction. The supplied moodboard establishes daylight, social energy, light surfaces, colorful courts, and friendly blocky characters; it is not a literal screen specification. Its colors differ from the markdown palette. Recommendation: use the markdown palette as the initial candidate and the image for art direction, subject to user agreement.

This direction would supersede the cobalt/indigo arena direction in `docs/STYLE-GUIDE.md`. Record that decision explicitly once approved. Do not infer new features or navigation destinations from the moodboard's illustrative screens.

## Findings from the code review

- The app uses TypeScript, Vite, native DOM UI, and Three.js. No framework rewrite is needed.
- `src/page-theme.css` centralizes some blue surfaces, but feature styles and inline templates contain additional colors and accumulated overrides.
- `src/bootstrap.ts` dispatches separate local, multiplayer/Open Play, and challenge entry points. Shared styling must work on direct links as well as normal navigation.
- The start screen in `src/main.ts` uses raster background and button images. CSS tokens cannot accurately recolor their baked artwork or text.
- `public/assets/picklebash-select/design-tokens.json` contains another, older neon palette. It must not remain a competing source of truth.
- Appearance records in `src/player-design.ts` store actual color values. Changing global defaults must not silently overwrite saved players.
- `src/locations.ts` already separates forest, Venice, and Arizona palettes from gameplay geometry. This is a useful starting boundary.
- `src/scene.ts`, `src/athlete-rendering.ts`, and `src/avatar-preview.ts` contain rendering colors. Court and preview renderers use different tone mapping, so matching hex values alone will not ensure matching appearance.
- `index.html` has its own dark loading screen and browser theme color. Initial load, PWA surfaces, and cached assets need coverage too.

This is a source audit, not a completed browser visual audit. Capture current screens and interaction states before migration.

## Proposed system architecture

### One source, multiple consumers

Use a typed, serializable theme definition under `src/design-system/`, with four layers:

1. **Primitives:** raw palette families and shades, font families, spacing, radii, borders, shadows, motion durations, and stacking levels.
2. **Semantic roles:** canvas, surface, elevated surface, primary/secondary/muted text, primary/social/secondary/destructive actions, information/success/warning/error, borders, focus, scrim, and selection.
3. **Component contracts:** buttons, inputs, cards, tabs, navigation, dialogs, drawers, toggles, sliders, tags, toasts, tooltips, player cards, and scoreboards. Map states to semantic roles instead of adding feature-specific colors.
4. **Game presentation:** home/away identification, ball, trajectory, target markers, character staging, outfit presets, court surfaces, court lines, environment accents, and lighting profiles.

Proposed files: `theme-schema.ts`, `themes/daylight.ts`, `css-tokens.ts`, `game-theme.ts`, and `components.css`. Final names can follow existing repository conventions.

Generate CSS custom properties and any static startup styles from that definition; import the same typed values into Three.js adapters. Generated files are never edited independently. Load the selected theme before route initialization to avoid a dark flash. Synchronize document theme metadata and define a safe fallback if loading fails.

A full theme includes readable foreground/background pairs and interaction states. Changing one primary swatch should update every primary action, but a complete palette replacement also needs validated text, surface, status, and gameplay pairings. Do not blindly derive every state by reducing opacity or lightening a color.

Keep DOM/CSS component APIs compatible with the current app. Preserve IDs, event bindings, dialog behavior, and accessible names while replacing presentation.

### What follows a theme

| Area | Theme policy |
| --- | --- |
| UI surfaces, controls, text, borders, decoration | Follow semantic roles across the app |
| Gameplay HUD and markers | Use game-specific roles with readability constraints |
| Character cards and preview stages | Follow theme surfaces, lighting rules, and framing |
| New outfit presets | Use curated theme-compatible combinations |
| Existing saved character colors | Preserve exact selections by default |
| Skin and natural hair colors | Remain an independent inclusive palette |
| Courts | Use named location profiles with shared rendering and contrast rules |
| Logos, painted art, textures, raster illustrations | Use an asset manifest and explicit variants; not automatic CSS recoloring |

Keep social pink separate from away-team identity even if they initially share a value. Keep readiness/action lime separate from ball visibility. A future branding change must not make the ball disappear against the court.

Recommended v1: developer-controlled themes and an internal live preview, with one shipped daylight theme. A player-facing theme setting can be added if requested; it adds persistence, startup, settings, and compatibility work.

## Implementation phases and review gates

### 1. Agree on direction and complete the inventory

- Resolve the questions at the end of this plan.
- Capture current start, Open Play, setup, roster, player editor, community, settings, challenge onboarding, gameplay, results, and error/loading states at mobile and desktop sizes.
- Inventory CSS literals, inline styles, SVG colors, Three.js materials, images, and font use. Classify each as theme-controlled, content data, or intentionally independent artwork.
- Establish the canonical design-system document, change log, and screen migration checklist. Archive or redirect older conflicting guidance after approval.

Exit: approved visual direction, explicit asset/character scope, and a tracked list of all surfaces.

### 2. Establish tokens and a design-system preview

- Define the theme schema and the daylight candidate, including missing destructive/error colors, accessible foreground variants, focus treatment, disabled/loading states, typography, spacing, motion, and responsive behavior.
- Build an internal preview page using real components: typography, color pairs, all button states, fields, cards, tabs, dialogs, status messages, player cards, and a small live court/character preview.
- Allow temporary theme edits, reset, and export of a candidate definition. Experiments should not rewrite production or saved player data.
- Provide an alternate test palette to expose hidden hardcoded colors. Preview theme updates must invalidate affected thumbnail caches and update Three.js material instances safely.

Exit: switching a theme updates both DOM and 3D samples; component states remain readable and usable. Review the candidate before broad migration.

### 3. Prove the design on a representative slice

- Restyle the start screen, one Open Play view, a settings dialog, a player card, and one gameplay HUD/court composition.
- Replace start-screen button images with native text and token-driven CSS/SVG shapes. Keep decorative illustration separate from interactive labels so palette changes and text changes remain straightforward.
- Decide whether the existing hero illustration needs replacement or a light variant. Record any fixed-color artwork explicitly.
- Keep the bold logo/display treatment selective. Initial recommendation: retain DM Sans for body UI and Manrope for headings, with standardized scales and weights.

Exit: the user can assess the system in real screens, including transitions from menus to gameplay. This is the main visual approval checkpoint.

### 4. Migrate the application UI

Work in small, reviewable groups:

| Group | Coverage and primary source areas |
| --- | --- |
| Shell | Start/loading screen, shared navigation, page backgrounds, PWA prompts; `main.ts`, `app-navigation.*`, `pwa.css`, `index.html` |
| Play flows | Open Play, game cards, setup, team selection; `match-setup.*`, `multiplayer/lobby.css`, `team-lobby.*`, `remote.*` |
| People | Roster, player designer, details, community, profile/progress; `roster.css`, `player-creator.*`, `player-details.*`, `community.*` |
| Account/social | Settings, account/sign-in, invitations, challenge links, guest onboarding, pending states, rematches, rivalry/share views |
| Match UI | Scoreboard, shot selection, targeting, controls, tooltips, player labels, pause/reconnect states, point results, celebrations, match summary |

For each group: adopt shared components, migrate colors and measurements, remove superseded declarations, verify interactive states, and mark the coverage checklist. Avoid adding another final override stylesheet that leaves the old rules in place.

Exit: every reachable product surface uses the system, including local/multiplayer differences and deep-linked entry points.

### 5. Character and court presentation

**Characters:** document proportions, silhouettes, expressions, clothing, paddle materials, portrait framing, lighting, shadows, and animation tone. Apply theme-compatible outfit swatches and presets consistently in the editor, cards, and on court. Preserve saved appearance and independent player materials. Check thumbnail regeneration, preview/court consistency, and material disposal.

Recommend retaining existing geometry and animation for this migration, with a separate authored-asset phase if closer moodboard fidelity is required. A palette migration alone will not reproduce the reference's modeling, poses, facial expression, or illustration quality.

**Courts:** expand existing location palettes into semantic location profiles: playing surface, kitchen, apron, line, fence/net, scenery, sky/fog, lighting, and decorative accents. Retain forest, Venice sunset, and desert identities. Let the brand influence curated combinations rather than forcing identical court colors everywhere.

Review ball, lines, target markers, trajectory, and both teams against every environment in tactical and closer views. Use outlines, symbols, or contrast backplates where color alone is insufficient. Keep presentation changes separate from court dimensions, collision, and simulation.

Exit: all locations and representative player appearances remain recognizable and readable; saved characters retain their selections.

### 6. Verification, cleanup, and release

- Validate complete theme definitions and required role mappings; test saved-player preservation and renderer theme application where behavior changes.
- Check text/background contrast, keyboard focus, non-color status cues, touch targets, zoom, text wrapping, and reduced motion. Some proposed bright foreground combinations need darker accessible variants.
- Visually inspect phone portrait/landscape and desktop, long names, empty/full lists, dialogs, loading, errors, disabled controls, and gameplay over each environment.
- Compare before/after screenshots of representative routes and run a second-palette check to detect missed colors. Establish visual baselines only after approving the new look.
- Run the production build and appropriate existing tests; smoke-test start → setup → match → results, roster editing, settings, and multiplayer invitation/join flows. Expand testing if shared behavior changes expose additional risk.
- Confirm no material/texture leak or unnecessary renderer recreation during repeated theme preview changes, and no material performance regression.
- Update startup/PWA metadata, asset versions, and cache behavior so existing installations receive the new styling coherently.
- Remove deprecated palette definitions and compatibility aliases after consumers have migrated. Keep a documented allowlist for intentional raw colors in content/art.

Exit: complete coverage checklist, approved visual review, passing relevant checks, and a documented theme change procedure.

## Ongoing design-system workflow

For each change: update the theme or shared component → inspect the preview → inspect representative screens/courts → run targeted checks → document the accepted decision. Update the system before copying a new style across features.

The maintained specification should include token roles, component states, layout patterns, character/court guidance, asset variants, accessibility rules, examples, and a short change log. Add a lightweight check against new hardcoded presentation colors outside approved theme/content files; do not ban legitimate saved-player colors.

Definition of success: a developer can change or replace the palette in one theme definition, see all UI and theme-controlled 3D elements update, and identify the small explicit list of artwork/content exceptions. No screen-by-screen color hunt is required.

## Decisions requested before implementation

1. Adopt the markdown's warm-cream daylight palette as the initial system, replacing the current dark cobalt direction, or favor the moodboard's cooler white/cyan look?
2. Should theme switching be an internal design tool only, or a player-facing setting? Recommendation: internal first, one shipped theme.
3. Should character scope cover existing models, materials, presets, lighting, and framing, or also new geometry/expressions/outfits to approach the moodboard? Recommendation: existing models first; asset redesign separately.
4. Should existing custom player colors stay fixed while new presets follow the theme, and should court locations retain distinct palettes? Recommendation: yes to both.
5. Can start-screen image buttons be rebuilt as themeable text/CSS/SVG controls, and can decorative art be refreshed where needed? Recommendation: yes; preserve the logo initially unless its redesign is requested.

Suggested first implementation milestone after answers: foundations, preview page, and representative visual slice (phases 1–3), followed by review before migrating every screen. This is a multi-stage UI and rendering migration; estimate the artwork pass separately once its scope is agreed.


## Implementation verification

- Production build passes (existing large-chunk advisory remains).
- Thirty targeted regression tests passed for saved designs, setup, service indicators, selection events, shot descriptions, and point results. Setup/service checks were repeated after final control markup changes.
- `npm run check:design`: 63 tokens resolve, all CSS token references exist, 13 text pairs meet 4.5:1, and focus/control boundaries meet 3:1 on white.
- Visually reviewed start, Open Play, setup, gameplay scoreboard, shot picker, settings, and desktop roster. Confirmed both service dots remain visible for second server.
- Confirmed a temporary palette edit changes both the component sample and the real app's Open Play button; CSS export and reset work.
- The normal app produced no console errors in a fresh browser check. Browser inspection of the internal iframe preview reported a MutationObserver initialization diagnostic even after the preview's observer was removed; the source remains unconfirmed. Theme propagation and the embedded app still worked. Rare remote/error/result states have token coverage but were not all exercised interactively.
- Character/design data, Three.js rendering, court palettes, simulation, networking, persistence, and event handlers are unchanged. Source edits to game TypeScript are limited to UI markup/SVG presentation.
