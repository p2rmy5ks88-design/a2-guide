# Portfolio and token mastery — 2026-10-27

Related to [PR #32](https://github.com/p2rmy5ks88-design/a2-guide/pull/32) and issue #2. Tested implementation: `0a5f904a4b301137cfe0f7133a9dab72cbce5b46`. Source SHA-256: `87de8b145788bd11ce3325ceaa7973aae39571aaac857b998a9d4157631b8f64`.

## Portfolio

The existing estate drawer now summarizes completed districts, houses/towers and mortgages beside cash, property count and net worth. Every district, transit group and utility group has an ownership bar; untouched groups start collapsed. Missing shows the absent properties and distinguishes bank-owned squares from another player's property. The next-move hint uses actual source build legality or the closest unfinished owned district. Missing properties are informational; no purchase or trade is executed by a hint.

The original selected-property illustration, development ladder, mortgage/redemption/build/sell/locate/trade controls and custom rules remain. Phone totals now fit without ellipsis. Confirmed preview defects were fixed: a previously untouched district opens on its first click, the narrow cash/assets/net-worth totals wrap safely across fonts, and pass-and-play account reward bonuses now use the profile player’s token rather than the best-placed guest’s token.

## One evolution system

The six existing rarities and token models are reused. The old workshop coin upgrade button is replaced by the earned evolution track and token-specific power comparison. Owned stages and historical token wins are retained; XP starts from actual newly recorded completed games. A new stage changes the next game's tier, without rewriting an active player's in-game tier. New games carry tokenPowerVersion 2; older saved games retain the original shared perk rules. Unknown future rule versions are refused. The trusted public projection preserves the approved version tag.

Completed games grant **100 token XP**, plus **50 XP for a win**. Both XP and wins with that token are required; evolution is automatic and has no coin charge. A loss contributes XP. Quitting, simulation/FAST games and a repeated retained completion receipt award nothing. Token XP is separate from account/player XP.

| Stage | Total token XP | Token wins |
| --- | ---: | ---: |
| Common | 0 | 0 |
| Rare | 200 | 1 |
| Epic | 600 | 3 |
| Legendary | 1,400 | 7 |
| Mythic | 3,000 | 15 |
| Chaotic | 6,000 | 40 |

The six stage previews show the selected token's existing 3D geometry in the stage colour, requirements and actual powers. Previewing cannot buy, unlock, equip or change the profile tier. Token purchase/unlock and cosmetic finishes remain separate.

## Distinct powers

These paths compose the existing Payday, voluntary human re-roll, Lucky Pass, one-use rent shield, one-use first-Start surge and game reward mechanics. They introduce no new landing/card/movement rules. Common has no power. The host Token perks switch still gates the powers. Limits remain explicit: no more than three re-rolls or Lucky Passes, one half-rent shield, one first-Start surge, and capped reward/income percentages.

| Token | Power path | Chaotic effects |
| --- | --- | --- |
| City Bus | Safe Passage | 2 Lucky Passes; first rent bill halved |
| Tuk-tuk | Second Chance | 3 re-rolls |
| Scooter | Slip Through | 3 Lucky Passes |
| Drum | Drumbeat | +25% player XP from a game |
| Stew Pot | Steady Pot | +10% Payday; first rent bill halved |
| Eagle | Eagle Eye | 2 re-rolls; 1 Lucky Pass |
| Taxi | Meter Bonus | +25% Payday |
| Sailboat | Fair Winds | +15% Payday; 1 Lucky Pass |
| Horse | Winning Stride | +10% Payday; 2 re-rolls |
| Canoe | River Guide | 1 re-roll; first rent bill halved |
| Steam Train | Reliable Route | +15% Payday; first rent bill halved |
| Carnival Mask | Encore | +25% game coins |
| Jet | Flight Plan | 2 re-rolls; +20% player XP |
| Rocket | Launch Surge | +5% Payday; 1 re-roll; first Start payday tripled |
| Crown | Royal Dividend | +10% Payday; +10% game coins |
| Barrel | Reserve Fund | First rent bill halved; +10% game coins |

The source rule adapter imports the same power definitions. Existing reroll fixtures now select the token that actually owns the tested ability; Lucky Pass, shield, surge and income scenarios retain their concrete assertions. This replaces the previously shared bundle intentionally; it is not a claim that every matchup is statistically balanced.

## Verification

Local passing evidence: **12 mastery regressions**, **483 source-kernel gameplay/compatibility checks** across all 16 tokens/six tiers, **14 browser UI/reward checks**, and prior local kernel/service suites. UI coverage includes ordinary building/mortgaging, missing ownership, first-click expansion, phone totals/actions, safe future-stage peeking, different token paths, actual result-screen XP/evolution, reload persistence and no simulation rewards.

The extra 48 seeded evolved-token simulations use four AI seats, rotated across all 16 tokens, at Rare/Legendary/Chaotic. They record per-run tier, tokens, rounds, errors, cash, bank invariants and outcome. **45 last-player finishes, three simulation-only 300-round caps; 3,594 total rounds (range 28–301)**. All cash and 36-house/12-hotel conservation checks passed, with no browser exceptions. AI simulations do not establish balance for voluntary human re-roll choices; the focused human checkpoint checks cover those.

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40589045977): **483 power/compatibility checks, 217 real Auth/Database integration checks, 57 candidate permission checks**, and the existing kernel/service suites passed. Four legacy allowances remain isolated baseline demonstrations.
- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40589045906): **12 mastery regressions, 14 new UI/reward checks, 48 evolved-token simulations**, 14 prior management UI cases/17 source comparisons, 11 board controls, 13 transport checks, the prior gameplay source comparisons, 76 setup comparisons, six trusted starts, 324 dice cases, 56 simulation regressions and **175 standard simulations** passed.
- [Retained browser reports and screenshots](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40589045906/artifacts/12774327072): per-game rounds, errors, cash, building-bank invariants, outcomes, evolved tiers/tokens and UI screenshots are preserved. **223 simulation runs** were exercised across the two sets. No browser exceptions or cash/building-bank invariant failures were reported. The three capped evolved-token simulations are identified above; these are not claimed as completed last-player games.


## Persistence and release limits

This is the current client's device profile, not a signed competitive reward or cross-device entitlement service. Local pass-and-play mastery follows the first human (the profile's player); legacy online follows the matching identity. A stable offline game ID survives ordinary saves; legacy online uses the room/opening/identity tuple. The device keeps 1,024 completion receipts. The completion record, XP, win count and earned tier are written together; a failed storage write does not advance them in memory. Existing device-profile trust, cross-tab update and old-receipt-retention limitations remain. The opt-in trusted game screen still does not grant local profile rewards. Legacy online play has no complete app-version negotiation; participants need the current client for new-power games.

The approved 40-space board artwork, buildings, town/scenery and token assets are unchanged. Standalone HTML/offline assets are regenerated. No paid setup, Firebase rule/service rollout or native/store release is activated. Unlike earlier service-only milestones, this PR changes the shipped web interface and power paths after the Pages publication catches up.
