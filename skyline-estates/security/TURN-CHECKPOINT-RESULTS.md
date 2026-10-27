# Saved-roll movement and choice checkpoints — 27 October 2026

PR #19 continues issue #2. The internal service now applies a saved roll to game state and persists the next required decision. Public start/roll and live-client integration remain disabled.

## Implemented behavior

The audited kernel reuses the approved movement, payday/passing-Start, perk, doubles/jail, landing, payment/rent-event/shield, purchase, counter and localization code. Controlled async rendering waits are removed for synchronous transaction execution; financial statements and later economic hooks are retained. Unplanned randomness is forbidden. Dice display/history is recorded once, including when a perk keep choice resumes later.

A transaction commits movement/state/revision, the consumed-plan tombstone, pending private checkpoint (if needed), operation receipt and budget together. Retries or another service instance recover the original acknowledgement without moving, charging or sampling again. Competing buy/decline intents cannot both win. Property prices come from the source board; a turbo taxi's second purchase needs separate consent.

Supported continuations are buy, decline and keep. Affordable rent/tax, waived rent, jackpots and jail/Lucky Pass behavior are applied using existing rules. Doubles return to pre-roll; ordinary completed rolls stop at post-roll management. Third doubles retain the original jail/Lucky Pass behavior and do not move or collect Start payday.

Cards pause before deck mutation; required auctions pause before bidding; insufficient payments preserve the effective bill and stop before liquidation/bankruptcy. Eligible replacement re-rolls pause before movement. These boundaries are explicit unfinished work, not skipped rules. Active checkpoints block unrelated property edits and new rolls. Fresh, authorized decision reads expose a boundary, not the private continuation/deck.

## Evidence

Verified implementation: `8ddded4ba2b7171ad49ff25d1cc0349430c6193d`.

- [Isolated security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40476066537): **88 kernel checks across 68 scenarios**, **17 forced-retry service checks**, and **77 Auth/Database-backed integration checks** passed (62 previous + 15 new turn cases). New scenarios cover contention, duplicate consumption/payment, a fresh Admin connection, private REST denial, lost movement/purchase replies, delayed membership revocation and offline reads. The turn service is called internally, not through a new HTTP endpoint.
- Existing **37 durable-roll**, **76 setup / 324 dice / 39 guards**, **61 property-kernel** and **55 candidate-permission** checks passed. Four legacy source-rule allowances remain reproducible; no deployed Firebase rules were inspected or changed.
- [Browser/game workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40476066424): **83 complete game-snapshot/decision comparisons across 68 scenarios** passed against the actual browser turn loop, with zero captured browser errors. Existing 76 setup / 324 dice comparisons, 41 property-parity cases, 175 simulations and 282 regression checks also passed without captured game/page errors or failed cash/building-bank invariants. Per-game rounds/outcomes remain in the retained stability JSON artifact.

Evidence is retained as turn-results.json, turn-service-results.json, service-results.json and skyline-turn-browser.json, alongside the existing game reports. A final documentation-only commit records results without changing tested implementation.

## Reproduce

Node 22: run `node skyline-estates/security/service/turn-kernel.test.cjs` and `node skyline-estates/security/service/turn-service.test.cjs`. For real Auth/Database testing, install the pinned security tools and run `npm test --prefix skyline-estates/security` with Java 21. Runtime guards require loopback emulators and demo-skyline-phase1.

Install the existing browser tools under skyline-estates/tests, set CHROME_PATH to an installed Chrome (or install matching Playwright Chromium), then run `node skyline-estates/security/service/turn-browser.test.cjs`. Its oracle runs the actual playTurnInner and original controlled rollDice, suppresses animation/profile effects, and intercepts decisions. Full game snapshots and boundaries are compared at the roll and each supported continuation.

## Remaining work

Auction bidding, card execution, debt liquidation/bankruptcy, purchase cash-raising, replacement perk re-rolls, AI turns, end-turn/event advancement, final standings/rewards, full redacted client and recovery integration remain unfinished. No API cancels a checkpoint. A timeout is uncertain, not rollback; retry the original operation. Historical acknowledgements are not current-state reads.

Do not garbage-collect consumed slots/receipts or reuse room codes without incarnation IDs and durable replay protection. Whole-subtree scaling, trusted profile/entitlement admission, privacy projections and all production rollout gates remain open. These are service/SDK restart tests, not database-server failover or production identity assurance.

No approved art, 40-space board, UI, game source/custom rules, live Firebase data/configuration, service deployment or store package is changed by this PR.
