# PickleBash on iPhone

The iOS app is a Capacitor 8 shell around the existing Vite/Three.js build. Its bundle ID is `com.picklebash.app`. The native project uses Capacitor push notifications and app lifecycle plugins; it does not load remote application code. The compiled game is copied from `dist/` into the Xcode app when you sync.

## Build and open

1. Install Node dependencies with `npm ci`.
2. Run `npm run ios:sync`. This runs the normal production build and copies `dist/` into `ios/App/App/public/`.
3. Run `npm run ios:open`, or open `ios/App/App.xcodeproj` in Xcode.

The normal browser commands, `npm run dev`, `npm test`, and `npm run build`, remain unchanged. Run `npm run ios:sync` after changing web code before each new iPhone build. The copied web assets are generated and ignored by Git.

## Install on a physical iPhone from Xcode

1. Open Xcode and complete its first-launch setup and license acceptance if prompted. In **Xcode → Settings → Components**, install the iOS platform if Xcode says it is missing.
2. Connect the iPhone to the Mac, unlock it, and tap **Trust** on both devices if prompted. Enable **Developer Mode** on the iPhone under **Settings → Privacy & Security → Developer Mode**, then restart and confirm if iOS asks.
3. In Xcode, open `ios/App/App.xcodeproj`. Choose the **App** target, then **Signing & Capabilities**. Turn on **Automatically manage signing** and select your Apple Developer team. Keep the bundle ID `com.picklebash.app`; the team must be able to sign that ID.
4. Select your connected iPhone as the run destination in the Xcode toolbar. Wait for device preparation and signing to finish, then click **Run** (or press **Command-R**).
5. If iOS asks you to trust the developer, use **Settings → General → VPN & Device Management** on the iPhone and approve the profile, then launch PickleBash again.

## Online services

Bundled pages use the local `capacitor://localhost` origin. In the installed app, `/api` requests and shared game links use `https://picklebash.app`; in a browser, requests still use the page's own origin. Deploy the matching server changes before testing online games or model-backed shots in the installed app, because the server must allow that native origin. The existing Supabase build variables are still required for account and multiplayer features. Browser push prompts and service-worker registration stay browser-only. Native iOS push setup, turn badges, deployment, and testing are documented in [NATIVE_PUSH.md](NATIVE_PUSH.md).
