# Account wallet foundation and iOS 26 build results

Tested source: 7d9171e1ce2fe6fff5424a2aeef4a2eb52cf93c0 (PR #44).

## Confirmed behavior

- The published game currently keeps coins, XP, collections and portfolio progression on each device, not in a persistent online player account.
- Native approved-event local fulfillment was removed. Store ordering, initialization and receipt finishing are paused; existing balances, collection unlocks and saves are preserved.
- Isolated wallet foundation requires verified persistent authentication and explicit trusted store/notification verifier functions. There are no production verifiers, public wallet endpoints or active cloud-save migration. Fixture verification is not proof of Apple/Google purchase acceptance.
- Atomic global transaction ownership prevents duplicate credit and account reassignment. Refunds reverse once; refund-before-purchase tombstones prevent delayed credit. History is owner scoped. The foundation does not implement spending, refund debt recovery, starter entitlements or store acknowledgement/outbox; those are production gates.

## Validation

- Local wallet fixture suite: 14 cases passed, covering three supported provider claims, anonymous/unverified rejection, forged proof rejection, account ownership, duplicate delivery, catalog enforcement, environment/app/pending-state validation, refunds and history isolation.
- Real Auth and Realtime Database emulators: 239 integration checks passed, including five wallet cases across two independent server instances. Twelve simultaneous purchase deliveries credited once; recreated service retry credited no extra coins; refund/purchase races and refund-first delivery stayed at zero. Store verification in this suite is explicitly a fixture; Firebase authentication, transaction retries and persistence are real emulators.
- Candidate permission rules: 59 checks passed, including wallet balance write and receipt-index read denial. No live rules deployment. The four legacy-rule findings remain documented and are not fixed by this isolated candidate suite.
- SDK validator: four test groups reject old Xcode/SDK versions, simulator binaries and mixed old/new SDK slices, while accepting an older minimum deployment OS with SDK 26.
- Build pipeline guards: 37 checks passed.
- Local browser property parity: 41 cases passed with zero browser exceptions; only the purchase block changed in game.html and its audited source pin was refreshed after review.
- Local Collection/Portfolio browser checks: 24 passed with zero exceptions, including bridge injection proving paused purchases cannot initialize/order, and unchanged local preferences.
- Full HTTP/browser/gameplay CI passed: 25 reference dashboard checks, 11 private-entry and 13 waiting-room checks, the existing trusted-engine browser parity suites and 56 regression checks with 175 seeded games (100 Classic, 25 Quick, 25 timed, 25 optional-rule runs). The reference suite also passed its 48 evolved-token games. Normal-start Classic/Quick/timed matches reached natural outcomes at rounds 52/32/11; cash and building-bank checks held throughout, with no page exceptions. Per-run rounds, errors, outcomes and bank checks are retained in the stability artifact.
- Browser run: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40747585025 ; artifact: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40747585025/artifacts/12843830383
- Android debug and desktop build checks passed.

## Native iPhone output

Build-only run 40747585095 passed both simulator and ARM64 iPhone-device compilation using Xcode 26.6 and linked iPhoneOS SDK 26.5. Version 1.0.22, bundle ID com.kenstylez.skylineestates. Device platform, linked SDK, bundled UI, ZIP integrity and checksum were checked in CI. TestFlight upload was skipped. Physical-device acceptance of this new SDK build remains open; the owner's prior iOS acceptance was for the earlier build.

Unsigned Sideloadly artifact: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40747585095/artifacts/12842566812

Artifact ZIP SHA-256: 279bd6d3c23b7dfe3af811b38ef2d8ec33b17504cb074faebc86469a45a7e028

The ZIP contains IPA, IPA checksum, build metadata and SDK evidence; it expires 2026-11-27. Re-sign using Sideloadly with the same Apple ID/bundle ID to preserve local native data. No App Store submission or production account/purchase activation occurred.

Security run: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40747585167

Next work and estimates: see ACCOUNT-WALLET-PLAN.md. Account sign-in and safe linking remain the next implementation milestone (approximately 3–5 hours plus provider setup/testing).
