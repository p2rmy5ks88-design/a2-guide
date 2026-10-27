# Durable roll reservations — 27 October 2026

PR #18 continues issue #2 with private roll persistence and recovery. This is an internal prerequisite; it does not enable public rolling, resolve a turn or change the live web game.

## Result

A roll is saved once for a room revision and bound to its authenticated actor, exact game snapshot digest and audited source hash. The transaction stores the private dice JSON, unique revision slot, pending-room lock, shared operation receipt and budget together. Three secure integer candidates are sampled once before transaction retries; only the winning result is retained. Caller-supplied dice/seeds/actor fields are rejected.

Same-operation retries recover the original acknowledgement before asking for entropy. A fresh service/Admin SDK connection recovers the saved dice even when its random provider is unavailable. Different operation IDs cannot replace a reserved roll. Property actions are fenced while a plan is pending; they also check the retained revision slot if the secondary lock index is missing.

Load/recovery require verified identity and server-acknowledged membership/seat/turn/revision. The stored game/source digest and dice shape must still match. Presence-only changes do not invalidate the game binding. Clients cannot directly read or overwrite the private plan. Historical receipt acknowledgements contain no dice; loading the values always rechecks current authority.

## Verified evidence

Implementation head: `af3ff01aa730fe314f21ab9535d5666dc4cede25`.

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40470325576): **37 durable-roll unit regressions** passed. They force repeated transaction callbacks, prove one precomputed candidate is reused, exercise cold service recovery without entropy, protect the missing-lock case, and reject malformed inputs/state, unauthorized callers and invalid random results. The secure default provider also executes; no statistical randomness certification is claimed.
- The same run passed **62 Auth/Database-backed service checks**, comprising the previous 47 checks and 15 new roll scenarios. New planner methods are called internally; existing lobby/property endpoints use HTTP. Two contending service/Admin instances plus a third fresh Admin connection cover same/different request races, property contention, lost post-commit reply, delayed mutation after timeout, private REST read/write denial, disabled tokens and offline peer revocation.
- Existing **76 setup + 324 dice + 39 guard**, **61 property-kernel**, and **55 candidate-permission** checks passed. Four legacy source-rule allowances remain reproducible. These are demo-emulator findings, not inspection of live Firebase permissions.
- [Browser/game workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40470325531): 76 full setup snapshot and 324 exact dice/gating comparisons passed with zero captured browser errors. All 41 browser property-parity scenarios, 175 simulations and 282 existing regression checks passed without captured game/page errors or failed cash/building-bank invariants. Per-game rounds/outcomes remain in the retained stability JSON artifact.

JSON evidence: roll-plan-results.json and service-results.json in the security artifact; existing setup/property/game reports in the stability artifact. A final documentation-only commit records these results without changing tested code.

## Reproduce

Node 22: `node skyline-estates/security/service/roll-plans.test.cjs` requires no downloaded dependencies. For real emulator tests, install the pinned tools and run `npm test --prefix skyline-estates/security` with Java 21. Runtime guards permit only loopback Auth/Database emulators with project demo-skyline-phase1.

## Limits and next work

A timeout is an uncertain result, not cancellation or rollback. A queued transaction may commit later; callbacks recheck room authority and revision. Recover with the original operation ID. Token verification occurs at request entry; this does not promise instantaneous account-disable cancellation of an in-flight request. Lost-reply/timeout faults are injected around real emulator transaction calls, not a new public HTTP roll endpoint. Service/SDK instance restart is exercised; database server restart/failover and production identity/network assurance are not claimed.

No method yet consumes/cancels a plan, retires its lock or commits player movement/turn advancement. The approved complete turn transition must consume stored dice and atomically commit state/revision/receipt. Perk re-rolls need their own authorized stage/budget. Source/state mismatch fails closed. Plan slots assume retained non-reused room codes; room incarnation IDs, durable consumed-revision watermarks and safe private-state cleanup are required before room reuse or garbage collection. Whole-subtree scaling, production controls, complete gameplay and redacted client/recovery integration remain open.

Public start/roll remain disabled. No art, UI, approved rule, game source, live Firebase configuration/data, service deployment or store package changes occur in this PR.
