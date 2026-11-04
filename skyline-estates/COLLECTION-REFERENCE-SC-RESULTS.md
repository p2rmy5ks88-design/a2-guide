# Collection reference redesign and saved SC upgrades

The Collection now follows the supplied two-panel reference: a compact category bar, filtered collectible grid on the left, and selected-item showcase, cosmetic finishes, XP, evolution and permanent-upgrade card on the right. The old token dropdown and oversized Vault navigation are removed. Portfolio and match mechanics are preserved.

## Real inventory and progression

- Tokens use the existing 16 token artworks, saved ownership, equipped seat, six rarity levels, token XP, games, wins and token-specific power paths. Sorting supports rarity, level, ownership, XP and name.
- Characters use their actual portraits, roles, unlock conditions and equip function, with existing gestures and username editing.
- Frames use the existing City Awards/season ownership checks and actual earned progress; locked frames cannot be equipped.
- Buildings show the six real in-match development appearances as a guide, without claiming collectible ownership. Permanent property rarity remains in Portfolio, linked directly from the guide. Building development and property rarity are different mechanics.
- The existing Common → Rare → Epic → Legendary → Mythic → Chaotic path is retained. The reference's five levels, example perks and blue taxi artwork are not substituted for the game's real data and assets. Stage illustrations retain the existing rarity tint treatment. Equipped cosmetic finishes remain separate.

## Saved Skyline Cash contract

The existing receipt-backed SC payment implementation remains the exclusive payment route for token and property rarity. This change also refreshes the persisted profile under the upgrade lock before eligibility checks, preventing stale screens from overwriting newer purchases, equipped cosmetics or progression. Prices and eligibility have not been rebalanced.

| Token upgrade | Saved SC | Wins with that token |
|---|---:|---:|
| Common → Rare | SC 45M | 1 |
| Rare → Epic | SC 135M | 3 |
| Epic → Legendary | SC 360M | 8 |
| Legendary → Mythic | SC 900M | 20 |
| Mythic → Chaotic | SC 1.8B | 40 |

Property rarity uses SC 30M / 90M / 240M / 600M and 1 / 3 / 6 / 12 career wins. Existing legitimate purchases and legacy building receipts remain valid.

The audited upgrade rules do not require token XP: it records completed play and is never spent. The UI explicitly says “Required XP: None · play record”, and shows accumulated XP against the next existing mastery milestone. Wins are eligibility only. Coins cannot substitute for insufficient saved SC. New token unlocks and cosmetic purchases retain their existing Coin/reward rules.

An upgrade requires ownership, the expected current level, existing win eligibility, an available next level and sufficient saved SC. A deterministic receipt is written once; stale retries cannot charge again. The receipt also restores a paid level if the profile is restored from an older backup. Failed validation or a failed debit write does not spend SC. Receipt-backed success can recover the profile after an interrupted profile save. Current match tiers, match cash and competitive mechanics are unchanged.

## Navigation and phone layouts

The bottom dock hides automatically in Collection. Its 44px Menu handle remains visible in reserved space, outside both scroll panels. Revealing navigation reserves its height, Escape collapses it and returns focus, and leaving Collection restores normal navigation. The hidden dock is inert and removed from keyboard focus. Safe-area insets are respected. At landscape widths the browser and detail independently scroll; smaller screens wrap the evolution path into three columns. Portrait Collection uses a vertical layout, without rotating the board or other screens.

## Local validation

- Collection browser: 43 checks on both the web page and the built native web bundle, with no browser exceptions. Includes 1420×900, 956×440, 844×390, 667×320 and 390×844; geometry, upgrade reachability, navigation, filters, real inventory, unchanged browsing data, exact SC debit, reload persistence and receipt recovery.
- Collection/Portfolio reference suite: 24 checks, zero browser exceptions; equipment restrictions, every token's artwork/evolution, purchase isolation, rewards, SC upgrades and existing Portfolio flows.
- Existing hotfix regressions: 21 checks each for web and native bundles, including seasons, purchases/inventory, property upgrades, duplicate/recovery behavior, mortgage controls and practice restrictions.
- Browser startup/gameplay-view smoke: 16 checks, zero page errors.
- SC transaction tests: win eligibility, existing zero-XP eligibility, duplicate requests, untouched Coins/XP/entitlements, insufficient SC, failed debit persistence, corrupt saved profile, fresh-profile checks and property rarity.
- Existing wallet (13), token mastery/economy (22), save recovery (41), session lifecycle (14), remote state (45), offline worker (17), token powers (483) and property rarity (10) checks pass.
- Native bundle builds; verifier checks 201 packaged files, five bundled fonts, preserved game source and cloud channel off. Build pipeline's 43 checks pass. Generated web/offline manifests are current; JavaScript syntax and diff whitespace checks pass.
- GitHub CI additionally runs the Collection test in Chromium and WebKit against web and native bundles. Physical iPhone testing remains a separate device check.

## Release scope

Web deployment uses this repository's existing GitHub Pages deployment. The shared native source is compatible, but existing TestFlight installations bundle local files and will require a future native rebuild. Per the owner's instruction, TestFlight waits until later implementations are complete. No TestFlight upload, App Store submission change, Apple purchase processing or signing-setting change is part of this update.

## Screenshots

These are real browser renders using isolated QA progress, not a player's account. Before and desktop after use the same 1420×1100 viewport.

- [Before](tests/evidence/collection/before.webp)
- [After desktop](tests/evidence/collection/after-desktop.webp)
- [After iPhone landscape](tests/evidence/collection/after-iphone.webp)
- [Reachable SC upgrade on iPhone landscape](tests/evidence/collection/after-iphone-upgrade.webp)
