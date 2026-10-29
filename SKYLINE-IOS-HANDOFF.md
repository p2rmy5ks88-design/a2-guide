# Skyline Estates — iOS release handoff

Updated 29 October 2026. Prepared for continuation in Claude Code or another coding environment. Verify repository state and current CI before making changes; this file is a handoff, not evidence that unfinished features work.

## Owner decisions and objective

Finish Skyline Estates for a public **iOS** release with real accounts, a unified cloud wallet/progress sync, verified StoreKit purchases, recovery and deletion. **Android publication is deferred.** The owner explicitly chose to **wait for one unified cloud wallet**, rather than launch with separate earned/purchased balances. Preserve existing coins, collections, token stages and saves. Paid purchases remain paused until integration and real sandbox tests pass. Most recent revised estimate: 8–16 engineering hours plus Apple processing/review; reassess after the backend and migration design is concrete.

Preserve the approved 40-space board, 3D scenery, artwork, UI and custom game rules. Use narrowly scoped PRs. Owner authorized tested merges/web updates and wants eventual public release, but this does not bypass required confirmations for new credentials, live permissions, contracts or financial actions. Do not publish an untested build or silently enable billing. Keep resource use focused and give estimates for each task. Do not use subagents unless explicitly requested.

## Branches and PRs

Repository: p2rmy5ks88-design/a2-guide.

- Main last verified: 3ed9d3b575eca65eef2f2208226072db9ac62764.
- Draft PR #51: https://github.com/p2rmy5ks88-design/a2-guide/pull/51
- PR #51 branch: skyline-public-release-commerce. Latest source commit checked at handoff: **9eb5b70c80b2550804229ed44559415cddd89f79**. PR is not merged or deployed. Read fresh state before proceeding.
- New working branch: **skyline-ios-accounts-storekit**, based on PR #51. A stacked draft PR holds this handoff and the initial native StoreKit source. Merge/rebase the dependency deliberately; do not drop #51 content or merge unfinished payment code merely because unrelated CI is green.
- Tracking issue #2 remains open. Its body is close to GitHub's size limit; replace its current summary rather than append indefinitely. Do not close it on the basis of an isolated test.

## Completed and tested

Private TestFlight **1.0.39 (39)** was signed correctly and physically accepted by the owner: native Apple sign-in returned a credential. This diagnostic does **not** create a Firebase player or sync a wallet. The old Sideloadly copy had an Apple authorization failure; preserve old installations/saves rather than uninstalling to migrate.

PR #51 adds:

- Purchase-delivery coordinator at skyline-estates/lib/purchase-delivery.js. It consults verified durable server delivery before native finish, suppresses concurrent duplicate callbacks, checks account switches and supports recovery. 14 unit tests pass. It is **not connected to native billing**.
- Coin pack drafts: **600 / 1,500 / 4,000 / 10,000**. Ordinary gameplay earnings and rarity upgrade gates are unchanged. Server keeps legacy 500/1,200/3,000/7,000 SKU values for old receipts/refunds. Existing displayed USD prices are draft placeholders, not approved live store pricing. Use native localized prices when live. The starter bundle is not a supported server product and must stay disabled.
- Rotating UTC daily event (Property Day, Rent Rally, Builders' Day), best progress within a completed game, once-per-day device reward (200/250/300), saved with the match receipt. Existing missions, free wheel and streaks remain. This is local progression, **not trusted online currency evidence**.
- Read-only leaderboard refresh (no score write on opening rankings), season/update labels, row validation, stable ties, navigation/refresh guards. Existing scores are preserved and explicitly device-reported. Trusted competitive outcomes are not live.
- Original owner songs Bad, Priority, Skyline Estates, Dum Da Dum Answer Am. Skyline FM has **17 tracks**. Shared assets are under eko-estates/audio/fm and are copied by native packaging. Chrome decodes the four new MP3s; uploaded Git blobs match originals. Existing shuffle/crossfade retained.
- Refreshed generated index/offline assets and CJS text hash normalization. Privacy copy now accurately says purchases/accounts are paused; it needs another revision to match the final deployed service before activation.

Local checks on the content milestone: 9 new content regressions; phone 390px/desktop 1280px UI and ranking refresh; 100 seeded browser simulations (seed 20261029), rounds 18–301, 99 last-player outcomes, 1 simulation round-limit, 0 errors/cash/house-bank/hotel-bank failures; 41 browser property parity cases; 61 property kernel cases; 22 token economy cases; 14 wallet cases; 18 delivery/refund/spend cases; 9 store adapter fixture cases. New final song had another 41 browser property parity checks and decoding at 225.6 seconds. Game hash pin now **0b6c34771d492f754828c7b2c8dafe81989bca99e7c2b8f58cba00923bd96ff1**; source changes require review and browser parity before repinning.

Remote checks on content commit d9686496 passed Android/desktop/security/iOS and the isolated SDK 27 job. SDK 27 job 40900515331 built both simulator and ARM64 with **Xcode 27.1 / iOS SDK 27.1**, checking the actual device binary SDK. The latest final-song commit has fresh runs; at last check Android, desktop, security and SDK 27 pass, normal iOS and full stability are still running. **Read current results; do not assert all green.** New Swift WIP described below has not been compiled by those jobs.

Primary reports: skyline-estates/RELEASE-CONTENT-RESULTS.md and skyline-estates/security/PUBLIC-RELEASE-CHECKPOINT.md. Older reports are historical; newer owner decisions in this handoff take precedence.

## Unfinished native work saved in this branch

Four new Swift source files under skyline-estates-app/native:

- SkylineStoreProducts.swift: new sale SKU allowlist, legacy recovery SKU allowlist, opaque UUID validation.
- SkylineStoreProducts.test.swift: standalone validation fixtures (not yet compiled).
- SkylineStoreKitPlugin.swift: draft Capacitor StoreKit 2 methods products, purchase, unfinished, finish; passes server-generated appAccountToken, returns locally verified JWS, handles pending/cancelled, listens for updates and does not grant coins locally.
- SkylineBridgeViewController.swift: draft custom Capacitor controller registration.

**These are work in progress. Ruby project setup adds the Swift sources, custom storyboard controller and iOS 15 App target minimum. macOS CI compilation now passes, including SDK 27 compatibility, but the bridge is not yet connected to the live account/wallet service or shop UI and is not release-ready.** Do not enable purchases based on their presence. Review Swift actor isolation and listener/recovery behavior; native finish's client Boolean is not independent proof of server fulfillment, so the server/JS coordinator contract remains essential. Verify the new registration using the Ruby project-generation step and actual generated storyboard, compile the standalone product tests, and run actual SDK 26/27 builds. Do not change the already-working Apple entitlements/team/profile accidentally.

The active design calls for StoreKit 2 signed JWS -> authenticated server verification (including fresh Apple transaction query and owner binding) -> atomic grant -> durable delivery lookup -> native finish. Never use an unsigned receipt decoder as a verifier, never grant PREF.coins from an approved callback, and never finish a queued transaction before durable delivery.

## Existing account/wallet code map

- skyline-estates/lib/accounts.js: account UI, Apple credential-only bridge, accounts disabled unless EKO_ACCOUNTS.enabled is explicitly true. Online configuration is absent today.
- skyline-estates/lib/account-firebase.js: Firebase JS credential exchange/linking; removal is blocked until config.deletePlayer exists. Current code lacks end-to-end Apple revocation/data deletion wiring.
- skyline-estates/lib/account-controller.js: serializes mutations, protects UID/link collisions and sign-out-first switching.
- skyline-estates/security/service/wallet.cjs: pure idempotent credit/refund/spend reducers, canonical SKU values, spent-refund debt, ownership/transaction replay fences.
- firestore-wallet.cjs: scoped Firestore transactions/history/delivery; wallet-auth.cjs: revoked-token checks and persistent verified identities.
- account-bindings.cjs: stable server-issued Apple UUID/Google opaque binding per UID. Never trust caller ownership IDs.
- store-adapters.cjs: Apple signed-data verification plus current Server API query, Google authenticated verification; Apple refund notifications must be signed.
- purchase-vault.cjs and delivery-worker.cjs: encrypted Google proofs and leased/retryable outbox. Android rollout deferred; do not rip out existing tests.

These are substantial **foundation prototypes**, not a deployed production account/wallet service. No production entrypoint/deployment has been activated. Do not deploy prototype deny-all Firestore rules over unrelated existing project data.

## Next implementation sequence

1. Inspect applicable repository instructions and current PR/CI. Finish the native StoreKit registration/JS bridge and fixture tests, while retaining the purchase pause.
2. Design and implement the **single unified server-owned wallet/profile** with explicit revision/conflict handling, idempotent operations, durable inventory, account/provider linking and safe local backup/export/recovery. Do not create two visible balances. Do not simply upload arbitrary PREF.coins and call it trusted purchased currency. Define a reviewed one-time legacy migration policy, new earned-game receipt authority, offline queued outcomes and retry semantics. Do not sum the same balance across devices or overwrite a local save at sign-in.
3. Implement a deployable authenticated service using the existing scoped wallet/verifiers, recent-auth account deletion, associated data removal and Apple token revocation. Native bridge exposes credential.authorizationCode; its revokeAccessToken helper delegates to Firebase Auth revokeToken(withAuthorizationCode:). Verify the correct native/web paths and failures with real accounts. Retain only justified financial anti-replay/refund records under a documented policy. Explain unspent coin consequences before deletion. No server private credentials in the client.
4. Complete Apple/email/Google account setup as appropriate for iOS. Native Google is not configured/exposed today; the owner selected Apple, Google and email, so do not claim all work merely because Apple succeeds. Do not auto-merge accounts by email, including Apple private relay.
5. Prepare exact scoped Firebase deployment, permissions, secrets, environment separation, quotas/cost limits and observability; obtain any required action-time approval before creating credentials/changing live security access. Reuse the already-approved signing credentials; do not regenerate keys unnecessarily. Verify all production adapters against real APIs, not fixture responses.
6. Register/configure launch coin products with real storefront pricing, restore/reinstall via account ledger, delivery retries, duplicate callback prevention and refunds/debt. Verify pending/cancelled/declined/forged/wrong-owner/wrong-environment cases, crash recovery, purchases after sign-out/switch and cross-device recovery. Real App Store sandbox acceptance is still required.
7. Update privacy/support/store listing, age rating/review details/screenshots, choose a proper signed release build and physically test the completed account/payment path. Public submission is the target, but is not yet done. Do not publish unfinished code or activate real charges to bypass testing.

## Connected services and owner handoffs

- Firebase project **eko-estates**, owner upgraded to Blaze. The 500 SEK budget alert is not a hard spending cap. Bundle/application ID **com.kenstylez.skylineestates**; public Firebase config in eko-estates/firebase-config.js. Apple/email/Google providers configured in console, but game feature remains disabled.
- Apple Services ID com.kenstylez.skylineestates.web, Firebase domain eko-estates.firebaseapp.com and /__/auth/handler callback configured. GitHub Pages domain authorized. Native Firebase iOS public config already matches the bundle.
- App Store Connect app **6828220714**. Paid/free agreements, banking and tax showed Active. EU Digital Services Act trader verification showed **In Review**. Public version 1.0 remains Prepare for Submission with incomplete listing/review details and no selected public build. Do not change legal/banking information or make compliance declarations from guesses.
- Private TestFlight owner group Skyline iOS QA has one owner; no external/public tester link. Proper signing pipeline already accepted native Apple authorization.
- Google Play requires owner identity, real Android-device access and contact-phone verification before app creation. **Defer Android** rather than block iOS. Owner does not own an Android phone. No need to repeat this question or demand Android work now.
- Browser sessions may expire independently for Apple Developer and App Store Connect. Let the owner enter passwords/2FA; never request secrets in chat or try reading credential caches.

## Credential handling

Existing encrypted GitHub Actions secrets (names only): APP_STORE_CONNECT_KEY_BASE64, APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APPLE_TEAM_ID, IOS_DISTRIBUTION_P12_BASE64, IOS_DISTRIBUTION_P12_PASSWORD, IOS_DISTRIBUTION_PROFILE_BASE64.

Do not expose/download secrets into the repository or paste them into Claude/chat. An existing Apple sign-in private key is configured in Firebase; the App Store Connect build key is a different key. A Store Server API verification key/configuration may require separate setup; check the exact authorized scope. Access in another tool is not automatically shared with Claude: the owner must connect GitHub and any needed consoles there.

## Build/test habits and local workspace

Repository checkout on this Windows machine: work/a2-guide under this chat's workspace. User-facing reports are in outputs/ outside the repo. Generated www/, test-results screenshots and __pycache__ are untracked; do not stage them. Intermediate private signing material is outside the repo and must stay there.

Read game.html and run skyline-estates/build.py after changes; check build.py --check. index.html and offline-assets.js are generated. Keep text files LF when uploading Git objects, or diffs/hashes become noisy. Hash-pinned audited game sections feed many service kernels; do not repin blindly or claim parity from static string tests.

On this host use the explicit bundled Python executable (bare python points at a broken WindowsApps alias). Playwright can run with PLAYWRIGHT_MODULE pointing to bundled node_modules/playwright and CHROME_PATH to Chrome. SKYLINE_FILE_TEST=1 supports file-mode browser tests because local HTTP may be blocked. Full service emulator/native builds run in GitHub CI. Missing local node_modules/fonts means a local native copy check is not a complete native build.

Publish pipeline .github/workflows/skyline-ios.yml: default PR/push builds are unsigned, private TestFlight upload is an explicit manual publish=true action. Read its current export restrictions before attempting a public App Store candidate; the previous export is internal-only. The isolated skyline-ios-sdk27.yml only compiles unsigned compatibility variants, with no store upload or credentials.

Current Apple minimum upload SDK is 26; from April 2027 SDK 27+ and minimum iOS 15 are required. Xcode 27.1 builds succeeded, but this does not prove real authentication/payment/device acceptance.

## Primary technical references already consulted

- https://developer.apple.com/app-store/submitting/
- https://capacitorjs.com/docs/v7/ios/custom-code
- https://developer.apple.com/documentation/storekit/transaction/unfinished
- https://developer.apple.com/documentation/storekit/verificationresult/jwsrepresentation-21vgo
- https://firebase.google.com/docs/auth/ios/apple
- https://firebase.google.com/docs/auth/web/apple
- https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
- https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/authentication (check pinned plugin 7.5.0 behavior, not just main)

No public release, paid-purchase activation, cloud-wallet migration or new live permission change has occurred during this handoff.


## Final checkpoint before transfer

The owner requested this handoff when credit reached 10%. Do not interpret this as completion of the iOS release.

New branch also includes lib/storekit-client.js, an injectable, default-disabled JS wrapper around the native bridge and authenticated wallet service. It lists native localized prices, passes the server-issued UUID into purchases, refuses unknown SKUs, handles pending/cancelled outcomes, resumes unfinished transactions and checks account switches before publishing wallet data. It has **13 passing local tests**; the renamed/browser-exportable purchase-delivery.js has **14 passing tests** (27 total). A concurrent-purchase race and overly broad error-code forwarding were fixed and covered.

The native plugin is now registered by configure-apple-auth.rb, but that Ruby/Xcode setup and new Swift source still need real macOS CI validation. Product unit-test compilation was added to the iOS workflow, and the SDK 27 workflow now responds to native/plugin-registration changes. Do not assume the earlier SDK 27 success covers this new native source. The wrapper still needs real bootstrap, authenticated backend and unified wallet integration; game billing remains paused.

Generated offline manifest is current (143 files after adding/renaming modules); build.py --check passed locally. To avoid repeating a 100-game content simulation on top of the existing 175-game stability suite, the CI content-browser pass now uses 5 games via SKYLINE_CONTENT_RUNS; standalone default remains 100. This CI resource change has not yet been exercised remotely: check the new runs and rerun as needed.

No server deployment, production account enablement, legacy import, product activation, public store submission or financial transaction occurred. Continue from this draft, with the chosen unified-wallet design; do not regress to separate balances merely to ship faster.

Final local verification: 27 JS purchase/delivery tests, 38 build pipeline guard checks, generated asset check, and the phone/desktop/leaderboard/audio browser pass with 5 seeded games all passed. The generated native Swift/Ruby integration still awaits macOS CI.


## Latest owner expansion and fresh CI — 29 October 2026

The owner requested all three concept features be added to Claude's to-do list before transfer. Read **SKYLINE-CITY-SPOTLIGHT-TODO.md** alongside this file: optional Dynamic City Events 2.0, appearance-only 3D rooftop/skyline customization, improved existing daily/weekly contracts, combined into City Spotlight. First example: Lagos, Development Boom, three-match Lagos Investor contract and a permanent Golden Rooftop Garden reward. These are requested future work, not implemented. Additional estimate: 6–10 engineering hours plus testing. Retain the unified cloud wallet and iOS-first/Android-deferred decisions.

Fresh CI on StoreKit draft commit **9d4d9da1e06d83da8d08bb29015a91e114bcc8d1** now shows **all six workflows successful**, superseding earlier pending-compilation notes:

- iOS: run 40906253537 — success.
- SDK 27 compatibility: run 40906253574 — success.
- Full stability: run 40906253814 — success.
- Isolated security: run 40906253820 — success.
- Android build: run 40906253818 — success (publication still deferred).
- Desktop build: run 40906253549 — success.

This verifies the generated native bridge builds; it does **not** verify configured App Store products, live Firebase accounts, unified migration or real payments. Accounts and purchases remain paused. Draft PR #52 is stacked on PR #51 and neither is a completed public release. Check fresh state again before continuing.

Next Claude action: inspect the two handoff files and current PRs/CI; finish the release foundation and implement the requested City Spotlight feature in reviewable slices. Do not discard the extra song, larger pack drafts, existing daily event or the native work when rebasing. All three concept images are represented textually in the feature to-do; no mockup financial values or outside board artwork have been installed.
