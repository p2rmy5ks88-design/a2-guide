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
| 04 | Purchase integrity | NOT STARTED | StoreKit sandbox; PR #68 owner approval. |
| 05 | Saves / cloud / offline | NOT STARTED | Review PR #91. |
| 06–15 | Product, UX, AI, balance, beta | NOT STARTED | |
| 16–18 | Release gates | NOT STARTED | Owner authorization for TestFlight / store builds. |

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
