# Sideloadly iPhone test IPA

Adds an unsigned ARM64 iPhone-device IPA to the build-only iOS workflow. The existing simulator check remains separate. The device product is checked for the correct bundle ID, ARM64 architecture and iOS (not Simulator) platform, and its embedded Collection/Portfolio script must exactly match the current source. The Payload/App.app archive is tested and accompanied by a SHA-256 checksum and build metadata.

Confirmed and fixed a native-packaging omission: the separate reference-redesign.js runtime module was not copied into native www. Both mobile and desktop wrappers now copy it; the shared bundle verifier checks exact bytes, and all platform trigger guards include this required input. This is necessary to include the latest Portfolio, token illustrations and mobile/profile-menu changes in the test app.

No Apple credentials are used to create this artifact. It must be re-signed with Sideloadly and the tester's own Apple ID before installation. Existing native landscape orientation is retained. Native app local saves are separate from web-browser storage. No TestFlight or store upload is enabled: the existing explicit publish=true plus configured credentials gate is unchanged.

Local: 35 pipeline guardrails passed; Workflow syntax and execution are checked by GitHub Actions. Full packaged web bytes/fonts/assets and simulator/device compilation are validated on the CI Mac, since this workspace is Windows and does not have Xcode. Final build evidence and artifact information follow after completion.

## Build evidence (2026-10-28)

- Tested implementation: `285b40a7eeed8fab4ae19bff1451bce68e5c75cf` (PR #37).
- [iOS Mac build 40669088619](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40669088619): simulator and unsigned ARM64 iPhone device builds passed; `vtool` reports platform IOS, minimum iOS 14.0, SDK 18.5. Bundle ID and embedded UI byte comparison passed; IPA ZIP integrity passed.
- App version: `1.0.18` (18). [Download artifact](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40669088619/artifacts/12806913943): `skyline-estates-ios-sideloadly-unsigned`, 57,561,311 bytes, retained until 2026-11-27.
- Outer artifact ZIP SHA-256: `b2b5f5db8bd99e015075e2fe82921045ac8512634c1356cf2d33c7a8b6d35bb5`. The IPA-specific checksum and platform/build metadata are inside the ZIP.
- The first device compilation succeeded but its architecture check failed due to incorrect lipo argument ordering. Corrected to input-first ordering; the subsequent complete device/package job passed.
- Android and desktop wrapper builds passed on the same implementation. No TestFlight step ran. Physical iPhone installation remains for the tester through Sideloadly; no claim of physical-device execution is made.
- The connector returned a downloadable ZIP. Local download inspection was unavailable because the browser download permission gate rejected the operation; binary and bundle verification above was performed by the CI job.

## Install with Sideloadly

Download and extract the artifact ZIP. Connect the iPhone, drag `Skyline-Estates-Sideloadly-unsigned.ipa` into Sideloadly, select the device and sign with your own Apple ID. Follow Sideloadly/iOS prompts locally; never share Apple ID credentials in this repository or chat. Free-account signatures need renewal after seven days. See [official Sideloadly FAQ](https://sideloadly.io/faq.html). To update an existing native installation, retain the same signing account and bundle ID, and do not uninstall the old copy if its local saves are needed.

The broader [browser/gameplay stability run 40669088358](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40669088358) was still running when the IPA was delivered. It is separate from the completed native build and packaging checks; review its final result before merging PR #37.
