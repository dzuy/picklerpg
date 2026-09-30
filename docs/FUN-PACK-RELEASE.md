# Approved Fun Pack V1 handoff

The owner accepted the current models, music and integration on September 29, 2026. Further refinements belong in a later lab pass. Fun now has `contentReady: true` at the unchanged $2.99 one-time price. Purchasing, provider setup and launch switches are being handled in a separate chat at the owner’s request.

## Included

- Disco Inferno, 80’s Night, Spooky, and Fairy Tales.
- Decorations across all eight courts, two character looks per theme, separate theme paddles, optional original music, and render-only celebrations.
- One-step player presets with manual overrides, optional matching-team prompt, preserved player identity and saved choices.
- Solo saves, invitation/friend matches, rematches, host ownership enforcement and free-opponent visibility.
- Existing Everything owners receive Fun through the unchanged fixed V1 bundle. The owner subsequently removed the exclusive-cosmetic requirement; Everything is content-ready and contains exactly the three V1 packs.
- `/fun-pack-lab.html` remains a development-only testing entry for later refinement; it is not included as a production app page.

## Integration order for the release chat

1. Include the approved Fun code/assets and catalog change. The isolated release checkout is based on `cbf1d73` and excludes unrelated player-card, homepage and analytics work.
2. Apply `supabase/migrations/202609290005_fun_themes.sql` before deploying the corresponding server/client. It adds invitation court themes and Fun-specific wardrobe/host checks. It preserves existing ownership, saved choices and running snapshots.
3. Verify theme selection and optional team outfits on a hosted match, join from a free account, and check native rendering/audio. Local testing covers all 32 court/theme combinations and database enforcement; it does not substitute for hosted/device checks.
4. Purchasing, product metadata, Apple review and payment/enforcement switch decisions belong to the separate purchasing chat. No live configuration or production migration was changed here.

Keep Apple product `com.picklebash.app.pack.fun`, RevenueCat entitlement `pack_fun`, and existing Stripe price mappings. Fun does not require Style, and it does not unlock paid base courts. Preserve the newer billing-environment safeguards already present in the release branch when integrating.

## Later refinement

Use the live lab to fine-tune models, colors and audio. Final audio mastering and separate bird ambience are deferred improvements; the current art/audio is accepted for V1.

## Verification

The isolated release passed the production build and all 47 focused model, save, ownership, database, setup and billing-availability checks. The broad regression run was stopped because its parallel database work caused local contention; it is not reported as passing. No production deployment or payment change was made.
