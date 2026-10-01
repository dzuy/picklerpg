# Permanent cosmetic packs (V1)

This policy replaces the deferred PickleBash+ subscription proposal. No subscription, virtual currency, ads, or paid competitive advantage launches in V1. Core gameplay is free. Money changes identity, expression, and environment only.

| Pack | US base price | Permanent contents |
|---|---:|---|
| Style | $2.99 | Current paid outfits, hair, facial hair, static expressions, hats, tops, bottoms, glasses, accessories |
| Court | $2.99 | Skyline (`city`), Glowball, La Fortuna (`jungle`), Winter, Autumn |
| Fun | $2.99 | Current paid paddle designs plus four coordinated themes: Disco Inferno, 80's Night, Spooky, and Fairy Tales; V1 content approved |
| Everything | $6.99 | All three **V1** packs; no bundle-only items |

Everything is featured. Individual packs cost $8.97 together; Everything saves $1.98. It stays $6.99 regardless of previously owned individual packs. Buying all three individual packs provides the same V1 content; Everything is the discounted bundle purchase. Once all three are owned, the Everything offer is disabled with “All packs owned”; Apple purchase preflight and server-side Stripe checkout reject the redundant purchase. This does not synthesize ownership of the Everything SKU or alter provider/grant sources. Future packs are separate and never join Everything automatically.

## Classification, availability, ownership, and billing

Keep these four concepts distinct. `src/pack-catalog.ts` defines stable IDs, fixed bundle membership, product mapping, and release readiness. `player-customization-tiers.ts` explicitly classifies current cosmetic choices: paid paddles require Fun; other existing paid choices require Style. New items created for the four Fun themes belong to Fun, including themed clothing and accessories; they do not require Style as well. Existing items keep their current classification. `locations.ts` uses an explicit court list. Matching SQL classification is parity-tested.

All four offers have approved V1 content and `contentReady: true`. On September 29, 2026, the owner removed bundle-only items from V1; Everything includes exactly Style, Court, and Fun. See [Fun Pack design](FUN-PACK.md) for the agreed theme direction and approved V1 content. Do not charge for missing content. Keep catalog readiness, required-pack mappings, SQL enforcement and tests consistent. Content readiness does not enable billing or establish deployment readiness.

Free content includes Forest, Beach and Desert courts, free hairstyles/clothing/accessories/paddle shapes, all existing free colors and base character choices. Never weaken free gameplay or intentionally make free customization dull.

The main navigation opens Store as a full page at `/?openplay=1&tab=store`, with its navigation tab active and no modal close button. Profile no longer has a Store shortcut. Existing feature upgrade dialogs reuse the same pack controls. Checkout success and cancellation return to Store; legacy Store/checkout links remain supported.

Store previews show examples of included Style hairstyles, hats, glasses, and the bear outfit, four of the included Court thumbnails, and actual player models for all four Fun themes. Everything previews one example from each pack. Winter remains included without a preview. Buy buttons have extra spacing, and the explanatory footer and manual Refresh packs button are removed. These local presentation changes also appear in upgrade dialogs; previewing content requires no ownership and does not equip it or change purchase availability.

The local Court Pack upgrade dialog uses a compact overlapping collage of four court examples without court-name captions, omits the host-location description, and shows a shorter Everything alternative. The standalone Store also uses compact Court, Style, and Party cards. The Style Pack unlock dialog reuses the compact Style card and shorter Everything alternative. This presentation change does not change pack contents, ownership, or billing availability.

The local Fun upgrade dialog displays “Party Pack” and uses a matching compact collage of four theme looks, short copy, and the compact Everything alternative. “Party Pack” is a display name in this dialog only; the `fun` pack, Apple product, entitlement, prices, remain unchanged. The standalone Store also displays Party Pack.

Game theme music is disabled locally in both solo and friends games, and the Theme music setting is removed. Theme music assets remain available for development previews; selecting a theme in a game does not load or play them. Gameplay sound effects keep their separate sound setting.

All six outfit costumes (frog, dinosaur, lion, bear, butterfly, and bee) require Style Pack. No outfit is free; choosing None keeps the underlying clothing. The creator shows all costume choices under Style Pack / Premium, with no Free outfit group. Migration `202609300002_style_pack_outfits.sql` keeps server classification consistent with the client; apply it before deploying this update. This classification change has not been deployed to production.

## Preview and upgrade flow (local)

Account-created starter avatars randomize only free parts. Player editor shuffles choose from free parts and parts in the wearer's verified owned packs, including Everything bundle access. Disabled database enforcement does not grant shuffle access. While ownership is loading or unavailable, shuffles use free parts. Skills retain their separate account budget.

The player editor shows Free and Premium pack groups. Players can select and preview all items; saving new unowned paid choices opens a purchase dialog for the required Style or Fun Pack, with Everything as an alternative. The unsaved draft stays intact. Previously saved choices remain editable after revocation; an unrelated name, skill, or free-color edit does not require buying the old items again. The editor no longer offers theme preset, look-variant, or paddle-theme controls; existing themed designs and game setup themes remain supported.

Initial court randomization, court shuffles, and Quick Solo Match select only free courts or courts in the host’s verified owned Court Pack (including Everything). Unknown or unavailable ownership uses free courts. Premium courts remain manually selectable. Starting a solo game or creating an invitation on an unowned Premium court opens the Court Pack purchase dialog and preserves setup. These client save/start checks use verified pack ownership even while database enforcement is disabled. Billing readiness still controls whether the dialog can offer a purchase. No billing switches, server enforcement configuration, or production ownership changed in this local update.

Setup theme options are labeled “Premium.” Selecting an unowned theme opens the Fun Pack upgrade dialog and keeps the previous theme; starting a game also checks Fun ownership independently of database enforcement. Guests can browse the options but cannot apply or start new games with paid themes. Existing game snapshots and opponents viewing a host's theme remain supported.

## Shared ownership

RevenueCat verifies Apple StoreKit non-consumables. Stripe-hosted **one-time** Checkout verifies web payments. Both use the signed-in Supabase account UUID and write independent pack sources. A shared account owns the same packs on iOS and web. Never trust return URLs, client claims, or an unrelated Payment Link as proof.

`pack_ownership` has no expiry. An Apple/Stripe refund or revocation can remove that provider's entitlement; it cannot remove another payment or a complimentary grant. Verified provider snapshots are atomic and reject stale updates. Restore Purchases is available on iOS. Keep purchases with their original PickleBash account in RevenueCat settings; sign into that account to restore. Do not transfer permanent purchases merely because there is no active subscription.

Admins listed in server-only `PREMIUM_ADMIN_IDS` can give/revoke individual packs or Everything in Store, by exact username/email/UUID and recorded reason. Grants have no expiry and are independently audited; they never imply payment.

The previously agreed fixed human tester cohort (trusted playtest marker, created before **2026-09-29 05:13:25 UTC**, excluding bots) receives permanent complimentary Everything, including all three V1 packs. Active prior complimentary grants migrate likewise. Future signups do not automatically receive packs. Production migration on 2026-09-29 verified 12 cohort members, 12 permanent Everything grants and 12 audit records.

## Enforcement and social visibility

The wearer/host owns content; opponents need not own it. Host court checks run on the server. Match snapshots preserve each participant's effective selected appearance, so free opponents see paid content. Viewing someone else's outfit never requires viewer ownership. Saved design choices survive revocation, while new match/portrait rendering uses free alternatives for unowned items. Running games retain their original snapshots. Community bots retain their curated looks.

Analysis is separate: existing analysis permission and tester access continue, and saved reports remain readable after permission changes. Cosmetic purchases never grant reports. There is no analytics upsell in the pack store.

## Fun theme integration (local)

The four themes now have a local 3D implementation and live testing area; see [Fun Pack design](FUN-PACK.md). Court atmosphere and player presets remain independent. Migration `202609290005_fun_themes.sql` must precede application deployment. It adds server-owned invitation themes and Fun-specific wardrobe enforcement, preserving free guest visibility and existing match snapshots. A new rematch host without Fun gets the original court atmosphere. The migration is applied to disposable local test databases and the isolated purchase sandbox; production is unchanged. The owner accepted the current Fun models and audio for V1; Fun readiness is now true in the local catalog. Everything readiness is also true following removal of the bundle-exclusive requirement. No billing switches or production entitlements changed.

## Rollout

Production schema and the V1 store are deployed. `PACK_STORE_ENABLED=true`, `BILLING_PURCHASES_ENABLED=false` and database enforcement remains false. These are independent switches. The owner’s permanent Everything access and complimentary grant controls were verified in the live store, including ownership preservation after provider refresh. Real payment and device sandbox verification remain required before enabling purchases. Stale subscription environment settings cannot enable this store. Initial Apple launch still excludes EU; verify app and each product availability and local prices before submission. See [BILLING.md](BILLING.md) for dated setup and validation evidence.


## Dedicated Apple review account

`APPLE_SANDBOX_ACCOUNT_IDS` is a server-only list of exact account UUIDs (maximum 20). In the production environment, these dedicated non-paying accounts validate only verified App Store sandbox non-consumable transactions. Apple testing readiness also requires the legal URLs and RevenueCat verification/webhook credentials; their web checkout is always disabled. All other accounts retain production-only Apple validation and the normal payment switch. Client claims, email addresses, user metadata and notifications cannot opt an account into this list.

Review accounts use the normal game, purchase, restore and ownership code. They receive no complimentary pack or administrative rights. Keep them permanently separate from paying customers. Their sources are recorded as `revenuecat`; do not convert an account to a normal player while its test ownership remains. Before retirement, reconcile its RevenueCat source to an empty snapshot, verify access is gone, then remove the UUID from configuration. The isolated purchase sandbox retains its separate database and prior rules.
