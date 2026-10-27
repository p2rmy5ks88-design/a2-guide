# Acknowledged game controls and action recovery — 2026-10-27

Related to issue #2 and [PR #29](https://github.com/p2rmy5ks88-design/a2-guide/pull/29). Tested implementation: `b77fecba9cd48b1a5354b1c57c8021c1b699d517`.

## Scope

Operation settlement distinguishes a committed command, a stored rejection, and a request that never reached a definitive ledger outcome. For an absent request it atomically writes an operation-retired entry under the existing UID/request-ID ledger key. A delayed original therefore cannot apply after cancellation. Repeated settlement is idempotent; changed terms/IDs cannot replace an existing receipt. Existing turn/roll normalization is reused for the exact service digests. Malformed original commands with valid room/ID/revision can retire their ID without permitting it to become another command.

Verified current membership, seat and human identity are rechecked on every transaction callback, including receipt recovery. Only allowlisted acknowledgements or terminal error fields are returned. New retirements share the existing operation budget. Timeout remains uncertain; the client reconciles again instead of assuming cancellation. The new endpoint is explicitly composed and does not expose AI worker commands.

The browser controller coordinates immutable, monotonic acknowledged snapshots, saved roll recovery and tracked completion IDs. It refreshes/render-checks the current game before clearing a resolved journal. An older control callback cannot act against a newer revision, and a different tab's replacement journal cannot be cleared by an old completion. Failed authorization, storage, response validation or rendering leaves the action recoverable.

The opt-in screen adapter binds the existing approved 40-space board/3D scene, roster, Roll, Buy/Decline, End Turn, purchase dialog and read-only portfolio/menu to the controller. It does not start the legacy local turn driver, execute financial source functions in the browser, or award profile progress. Its display model has no hidden decks and only a read-only held-pass count; it is not an executable legacy save. Read-only polling refreshes other players' acknowledged turns every 2.5 seconds by default, with an optional interval or disable switch. Polling never automatically rolls, retires an action or forfeits a player. Closing restores the title and handlers.

## Verification

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40538920233): **18 operation-service checks + 18 controller checks**, **199 total real Auth/Database integration checks (12 new)**, **57 candidate permission checks**, and prior gameplay kernel/service suites passed. Four legacy allowances remain isolated baseline demonstrations.
- New real database cases cover reservation and purchase racing retirement across independent connections, normalized trade receipt recovery, another member's inability to discover/retire someone else's receipt, delayed timeout plus membership revocation, disabled accounts, private REST denial and HTTP controller recovery followed by legal play.
- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40538920239): **11 new real-game-page checks**, zero captured browser exceptions. Verifies the 40-space WebGL scene and roster, visible Roll/Buy/End buttons, lost purchase reply/page reload, terminal rejection recovery, no local profile reward, read-only portfolio/menu, mobile landscape second-player controls, desktop refresh of that mobile turn and safe title restoration.
- The mobile case is browser viewport/touch emulation, not physical Android/iOS testing. The browser service fixture uses the actual source-derived kernels; separate integration cases use real local Auth/Database emulators. This does not prove production IAM or database failover.
- Prior **13 browser transport checks**, all gameplay/browser comparisons including 1,022 AI comparisons, **289 existing regressions and 175 seeded games** passed. No game errors or cash/house/hotel-bank failures. Per-run rounds/errors/invariants/outcomes remain in `skyline-stability-results/skyline-phase1.json`; other gameplay reports are in the same workflow artifact.
- Generated offline assets and whitespace checks passed. Approved game source remains hash `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`; game.html, generated index, board artwork, scenery and custom rule values were not changed.

## Live release gates

This is an **opt-in tested screen connection, not the completed public web rollout**. The normal title/lobby does not import or activate it. Generic checkpoint mappings exist, but complete management UX is not claimed: portfolio is read-only; property edits/debt liquidation/raise-cash and trade proposal/counter/accept review remain open. Public lobby/start and trusted roster/entitlement validation, result/reward presentation, full AI/minigames/timers, disconnect/rejoin/forfeit and a production runtime/identity/rules migration/rollback plan remain gates.

Retirement entries require the same retained-ledger/incarnation policy as earlier receipts. The prototype still transacts/reads the whole privileged root; production polling bandwidth, ledger retention, quotas, abuse controls and scalability must be measured/reviewed before activation.

The existing free setup is unchanged. No paid plan, server/site, production credential, live Firebase/service/rule deployment, native build or store release was created. Owner access and a suitable free hosting path remain separate setup work.

Next focused slice: connect property/debt and trade management controls, estimated **90–120 minutes for the next slice**, before the remaining lobby/start and hosting activation work. Phase 1 and issue #2 remain open.
