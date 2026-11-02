# Skyline Cash and Skyline Coins — web implementation

## Scope and prior work

PR #93 and #94 are merged. PR #95 is open and contains an unbuilt header-only extension. This implementation reuses its brass SC badge and before-Coins placement and completes the wallet and progression integration on top of main `59650455a18270dd66f8e6f588b5ddc7ec0762f6`.

Only generated web entry points and web-only currency modules/tests change. `game.html`, native projects, native workflows and authoritative server rules are unchanged. All source/merge commits use `[skip actions]`; manually run web stability and let Pages publish. No iOS, Android, TestFlight or App Store builds.

## Two currencies and two SC scopes

- Match cash is the unchanged numeric board-game balance; 1600 displays as SC 1.6B in every country. Prices, rent, buildings, mortgages, auctions, taxes, trades and events keep their existing mathematics. National currency quiz answers remain factual.
- Earned SC is a separate, device-local progression wallet. It never receives ordinary rent/payday or final net worth. Its header pill precedes Coins and League and opens the wallet panel.
- Skyline Coins retain their icon, balances, Shop prices, premium unlocks and entitlements. There is no currency exchange.
- Existing online wire/log formats stay intact. The web text projection and scoped canvas formatting from PR #94 provide SC presentation without altering snapshots.

## Earning rules

Centrally configured in `lib/skyline-sc-wallet.js`:

| Source | Saved SC | Eligibility / receipt |
| --- | ---: | --- |
| Free Season tiers 5, 10, 15, 20, 25, 30, 35, 40 | 40M each | Current Season + tier; existing tier rewards unchanged |
| Weekly challenge | 25M | Actual completed objective; Season + week + objective |
| Daily mission | 5M | Actual eligible local objective; UTC day + objective; maximum three daily |
| Completed local match | 20M | Existing match ID, five rounds, two minutes and three recorded actions |
| Winning that match | +40M | Same single match receipt, maximum three rewarded matches per UTC day |
| First tower achievement | 25M | Once; existing achievement transition |
| Three towers achievement | 50M | Once; existing achievement transition |
| Complete a City's 15 Awards | 100M | Once per city; actual completion transition |

No SC match reward for online outcomes, simulations, aborted games, existing paid-out match receipts or SC-assisted practice. New Daily/major milestone grants also exclude online and assisted play. Existing weekly objectives (including online ones), XP and Coins remain unchanged. Normal local matches retain existing starting cash. End results explicitly separate match standings/net worth from actual saved SC earned during completion.

## Spending and disclosure

The sole spending use is the retained optional solo-practice boost. The wallet and Season screen explain the limits before enabling it: new offline single-human match only, at most SC 100M and 10% of ordinary player starting cash; no normal XP, trophies, challenges, Season or saved-SC progression. Players can cancel before starting. Online, pass-and-play, resumed and simulated games cannot consume a fresh bonus.

Spending is serialized with the browser's Web Locks API. Each opt-in has one receipt ID; a stale second tab cannot spend the same selection again. Browsers without secure wallet locking keep the balance but cannot spend it. Resume retains the assisted flag and cash; no second deposit.

## Persistence, migration and limits

The ledger uses separate immutable localStorage keys under `skyline-earned-sc:v1:`, one per unique receipt. Summing those receipts provides the balance and actual totals; repeated claims and concurrent clients writing the same receipt cannot duplicate its value. Full receipts are retained; the panel shows the latest 16 nonzero transactions. A compatibility mirror in `PREF.scReserve` preserves the old reserve interface; Coins and existing saves are not converted/reset.

Migration carries the exact existing reserve into an opening receipt. Legacy claimed Season/weekly rewards are acknowledged without recrediting them: the old bounded log cannot prove whether money was already spent. A profile that predates SC entirely (no legacy reserve/log fields) can safely receive a one-time backfill for already-claimed current-Season free milestone tiers. Existing achievements/city awards are not repeatedly backfilled. The wallet labels the opening amount and explains that detailed legacy source history may be incomplete.

Invalid/nonfinite/negative saved balances fail closed and are kept, rather than overwritten. Failed writes show an error and cannot report successful credits. Daily/match grants use unique UTC receipts, caps and a high-water date to reject clock rollback. Device clock fast-forward, edited localStorage, deleted browser data, cross-profile identity and trusted cross-device balances cannot be secured by this client-only architecture. The UI explicitly calls this device-local progression, not a tamper-proof wallet or entitlement. It has no verified device sync and no online ranking/purchase authority.

## Interface and validation

Brass circular SC icon, navy/teal pill, gold Coin and existing League control; responsive spacing keeps readable balances and touch targets without overlapping the profile, logo or Settings. The compact scrollable wallet contains available SC, current-Season earnings, source totals, spending, history, earning rules and Season/Daily shortcuts. No permanent navigation tab is added. Free/premium tracks and existing Coin/XP rewards remain; eligible cards visibly include SC and status.

Dedicated tests cover ledger migration and errors, duplicate claims, rollback/caps, confirmed/cancelled practice, refresh/save preservation, actual progression hooks and online text/snapshot parity in Lagos, Stockholm, New York, London, Tokyo and Johannesburg. Rendered browser tests cover 956×440, 844×390, 844×320 and 667×375 and produce before/after header, wallet/history, Season/weekly, Daily, Shop and gameplay screenshots. The full existing seven-job web suite is required before merge. Physical iPhone Safari is not available; Safari-compatible WebKit automation is reported separately.

The generated offline manifest includes all wallet assets. Existing cache-first updates wait for old game clients to close and never clear saved data. For an older iPhone copy: Save & exit, reload online to download the update, close all Skyline tabs and the standalone home-screen game, then reopen. Do not clear Safari website data.
