# Skyline player service: deployment and acceptance runbook

**Status: not deployed.** Nothing in this folder runs until the owner performs the steps below. Accounts, cloud sync and purchases stay off in the game (`lib/cloud-config.js`: `enabled:false`, `purchases:false`) until the acceptance list at the end passes.

What gets deployed: one HTTPS Cloud Function, `skylinePlayer` (Gen 2, `europe-west1`, at most 10 instances), in Firebase project `eko-estates`. It uses the Firebase Admin SDK, Firestore and the existing Firebase Authentication providers. It doesn't change Realtime Database rules, Hosting or anything used by online rooms or Eko Estates.

Design: `../security/UNIFIED-PROFILE-DESIGN.md`. Code under test: `../security/service/*.cjs`. `npm run prepare-service` copies the eight modules here at deploy time, so production runs exactly the tested files.

## 0. Owner approvals needed (I can't do these for you)

| # | Step | Where | Why |
|---|---|---|---|
| A | Approve deploying the function and its secrets | You run the commands in step 3 | New live service and billing on Blaze |
| B | Create an App Store Connect **In-App Purchase** key | App Store Connect → Users and Access → Integrations → In-App Purchase | Server checks purchases with Apple. This is **not** the existing build-upload key |
| C | Create the four coin products | App Store Connect → app 6828220714 → Monetization → In-App Purchases | The products must exist before sandbox tests |
| D | Set the App Store Server Notifications V2 URL | App Store Connect → App Information | Refunds reach the server |
| E | Create sandbox tester Apple IDs | App Store Connect → Users and Access → Sandbox | Real purchase tests without real charges |

Never paste keys, passwords or verification codes into chat, GitHub or this repository.

## 1. Firestore

Firebase console → Firestore Database. If **no database exists**, create the default database in **production mode**. Production mode denies all client access, which is what we want: only the function, using the Admin SDK, reads or writes these documents. Choose location **`europe-west1`** (same region as the function and the existing Realtime Database).

Then add a **TTL policy**: Firestore → TTL → collection group `ledger`, timestamp field **`skylineLedgerExpireAt`**. Only Skyline ledger (history) rows carry that field, so they expire after 24 months, as the privacy text says. Balances (account documents), owned items, idempotency records, store bindings and purchase anti-replay records have no TTL field and never expire. A TTL policy applies to every collection named `ledger` in the database, but documents without this exact field are untouched. Before enabling it, check in the console that no other app stores a field with this name (none should).

If a database **already exists** with other data, **don't change its rules.** The function doesn't need rule changes. Check that no existing rule allows client access to `skylineWallets/**` or `skylineAccounts/**`; with the default deny they are closed.

## 2. Secrets and parameters (on your own computer)

```bash
cd skyline-estates/functions
npm install
# Apple's public root certificates (not secret): download from https://www.apple.com/certificateauthority/
#   AppleRootCA-G3.cer and AppleRootCA-G2.cer -> apple-roots/
#   Compare each file's SHA-256 with the fingerprint Apple publishes.
firebase functions:secrets:set SKYLINE_APPLE_IAP_KEY --project eko-estates --data-file ~/Downloads/SubscriptionKey_XXXX.p8
firebase functions:secrets:set SKYLINE_APPLE_IAP_KEY_ID --project eko-estates      # the key's 10-character ID
firebase functions:secrets:set SKYLINE_APPLE_IAP_ISSUER_ID --project eko-estates   # Issuer ID shown on the Integrations page
```

Then delete the downloaded `.p8` from Downloads once it is stored. Apple lets you download it only once, so keep an offline copy in your password manager.

Create `skyline-estates/functions/.env.eko-estates` (not secret, not committed):

```
SKYLINE_ENVIRONMENT=production
SKYLINE_APP_APPLE_ID=6828220714
```

Use **`production`**. The TestFlight build you test is the same binary Apple reviews and releases, so it must talk to the production service. TestFlight and App Review purchases still happen in Apple's Sandbox (no real money). The production service credits a Sandbox purchase **only to accounts you list as testers** (`node scripts/testers.cjs add <uid> "note"`). For any other account it refuses the purchase with `sandbox-purchase-not-allowed`, so test coins can never reach a real player's balance. Tester accounts are marked `tester:true` and their ledger rows record `environment: sandbox`. Use dedicated test accounts (one for you, one App Review demo account), never your real player account. `sandbox` stays available for a separate throwaway deployment, but it isn't needed.

## 3. Deploy (approval A)

```bash
cd skyline-estates/functions
firebase deploy --only functions:skyline-player --project eko-estates --config firebase.json
```

Before uploading, the deploy refreshes the service copy and refuses to continue without Apple roots. Check:

```bash
curl -s https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer/v1/profile
# -> {"error":"unauthenticated"}  (expected without a sign-in token)
```

Cost guard: `maxInstances: 10` and roughly 2 reads + 3 writes per sync. Keep the existing 500 SEK budget alert. It warns but does not cap spending. Add a Cloud Monitoring alert on function error rate above 5% in Google Cloud console → Monitoring → Alerting.

## 4. Products (approval C)

Create **Consumable** products with exactly these IDs. The server and app only accept these.

| Product ID | Coins | Suggested reference name |
|---|---|---|
| `com.kenstylez.skylineestates.coins_600` | 600 | Coins 600 |
| `com.kenstylez.skylineestates.coins_1500` | 1,500 | Coins 1500 |
| `com.kenstylez.skylineestates.coins_4000` | 4,000 | Coins 4000 |
| `com.kenstylez.skylineestates.coins_10000` | 10,000 | Coins 10000 |

You choose the price tiers. The game shows Apple's localized price, not the draft `$0.99` labels. Add a review screenshot of the Shop → Coins tab to each product. The starter bundle stays disabled; don't create it.

Notifications (approval D): App Store Server Notifications **Version 2**, the same URL for Production and Sandbox:
`https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer/v1/store/apple-notifications`

How notifications are handled (signature always verified first, then app and environment):
- `REFUND` removes that purchase's coins once. If they were already spent, the account goes into debt that new coins pay off first.
- `REFUND_REVERSED` gives the coins back once. A refund that arrived before delivery is cleared, so the normal delivery credits once.
- `TEST`, `CONSUMPTION_REQUEST`, `REFUND_DECLINED` and other verified types are acknowledged with no wallet change.
- Deterministic rejections (unknown or removed account, owner mismatch) are acknowledged so Apple stops retrying. Temporary errors return 5xx so Apple retries.

## 5. Turn on in a TestFlight build (reviewed commit)

Edit `skyline-estates/lib/cloud-config.js` to `enabled:true, purchases:true`. Run `python3 skyline-estates/build.py`, open a PR, let CI pass, merge, then run the manual iOS publish workflow to TestFlight. Don't make this change on `main` before steps 1–4 are done.

## 6. Acceptance list: all must pass before App Review

Use a physical iPhone, a TestFlight build and sandbox testers. Record the date, build number and result for each row in `skyline-estates/security/PUBLIC-RELEASE-CHECKPOINT.md`.

**Accounts**
1. Apple sign-in on a fresh install creates an account. The "Save your progress" prompt appears, and **Move my progress** moves coins, XP, tokens and dice.
2. Email account: register, verification email, password reset. An unverified email can't sync and shows "Verify your email".
3. A second device on the same account shows the same balance, adds its collection and keeps its own coins in a backup.
4. Signing into a different account on the same phone offers "Use this account" only, and the first account is unchanged.
5. Airplane mode: play, earn and spend. Back online, the balance syncs once with no duplicates.
6. Remove account: Apple sheet → removal. The account is gone in Firebase Authentication, and its Apple ID → Sign in with Apple list no longer shows Skyline Estates. The device save remains.

**Purchases (sandbox tester)**
7. Each of the four packs shows Apple's localized price and credits exactly once.
8. Cancel on the payment sheet: no charge, no coins.
9. "Ask to Buy" (pending): no coins until approved, then coins arrive automatically.
10. Kill the app right after paying: on relaunch the coins are delivered once and the transaction finishes.
11. Buy on phone A: the balance appears on phone B after sync.
12. Purchase while signed out: the app asks for sign-in first, and no transaction starts.
13. Refund a real sandbox purchase: on the iPhone, Settings → App Store → Sandbox Account → Manage → Refund (or reportaproblem.apple.com for the sandbox account). Then wait for Apple's REFUND notification and confirm the balance goes down. If the coins were already spent, debt is shown and new coins pay it back first. A TEST notification only proves the URL is reachable; it does **not** count as the refund test.
14. Reinstall: sign in → balance restored from the account.
15. Forged or edited request (curl a fake `signedTransaction`): rejected with a code, no coins.

**Gameplay safety**
16. Normal matches, City Events off: no rule change; seeded simulation suite green.
17. Season tier claims and Lucky Spin behave as before; daily cloud limit message appears only past 50,000 coins/day.

## 7. Privacy and store listing (before App Review)

Replace the "Accounts" and "In-app purchases" sections of `privacy.html` with the text below **in the same PR that enables the service**:

> **Accounts and cloud save.** If you sign in with Apple or email, Google Firebase stores your account identifier, your sign-in method and (for email accounts) your email address. Your coins, XP, owned items, equipped items and progress milestones are saved to your account so they can be restored on other devices. A record of each change, such as "Lucky Spin" or "Purchase", is kept for up to 24 months for support and fraud prevention.
>
> **Purchases.** Coin packs are bought through Apple. We receive Apple's signed purchase record (product, transaction ID and an anonymous account token), never your payment details. If a purchase is refunded, its coins are removed from your account balance.
>
> **Deleting your account.** Settings → Account → Remove account permanently deletes your account, cloud progress and coin balance, including purchased coins, and revokes Sign in with Apple. To prevent refund fraud we keep purchase transaction records without your name, email or account ID. Your device save stays on your device.

App Store Connect → App Privacy: declare **Identifiers (User ID)**, **Contact Info (Email Address, only for email accounts)** and **Purchases (Purchase History)**, all *linked to the user* and *not used for tracking*.

## 8. Rollback

Set `enabled:false` / `purchases:false` in `lib/cloud-config.js` and ship. Players keep their device saves. Already-delivered purchases stay in their account, and the function can keep running for refund notifications. Don't delete Firestore data while purchases might still be refunded.

## 9. Stopping purchases safely and recovering after a pause

**Stop new purchases (no new build needed):** run `node scripts/store-pause.cjs on`. Within about 30 seconds the app's request for a store binding is refused with `store-paused`. The app asks for that binding **before** Apple's payment sheet opens, so nobody is charged. Purchases that are already paid are still delivered and refunds are still processed. Resume with `off`.

**If a Cloud Functions spend cap (or an outage) pauses the whole service:**
- **New purchases:** the binding request fails, so the payment sheet never opens and there's no charge.
- **Purchases already paid on Apple's side:** these stay **unfinished in StoreKit**. The app only finishes a transaction after the server confirms durable delivery. When the service is back, the app replays unfinished transactions at launch and delivers each one exactly once (the global transaction key prevents doubles).
- **Cloud saves:** queue on the device (offline outbox) and upload when the service returns. Nothing is lost.
- **Refund and refund-reversal notifications from Apple:** Apple retries failed deliveries for a while. If the pause outlasted those retries, recover them from Apple's notification history (up to 180 days):
  `SKYLINE_IAP_KEY_FILE=~/secure/SubscriptionKey_XXXX.p8 SKYLINE_IAP_KEY_ID=... SKYLINE_IAP_ISSUER_ID=... node scripts/replay-notifications.cjs 30 production`
  Run it for `sandbox` too during testing. It's safe to repeat: every notification goes through the same verified, idempotent path, and ones already handled change nothing. The output counts applied, ignored, acknowledged and retry items. Re-run until `retry` is empty.
- **Records:** purchases, deliveries and refunds live in Firestore (`skylineWallets/<env>/purchases|deliveries`) and are never removed by TTL. A spend cap never deletes data.

## 10. Private TestFlight builds (cloud on) versus everything else (cloud off)

- The web game, Android, desktop and every automatic iOS build ship with accounts and purchases **off**.
- Only the manual iOS workflow run with `cloud_channel = private-testing` (and `publish = true` for TestFlight) bakes a config that turns them on. Even then they're only on inside the iOS app.
- **Never submit a private-testing build for public review.** A public candidate needs its own reviewed release channel.
