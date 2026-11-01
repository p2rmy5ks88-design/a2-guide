# Skyline Estates integrated redesign — release verification

Date: 1 November 2026 (Europe/Stockholm).

## Source and deployment

- Combined candidate: PR #80, `skyline-gameplay-ux`, head `7e9fdcba8a3bd4e1ded02a64301cfa1e6d33c13d`.
- Merged to main as `78f5bea5d8bf8842e0fdb2b66074b773027d3473` after the candidate's six workflows passed.
- Superseded PRs #75, #76, #78 and #79 closed without separate merge; #77 was already closed. The final Home/Vault/Portfolio implementation files were compared with #79 and retained exactly; #80 adds gameplay UX and permanent test/workflow refinements.
- GitHub Pages deployment: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/41260004908 — success.
- Live game: https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/
- Live smoke: ten checks passed, no browser exceptions. Verified four mode cards, six dock destinations, city-selection screen, and actual WebGL solo game launch with 40 spaces.
- Deployed `index.html`, `game.html`, `home-redesign.js`, `reference-redesign.js`, and `offline-assets.js` match the tested candidate by normalized SHA-256. Machine-readable evidence: `release80-live-smoke.json`.

## Implementations retained

Premium Lagos waterfront home and mode cards; bottom navigation; Skyline Gala/Golden Rooftop Garden art; Collection Vault with Tokens, Buildings, Board Worlds and Prestige; profile avatar access; real district/property ownership album; persistent rarity Upgrade Center; saved-match building shortcut; legal direct House/Tower actions; read-only trade ownership projections and set warnings; opaque Daylight notifications.

No reset, migration, account deletion, rule/economy change, Firebase/IAM deployment or purchase activation was performed during this verification. Existing bundle ID remains `com.kenstylez.skylineestates`.

## Automated evidence

The six latest candidate workflows all passed: Android, iOS, desktop, emulator security, authoritative multiplayer management, and the five-job stability matrix. Runs: 41258866890, 41258866911, 41258866917, 41258866979, 41258866894, 41258866925.

Representative executed suites:

| Coverage | Result |
|---|---|
| Home redesign | 34 checks, CI |
| Collection Vault / ownership / avatar access | 17 checks, CI |
| Integrated Portfolio | 19 checks, CI and independent local rerun |
| Upgrade Center / atomic purchase/cancel | 22 checks, CI and local rerun |
| Quick House/Tower, trade hints, Daylight | 17 checks, CI and local rerun |
| Reference dashboard | 25 checks, no browser errors |
| Debt Portfolio | 22 checks |
| Offline worker / startup | 15 / 19 checks |
| Complete actual matches / human flows | 19 / 35 checks |
| Property kernel/browser parity | 41 checks |
| Authoritative management | 14 checks, 17 oracle comparisons, no browser errors |
| Trade / counteroffer browser scenarios | 199 checks, 97 scenarios |
| AI parity | 1,022 checks, 401 scenarios |
| Cards / jail | 377 / 157 checks |
| Turn / end | 83 / 104 checks |
| Reroll / debt / auction | 754 / 95 / 568 checks |
| Accounts / no-purchases | 11 / 10 checks |
| Pipeline guardrails | 43 checks, independent local rerun |
| Emulator security | Passed, including admission and wallet transaction boundaries |
| Android | Test APK built; Play publication skipped |
| iOS | Unsigned simulator and ARM64 device built; candidate PR did not upload |
| Desktop | AppImage built; publication skipped |

Local independent browser simulation used the existing `window.__sim` through `tests/stability.cjs`: 56 regression checks and 175 runs, seed 20261026. No browser exceptions, simulation errors, cash invariant failures, house bank failures or tower bank failures.

| Mode | Runs | Rounds | Outcomes |
|---|---:|---|---|
| Classic | 100 | 26–221 | 100 last-player |
| Quick | 25 | 12–106 | 25 quick |
| Timed | 25 | 21 | 25 timed |
| Optional rules | 25 | 19–301 | 24 last-player, 1 configured round-limit |

Per-run rounds, cash, winners/survivors, outcomes and invariant flags are in `release80-simulation.json`. The round-limit result is an expected simulator stop, not an exception or a claimed completed bankruptcy match.

## Visual review and environment findings

Reviewed CI screenshots for home, Vault, Portfolio and mobile layouts, plus live WebGL home/board captures. Initial quick-build/Daylight CI screenshots landed during fade-in; independent settled recaptures show the real opaque panel and readable notifications. No product styling was changed to compensate for screenshot timing.

An initial local offline-manifest warning was traced to Windows CRLF conversion of SVG assets. Checking the exact Git bytes passed without changing the manifest or weakening its assertion. A local test dependency lookup was corrected with NODE_PATH for the preinstalled Playwright; its subsequent 22-check run passed. Prior workflow timeouts/cancellations are superseded by passing full candidate runs; no tests were disabled during this work.

## Apple submission protection

Read directly from signed-in App Store Connect: version **1.0**, build **85**, **Waiting for Review**. The page explicitly says a new submitted build requires removing the version from review. No version/build selection, metadata, screenshots, review reply, withdrawal or replacement submission was changed.

Recommendation: retain build 85's review. Validate the redesign through TestFlight, then decide whether to submit it as the next update after approval. Replacing now would interrupt the existing review and requires explicit owner approval.

## iOS / TestFlight follow-up

Signed manual workflow: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/41260160323 (build 149, version 1.0, exact merged source, `cloud_channel=ios-release`, `publish=true`). This channel retains accounts/cloud save and keeps purchases off. Unlike `private-testing`, it does not activate payment testing against the paused backend.

The signed workflow completed successfully. Simulator and device compiles, archive, signature verification and export/upload passed. Logs confirm final Apple signature, exact App ID/team, Apple entitlement, allowed certificate, unexpired provisioning profile and Firebase options. Xcode reported `Uploaded App` and `EXPORT SUCCEEDED` at 01:22 UTC. Toolchain: Xcode 26.6 / iOS 26 SDK requirement passed. Packaged bundle: 171 verified files, 79,172,179 bytes, five bundled fonts, approved source preserved, `ios-release` channel. Both landscape orientations remain configured on iPhone and iPad.

App Store Connect independently confirmed upload and completed processing. **Version 1.0 (149)** is assigned to the existing **Skyline iOS QA** internal group. The build detail page confirms `Group (1): Skyline iOS QA — Internal`; proof is saved as `release80-testflight149.png`. No external group, public testing link, new tester invitation or App Store build replacement was created.

Physical installation, device performance, native sign-in, saved-game continuation, menu interaction, building/trading and Daylight acceptance remain pending on the owner's iPhone. Automated browser/compile results do not establish those device outcomes.

