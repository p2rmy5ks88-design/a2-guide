# First web connection and recovery results — 2026-10-27

Related to issue #2 and [PR #28](https://github.com/p2rmy5ks88-design/a2-guide/pull/28). Tested implementation: `9b46030120cee66017c7e8731de1a15baf352787`.

## Implemented

- Explicit composition adds 21 human game HTTP routes to the existing authenticated services, covering public game/decision/result reads, ordinary/jail/replacement roll reservation/loading/recovery/application, choices, auctions, debt, end turns and consented trades. Existing actor/revision/receipt checks remain authoritative. Default composition and public start remain disabled; AI worker commands are not public routes.
- A member-only, freshly acknowledged game projection allowlists visible board/player state, held-pass counts, committed dice, event and log. It omits hidden deck order, pass provenance, opening keys, player UIDs, private continuation frames/plans/receipts and unknown future fields. The current decision is visible only to its actor; others receive its stage/seat. Existing lobby metadata/member identity APIs are unchanged.
- Confirmed and fixed an isolated candidate-rule privacy gap: members could previously bypass a filtered view by reading raw state/gameJson. Candidate rules now deny the state parent and children. Production and legacy/shared-edition rules were not deployed or replaced.
- The browser transport requires trusted HTTPS origins, a bound current account, persistent storage and browser Web Locks. Explicit loopback mode is test-only. Exact action ID/body is saved before network activity; cross-tab locking protects save/retry/completion. Lost replies/page reloads reuse the original server receipt rather than apply an action again. Account changes/closed sessions, malformed acknowledgements, storage failures and timeouts fail without silently generating a replacement ID. Tokens/private dice/game snapshots are not journaled.

## Verification

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40532633744): **27 connection HTTP/privacy/recovery checks**, **187 Auth/Database integration checks (12 new)** and **57 candidate permission checks** passed. All previous gameplay kernel/service suites passed. Four legacy permission allowances remain reproduced only in the isolated baseline emulator.
- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40532633917): **13 new real-browser connection checks**, zero captured exceptions. The test fixture imports the actual browser transport and uses the existing source-derived gameplay services. It covers dropped server replies, page reload, saved dice, once-only movement/purchase, actor-only decisions, a second player browser, two same-account tabs sharing storage/Web Locks, turn handoff and membership revocation.
- Existing 1,022 AI comparisons and all previous trade/reroll/debt/auction/card/jail/end/movement/setup/dice/property browser comparisons passed; **289 existing regressions and 175 seeded games** passed. No game errors or cash/house/hotel-bank failures. Per-run rounds/errors/invariants/outcomes remain in the workflow artifact `skyline-stability-results/skyline-phase1.json`.
- Generated offline assets and whitespace checks passed. The shipped game source remains hash `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`.

## Release limits and next work

This is the first connection prerequisite, **not the completed live web migration**. The browser test page is a fixture, not a new product UI. The shipped game does not import game-client.mjs, bind server snapshots to its 3D/UI, or use these routes. Public start/roster and entitlement validation, negative-receipt reconciliation, full AI/minigames/timers/rewards, reconnect/forfeit policies and a production runtime/migration/rollback plan remain open. A rejected journaled intent is retained; a reviewed receipt flow is required before a general UI may clear it. The projection is deliberately not a legacy full-save schema.

Owner reports an existing free Firebase setup. The public project configuration identifies eko-estates; owner console access is not authenticated here. Connected Netlify team reports a Free plan and no Skyline project. No site, paid plan, production credential, service, live Firebase rule or native/store release was created/activated. Keeping Firebase Spark plus a separate free Node server is being assessed; it still requires owner-approved backend access and measured quota/latency checks. Firebase's own function hosting requires Blaze, a usage-billed plan; no billing change is authorized by a pricing question.

Next focused implementation: receipt reconciliation and binding the existing game controls to acknowledged server state, estimated 90–120 minutes for the next slice. Overall integration estimate remains 4–7 hours plus any owner setup/release gates; it is not a deployment promise.
