# Card execution results — 2026-10-27

Related to issue #2 and PR #22. Tested implementation: `db62aceee5cb8bd2f90abd14a1eb3a80aafbca26`.

## Change

The internal trusted choice processor now executes the next card from a current private checkpoint. The deck, card index, original dice and card effects come from authoritative state, not request fields. Approved source definitions provide all 32 cards, deck rotation, held Bail Passes, collection/payment, repairs, grants, movement and jail behavior.

Moved-to properties require separate purchase consent. Subsequent card and turbo follow-ups require a new checkpoint/revision. Original nearest-rail double rent and utility eight-times-dice options survive continuations. No dice are resampled. State, card/pass changes, checkpoint and operation receipt commit atomically; repeated callbacks, lost replies and retries cannot apply an effect twice.

Unaffordable card bills stop before liquidation/bankruptcy. The private context retains the consumed deck/index and payment ordinal; the debt boundary identifies the actual payer and creditor. Earlier transfers remain recorded. Debt resolution, including another player's debt, is not implemented by this step.

## Validation

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40487127504): 377 full game snapshot/boundary comparisons across 167 card scenarios, zero browser exceptions. Covers every card at all six card spaces, localized text, cash and deck conservation, buildings/repairs, fees/pot, multi-player transfers, debt, rail/utility rent, purchases/auctions, Lucky Pass, turbo follow-ups and cards after jail release.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40487127545): 180 card kernel checks, 16 card service checks and 116 total integration checks (11 new card cases). Includes two competing service connections, a fresh Admin connection, once-only payouts/pass/fees, lost replies, purchase consent, other-player debt, membership revocation, uncertain timeout and offline decision denial. Existing kernel suites and 55 candidate permission checks passed; four legacy source-rule allowances remain reproducible only in the demo emulator.
- Existing browser comparisons remained green: 157 jail, 103 end/progression, 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regression checks passed.
- `window.__sim`: 175 seeded games (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. No simulation errors or cash/house-bank/hotel-bank invariant failures. Workflow artifact `skyline-stability-results/skyline-phase1.json` records each run's rounds, errors, invariants and outcomes.
- Generated offline assets and whitespace checks passed. Full browser matches finished naturally: Classic 45 rounds, Quick 39 rounds and timed 11 rounds, each won by Seat 0. Per-match records are in the workflow artifact.

Browser and database testing exposed test-adapter/fixture mistakes (remote debt metadata, initial pre-roll stage and an assumed shuffled second card); these were corrected before the final passing runs. No confirmed shipped gameplay bug required a source change.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No game source, artwork, 40-space board, scenery, UI or custom rule values changed.

This remains an isolated internal prototype. Public start/action routes and actual v2 game-client migration remain disabled. No live Firebase/service deployment, native build or store release was performed; the published web game does not expose these internal changes.

Auctions, debt/bankruptcy, replacement rerolls, AI turns, trusted rewards/entitlements, redacted live integration and production room-incarnation/retention/scaling gates remain unfinished. Phase 1 and issue #2 stay open. Next focused task: auction bidding/settlement, estimated 60–90 minutes, subject to findings.
