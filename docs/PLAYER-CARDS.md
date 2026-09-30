# Shareable player cards

The character editor’s **Create player card** button snapshots the current draft, renders its equipped model and automatically publishes the resulting image to public storage. This does not save the draft or change the roster’s community-player setting. The image itself is public and viewable by anyone with its URL, including for guest creators.

Exports are 1080 × 1350 PNGs with the original PickleBash logo, name and five skill summaries from `summarizeSkills`. DUPR is temporarily omitted. Finish and pose selectors are hidden; exports use Bash Pink and the forehand pose. The nameplate and skills are raised 40 pixels to leave a larger `picklebash.app` footer. The dialog contains share/download controls and a caption, without the removed promotional paragraphs.

## Publishing and links

- `POST /api/player-cards` accepts a raw `image/png` body, capped at 4 MiB. It works for guests and accounts without creating an auth session.
- The server verifies PNG signature, chunk boundaries and CRCs, exact 1080 × 1350 dimensions, RGB/RGBA 8-bit non-interlaced encoding, bounded decompression, and scanline filters. It re-encodes without metadata before publishing.
- The existing server Supabase service credential writes to the public `player-cards` bucket. No browser upload/list/delete policies are added. Bucket configuration allows PNGs only, at most 4 MiB.
- Stored names are `v1/<sha256-of-canonical-image>.png`. Repeating an identical export returns the same URL without overwriting existing files. URLs contain no account or roster identifiers and do not expire. There is no automatic deletion; an operator can remove a file through Supabase if necessary.
- IP upload limit: 6/minute. Global upload limit: 60/minute. Production uses the existing database rate-limit store; development uses memory unless configured otherwise. Trusted proxy handling follows `TRUSTED_PROXY_HOPS`.
- **Copy Link** is enabled only after upload success and copies only the direct public PNG URL. The post caption still includes that image URL and the PickleBash site link. Native image sharing uses the same caption. The preview/download still work if publishing fails; **Retry publishing** reuses the rendered image. No localhost or temporary blob URL is copied.

Cards are publicly accessible images, not hosted HTML profile pages. Social applications may handle image URLs and supplied captions differently.

## Storage setup and release status

Uses existing `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and server-only `SUPABASE_SERVICE_ROLE_KEY`; no secret is added to client bundles.

For a new environment, apply `supabase/migrations/202609290004_player_card_storage.sql`, or run `node --env-file=.env.local --import tsx scripts/admin/setup-player-card-storage.ts`. The setup script creates only a missing bucket and verifies existing settings without changing them.

September 29, 2026: the public `player-cards` bucket was created and verified on the configured `vwdtfnljcjbyokdvjiea.supabase.co` project. Local app/backend code includes the publishing route. Production application code must still be deployed; bucket creation alone does not deploy the feature.

## Artwork

`public/assets/player-cards/tropical-court-v2.png` was generated with the built-in image tool from the supplied collectible reference; the full prompt is saved in `art/player-cards/background-prompt.txt`. The pickleball uses the supplied transparent `public/assets/player-cards/pickleball.png`. The original logo, player, name, skill values and website footer are composed at export time; no player data is baked into the background.

## Verification

- `node --import tsx --test tests/player-card-storage.test.ts tests/player-trading-card.test.ts tests/production-server.test.ts`
- `npm run build` and `npm run check:design`
- Local-only `/tests/browser/player-card-preview.html` supports default, `?reference`, `?wide` and editor previews. These previews publish real images when the server has storage configured.
- Verify native sharing into third-party social apps on physical mobile browsers before release.

Control order: Post caption, full-width Share card, then Download and Copy Link side by side.


## Account-safety preparation — September 29, 2026

Safety release changes prepared, not deployed: publishing requires a registered or persistent guest bearer session; v2 image paths and published_player_cards record the owner. Account deletion removes owned hosted images. Legacy v1 images from pre-release tests require individual audit because ownership was not recorded. Download remains available without publishing.
