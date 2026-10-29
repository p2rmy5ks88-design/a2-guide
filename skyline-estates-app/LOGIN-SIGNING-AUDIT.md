# Login and signing audit — 29 October 2026

Status: not resolved end to end. Do not ask the player to install another unsigned diagnostic-only IPA.

## Confirmed observations

- The installed diagnostic reports APPLE-1000 after Apple's sheet. This is an Apple authorization failure before the Firebase credential exchange. The generic code alone does not identify its cause.
- The current CI creates an unsigned IPA. It checks the source entitlement file, not the signature/profile produced when Sideloadly re-signs it.
- Sideloadly shows the paid Developer team and exact configured bundle ID, automatic bundle-ID handling enabled, and custom entitlements off. Its successful installation log is not proof of an Apple-enabled final signature. No installed signed app or profile has been extracted or inspected.
- Apple lists expired manual provisioning profiles. Managed profiles may be omitted from that list; this does not prove the installed profile is expired.
- This repository has no GitHub Actions signing secrets. No new signing certificate or API key was created during this audit.
- Firebase Email/Password, Google, Apple and Anonymous providers are enabled. The live game's GitHub Pages domain is missing from Authentication > Authorized domains. This is a confirmed future web OAuth blocker, independent of native APPLE-1000.
- Native Firebase bundle/project IDs match the registered iOS application. The Firebase iOS App Store ID and Team ID metadata fields are blank; those fields alone do not explain a native Apple-sheet authorization failure.

## Changes

Added a macOS signed-app preflight using Apple's codesign verification and CMS profile decoder. It checks the actual signature and embedded profile, exact application/team IDs, Apple capability on both sides, profile expiration, signing certificate membership, development-device presence, debug permission agreement, and bundled Firebase identity. Raw profile contents and device identifiers are not logged. Source-only or unsigned apps cannot satisfy this check.

The existing explicitly gated signed archive path now runs this preflight before exporting/uploading. Signing secrets are scoped to that step instead of being exposed to dependency-install and ordinary build steps; missing signing configuration fails explicitly, and temporary API-key files are cleaned up. Ordinary PR builds remain unsigned build tests and must not be described as Apple-login acceptance tests. This change does not activate the publishing path or supply signing credentials. The validator checks the archive app; Apple's final TestFlight processing and a phone acceptance test remain separate requirements.

## Account path matrix

| Path | Evidence | Remaining acceptance requirement |
| --- | --- | --- |
| Email registration/sign-in | Controller and previous real Firebase Auth emulator tests pass | Controlled live verification and recovery email delivery |
| Password recovery | Completed reset tested with independent emulator client, replay rejected in previous CI | Live email delivery and return to app |
| Provider linking | UID preservation, collisions and concurrent mutation guards pass | Live provider linking on an Apple-signed app |
| Native Apple | Credential-only bridge, raw nonce and safe failure paths pass automated tests | Properly signed app + successful Apple credential return + Firebase exchange |
| Web Apple/Google | Adapter implemented; Firebase providers enabled | Authorize the game's exact domain, then live OAuth acceptance |
| Native Google | Intentionally unavailable | Correct native OAuth clients/URL schemes, Android signing fingerprints and native acceptance |
| Account removal | Deliberately blocked without secure service | Server-owned data removal and Apple token revocation before activation |
| Wallet/save recovery | Device progress protected by tests; cloud activation gated | Secure service deployment and explicit migration acceptance |

Public game accounts and paid purchases remain paused. Enabling providers in the console does not make these paths production-ready.

## Local validation

- 17 signing regression cases passed: valid development/distribution, missing Apple permission in either signature/profile, renamed/wildcard app IDs, wrong teams, expired/near-expiry profile, certificate mismatch/missing certificate, missing development devices and debug-permission disagreement.
- 38 build pipeline guardrails passed.
- 11 account-controller and 9 native-account checks passed.
- 11 phone-browser account checks passed, zero browser errors; device progress unchanged across account failures, recovery and sign-out.
- Native Firebase identity checks and pinned native Apple error patch tests passed.
- The new macOS app inspection has not yet been run on a properly signed build. These tests cannot prove Apple's live authorization service accepts it.

## One consolidated next acceptance build

Preferred: privately test an Apple-team-signed build through TestFlight, avoiding Sideloadly re-signing. This needs explicit approval for private TestFlight delivery and the exact signing/API credential setup before creating or storing credentials. Do not publish to the public App Store. An alternative is a development-signed IPA for an already registered phone, with secure private delivery because its embedded profile contains registered device identifiers.

Before another phone test: verify the final signed archive, inspect the configured Apple App ID/capability, authorize the web domain with approval, complete native-provider configuration, and record the account/removal/migration gates explicitly. Ask for one structured acceptance session after those checks, not repeated error-label-only builds.

Do not uninstall the existing app or change its bundle ID; keep local progress until migration/recovery has been accepted.

## Primary references

- [Apple: provisioning profiles and signed entitlement allowlists](https://developer.apple.com/documentation/technotes/tn3125-inside-code-signing-provisioning-profiles)
- [Apple: diagnosing entitlement issues](https://developer.apple.com/documentation/BundleResources/diagnosing-issues-with-entitlements)
- [Firebase: native Apple authentication, nonce and revocation](https://firebase.google.com/docs/auth/ios/apple)
- [Firebase: Apple web authentication setup](https://firebase.google.com/docs/auth/web/apple)
