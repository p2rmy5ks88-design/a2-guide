# Property-action service results — 27 October 2026

Related: issue #2, PR #15. This is an isolated server-controlled gameplay subset, not the completed multiplayer migration.

## Result

Build, sell, mortgage and redeem commands now use the authenticated player's server-owned seat and the current persisted revision. The service applies the audited game rules, commits the resulting snapshot/revision and stores the retry receipt atomically. Callers cannot submit prices, player IDs, ownership or replacement snapshots. Simultaneous commands for one revision cannot both succeed.

The approved board, prices, 3D scenery, UI and custom rules are unchanged. The construction-boom refund, full-cost eligibility check, free-for-all grouping, even-building/selling option, mortgage interest, construction counters and 36-house/12-hotel conservation are retained. Input snapshots are immutable. The runtime pins the complete normalized game source hash; future game changes require a hook audit and parity rerun.

## Evidence

- 58 property-kernel checks passed locally and in the isolated security workflow. They cover successful actions, insufficient cash, illegal ownership/group/mortgage combinations, exhausted banks, hotel conversion, malformed commands/state, turn identity, unsupported phases and context isolation.
- 47 real Auth/Database emulator + HTTP service checks passed, including 14 new property integration checks. Two independent service/database instances verify retry safety, revision contention, authorization, direct-write denial and unchanged rejected room state.
- The existing permission suite passed 55 candidate checks and reproduced the four known allowances in the checked-in legacy rules. These are source-rule emulator findings, not verification of deployed Firebase permissions.
- 40 real-browser property parity cases passed with zero captured browser exceptions. The existing suite also passed 175 simulations (100 Classic, 25 Quick, 25 timed, 25 optional-rule games) and 262 regression checks, with no captured game/page errors or failed cash/building-bank invariants. Per-game rounds/outcomes remain in the stability JSON artifact.

Verified implementation head: 3fda0caf9fe46aa9b077c0528b1f05dbf6ab8644. [Security run](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40461714141), [browser and game run](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40461714332). JSON results are retained in those workflow artifacts. A following documentation-only commit records these results.

## Reproduce

From repository root, install the pinned tools with `npm install --prefix skyline-estates/security`, then run `npm test --prefix skyline-estates/security` (Node 22 / Java 21). This invokes only loopback Auth/Database emulators using project `demo-skyline-phase1`.

For browser parity, install `npm install --prefix skyline-estates/tests`; set `CHROME_PATH` to an installed Chrome executable or install the matching Playwright Chromium, then run `node skyline-estates/security/service/asset-browser.test.cjs`. The existing stability workflow also runs this test and the full game suite.

## Remaining rollout gates

The public start endpoint remains disabled. Playing snapshots are inserted only by privileged emulator fixtures. Full initialization/turns, trusted randomness, cards, auctions, debt/bankruptcy, two-party trade consent, minigames, redacted state projections, live UI wiring and reconnect/restart recovery remain unfinished. Profile rewards/entitlements are not issued by this subset. Whole-subtree transaction scaling, receipts/secret cleanup, mutation deadlines, production authentication/gateway controls and shared-project migration/rollback also remain open.

No service, production Firebase rules, live game client, store package or live-room data was deployed or changed by this work.
