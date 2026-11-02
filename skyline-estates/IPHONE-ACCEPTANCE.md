# iPhone acceptance: private TestFlight (cloud channel `private-testing`)

Record the build number, date and actual result for every row. "Pass" only when you saw it happen.

**Payment preparation checkpoint (2 November 2026):** stable build 153 keeps purchases off and its restore fix is owner-verified. Do not attempt this payment checklist on that build. A later private-testing build follows only after the paused backend session is explicitly authorized and checked. See `PAYMENT-PREPARATION.md`.

Your normal Apple account can remain signed into the iPhone: TestFlight purchases are free test transactions. The dedicated **Skyline game test account** is a different login and needs no payment card. Do not use the owner's normal game account or the App Review demo account for this test run. Advanced sandbox controls may require a separate Sandbox Apple Account; those accounts also need no card. [Apple TestFlight](https://testflight.apple.com/).

## 0. Protect your own progress first (about 10 minutes)

1. **Find where your real progress is.** Open each Skyline Estates copy on the iPhone (the TestFlight app and any older installed copy) and note the coins and level in each.
2. **Back up the whole iPhone:** Settings → [your name] → iCloud → iCloud Backup → *Back Up Now*. Or use an encrypted backup in Finder (Mac) / Apple Devices (Windows). App data, including game saves, is part of that backup.
3. **Do not delete or offload either app.** Deleting the app deletes its save. A TestFlight update over the same app keeps the save.
4. After installing the new build: Settings (gear) → Account → **Save a copy of my progress** (share to Files, or copy into Notes). The new build also keeps automatic device backups before any account change.
5. Never add your real player account as a tester, and never run `testers.cjs reset` on it.

## 1. Accounts (your dedicated test account)

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | Sign in with the **test** account (email or Apple) | "Test account" prompt; your own coins are **not** added; test balance shown | |
| 2 | Sign out | "Your own progress is back"; your original coins and level shown | |
| 3 | Sign back in to the dedicated **game test account**, using its cloud progress | Test balance returns; owner's local backup is retained and not imported | |
| 4 | Second device or a reinstall of the *test* account only | Same test balance; no coins from the device added | |
| 5 | Airplane mode: play, earn, spend, then online | Balance syncs once; no duplicates | |

## 2. Purchases (sandbox Apple ID, test account signed in)

| # | Step | Expected | Result |
|---|---|---|---|
| 6 | Shop → Coins | 4 packs with Apple's **kronor** prices | |
| 7 | Buy 600 | Exactly +600 once | |
| 8 | Buy, then Cancel on the sheet | No charge, no coins | |
| 9 | Ask to Buy / pending (sandbox setting) | No coins until approved, then credited automatically | |
| 10 | Pay, then immediately swipe the app away | On relaunch, coins arrive once | |
| 11 | Buy on this phone, check another device / reinstall | Same balance | |
| 12 | Purchase while signed out | Asked to sign in; no payment sheet | |
| 13 | In-app **Account & recovery → Purchases → Request a refund** for a test pack; confirm Apple's actual REFUND notification with the server operator. A TEST notification does not count | Balance goes down once after a confirmed refund; if already spent, debt shown and repaid first | |
| 14 | Owner pause (`store-pause.cjs on`), try to buy | "Purchases are paused"; no payment sheet; then `off` | |

## 3. Deletion (test account only)

| # | Step | Expected | Result |
|---|---|---|---|
| 15 | Account → Remove account → Apple sheet → confirm | Account gone in Firebase → Authentication. iPhone Settings → Apple ID → Sign in with Apple no longer lists Skyline Estates. Device save still there | |

## 4. City Spotlight and rooftops

| # | Step | Expected | Result |
|---|---|---|---|
| 16 | Progress → Spotlight → Play Lagos with strategic events | Event chip appears; Development Boom in round 3; costs shown −25% | |
| 17 | Finish 3 Lagos matches | 3/3; claim Golden Rooftop Garden once | |
| 18 | Equip it and start a match with houses | Golden roofs on your buildings on the 3D board | |
