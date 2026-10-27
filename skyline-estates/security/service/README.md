# Trusted lobby and property-action prototype

This is an **isolated development prototype**. It implements authenticated lobby creation, invitation-based join, member rejoin/read and leave, using the candidate `skylineV2` contract. `client.mjs` is a matching transport adapter; the shipped game does not import it. The property-action subset now accepts authenticated build/sell/mortgage/redeem intents against privileged test snapshots. Full turn/game initialization, dice/cards/auctions/debt/trades/minigames and a complete playable v2 client are **not implemented** here. `/start` still fails closed with 501; other action kinds are rejected. Nothing is deployed to live Firebase.

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

Run `npm test` in `skyline-estates/security`. The CLI starts Auth and Database emulators, first checks the property kernel, evaluates the existing permission matrix, then runs `integration.test.cjs`. Two independent Admin SDK app/database connections and two HTTP services contend against the same demo database. Results are saved as `service-results.json`.

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

## Property actions (isolated test snapshots only)

The action envelope contains only requestId, code, expected revision, and command {kind, square}. Identity comes from the token. Membership, authoritative seat/current turn, revision, rule legality, game/bank validity and the operation receipt are checked in the same privileged transaction. A successful action changes the stored snapshot and increments its revision once; simultaneous old-revision commands conflict. Denials retain a private receipt without altering the room. A replay returns the original acknowledgement, so read the current room after recovering an uncertain response; a receipt is not fresh room state.

Snapshots are stored as state.gameJson strings to preserve empty arrays/objects that Realtime Database would otherwise omit. Clients cannot submit snapshots, prices, actor IDs or ownership. Current room views expose lobby metadata only; a redacted gameplay projection/subscription is still needed before UI integration. The tests seed playing snapshots with privileged emulator access; no client or public endpoint can start this subset.

asset-kernel.cjs evaluates only audited sections of the checked-in game.html in an isolated per-call VM context with a time limit and dynamic code generation disabled. This is rule reuse, not a VM security boundary for untrusted source. The full normalized game source is pinned by SHA-256; any source change fails closed until hooks are audited and parity is rerun. Both basic property functions and the later construction-boom/counter hook are reused. Rendering/local profile reward hooks are disabled, while per-game construction counters remain. No production reward or entitlement authority is claimed.

Only pre/post turn phases are supported. Debt liquidation and other phases remain disabled until the complete turn/debt workflow is implemented. The 41-case real-browser parity test compares complete resulting snapshots or unchanged denials against the fully loaded game (including its later wrappers), with rendering effects suppressed. Kernel tests separately cover malformed commands/state, wrong actor, conservation, input immutability and context isolation. Integration tests use real Auth/Database emulators and two HTTP service instances for replay, concurrency, authorization and rejected-state preservation. Results: asset-results.json, service-results.json, and the stability artifact's skyline-asset-browser.json.

This subset is not a replacement for the existing live multiplayer engine. Keep candidate rules/service isolated until all approved gameplay, hidden-state projections, recovery and actual browser-client migration pass review together.

## Internal setup and randomness prerequisites

setup-kernel.cjs now reuses audited newGame, the later Skyline Keys wrapper, name cleanup, and dice-generation rules from the game source. It is an internal prerequisite, not a public start or roll implementation. initializeGame accepts an already trusted roster plus validated approved settings; it preserves Classic/Quick/timed modes, all 31 cities, existing rule flags, token/cosmetic/tier fields, two Quick Deal properties per seat, shuffled decks, unique floors 2–99, highest-key first player and the last player's +100 bonus. It does not verify ownership/entitlements: the future profile/admission boundary must supply those trusted choices. Unknown fields/registries and malformed rosters are rejected before randomness is consumed.

Fisher-Yates uses Node crypto.randomInt for unbiased integer draws rather than Math.random. The dice-generation expression uses the same trusted integer provider and preserves turbo gating after the first lap and its 1–4/star/taxi faces. Math.random throws inside these kernels, so an unaudited extra random use fails closed. The sealed-key wrapper in the original game catches exceptions; the kernel additionally requires a complete valid key draw, preventing entropy failure from returning a keyless game. An injectable integer provider exists only as an internal test dependency; no HTTP body accepts it or a seed.

sampleDice is a non-mutating primitive. It does not store a roll, increment a revision, move a player, resolve cards/rent/jail/debt, offer a perk re-roll, advance a turn or issue profile rewards. Calling it again samples again. Before any public roll/start endpoint is enabled, the service must durably bind its private random result to the authenticated request/revision, reuse it on transaction retries/recovery, and commit the complete rules transition plus receipt atomically. Never generate fresh randomness inside a retrying database transaction. Do not send a whole setup snapshot or deck order to an untrusted client; a redacted game projection is still required.

The shared audited-rules.cjs owns the full-source pin and identity checks. UID-less AI seats remain legal while human identities are mandatory and non-null identities are unique. The property subset now accepts that same legitimate AI roster shape. This does not implement AI turns, leave/reclaim or host transfer during gameplay.

Unit tests compare setup invariants and every two-/three-die value combination under all turbo/first-lap gates, reject malformed inputs and simulate entropy failure. Real-browser tests compare entire setup snapshots and exact dice values/random-call counts against the fully loaded original functions. Results are retained as setup-results.json and skyline-setup-browser.json. Public /start remains 501; roll is not an accepted command. No live service or rules deployment is introduced.
