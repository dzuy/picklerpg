# Premium access

Premium is access to PickleBash’s growing collection of special courts, player cosmetics, and enhanced features such as AI Full Game Analysis. **PickleBash+** is the name currently used for Premium cosmetic rows; it describes the same product concept, not a separate membership.

We are building the Premium feature collection before implementing billing or in-app purchases. A Premium label identifies an intended benefit. It does not mean that purchases are available or that access is already enforced everywhere.

This document is the shared product reference for new Premium features. It distinguishes the intended offering from the access mechanisms implemented today.

## Current feature collection

| Feature | Standard / free | Premium | Access today |
| --- | --- | --- | --- |
| Courts | Hemingway (`forest`), Arizona Desert (`arizona`), The Beach (`venice`) | Skyline, Glowball, La Fortuna, Winter Wonderland, Autumn Park | Premium courts are labeled and remain selectable. |
| Player cosmetics | Standard appearance choices, shared color palettes and custom color controls, and removal options such as None / Remove outfit | Selected hairstyles, facial hair, expressions, headwear, clothing, glasses, outfits, accessories, and paddle appearances | Standard and PickleBash+ rows are both selectable. |
| Full Game Analysis | The endscreen and game-history entry points and locked feature preview | An AI-written, game-specific breakdown: matchup story, rally highlights, signature shots, opponent responses, and a practical rematch tip | Generation requires a trusted server-side feature entitlement and a configured analysis service. Saved game reports are reused; reading them retains entitlement and participation checks but does not require AI availability. |

The court classification lives in [`src/locations.ts`](../src/locations.ts): new courts are Premium unless explicitly included in the free collection. Exact cosmetic assignments live in [`src/player-customization-tiers.ts`](../src/player-customization-tiers.ts), with presentation rules in the [style guide](STYLE-GUIDE.md). Use these code lists rather than maintaining duplicate item-by-item lists here. A hidden cosmetic’s visibility is separate from its tier.

Current Premium courts and cosmetics change presentation, not court physics, player ratings, or shot strength. AI analysis adds post-game insight; it does not alter the completed game’s score or XP. Premium access is separate from earned gameplay progression.

## Access before billing

Keep four concepts distinct:

- **Classification:** whether a feature belongs to Standard or Premium.
- **Availability:** whether the feature is implemented, enabled, and operational. An unavailable AI service cannot generate a report even for an entitled account.
- **Entitlement:** whether the account may use a restricted feature.
- **Billing:** how a purchase grants, renews, or removes an entitlement. This is not implemented yet.

There is currently **no shared account-wide Premium entitlement**. Courts and cosmetics are classified without subscription enforcement. Full Game Analysis uses the interim, feature-specific Supabase `app_metadata.full_game_analysis === true` flag. It must be granted through trusted administration; user-editable metadata is not an access authority. Enabling this flag grants analysis access only—it is not proof of a purchase or a global membership.

Analysis also requires an authenticated participant, a completed game, usable recorded gameplay, and the configured backend. Partial recordings must be labeled. Operational request limits and caching are implementation safeguards, not an advertised Premium usage allowance. See [Full Game Analysis](FULL-GAME-ANALYSIS.md) and [gameplay recording](GAMEPLAY-RECORDING.md).

Continue building and testing Premium features before billing is ready. Keep the existing court and cosmetic selection behavior unless access enforcement is explicitly part of a change. Do not add a pretend checkout, claim an account has paid, or advertise an unimplemented purchase flow.

## Direction for eventual paid access

The intended product is a shared Premium access concept covering the growing feature collection, rather than unrelated purchases inferred from individual badges. A future implementation should provide a central, server-trusted account entitlement that feature checks can use. Billing and platform purchase verification should update that entitlement; UI labels or client-controlled flags must not grant access to protected server work.

When that system is introduced, explicitly map or migrate the temporary analysis flag and define how development and manually granted access work. Do not silently reinterpret the existing feature flag as a paid subscription.

The following remain undecided and must be specified before monetization:

- Price, subscription versus one-time purchase, trials, and launch timing.
- Platform purchase support, account linking, restore purchases, and cross-device access.
- Renewal, cancellation, expiration, refunds, and any grace period.
- What happens to saved Premium appearances and selected courts when access ends.
- AI usage allowances, long-term report retention, and any future changes to entitlement requirements for saved reports.
- Which future features join Premium and whether any exceptions or separate offers are needed.

Nothing in the current labels promises permanent ownership, unlimited AI requests, or a particular billing model.

## Adding a Premium feature

1. Record the feature and its intended Standard / Premium boundary in the collection above. Update its canonical code classification where applicable.
2. State whether it is only labeled, available for testing, or actually restricted. Treat rollout availability and entitlement as separate checks.
3. Use the same Premium / PickleBash+ concept in consumer copy. Explain the benefit plainly; show a truthful preview when access is locked.
4. Enforce restricted server operations on the server. Document any temporary entitlement and how it will connect to shared Premium access later.
5. Document dependencies, failure behavior, and any feature-specific open decisions. Test access boundaries when adding enforcement.

Update this reference when the collection or access policy changes so design, implementation, and future billing work use the same definition.
