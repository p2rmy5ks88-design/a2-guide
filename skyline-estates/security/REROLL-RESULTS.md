# Perk replacement rolls — 2026-10-27

Related to issue #2 and PR #25. Tested implementation: `6c66d3fa2d26d5719ead5ad37937d9e306045d60`.

## Change

Internal reserveReroll/loadReroll/recoverReroll/commitReroll now support saved replacement dice. The original offerReroll determines eligibility and tier budget. Replacement plans bind the verified actor, current revision, exact offered checkpoint, game and approved source. The crypto integer candidate is sampled once before retrying transactions; requests cannot supply seed/dice/usage counters.

Keep racing reservation accepts one choice. Once a replacement is saved, the lock and retained revision slot block switching back to the original dice, including if the secondary lock index is absent. Changed IDs cannot create another plan at that revision. Fresh acknowledged authority is required to load dice; historical receipts contain no dice.

Commit reuses the source perk increment, usage log, replacement dice log and movement rules. It consumes one perk and one saved replacement with the game/checkpoint/receipt in the same transaction. No immediate second replacement is offered. Doubles, third-doubles/Lucky Pass, changed turbo faces, purchase/card/auction consent and later debt retain their source behavior. Debt recovery does not spend another perk or record another roll.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40503639445): **754** full game snapshot/boundary comparisons across **374 re-roll scenarios**, zero captured browser exceptions. Uses the actual source offerReroll and controlled original rollDice for both rolls. Covers all 36 ordinary replacement pairs at each eligible tier/remaining-use count, all old/new turbo faces, purchases, star/taxi follow-ups, third doubles, Lucky Pass, shield and debt boundaries.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40503639298): **388 re-roll kernel checks, 12 re-roll service checks and 149 total integration checks (11 new re-roll cases)**. Covers competing reservations/commits, a fresh Admin connection without entropy, Keep/reservation races, changed IDs, lost commit replies, debt continuation, injected/unauthorized values, delayed revocation and offline disclosure denial. All prior kernels and 55 candidate permission checks passed; four legacy source-rule allowances remain reproducible only in the demo emulator.
- Existing browser comparisons passed: 95 debt, 568 auction, 377 card, 157 jail, 104 end/progression, 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regressions passed.
- `window.__sim`: **175 seeded games** (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. No simulation errors or cash/house-bank/hotel-bank failures. The artifact `skyline-stability-results/skyline-phase1.json` records each run's rounds/errors/invariants/outcome. Full normal-start Classic/Quick/timed matches finished naturally at rounds 41/33/11, each won by Seat 0; detailed records are in the workflow artifact.
- Generated offline assets and whitespace checks passed. No confirmed shipped gameplay bug required a source change.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No shipped game source, artwork, 40-space board, scenery, UI or custom values changed.

This remains an isolated internal prototype. No public game route or actual v2 client migration, production Firebase/service deployment, native build or store release was performed; the published web game does not expose these internal changes.

Upgrade entitlements still require a trusted roster/profile source; this step grants no token upgrade. AI workers, disconnected-player policy, remaining consented actions, trusted rewards/receipt verification, redacted live integration and production migration/incarnation/retention/privacy/scaling gates remain open. Phase 1 and issue #2 stay open.

Next focused slice: consented trades, estimated 90–120 minutes, subject to findings.
