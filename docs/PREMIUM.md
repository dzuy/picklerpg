# Permanent cosmetic packs (V1)

This policy replaces the deferred PickleBash+ subscription proposal. No subscription, virtual currency, ads, or paid competitive advantage launches in V1. Core gameplay is free. Money changes identity, expression, and environment only.

| Pack | US base price | Permanent contents |
|---|---:|---|
| Style | $2.99 | Current paid outfits, hair, facial hair, static expressions, hats, tops, bottoms, glasses, accessories |
| Court | $2.99 | Skyline (`city`), Glowball, La Fortuna (`jungle`), Winter, Autumn |
| Fun | $2.99 | Current paid paddle designs; new celebrations/reactions and expressive items still being created |
| Everything | $6.99 | All three **V1** packs plus bundle-only cosmetics still being created |

Everything is featured. Individual packs cost $8.97 together; Everything saves $1.98. It stays $6.99 regardless of previously owned individual packs. Owning all individuals does not confer bundle exclusives. Future packs are separate and never join Everything automatically.

## Classification, availability, ownership, and billing

Keep these four concepts distinct. `src/pack-catalog.ts` defines stable IDs, fixed bundle membership, product mapping, and release readiness. `player-customization-tiers.ts` explicitly classifies current cosmetic choices: paid paddles require Fun; other paid choices require Style. `locations.ts` uses an explicit court list. Matching SQL classification is parity-tested.

Style/Court have existing content. Fun/Everything are fully represented as offers and entitlements, but their `contentReady` stays false until promised reactions/celebrations and exclusive assets exist and are assigned. Do not charge for missing content. Then update the catalog, required-pack mappings, SQL enforcement and tests together. Bundle-only items must require `everything`, never just all individual packs.

Free content includes Forest, Beach and Desert courts, frog and bee costumes, free hairstyles/clothing/accessories/paddle shapes, all existing free colors and base character choices. Never weaken free gameplay or intentionally make free customization dull.

## Shared ownership

RevenueCat verifies Apple StoreKit non-consumables. Stripe-hosted **one-time** Checkout verifies web payments. Both use the signed-in Supabase account UUID and write independent pack sources. A shared account owns the same packs on iOS and web. Never trust return URLs, client claims, or an unrelated Payment Link as proof.

`pack_ownership` has no expiry. An Apple/Stripe refund or revocation can remove that provider's entitlement; it cannot remove another payment or a complimentary grant. Verified provider snapshots are atomic and reject stale updates. Restore Purchases is available on iOS. Keep purchases with their original PickleBash account in RevenueCat settings; sign into that account to restore. Do not transfer permanent purchases merely because there is no active subscription.

Admins listed in server-only `PREMIUM_ADMIN_IDS` can give/revoke individual packs or Everything in Profile → Store, by exact username/email/UUID and recorded reason. Grants have no expiry and are independently audited; they never imply payment.

The previously agreed fixed human tester cohort (trusted playtest marker, created before **2026-09-29 05:13:25 UTC**, excluding bots) receives permanent complimentary Everything, including eventual V1 exclusives. Active prior complimentary grants migrate likewise. Future signups do not automatically receive packs. Production migration on 2026-09-29 verified 12 cohort members, 12 permanent Everything grants and 12 audit records.

## Enforcement and social visibility

The wearer/host owns content; opponents need not own it. Host court checks run on the server. Match snapshots preserve each participant's effective selected appearance, so free opponents see paid content. Viewing someone else's outfit never requires viewer ownership. Saved design choices survive revocation, while new match/portrait rendering uses free alternatives for unowned items. Running games retain their original snapshots. Community bots retain their curated looks.

Analysis is separate: existing analysis permission and tester access continue, and saved reports remain readable after permission changes. Cosmetic purchases never grant reports. There is no analytics upsell in the pack store.

## Rollout

Production schema is installed; the billing release still requires deployment and sandbox verification. Railway is configured for `PACK_STORE_ENABLED=true` on its next deployment and `BILLING_PURCHASES_ENABLED=false`. Database enforcement remains false. These are independent switches. Stale subscription environment settings cannot enable this store. Initial Apple launch still excludes EU; verify app and each product availability and local prices before submission. See [BILLING.md](BILLING.md) for dated setup and validation evidence.
