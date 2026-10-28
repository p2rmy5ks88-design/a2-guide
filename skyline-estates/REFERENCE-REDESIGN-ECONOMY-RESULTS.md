# Reference dashboards and collection economy — 28 October 2026

## Scope

Implements the supplied token Collection and Portfolio references using real game assets and data. Navy/gold layout, three-column token grid, selected collectible/finishes, progress and horizontal evolution previews; dedicated Portfolio sidebar with Portfolio/Assets/Growth/Income/History, eight districts, owned/missing deeds, actual property details and growth. The existing sixteen distinct token power paths, six owned rarity tiers (including Chaotic), forty-space board, scenery and art are retained. Reference mockup amounts, property names, five-district count and example player totals are not imported as game facts. The supplied illustrations inform layout; existing collectible/building artwork is reused rather than replacing models with new paid art.

Property match ownership resets per game. Collected rarity persists per city/street. Buying rarity never buys a deed or a match building; cash/build costs and house/hotel banks are independent. The dashboard distinguishes saved/current match values from future-game collection rarity. History contains real completed-game summaries, not invented purchase transactions. Listed rents exclude temporary events; utility estimates use a dice total of seven.

## Manual progression and migration

No automatic XP-only rarity advancement. XP remains a record (+100 completed game, +50 win) and existing XP/wins/owned stages remain. Every manual purchase needs saved coins AND the required wins; wins are a threshold, not spent. Token gates use wins with that token, property gates use career token wins. A property must have been collected in a match before upgrading it.

| Destination | Token cost | Token wins | Property cost | Career wins |
|---|---:|---:|---:|---:|
| Rare | 300 | 1 | 200 | 1 |
| Epic | 900 | 3 | 600 | 3 |
| Legendary | 2,400 | 8 | 1,600 | 6 |
| Mythic | 6,000 | 20 | 4,000 | 12 |
| Chaotic (existing sixth tier) | 12,000 | 40 | — | — |

Total token investment is 21,600 coins; one property is 6,400. A first 400-coin win can fund the first token or property upgrade. At 400 coins/win without any other rewards, total prices correspond to 54 wins/token and 16 wins/property; they are alternative saving goals competing with cosmetics, not guaranteed unlock dates. At a four-player 25% win rate and equal placement, base completion earnings average 193.75/game; 40 wins would take an average 160 games, so the token win gate is significant even before daily/achievement rewards. No human game-duration estimate is asserted. This is an initial transparent tuning pass, not a statistically validated retention claim.

Upgrades reread the saved wallet, check expected current stage, validate funds/wins, then persist debit and rarity together. A shared browser lock serializes supported upgrade writers. Duplicate stale confirmations cannot spend twice; cancelled and failed confirmations restore the action. Storage failure does not advance in-memory progression. Completed-match coin and token-XP receipts share a retained ID, preventing repeated completion rewards within the bounded receipt history (1,024). Upgrade receipts retain 128 entries; match history retains 32.

Existing profiles/unlocks and v2/unversioned saves are preserved. New matches snapshot token/property rarities under rules version 3. Mid-match collection purchases apply to future games. Version 2 keeps its distinct token paths without estate bonuses; unversioned saves keep original shared token perks. The existing collection-perks rule disables all new in-game rarity effects.

Street rarity adds listed rent of 0/5/10/15/25% (Common through Mythic), with existing integer rounding/set/event rules. Owned, unmortgaged Mythic streets provide one shared extra reroll (total cap three) and the existing once-per-game first-rent-half shield; multiple deeds do not stack shields. No effect comes from a bank/rival deed or a mortgaged Mythic deed. No new rail/utility rarity bonus.

## Coin audit

Previously completion paid 120/win, 70/second and 40/other offline, plus 40 online; pass-and-play could use any local human winner for the profile bonus. New base completion pays 400/175/100, with outcome taken from the actual profile player. The online-only 40 bonus is removed, so the same outcome earns the same base reward. Existing token coin bonuses remain (new token paths up to 25%, preserved legacy tier up to 50%). Simulations/unfinished games grant no completion reward.

The free daily wheel still has eight equal outcomes, including XP/booster slots. Coin slots rise 25/50/75/150/500 → 50/100/150/300/1,000. Expected coins per free daily spin rise 100 → 200; maximum coin chance remains 1/8 (12.5%). No paid spin or changed probability. Existing missions, level, league, achievements and cosmetic prices remain; separate rewards can make the total wallet change larger than the completion receipt.

## Validation

- 22 collection economy regressions: reward identity/replay, no auto evolution, both independent gates, exact spend, duplicate clicks, stale wallet, persistence failure, old unlocks, invalid purchases and wheel expected value.
- 10 source-kernel property checks covering all five rent tiers, ownership, mortgage/off/legacy compatibility, nonstacking shared protection, physical building costs/banks, trusted setup bounds/detachment and public projection.
- 483 distinct-token gameplay/compatibility checks across sixteen tokens and six tiers.
- Reference browser suite: desktop and phone layout, all real data views, stage preview side effects, win gate, cancel/reconfirm, manual future-game upgrades, completion/reload/replay and 48 seeded evolved-token/property-rarity games. Records rounds, errors, cash and both bank invariants and outcomes in uploaded JSON.
- Full existing security/emulator and browser stability suites run in pull-request CI. Final run evidence follows after completion.
- Generated standalone/offline artifacts include the new local UI script. Board/scenery/art files unchanged.

## Remaining limits

Progression remains a device profile, not a signed competitive wallet or multi-device account ledger. The browser lock covers upgrade writers, not all legacy profile writers; cross-tab gameplay/profile updates are not a transactional server system. Retained receipts are bounded. Production trusted roster policy must verify entitlement snapshots; this change does not deploy the optional authoritative service, change Firebase permissions, enable paid services, or release native/store apps. Broader Phase 1 work remains tracked in issue #2.
