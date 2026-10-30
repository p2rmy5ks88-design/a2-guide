# Skyline Estates — iOS release handoff

Updated 30 October 2026, 12:00 CET. This repository is **public**: never add credentials, key files, passwords, personal emails or billing IDs here. Verify current repository and CI state before acting; this file is a handoff, not proof that anything works. Earlier history is in git (`git log -- SKYLINE-IOS-HANDOFF.md`).

## Owner rules (still in force)

- **Decision 30 Oct 11:09: version 1.0 ships without in-app purchases.** Public build uses `cloud_channel=ios-release` (accounts and cloud save on, `purchases:false`, coin-pack buying hidden; coins are still earned and spent in play; balances, collections and saves are kept). The owner has authorized building and submitting it for App Review; legal declarations (privacy, age rating, export compliance, agreements) stay the owner's.
- Deferred: payment testing and activation, optional polish, Android. Coin packs stay in App Store Connect (Prepare for Submission) and are **not** attached to 1.0.
- `private-testing` builds go only to the TestFlight group and are never submitted.
- **Spend cap (approval item 9) is pending.** A Cloud Functions spend cap is not a total-project limit and would also pause any future Functions in `eko-estates`. Don't set it without the owner's amount.
- Never use the owner's existing player account as a tester. Never reset, delete or migrate a save automatically. Don't uninstall apps to test.
- Don't recreate keys, accounts or backend services unless evidence shows they are the problem.
- No new features or cosmetic changes during release work. No subagents unless asked. Leave Eko Estates / Svea Fastigheter config untouched.

## Deployed configuration (live, private use only)

| Item | State |
|---|---|
| Firestore | `(default)`, Standard edition, Native, restrictive rules, `europe-west1`. Created 30 Oct. |
| TTL | Collection group `ledger`, field `skylineLedgerExpireAt` (24 months). Balances, items, purchases and anti-replay records have no TTL. |
| Function | `skylinePlayer` (codebase `skyline-player`), Gen 2, Node 22, `europe-west1`, max 10 instances, concurrency 40, 256 MiB, 30 s, min 0. URL `https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer`. Deployed from main `8a4399d` via Cloud Shell under the owner's account. `SKYLINE_ENVIRONMENT=production` (Sandbox purchases credited only to listed testers). |
| Runtime identity | Default compute service account (has project Editor). **Pre-public-release item:** move to a dedicated least-privilege account — proposal in `skyline-estates/RELEASE-PREFLIGHT.md` §G (PR #57); needs owner approval before any IAM change. |
| Secrets (Secret Manager) | `SKYLINE_APPLE_IAP_KEY` (owner-uploaded .p8, verified as a valid EC key without printing), `SKYLINE_APPLE_IAP_KEY_ID`, `SKYLINE_APPLE_IAP_ISSUER_ID`. Owner keeps the .p8 backup offline. |
| Apple roots | AppleRootCA-G2/G3 downloaded at deploy from apple.com; G3 SHA-256 matched `63:34:3A:BF:…:3E:91:79`. Not committed. |
| Artifact cleanup | Build images in `europe-west1` deleted after 1 day. |
| Testers | Two dedicated email accounts marked with `scripts/testers.cjs` (owner test account; App Review demo). `node scripts/testers.cjs list` shows them. Owner's player account untouched. |
| App Store Server Notifications | Production and Sandbox URLs → `…/skylinePlayer/v1/store/apple-notifications`. Apple Sandbox TEST notification: delivery **SUCCESS**, 200, no errors logged. |
| Products | Consumables `com.kenstylez.skylineestates.coins_600/1500/4000/10000`. Base US $0.99/1.99/4.99/9.99 (approved). **Sweden set manually to 9/19/49/99 kr** (owner decision; Apple won't auto-adjust Sweden). Status: Prepare for Submission (first IAPs ship with an app version). |
| Sandbox tester | "Skyline Sandbox", Sweden (App Store Connect → Sandbox). |
| Budget | 500 SEK budget alerts at 250 / 450 / 500 / 1,000 SEK (email only, no cap). |
| Owner actions pending | Accept the updated Apple Developer Program License Agreement (Account Holder). |

Smoke tests on the live function: no token → 401 `unauthenticated`; foreign origin → 403; bad token → 401; junk notification → acknowledged, no wallet change.

## Code state

- main includes PRs #51–#56 and #58. PR #55: store pause (`scripts/store-pause.cjs`), tester import block, refund replay (`scripts/replay-notifications.cjs`), save export, private-testing channel. PR #56: private config file `skyline-estates-app/cloud/private-testing.js`, accepted by `verify-bundle` only on that channel.
- **PR #58 (sign-in fix, merged):** in the iOS web view `getAuth()` never became ready, so build 65 stayed on "Connecting to your account…". The iOS app now uses `initializeAuth(..., indexedDBLocalPersistence)` without a popup resolver; the web is unchanged. SDK load and auth readiness time out after 20 s with codes **ACCOUNT-SDK** / **ACCOUNT-INIT**.
- PR #57: docs only (runtime service account proposal), awaiting owner review.

## Builds

| Build | Content | Result on owner's iPhone |
|---|---|---|
| 1.0.39 (39) | Earlier diagnostic build | Native Apple credential OK |
| 1.0.65 (65) | main `669e8af`, private-testing | Update kept the save (705 coins, Level 6, Bronze 19). Spotlight card visible. **Sign-in panel stuck on "Connecting…"** (no code). |
| 1.0.68 (68) | main `d71c9fb` (includes #58 sign-in fix), private-testing | **Sign-in works** (owner, 06:57): email sign-in with the test account; save intact. |
| 1.0.70 (70) | branch `skyline-ios-refund-and-debt` (PR #61), private-testing | Debt-repayment portfolio and in-app **Request a refund**. Owner device checklist pending. |

Builds are made with: Actions → `skyline-ios.yml` → Run workflow on `main`, `publish=true`, `cloud_channel=private-testing`. The build number equals the run number. Then add the build to the internal group **Skyline iOS QA**.

## Checkpoint 30 Oct (afternoon)

- Open PRs:
  - **#60** public `ios-release` channel. Green; merge after device checks.
  - **#61** iPhone debt-repayment portfolio and in-app refund request. Debt test 22/22, property parity 41/41, human flows 35, save recovery 41; repinned source hash. Merge after CI and the owner's debt check.
  - **#62** privacy policy update, `skyline-estates/APP-STORE-SUBMISSION.md`, this handoff.
  - **#57** service account proposal (docs).
- Sandbox procedure (verified against Apple's docs):
  - **TestFlight builds always use Sandbox, and purchases are free with the tester's normal Apple ID.** Don't sign out of Media & Purchases.
  - Refunds are tested from the app's own refund sheet (Account & recovery → Purchases → Request a refund). Sandbox auto-approves any reason and sends a `REFUND` server notification. Typing `DECLINE` under *Other* tests a declined refund.
- Keep the two tester accounts until purchase and refund verification finishes.

## Checkpoint 30 Oct (midday) — 1.0 without purchases

- PR #61 (debt portfolio, refund sheet, purchase messages, `ios-release` channel, no-purchase gating; includes #60) merged with main; stability job limit raised to 30 min after a slow runner cancelled a fully passing run. Merge #61, close #60, then build `ios-release` from main.
- Store pack: `skyline-estates/APP-STORE-SUBMISSION.md`. Version 1.0 text fields, support URL, copyright and review notes are saved in App Store Connect. Screenshots (6.9", 2868×1320) are in `skyline-estates-app/appstore/screenshots/`; the CI API key can't upload them (403), so they're uploaded in the web UI.
- Builds: 70 (debt layout, owner-approved), 72 (purchase messages). Purchase fix diagnosed: unverified Firebase email on the test account (403 `persistent-account-required`), missing product metadata (fixed), hidden toast (now modals).
- Owner device checks for 1.0: verify the test account's Firebase email (link from `eko-estates.firebaseapp.com`), sign in, sign out → device save returns, sign in again → cloud save returns, delete the test account.
- Owner-only before Submit: license agreement, App Privacy, age rating, export compliance if asked, review contact and demo sign-in, release option.

## Checkpoint 30 Oct 14:30 — release build attached

- PR #63: `ios-release` uploads are App Store eligible (others stay TestFlight internal only) and use version `1.0`. Build 82 was internal-only and can't be submitted.
- **Build 85** (`ios-release`, main `0eaa477`, version 1.0) is attached to App Store version 1.0 and in Skyline iOS QA. No coin packs attached.
- Owner device results on build 82 (same game code): **cloud recovery PASS** (signed-in progress synced; signed out and earned locally; signing in restored the synced balance), **coin packs hidden PASS**, test-account email verified.
- Still open: account deletion check on the test account (reviewer demo account stays), screenshots, App Review contact and demo sign-in, age rating, App Privacy, license agreement, then Submit for Review. Release type is set to automatic after approval; the owner can change it.

## Phase 2 checkpoint (31 Oct, 00:10 CET) — LIVE CHANGES PAUSED

- **Owner decision 31 Oct 00:04:** no live IAM or backend change until 1.0 is approved. Nothing has been applied: no service account, role, grant or budget created; `skylinePlayer` still runs the earlier deploy (main `8a4399d`) as the default account.
- **`main` is ahead of the deployed function:** it contains #57 (`serviceAccount: skyline-player@…`) and #66 (refunded-transaction finish). **Do not deploy from main until `functions/scripts/runtime-identity.sh` has run** (otherwise Google rejects the deploy; the running function stays unchanged).
- **Owner rule 31 Oct 00:07:** when 1.0 is approved, **do not deploy automatically**. Report the status first; the owner picks the time for deployment and verification. Until then, offline preparation and documentation only.
- **Approved by the owner, to run at the time the owner picks after 1.0 approval:** (1) `runtime-identity.sh` in Cloud Shell, (2) deploy main, smoke tests, verify cloud save and account deletion with a throwaway account (reviewer account untouched), rollback = redeploy without `serviceAccount`, (3) an additional 100 kr/month email-only forecast budget at 50/90/100%, keeping the existing 500 kr alerts, (4) private TestFlight build (`private-testing`) and the sandbox checklist. #68 stays unmerged until acceptance passes.
- Android rules verified against official Google docs (see `skyline-estates-app/ANDROID-READINESS.md`); Android is planned separately from the iOS payment milestone.

## Phase 2 checkpoint (31 Oct, 00:15 CET)

- **App Store:** 1.0 (build 85) last confirmed Waiting for Review, automatic release. The App Store Connect session in Claude's browser expired; the owner signs in again to let Claude watch it. Apple emails any review request.
- **PR #57 (approval needed, not deployed):** `skylinePlayer` to run as keyless `skyline-player` SA; `functions/scripts/runtime-identity.sh`; RELEASE-PREFLIGHT §H usage and spend controls. Usage 30 Oct: October billed 0.00 kr (0.03 kr covered), ≤3 req/s, 1 instance, Firestore 210 reads/80 writes per day. Proposed: extra 100 kr forecast budget (alerts only). Waiting for "approve IAM".
- **PR #66 (IAP fix + tests, not deployed):** Apple transactions refunded before delivery are now finished with no credit (previously replayed every launch with an error). New `iap-lifecycle.test.cjs` (9 checks). Purchases stay off in `ios-release`.
- **#66 merged** (CI green incl. emulator rules suite). **#67 merged:** `skyline-estates-app/ANDROID-READINESS.md` (recommend Android 1.0 without purchases; 12-tester/14-day closed test if personal account; target API 36).
- **PR #68 (draft, do not merge yet):** iOS 1.1 coin packs: `ios-release` purchases on, privacy policy IAP section, 1.1 store notes. Merge only after 1.0 approval, deploy of #57+#66 and sandbox device tests.
- **Next:** merge #66 after CI; deploy it together with #57 after approval (one redeploy); then the iOS payment update: `ios-release` purchases on, App Privacy adds Purchases (purchase history), attach the 4 IAPs to the next version, sandbox device tests with the isolated tester (buy, cancel, Ask-to-Buy pending, kill-before-finish, refund via in-app sheet, `DECLINE` refund).

## Checkpoint 30 Oct 15:30 — SUBMITTED for App Review

- Version 1.0 with **build 85** submitted; state Waiting for Review. Release: automatically after approval (owner can switch to manual before approval).
- Device checks passed on the owner's iPhone: sign-in, cloud recovery, hidden coin packs, account deletion (test account). Reviewer demo account kept; password reset by the owner in Cloud Shell and email marked verified (no inbox).
- Listing: iPhone 6.9" and iPad 13" screenshots (`skyline-estates-app/appstore/`), price Free, category Games › Board, privacy URL, App Privacy published (email, name, user ID, gameplay content; linked, app functionality, no tracking), age rating 12+ (simulated gambling mild), content rights: third-party content with rights. Licences: `skyline-estates/ASSET-LICENSES.md`.
- Coin packs not attached; payment testing, spend cap, service account (#57) and Android remain deferred.

## Remaining steps before public release (pre-decision plan, purchases now deferred)

1. Confirm sign-in works on iPhone with the dedicated test account. If it fails, capture the shown code (ACCOUNT-SDK / ACCOUNT-INIT / APPLE-*) and investigate that failure instead of rebuilding.
2. Run `skyline-estates/IPHONE-ACCEPTANCE.md` in order:
   - Accounts: test-account prompt, sign-out restores the device save, second device.
   - Sandbox purchase: buy, cancel, pending, interrupt.
   - **Real sandbox refund** (not a TEST notification).
   - Store pause.
   - Deletion of a test account.
   - Spotlight.
   - Then sign in with the owner's own account and move progress. Owner decides when.
3. After acceptance:
   - Owner decides the spend cap.
   - Approve and apply the runtime service account (§G) and redeploy once.
   - Privacy disclosures, screenshots, age rating, review notes (demo account details entered by the owner in App Store Connect), trader verification.
   - Then a reviewed public release channel.
4. Never submit a `private-testing` build for review.
