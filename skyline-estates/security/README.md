# Isolated v2 permission candidate — not deployed

This folder is a test-only proposal for a **new** `skylineV2` protocol. The shipped game still uses the existing shared legacy paths. Neither the client nor `../database.rules.json`, Eko rules/configuration, or a real Firebase project is changed. **Do not deploy this candidate as the shared project's complete rules file:** all unspecified paths are denied, and the current host-driven client is incompatible.

## Proposed trust boundary

| Data | Client access | Required trusted service |
| --- | --- | --- |
| Room creation, metadata, membership, authoritative state/revision | Members read specific branches; all clients, including host, are denied direct writes | Admission, legal game transitions, revision/host fencing, cleanup |
| Individual member presence | Members read known UID paths; each member writes only its own strict record with server timestamp | Server-owned liveness/host lease policy |
| Action requests | Current members create immutable, revision-bound, timestamped requests under their own UID; only owner reads a known request ID | Validate payload/action legality, rate limits/idempotency, recheck revision and commit result atomically |
| Rankings and purchase entitlements | All client writes denied | Verified outcomes, receipt verification/restoration and entitlement service |

There are no parent room/collection read grants: otherwise private request reads could inherit a broader permission. There is no public discovery/join endpoint in this candidate. A future trusted admission service must add verified members before the client reads a room. Clients must subscribe to permitted branches/known member/request IDs, not the whole room. Server writes are represented only by emulator fixture seeding; no backend is implemented here.

Presence uses `{uid, at, left}`. Requests use `{uid, kind, rev, at, payload}`: approved action kind, exact current revision, bounded string payload, immutable request ID and no extra fields. Use Firebase server timestamp sentinels for `at`; timestamp equality is checked against server `now`. A JSON payload remains untrusted input: the future service must parse it, enforce custom-rule legality, reject malformed actions and fence stale requests again when processing. Rules are not rate limiting or an authoritative game engine.

## Run safely

Install dependencies in this folder, then run `npm test`. The pinned Firebase CLI starts **only** a loopback Database emulator with project `demo-skyline-phase1`; no login, service account or deploy command is used. The test script refuses to initialize the SDK without the expected loopback emulator and demo project. The independent `Skyline isolated security rules` CI workflow has read-only repository permission and retains JSON results/diagnostics.

The suite first loads checked-in legacy rules into the emulator to demonstrate outsider room reads/replacement, forged presence and lock writes. This is evidence about repository rules, not a probe or claim about currently deployed Firebase rules. It then clears emulator data, loads the candidate, seeds server-owned fixtures and runs allow/deny checks for members/outsiders/anonymous clients, cross-room isolation, state/membership tampering, presence, immutable action requests, revision/timestamp/schema checks, atomic multi-path escalation and revoked membership. A passing legacy allowance means the baseline exposure was reproduced; it is not a security pass for production.

Direct test tool versions are pinned (`firebase-tools` 14.12.0, Firebase JS 12.0.0, rules-unit-testing 5.0.0; Node 22/Java 21 in CI). The isolated package still has no committed transitive lockfile; the resolved dependency tree is a limitation. Emulator evaluation does not establish production deployment, real authentication-provider/identity assurance, App Check/abuse protection, network partitions, backend correctness, billing or physical-device acceptance.

References: [Firebase rule test API](https://firebase.google.com/docs/reference/emulator-suite/rules-unit-testing/rules-unit-testing), [Realtime Database rules](https://firebase.google.com/docs/database/security).

## Migration gates

1. Implement and test trusted admission and action processing, host/revision fencing, idempotency and rate limits. Preserve existing custom rules and presentation.
2. Add a versioned client using these branch/intent contracts; exercise full multi-client gameplay, join/start/leave/reconnect/partition races and denied outsider writes.
3. Review the combined Skyline/Eko rules and migration/rollback plan in an isolated project. Obtain explicit deployment authorization only after the exact candidate and compatibility evidence are reviewable.
4. Validate trusted rankings/receipts and signed/device acceptance separately. Until these gates pass, keep issue #2 open and make no claim that live multiplayer is secured by this proposal.

Final measured test results are recorded on the associated pull request. This milestone changes no game logic, board artwork, 3D scenery, UI, native package configuration or live rules.
