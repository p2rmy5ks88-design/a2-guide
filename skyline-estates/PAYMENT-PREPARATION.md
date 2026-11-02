# Coin shop preparation — 2 November 2026

This is separate development on `skyline-payment-safety`, based on `5ef8884` / the runtime of stable private build 153. The owner confirmed the iPhone restore fix works. No public purchase switch, live backend, IAM, App Store product price, public submission or installed TestFlight build is changed by this work. PR #68 remains a separate unmerged draft.

## Implemented

- Refuse a purchase before Apple's sheet when a restored local save is active, the signed-in game account has no configured cloud wallet, or a private testing build is using a normal player account. Keep local test resources separate from purchased account coins.
- Respect device payment restrictions before requesting an account binding or opening payment. Reject catalog results that arrive after switching game accounts.
- Await the account balance refresh before displaying Coins added. A verified/finished transaction remains delivered if the subsequent balance read fails; show Purchase saved / balance pending, without attempting a second grant.
- Distinguish a failure before payment from uncertain status after Apple's purchase flow starts. The latter never claims Nothing was charged, never finishes an unverified receipt, and tells the player not to repurchase to retry delivery.
- Recover unfinished purchases after later sign-in, reconnect, foreground, and an explicit Sync now. Recovery is single-flight; successful empty scans are not polled continuously. Transient failures or pending delivery retry on the existing 30-second foreground timer. This does not open a new payment sheet.
- Display View price until Apple's localized catalog is available, rather than the game's illustrative USD fallback. Pack amounts and configured prices are unchanged.

## Validation and limits

Passed locally: **21 StoreKit client tests**, **27 purchase UI checks each in Chromium and WebKit** (956x440), **9 purchase/refund lifecycle checks**, **13 restore regressions**, the existing real-game cloud/restore browser suite, **10 purchases-off release UI checks**, **43 pipeline checks**, and **173-file native asset parity** in both `private-testing` and `ios-release` packages. The local reward module is excluded in both payment-preparation packages. Screenshots of the local-save purchase guard were visually checked after the dialog animation completed.

Tests use the real JS client, real wallet/reducer and fixture Apple data, plus real game pages with a stand-in native StoreKit bridge. They do not perform real Apple transactions or modify live player data. Native packaging is verified locally; no new simulator/device compilation, signed archive, full remote CI run or TestFlight upload was performed for this draft.

A new regression fails against the previous StoreKit client: after a successful verified delivery and finish, a subsequent offline wallet read rejects the entire purchase. It passes with the fix. Existing duplicate, interrupted delivery, refund, refund reversal and refund-before-delivery scenarios remain covered.

Physical purchase/cancel/pending/refund/reinstall testing is **not yet done**. There is no new signed IPA or TestFlight upload in this milestone. Build 153 remains the owner's stable installed baseline, with purchases off.

## Two different accounts — no card needed on the demo

| Account | Purpose |
|---|---|
| Normal Apple account on the iPhone | App Store / TestFlight purchase sheet. It can stay signed in. TestFlight purchases use Apple's test environment and are free. |
| Dedicated Skyline game test account | Signs into the game using email/password and receives the server's permanent tester flag. This is unrelated to payment cards. Never mark the owner's normal Apple-linked game account as a tester. |
| Optional Sandbox Apple Account | Advanced sandbox controls. It does not need a payment card. It is separate from the Skyline game login. |

Use a fresh dedicated game tester, not the reviewer demo account while Apple is reviewing 1.0. Preserve the owner's local backup, then explicitly select the test account's cloud progress. Free test coins stay in that account and must not be imported into the owner's normal account.

Apple sources: [TestFlight](https://testflight.apple.com/), [Testing In-App Purchases with sandbox](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox).

## Remaining gates; no live actions authorized by this preparation

1. The owner paused all live backend/IAM deployments pending a chosen session, including the staged #57/#66 changes. Do not treat this PR or the old approval as permission to deploy. Verify the live runtime revision first; it was not inspected here. Keep the public 1.0 review active.
2. In an explicitly authorized session, complete/review the existing server rollout and verify purchase/refund delivery and account isolation. The main branch references the dedicated runtime account; do not deploy it blindly if that account/grants are absent. Estimate 30–45 minutes after access is ready.
3. Verify the four App Store products and localized prices, create/verify a fresh Skyline tester and mark only that account. Expected owner-approved packs: 600 / 1,500 / 4,000 / 10,000; Swedish prices 9 / 19 / 49 / 99 kr, subject to the actual Apple catalog. Never attach a card to a demo merely for TestFlight testing.
4. Build only the `private-testing` iOS channel for payment acceptance, with the private local reward option **off**. Preserve the stable restore fix and local backup. Estimate 20–35 minutes including build/processing, subject to Apple.
5. On the phone, check one free purchase, cancellation, interruption/recovery, account switching and an in-app refund. Confirm server ledger and exactly-once balance changes; test spent-refund debt too. Estimate 20–30 minutes of owner testing, plus investigation if anything fails. Use `IPHONE-ACCEPTANCE.md` and record evidence, not assumed passes.
6. Before enabling a public payment build, review store-environment handling: server rejection of a production purchase on a permanently marked tester is not by itself a pre-payment block. Public tester/reviewer handling needs verification before any real-money sheet can open. Current `ios-release` purchases remain off; do not merge the flag-only activation in #68 as a shortcut.
7. Public activation, merging the later payment release and App Store review submission remain separate decisions after the acceptance gates pass. No withdrawal/replacement of the current submission.
