# Native Apple sign in

Status: implementation prepared; native build CI and physical Apple-sheet acceptance pending. Public player accounts and purchases remain paused.

The existing Capacitor 7 wrapper pins @capacitor-firebase/authentication 7.5.0. The plugin collects Apple credentials with skipNativeAuth=true; the Firebase JS adapter owns identity sign-in and linking. iOS exposes only configured Apple support. Native Google/Android provider methods remain unavailable until their platform configuration is completed. Missing token/nonce or a cancelled request cannot reach the Firebase exchange. Native account recovery continues to use the existing verified Firebase identity.

The Account & recovery setup panel includes an iOS-only Test Apple sign-in action when the native plugin is present. It opens Apple's system sheet and checks for the returned token and nonce, then discards the response. It does not call the Firebase JS SDK, create a Firebase player, move local coins, link identities or publish accounts. This is a native credential diagnostic, not server verification or a complete cloud login acceptance test.

Build scripts generate public native Firebase options using app IDs verified in the console: iOS 1:668368365590:ios:03e33bfa0fd85930a32d37; Android 1:668368365590:android:22176da5b1b292a9a32d37. They reuse the existing public project options with strict project/sender guards. Console configuration downloads did not produce a downloadable file through automation; the generated options are explicitly constructed, not represented as a downloaded file. No private Apple key is embedded. Analytics is not included or enabled. The iOS project bundles GoogleService-Info.plist and declares the Sign in with Apple entitlement.

Local validation: six native adapter cases, native configuration project/platform guards, eleven account controller checks and ten real-browser account UI checks passed (zero page errors). The paused native diagnostic preserves the full preference/save snapshot and does not initialize Firebase; errors permit retry without displaying provider secrets. Existing 37 build guard checks and generated offline assets passed.

Installation acceptance: Apple sign-in requires the exact com.kenstylez.skylineestates identifier and provisioning signed by the paid developer team with Sign in with Apple enabled. An unsigned ARM64 IPA is only a re-signing input. If re-signing changes the bundle ID or removes that entitlement, the Apple test can fail even while the game runs. A simulator compilation is not device authorization proof. No signing credentials, TestFlight upload, store submission or paid purchase is used by the build checks.

Remaining launch gates: matching signed device acceptance, native Google setup, live Firebase credential exchange/reauthentication, private relay sender configuration, Apple revocation and secure deletion, trusted cloud migration and purchase readiness.

References: https://capawesome.io/docs/sdks/capacitor/firebase/authentication/ ; https://firebase.google.com/docs/auth/ios/apple ; https://firebase.google.com/docs/reference/swift/firebasecore/api/reference/Classes/FirebaseOptions
