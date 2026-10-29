# Skyline release content — 29 October 2026

Implemented on skyline-public-release-commerce / PR #51. This content update does not enable accounts, purchases or public store release.

## Changes

- Shop pack drafts: 500 → 600 (+20%), 1,200 → 1,500 (+25%), 3,000 → 4,000 (+33%), 7,000 → 10,000 (+43%). Gameplay rewards and rarity coin/win gates are unchanged. Store prices are still draft placeholders; live prices must come from the native store.
- New product IDs coins_600, coins_1500, coins_4000, coins_10000. The server retains all four old IDs and values for historical verification/refunds. New products still need store configuration and real sandbox verification.
- Rotating daily event: Property Day (5 purchases, 200 coins), Rent Rally (300 rent, 250 coins), Builders’ Day (3 houses, 300 coins). Progress counts within a completed eligible game, using the best result rather than summing games. One reward per UTC day, saved with the match reward and receipt. Simulations cannot earn it. These are device progression rewards, not trusted online wallet credits.
- Daily event appears alongside existing missions and wheel, with UTC reset information. Existing missions, wheel odds and streaks remain intact.
- Leaderboard refresh is now read-only: opening rankings no longer submits a device score and risks overwriting an existing score. Added current season and refresh time, malformed-score filtering, deterministic ties, duplicate-refresh protection and protection against late responses after navigation/season change. Existing scores were not deleted or reset. Rankings remain device-reported until trusted online outcomes are integrated.
- Added original Bad, Priority and Skyline Estates MP3s, credited consistently with the existing Kenstylez playlist. Skyline FM now has 16 tracks; existing shuffle/crossfade behavior is reused. Original file hashes match. Native packaging already copies the shared audio directory.
- Fixed PR #51’s stale offline manifest and made CJS text hashing consistent across Windows/Linux.

## Tested

- 9 new regression tests: UTC rotation, single reward/reload/backwards clock, progress, atomic storage, simulation exclusion, leaderboard filtering and product/playlist consistency.
- Real Chrome: phone 390px and desktop 1280px daily/shop layout; read-only ranking refresh and timestamp; all three MP3 files decode (182s, 178s, 173s).
- 100 browser simulations, seed 20261029: rounds 18–301; 0 errors; 0 cash invariant failures; 0 house bank failures; 0 hotel bank failures. Full per-run rounds, survivors, winner/leader, outcome and cash are retained in Skyline-release-content-browser.json. Outcomes: {'last-player': 99, 'round-limit': 1}.
- 41 browser property parity checks passed, with 0 browser exceptions; the corresponding 61 kernel scenarios passed. Audited hash updated after reviewing these presentation/progression changes, with no property rule changes.
- Existing token mastery/economy 22/22, wallet 14/14, delivery/refunds 18/18, store-adapter fixtures 9/9 passed locally.
- Generated standalone page/offline assets pass build.py --check. Remote CI must be checked separately on the final commit.

## Public release status

Native Apple authorization was physically accepted in private TestFlight 1.0.39. Online Firebase player accounts, native billing and deployed wallet are still not active. Account deletion/revocation, safe legacy progress handling, purchase/refund/reinstall acceptance, trusted leaderboard outcomes, release metadata/privacy/screenshots and final signed release builds remain required. The new coordinator is not yet connected to native billing.

App Store Connect read-only check today: Paid Apps Agreement, banking and tax form show Active. Digital Services Act trader verification shows In Review. The public version remains Prepare for Submission with no selected release build and incomplete listing/review details. No legal agreements, banking details or privacy settings were changed.

Remaining implementation estimate: approximately 3–6 hours, plus store setup/verification and review. This is not a guaranteed launch date. No public submission was made by this content update.


## SDK 27 compatibility result

The isolated compatibility workflow passed on Xcode 27.1 (build 27A9275), with iPhoneOS SDK 27.1. Both unsigned simulator and ARM64 device builds succeeded; the actual device binary reports platform IOS and SDK 27.1. Run: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40900515331 . No signing credentials, store upload or real purchase were used in this test. Physical authentication/payment acceptance remains separate.

Apple’s current upload minimum is SDK 26+. From April 2027, SDK 27+ and minimum iOS 15 are required: https://developer.apple.com/app-store/submitting/ . The compatibility build targets iOS 15; the existing release pipeline remains unchanged pending the signed release candidate.

Google Play account inspection: owner identity, real Android-device access and contact-phone verification remain required; app creation is disabled until completed. Owner handoff is required for these personal checks.

The privacy page was corrected to describe the current paused purchases and diagnostic Apple check, instead of claiming active device-only purchases. It must be updated again to match the final deployed account/wallet service before activation.


Additional track: Dum Da Dum Answer Am added to the same shuffled/crossfaded playlist (17 tracks total). Chrome decoded the original MP3 at 225.6 seconds; 9 content regressions and 41 browser property parity checks passed after this playlist-only source change. File copied without transcoding; generated page/cache refreshed. Native wrapper copies this shared audio folder automatically.
