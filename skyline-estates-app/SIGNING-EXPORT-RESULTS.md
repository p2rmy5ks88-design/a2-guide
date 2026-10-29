# Signed-build verification correction — 29 October 2026

Private main run [40832935848](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40832935848) built both native targets and successfully created an Apple-signed archive for com.kenstylez.skylineestates. The verification command failed before any TestFlight export/upload. No phone retry was requested.

A definite CLI bug was found in the new verifier: codesign's optional certificate-extraction prefix must be attached to its long option with an equals sign. Passing a separate path can make codesign treat that prefix as another app operand. The corrected command uses --extract-certificates=PREFIX. Safe fixed stage names and exit codes now distinguish integrity, entitlement, profile and certificate failures without exposing raw identity/profile output.

Five new command-boundary cases exercise the full inspection sequence, correct certificate output, early unsigned rejection, private diagnostic redaction, missing profile Apple entitlement and wrong Firebase project. Together with the existing cases, all 22 tests pass. Reintroducing the old argument form makes the full-inspection regression fail at certificate extraction, reproducing the command error locally. Actual signed-archive acceptance remains pending the next manual run.

Portal audit also confirmed that Sideloadly's earlier provisioning log references the older suffixed App ID, which has Apple sign-in disabled. The exact primary App ID has Apple sign-in enabled. This is a concrete configuration mismatch in the observed signing path; the installed IPA's final signature/profile has not been extracted, so it is a strong lead rather than conclusive device-level root-cause proof.

Validation plan: run the existing explicit manual iOS workflow on this PR branch with the already approved private TestFlight option. This runs the 22 tests on macOS, existing native guards and Xcode 26 compilation, then verifies the actual signed archive before upload. Duplicate automatic unsigned package builds are skipped for this verifier-only change; no game/native runtime source changed. Merge only after the candidate's manual validation result is known.

Public game accounts, coins and saves remain unchanged; payments and public App Store release remain paused.

## Actual signed candidate result

[Candidate run 40854278781](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40854278781) on 98f26fee19f81a74f21e1859f179841c8301c442 passed all 22 tests on macOS, both native builds, archive creation and the actual signed-app verifier. The log confirms the exact team/App ID, Apple entitlement, certificate membership, unexpired profile and Firebase options passed. This resolves the verifier's certificate-export bug.

TestFlight export then failed with Apple's cloud-signing permission error and missing distribution identity/profile. No binary reached TestFlight. The already approved Developer-role API key is retained; its access has not been broadened.

A dedicated local Apple Distribution identity and App Store provisioning profile are being prepared under the owner's existing approval. The private upload step now supports their encrypted repository secrets, imports them into a temporary keychain after archive verification, selects the exact profile and certificate for manual export, requests internal-TestFlight-only delivery and cleans temporary credentials/profile copies. Eight distribution-profile regressions pass locally, alongside the 22 signing cases and 38 pipeline guards. Actual manual distribution import/export still requires the certificate/profile and a further candidate run.

The public CSR and encrypted private key are prepared outside the repository. The local key password is protected using Windows DPAPI for the current user. Apple Developer's browser session expired; the accessible Developer login is still waiting for completion, independently of the signed-in App Store Connect session. No distribution certificate/profile has been issued or imported yet.

## Dedicated distribution setup completed

The owner completed the separate Developer login. A dedicated Apple Distribution certificate and primary-app App Store profile were issued, both expiring 29 October 2027. Local checks verified the certificate matches the encrypted private key and paid team; profile metadata matches the exact app, Apple capability, store distribution type and new certificate. The PKCS12 bundle, password and profile are now encrypted Actions secrets. Local password backup uses Windows DPAPI; its temporary plaintext copy was removed after encrypted-backup verification and secret storage.

The new candidate uses manual signing for both archive and export, applying the profile only to the App target and importing the identity into an isolated temporary keychain. It no longer needs a new automatically generated development certificate for each signed run, or broader API/cloud-signing access. Export requests internal-only TestFlight delivery and preserves the CI version/build number. Temporary profiles, keychain and API-key files are cleaned up afterward. Actual Mac import, archive, export and upload still require the next candidate run; no upload success is claimed yet.

## Exact profile identifier correction

Run [40858678683](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40858678683) passed all 30 signing/profile tests, imported and matched the dedicated identity/profile, and configured only the App target. Archive then stopped at profile lookup. Inspection of Apple's downloaded profile showed its UUID contains lowercase letters, while the installer had uppercased it.

Preserve the UUID exactly as issued, including spelling/case, in the installed filename, export options and cleanup manifest. Xcode settings now use the actual profile name plus the original UUID. Three added regressions cover lowercase round-trip preservation, required safe profile names and cleanup using Apple's original lowercase identifier. All 33 signing/profile tests pass locally; actual archive/export acceptance of this correction remains pending the next manual run. Apple's build-settings reference allows a profile name or UUID; this change avoids altering the UUID rather than asserting UUID specifiers are unsupported.
