# Skyline Showcase — Phase 2 (web only)

## Entry points

The existing completed-game results modal gains **View My Skyline**. It opens a nested, closable Showcase; the original results modal and its completion promise remain in place. Return to Results never calls `finish`, awards, Season progress, trophies or wallet processing again.

**Save Showcase** explicitly stores the selected completed result. **Portfolio → My Showcases** reopens the latest ten saved results. `HISTORY_LIMIT` / the central `LIMIT` constant defines the retention policy. Images are regenerated, not stored in localStorage. No collection, save, inventory or wallet keys are overwritten.

## Truthful records

The snapshot reads only a completed, nonsimulated match and an eligible human player. Online exposes only the local authenticated seat (`NET.me`), not other players. Pass-and-play allows selecting each local human's own result. The snapshot is immutable in effect: repeated capture returns copies of the first final record for that player and match.

Records include the selected player's name/token, city, finish time, final match net worth using the existing `netWorth` function, ownership, house/tower levels, mortgages, holding values, match position, mode and completed match milestones. Properties include streets, stations and utilities. Developed streets count streets with any house/tower; houses count current houses, and towers count current towers. A tower is not counted as five current houses. Highest-value holding uses the same property/building book value used in final net worth, including mortgage reductions. It is not a prediction of future rent.

City Champion requires first place. Equal top net worth is labelled Shared Skyline Lead and a tied position; the game's existing reward tie-break is unchanged. Forced online winners use the actual `forceWin` result. Other results use Rising Developer (owns property at finish) or Estate Builder (no property at finish). Milestones state their actual criteria: towers/full sets/properties currently owned or largest recorded rent. No invented “best achievement” fills an empty record.

The league is snapshotted only for the profile owner/local online player; a friend's league is not inferred from this device's profile. The most recent Strategic Event/Market Pulse is included only if recorded, with only the selected player's recorded decision. No opponent names, room codes, raw logs or private UIDs enter a snapshot. The record ID is a nonpublic local receipt reference, not an account identity or verified competitive submission.

## Images and privacy

Exports are PNGs: 1080×1350 portrait, 1080×1920 story, and 1920×1080 landscape. The approved home-screen skyline logo is reused exactly. Scenery uses the existing city photograph. Only the selected player's final owned properties/building levels are reconstructed at the existing 40-square board positions, using `rect` and the game's existing `mdRender`/building meshes. Other board slots show no ownership details. Stations/utilities use distinct symbols, not invented towers. Mortgages are marked.

The image is explicitly labelled **Owned portfolio reconstruction**. A filtered live WebGL screenshot would require changing other players' visibility and the active camera, and cannot be regenerated from compact history. This implementation deliberately uses the approved software projection instead. It does not call live GL readback, change the scene/camera or serialize screenshots of another player's portfolio. The existing software renderer restores its temporary `S3` context synchronously. If city artwork is unavailable, a labelled city plaque/gradient remains; if an individual mesh fails, its numeric recorded level is shown rather than a fake building.

The default image says Skyline Player and includes the actual token. A player can opt in to the actual display name. Names are escaped in HTML, drawn as canvas text, bounded and wrapped. Only the selected result is exported. Assisted practice and online modes are labelled. SC is final match SC; saved earned SC and Skyline Coins are never included in the image or changed by Showcase.

## Sharing and storage failure

Image generation finishes before Share Skyline is enabled. Its click handler calls `navigator.share` with an already-created `File` directly in the activation stack; no await/image generation/network request precedes that call. `navigator.canShare({files})` gates file sharing. Unsupported, rejected or cancelled sharing leaves Save Image and Open Image available. Open Image provides a separate blob preview for Safari's touch-hold Save Image workflow. Nothing posts automatically. The shared text links back to Skyline Estates and contains no account/room details.

The UI retains one current generated image and revokes superseded blob URLs. Closing frees its prepared File and defers current-URL revocation briefly so an already-opened save preview can load. The largest export canvas is 2,073,600 pixels and is reduced to 1×1 after PNG encoding. History is bounded to ten compact records and 128 KiB. Rendering uses small reusable approved mesh previews rather than retaining full-resolution image files.

Malformed/unsupported or oversized history is retained and not replaced. Storage failure preserves the previous history and still permits image export. Showcase does not claim cloud sync or tamper-proof scores. LocalStorage remains device-local; it is separate from the persistent SC ledger and game-save keys.

## Verification and release boundaries

`tests/showcase-browser.cjs` exercises winner/loss/timed/tied/pass-and-play/online snapshots, local-seat privacy, three actual PNG formats, real native-share invocation with a test double, unsupported/cancelled sharing, four landscape sizes, compact history/reload, corrupt history, real finish/results integration and repeated viewing without duplicate rewards. The existing complete-match, simulation, currency, online, save and worker suites remain required.

File-URL local Chromium checks are supplementary. WebKit file URLs can reject exporting city photographs due to opaque-origin canvas security; the release suite uses HTTP and must pass WebKit there. Browser API test doubles verify invocation/activation and fallback handling, not an actual physical iPhone share sheet. A new physical iPhone test is not claimed.

All new runtime assets are under `web/`, loaded by the generated web wrapper only. Native `game.html`, iOS/TestFlight/App Store source and native workflows remain unchanged. The web PR's changed paths do not trigger native build workflows. Merge uses `[skip actions]` to suppress unrelated native push builds; GitHub Pages publishes the web release.
