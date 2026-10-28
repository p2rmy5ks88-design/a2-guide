# Phase 1 closeout review — 28 October 2026

## Status

The playable web/native development baseline is tested and delivered. Issue #2 is **not fully accepted or store-ready**: its unassisted/manual and physical Android acceptance criteria are not satisfied, and production online trust/purchase gates remain open. This review closes out the implementation/evidence inventory; it does not waive those criteria or activate services. User-requested Collection/Portfolio/artwork refinements after the original stability scope are approved later work, not evidence that the original no-UI-change criterion was literally unchanged.

Current product revision: c3e22c7ff3a42388d937a4e29b1017a679da2bd4 (PR #39). Tested implementation 19bf8270aeb3dc4776ac004daab40f5ce1731971 has the same product changes; the merge only joins history. This closeout updates documentation only. The original acceptance criteria and dated history remain in issue #2 and its linked milestone reports.

## Latest verification

[Full browser run 40687681213](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681213) passed. [Per-game/browser artifact](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681213/artifacts/12816072733), retained until 26 January 2027, includes skyline-phase1.json, skyline-reference-dashboard.json and skyline-complete-matches.json. Download while retained; CI logs remain linked evidence, not permanently stored binaries.

| Evidence | Result and scope |
| --- | --- |
| Existing __sim, seed 20261026 | 175 games: 100 Classic, 25 Quick, 25 timed, 25 optional-rule games; all asserted err=null, cashOk, houseBank and hotelBank. Per-run rounds, outcomes and errors are in skyline-phase1.json. Safety-limit stops are distinguished from natural finishes by the runner. |
| Evolved token/property rarity simulation | 48 additional seeded games across 16 tokens and tiers 2/4/6; cash and both building-bank checks passed. 223 total main/evolved games, excluding small determinism replays. |
| Normal-start UI matches | Classic 57 rounds / 395 decisions / 394 invariant samples; Quick 50 / 599 / 598; timed 11 / 88 / 87. Seat 0 won all three under the documented automated policy. Saves resumed and terminal checkpoints cleared; these are automated human-seat matches, not unassisted manual acceptance. |
| Reference Collection/Portfolio/setup | 24 checks, zero browser exceptions; includes 48-game batch, all 96 stage previews, setup illustrations, light/dark themes, phone portrait/landscape, profile Settings, coin/win upgrades and saved-state preservation. |
| Promo/economy | Nine promo, 22 collection economy and ten property-rarity checks passed. Exact saved promo rewards; duplicate/expiry/failure handling. Local profile XP/coins are not trusted purchase entitlements. |
| Rendered controls and source parity | 40-space controls plus property/trade/debt/auction/cards/jail/dice/setup/AI-auction/reroll/end suites passed; 41 property comparisons and the larger source comparison suites are logged individually. No sum is presented as unique coverage. |
| Saves/offline/views | Versioned/recoverable saves; 15 offline-worker and 19 offline-startup checks; real WebGL, 2D fallback and both view switches passed. Browser smoke reports webgl=true and no page errors. The isolated view suite disables the worker; cold offline behavior is verified by its separate suite after first online installation. |
| Session/reconnect safeguards | Legacy session/remote snapshot guards and isolated trusted-service recovery/race tests passed. This is not proof that production multiplayer has migrated to authoritative state. |

[Security workflow 40678614257](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40678614257) passed on the current game source pin 52e54ff8130c80e5556160fc28df99cddcef040224eea3892b4672771c4d34a8, before the setup-only reference module change. It tests isolated candidate rules/services; deployed Firebase permissions are not verified or changed.

## Delivered builds

- Web: [Skyline Estates](https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/), [Pages deployment 40688195642](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40688195642) passed for the current product revision.
- iPhone: version **1.0.21 (21)**, bundle ID com.kenstylez.skylineestates. [Mac build 40687681217](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681217) passed simulator and unsigned ARM64 iOS-device compilation, bundle-ID/platform/source/UI checks and archive integrity. [Sideloadly ZIP](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681217/artifacts/12814888839) retained until 27 November. Outer ZIP SHA-256 c046f042ad15fbb4acc3978f42a75dad5d4c5c1d84a30b17151414f9fcb3ab75; IPA checksum included inside. It contains the new promo and illustrated setup icons. Re-sign locally in Sideloadly; installation/performance remain unverified. Update with the same signing account and bundle ID without deleting the old native app; browser and app saves are separate.
- Android: [clean build 40687681258](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681258), debug artifact skyline-estates-android-1.0.63, [download](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40687681258/artifacts/12815847439). Compilation/package checks passed; no physical Android evidence. Owner has no Android phone.
- No signed store release, TestFlight upload, paid hosting, live Firebase rule update or production authority activation occurred. Review the build logs/artifact metadata for the exact source; an older downloaded IPA never updates its bundled code automatically.

## Original acceptance reconciliation

| Requirement from issue #2 | State |
| --- | --- |
| 100+ games without critical errors/economy failures | Passed, automated evidence above. |
| Save validation/recovery, offline/fallback and clean build pipelines | Passed within documented browser/runner scope. |
| Reproduced gameplay bugs fixed with regressions | Covered by the linked trade, saved-turn, empty-portfolio, room-collision, snapshot and session reports. No new failure was found in the final full run; that does not prove absence of all bugs. |
| Manual end-to-end matches in all modes | Open. Automated normal-start matches passed; no claim of unassisted acceptance. |
| Physical Android opens/completes a match, startup/performance/touch/orientation | Open, unavailable device. iPhone sideload testing is useful additional evidence and does not satisfy Android acceptance. |
| Identity/participant/authority rules, trusted ranking/rewards and purchases | Isolated prototype tested; production rollout/entitlement/receipt/restoration validation open. |
| Collision/reconnect/handover races | Updated-client and emulator guards passed; production partitions, worker orchestration and device lifecycle still open. |
| Approved 40-space board/art/scenery/custom rules | Preserved; later UI/economy/collection changes were explicitly requested and separately tested. |

## Remaining sign-off — keep issue #2 open

1. **Hands-on acceptance:** on iOS 1.0.21 test fresh launch, 3D/2D, touch/landscape safe areas, save/force-close/relaunch/Continue, background/resume, cached/offline play, token/Portfolio upgrades and an ordinary finish. Record device/iOS/build, elapsed startup, failures and whether progress survives an update. Budget 20–30 minutes for a smoke pass, longer for full Classic/Quick matches. Test an Android device before claiming Android readiness; no estimate is possible until one is available. Unassisted browser full-match checks also remain.
2. **Production online trust:** choose/access an approved runtime; connect the public lobby/start and trusted roster/entitlements; finish full AI turns, timer/minigame support or explicit supported-mode gates, disconnect/rejoin/forfeit and worker authorization; validate real two-device recovery/partitions, privacy, retention, quota/latency, migration/rollback and production denial rules. The existing preview is opt-in and production authority is not active. This is a separate engineering/release milestone, not a small final toggle. Estimate only after hosting/access and supported online scope are settled.
3. **Rewards/payments/store:** trusted ranking and signed progression, platform receipt validation/restoration/idempotency, sandbox purchase tests and signed store/device release checks. Local promo/coins/XP and unsigned test builds do not satisfy these. No paid plan or production permissions may be enabled as part of this closeout.

Do not add further retention features to this stability milestone. Close #2 only when the remaining criteria have evidence or the owner explicitly approves a recorded scope change; preserve the release blockers either way.
