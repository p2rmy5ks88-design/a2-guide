# Skyline Estates iOS: release preflight and approval list

Prepared 29 Oct 2026. **Nothing listed here is approved or deployed yet.** Code state: PR #51 → #52 → #53 → #54 (this preflight), each a draft stacked on the previous one.

## A. Preflight findings (fixed in PR #54)

| Check | Finding | Status |
|---|---|---|
| Test coins kept apart from real balances | The production service credited **any** account for Apple Sandbox (TestFlight/App Review) purchases | **Fixed:** Sandbox purchases credit only accounts listed as testers. Others get `sandbox-purchase-not-allowed`. Test accounts are flagged `tester:true` and their ledger rows record `environment: sandbox` |
| Refund reversed by Apple | `REFUND_REVERSED` was rejected, so the player would have lost paid coins | **Fixed:** coins come back once. A refund that arrived before delivery is cleared so delivery credits once |
| Repeated refunds | A second refund after a reversal would have collided with the first ledger record | **Fixed:** refunds are numbered |
| Valid notifications needing no wallet change | `TEST`, `CONSUMPTION_REQUEST` and `REFUND_DECLINED` were reported as failures | **Fixed:** acknowledged with `walletChanged:false`, no writes |
| Refund for a removed account | Could have overwritten the deletion tombstone, or made Apple retry forever | **Fixed:** acknowledged; the tombstone is kept |
| 24-month TTL | The `expireAt` field name was generic. A TTL policy covers every collection named `ledger` in the database, so other apps could have been affected | **Fixed:** the field is now `skylineLedgerExpireAt`, used only on Skyline ledger rows. Balances, items, idempotency records, bindings and purchase anti-replay records carry no TTL field and never expire |
| Account deletion | Fresh sign-in, Apple token revocation, then data removal, purchase records kept with a hashed owner, then the Auth user is deleted | Verified by unit and emulator tests. The tester flag is now removed too. **Not yet tested on a real Apple account** |
| Duplicate purchases and recovery | Global transaction key, idempotent delivery, unfinished transactions replayed at launch, finish only after durable delivery | Verified by unit and emulator tests. **Not yet tested on a device** |
| Earnings and migration limits | Daily caps and the migration cap only limit abuse. They don't prove gameplay (matches run on the phone) | Documented in `security/UNIFIED-PROFILE-DESIGN.md` §3a |

Tests added in #54: 6 new profile and wallet checks (24 in total), plus expanded Apple notification adapter checks. All existing unit suites still pass.

## B. Approval list (decide each line)

### 1. Firebase deployment (project `eko-estates`, Blaze)

| Item | Proposed value |
|---|---|
| What | One Gen 2 HTTPS Cloud Function `skylinePlayer` and a Firestore database |
| Region | `europe-west1` for both the function and the Firestore database (the existing Realtime Database is also there) |
| Limits | max 10 instances, 40 concurrent requests each, 256 MiB, 30 s timeout, min 0 instances (no idle cost) |
| Secrets (Secret Manager) | `SKYLINE_APPLE_IAP_KEY` (.p8), `SKYLINE_APPLE_IAP_KEY_ID`, `SKYLINE_APPLE_IAP_ISSUER_ID`. You enter them yourself; they never pass through chat or the repo |
| Permissions | The function's default service account reads and writes Firestore and deletes Auth users (for account removal). No client rules change: Firestore stays deny-all for apps, and Realtime Database rules are untouched |
| Who deploys | You, from your computer with `firebase login` (the existing project owner). The alternative is a GitHub deploy workflow, which needs a new service account or workload identity; that's a separate approval |
| TTL | Collection group `ledger`, field `skylineLedgerExpireAt` |
| Testers | Your dedicated test account and the App Review demo account, added with `functions/scripts/testers.cjs` |

**Expected cost (estimate, not a quote).** Each active player does about one profile read per minute while the app is open, plus one write per change.
- About 1,000 daily players × 1 hour each: roughly 60k reads and 20k writes a day. That's near the free tier, so **under about $5 a month**.
- About 10,000 daily players: **roughly $20–40 a month** (Firestore operations plus function time).
- Secret Manager: about $0.20 a month.

**The 500 SEK budget alert only sends an email; it does not stop spending.** The `maxInstances: 10` limit is the real ceiling on function cost. A hard stop would need a separate billing-disable function, which I don't recommend for a live game.

### 2. Gameplay and economy numbers (proposals)

| Setting | Proposed |
|---|---|
| Coins moved from the first device | up to 1,000,000 (the rest stays in the device backup) |
| XP moved | up to 5,000,000 |
| Later devices | collection added, higher XP kept, **no coins added** |
| Earned coins per account per UTC day | 50,000 |
| Earned XP per account per UTC day | 150,000 |
| Lagos Film Festival / city festival | rent +50% for 2 rounds |
| Infrastructure upgrade (incl. Slussen) | building −50% during one named player's turn |
| Development Boom | building −25% for one round |
| Rooftop Garden / Solar Roof / Rooftop Pool / Skyline Crown | 1,800 / 1,500 / 2,600 / 3,200 coins |
| Golden Rooftop Garden | City Spotlight reward only; 1,500 coins if already owned |

### 3. App Store products (Consumable)

| Product ID | Coins | Proposed price (USD base) | Approx. Sweden |
|---|---|---|---|
| `com.kenstylez.skylineestates.coins_600` | 600 | $0.99 | ≈ 12 kr |
| `com.kenstylez.skylineestates.coins_1500` | 1,500 | $1.99 | ≈ 25 kr |
| `com.kenstylez.skylineestates.coins_4000` | 4,000 | $4.99 | ≈ 59 kr |
| `com.kenstylez.skylineestates.coins_10000` | 10,000 | $9.99 | ≈ 119 kr |

Apple sets the local prices for every storefront from the base price. The kronor figures are approximate; check them in App Store Connect when you pick each price. The game shows Apple's localized price, never these numbers.

## C. Stages and estimates

| Stage | Who | Estimate | State |
|---|---|---|---|
| Preflight fixes (#54) and full CI | Claude | done; CI about 30 min | Code done, **CI pending** |
| Approvals above | You | 15–30 min | **Waiting** |
| App Store Connect: IAP key, 4 products, notification URL, 2 sandbox testers, demo account | You (sign-in required) | 45–60 min | Not started |
| Firestore database, TTL, secrets, deploy, curl smoke test, add testers | You run the commands; I prepare and check them | 30–45 min | Not started |
| Merge #51→#54, verify the combined result, turn on cloud and purchases, signed TestFlight build | Claude (needs your merge approval) | 1–2 h plus CI | Not started |
| iPhone acceptance (checklist in `functions/DEPLOY.md` §6) | You, with my help | 1.5–2.5 h | Not started |
| Fixes from acceptance | Claude | unknown until tested | — |
| Privacy text, App Privacy, screenshots, age rating, review notes, trader-verification check, submit | Both | 1–2 h, then Apple review (usually 1–3 days) | Not started |
