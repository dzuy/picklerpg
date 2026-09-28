# Project design rules

## Analytics and feature flags

Before changing analytics, flags, or building an internal dashboard, read [the analytics implementation](docs/ANALYTICS.md), [architecture decisions and dashboard handoff](docs/ANALYTICS-ARCHITECTURE.md), and [flag workflow](docs/FEATURE-FLAGS.md). Preserve event ownership, identity, privacy, and metric definitions. Update these references when behavior or deployment status changes; dated setup snapshots are not proof of current production state.

## Player-facing language

Never mention AI, language models, or related implementation jargon in player-facing copy, loading states, reports, or settings. Focus on the game, friends, and coaching. Apply this rule to generated report instructions as well as UI text. Technical identifiers and developer documentation may retain accurate implementation terminology.

## Premium features

Use [the Premium access definition](docs/PREMIUM.md) for Premium courts, cosmetics, AI analysis, and future Premium features. Keep feature classification, availability, entitlement, and billing distinct. Update that reference when the collection or access policy changes; Premium labeling alone does not introduce purchase flows or new access restrictions.

## Court thumbnails

All new or revised court thumbnails must follow the approved straight-on, centered baseline perspective. Do not use a three-quarter, isometric, diagonally rotated, or top-down view. Keep the net and baselines horizontal, the centerline vertical, and the sidelines converging symmetrically into the background.

Use the existing flat, stylized SVG illustration style and retain each court's distinctive scenery and colors. Follow the full [court thumbnail rules](docs/STYLE-GUIDE.md#court-thumbnails) and compare new artwork with the existing thumbnails before finishing.
