# Debt payment and bankruptcy — 2026-10-27

Related to issue #2 and PR #24. Tested implementation: `d94143f07e348aa55e903aa931ee82f9a25513bc`.

## Change

Internal debtAction now lets the actual debtor sell/mortgage a legal owned property, explicitly pay a funded bill, or declare bankruptcy while cash is insufficient. The amount, creditor and payer come from the current private checkpoint; requests cannot replace them. Other-player card debts transfer decision authority to that player and then to the next debtor.

A private origin snapshot and bounded action tape reconstruct the suspended source payment. Each continuation verifies the reconstructed paused game/boundary before applying the next intent. The complete result replaces the authoritative state atomically; it does not charge again from partially updated balances. Source shield usage/logs, partial card transfers, fixed repair bills, mandatory bail/attempts and subsequent movement are retained. No dice/entropy are resampled.

Original bankruptcy code and hooks supply cash/building liquidation, property/mortgage treatment, held-pass transfer/deck returns, rent/minimum-cash/creditor counters and last-player results. A terminal estate distribution records over status and canonical standings in the same commit. No XP, profile currency or store reward is issued.

The prototype end-turn guard previously rejected the source busy phase left by a bankrupt current player. Its new regression fails on the prior implementation with invalid-end-turn and passes now. A finished bankrupt turn can advance normally when more than one player remains. The shipped game's existing bankruptcy behavior did not require a source change.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40498613585): **95 full game/boundary/terminal-standings comparisons across 33 debt scenarios**, zero captured browser exceptions. Uses actual source humanRaise/openAssets payment decisions with source sell/mortgage functions. Covers card transfers and changing debtors, shields, repairs, fees/pot, rail/utility rent, bail and landing debt, building/hotel banks, creditor/bank bankruptcy and terminal/nonterminal outcomes.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40498613398): **50 debt kernel checks, 12 debt service checks and 138 total integration checks (12 new debt cases)**. Includes competing liquidations, a fresh Admin connection, lost payment reply, other-player authority, terminal estate/results, bankrupt-turn handoff, repairs, bail, stale/injected commands, revocation after uncertain timeout and offline decision denial. Prior kernels and 55 candidate permission checks passed; four legacy allowances remain reproducible only in the demo emulator.
- Prior browser comparisons passed: 568 auction, 377 card, 157 jail, **104 end/progression** (one new bankrupt-turn case), 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regressions passed.
- `window.__sim`: **175 seeded games** (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. No errors or cash/house-bank/hotel-bank failures. The artifact `skyline-stability-results/skyline-phase1.json` records every run's rounds, errors, invariants and outcomes.
- Full normal-start matches finished naturally: Classic 63 rounds, Quick 20 rounds, timed 11 rounds; Seat 0 won each. Per-match states/decisions are in the workflow artifact. Generated offline assets and whitespace checks passed.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No shipped game source, approved board/art/scenery/UI or custom values changed.

This remains an isolated internal prototype. No public game route or actual v2 client migration, production Firebase/service deployment, native build or store release was performed. The published web game does not expose these internal changes.

The private debt tape is capped at 256 accepted decisions and its replay envelope at 512 KiB. Older prototype debt checkpoints without an envelope fail closed and need a reviewed migration/recovery policy before rollout. AI liquidation/decision workers, disconnect/rejoin/forfeit policy, replacement perk rerolls, remaining consented game actions, trusted rewards/entitlements, redacted live integration and production incarnation/retention/privacy/scaling review remain open.

Phase 1 and issue #2 stay open. Next focused slice: replacement perk rerolls, estimated 60–90 minutes, subject to findings.
