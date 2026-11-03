# TestFlight feedback: landscape management, saved SC, launch Season 1

Permanent building rarity upgrades now spend earned SC: Rare SC 200M / 1 career win, Epic SC 600M / 3 wins, Legendary SC 1.6B / 6 wins, Mythic SC 4B / 12 wins. Each price is the cost of that next step. Token upgrades retain their existing Coin prices. Existing rarity, Coins, XP, purchases, item ownership and earned-SC receipts are retained. The live board still uses match cash and existing construction/mortgage rules; permanent upgrades apply only to future matches with perks enabled.

An immutable negative SC receipt records each paid property/stage and restores the paid rarity after a profile-backup rollback. A retry never debits that stage again. SC remains device-local, separate from the paid Coin account; no Coin conversion or paid SC product is added.

The reported missing trophies/career upgrade eligibility was confirmed by the owner as an SC-assisted practice match. Practice intentionally earns no progression. Its launch button, prompt and results now explicitly disclose no trophies/career wins/building eligibility; the wallet instead prioritizes Building upgrades. A normal completed Stockholm win is covered end-to-end: 30 trophies, one career win, property collection and SC-funded upgrade. Assisted results never enter verified standings.

Mortgage management hides the construction summary under Mortgaged, provides a tall list and a direct 52-CSS-pixel redemption control for every mortgage, and selects a mortgaged property in the detail panel. Actions recheck the existing canUnmort/unmortgage formula and persist the save. Debt mode keeps its separate single-column management layout.

Launch Season 1 starts 3 November 2026 UTC and ends 18 December 2026 UTC. Internal season IDs start at 1001, while the UI displays 1. This avoids reusing historical s1/s2 cloud maxima, claims, challenge receipts or leaderboard paths. The previous local season/trophies are archived; the first migration resets seasonal XP, claim slots and trophies once, while preserving already-unlocked items and the previous premium pass for the launch season. Career progression and league-promotion payment receipts are retained. Clock rollback cannot reopen a past season.

The isolated competition service uses the same epoch and new season namespace. Historical statistics and results are retained, not deleted. Old standings/community totals are absent from launch queries; pre-launch match starts cannot be ingested into launch standings. No wallet/IAP function, IAM or database rule change is required.

The device leaderboard refresh submits only if its existing privacy consent permits publication, and its own displayed row uses current local trophies/level rather than stale server values. Device-reported and authoritative verified rankings remain separate.

Regression: testflight-hotfix-browser.cjs runs against both web and the actual generated native bundle on Chromium/WebKit in CI; it covers migration, balances, normal/practice completion, SC upgrades/cancellation/recovery and 956x440 / 844x390 / 667x320 redemption. competition-service.cjs adds launch-isolation and pre-launch result rejection. Existing gameplay, currency, save, debt, portfolio and release gates remain enabled. Native OS and StoreKit bridges are doubles; a physical iPhone acceptance pass is still needed.
