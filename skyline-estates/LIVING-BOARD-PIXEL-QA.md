# Living Board V1 — Pixel Foundation QA gate

Status (2026-11-15): **Phase 1 (PR #202) verified in simulated Chromium and merged to main for the web game**: adaptive touch resolution (2× start, 2.5× when sustained smooth, down to 1.5× under sustained load, with a session ceiling so a borderline device settles), the final-cascade compact HUD and the reduced Harbour Ring water band. Generated pages, offline manifest and the protected source hash were rebuilt and audited. **Not yet tested on a physical iPhone or Android phone**; no native build includes it.

## Draft PR #202 behavior
- The 40-space WebGL renderer starts at a 2× effective scale on high-DPR touch devices, can increase to 2.5× after sustained smooth frames, and steps down to 1.5× under sustained frame pressure; the actual DPR is always an upper bound. Desktop stays capped at 2×.
- The small-phone roster CSS is applied after the more specific `#ui #roster` override, keeping a minimum 44px player-card touch target and allowing ownership chips to scroll horizontally.
- The Harbour Ring 24-space board's synthetic water-band overlay is removed and its SVG water strip is made subtler. The photographic background remains unchanged.
- The source-based adaptive/HUD test has 20 assertions, including a borderline-device case (smooth at 2×, slow at 2.5×) that must settle with at most two changes. These are not equivalent to a physical-phone benchmark.

## Scope
- Source: `game.html`, the main 40-square custom WebGL renderer.
- PR #202 uses an adaptive effective pixel ratio, bounded by the physical device DPR. It ships in the web game; native apps get it only with a future, separately approved build.
- Older QA-only `skylineRenderScale` URL variants belong to historical pixel experiments and are not the active draft implementation.
- The adaptive policy should still be measured on physical phones; if a device class misbehaves, lower the starting level or the 2.5× ceiling rather than removing adaptation.

## Required verification, in order

1. Run `node skyline-estates/tests/living-board-render-scale.cjs` against this branch. Test 1.5×/2×/2.5×, device DPR caps, idle resets, frame gaps and small-phone CSS cascade.
2. Run `python3 skyline-estates/build.py` on a clean branch checkout, then `python3 skyline-estates/build.py --check`. Inspect all generated changes before committing; do not modify the game-source hash pin or unrelated native release files without the established release process.
3. Serve the generated branch **privately**; do not use the public Pages URL to judge the experiment. For the same viewport and game fixture, compare the actual adaptive framebuffer scale under smooth and sustained-load scenarios.
4. Capture the main 40-square Lagos board in Overview and Follow, including all four corners, small property labels, ownership strips, moving tokens, a fully developed district, Daylight and Night.
5. Record **canvas backing dimensions**, CSS dimensions, effective DPR, frame intervals (median/p95), device pixel ratio, WebGL version, GPU/renderer identification if available, and memory/thermal behavior when measurable. Do not infer GPU frame rate from software WebGL.
6. Compare 100% screenshot crops of top/far-side labels, district colors, diagonal edges, thin gold frame, token silhouettes and development plots. Check for antialiasing, shimmering, texture blur and readability.
7. Repeat on physical iPhone Safari and TestFlight separately if the native build is intentionally updated later. Desktop WebKit is not physical iPhone Safari.
8. Run full existing visual-correction, board, gameplay, save/offline and security checks before marking ready to merge.

## Acceptance
- No change to production behavior until actual evidence supports the adaptive policy.
- No altered 40-square geometry, tile names/prices, token paths, game rules, currency, saves or multiplayer.
- No persistent text/board clipping or touch target regressions.
- Prefer a measured adaptive policy to a universal 3× setting.
- Historical A/B results were recorded in PR #200; PR #202 is the separate adaptive-resolution candidate and requires performance evidence before merging.

## Release boundary
PR #200 was merged for compact landscape roster CSS only. Do not treat PR #202 as shipped or publish a new TestFlight/App Store/Android build based on it. Harbour Ring is a separate 24-space gameplay workstream; only its cosmetic water-band correction is in PR #202.

## Texture-resolution finding (source inspection, 2026-11-15)

The main 40-space board labels and artwork are rasterized once into a **2048 × 2048 canvas** in the protected `game.html` initialization (`const bc=cnv(2048,2048,drawBoard)`). The canvas is mapped onto the board plane as a WebGL texture. The renderer's device-pixel-ratio setting controls framebuffer resolution, **not the source detail available in this board texture**. Therefore raising DPR to 3× cannot reconstruct lettering already limited by the 2048-pixel texture. This is a confirmed code-level constraint, not proof that increasing the texture will improve legibility on physical devices.

**Next isolated experiment:** compare 2048 versus 4096 board-texture variants in disposable generated QA pages, holding camera, viewport and render scale constant. Record GPU maximum texture size, approximate RGBA source memory (16 MiB versus 64 MiB before mipmaps), label crops and browser errors. Avoid shipping 4096 as a universal default: older mobile GPUs and texture memory limits require validation. Preserve `game.html`, security hash, native builds and production pages unchanged.

## Property label legibility — source audit (2026-11-15)

The main board's `drawCell(ctx,i)` function draws property names with `fitText(...,w-10,15,800,FB,max=3)`, then places landmark descriptions at **10.5 canvas units**, alpha **0.7** (`small` helper). Prices use **13 units**. On the fixed 1100-unit board coordinates rasterized to 2048 px, the landmark line is approximately 19.5 source pixels tall before 3D perspective minification; this is not the same as final screen-pixel height. Longer names may be reduced by `fitText`. Labels rotate with each board side and are viewed obliquely in the 3D camera. These are direct source findings; the relative contribution of each factor to real-device readability remains unmeasured.

**Targeted design direction:** preserve property names and values, but A/B test stronger secondary-label opacity, improved text/background contrast, and reduced reliance on tiny landmark descriptions. Evaluate full-board and close-up screenshots at the same 2× framebuffer, 2048 texture, fixed camera. Any eventual production changes must pass game-source security auditing and browser parity; do not patch `game.html` until separately approved and validated.

## Enlarged label hierarchy test (2026-11-15)

CI run 43706508487 completed successfully on commit a5739e2b. This verifies that the disposable generated-page test can render the 2048×2048, 2× DPR label hierarchy variant without failing its existing browser checks. It does **not** establish that the labels are legible on physical iPhones, that no names overlap, or that the 10% enlargement is visually preferable. The variant uses 12-unit 700-weight secondary labels and 10% larger initial property-name font sizes, plus full-opacity secondary labels. Maintain the standard configuration as the reference until close-up comparisons are reviewed. Full stability workflow status must be checked independently.

## Visual review of label hierarchy (2026-11-15)

Reviewed full-board screenshot pair from successful run 43706508487: `living-board-lagos-2x-tex2048-high-standard.png` vs `living-board-lagos-2x-tex2048-high-large.png`. At the fixed 844×390 CSS viewport / DPR 3 simulated mobile, the larger labels offer a modest change, not a decisive normal-distance readability improvement. The 3D camera angle and limited tile footprint remain primary constraints. The left player roster/HUD occupies substantial space beside/over the board composition. This is a visual judgment on simulated Chromium screenshots, not physical-device verification. Do not ship the 10% font increase automatically. Next QA experiment should evaluate a contextual selected-property detail affordance and/or camera-aware safe-area layout, rather than increasing all labels again. Do not modify production game or protected hash without explicit review.

## Verified active building architecture and next visual gate (2026-11-15)

Corrected stage QA run **43710238119 passed** at commit `74553992`. The fixture confirms six owned-property stages use one composed scene node each, and plot height increases across stages. The test is simulated Chromium SwiftShader, not real iPhone Safari.

**Source of truth:** the final `updateCell=function(i,anim)` override in `game.html` uses `FAM=[famGarden,famHome,famTown,famApts,famBoutique,famSkyline]`. Earlier `updateCell` definitions using stacked `floorGeo` blocks are superseded and must not be treated as active rendering. The final renderer uses `famBase` for dark slate/brass ownership plinths, with limestone, terracotta, teal glass, planting and roof decoration. Each stage already has distinct architectural details: garden planting, courtyard home, townhouse, three-level apartments, boutique midrise, and a glass/stone skyline tower. The board tile itself retains a small marker so street labels remain legible.

**Visual QA priorities, without replacing the existing architecture:**

1. Compare the six current stage silhouettes at equal camera and apparent scale; assess whether home/townhouse/apartments/boutique read as distinct on a real landscape phone.
2. Preserve the existing `FAM` shapes, ownership plate, roof selection and low street markers. Prioritize contrast, lighting, framing and silhouette clarity over introducing unrelated building types.
3. Measure scene-node and render cost before proposing additional façade or foliage geometry. Prefer material/lighting refinements and modest roofline improvements.
4. Confirm that mortgaged-property appearance, owner colors, token occlusion, street names, camera rotation and save/load behavior remain intact.
5. Only after passing visual review and full stability checks should a separate production change be proposed; do not merge this QA branch or modify the protected source hash as a shortcut.

The baseline compact landscape roster CSS **was merged in PR #200**. The further 9px chip/short-height corrections and adaptive resolution are **draft PR #202**, not shipped. The Harbour Ring artificial water-band reduction is likewise draft-only. Source-hash synchronization, generated pages/offline manifest, browser stability and physical-phone visual acceptance remain required before merge.

## Phase 1 verification (2026-11-15, before merging PR #202)

- `tests/phase1-verify.sh`: pass (20 adaptive/HUD assertions, 9 water assertions, build check, Harbour Ring rules and 24 browser checks).
- Adaptive controller simulation: steady 60 Hz and 120 Hz rise to 2.5× after about 7–10 s; sustained 25–30 fps (including iOS Low Power Mode's 30 fps cap) drops to 1.5× after about 8 s; a single long pause changes nothing. **Fixed during review:** a device smooth at 2× but slow at 2.5× used to flip between them every ~8 s (27 changes in 3 minutes). A level that proves too slow is now the session ceiling (2 changes, then stable).
- Canvas backing on a simulated iPhone 15 Pro (852×393 @3×): 1704×786 at the 2× start (was 1278×590).
- Four-player roster fits with no clipped content at 667×375, 780×360, 844×390, 852×393, 915×412 and 932×430; ownership chips 9 px (were 6 px); cards at least 44 px tall. Squares covered by HUD in the overview: 0 at every size except 667×375 (3, was 8).
- Harbour Ring daylight water band is now faint; Phase 2 continues the waterfront work.
- Not done: physical iPhone Safari/TestFlight and Android device tests, real GPU frame timing.
