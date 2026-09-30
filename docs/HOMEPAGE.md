# Public homepage and game entry

Local implementation, not yet deployed. The public web root `/` shows marketing content to everyone, including signed-in players. Browser play starts at `/play`; `/play/` also works on the production server. Mobile store links are not available, so the homepage uses browser-play links and an informational “Coming soon” card, with no inactive store buttons or signup form.

`index.html` contains the crawlable marketing content, using existing unmodified artwork and shared design tokens through scoped `src/homepage.css`. `src/bootstrap.ts` selects marketing or lazy-loads `src/game-bootstrap.ts`, which retains the existing game, challenge, and admin entry behavior. The homepage does not initialize authentication, game modules, product analytics, replay, or notifications. No session check redirects signed-in homepage visitors.

`src/entry-route.ts` recognizes explicit legacy game parameters and account callback fragments at the root and normalizes their path to `/play`, preserving query parameters and fragments. Campaign parameters and homepage section anchors remain on the homepage. `/challenge/:token`, legacy `#guestChallenge` links, and `/admin/analytics` remain supported. Native Capacitor launches go directly to the game. The installed web-app manifest retains its existing `/` identity and scope, but starts at `/play?multiplayer=1`; older installed root launch URLs with game parameters still work. New game share and web push links point to `/play`.

Before publishing, verify Supabase's allowed email redirect URLs include `https://picklebash.app/play` (and approved local/native origins). Existing root callback URLs remain recognized. Auth credentials and saved player data are unchanged. Real email round trips and physical iOS launch/push behavior need release smoke checks; they are not established by routing unit tests. Keep server support for both `/play` paths when deploying; Vite's development fallback alone is not sufficient.

To add store downloads later, replace the informational card with real, tested App Store / Google Play links and choose the primary call to action. Do not claim a store release before it exists.
