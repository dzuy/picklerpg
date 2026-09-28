# TestFlight release record

## 2026-09-28 — 1.0 (6)

- App: PickleBash, bundle `com.picklebash.app`, App Store Connect app `6815925616`, Apple team `MB6W7WXD2R`.
- Source: deployed commit `2726b4e37ce8564d927ec776230c1c4ded3c516d`. Built in an isolated managed worktree; newer uncommitted changes in the main working folder were deliberately excluded.
- Build: Xcode 26.6, Release, generic iOS device, marketing version `1.0`, build number `6` supplied as archive build-setting overrides. The project's older checked-in build number was not used or edited.
- Production web assets were rebuilt and synced with `VITE_POSTHOG_ENABLED=true`, `VITE_ANALYTICS_ENVIRONMENT=production`, `VITE_POSTHOG_REPLAY_ENABLED=true`, and `VITE_APP_VERSION=1.0(6)`. Only public `VITE_` client configuration was copied into the isolated build; server secrets were not copied.
- Verified archive bundle ID/version/build, embedded analytics version, PostHog host, and production backend URL. Native archive succeeded.
- Uploaded with `xcodebuild -exportArchive`, automatic signing, `method=app-store-connect`, `destination=upload`, existing team, and `manageAppVersionAndBuildNumber=false`. Xcode reported `Upload succeeded` and `EXPORT SUCCEEDED` at approximately 09:14 Costa Rica time.
- App Store Connect visibly lists 1.0 (6) as Processing. Upload acceptance is not yet tester availability or App Review approval.
- Archive: `/tmp/PickleBash-1.0-6.xcarchive`; build and upload logs: `/tmp/picklebash-ios6-archive.log`, `/tmp/picklebash-ios6-upload.log`. These temporary paths are not durable release storage.
- Physical-device gameplay, rematch, identity, replay masking, and production push checks still need to be performed on the installed TestFlight build.

[TestFlight builds](https://appstoreconnect.apple.com/teams/69a6de6e-ab8b-47e3-e053-5b8c7c11a4d1/apps/6815925616/testflight/ios)

## Next release

Read [iOS build instructions](IOS.md), [analytics configuration](ANALYTICS.md), and [native push requirements](NATIVE_PUSH.md). Check the latest build number in App Store Connect before archiving; do not reuse 6. Build from an explicit reviewed revision, configure production client variables before syncing, and verify the archive contents before uploading. Confirm processing, export-compliance state, and the intended existing tester groups in App Store Connect; do not assume upload success means testing is enabled.
