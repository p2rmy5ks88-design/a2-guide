# Setup and randomness prerequisites — 27 October 2026

PR #17 continues issue #2 with internal game-initialization and dice-generation primitives. These are prerequisites for a trusted turn engine, not a playable server-authoritative game or live-client migration.

## Preserved behavior

The implementation reuses audited original game functions and the later Skyline Keys wrapper. Setup retains Classic/Quick/timed modes, 2–6 seats, approved settings/cities, existing token/tier/cosmetic fields, card-deck shuffling, two Quick Deal properties per seat, unique floor keys 2–99, highest-key opening player and the last player's +100 cash bonus. Existing name cleanup is reused. The complete normalized game source remains hash pinned through shared audited-rules.cjs.

Fisher-Yates and dice generation use crypto.randomInt. The only rule-source transformations replace random integer sampling; they preserve the shuffle algorithm and dice expressions. The turbo die still applies only after the first lap, with numeric 1–4, star and taxi faces. A provider failure never falls back to Math.random; an incomplete key draw is refused even though the original browser wrapper catches exceptions. Test-only seeded providers make cases reproducible; no public request accepts a provider or seed.

UID-less AI seats are accepted consistently by the property subset, while human identities remain required and non-null identities are unique. This preserves an existing roster shape; AI turn execution is still unfinished. No approved artwork, UI, game prices or custom rules are changed by PR #17.

## Validation

Verified implementation: `c4db9b9ebc49bf83eaece2515c409af022485970`.

- [Isolated security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40467667281): 76 setup invariant/replay cases, 324 dice-value/gating combinations and 39 malformed-input/entropy/identity guards passed. The secure default provider also executes in this suite; deterministic vectors are rule-equivalence checks, not a statistical randomness certification.
- The same run passed 61 property-kernel checks, 47 real Auth/Database emulator + HTTP checks across two services, and 55 candidate-permission checks. Four previously identified legacy source-rule allowances remain reproducible. No live permissions were inspected or deployed.
- [Browser/game workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40467667283): 76 complete setup snapshot comparisons and 324 exact dice-value/gating comparisons passed with zero captured browser errors. All 41 property-parity scenarios, 175 simulated games and 282 existing/expanded regression checks also passed, without captured game/page errors or failed cash/building-bank invariants.

Reports: setup-results.json in the security artifact; skyline-setup-browser.json, skyline-asset-browser.json and the existing per-game results in the browser artifact. A documentation-only follow-up records these results without changing tested implementation.

## Reproduce

Node 22: install the pinned security tools and run `npm test --prefix skyline-estates/security` with Java 21 available. It invokes only loopback demo Auth/Database emulators. For the dependency-free setup checks alone, run `node skyline-estates/security/service/setup-kernel.test.cjs`.

Install the existing browser-test tools with `npm install --prefix skyline-estates/tests`, select an installed Chrome via CHROME_PATH (or install the matching Playwright browser), then run `node skyline-estates/security/service/setup-browser.test.cjs`. The stability workflow also runs it and the existing game suite.

## Remaining boundary

The initializer accepts an already trusted roster. It validates registry/shape, not token ownership, earned tiers or cosmetic entitlements; a trusted profile/admission boundary must supply those choices. The public start endpoint remains disabled, and roll is not an accepted action kind.

The dice sampler is non-mutating and deliberately does not persist a roll. Before enabling any public start/roll command, bind private random results to request ID/revision durably, reuse them during retries/restarts, and commit the complete transition and receipt atomically. Never draw fresh randomness inside a retrying transaction. Do not expose full snapshots or deck order to clients.

Full turns, movement/landing, cards, auctions, jail, debt/bankruptcy, two-party trades, perk re-rolls/minigames, profile rewards, redacted state projections and live UI/reconnect/restart integration remain open, alongside the existing production rollout gates. No service, production Firebase rules, live room data or store package was deployed by PR #17. The separately tested PR #16 fixes unlocked-token web loading.
