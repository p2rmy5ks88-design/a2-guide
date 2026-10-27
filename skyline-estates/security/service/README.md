# Trusted admission prototype and v2 client adapter

This is an **isolated, admission-only development slice**. It implements authenticated lobby creation, invitation-based join, member rejoin/read and leave, using the candidate `skylineV2` contract. `client.mjs` is a matching transport adapter; the shipped game does not import it. The authoritative game engine, action processing and complete playable v2 client are **not implemented** here. `/start` and `/action` fail closed with 501. Nothing is deployed to live Firebase.

## Implemented boundary

- `admission.cjs` requires a privileged database and an ID-token verifier. Identity always comes from verified authentication, never a caller-supplied UID. Token verification checks revocation/disabled status on every operation.
- A single `skylineV2` transaction commits membership/seats/revision/host changes, private operation receipts and per-UID budgets together. The prototype uses the whole subtree to prove atomicity; this is a scaling hotspot, not a production database layout.
- Room codes keep the five-character format. Joining additionally requires a 256-bit invitation capability. Only its hash is used for admission; the private idempotency receipt retains the original create response for retry recovery. Neither secrets, hashes nor receipts are returned in room views or readable by clients under the candidate rules. Invites should be shared only with intended players.
- Stable operation IDs fence retries. Same UID/ID/content returns the prior result; changed content conflicts. Private UID/operation keys are hashed to avoid JavaScript property-name collisions. Verified UID keys are restricted to safe database characters and exclude reserved prototype names.
- Server-controlled seat allocation preserves the six-seat limit, unique names and seat order. Host leave transfers ownership to the lowest remaining seat; the last leave closes the lobby and invalidates its invite. Leave/join during active gameplay is deliberately not enabled.
- A transactional per-UID budget includes rejected admission attempts. Replaying a retained receipt does not charge again. Gateway/IP/global abuse controls, admission quotas, invite rotation/expiration and ledger/room TTL cleanup are still required.
- Selected flat settings and house-rule booleans are preserved, with shape/known option checks. Full city/theme registry, token/progression and legal-rule validation must be enforced by the authoritative engine before a game can start. No prices, gameplay rules or artwork are changed.

## Local transport and authentication

The HTTP adapter accepts bounded JSON bodies and Authorization bearer headers, returns sanitized errors with no-store caching, and permits browser origins only from an explicit allowlist. It does not use cookies or wildcard credentialed CORS.

`emulator-runtime.cjs` refuses initialization unless both Auth and Database emulators use loopback and the exact project is `demo-skyline-phase1`. It has no production startup/deployment entry point. Firebase Admin SDK 13.4.0 is a pinned development dependency. The Auth emulator uses emulator credentials/unsigned test tokens: this verifies adapter/token-validation/account-disable plumbing, **not production signing keys, real-provider identity assurance or abuse prevention**.

Run `npm test` in `skyline-estates/security`. The CLI starts Auth and Database emulators, evaluates the existing permission matrix, then runs `integration.test.cjs`. Two independent Admin SDK app/database connections and two HTTP services contend against the same demo database. Results are saved as `service-results.json`.

The matching client adapter accepts only a loopback HTTP endpoint, obtains the current token for every request, omits cookies and refuses redirects. Persist/generate the request ID **before** the first attempt, then reuse that ID and body after an uncertain response. Automatic retries with a fresh ID would not be idempotent. A known room can be reopened by an authenticated existing member without resubmitting its invitation.

```js
const client = createAdmissionClient({baseUrl: localEndpoint, getIdToken});
const requestId = client.requestId(); // keep this until the outcome is known
const {code, invite} = await client.createRoom({
  requestId, name, settings
});
await client.joinRoom({
  requestId: client.requestId(), code, invite, name
});
const lobby = await client.room(code);
```

This adapter is protocol work, **not a UI migration or full playable game client**. The visible short code remains a locator, not an authorization secret. The future v2 share link must carry the invitation capability; the current legacy code-only flow is unchanged until a reviewed migration.

## Required before live rollout

Implement/reuse the approved engine under trusted authority; validate and atomically process intents with server RNG/revision/host fencing, correct idempotency and restart recovery. Add the actual game client integration, real-browser multi-client matches and reconnect/partition tests. Review shared Skyline/Eko rule migration/rollback, production authentication and HTTPS/CORS/App Check/gateway quotas, ledger/secret lifecycle, observability/privacy and signed/device/store requirements. No production security checkbox is closed by this prototype.
