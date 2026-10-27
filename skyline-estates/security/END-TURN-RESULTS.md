# Timed finish and trusted end-turn progression — 27 October 2026

PR #20 continues issue #2. It fixes a confirmed online round-limit regression and adds internal end-turn/round/event/result processing. The public v2 service/client migration remains disabled.

## Confirmed web-game fix

The online driver previously checked the round limit before advancing, then scheduled the next player without checking the newly incremented round. A timed game could therefore play an extra turn. Resuming an already-expired snapshot also allowed a turn before checking termination. The source regression failed on the old code with `false !== true` after the final allowed handoff.

Terminal checks now run before resumed play and immediately after advancement. Seven source regressions cover final/nonfinal timed handoff, nonzero opening seat, skipped bankrupt seats, expired resume, Classic continuation and Quick termination. The standalone page/offline manifest are regenerated, and the audited source pin is updated. No artwork, board, UI or custom-rule values change.

## Trusted progression

The internal adapter reuses the actual corrected online driver, advanceTurn/event hooks, endCheck and standings. It resets doubles, honors opening-seat round boundaries, skips bankrupt seats and preserves all localized event pools/payouts. Next human roll, jail and AI-worker boundaries are explicit. Terminal status, standings, state/revision, next checkpoint if needed, transition tombstone, shared receipt and budget commit atomically. Retried/competing requests cannot advance twice or duplicate a payout.

A fresh acknowledged preflight only detects whether entropy is needed or a receipt already exists. Needed randomness is sampled as one finite tape before the transaction. Bounded rejection sampling avoids modulo bias; callback retries recreate the same reader. Exhaustion fails closed without partial effects. No-event turns and completed receipt recovery need no fresh entropy. Event-before-final-ranking order is preserved, including the 45-round boundary; this work does not rebalance those rules.

Member-only result reads require a fresh acknowledgement and matching final snapshot/revision/source. They return standings without decks or entropy. Completed games reject new rolls/property edits. Jail checkpoint ownership transfers to the next actor; AI execution remains paused.

## Evidence

Verified implementation: `7dd232c08134a7c6fb8cdb2391ece5558d3421cc`.

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40480508187): **127 end-kernel checks across 103 scenarios**, **21 end-service checks**, and **90 Auth/Database-backed integration checks** passed (77 previous +13 new). New cases cover competing event candidates, fresh connection/no-entropy receipt recovery, property contention, terminal access, private REST denial, lost reply, delayed revocation and offline results.
- Existing 88 turn-kernel /17 turn-service, 37 durable-roll, 76 setup /324 dice /39 guards, 61 property-kernel and 55 candidate-permission checks passed. Four legacy source-rule allowances remain reproducible; these are emulator findings, not deployed-rule verification.
- [Browser/game workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40480508167): **103 complete progression/standings/next-boundary comparisons** passed with zero captured browser errors. All 83 movement/choice comparisons, 76 setup /324 dice comparisons, 41 property cases, 175 simulations and the previous 282 regression checks plus seven new round-limit regressions passed without captured game/page errors or failed cash/building-bank invariants. Per-game rounds/outcomes remain in the retained stability artifact.
- Build-only checks passed: [Android debug](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40480508319), [unsigned iOS simulator](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40480508189) and [Linux desktop](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40480508057). No store upload or signed/device acceptance is claimed.

JSON evidence remains in workflow artifacts as end-results.json, end-service-results.json, service-results.json, skyline-end-browser.json and the existing game reports. A final documentation-only commit records results without changing tested code.

## Reproduce and limits

Node 22: run `node skyline-estates/tests/timed-finish.cjs`, `node skyline-estates/security/service/end-kernel.test.cjs` and `node skyline-estates/security/service/end-service.test.cjs`. SOURCE_REF can select pre-fix Git source for the regression demonstration. Real emulator checks use the pinned security package's npm test with Java 21; runtime guards require loopback demo-skyline-phase1. The existing browser tools and CHROME_PATH run `node skyline-estates/security/service/end-browser.test.cjs`, comparing entire state, standings and next boundary against the actual browser online driver/turn entry.

New turn/result methods have no public HTTP routes or live UI wiring. Jail actions, cards, auctions, debt/bankruptcy, replacement re-rolls, AI execution, trusted rewards and full redacted client/recovery integration remain open. Timeout is uncertain, not rollback. Room incarnation/retention/replay policy and production rollout gates remain required. No service, live Firebase configuration/data or store package is deployed. The ordinary web bundle changes only to fix terminal timing; native builds do not claim physical-device or store acceptance.
