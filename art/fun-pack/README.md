# Fun Pack asset and interaction handoff

Built September 29, 2026. This is the first concrete design kit for the [four agreed themes](../../docs/FUN-PACK.md), not a released game feature.

## Open the working preview

Run the existing development server and open `/fun-pack-preview.html`. This page is a development entry, like the existing design-system preview; it is not linked from the game or included as a production HTML entry.

The preview includes all eight original courts, the optional court Theme dropdown, matching-player prompt with accept/keep/dismiss, per-match preview lineup, undo, independent player presets, two coordinated looks per theme, mixed paddles, four celebration motion studies, and opt-in music. Refresh resets the preview. No accounts, saved players, payments, or multiplayer records are touched. The page assumes Fun ownership to demonstrate the purchaser experience.

## Delivered assets

All files live in `public/assets/fun-pack/`, indexed by `manifest.json`. Rebuild the library with `python3 scripts/fun-pack/build-assets.py` (Python standard library only). Edit the generator to retain reproducibility; output SVGs are also editable vector art.

| Theme | Character looks | Five standalone decorations | Music |
|---|---|---|---|
| Disco Inferno | Disco Dynamo; Boogie Royal | Mirrorball, speaker, star, spotlight, record | 116 BPM, 8 bars |
| 80's Night | Neon Runner; Miami Rally | Boombox, sunset, palm, cassette, neon triangle | 104 BPM, 8 bars |
| Spooky | Funny Bones; Zombie Jamboree | Friendly ghost, pumpkin, bat, web, lantern | 96 BPM, 8 bars |
| Fairy Tales | Petal Princess; Woodland Fairy | Butterfly, mushroom, flower, bird, castle | 88 BPM, 8 bars with synthesized bird chirps |

Each theme also has a transparent court overlay, paddle design, celebration composition, and separate body-only versions of both character sheets for paddle swapping. Total: **48 SVG files + 4 WAV loops**, plus the manifest. All art and music are original procedural work; no external samples, commercial songs, fonts, or image dependencies are included.

- Decorations and paddles: transparent `160 × 160` viewBox.
- Character sheets: transparent `300 × 370` viewBox, equipped and body-only versions. These are visual specifications for the existing toy-like 3D characters, not replacement runtime models.
- Court overlays: transparent `640 × 320` viewBox. Composite above the original court image at identical dimensions and `object-fit`. Net, baselines, kitchen lines, and court colors come from the original image. Decorations surround the playing surface. The preview includes actual 240 × 108 / 220 × 108 selector crops.
- Celebration compositions: transparent `320 × 260` viewBox. Preview motion respects reduced motion. These establish mood and timing; real rig choreography remains to be authored.
- Music: eight-bar, mono, 22.05 kHz, 16-bit WAV loops, roughly 16–22 seconds. These synthesized arrangements are auditionable music studies, not mastered release tracks. Fairy Tales includes soft synthetic bird chirps. Music plays only after an explicit click and pauses when the preview is hidden.

## 3D implementation update

The shared runtime now includes rig-attached theme clothing, paddle motifs, disposable 3D court decoration, point celebration poses, opt-in music, saved solo themes, and multiplayer snapshot integration. Open `/fun-pack-lab.html` for continuous real-engine play with live theme/court switching. See [the integration and deployment notes](../../docs/FUN-PACK.md). The asset sheets above remain design references for the integrated models.

## Production implementation boundary

The owner approved the integrated V1 content; Fun and Everything now have `contentReady: true`. Everything contains the three V1 packs without bundle-only items. The integration adds optional Fun appearance fields and server enforcement without reclassifying Style items, granting ownership, or enabling billing.

The owner accepted the current models and music for V1. Final audio mixing and independent ambience controls are deferred refinements; device checks and hosted deployment verification remain rollout work. Presets must preserve player identity and saved designs, touch only editable players, and require Fun alone for their newly created items. Verify every theme on every court in actual gameplay before release.

## Validation

The application production build and a separate TypeScript check of the preview passed. Browser checks exercised matching-player acceptance, retaining current looks, independent player themes, changing base courts, and music playback. Desktop and 390px layouts were inspected; the mobile document has no horizontal overflow. SVG/XML integrity, manifest paths, and WAV duration/peak checks are verified during this asset pass. Audio playback was verified, but final listening review and in-game mixing remain outstanding.
