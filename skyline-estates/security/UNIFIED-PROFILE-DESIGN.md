# Unified cloud wallet and progress sync — design

Status: implemented as code and tests in this branch. **Not deployed and not enabled.** `SKYLINE_CLOUD.enabled` stays `false` until the owner approves deployment and the acceptance gates at the end pass.

This replaces "separate earned and purchased balances" with **one server-owned balance per account**, as the owner chose.

## 1. One balance, one document

The existing scoped wallet document `skylineWallets/{env}/accounts/{sha256(uid)}` remains the only balance. It now also holds the player's synced progress:

| Field | Meaning | Merge rule |
|---|---|---|
| `coins`, `debt` | the one balance (purchases, earnings, spending, refunds) | server ledger only |
| `xp` | total profile XP | server ledger only |
| `inv.{kind}.{id}` | owned collection items (tokens, dice, finishes, scenery, cities, frames, rooftops) | union; nothing is ever removed |
| `max.{field}.{key}` | token levels, token wins, token mastery stages, best-ever stats | per-key maximum |
| `eq`, `eqRev` | equipped items | newest revision wins |
| `migration` | how and when device progress first joined this account | written once |
| `earn` | today's UTC earning counters for caps | reset at 00:00 UTC |
| `promos` | promo codes this account has redeemed (code hash) | written once per code |
| `rev` | increases on every change; returned to clients | — |

Purchases (`firestore-wallet.cjs`) and profile operations (`profile-service.cjs`) change the **same** `coins` field inside Firestore transactions, so a purchase on one phone and a spend on another can't overwrite each other.

Idempotency records live in `accounts/{hash}/ops/{sha256(requestId)}` and store a digest of the request. Repeating a request ID returns the first result. Reusing it with different content fails with `idempotency-conflict`.

## 2. What the client sends

The game keeps playing from its local save (`skylinePrefs`). When an account is linked, a small sync layer (`lib/cloud-profile.js`) watches each save and records **differences** since the last state it knows the server has:

- a coin difference (with reasons such as `Lucky Spin` or a promo code),
- an XP difference,
- newly owned items,
- higher per-key values (token levels and so on),
- an equipped-item change.

Each difference becomes one operation with a random request ID. It is stored in a per-account outbox in local storage **before** it is sent. If the app is closed, offline or crashes, the operation is re-sent later with the same ID, so it is applied once. It doesn't matter which game code changed the save (shop, collection upgrades, promo, season track), because the difference is measured on the saved values.

After every response, the client rebuilds what it shows: **server value + still-unsent local changes**. A second device therefore sees purchases, earnings and spending made elsewhere, and nothing is counted twice.

## 3. Rules the server enforces

- **Earned coins and XP are reported by the device.** Matches against AI run on the device and cannot be proven. The server limits them: at most **50,000 earned coins and 150,000 XP per account per UTC day**, and at most 20,000 coins per operation. Anything above the limit is not credited and the response says so. Verified purchases and valid promo codes are not counted against the limit.
- **Promo codes:** the client sends the code text. The server hashes it, checks its own copy of the promo table (hashes only) and the expiry on the server clock, and allows it once per account.
- **Spending** can only lower the balance. It can't go below zero or be paid from refund debt. An account with refund debt can't spend.
- **Items** must use a known kind and a safe ID (`[a-z0-9_-]{1,40}`). An account holds at most 2,000 items. Per-key maxima are bounded numbers with whitelisted field names.
- Only verified Apple, Google or email-verified password accounts can use the service (`wallet-auth.cjs`). Guest/room identities can't.

Purchased coins can't be created by any client operation. Only `firestore-wallet.cjs` adds them, after StoreKit verification.

## 4. Moving existing device progress (one-time migration)

Nothing is uploaded at sign-in. The player chooses.

**First device on an account** — "Move this device's progress to your account":
- coins up to **1,000,000** (anything above that stays in the device backup),
- XP up to **5,000,000**,
- all owned items and per-key maxima,
- equipped items.

**Any later device** — "Add this device's collection":
- items are added (union), XP and per-key values take the **higher** value,
- **coins are not added** (that would let one balance be copied onto several phones). This device's coins stay in a saved local backup and the player is told so before confirming,
- or "Use my cloud progress only", which keeps the device progress as a backup without merging.

The server decides which case applies (`migration` already present means "later device"), so a modified client can't import coins twice. Before the device save is replaced by the account's state, the whole local save is copied to `skylinePrefs.backup.{time}`. The account panel lists these backups so they can be restored after signing out.

**Account switching:** after migration the local save is tagged with the account (`PREF.cloudOwner`, a hash). Signing into a different account moves the current save into a backup and loads the other account. That save can't be migrated into the second account, which prevents copying progress between accounts. In-progress saved matches are never changed by sign-in.

## 5. Offline play and retry

- Operations queue while offline and are sent when back online, when the app returns to the foreground, and every 30 seconds while there is work to send.
- Failed sends back off from 2 s to 5 min. Server errors that will never succeed (validation) are dropped from the queue and shown once. Network errors are retried.
- The outbox is limited to 200 operations. Further changes are merged into the last queued operation, so nothing is lost.
- Daily caps use the **server's** UTC day, so changing the phone's clock has no effect.

## 6. Account deletion and Sign in with Apple revocation

The account panel explains first that unspent coins, including purchased coins, and cloud progress will be lost, and that the device save stays on the device. Then:

1. The player signs in again (recent authentication).
2. For Apple-linked accounts, the app revokes the Apple token with Firebase Auth's `revokeAccessToken` using the authorization code from that fresh Apple sign-in (TN3194).
3. The app calls `DELETE /v1/account` with the fresh ID token. The server refuses tokens older than 5 minutes.
4. In one transaction the server marks the account `deleted`. Later purchases are refused and can't be restored to that account. It then deletes progress, idempotency records, ledger history and store bindings, and finally deletes the Firebase Auth user.
5. Kept: `purchases/{transactionKey}` anti-replay and refund records, with the owner replaced by an irreversible hash. This prevents a refunded or replayed transaction from being re-credited. Documented in the privacy page.

## 7. What still needs the owner

- Approve creating the deploy service account and secrets, and deploying the function. The commands are in `skyline-estates/functions/DEPLOY.md`. No live rules are replaced; the function uses the Admin SDK.
- Create the four consumable coin products in App Store Connect with real prices.
- Run the sandbox acceptance list in `DEPLOY.md` on a real iPhone. Only then set `SKYLINE_CLOUD.enabled` / `purchases` to `true` in a reviewed commit.

## 8. Known limits (stated honestly)

- Earned coins remain device-reported (capped). A determined cheater can earn up to the daily cap without playing. This doesn't affect purchased coins or other players, because competitive rankings remain separate and device-reported.
- Counters merged by maximum (token wins and so on) can undercount when two devices play offline at the same time. They never double count.
