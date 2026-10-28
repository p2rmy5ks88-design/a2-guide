# Skyline Estates mobile app (iOS and Android)

The native apps wrap the web game in `../skyline-estates/game.html` with [Capacitor](https://capacitorjs.com). Any change to the game is picked up by the next app build.

## Automatic builds
Pull requests and pushes to `main` that change the game, bundled assets, shared audio/Firebase configuration, app wrapper or workflow run build checks. They do not publish releases or use signing credentials. Manual runs also default to build-only.

| Workflow | Build-only result |
| --- | --- |
| **Skyline Estates Android** | Debug APK as an Actions artifact. |
| **Skyline Estates iOS** | Unsigned simulator app plus an ARM64 iPhone IPA for re-signing with Sideloadly, with logs/checksum as Actions artifacts. |

To publish, run the appropriate workflow manually and explicitly enable **publish**. Android then updates the sideload test release and, if signing credentials are configured, builds signed release outputs. iOS archives and uploads to TestFlight only when publishing is enabled and App Store Connect credentials are configured. Build success does not establish device, purchase or store acceptance.

Download build files from the repo's **Actions** tab › the run › **Artifacts**.

### Secrets (repo Settings › Secrets and variables › Actions)
Android (Google Play):
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

iOS (App Store), from App Store Connect › Users and Access › Integrations › App Store Connect API (key with the **Admin** role):
- `APP_STORE_CONNECT_KEY_BASE64` (the `.p8` file, base64-encoded)
- `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APPLE_TEAM_ID`

## Building on your own computer
Needs Node 20+, plus Android Studio (Android) or a Mac with Xcode 26+ and the iOS 26+ SDK (iOS).
```bash
cd skyline-estates-app
npm install
npm run setup:android   # then: npm run open:android
npm run setup:ios       # then: npm run open:ios   (Mac only)
npm run sync            # after changing the game
```

## App details
- App ID: `com.kenstylez.skylineestates` (change it in `capacitor.config.json` **before** the first store upload; it can't change afterwards)
- Landscape only, full screen, works offline, no tracking
- Online multiplayer uses Firebase Realtime Database. It switches on once `../skyline-estates/firebase-config.js` has your Firebase settings (see the web README), and stays hidden in the app until then
- Icon and splash sources: `resources/`
- Store text and answers: `STORE_LISTING.md`
- Privacy policy: https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/privacy.html

## Skyline notes
- The radio tracks and Firebase settings are copied from `../eko-estates/` when `npm run build:web` runs.
- Paid purchases are paused: the previous device-local fulfillment callback has been removed. Account linking, real store verification, a persistent wallet and fulfillment recovery must be connected and tested before ordering is enabled. See `../skyline-estates/security/ACCOUNT-WALLET-PLAN.md`. The installed Cordova purchase bridge is not the completed StoreKit 2 integration.
- CI checks the packaged game, every required local asset and all five bundled fonts before native compilation. Pipeline guards cover trigger paths and publication boundaries.


### Sideloadly iPhone testing
The `skyline-estates-ios-sideloadly-unsigned` artifact contains `Skyline-Estates-Sideloadly-unsigned.ipa`, SHA-256 and build metadata. It is an iPhone-device build, not a simulator app, and is not installable until Sideloadly signs it with your Apple ID. No signing secrets or store upload are used for build-only runs. Keep the same Apple ID/bundle identifier when updating an existing sideloaded copy to preserve its local data. Native and web local saves are separate. The existing native app remains landscape-only.

### iOS SDK requirement
CI uses the macOS 26 runner and rejects Xcode or iPhoneOS SDK versions below 26 before compilation. It also checks the linked SDK in every device binary slice. This does not raise the minimum supported iPhone OS version. No store upload occurs in pull request builds.
