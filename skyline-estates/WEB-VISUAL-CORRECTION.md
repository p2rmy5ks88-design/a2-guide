# Visual regression correction — web only

> Superseded camera behaviour: see `WEB-FOLLOW-CAMERA.md` for the current Follow/Overview camera, HUD and v3 assets.

Branch: `skyline-web-visual-correction`. Rollback: `bce4a0b125fdee3638186755ebda67ba2c0c4f8f` (the regressed PR #85 release). The pre-refinement implementation at `a5a3964d3350247c4d8f0c6905c866e64adb18f2` was also reviewed. No game-rule, save-format, price, reward or native-release change is included.

## Causes and corrections

| Regression | Cause in #85 | Correction |
|---|---|---|
| Distant default board | A fixed minimum camera distance of 18, without fitting the actual frame to the HUD/viewport | Project the real frame corners, fit around visible HUD obstacles and safe insets, target 15% more apparent width, and preserve all corners. Cache the result until viewport/HUD geometry changes. |
| Excessive retained close-up | Legacy Locate/inspection paths still used distances 5.4/3.6 and retained `userCam` during subsequent movement | Locate stays contextual; automatic movement uses the fitted default distance and stable yaw. Explicit double-tap inspection is bounded to 1.65× (hard limit 1.8×), and movement exits inspection. |
| Crowded buildings | Tile-edge placement left too little separation from labels/token paths | Reuse the original models at consistent smaller scale on separate inward plots. Back-row plots sit farther inward to keep raised roofs off the upside-down labels. Existing colors and selective diagonals remain. |
| Shop image/name overlap | The 64 px image container combined with padding and inherited image transforms allowed art to extend outside its row | Explicit image/name/rarity/footer grid rows, contained art, no inherited enlargement transform, wrapping names at 14 px and minimum 44 px actions. Every category is checked. The existing footer combines the real price/status with its action. |
| Cut-off Season rewards | Header plus fixed reward-row heights exceeded the initial viewport; the old test only checked later scroll access | Compact title/XP header; total XP moves into the progress block. Both reward rows fit above navigation, including a short 320 px landscape viewport with bottom safe inset. Short screens use image/text columns inside reward cards, retaining 44 px claim targets. |

The previous checks missed actual child-image overflow and initial reward-row visibility. The correction adds rendered-element geometry checks in Chromium and WebKit, rather than relying on container sizes or passing business-logic counts.

The existing FM controls, round statistics and action button share one footer row on short screens. Tiny ownership-summary chips are omitted from the compact roster; names, levels, AI status and money remain, and full ownership is available in Portfolio. This reserves board space without removing playback or gameplay actions.

## Preview and verification

Generated preview: `index.html`, `web-play.html` and `web-correction.html` all contain the same candidate. Before screenshots serve the exact #85 presentation files; after screenshots serve the correction, using the same game fixture, viewport and simulated insets.

Viewports: 844×390, 956×440, 844×320 and the 1280×589 design-reference size. Mobile cases simulate 59 px left/right and 21 px bottom safe insets. WebKit uses real WebGL and is the Safari engine, but this is **desktop WebKit, not a physical iPhone**.

The new visual suite checks the actual rendered frame perimeter against visible HUD controls, inward plot spacing, clearance for six token paths across all sides/corners, human/AI movement after inspection, all five Shop categories, last-item scrolling, both Season rows, last-tier access and touch-claim idempotency. Existing 106 presentation/rule/save tests, offline tests and full release CI remain required.

Screenshots/JSON: `before-webkit-safe-*`, `after-webkit-safe-*`, `after-chromium-safe-*`. CI retains the after screenshots in the `skyline-visual-*` artifacts. Final CI, merge and publication outcomes are recorded in the linked correction PR; this file is the pre-merge preview checkpoint.

## Caching and release boundary

Versioned `web/presentation-v2.js` and `.css`, plus the fresh `web-correction.html` entry, let a phone reach the corrected files without deleting saves or forcing an active match to reload. V1 assets are retained solely for already cached V1 shells. The updated worker caches the new entry and assets for offline use.

Native packaging continues to read unchanged `game.html` and its existing asset allow-list. No IPA, signing, TestFlight, App Store, backend or purchase activation is authorized by this correction. Commits/merge must include `[skip actions]` to suppress the repository's automatic native workflows; run the web stability/security workflows explicitly before merging.

Physical iPhone Safari acceptance remains: inspect the four corners and moving tokens, check every Shop category and its scrolling, both Season rows and claims, then save/refresh/Continue while showing/hiding Safari's toolbars. Desktop engine tests cannot establish physical touch feel or iPhone GPU performance.
