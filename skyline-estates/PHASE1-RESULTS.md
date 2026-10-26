# Phase 1 stability results — 26 October 2026

Scope: issue #2, branch `skyline-phase1-stability`, baseline commit `4dc98984d651f68437b8080f360cb80cb5394ad3`. This is the first stability PR, not completion of every release task in the issue.

## Browser evidence

Windows, headless Chrome 156.0.8078.47, Playwright 1.62.1; real page served over localhost. No external generation or paid services used.

The original, unchanged `window.__sim(100, 4)` completed 100 games: no captured browser/game exceptions and all end-of-game cash, 36-house and 12-hotel conservation checks passed. Rounds ranged from 17 to 301; two games reached the 300-round safety limit (recorded as round 301), so these are not natural last-player finishes. This baseline is unseeded and cannot be replayed exactly. Raw per-run fields are in `test-results/baseline.json`.

After the fix, seed **20261026**, four AI players (easy/normal/hard rotated):

| Configuration | Runs | Recorded rounds | Outcomes |
| --- | ---: | --- | --- |
| Classic | 100 | 26–221 | 100 last-player finishes |
| Quick | 25 | 12–106 | 25 first-bankruptcy finishes |
| Timed, 20 rounds | 25 | 21 | 25 timed finishes |
| Optional rules | 25 | 19–301 | 24 last-player finishes, 1 round-limit stop |

All **175** games passed: `err=null`, finite nonnegative player cash, nonnegative integer bank counts, bank + placed houses = 36, bank + placed hotels = 12. Zero browser page exceptions. Raw records include rounds, cash, survivors, outcome, winner (null on safety-limit stops), leader and invariant booleans in `test-results/phase1.json`. Checks are at game completion, not every intermediate operation.

Optional batch: free-for-all building, uneven building, city events, turbo die, jackpot, double payday and no jail rent enabled; auctions, mortgage interest, perks and mini-games disabled. This samples combinations, not every combination or human mini-game path. Three-game seed-42 replays matched exactly within this browser environment (six additional games outside the table).

## Confirmed bug and fix

Before: `validTrade({from:0,to:1,give:[],get:[],gc:-2000,rc:0,gcard:0,rcard:0})` returned true. Execution produced cash `[3600,-300]` in a fresh two-player game (including its existing late-seat bonus). See `test-results/trade-before.json`. The local editor constrains normal cash inputs, but the shared validator also handles remote/counter offers and did not enforce that constraint.

Now: shared validation rejects negative/nonfinite/unaffordable cash, self/missing/bankrupt participants, invalid/duplicate/nontradable properties and unavailable/invalid bail-pass counts. It rechecks immediately before execution, preventing stale accepted offers from overdrawing cash or transferring changed properties. Trade statistics and animation wrappers propagate rejection without applying effects. Legitimate trade behavior and existing custom building restrictions remain intact.

29 focused browser regression assertions cover invalid offers without state mutation, developed-group restriction, stale cash, valid property/cash and bail-pass transfers, seeded replay and simulator cleanup on success and injected setup failure. The hook accepts optional `{seed,set}` and restores FAST, randomness and the prior error callback in `finally`.

The test browser marks onboarding as already completed. Otherwise its pending welcome sleep is cancelled when the simulator changes GEN, producing an unrelated unhandled Abort. No browser errors are filtered or ignored. This onboarding/simulator interaction is not fixed in product code by this PR.

## Reproduce

From repository root, Node 22+:

```sh
npm install --prefix skyline-estates/tests
npx --prefix skyline-estates/tests playwright install chromium
npm test --prefix skyline-estates/tests
```

The runner serves the actual page on an ephemeral loopback port, launches headless Chromium, asserts checks, writes the JSON report and exits nonzero on failure. Optional `CHROME_PATH` selects installed Chrome; `PLAYWRIGHT_MODULE` selects a preinstalled Playwright module (used here to avoid downloading dependencies). A result path may be passed to the runner directly. Run against a disposable browser profile: the simulator replaces the current game state.

## Build baseline and outstanding issue #2 work

Web source: `skyline-estates/game.html`; standalone page: `index.html`, updated with identical logic. No CSS, artwork, board spaces, scenery or UI layout changed. App package is 1.0.0, Capacitor ^7.0.0, ID `com.kenstylez.skylineestates`. Android workflow uses Node 22/Java 21 and derives version `1.0.<run number>`; the installed/published APK version was not verified. The Android workflow currently triggers on main/game.html or manual dispatch, despite contradictory README notes.

Not performed or claimed: physical Android testing, native builds, human end-to-end play, save/recovery and offline/WebGL fallback testing, 2D/3D switching, multiplayer reconnect/security, purchases/receipt restoration, iOS signing or store readiness. These remain tracked in #2. No Android publishing workflow was triggered. Main was not committed to, merged or deployed. The one capped optional game is a balance/termination follow-up, not evidence of an exception or broken economy.

## Follow-up: saved turn stage — 26 October 2026

A visible browser test of the published game reproduced an extra-roll bug: in a two-human Quick Deal match, Kofi rolled 10, reached the End Turn prompt, used Menu → Save & exit, then Play → Continue. Kofi was still on the same square with the same cash, but was offered Roll again. `startWith` retained the saved `phase='post'`; `playTurnInner` discarded it and restarted the roll loop.

The follow-up preserves the post-roll stage and goes directly to property management/End Turn. It also stores the consecutive-double count and clears it when the next player starts, so saving between bonus rolls cannot reset the three-doubles jail rule. Legacy saves without that field still use zero. No art, board, layout or custom-rule changes.

Validation: **10 deterministic source-level tests** exercise the actual save/load and turn functions with controlled dice and UI spies. They cover human/AI post-roll resume, normal pre-roll resume, third-double jail, next-turn reset, legacy saves, jail, new games, bankrupt players and save isolation for online/simulation games. The post-roll regression fails on the original baseline and passes on the fixed source; standalone and app turn code match. Run `node skyline-estates/tests/turn-resume.cjs` (no dependencies required). This is source-level validation, not a claim of a manual browser test of the unreleased fix.

Published-page UI checks also verified: build cost ₦40M with house bank 36 → 35; sell return ₦20M with bank 35 → 36; mortgage proceeds ₦25M; redeem control ₦28M and rent restoration. UI money labels are rounded. The free-for-all build succeeded on a partial group, but the portfolio still showed full-set advice; that copy inconsistency is recorded for later work. Purchase/auction/trade end-to-end, natural human match finish and 2D/3D switching remain unverified in this follow-up.

The new `Skyline stability tests` PR workflow runs the 10 turn tests and the existing 175 seeded browser games with 29 trade/simulation checks. Its fresh JSON is uploaded as an artifact, separate from previously committed results. It has read-only repository permissions and no deployment or native publishing step. Its run status is reported on the PR; prior committed browser results above describe the earlier trade-fix run, not an unrun follow-up test.

Physical Android testing remains unavailable because the owner has no Android phone. No action is required from the owner to continue browser development; a physical-device check is still a future release requirement.
