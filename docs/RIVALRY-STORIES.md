# First rivalry strategy stories

Implemented locally: two owner-only, deterministic observations about third-shot drop and drive selection. No new database migration is required. The completed-match read composes existing private, source-revision-checked summaries; raw events and opponent-private analytics do not enter the response. Lists and action receipts stay slim. Story failure does not block gameplay or the existing recap.

## Definition: rivalry-story-1

- Anchor to the viewed match's completion timestamp and ID, never later results. Use its opponent and authenticated viewer.
- Compare the latest four completed, non-abandoned games with that opponent against the immediately preceding four. Do not skip incompatible or incomplete games to find a favorable window.
- Require complete event context, one engine version, identical scoring/target/win-by settings and the same viewer athlete IDs across all eight. Athlete IDs are not a guarantee that their designs or the opponent's designs stayed unchanged; the story makes no adjustment or causal claim about those confounders.
- Each window needs at least 10 eligible opportunities, spread across at least three games. Numerators count the family selected when offered; denominators count decisions offering it, not total contacts.
- Require at least 15 percentage points of change, non-overlapping 95% Wilson intervals, and a consistent change direction after removing any single game. Wilson intervals are a conservative descriptive screen, **not** a significance claim: selections within matches are dependent and two metrics are examined. Threshold calibration remains a playtest task.
- Rank by absolute change, then stable key. Emit at most one. Suppress the same key/direction if it qualified at any of the preceding three completions. Candidate-based suppression intentionally favors silence during an unchanged run; it does not store impressions.
- Return structured counts, match IDs/timestamps, absolute and relative change (null for a zero baseline), complete coverage and observational language level. The UI strictly parses evidence, displays rounded rates, and expands to exact counts and authenticated match links.
- Read at most ten existing 50-row pages and hydrate at most eleven same-opponent summaries. If evidence is outside that bound, omit the story. Backfills/rebuilds can revise history and therefore regenerate a different story; identical source data gives identical results.

## Verification

- Production test game `5ad458f3-1696-41dd-badb-cc840980c325`: completed, not abandoned, version 10; exactly 10 unique complete selection events; both strategy summaries report 10/10 full coverage, with 6 and 4 viewer selections. The normalized rivalry contains three games. Read-only verification performed September 18, 2026.
- Pure/service tests cover strong change, missing context, low samples, unchanged histories, one-game anomalies, incompatible cohorts, stable ranking, repeat suppression, malformed evidence, owner-scoped loading, unrelated-reader rejection, and failure isolation.
- Local UI fixture: `/tests/browser/story-preview.html` on the rivalry preview server. Explicitly simulated evidence; example match dates are non-interactive because these are not seeded playable matches. The preview links to the playable test index instead.

## Remaining release work

Production deployment and genuine eight-game qualifying-history acceptance remain open. Check the completion layout on physical phones and the story's readability with both players. Story shown/expanded telemetry, calibrated thresholds, other story families, shared opponent comparisons, and outcome/streak associations are not included in this slice. Sharing follows separately; these personal observations are not automatically shared with the rival.
