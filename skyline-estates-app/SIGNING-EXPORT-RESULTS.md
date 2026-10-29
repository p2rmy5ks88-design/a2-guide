# Private iOS sign-in build results — 29 October 2026

**Apple-signed candidate 1.0.39 (39) uploaded successfully to App Store Connect.** This verifies signing and delivery; successful Apple authorization on the physical phone and a live Firebase account exchange are not yet claimed. Public player accounts, cloud-save migration and paid purchases remain paused.

## Delivered change

- Use the dedicated Apple Distribution certificate and App Store profile for the exact primary app ID, com.kenstylez.skylineestates, on team HS85466T3Z. The certificate/profile expire 29 October 2027. The older Sideloadly app ID has Apple sign-in disabled; the primary ID has it enabled. The installed old IPA's final signature was not extracted, so its precise device-level failure cause is not asserted.
- Apply manual signing only to the App target, leaving Pods free of app provisioning settings. Preserve Apple's profile UUID exactly, including lowercase characters; use the actual profile name plus original UUID in Xcode settings.
- Verify the actual signed archive: signature integrity, exact app/team, Apple entitlement in both signature and profile, allowed certificate, profile expiry, distribution type and bundled Firebase identity.
- Export with the explicit certificate/profile, internal-TestFlight-only delivery and the CI version/build number. The API key retains its approved Developer role; cloud-signing or Admin access was not expanded.
- Scope credentials to the explicit signing/upload step. Temporary keychain, installed profile copies, PKCS12 and API-key files are cleaned afterward. Private materials are encrypted Actions secrets; none are committed. The local encrypted backup password is protected using Windows DPAPI.

## Reproducible validation

Final candidate: 9626c8c520c6a2586893db26d16749d3320af201.

[Successful manual iOS run 40860645859](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40860645859), job 123402707667:

- Xcode 26.6 and linked iOS SDK 26.5.
- 22 signed-app/command-boundary regressions, 11 distribution-profile regressions and 38 pipeline guards passed. Ruby signing configuration syntax, pinned native error patch, native Firebase configuration and executed Swift error/privacy tests passed.
- Simulator and unsigned ARM64 device compilation passed.
- Dedicated identity import and profile/certificate matching passed.
- Manual distribution archive succeeded. Actual archive signature/profile/Firebase verification passed in distribution mode.
- Apple's upload analysis completed. The log explicitly reports “Upload succeeded”, “Uploaded App” and “EXPORT SUCCEEDED”; Apple then began processing the package. The overall job succeeded, including cleanup.

No game/native runtime source changed in this PR; the prior browser/account/stability baseline is retained. Duplicate automatic unsigned package runs were skipped for this build-tool correction; the explicit candidate workflow ran the relevant checks and native builds.

## Failures caught before another phone test

The first verification implementation passed a separate prefix to codesign's optional certificate-extraction argument. The corrected command uses --extract-certificates=PREFIX; restoring the old form reproduces the full-inspection test failure.

The first manual profile installer uppercased Apple's lowercase UUID. Preserve the original identifier in filenames, Xcode settings, export options and cleanup. Added regressions cover lowercase round-trip preservation, safe profile names and cleanup using the original lowercase UUID. Apple supports a profile name or UUID; the issue was changing the supplied identifier, not an assertion that UUID specifiers are unsupported.

Cloud distribution signing was unavailable to the Developer-role API key. The approved dedicated certificate/profile removes that dependency. The owner separately completed the Developer login needed to issue them. No further unsigned diagnostic-only phone retry was requested.

## Account readiness and phone handoff

Firebase's GitHub Pages domain is now authorized; Apple API access and the encrypted private-build setup were explicitly approved. See LOGIN-SIGNING-AUDIT.md for the tested email/link/recovery paths and remaining native Google, live provider, secure deletion/revocation, wallet and save-migration gates.

Apple's processing and private tester availability must be confirmed separately from upload success. The final phone check should use the directly signed private TestFlight build, not re-sign it with Sideloadly. Complete the Apple sign-in sheet once from Account & recovery and verify that local progress is unchanged. The current test button checks Apple credential return; it does not activate cloud saving or create a Firebase player account.

Keep the existing app installed. If installation requires removing it first, stop; current saves/coins/collections are device-local and its existing backup is inside the same app container. A safe transfer is needed before uninstalling.
