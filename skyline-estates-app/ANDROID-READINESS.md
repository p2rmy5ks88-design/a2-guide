# Skyline Estates — Android readiness (31 Oct 2026)

Survey of the existing Android build. Nothing here blocks or changes the iOS releases.

## Already in place

| Area | State |
|---|---|
| Build | `skyline-android.yml` builds a debug APK on every change (last runs green, 30 Oct). With `publish=true` and the keystore secrets it also builds a **signed release bundle (.aab)**. Capacitor 7, landscape-only and fullscreen patches, versionCode = run number. |
| Game | Same web game, artwork, music, rules and saves as iOS (bundle verified by `verify-bundle.cjs`). Saves are per device until accounts are switched on. |
| Firebase | Android app `com.kenstylez.skylineestates` is registered in `eko-estates`; `native-firebase-config.mjs` writes `google-services.json` at build time. |
| Sign-in code | `@capacitor-firebase/authentication` 7.5.0 and the Google provider path in `lib/account-firebase.js` (native credential, reauthentication for account removal). |
| Purchases (server) | Google Play adapter in `store-adapters.cjs`: verifies purchases with the Android Publisher API, maps owners with `obfuscatedExternalAccountId`, consumes only after durable credit (sealed-proof outbox and `delivery-worker.cjs`), and polls voided purchases for refunds. Unit-tested, **not deployed**. |
| Purchases (client) | `cordova-plugin-purchase` is installed; there is no Android purchase bridge in the game yet. |

## Remaining work (estimates are Claude's work unless marked)

| # | Task | Who | Estimate |
|---|---|---|---|
| 1 | **Play Console developer account** and identity verification. Tell Claude whether it is a *personal* or *organisation* account and when it was created. | Owner | ~30 min, then Google's verification (often days) |
| 2 | **Closed test before production (verified in Play Console Help, 31 Oct):** personal accounts created after 13 Nov 2023 need a **closed test with at least 12 testers opted in continuously for the preceding 14 days**, then apply for production access from the Dashboard (review usually about a week). Production and pre-registration stay disabled until then. Organisation accounts are not covered by this rule. | Owner recruits testers; Claude prepares the build | 14 days + ~1 week review |
| 3 | **Target API 36 (Android 16)** is required for new apps and updates from 31 Aug 2026 (verified on developer.android.com, 31 Oct; extension to 1 Nov 2026 can be requested in Play Console, so plan for API 36 now). Capacitor 7 targets API 35: upgrade to Capacitor 8 or raise `targetSdkVersion`/`compileSdkVersion` to 36 and re-test (edge-to-edge, back gesture, WebView). | Claude | 3–5 h incl. device check |
| 4 | **Accounts on Android:** add an `android-release` cloud channel (accounts and cloud save on, purchases off), and let `cloud-glue`/bundle checks accept it. | Claude | 1–2 h |
| 5 | **Google sign-in:** register the upload-key and **Play App Signing** SHA-1/SHA-256 fingerprints in Firebase, enable Google in Firebase Auth, add the web client ID to the native config, and test sign-in, linking and account removal on a device. | Owner (console fingerprints) + Claude | 2–3 h + device test |
| 6 | **Store listing:** phone and 7"/10" tablet screenshots, 1024×500 feature graphic, short and full description, **Data safety** form (mirrors iOS App Privacy: email, name, user ID, gameplay content; no tracking), **IARC content rating**, privacy URL, ads = none. | Claude drafts; owner declares | 2–3 h |
| 7 | **Play Billing (later update):** Android purchase bridge (cordova-plugin-purchase, `obfuscatedAccountId` from the server binding), Play service account with Android Publisher access stored in Secret Manager, deploy the Google adapter, schedule the delivery worker and voided-purchase poll, and run the same lifecycle tests as iOS with licence testers. Same coin packs and prices as iOS. | Claude + owner (Play Console products, service-account approval) | 1.5–2.5 days |

**Recommended path:** ship Android 1.0 like iOS 1.0, without purchases (tasks 1–6, about 1–1.5 days of work plus the 14-day closed test if it applies). Add Play Billing (task 7) together with or after the iOS payment update. The closed test can run while the iOS payment update is in review.

Sources (official): [Target API level requirement](https://developer.android.com/google/play/requirements/target-sdk), [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
