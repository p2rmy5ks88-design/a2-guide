# Native Apple failure diagnostics

Owner evidence: iOS 1.0.32 shows Apple's sign-in sheet, then the game displays a generic error after Continue. The underlying authorization failure is not yet identified; native Apple acceptance is not passed.

Confirmed observability defect: pinned authentication plugin 7.5.0 maps only Firebase NSError codes. Apple's authorization domain uses separate codes, so those failures lose their code before reaching the existing friendly-message filter. The screenshot alone cannot establish a missing entitlement, bad account or malformed credential.

A narrowly guarded postinstall patch preserves only Apple-domain codes 1000–1006, with a fixed unknown value for future codes. Other domains still use the plugin's existing Firebase mapping. A shared Swift implementation is compiled and tested directly on the Mac runner, then installed into the pinned plugin before native project creation. The patch checks dependency version, exact insertion point and idempotence; upstream drift fails the build.

The UI uses fixed messages and codes only. App identity, missing token, missing nonce, cancellation and authorization failure are distinct. Raw messages, userInfo, email, tokens and provider data are never copied into these diagnostic messages. Missing security values still fail closed; no Firebase player is created by the paused native test. Unknown native error details are discarded.

Local checks: nine native adapter cases, eleven account controller checks, eleven browser account checks with zero captured page errors, patch drift/idempotence guards and 37 build guards passed. All five CI workflows passed at 548db921ba9a59be9dedd10b9e99858b81eda7f7. The Mac runner executed ten Swift error-domain/privacy cases; the patched plugin built for simulator and ARM64 iPhone as iOS 1.0.33. Physical retest remains required.

This change fixes the masked-error reporting, not a claimed device-signing root cause. No signing permissions, live rules, paid services, store submission or account/payment activation changes are made. Existing coins, collection, saves, artwork and gameplay rules remain unchanged.

Upstream source reviewed at tag @capacitor-firebase/authentication@7.5.0: packages/authentication/ios/Plugin/FirebaseAuthenticationHelper.swift and Handlers/AppleAuthProviderHandler.swift in https://github.com/capawesome-team/capacitor-firebase .

## Final evidence

- iOS 1.0.33: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40825177244 — ten Swift cases, patch execution, simulator/device packaging and SDK 26 checks passed. Unsigned IPA ZIP artifact: 12876199043.
- Browser: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40825177214 — full suite passed, including eleven account checks and safe error-code retry/progress cases.
- Security: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40825177120 — nine native adapter checks and 272 emulator integration checks passed.
- Android: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40825177112 ; desktop: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40825177102 — passed.

The owner confirms signing with the same paid Developer account. The installed provisioning profile contents have not been inspected. A phone retest must report the new short code or successful credential return before choosing a root-cause fix; Apple login remains unverified.
