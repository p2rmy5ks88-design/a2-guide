# Native Apple sign in

Status: all five CI workflows passed at 56395e66bb8952dcb5742ac5c5daed38d2619a78. iOS 1.0.32 is built; physical Apple-sheet/signing acceptance remains pending. Public player accounts and purchases remain paused.

The existing Capacitor 7 wrapper pins @capacitor-firebase/authentication 7.5.0. The plugin collects Apple credentials with skipNativeAuth=true; the Firebase JS adapter owns identity sign-in and linking. iOS exposes only configured Apple support. Native Google/Android provider methods remain unavailable until their platform configuration is completed. Missing token/nonce or a cancelled request cannot reach the Firebase exchange. Native account recovery continues to use the existing verified Firebase identity.

The Account & recovery setup panel includes an iOS-only Test Apple sign-in action when the native plugin is present. It opens Apple's system sheet and checks for the returned token and nonce, then discards the response. It does not call the Firebase JS SDK, create a Firebase player, move local coins, link identities or publish accounts. This is a native credential diagnostic, not server verification or a complete cloud login acceptance test.

Build scripts generate public native Firebase options using app IDs verified in the console: iOS 1:668368365590:ios:03e33bfa0fd85930a32d37; Android 1:668368365590:android:22176da5b1b292a9a32d37. They reuse the existing public project options with strict project/sender guards. Console configuration downloads did not produce a downloadable file through automation; the generated options are explicitly constructed, not represented as a downloaded file. No private Apple key is embedded. Analytics is not included or enabled. The iOS project bundles GoogleService-Info.plist and declares the Sign in with Apple entitlement.

Local validation: seven native adapter cases, native configuration project/platform guards, eleven account controller checks and ten real-browser account UI checks passed (zero page errors). The paused native diagnostic preserves the full preference/save snapshot and does not initialize the Firebase JS account controller; errors permit retry without displaying provider secrets. Existing 37 build guard checks and generated offline assets passed.

Installation acceptance: Apple sign-in requires the exact com.kenstylez.skylineestates identifier and provisioning signed by the paid developer team with Sign in with Apple enabled. An unsigned ARM64 IPA is only a re-signing input. If re-signing changes the bundle ID or removes that entitlement, the Apple test can fail even while the game runs. A simulator compilation is not device authorization proof. No signing credentials, TestFlight upload, store submission or paid purchase is used by the build checks.

Remaining launch gates: matching signed device acceptance, native Google setup, live Firebase credential exchange/reauthentication, private relay sender configuration, Apple revocation and secure deletion, trusted cloud migration and purchase readiness.

References: https://capawesome.io/docs/sdks/capacitor/firebase/authentication/ ; https://firebase.google.com/docs/auth/ios/apple ; https://firebase.google.com/docs/reference/swift/firebasecore/api/reference/Classes/FirebaseOptions

Integration findings: both platform scripts initially failed because their uploaded Windows CRLF endings made bash read an invalid pipefail option. Scripts now use LF; .gitattributes and a regression assertion preserve that on Windows checkouts. The native helper checks the installed bundle identifier before opening Apple authorization and provides a specific re-signing message if it was renamed. Keep an existing installation when changing identifiers: device-local progress does not migrate to another app ID. Sideloadly guidance: https://sideloadly.io/faq .

## Final CI evidence

- iOS 1.0.32 simulator and unsigned ARM64 iPhone builds: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40821687341 . The build confirms @capacitor-firebase/authentication 7.5.0 registration, the packaged native Firebase app/bundle IDs, Apple entitlement source and SDK 26 requirements. Artifact 12875350661 is a ZIP containing the unsigned IPA and signing notes; it expires 28 November 2026.
- Browser/gameplay: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40821687333 . Ten account checks, 25 reference-dashboard checks and 41 property parity checks passed without captured page errors. Normal UI Classic/Quick/Timed matches completed in 31/25/11 rounds. Simulation and cash/physical-bank results are retained in the workflow artifacts.
- Security: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40821687337 . Seven native credential checks, native configuration guards, eleven controller checks and 272 emulator integration checks passed. Fixture credentials are not live Apple acceptance.
- Android: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40821687317 ; desktop: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40821687319 — passed.

The browser download approval check denied an additional permanent local artifact copy because it could not establish the download origin. No bypass or alternate local retrieval was attempted after that denial. Deliver the connector-provided artifact link and stable workflow page instead.
