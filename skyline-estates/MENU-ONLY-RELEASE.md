# Menu-only release candidate

Owner decision: accept the recent Shop and seasonal-reward improvements, exclude the recent in-game board/camera/building redesign. Base: main `618b74f6cf7bf3d99575c09ec13c66d10a62bd51` (PR #88). Candidate branch: `skyline-menu-only-release`.

## Scope

- Keep the already integrated cinematic Home, Collection/Vault, Profile, Portfolio/Upgrade Center, direct building management, trading and Daylight improvements present in the build-149 source. Their source files are unchanged.
- Carry forward only the recent compact Shop cards/categories and Season header/reward-track fixes from the web presentation layer.
- Restore the original in-game camera, model placement, board materials/background, HUD, button positioning and dice behavior by no longer loading the v1–v4 browser board modules. Do not cherry-pick entire PRs #85–#88 into a native build.
- Preserve `game.html` byte-for-byte. Prices, reward calculations, claims, ownership, saved-data format, multiplayer and purchase/account settings are unchanged.

## Implementation

`lib/menu-presentation.css` and `.js` are shared local assets. They activate only for Shop or Season and relinquish styling on return to other sections. The only wrapped game function is `homeTab`, to decorate those existing menus; no renderer, camera, building, trade or reward function is replaced.

The browser generator loads this menu-only layer instead of `web/presentation-v4.*`. Existing browser aliases are regenerated consistently, and the new `web-menus.html` alias provides a fresh browser entry without clearing saves. Old board assets remain as historical/cache compatibility files but are not loaded by this candidate.

The native web-assets packer adds only the two local menu assets to its HTML. It already copies `lib/`; no new network dependency, bundle ID, entitlement, signing setting, build number or cloud-channel setting is introduced. `off`, `private-testing` and `ios-release` retain their existing meanings.

## Verification and release boundary

- Browser tests compare original engine/rule function sources, all property-node transforms and gameplay HUD styles against a baseline page with the menu layer absent. This replaces expectations for the board/camera features the owner has rejected.
- Shop tests exercise all five categories, image/name/action separation, initial action visibility and last-item scrolling. Season tests cover both tracks, last-tier access, touch claims and duplicate protection. Saved-match continuity is checked across menu use.
- Tests use Chromium and desktop WebKit at 844×390, 956×440, 844×320 and 1280×589, with simulated phone safe areas. These are not physical iPhone tests.
- The native web-assets package and its byte-for-byte bundle verification were run for all three cloud channels, plus existing pipeline and offline-worker checks. This is not an Xcode build or a TestFlight upload.

Candidate tests and screenshots are recorded in the PR and local `outputs/menu-only` evidence. Full remote release checks, merge, Pages publication, native compilation and TestFlight device acceptance remain separate stages.

The previous web-only instruction prohibits an automatic new native build/upload. Keep this PR draft with `[skip actions]` commits so merely preparing the native packer does not trigger Apple workflows. Do not change the existing App Store submission. A new TestFlight build should be made deliberately after the owner confirms this menu-only scope and the required remote checks pass.
