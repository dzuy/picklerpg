# Rivalry text sharing

Local implementation: completed, non-abandoned games with validated rivalry history expose **Share rivalry** as a secondary action. Rematch remains primary.

The modal previews the exact immutable text before any platform share/copy operation. It includes the final score and series **at that game's completion**, written from the sharer's perspective. Personal strategy, email, account IDs, private checkpoints and roster data are never serialized. Names render as text and control characters are removed.

The default message links to the normal public Open Play entrance. An explicit checkbox instead includes the actual completed-game URL, labeled players-only. This is not a public replay or bearer invitation: existing participant authorization still applies. Signed-out players must sign in; unrelated accounts cannot retrieve the match. The opponent can reopen the completion screen and use its existing idempotent Rematch action. No invitation is created just by opening or sharing the message.

Native Share runs only after pressing Share. Copy message uses the existing clipboard/selection fallback. Cancellation is not success and does not silently copy. Errors leave the exact text selectable. Native API resolution is labeled “Share action completed,” not proof of delivery. Localhost previews warn that their links only work on the same computer.

Validation: formatting and orientation, private-field exclusion, invalid/abandoned result rejection, native cancellation/failure, explicit copy and no-native fallback unit tests. Browser-tested on a real seeded completion, with working Copy, actual match URL and a 390px layout.

Still required before the full Phase 8 exit gate: production rollout; physical iPhone/Android native share and signed-out sign-in return checks; share/link-open/accepted-rematch telemetry with stable IDs and no prose. No public result snapshots, share images, automatic messaging, or strategy sharing in this slice.
