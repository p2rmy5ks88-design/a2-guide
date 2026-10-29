# Signed-build verification correction — 29 October 2026

Private main run [40832935848](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40832935848) built both native targets and successfully created an Apple-signed archive for com.kenstylez.skylineestates. The verification command failed before any TestFlight export/upload. No phone retry was requested.

A definite CLI bug was found in the new verifier: codesign's optional certificate-extraction prefix must be attached to its long option with an equals sign. Passing a separate path can make codesign treat that prefix as another app operand. The corrected command uses --extract-certificates=PREFIX. Safe fixed stage names and exit codes now distinguish integrity, entitlement, profile and certificate failures without exposing raw identity/profile output.

Five new command-boundary cases exercise the full inspection sequence, correct certificate output, early unsigned rejection, private diagnostic redaction, missing profile Apple entitlement and wrong Firebase project. Together with the existing cases, all 22 tests pass. Reintroducing the old argument form makes the full-inspection regression fail at certificate extraction, reproducing the command error locally. Actual signed-archive acceptance remains pending the next manual run.

Portal audit also confirmed that Sideloadly's earlier provisioning log references the older suffixed App ID, which has Apple sign-in disabled. The exact primary App ID has Apple sign-in enabled. This is a concrete configuration mismatch in the observed signing path; the installed IPA's final signature/profile has not been extracted, so it is a strong lead rather than conclusive device-level root-cause proof.

Validation plan: run the existing explicit manual iOS workflow on this PR branch with the already approved private TestFlight option. This runs the 22 tests on macOS, existing native guards and Xcode 26 compilation, then verifies the actual signed archive before upload. Duplicate automatic unsigned package builds are skipped for this verifier-only change; no game/native runtime source changed. Merge only after the candidate's manual validation result is known.

Public game accounts, coins and saves remain unchanged; payments and public App Store release remain paused.
