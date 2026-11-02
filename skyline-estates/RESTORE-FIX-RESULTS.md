# Local device restore regression

Rollback point: `d9c2dc4fa0808e3ccf0965282c1594ea558a1aae` (private TestFlight build 152). Work continues on `skyline-local-restore-fix`, based on the private reward branch; no live backend deployment or App Store submission changes.

## Confirmed defects and fixes

- Restore wrote only localStorage. The old in-memory PREF could be saved again by the existing iOS visibility handler, replacing the restored balance during reload. Restore now updates disk and the existing in-memory object together, preserving the selected backup and a separate copy of the previous profile.
- Restore promised to stop syncing but did not persist that decision. A restored save now has an explicit local-only mode and a foreign-owner marker. Startup, background sync, capture, and late network replies respect the pause. The account UI explains local mode and labels the selected backup Restored. Returning to cloud progress requires an explicit choice; local rewards are not imported.
- WebKit testing reproduced an uncaptured-change race: a fast profile response could reconcile away a local change before the next capture timer. Capture now runs before a response is reconciled, retaining unrecorded local changes and the existing idempotent outbox.
- Corrupt/empty backups and storage errors leave existing progress intact. Pending migration requests are discarded only when explicitly returning to account progress; account outboxes remain intact.

## Validation

- 13 focused restore/sync regressions pass, including reload/background save, corrupt backup, storage failure, late GET/POST replies, onboarding, paused promo journals, and fast-response capture races.
- 16 existing cloud-engine integration checks pass; 10 private local reward checks pass; 43 pipeline checks pass.
- Real game + real in-memory player service browser tests pass in Chromium and WebKit at 956x440, with an additional 390x844 device: first migration, earning/spending, two-device recovery, restoration of 1,001,245 coins and 500,400 XP, another restart, local play, unchanged cloud wallet, explicit cloud-only return, and retained backup. External services are blocked; no live player records are modified.
- The original restore handler fails the new restart regression: 1,245 coins replace the expected 1,001,245. This is a reproduced failure, not a cosmetic change.
- Native bundle parity preserves the game source and all 173 shared assets. No board, camera, pricing, reward amount or rule changes.

Physical iPhone restoration remains owner validation after the private TestFlight update. Build/upload/Apple processing results will be recorded separately when confirmed. Do not delete the installed app or its backups.

## Private iOS delivery checkpoint

Build **1.0 (153)**, runtime source `a4f8e971862f35ed8cf21d5ab010cd02a0c8bc56`, completed workflow [41410069695](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/41410069695). All steps passed, including 13 restore checks, 16 cloud checks, simulator build, ARM64 bundle verification, signing and archive. The signing log explicitly confirms **internal TestFlight only**; upload succeeded **2 November 2026 at 08:12:26 UTC**. Purchases remain off.

At this checkpoint, Apple's browser session has expired. Owner sign-in is needed to confirm processing and assign the build to Skyline iOS QA. Do not claim the build is installable until Apple/group confirmation. The public App Store submission, main branch, live web deployment and backend were not changed.

The accompanying test-only change waits for the real loading screen to disappear before capturing the restored account section. Both Chromium and WebKit runs passed and their screenshots were visually inspected. Runtime code is identical to the uploaded build; this follow-up changes only test capture timing and this report.
