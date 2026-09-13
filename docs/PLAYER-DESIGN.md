# Phase — Player Design

A personal roster and avatar creator, built in six ordered increments. This is a new named phase alongside the numbered roadmap; it does not renumber or complete the deferred voice or RPG phases.

## Blender character asset pass

The Riley asset is now authored in Blender with a shared 24-bone skeleton, ten active swap modules, optional glasses/visor exports and recolorable materials. Source, rebuild instructions, reference-based renders and validation results are in [the Riley asset folder](../art/characters/riley/README.md). The local `/riley-review.html` page loads the actual GLB for visual comparison and accessory/pose checks.

- [x] Build the reference-based neutral Riley model and modular outfit in Blender.
- [x] Export the shared rig and named modules to self-contained GLBs.
- [x] Render front, side, back, three-quarter and tactical views; inspect deformation poses.
- [x] Validate weights, bind poses, dimensions and triangle budget with Three.js GLTFLoader.
- [ ] User visual review against the Riley reference.
- [x] Load the Blender character on court and in Player Design; map the existing tactical motion to the shared skeleton.
- [ ] Replace the mapped procedural poses with finished, authored gameplay animation clips.
- [ ] Author additional compatible hairstyles, faces and outfits.

The game now uses cloned Riley GLBs for all four court players and for Player Design previews. Team and saved-player colors are applied to independent material instances. Hair visibility, glasses, visor/headwear and handedness follow the existing appearance record; the first asset temporarily reuses Riley's ponytail, face, tank, skort and visor geometry for appearance choices that do not have a production module yet. The Blender diagnostic poses are not finished gameplay animation clips.

## Original increments

1. **PD1 — Player records and storage.** Define a versioned player with a stable ID, name, appearance, handedness and all eleven execution attributes. Validate saved data, keep multiple players in browser storage, and report save failures without pretending a save succeeded.
2. **PD2 — Customizable athlete.** Extend the existing court model with three face shapes, skin and hair colors, hair styles, hats, glasses, and outfit colors. Preserve the articulated rig. Release resources when replacing a preview or court avatar.
3. **PD3 — Creator and live preview.** Add a visible Player Design entry, a rotatable 3D preview, labeled appearance controls, and responsive keyboard-accessible layout. Keep unfinished edits when closing; require explicit discard before switching drafts.
4. **PD4 — Skills.** Add sliders from 0 to 100 for serve, return, drive, drop, dink, reset, volley, counter, overhead, movement and hands. Show values and concise effects; provide existing archetypes as optional starting points. These are sandbox execution attributes, not a real-world rating.
5. **PD5 — Roster and game integration.** Name, save, edit and create multiple players. Save & play selects a player and explicitly starts a new full game. Apply appearance/name on court and custom skills/handedness to full games and pattern practice across points and restarts. Guided rally and Shot lab retain their authored/benchmark skills.
6. **PD6 — Verification.** Check persistence, malformed storage, independent records, skill application and unchanged default players with tests. Build and inspect appearance editing, saving, reopening, selecting another player and narrow-screen layout in the browser.

## Acceptance

- Appearance changes are visible before saving and match the avatar used on court.
- Skill sliders affect the actual simulation rather than only the profile display.
- Creating another player does not overwrite an existing record.
- Closing/reopening retains the draft; discarding or switching drafts is explicit.
- Saving and starting a new game are clearly separate actions.
- Browser storage is local to the current browser and origin (including port); there is no account sync.

## Progress

- [x] PD1 — Versioned records, validation, independent roster saves, storage-failure handling.
- [x] PD2 — Face shapes, skin/hair/outfit colors, four hair styles, four headwear options, three eyewear options; shared rig and safe asset disposal.
- [x] PD3 — Header entry, responsive dialog, rotatable live preview, keyboard tabs and draft protection.
- [x] PD4 — All eleven skill sliders, live values, descriptions and archetype starting points.
- [x] PD5 — Named multi-player roster, explicit Save & play, selected profile restored on reload, simulation skills/handedness across points/restarts/practice.
- [x] PD6 — Production build; 120 passing tests; desktop and 390px mobile browser checks; two-player save/select/reload flow; unsaved draft retention; live match state confirms drive 100, dink 0, left hand from the test profile; no browser errors.

## Usage

Open **Player Design** in the game header. Choose a saved player or **+ New player**, edit Appearance and Skills, then choose **Save player** to keep it in the roster. **Save & play** saves, selects the player and starts a fresh full game. The saved player takes precedence over the user archetype in Game setup; partner and opponent archetypes still work normally. Skill changes saved without playing apply when that profile is next selected or the app reloads.

Drafts survive closing the editor during the current visit, but only saved profiles survive a browser reload. There is no profile deletion or cloud sync in this increment.


## Reference-led visual redesign

The supplied Create Your Player mockup and Alex/Riley character sheet now guide the visual style. The creator uses a full-screen cream layout, a large rotatable model, three starting-look portraits, an identity/roster column, Appearance and Play Style tabs, real model thumbnail buttons, color swatches, and a randomize-look action. All eleven existing skill sliders remain available.

Athletes now have larger expressive faces, faceted swept hair and ponytails, tapered limbs and clothing, and shaped paddles. New options include backwards caps, tank tops, skirts, independently colored shoes and paddles, and wristband/watch accessories. These appearances work on court with the existing animation rig. Look presets and randomization change appearance only; play-style presets change skills.

Older saved players receive defaults for the new outfit fields when loaded, preserving their ID, name, original colors, existing appearance settings, handedness and skills. Browser persistence and explicit Save & play behavior are retained. Validation: production build and 127 tests pass, including legacy-profile migration and new-outfit round trips; browser checks cover outfit selection, saving/reload, the court model, and mobile layout.

### September 12 — blocky reference redesign

Rebuilt the shared Blender/GLB Riley base with a large square head, button eyes and blush, block hair and ponytail, shortened chunky limbs, pink tank/skort, layered sneakers and a wider paddle. Regenerated both optional accessories against the revised 24-bone bind pose. The creator uses the new pink Riley palette and reframed thumbnails; existing saved colors remain intact. The exported base has 3,852 triangles, with ten active slots. The current exports retain one Riley base look; the reference lineup and expression library do not imply newly implemented hairstyle, garment or expression swaps.

Follow-up proportions: shortened the torso and arms by 28% and the legs above the shoes by approximately 36%, preserving head/hair dimensions and shoe size. Updated the skeleton, accessory exports, inspection framing and creator thumbnails for the compact 1.541 m model.

Detail refinement: replaced elliptical eyes with rounded rectangular pills, exposed an additional 5.5 cm of neck, and softened only the arm/leg bevels. Head and torso shapes remain unchanged. The regenerated model has 4,964 triangles; model validation and the production build pass.

### Modular wardrobe and reference presets

The creator now offers eight reference-inspired starting looks: Emma, Leo, Maya,
Jax, Zoe, Cal, Rina, and Sam. Boy/girl styling chooses starting hair and clothing;
all parts remain available for either style. Appearance presets do not alter skills.

Options include nine hair choices (including no hair), four tops, five bottoms,
square/round glasses and two sunglasses styles, six headwear styles plus none,
and wristbands/watch/none. Top and bottom colors are independent. Saved v1
players acquire the new fields through validation without losing existing data.

`src/player-looks.ts` defines presets. `src/athlete-options.ts` builds alternate
Three.js meshes attached to the approved GLB's existing bones. The base ponytail,
tank and skirt continue using the authored Blender meshes. Runtime wardrobe
variants are available in the creator and game; they are not baked into the
base Blender download. GLTFLoader removes dots in bone names, so the animation
rig maps the imported L/R suffixes back to the application's dotted names.

Open `/?design=1` for the full wardrobe. The Riley asset review links there.
Validation: `node --import tsx --test tests/athlete-options.test.ts tests/player-design.test.ts`
checks all options against the production skeleton and persistence/migration.

Game Settings → Players on court provides a portrait and selector for each of
four court slots. Choices include the slot's default player, saved players, and
the eight starting presets. Substitutions change appearance, name, skills, and
hand immediately without resetting the score, court position, or current rally.
Slot assignments last for the current session and survive point/game resets.
