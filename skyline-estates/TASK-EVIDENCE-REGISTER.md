# Skyline Estates — task evidence register

Source plan: "Comparative Review & Master Fix Plan" (5 Nov 2026). The two external ratings (6.5/10 commercial readiness, 7.8/10 game review) are subjective reviews with different scopes, so they are not averaged.

Evidence columns:
- **Src**: in source.
- **Auto**: automated tests passed.
- **Prod**: production deployed and validated.
- **Device**: physical-device accepted.

Values are ✅ (done), ◐ (partial), — (none), or BLOCKED.

## Task 00 — Inventory & release baseline (5 Nov 2026)

### Status

VERIFIED for web. The native, backend and purchase rows are recorded with their blockers.

### Repository

- `main` is at `d1ea06e` (merge of #111) before this change. Recent merges are #108 (Season rewards preview), #109 (Collection redesign + SC upgrades), #110 (finish row removed) and #111 (Characters tab / Rooftops).
- Open PRs, none of them merged:

| PR | Branch | Note |
|---|---|---|
| #92 | skyline-payment-safety | Coin wallet guards. Not activated. |
| #91 | skyline-local-restore-fix | Local backup restore. Relevant to Task 05. |
| #90 | skyline-local-test-reward | Opt-in local reward for internal builds. |
| #84 | skyline-focus-hud | Focus HUD. In review. |
| #68 | skyline-ios-payment-update | Coin packs. **Owner approval required.** |

### Generated web assets

- `python3 build.py --check` reports "Standalone page and offline manifest are current".
- Live GitHub Pages `sw.js` build is `faa79980302ef895aedd5535`, which equals `main`. Production web therefore matched main at the time of the audit.

### Native / TestFlight

- TestFlight build 169 is in the internal group "Skyline iOS QA". It contains main up to `bf309c5` plus the 45-minute iOS job timeout.
- It does **not** contain #108–#111.
- A new upload needs separate owner authorization.

### Backend (eko-estates)

- The source exists: `competition/compose.cjs` and `security/service/*`.
- Live deployment is paused until the owner approves. No production backend proof is recorded here.

### Purchases

- The client is `lib/storekit-client.js`.
- Sandbox StoreKit has not been verified on a device. PR #68 is still unmerged.

### Fix found during the audit

- **Problem:** the owner could still see the Characters tab after #111. The CSS selector was scoped to `#title`, which does not always contain the Collection pane.
- **Fix:** the tab button is now removed from the DOM in `collectionNavigation()`, and the CSS selector is broadened.
- **Check:** in Chromium at 844×390 the Collection tabs are `tokens, frames, buildings`, and 0 visible `cast` buttons remain.

## Baseline matrix

| Area | Src | Auto | Prod | Device | Notes |
|---|---|---|---|---|---|
| Web game, generated pages, service worker | ✅ | ✅ | ✅ | — | Live build matches main. |
| Collection + SC upgrades (#109–#111) | ✅ | ✅ | ✅ | — | iPhone landscape check pending (Task 06). |
| Portfolio mortgage/build (#106–#107) | ✅ | ✅ | ✅ | ◐ | In TestFlight 169; not formally accepted. |
| Trophies results card, Season 1 | ✅ | ✅ | ✅ | ◐ | Season rewards are a preview only and grant nothing. |
| Saved SC wallet / receipts | ✅ | ✅ | ✅ | — | Task 05 still owes migration fixtures. |
| Competition backend authority | ✅ | ◐ | BLOCKED | — | Live deploy needs owner approval. |
| Purchases / StoreKit | ◐ | ◐ | — | BLOCKED | PR #68 not merged; no sandbox evidence. |
| Native iOS bundle | ✅ | ✅ | — | ◐ | Build 169 lacks #108–#111; upload needs authorization. |
| Android | — | — | — | — | Not pursued. |

## Task board

| ID | Task | Status | Evidence / blocker |
|---|---|---|---|
| 00 | Inventory & baseline | VERIFIED (web) | This file. |
| 01 | Release / migration / backup controls | VERIFIED (automated) | RELEASE-CONTROLS.md; 10 checks PASS on d1cceae. Device save/restore is still a separate gate. |
| 02 | IP originality / trade dress | CODE COMPLETE + legal flags | IP-AUDIT.md; utilities renamed (City Power Grid / Lagoon Water Board). Board layout, card effects and real landmarks flagged for LEGAL REVIEW, which blocks store release. |
| 03 | Competition authority | VERIFIED (automated); Prod BLOCKED | See the Task 03 section below. |
| 04 | Purchase integrity | VERIFIED (automated); Device BLOCKED | See the Task 04 section below. |
| 05 | Saves / cloud / offline | VERIFIED (automated); Device pending | See the Task 05 section below. |
| 06 | Collection + SC upgrade UI acceptance | VERIFIED (Chromium); Device pending | See the Task 06 section below. |
| 07 | Portfolio mortgage/build usability | VERIFIED (Chromium); Device pending | See the Task 07 section below. |
| 08 | Trophies / Season / rewards truth | VERIFIED (Chromium) | See the Task 08 section below. |
| 09 | Signature city / strategic identity | VERIFIED (Chromium); Device pending | See the Task 09 section below. |
| 10 | AI decision quality and feedback | VERIFIED (Chromium sims) | See the Task 10 section below. |
| 11 | Onboarding first match | VERIFIED (Chromium); live player test pending | See the Task 11 section below. |
| 12 | Navigation, layout & accessibility | VERIFIED (Chromium); VoiceOver on device pending | See the Task 12 section below. |
| 13 | Touch, audio, native lifecycle | CODE COMPLETE + automated; Device BLOCKED | See the Task 13 section below. |
| 14 | Quantitative balance audit | VERIFIED (600 seeded sims) | BALANCE-REPORT.md; no rebalancing justified. |
| 15 | Closed beta / retention | CODE COMPLETE (plan + opt-in diary); beta BLOCKED on owner recruiting | BETA-PLAN.md; metrics blank until observed. |
| 16 | Production web acceptance | RELEASED (web, live = main `f4b5dd1`); device acceptance pending | See the Task 16 section below. |
| 17 | iOS / TestFlight readiness | BLOCKED: upload needs owner approval | Build 169 lacks #108–#128. |
| 18 | Android readiness | NOT STARTED (not pursued) | |

## Task 03 — Competition authority & reconnect (5 Nov 2026, main `f97f9e3`)

### Security flow

1. The client authenticates (Firebase ID token).
2. `competition/compose.cjs` → admission:
   - verified, expiring invitations;
   - exactly 2 seats, enforced atomically;
   - allowlisted room settings.
3. The start service resolves the server roster.
4. Turn service, roll plans and operations run against the pinned audited kernel.
5. The end-kernel result is projected server-side and ingested into rankings:
   - per Season;
   - at most 3 eligible results per day;
   - once only across instances;
   - no browser score or wallet fields.

The composition imports no Apple or purchase modules.

### Negative cases

All in `tests/competition-service.cjs` and `tests/competition-match.cjs`; all PASS:

- browser score and wallet fields rejected;
- unauthenticated requests rejected;
- non-members rejected;
- no duplicate points across two instances and repeated participants;
- ties get no invented winner;
- pre-launch and archived results cannot repopulate Season 1;
- invitation expiry and capacity enforced;
- per-identity rate limit;
- reward claimed once only after the stored goal is met.

### Test results

- PASS: competition-service, competition-match, competition-production, competition-transactions; start, turn-kernel and turn-service; lobby-controller; operation-service.
- Not run: `turn-browser.test.cjs` could not run locally because its Playwright module path is missing in this environment. CI runs it.

### Legacy leaderboard (`lb/s<n>/<uid>`, client-written)

- **Problem:** the database rules let a signed-in user write their own trophies, 0–100000. That value is self-reported.
- **Current mitigation, checked in Chromium on the Leagues pane:**
  - it is labelled "Device-reported scores";
  - casual challenges say "never verified";
  - the server "Verified competition" section is separate;
  - the Season rewards preview says only verified ranked results count.

### Blockers

- **Production backend:** live deployment is paused until the owner approves, so no live endpoint version is recorded.
- **Recommended, needs owner approval** (it is a rules deploy): restrict or retire `lb` writes, or have the rankings read only server-verified rows.
- **Reconnect:** a physical-device reconnect test is outstanding.

## Task 04 — Purchase / entitlement integrity (5 Nov 2026)

### Design (source)

- `lib/storekit-client.js` (StoreKit 2):
  - It never changes local Coins and never invents prices.
  - Only the 4 fixed coin-pack product IDs are accepted.
  - It requires a signed-in account and re-checks it after every await, so a purchase cannot be credited to a different account after a switch.
  - It allows one purchase at a time.
- Delivery goes through the server wallet: `wallet.purchase` (verify), `wallet.delivery`, then StoreKit `finish`. The transaction is finished only after the server records delivery.
- A balance read that fails after delivery shows "wallet pending". It is never shown as a failed purchase.

### Purchases on and off

- Purchases are on only in iOS native builds whose channel is `private-testing` or `ios-release`.
- Pushes and PRs build with the channel `off`.
- The web game has no purchases (`no-purchases-browser` PASS).
- Coins buy Shop and cosmetic items only. Saved SC cannot be bought.

### Tests (all PASS on `5b2c8db`)

- storekit-client
- purchase-delivery
- iap-lifecycle
- wallet
- purchase-vault
- wallet-integration
- firestore-wallet
- no-purchases-browser
- purchase-start-browser
- native-firebase-config

### Blockers

- **StoreKit sandbox:** purchase, restore, interrupted purchase and refund still need testing on a physical iPhone in TestFlight. The owner must run these; no physical-device evidence exists yet.
- **PR #68** (coin packs) stays unmerged until the owner approves.
- **Production wallet endpoint:** no live verification yet, because the backend deploy is paused until the owner approves.

## Task 05 — Saves, cloud / local persistence, offline (5 Nov 2026, main `f3bd15f`)

### PR #91 (local backup restore)

- **Superseded.** Its restore fix (`cloud-profile.js` local-only pause, `cloud-restore.cjs` regressions) is already identical in main through `853d4ca`.
- A test cherry-pick left only its notes file as a difference.
- #91 also carries #90's opt-in test reward commits, which are not merged.
- Recommendation: the owner closes #91. #90 still needs a separate decision.

### Tests (all PASS)

- cloud-restore
- cloud-profile
- save-recovery
- offline-worker
- offline-startup
- cloud-sync-browser (Chromium)

These cover:
- restore with no cloud overwrite;
- the pending local change recorded before reconciliation;
- corrupt save recovery;
- the service worker waiting for open game tabs;
- offline boot.

Together with the Task 01 wallet migration fixtures:
- SC and upgrade receipts are append-only;
- `repair()` re-applies paid levels.

### Pending

Still to test on a physical iPhone:
- restore a backup in TestFlight and relaunch the app;
- airplane mode during a match;
- sign out and back in.

## Task 06 — Collection + SC upgrade UI acceptance (5 Nov 2026)

### Overlap audit

- Coverage: Tokens / Frames / Buildings × Night and Daylight × 844×390, 667×375, 390×844 and 1280×800 (24 screens).
- Each screen is checked at the top and again with every list scrolled to the bottom.

### Fixed

- The floating "⌃ Menu" handle covered the last grid row and the "Upgrade for SC" button. The grid and detail columns now reserve 64 px plus the safe area.
- In portrait, the Frames / Buildings tab labels were clipped by a 48 px row. The row height is now automatic.
- Rooftops in portrait was squeezed into 2 columns of 163 px, and "City Spotlight reward" overflowed its card. It is now one column and the label wraps.
- Daylight Rooftops rows, the Token perks box and the profile name (navy on the dark header) were unreadable. They now use light cards and a white name pill.
- "Needs 1 wins" now reads "Needs 1 win" (both token and building reasons).

### Results

- Overlap check: 0 handle overlaps and 0 off-screen controls across the 24 screens.
- The remaining raw intersections are cards scrolled under clipped scroll areas. These are not visible collisions, which the screenshots confirm.

### Tests (all PASS)

- collection-sc: wins regex updated.
- collection-vault-browser: now expects the 3 categories, since Characters was removed in #112.
- home-redesign-browser
- portfolio-fast-upgrades-browser

### Still to do

- Physical iPhone landscape check of scrolling and dropdowns.
- A real SC upgrade receipt that persists across a relaunch.

## Task 07 — Portfolio mortgage / build usability (5 Nov 2026)

### Overlap and usability audit

- Fixture: an in-match Portfolio with a built district, plain streets, a mortgaged street, a transit hub and a mortgaged utility.
- Coverage: all 4 tabs × Night and Daylight × 844×390, 667×375, 390×844 and 1280×800.
- Each screen is checked with the list at the top and scrolled to the bottom.
- Checks: overlaps, controls off screen, clipped text, and buttons smaller than 44 px.

### Fixed

- In portrait, "Mortgaged" and "Missing sets" were off the right edge of a scrolling tab row. They are now a 2×2 tab grid.
- In Daylight, every build pip showed grey, so the built level was not visible. The light override outranked `.on`; built pips are now green and towers gold.

### Results

- 0 controls off screen.
- 0 targets smaller than 44 px.
- 0 clipped labels.
- The remaining raw intersections are rows scrolled under the clipped list edge. Screenshots confirm these are not visible collisions.
- Build, Sell and Mortgage reasons are shown inline, e.g. "Sell this district's buildings before mortgaging".
- Redeem shows the cost against match cash.

### Tests (all PASS)

- portfolio-integrated-browser
- debt-portfolio-browser
- portfolio-fast-upgrades-browser
- gameplay-ux-browser

### Still to do

Check on a physical iPhone:
- landscape touch feel;
- redeeming during a live turn.

## Task 08 — Trophies, Season and rewards truth (5 Nov 2026)

All fixes are in `release_hotfixes.py`; `game.html` is unchanged.

### Fixed

1. **Skyline Gala frame.**
   - It said "Season 2 premium pass, tier 40", but it is the tier-40 premium reward of every Season (`tierReward`).
   - Its progress checked the pre-reset internal Season number 2, so it always showed 0.
   - Now: "Premium Season pass, tier 40", with progress shown from the current premium pass.
2. **League item unlocks** (Neon Night surround at Gold, Marble dice at Platinum).
   - These used the current league, which resets each Season, so a reached reward could be lost.
   - They now use the best league ever reached, the same rule as the once-only promotion coins.
3. **Leagues hero.**
   - After a reset it promised "Reward at Silver 150 coins" again, but the coins are paid once.
   - It now shows "✓ Already earned".

### Unchanged, verified

- The results card states trophies earned, or the exact reason none were awarded (from #106).
- Promotion coins are granted once per league (`leagueBest`).
- The Season rewards preview grants nothing and says only verified ranks count.
- The rankings screen is labelled "Device-reported".

### Checks

- **Runtime fixture:** best league Gold, trophies 0.
  - Hero shows "Silver reward ✓ Already earned".
  - Neon Night surround owned = true; Marble dice owned = false.
  - Gala frame text correct.
- **Tests (all PASS):** testflight-hotfix-browser, release-content, token-mastery, currency-browser.

## Task 09 — Signature Skyline strategic play (5 Nov 2026)

### Mechanic inventory (existing, unchanged rules)

- **Market Pulse** (optional, local games only). From round 3 a rotating district gets one of:
  - District Demand: +10% rent;
  - Permit Window: −15% building;
  - Quiet Market: −10% rent.

  Each lasts 2 rounds, followed by 1 neutral round. Owners choose: keep cash, or buy a permit (SC 10M) for an extra 10% off building. AI gets the same offer.
- **City Strategic Events** (one event slot):
  - City events, e.g. Lagos Film Festival (+50% rent in Surulere & Yaba) and Stockholm's Slussen upgrade (−50% building for one turn);
  - generic Development Boom, festival and infrastructure events.
- **City Spotlight:** a cross-match goal ("play N matches in a city" → rooftop reward). It is not an in-match decision.
- **Token powers:** payday, re-rolls, Lucky Pass, rent shield and surge, applied through Collection perks.

### Decision map: gaps found and fixed (text only, no rebalancing)

1. **Market Pulse permit (keep cash vs permit).**
   - Before: the dialog gave only a generic example ("a SC 100M build saves SC 10M").
   - Now it uses the player's own numbers. Example: "Worth it if you build 2+ homes in Yaba & Surulere by the end of round 4. You can build on 3 streets now, and each home saves an extra SC 9M with a permit."
   - When the player can't build there yet: "Suggested: keep cash", with the reason.
2. **City events: what they mean for you** (new `lib/city-event-advice.js`).
   - Before: banners, the chip and the info dialog stated the effect and duration only.
   - Now the banner, the chip (title and aria-label) and the info dialog add a personal line. Example: "For Ada: you own 2 of 3 here: rent you collect +50% · landing on rivals' street here costs 50% more."
   - Building events say whether the player can build now, must complete the district first, or should watch rivals build cheaper.

### Captures

At 844×390 and 390×844 (Chromium), with no page errors:
- the permit verdict;
- the Film Festival banner;
- the info dialog with the personal line.

### Tests

- market-pulse: 66 checks and 95 simulations PASS. Decision buttons are visible and tappable at 956×440, 844×390, 844×320 and 667×375.
- release-content: PASS.
- gameplay-ux-browser: PASS.

### Not changed

Prices, rents, durations, AI permit logic, ranked rules and the online protocol.

## Task 10 — AI decisions and explanation (5 Nov 2026)

### Audit

- Every local AI used one strategy: `aiValue`, `aiReserve`, `aiWantsBuy`, `aiBid`, `aiPostTurn` and `aiProposeTrade`.
- Difficulty only changed buy and bid probabilities.
- Ranked online matches are human-only and run on the server kernel, so they are out of scope.

### Strategy matrix

New `lib/ai-styles.js`. Styles are built only from the existing hooks: no extra cash, no dice or card knowledge, and rules unchanged.

| Style | Cash cushion | Valuation | Trades |
|---|---|---|---|
| Builder | ×1.2 | Own or completing district ×1.2; new district ×0.9 | Half as often |
| Trader | ×1.0 | Blocking a rival's near-complete district ×1.25; transit and utilities ×1.15 | Normal |
| Investor | ×0.88 | Everything ×1.06 | Normal |

- The style is fixed by seat token, so it needs no save-schema change.
- Player cards show "AI · Builder / Trader / Investor", with the strategy as a tooltip.

### Explanations

- Short, non-blocking speech bubbles after a buy decision, rate-limited and never shown in fast mode or simulations.
- Examples: "Completes Yaba & Surulere!", "Blocking Kofi in Ikoyi", "Collecting the network", "Keeping a cash cushion".

### Fairness

Deterministic `__sim`: 60 three-AI games, equal seeds 777–779, styles rotated across seats, 300-round limit.

| | Leader wins | Unfinished | Errors | Average rounds |
|---|---|---|---|---|
| With styles | Builder 25 · Trader 16 · Investor 19 | 0 | 0 | 67 |
| Base engine, same seeds | by seat: 28 · 16 · 16 | 0 | 0 | 61 |

- The spread across styles is about the same as the base engine's spread across seats.
- Bank and cash invariants held in all 60 styled games.
- The first Investor tuning (cushion ×0.75) won only 14 of 60, so it was eased to ×0.88.

### Engine parity

- Simulations stay style-neutral unless a test opts in (`SkylineAIStyles.simulate(true)`).
- This keeps Market Pulse's check that "events-off games exactly match the base engine" valid.

### Tests (all PASS)

- `tests/ai-styles-browser.cjs` (new; added to skyline-stability): 12 seeded styled games, labels and buy explanation.
- complete-matches: 25 checks.
- market-pulse: 66 checks, 95 simulations.
- gameplay-ux: 17 checks.
- release-content.
- build-pipelines.

## Task 11 — First-session onboarding (5 Nov 2026)

### Observed baseline flow (fresh profile, 844×390)

1. Welcome 1/3: name and character.
2. Welcome 2/3: token.
3. Welcome 3/3: +500 Coins, then Look around / Skip, just play / Show me how to play.
4. "Show me how to play" showed **8 slides (~1,340 characters)** before the first roll.
5. "Play my first game" starts a default Lagos Solo match. The default City + Solo path already existed.
6. The Skyline Keys turn-order draw (one tap), then the match.

### In-match coach tips (first 2 games)

- Before: roll, buy, build and end turn only.
- Problems found:
  - the build tip said "Properties" (the button is "Portfolio");
  - there was no Skip or Replay;
  - nothing explained match SC versus saved SC versus Coins.

### Changes (new `lib/first-session.js`)

- **Welcome tour:** 4 slides (goal, roll, buy, build; ~680 characters). The last slide says tips will appear in play.
- **New moment-based tips:**
  - SC currencies, from round 2;
  - Lucky Break / City Hall card landing;
  - tax square;
  - Lockup;
  - low cash (points to Portfolio mortgage and sell).
- **Coach tips:** "Skip tips" turns them off. Menu › How to play keeps all 8 slides and adds "Replay tips".
- **Wording:** the build tip now names Portfolio.

### Returning players

- No tips after 2 games unless replayed.
- No forced tour.

### Tests (all PASS)

- `tests/first-session-browser.cjs` (new, in CI; 8 checks):
  - 4- vs 8-slide tours;
  - Skip tips;
  - Replay tips;
  - Portfolio wording;
  - no tips for returning players.
- currency-browser, currency-sc, gameplay-ux, home-redesign, ai-styles.

### Pending

An observed test with real first-time players (the plan's step 05). This needs the owner to recruit 3–5 people.

## Task 12 — Navigation, layout & accessibility (5 Nov 2026)

### Responsive scan

- **Coverage:** home tabs City / Portfolio / Collection / Shop / Awards / Progress × Night and Daylight × 844×390, 667×375 and 390×844 (touch).
- **Checks:**
  - controls off screen;
  - controls covered by another element (hit test);
  - buttons with no name;
  - targets under 40 px.
- **Phone landscape:** no off-screen or covered primary actions.

### Found and fixed

1. **Upright phone, forced-landscape mode (`html.rot`): Play cards off screen.**
   - Newer stylesheets evaluated media queries and vh/vw against the upright viewport, so the home Play cards rendered at x = −74.
   - New `lib/rot-media.js` re-evaluates those rules and units against the visible landscape size, only while rotated.
   - It never touches the original game styles, and it is inactive in landscape: 0 rules rewritten, verified.
   - Collection's deliberate un-rotation (#109) is respected.
   - Result: the rotated home matches the 844×390 layout.
2. **Dialogs (all `modal()` overlays)** — new `lib/a11y-dialogs.js`:
   - `role="dialog"`, `aria-modal` and a heading label;
   - focus moves into the dialog;
   - Tab is trapped inside;
   - Escape presses a clear dismiss button only (never a game action);
   - focus returns to the opener.

   Verified with the in-match Menu and the Portfolio sheet.
3. **Portfolio button name:** it announced "Your properties". It is now "Portfolio", matching the visible label.
4. **Touch targets:**
   - Collection Sort dropdown: 34 px → 42 px.
   - Progress sub-tabs keep a 34 px visual height. The tap area is extended with an invisible margin, because a taller row pushed the Season tracks into the dock (currency-browser check).

### Not changed

- Removed tabs, cosmetic rows and preview panels stay removed.
- The SC diamond and Coin icons are unchanged.
- Gold stays reserved for primary actions.

### Scanner notes

These are false positives, confirmed with screenshots:
- "Keep playing" buttons have text but sit off screen in a scroll area.
- Rotated-Shop "covered" hits are content inside the scrolling pane.

### Tests (all PASS)

- `tests/a11y-layout-browser.cjs` (new, in CI; 9 checks):
  - the rotated home shows its Play cards;
  - landscape stylesheets are untouched;
  - Portfolio name;
  - dialog role and label;
  - focus in, Tab trap, Escape and focus return.
- currency-browser, gameplay-ux, home-redesign, collection-vault, first-session, portfolio-integrated, debt-portfolio, testflight-hotfix.

### Pending

A VoiceOver pass on a physical iPhone.

## Task 13 — Touch, audio and native lifecycle (5 Nov 2026)

### Packaging audit (existing, not reinitialised)

- Capacitor 7: core, ios, android, app, splash-screen and status-bar.
- `@capacitor-firebase/authentication` 7.5.0.
- `cordova-plugin-purchase` 13.12.
- **iOS orientation:** locked to landscape left/right (`scripts/patch-ios.sh`). The app therefore never uses the web's upright-phone rotation (Task 12 is web-only).
- **Bundle:** `www/` is not committed. It is built from the shared source on every iOS run (`build-web.mjs`) and checked by `verify-bundle.cjs` in skyline-ios.yml.
- A local `build-web` run on `714c831` + this change includes every new lib: rot-media, a11y-dialogs, native-lifecycle, first-session, ai-styles and city-event-advice.
- Local `verify-bundle` needs the app's npm fonts, which CI installs.

### Existing lifecycle behaviour (verified in source)

- **Web Audio:** `AudioContext` suspends when hidden and resumes on return, via both `visibilitychange` and Capacitor `appStateChange`.
- **Native save:** the native app saves the match when it goes inactive.
- **Rendering:** the render loop stops while hidden.
- **Camera:** pinch, drag and gamepad camera control, plus reduced motion, are documented in WEB-FOLLOW-CAMERA.md.

### Fixed (new `lib/native-lifecycle.js`)

- **Skyline FM:** stream `<audio>` elements are now paused while hidden. Before, an unrouted stream (when `createMediaElementSource` fails) kept playing and downloading in the background. On return, only the stream that was playing resumes, and only if the radio is still on.
- **Web save:** an in-progress local match is saved on `visibilitychange` hidden and on `pagehide` (Safari may discard background tabs). Online matches are untouched, since the server holds them.

### Owner decision needed

- `navigator.audioSession.type='playback'` makes game sounds play even with the iPhone silent switch on. That suits the radio, but many players expect a game to stay silent.
- Option: switch to `ambient` (respects the silent switch) unless Skyline FM is playing.
- Not changed without approval.

### Tests (PASS)

- `tests/lifecycle-browser.cjs` (new, in CI; 3 checks):
  - streams paused and match saved when hidden;
  - only the playing stream resumes;
  - radio switched off stays off.

### Blocked: needs a physical iPhone

To test:
- silent switch;
- phone call;
- music interruption;
- background and foreground;
- multi-touch camera feel.

To measure:
- memory;
- FPS;
- launch and resume time.

## Task 14 — Quantitative balance audit (5 Nov 2026)

- **Harness:** `tests/balance-sim.cjs` (seeded matrix: base, tier6, tier3, tier3b, events, pulse, Stockholm, Tokyo, Dubai, hard, easy).
- **Report script:** `tests/balance-report.py` (Wilson 95% confidence intervals).
- **Data:** `balance/balance-2026-11-05.csv` (600 games, 0 errors).
- **First-seat advantage:** none detected.
- **Token tiers:** no significant advantage. The tier 3 outlier did not replicate.
- **Events:** neutral.
- **Comebacks:** 30–50%.
- **Rules:** unchanged. See BALANCE-REPORT.md.

## Task 15 — Closed beta and retention evidence (5 Nov 2026)

### Deliverables

- **BETA-PLAN.md:**
  - scope: 20–50 volunteers, 2 weeks, owner channels only;
  - consent and privacy rules;
  - 11 feedback questions covering upgrades, trading, first match, rewards, SC vs Coins and social play;
  - an anonymised results table (blank);
  - a severity table (S1–S4);
  - a beta action log.
- **`lib/beta-diary.js`** (opt-in, on-device only, nothing sent anywhere):
  - `?beta=1` asks for consent;
  - it records anonymous counts only;
  - `?beta=export` lets the tester copy a summary;
  - `?beta=0` deletes the diary.
- No new infrastructure or backend was created.

### Tests (PASS)

- `tests/beta-diary-browser.cjs` (new, in CI; 6 checks):
  - nothing is recorded without consent;
  - starts and completions are counted;
  - no names or identifiers are stored;
  - `?beta=0` deletes the diary.
- Also PASS: first-session, gameplay-ux, testflight-hotfix.

### Blocked

- Recruiting and running the beta need the owner.
- A TestFlight upload needs separate approval.

## Task 16 — Production web acceptance (5 Nov 2026)

### Live = main

- Live GitHub Pages files were sha256-identical to main:
  - at `366fb0e`: 15 files (index, sw, offline-assets, both redesign scripts and 10 lib modules);
  - after #128, at `f4b5dd1`: re-verified (deployed in about 60 s).

### Live smoke test (Chromium, touch, via the live URL)

**844×390:**
- all 9 feature modules loaded;
- 0 page errors;
- Collection tabs are tokens / frames / buildings;
- utilities are City Power Grid / Lagoon Water Board;
- Gala frame reads "Premium Season pass, tier 40";
- AI card shows "AI · Trader";
- in-match Portfolio is named "Portfolio" and opens as a dialog.

**390×844 upright (rotated):**
- the Play Solo and Play Online cards are on screen;
- 0 page errors.

### Fixed during acceptance (#128)

- The achievement pop-up had lost its styling: narrow, with no background.
- At the top centre, it covered dialog titles such as the Portfolio header.
- Now: explicit navy/gold styling, and it moves to the bottom-left corner while a dialog is open.

### Pending

- Physical iPhone Safari acceptance by the owner.
