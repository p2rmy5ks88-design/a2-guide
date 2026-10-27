# Jail and bail choices — 2026-10-27

Related to issue #2 and PR #21. Tested implementation: `f14cc01e59e84e4c63a7f43eba91883fb336add3`.

## Result

Internal trusted transitions now support paying the existing 60 bail, using the last held Bail Pass, and resolving a saved jail roll. Failed attempts, freeing doubles, third-attempt bail, movement and landing choices reuse the approved game source. Fees, card returns and attempts commit once; retries recover receipts. A reserved jail roll prevents switching to payment or a pass, including when its secondary lock is missing.

The approved jail behavior remains intact: freeing doubles give no bonus turn; a sampled turbo face does not change jail-release movement. Insufficient third-attempt bail stops at a durable debt boundary before cash raising or bankruptcy; landing debt has a distinct continuation marker. Card draws and auctions also stop at their existing boundaries.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40484795510): passed. 157 complete snapshot/boundary comparisons across 146 jail scenarios, zero browser exceptions. Covers all 36 dice pairs at all three attempt counts, fee/pass release, deck conservation, purchase continuation, mandatory bail debt and turbo behavior.
- [Security and emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40484795599): passed. 166 jail kernel checks, 24 jail service checks and 105 total integration checks (15 new jail cases). Real emulator cases cover competing bail/pass/roll requests, lost replies, fresh-process recovery, duplicate commits, stale actors, revocation and uncertain timeouts.
- Existing browser comparisons remained green: 103 round/end, 83 movement/landing, 76 setup, 324 dice and 41 property checks. Existing 289 regression checks passed.
- `window.__sim`: 175 runs (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. Every run passed: no simulation error, valid cash, house-bank conservation and hotel-bank conservation. The workflow artifact `skyline-stability-results/skyline-phase1.json` records each run's rounds, errors, cash/bank checks and outcome.
- Complete normal-start browser matches finished naturally: classic 40 rounds, quick 21 rounds, timed 11 rounds; all three winners Seat 0. Cash and building banks held throughout.
- Generated offline asset check and whitespace check passed. Three old jail test fixtures were corrected to place the jailed player at square 10.

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No artwork, scenery, UI, custom rule or shipped game file changed.

## Scope and remaining work

This is an isolated, internal server prototype. No public jail endpoints, live client migration, Firebase rule deployment, store release or native build was performed. Playing the published web version will not expose these internal changes yet.

Card execution, auctions, debt resolution/bankruptcy, replacement rerolls, AI turns, trusted rewards/entitlements and live integration remain separate milestones. Prototype root transactions, retained receipts and room-code lifecycle still need production design before rollout. Phase 1 and issue #2 remain open.
