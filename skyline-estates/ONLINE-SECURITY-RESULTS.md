# Online room creation and security review

## Confirmed bug and scoped fix

The old `createOnline` generated a five-character code with Math.random and unconditionally PUT the new lobby to `games/<code>`. An isolated regression against the baseline reproduced an existing playing room being replaced by a new lobby when the code collided. This does not require probing or changing any live Firebase data.

Firebase-backed creation now uses a conditional PUT with `if-match: null_etag`, which Firebase accepts only for an empty location. A 412 conflict generates another code, up to eight attempts. Conflicts never fall back to an unconditional write; authentication retry preserves the conditional header. Only the successful code is indexed and opened. Codes use Web Crypto bytes with the existing 32-character alphabet and five-character format (32 divides 256, so byte mapping is unbiased). If secure randomness is unavailable, creation fails through the existing error message instead of using Math.random.

Reference: [Firebase REST conditional requests](https://firebase.google.com/docs/reference/rest/database#section-conditional-requests).

`tests/online-rooms.cjs` extracts actual production code into an isolated runtime and substitutes an in-memory REST endpoint. Twelve regressions cover collisions, concurrent creation, bounded exhaustion, permission/network/authentication failures, header retention, code distribution, unavailable entropy, metadata/rules preservation and alternate-backend compatibility. No Firebase accounts, tokens or live rooms are used. The existing alternate Claude backend retains its previous creation behavior; its collision guarantees are not established by this fix. This is not a Firebase emulator, live rules or full multiplayer acceptance test.

## Security findings and remaining plan

Findings below describe checked-in source and rules, not verified deployed rules. The Firebase project/configuration is shared with Eko Estates. Do not replace shared production rules without a compatible migration and isolated emulator tests for every edition.

| Area | Evidence in source | Required next work |
| --- | --- | --- |
| Room access | `database.rules.json` grants authenticated users parent-level reads of games and writes to any valid five-character room path. Anonymous sign-up is supported. | Separate public lobby metadata from private member state; enforce membership, host/turn authority, allowed fields and transitions at the server/rules boundary. Parent grants must be removed, not overridden below. |
| Requests and presence | `sub` and `locks` permit all authenticated reads/writes. Ask/answer/heartbeat/reclaim payload identities are client supplied. | Bind writes to auth.uid and current membership; validate request recipient/sender, kind, revision, response owner and schema. Bound locks with server time and fencing/revision checks. |
| Concurrent joining and starting | Joining uses a client lock, rereads seats, then writes without a room-revision condition. Missing ETags fall back to an unconditional lock write. Starting/leaving also uses client snapshots. | Use atomic room revisions/transactions for join, capacity, duplicate UID, leave/kick and host start. Race tests must cover start vs join, last-seat contention, expired lease and missing ETag. |
| Game state and handover | `netFlush` sends serialized full state; any active turn client drives decisions. Host election, absence and last-human wins rely on local heartbeat time. Incoming remote state is parsed and applied without the offline-save schema validator. | Define a compatible network-state schema and validate before applying. Design monotonic room revision and server-backed host lease; test stale/returning hosts, reconnect and competing writers. Host-only writes alone cannot enforce honest ranked outcomes. |
| Rankings and purchases | `lb` allows users to submit their own bounded trophy totals; client progress feeds leaderboard writes. | Keep public competitive/payment trust blocked until outcomes and entitlements use a trusted validator. Add receipt verification, idempotency and restoration tests. Client validation and generated room codes cannot establish this trust. |
| Cleanup and isolation | Client purge/sweep can delete shared room/sub/lock paths; edition isolation relies on a lobby status flag. | Use server-owned cleanup and edition/version namespaces. Prove one edition or nonparticipant cannot inspect/modify/delete another room. |

A short code remains a public locator, not an authorization secret. This patch prevents accidental overwrite by updated Firebase clients, not malicious writes permitted by broad rules or old clients. Deployed rule state is unverified; no database rules are changed or deployed. Lost acknowledgements after a successful server write also need idempotent room creation/recovery in a future protocol.

Recommended order: versioned protocol plus isolated rules/emulator matrix; participant-owned requests/presence and atomic lobby operations; authoritative revision/host handover and two-client disconnect/race tests; trusted ranked outcomes and receipt validation. Preserve casual rules/art/UI while migrating; keep legacy editions compatible and deny cross-room access by default. Acceptance must include outsider and malformed writes being denied at the service boundary, not just hidden in the UI.

## Validation evidence

The associated PR records baseline failure and final full-run links. The normal browser/economy/offline suite and native build/package checks run on the updated source. No board, artwork, scenery, UI layout, prices or custom rules change. Full live multiplayer/security, physical-device/native lifecycle, signed store/purchase acceptance and manual full matches remain open under issue #2.
