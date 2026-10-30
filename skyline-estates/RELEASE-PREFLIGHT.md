# Skyline Estates iOS: release preflight and approval list

Updated 29 Oct 2026. **Nothing in this file is approved, deployed or switched on yet.** Code: draft PRs #51 → #52 → #53 → #54 (this preflight). Cloud sync and purchases stay off (`lib/cloud-config.js`).

## A. Preflight findings (fixed in PR #54)

| Check | Finding | Status |
|---|---|---|
| Test coins vs real balances | The production service credited **any** account for Apple Sandbox (TestFlight / App Review) purchases | **Fixed.** Only listed tester accounts receive Sandbox credit; see §D |
| Refund reversed by Apple | `REFUND_REVERSED` was rejected, so the player would have lost paid coins | **Fixed.** Coins come back once. A refund that arrived before delivery is cleared, so delivery then credits once |
| Repeated refunds | A second refund after a reversal would have reused the first ledger key | **Fixed.** Refunds are numbered |
| Verified notifications that need no change | `TEST`, `CONSUMPTION_REQUEST` and `REFUND_DECLINED` were treated as failures | **Fixed.** Acknowledged with `walletChanged:false` and no writes |
| Refund for a removed account | Could have recreated the account, or made Apple retry forever | **Fixed.** Acknowledged; the deletion tombstone is kept |
| 24-month TTL | The generic field name `expireAt` sat on a collection group (`ledger`) that applies database-wide | **Fixed.** The field is now `skylineLedgerExpireAt`, written only on Skyline ledger rows. Balances, items, idempotency records, store bindings, tester flags and purchase anti-replay records have no TTL field and never expire. Other apps' `ledger` documents without this exact field are untouched |
| Background refresh frequency | The profile was re-read every 60 s while the app was open, which was the main cost driver | **Changed** to every 5 min, plus whenever the app returns to the foreground |
| Account deletion and Apple revocation | Fresh sign-in → Apple revoke → data removed (tester flag too) → purchases kept with a hashed owner → Auth user deleted | Unit + emulator tested. **Not yet tested with a real Apple account** |
| Duplicate purchases and recovery | Global transaction key, idempotent delivery, unfinished transactions replayed at launch, finish only after durable delivery | Unit + emulator tested. **Not yet tested on a device** |
| Earning and migration limits | Daily caps and the migration cap are **abuse controls only**. They limit how much a modified app can claim; they don't prove a match was played (matches run on the phone). Purchases, refunds, promo codes and identity *are* verified server-side | Documented in `security/UNIFIED-PROFILE-DESIGN.md` §3a |

Unit tests in #54: profile/wallet 25, adapters 9, wallet 14, delivery 18, sync engine 13, HTTP 7, removal 6, all passing locally. The emulator suite and the full suite run in CI.

## B. Monthly cost estimate (reproducible)

Run `node skyline-estates/functions/scripts/cost-estimate.mjs`. Every assumption and unit price is in that file. Prices are USD list prices checked 29 Oct 2026, before tax:
- Firestore Standard (europe-west1): $0.03 per 100k reads, $0.09 per 100k writes, $0.01 per 100k deletes and TTL deletes, about $0.15 per GiB-month. Free quota on the `(default)` database: 50k reads, 20k writes and 20k deletes a day, 1 GiB stored.
- Cloud Run functions, Tier 1: $0.000024 per vCPU-second, $0.0000025 per GiB-second, $0.40 per million requests. Free each month: 180k vCPU-seconds, 360k GiB-seconds, 2M requests.
- Egress: estimated at $0.12 per GiB, with no free allowance assumed.
- Logging: $0.50 per GiB above 50 GiB a month.
- Secret Manager: $0.06 per version above 6 free, $0.03 per 10k accesses above 10k free.
- Artifact Registry: $0.10 per GB above 0.5 GB.

| Scenario | Daily players × minutes | Requests/month | Firestore ops | Firestore storage | Function compute | Requests | Egress | Logs | Secrets | **Total/month** |
|---|---|---|---|---|---|---|---|---|---|---|
| Low | 200 × 20 | ≈ 84k | $0.01 | $0 | $0 | $0 | $0.02 | $0 | $0.05 | **≈ $0.08** |
| Normal | 2,000 × 45 | ≈ 1.9M | $3.76 | $1.48 | $4.76 | $0 | $0.43 | $0 | $0.05 | **≈ $10.50** |
| High | 20,000 × 60 | ≈ 25M | $62.40 | $21.57 | $118.96 | $9.29 | $5.77 | $0 | $0.05 | **≈ $220** |

Assumptions:
- A profile read every 5 min while playing.
- One batched sync every ~2 min (2 reads, 3 writes).
- 0.2 s at 1 vCPU and 256 MiB per request, with no overlap credit (conservative).
- 3% of players buy 1.5 packs a month.
- 24 months of ledger history kept.

Real costs depend on actual play. Re-run the script with measured numbers after launch.

**`maxInstances: 10` limits how far the function can scale, not monthly spending.** It caps how many requests run at once. If 10 instances stayed busy all month, compute alone would be about **$638**, plus Firestore operations, which have no ceiling of their own. Abuse protection comes from the per-caller rate limit (90 requests/min per instance), authentication on every request, and the daily earning caps.

## C. Spend controls available, and their limits

- **Budget alerts (you already have 500 SEK):** email only. **They never stop spending.**
- **Firebase service-level spend caps** (Preview, Blaze only; Firebase console → Settings → Usage and billing → Details & settings → *Service-level spend caps*).
  - **Covered services:** Cloud Functions for Firebase (the underlying Cloud Run functions service), App Hosting, Extensions, and Firebase AI Logic.
  - **Not covered:** Firestore, Realtime Database, Authentication, Cloud Logging, Secret Manager, networking outside the function, and Artifact Registry. These keep billing normally.
  - **How it enforces:**
    - It emails you at 50% and 80% of the cap.
    - At 100% it **pauses the whole service for the rest of the calendar month**. For our function that means sign-in sync, purchase delivery and refund processing all stop until you lift it. Purchases stay unfinished on the phone and are delivered after you lift it.
  - **Reporting delay:** usage is reported with a delay, so enforcement isn't instant. **Any overage during that delay is still billed.** It counts gross cost, before credits.
  - **Scope:** one project and one service. A cap on Cloud Functions covers **every** Cloud Run function in `eko-estates`, not just Skyline's. This repository deploys no other functions, but I can't see the live project, so check Firebase console → Functions for other functions before setting a cap.
  - **Changes:** you can't edit the amount while the cap is enforced; lift it first. Lifting can take up to an hour to resume service.
  - **Who can set it:** you, as Project Owner.
- **Disabling billing for the whole project:** not recommended and not proposed. It would stop the Realtime Database for online rooms and everything else in `eko-estates`.

**My recommendation:** keep the alert, add alerts at 250 and 1,000 SEK, and set a Cloud Functions spend cap of about **$50 a month** (roughly ten times the normal estimate). Firestore spending remains uncapped and is only bounded by the function's limits. I won't change any spending setting until you approve.

## D. Tester and reviewer accounts (tested separation and recovery)

**Policy:**
1. Only accounts you add with `node functions/scripts/testers.cjs add <uid> "note"` can receive free Sandbox (TestFlight / App Review) coins. Adding an account flags it **permanently** as a test account (`tester:true`).
2. A test account **can never receive real-money purchases** (`test-account-real-purchase-blocked`). Real money and test coins never mix in one account.
3. **Retire** (`testers.cjs retire <uid>`) or removal from the list **locks** the account. Reading, syncing, spending and buying all fail with `test-account-retired`, so its free coins can't be carried on as a normal player. The app explains this and asks the player to sign in with their own account.
4. **Recovery** (`testers.cjs reset <uid>`) wipes coins, debt, XP, items and progress. It clears the flag and leaves an empty normal account, recording a `tester-reset` ledger entry. The old Sandbox transactions stay recorded, so they can never be credited again. New Sandbox purchases are refused unless you add the account again.
5. Deleting the account in the app also removes the tester record.
6. Use dedicated accounts: one for your own testing and one App Review demo account. **Never add your real player account.**

**Tested** (`profile.test.cjs`, "tester accounts…"):
- A listed reviewer gets Sandbox coins and is flagged.
- Real-money purchases are refused for that account.
- After retire or removal from the list, reads, syncs and purchases are refused.
- Reset produces an empty normal account; replaying the old Sandbox transaction is refused; real purchases then work.
- An ordinary player is unaffected and can never receive Sandbox coins.

## E. Final approval list (numbered; nothing here is approved yet)

**Deployment**
1. Create the Firestore `(default)` database in **production mode** in **`europe-west1`**, or confirm one already exists. Firestore and Realtime Database security rules stay unchanged.
2. Add a TTL policy: collection group `ledger`, field `skylineLedgerExpireAt`, so ledger history is deleted after 24 months.
3. Deploy one Gen 2 HTTPS function, `skylinePlayer`:
   - `europe-west1`, max 10 instances, concurrency 40, 256 MiB, 30 s timeout, min 0 instances.
   - `SKYLINE_ENVIRONMENT=production`, with Sandbox purchases accepted only for listed testers.
4. Store 3 secrets in Secret Manager: the App Store **In-App Purchase** key (.p8), key ID and issuer ID. You enter them yourself.
5. Give the function's default service account access to Firestore and to deleting Firebase Auth users (needed for account deletion).
6. Who deploys: **you**, from your computer with `firebase login`. The alternative is a new GitHub deploy identity, which would need its own approval.
7. Testers: one dedicated test account for you, plus one App Review demo account.

**Spending controls**

8. Keep the 500 SEK alert, and add alerts at 250 and 1,000 SEK. These are emails only.
9. Set a Cloud Functions service-level spend cap at **$50 a month**, after confirming no other function in `eko-estates` would be paused. The alternative is no cap.

**Economy values (proposals)**

10. Coins moved from the first device: up to 1,000,000. XP moved: up to 5,000,000. Later devices add their collection and the higher XP, but **no coins**.
11. Daily earning limit per account: 50,000 coins and 150,000 XP per UTC day.
12. City events:
    - Festivals (including the Lagos Film Festival): rent +50% for 2 rounds.
    - Infrastructure upgrades (including Slussen): building −50% for one named player's turn.
    - Development Boom: building −25% for 1 round.
13. Rooftop prices:
    - Rooftop Garden 1,800, Solar Roof 1,500, Rooftop Pool 2,600 and Skyline Crown 3,200 coins.
    - The Golden Rooftop Garden is a City Spotlight reward only; a duplicate pays 1,500 coins.

**Products (Consumable; Apple sets local prices from the base)**

14. `com.kenstylez.skylineestates.coins_600`: 600 coins, $0.99 (≈ 12 kr)
15. `com.kenstylez.skylineestates.coins_1500`: 1,500 coins, $1.99 (≈ 25 kr)
16. `com.kenstylez.skylineestates.coins_4000`: 4,000 coins, $4.99 (≈ 59 kr)
17. `com.kenstylez.skylineestates.coins_10000`: 10,000 coins, $9.99 (≈ 119 kr)

The kronor amounts are approximate; App Store Connect shows the exact local price when you pick each tier.

## F. Stages and estimates

| Stage | Who | Estimate | State |
|---|---|---|---|
| Preflight fixes (#54) and full CI | Claude | done; CI about 30 min | Code done, CI running |
| Approve §E | You | 15–30 min | **Waiting** |
| App Store Connect: IAP key, 4 products, notification URL, 2 sandbox Apple IDs, demo account | You (sign-in) | 45–60 min | Not started |
| Firestore, TTL, secrets, deploy, smoke test, testers | You run the commands, Claude prepares and checks | 30–45 min | Not started |
| Merge #51→#54, verify, enable via reviewed change, signed TestFlight | Claude (merges need your OK) | 1–2 h plus CI | Not started |
| iPhone acceptance (`functions/DEPLOY.md` §6) | You, with Claude | 1.5–2.5 h | Not started |
| Privacy, screenshots, age rating, review notes, trader check, submit | Both | 1–2 h, then Apple review (usually 1–3 days) | Not started |

Sources: [Firebase spend caps](https://firebase.google.com/docs/projects/billing/spend-caps?hl=en), [Firebase budget alerts](https://firebase.google.com/docs/projects/billing/budget-alerts), [Firestore pricing](https://cloud.google.com/firestore/pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Secret Manager, Logging and Artifact Registry no-cost limits](https://firebase.google.com/docs/app-hosting/costs).

## G. Pre-public-release: dedicated runtime service account (not done; needs approval)

**Today:** `skylinePlayer` runs as the project's default compute service account, `668368365590-compute@developer.gserviceaccount.com`. That account holds **Editor** on all of `eko-estates`, which is far more than the function needs. Other Google Cloud services in the project may also use it, so its roles stay as they are. We move only Skyline to its own account.

**Proposed account:** `skyline-player@eko-estates.iam.gserviceaccount.com` ("Skyline player service runtime"), with no keys (the function runs as it; nobody downloads a key).

| Need (from the deployed code) | Grant | Scope |
|---|---|---|
| Read and write Skyline wallets, profiles, bindings and testers in Firestore | `roles/datastore.user` | project (Firestore IAM can't be narrowed to collections; rules still deny clients) |
| Check sign-in tokens, including revoked-session checks (`users.get`), and delete the player's sign-in on account removal (`users.delete`) | Custom role **Skyline Auth User Remover**: `firebaseauth.users.get`, `firebaseauth.users.delete` | project |
| Read the three Apple secrets | `roles/secretmanager.secretAccessor` | **each secret only**: `SKYLINE_APPLE_IAP_KEY`, `SKYLINE_APPLE_IAP_KEY_ID`, `SKYLINE_APPLE_IAP_ISSUER_ID` |
| Write its logs | `roles/logging.logWriter` | project |
| Report metrics (optional, for error-rate alerts) | `roles/monitoring.metricWriter` | project |

Not granted: Editor, Owner, Firebase Admin, Realtime Database, Storage, Hosting, IAM or billing roles. Verifying sign-in tokens uses Google's public keys and needs no role.

**Deployer (you):** `roles/iam.serviceAccountUser` on this one service account, so your deploy can attach it. As Owner you already have this.

**Code change (in this PR):** `functions/index.js` sets `serviceAccount: 'skyline-player@eko-estates.iam.gserviceaccount.com'`; `functions/scripts/smoke.cjs` checks it. Deploying this before step 1 fails safely (the deploy is rejected and the running function is unchanged).

**Commands:** `functions/scripts/runtime-identity.sh` (re-runnable, keyless, leaves the default account alone). Checked 30 Oct against the deployed code: tokens are verified with revocation checks (`users.get`), account removal calls `deleteUser` (`users.delete`), wallets/profiles use Firestore, and the function reads exactly the three secrets.

**Approvals needed from the owner:** (a) the grants in the table, (b) running the script in Cloud Shell (Authorize prompt), (c) one redeploy, (d) later, removing the default account's grants on the three secrets.

**Rollout and check:**
1. Create the account and the grants above. Nothing changes for the running function yet.
2. Deploy the PR.
3. Run the smoke tests plus one sandbox purchase, one refund notification and one test-account removal.
4. Confirm that the default account's grant on the three secrets can be removed (added automatically by the first deploy), then remove only those three secret grants. Its project roles stay untouched.

**Rollback:** redeploy without `serviceAccount`; the function returns to the default account.

## H. Usage and spending controls (checked 30 Oct 2026, 23:30 CET)

**Actual usage:** October cost 0.03 kr, fully covered by free tiers (billed 0.00 kr). `skylinePlayer`: short bursts up to about 3 requests/s, at most 1 instance. Firestore last 24 h: 210 reads, 80 writes, 6 deletes (under 1% of the free daily quota).

**Alerts (notify only; nothing stops):** existing 500 kr budget with emails at 250 / 450 / 500 / 1,000 kr. Proposal: add a second, early-warning budget of **100 kr/month** with emails at 50%, 90% and 100% of **forecast** spend, so a runaway trend shows within days.

**Limits already in force (these do stop usage):**
- `skylinePlayer`: max 10 instances × 40 concurrent requests, 256 MiB, 30 s timeout. Worst case is bounded at roughly 10 instances running continuously.
- Per-client rate limit: 90 requests/minute in the function.
- Store pause switch (`scripts/store-pause.cjs`): stops new purchases before Apple's payment sheet.
- Build images deleted after 1 day.

**Caps (hard stops), not recommended yet:**
- A Firebase/Cloud Functions spend cap stops only Functions, including any future Eko Estates functions. It is not a project-wide limit.
- Automatic billing disable (budget → Pub/Sub → function) is the only project-wide cap. It would also stop Firestore, Auth sign-in for online play and Eko Estates, and can delete resources that need billing. Only worth it if spend ever grows unexpectedly.
- Firestore has no per-database spending cap; abuse is limited by the function (clients cannot write wallets directly) and later by App Check.

**Recommendation:** keep alerts, add the 100 kr forecast budget, keep the instance limit at 10, revisit after the payment update ships.

## If a spend cap or outage pauses the backend

Full procedure: `functions/DEPLOY.md` §9. In short:
- New purchases are refused **before** Apple's payment sheet opens, so nobody is charged.
- Paid but undelivered transactions stay unfinished in StoreKit. They are delivered exactly once at the next launch after the service returns.
- Cloud saves wait in the device outbox and upload later.
- Missed refund notifications are recovered with `scripts/replay-notifications.cjs` from Apple's 180-day notification history. The replay is idempotent.
- An owner pause without a spend cap: `scripts/store-pause.cjs on|off|status`.
- No delivery or refund record is deleted by a pause or by TTL.
