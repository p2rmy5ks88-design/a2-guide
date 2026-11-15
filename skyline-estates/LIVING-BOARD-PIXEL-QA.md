# Living Board V1 — Pixel Foundation QA gate

Status: **experimental; not approved for merge or release**.

## Scope
- Source: `game.html`, the main 40-square custom WebGL renderer.
- The optional `skylineRenderScale` URL parameter changes only the renderer's effective pixel ratio.
- Without the parameter, touch devices retain the 1.5× cap and other devices retain the 2× cap.
- The value is bounded to 1–3 and further capped by the device's actual pixel ratio.
- This is **not** a resolution upgrade in production. The generated `index.html` and other entry pages have not yet been regenerated on this branch.

## Required verification, in order

1. Run `node skyline-estates/tests/living-board-render-scale.cjs` against this branch. Test default behavior, 1.5×/2×/2.5×/3×, malformed inputs and devices with DPR below the requested cap.
2. Run `python3 skyline-estates/build.py` on a clean branch checkout, then `python3 skyline-estates/build.py --check`. Inspect all generated changes before committing; do not modify the game-source hash pin or unrelated native release files without the established release process.
3. Serve the generated branch **privately**; do not use the public Pages URL to judge the experiment. For the same viewport and game fixture, compare `?skylineRenderScale=1.5`, `=2`, `=2.5`, and `=3`.
4. Capture the main 40-square Lagos board in Overview and Follow, including all four corners, small property labels, ownership strips, moving tokens, a fully developed district, Daylight and Night.
5. Record **canvas backing dimensions**, CSS dimensions, effective DPR, frame intervals (median/p95), device pixel ratio, WebGL version, GPU/renderer identification if available, and memory/thermal behavior when measurable. Do not infer GPU frame rate from software WebGL.
6. Compare 100% screenshot crops of top/far-side labels, district colors, diagonal edges, thin gold frame, token silhouettes and development plots. Check for antialiasing, shimmering, texture blur and readability.
7. Repeat on physical iPhone Safari and TestFlight separately if the native build is intentionally updated later. Desktop WebKit is not physical iPhone Safari.
8. Run full existing visual-correction, board, gameplay, save/offline and security checks before marking ready to merge.

## Acceptance
- No change to default production behavior until actual evidence supports a selected scale.
- No altered 40-square geometry, tile names/prices, token paths, game rules, currency, saves or multiplayer.
- No persistent text/board clipping or touch target regressions.
- Prefer a measured adaptive policy to a universal 3× setting.
- Record side-by-side images and performance data in PR #200. If evidence is incomplete, keep the PR draft.

## Release boundary
Do not merge this draft or publish a new TestFlight/App Store/Android build based on the experiment. The Harbour Ring 24-space board is a separate later workstream.
