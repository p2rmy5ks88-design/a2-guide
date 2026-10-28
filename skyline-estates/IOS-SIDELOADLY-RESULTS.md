# Sideloadly iPhone test IPA

Adds an unsigned ARM64 iPhone-device IPA to the build-only iOS workflow. The existing simulator check remains separate. The device product is checked for the correct bundle ID, ARM64 architecture and iOS (not Simulator) platform, and its embedded Collection/Portfolio script must exactly match the current source. The Payload/App.app archive is tested and accompanied by a SHA-256 checksum and build metadata.

Confirmed and fixed a native-packaging omission: the separate reference-redesign.js runtime module was not copied into native www. Both mobile and desktop wrappers now copy it; the shared bundle verifier checks exact bytes, and all platform trigger guards include this required input. This is necessary to include the latest Portfolio, token illustrations and mobile/profile-menu changes in the test app.

No Apple credentials are used to create this artifact. It must be re-signed with Sideloadly and the tester's own Apple ID before installation. Existing native landscape orientation is retained. Native app local saves are separate from web-browser storage. No TestFlight or store upload is enabled: the existing explicit publish=true plus configured credentials gate is unchanged.

Local: 35 pipeline guardrails passed; Workflow syntax and execution are checked by GitHub Actions. Full packaged web bytes/fonts/assets and simulator/device compilation are validated on the CI Mac, since this workspace is Windows and does not have Xcode. Final build evidence and artifact information follow after completion.
