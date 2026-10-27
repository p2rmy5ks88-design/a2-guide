# Auction bidding and settlement — 2026-10-27

Related to issue #2 and PR #23. Tested implementation: `5d778a6e8219428ba3b883a0890be47aa2dbb0bd`.

## Change

Internal startAuction/auctionBid transitions reuse the pinned original auction loop. Source seat order, low-cash/bankrupt skips, active bidders, leader, terminal conditions, ownership/cash transfer and auction-win counters are preserved. Human intents support drop or the existing +10/+50/+100 buttons within cash.

A private bounded transcript reconstructs each source decision without charging during bidding. Each accepted bid advances the room revision with its checkpoint and shared receipt. Only the current authenticated bidder can act/read the decision, including when that seat differs from game.turn. Normal turn commands retain turn-owner checks. Settlement commits one ownership transfer and one charge, then resumes the original turn's doubles/card/jail/turbo continuation.

Retries, recreated services and lost settlement replies recover the accepted receipt. Changed IDs at an old revision cannot bid or settle again. Auctions cannot restart or be bypassed with end/roll/property edits while a checkpoint is active.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40492096523): 568 full game snapshot/boundary comparisons across 88 auction scenarios. Covers 2–6 seats with rotated opening seat, all-drop/competitive/cheap wins, exact and insufficient cash, bankrupt and jailed bidders, localization, property types and doubles/card/jail/turbo follow-ups. AI bidding stops at its explicit worker boundary. Zero captured browser exceptions.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40492096526): 101 auction kernel checks, 16 auction service checks and 126 total integration checks (10 new auction cases). Real database cases use two competing services and a fresh Admin connection: duplicate/conflicting bids, bidder authority transfer, once-only settlement after a lost reply, all-drop, injected fields, stale/out-of-turn requests, revocation after uncertain timeout and offline decision denial. Existing kernels and 55 candidate permission checks passed; four legacy allowances remain reproducible only in the demo emulator.
- Existing browser comparisons remained green: 377 card, 157 jail, 103 end/progression, 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regression checks passed.
- `window.__sim`: 175 seeded runs (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026, with no errors or cash/house-bank/hotel-bank invariant failures. Artifact `skyline-stability-results/skyline-phase1.json` records each run's rounds, errors, invariants and outcomes.
- Normal-start Classic/Quick/timed browser matches finished naturally at rounds 36/26/11 respectively, each won by Seat 0; detailed per-match decisions/outcomes are in the workflow artifact. Generated offline assets and whitespace checks passed.

The initial emulator run rejected an overlong fixture lobby name. The fixture was shortened within the existing 12-character limit before the final passing run. No confirmed shipped gameplay bug required a game-source change.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No approved artwork, 40-space board, scenery, UI, custom values or shipped game source changed.

This is an isolated internal prototype. Public game routes and actual v2 client migration remain disabled. No production Firebase/service deployment, native build or store release was performed. The published web game does not expose these internal changes.

AI auction workers, disconnected-bidder timeout/rejoin/forfeit policy, debt/bankruptcy, replacement rerolls, trusted rewards/entitlements, redacted live integration and production room-incarnation/retention/privacy/scaling gates remain open. The original bounded source auction loop is preserved; this is not production capacity or failover proof.

Phase 1 and issue #2 remain open. Next focused slice: debt payment and bankruptcy choices, estimated 90–120 minutes, subject to findings and cross-player debt boundaries.
