# Skyline Estates mobile app (iOS and Android)

The native apps wrap the web game in `../skyline-estates/game.html` with [Capacitor](https://capacitorjs.com). Any change to the game is picked up by the next app build.

## Automatic builds
Every push to `main` that touches the game or this folder runs two GitHub Actions workflows:

| Workflow | What you get |
| --- | --- |
| **Skyline Estates Android** | A test APK you can install on any Android phone. With signing secrets set, also a signed `.aab` for Google Play. |
| **Skyline Estates iOS** | A check that the iOS app compiles. With App Store Connect secrets set, a signed build uploaded to TestFlight. |

Download build files from the repo's **Actions** tab › the run › **Artifacts**.

### Secrets (repo Settings › Secrets and variables › Actions)
Android (Google Play):
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

iOS (App Store), from App Store Connect › Users and Access › Integrations › App Store Connect API (key with the **Admin** role):
- `APP_STORE_CONNECT_KEY_BASE64` (the `.p8` file, base64-encoded)
- `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APPLE_TEAM_ID`

## Building on your own computer
Needs Node 20+, plus Android Studio (Android) or a Mac with Xcode 16+ (iOS).
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
- In-app purchases use `cordova-plugin-purchase` (works in Capacitor). Create the four consumable coin products listed in `STORE_LISTING.md` before testing purchases on a device.
- The GitHub workflows `skyline-ios.yml` and `skyline-android.yml` only run when started by hand (Actions → Run workflow).
