# Fun Pack: four themed parties

## Agreed direction — September 29, 2026

The Fun Pack adds coordinated themes across player customization, court decoration, music, and celebrations. Each theme transforms an existing location rather than introducing a replacement court. The four V1 themes are Disco Inferno, 80's Night, Spooky, and Fairy Tales.

Style expands the everyday wardrobe. Court adds locations. Fun brings themed parties to those locations. All four themes are included in the single permanent Fun purchase and therefore in the V1 Everything bundle. Pricing and ownership follow [the pack policy](PREMIUM.md).

The SVG asset library, original music studies, selection prototype, and first integrated 3D implementation now exist locally; see [the asset handoff](../art/fun-pack/README.md). The owner accepted this version for V1; Fun is now marked content-ready in the local runtime catalog. Further model and music refinement is deferred to a later lab pass. This is not a claim of production deployment.

## Local 3D testing and integration — September 29, 2026

Open `/fun-pack-lab.html` on the development server for a real-engine, continuously playing match. Switch among all eight courts and all four themes without resetting the rally. Player themes, two look variants, and paddles are independently selectable. Controls include match-players-to-court, pause/resume, half/normal/double speed, new match, reset camera, still decorations, and opt-in theme music. This development entry has no account, roster-save, or purchase side effects.

`FunCourt` adds disposable scene decoration; `dressFunAthlete` attaches wardrobe modules to the existing player skeleton. The original court surfaces and rules remain unchanged. Render-only winning-point choreography adds each theme's celebration. Manual editor clothing choices can override themed top, bottom, shoes, or headwear independently; reapplying a preset clears those overrides. Theme paddles remain separately selectable.

Solo setup and the shared online setup now offer an ownership-aware theme selector and optional matching-player prompt with undo. Only the host's own team receives setup appearance overrides. Player editor presets preserve the underlying saved character choices. Court themes persist in solo checkpoints, invitation rows, and public multiplayer snapshots. Music is separately opt-in, pauses when hidden, and stops on leaving the court.

Deploy migration `202609290005_fun_themes.sql` before the corresponding application update. It stores invitation themes, enforces Fun ownership for hosts and new wardrobe choices, sanitizes unowned themed appearance at match creation, and derives accepted-match themes from the server-owned invitation. Running snapshots survive later revocation. A rematch hosted by someone without Fun falls back to the original court atmosphere; underlying Court Pack checks continue independently. The migration has been exercised in local test databases and applied to the isolated purchase sandbox; production is unchanged.

Content acceptance is complete. Further audio mastering and independent bird ambience are deferred improvements, not V1 blockers. Remaining rollout work: physical-device performance and sound checks, hosted two-account verification, Fun-specific provider purchase coverage, and deployment. The owner removed bundle-only items from V1; Everything is content-ready with the three completed packs.

## Theme direction (future refinements included)

| Theme | Character and equipment | Decorations on existing courts | Audio and celebration direction |
|---|---|---|---|
| Disco Inferno | Sequined outfits, flared pants, disco accessories, glitter paddle designs | An overhead disco ball, colored perimeter lights, sparkling scenery | Disco grooves, paddle guitar, disco dancing, glitter bursts |
| 80's Night | Track suits, headbands, neon sportswear, pastel Miami Vice-inspired looks, geometric paddle designs | Boomboxes, retrowave sunset accents, neon trim, geometric scenery | Synthpop instrumentals, retro dance moves, pixel confetti |
| Spooky | Friendly ghosts and ghouls, zombies, skeletons, pumpkin paddle designs | Jack-o'-lanterns, cobwebs, friendly floating ghosts, low fog outside the playing area | Playful spooky melodies, goofy zombie shuffles, cartoon bats |
| Fairy Tales | Princesses, magical fairies, wings, fantastical clothing, enchanted paddle designs | Butterflies, flowers, oversized mushrooms, sparkling foliage and storybook decorations | Bird chirping, light magical melodies, fairy twirls, butterfly celebrations |

Spooky is playful and welcoming, never genuinely scary: no gore, jump scares, or disturbing characters. Fairy Tales should feel like an enchanted storybook, with fantastical scenery and nature sounds. Disco Inferno and 80's Night need distinct identities: disco sparkle and dance-floor warmth versus retrowave neon, pastels, boomboxes, and synthpop.

## Agreed selection flow

- Court setup: owners of Fun (including through Everything) get a **Theme** dropdown above the existing court selection. Choices are **None**, **Disco Inferno**, **80's Night**, **Spooky**, and **Fairy Tales**. None is the default and uses the original court atmosphere. A theme is an optional add-on to the selected base court; choosing or changing a theme never replaces or unlocks that court. Changing courts retains the selected theme, and choosing None removes the theme decorations and audio.
- Player editor: provide an easy **Theme** preset selector near the top. Selecting a theme applies a complete coordinated character look, equipment, and signature celebration in one action; the player can use the normal save action and be done. No item-by-item assembly is required. Preserve the player's name and underlying character identity.
- Individual customization remains available after applying a preset. Players can adjust any owned item and mix pieces from different themes. Indicate **Custom** after deviations from a preset; selecting a theme again reapplies its coordinated set. Keep the existing editor save/cancel behavior so an unsaved preview does not overwrite the saved character.
- Court and player theme selections are independent. Applying a court theme does not change anyone's outfit, and applying a player preset does not change the match atmosphere.
- After the player explicitly selects a different non-None court theme, offer an optional prompt: **Use this theme for your players too?** Supporting text: **Apply [theme name] to the players you customize for this match.** Actions: **Apply theme** and **Keep current looks**. Only show the prompt when there are eligible players whose looks would change. Do not prompt on initial load, when changing the base court, when reselecting the same theme, or when choosing None.
- Accepting applies the coordinated player preset to the players the purchaser is authorized to customize for this match; never overwrite another account's character. Declining or dismissing keeps current looks and retains the selected court theme. Treat these as match-setup appearance overrides, preserving saved player designs; allow subsequent manual edits and an easy undo. Selecting None later removes the court atmosphere only, without silently changing player looks.

## Experience requirements

- The host selects one shared court theme. Each player controls their own outfit, paddle, reactions, and celebration. Guests can see and hear the party without buying the pack.
- Themes work on every existing court the host can access. Fun does not unlock paid base courts; all four themes must work on the free courts without Court or Style ownership.
- Preserve the base court's recognizable scenery, playable surface, lines, and ball visibility. Keep obstructive decoration and fog outside the playing area; celebration effects occur between points or after matches.
- Respect each player's music, sound, and reduced-motion preferences. Bird ambience and theme music should be controllable without losing gameplay cues. Avoid flashing lights and added match delays.
- Use original or appropriately licensed music. No recognizable commercial tracks are implied by the musical references.
- Keep paddle behavior, character abilities, scoring, and competitive rules unchanged. Existing free customization and basic reactions remain available.

## Completion criteria

Before marking Fun ready, each of the four themes needs a cohesive character/equipment set, decorations compatible with every existing court, its audio identity, and a signature celebration. Verify the court Theme dropdown, removal through None, persistence across court changes, one-step player presets, optional manual edits, and independent court/player choices. Final asset inventories must be explicitly assigned to Fun, previewable, and verified for ownership, multiplayer guest visibility, audio preferences, reduced motion, and unobstructed gameplay.

New themed outfits and accessories require Fun alone. Existing Style items, including existing butterfly outfits, retain their classification; create distinct Fun assets rather than silently reassigning existing purchases. Current paid paddle designs remain included in Fun.

Update the runtime catalog description, required-pack mappings, server enforcement, and relevant tests when implementing this definition. Do not mark the pack ready merely because its purchase entitlement exists. Everything includes all three V1 packs with no bundle-only items; all four themes are available through either Fun or Everything.

### Verification of this local implementation

- Production build and TypeScript checks passed.
- All 32 court/theme combinations loaded in the browser without reported errors; the lab continued into later points after live changes. Desktop visuals and 390px layout were inspected, with no horizontal overflow on mobile.
- 58 focused save, ownership, invitation, challenge, and theme tests passed, including a committed multiplayer turn retaining its theme and free-guest visibility.
- The 827-test regression run passed 826 tests; its sole failure was the TeamPicker boundary mock missing the new theme helper. The mock was updated, a non-mutation assertion added, and that test passed. The final focused run passed all 18 affected model/player/team tests.
- No production migration, deployment, live purchase, or real account entitlement change was performed.
