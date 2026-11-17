# Skyline Circuit — 3D renderer (draft for visual review and device QA)

Status: **draft.** It stays in draft until the visual review and real-device QA are complete. Branch `feat/circuit-renderer-3d` is stacked on `feat/circuit-alpha` (PR #214 → #213 + #212). Nothing is merged or deployed. The rules, saves and Career eligibility are unchanged, as are the V1 coordinates, cameras and HUD rectangles.

## What it is

- **`lib/circuit-renderer-3d.js`:** a three.js r160 ES module, the repo's own copy, with no new dependencies. It is used by `circuit-alpha.html` by default.
- **2D fallback:** used automatically if WebGL is unavailable. `?renderer=2d` forces it.
- **Read-only:** it reads `SC.view(s)` and the animated token positions, never changes match state, and never uses the match RNG. Decorative randomness has its own fixed seed.
- **Camera:** the projection matrix is built from `SS.camera()`, so the 3D view is the validated projection. Measured error is 0.0000 pt on all 15 screens.

## Approved V2 decisions (17 Nov 2026) as implemented

Recorded in `design/v2/decisions-2026-11-17.json`.

| Decision | Implementation |
| --- | --- |
| Cross route | Mint #70F0C2, dashed, navy casing underneath |
| Stay route | Gold #F2C457, solid, navy casing |
| Gold use | Only the Stay route and Skyscraper crowns. Junction outlines, road markings, bridge lights and the platform rim are ivory. |
| Labels | 12 pt ID and price on undeveloped plots; ID on junctions and events; none on developed tiles (details on tap); hidden while tokens stand on the node; shown only at the 0° decision camera |
| Camera | 0° for all decisions. Up to 15° (distance 6 → 5) eases in during movement and celebration, and selection is disabled while tilted. Reduced motion and instant speed keep 0°. |
| District symbols | Wave, sun, leaf and spark on undeveloped plots, and on the building base (corner badge) once developed |
| Players | Coral circle, blue square, ivory triangle, magenta hexagon. Tokens are 3D shapes with a navy outline. Owner identity uses the tile rim, a band at the building base and a seat-shape badge on the tile. |
| SE HUD | Names wrap instead of truncating. Text ≥ 12 pt, targets ≥ 44 pt. |

**Mint colour check** (ΔE CIE76; protanopia / deuteranopia / tritanopia):

| Pair | Normal | Protanopia | Deuteranopia | Tritanopia |
| --- | --- | --- | --- | --- |
| Mint vs Harbour | 42.8 | 37.5 | 34.8 | 17.9 |
| Mint vs Civic | 68.5 | 37.7 | 44.5 | 80.7 |
| Mint vs Verdant | 16.4 | 13.8 | 12.9 | 18.6 |
| Mint vs Neon | 91.2 | 62.5 | 48.7 | 54.8 |
| Mint vs Stay gold | 70.2 | 44.8 | 51.3 | 76.5 |

- **Weakest pair:** mint vs Verdant (12.9 for deuteranopia). The dash pattern and the navy casing separate them.
- **Contrast against the navy casing:** mint 12.7:1, gold 10.9:1.

## Visual content

- **Environment:** a navy stone island with a radial street pattern, dark water (animated on High), smoothed ring boulevards with ivory edge markings, and a central civic garden with a pool and paths. Instanced trees: 90 on Medium, 160 on High, none on Low.
- **Bridges:** four illuminated bridges, one hop each, with no stopping tile.
- **Lighting:** warm golden-hour sun from the west, a cool sky fill, and a golden-hour sky environment map for glass reflections (Medium and High). Soft shadows: 1024 on Medium, 2048 on High, none on Low.
- **Five stages, all inside the validated envelope.** Width is checked against the footprint `buildingSide` and height against `stageHeight` for all 20 properties on all 15 screens.

| Stage | Look |
| --- | --- |
| Plot | slate plinth with district inlay and symbol |
| Low-rise | cream masonry with navy windows, cream roof |
| Mid-rise | stone podium with planted terrace, stepped glass upper, slate-blue roof |
| High-rise | three tiers with planted terraces, pale glass crown |
| Skyscraper | broad glass tower, dark glass roof inside a gold crown frame, no spire |

- **Draw-call economy:** static parts are merged by material once, and dynamic parts on each ownership or stage change. Per-building meshes stay as hidden proxies, used only for the visibility and envelope checks.

## Results (Chromium and WebKit, software WebGL)

The `circuit-3d-browser.cjs` checks, run on every V1 screen (15 viewports):

| Check | Result |
| --- | --- |
| 3D projection = validated projection | 0.0000 pt error, all 32 nodes |
| Buildings inside envelopes (20 Skyscrapers) | pass |
| Visibility in the **actual 3D render** (ID pass, every property a Skyscraper, four tokens on O0) | all 32 nodes ≥ 3/5 samples; all four tokens visible |
| Both routes on screen in approved colours (pixel samples along each route) | Stay ≥ 0.94, Cross ≥ 0.78 of samples, all screens |
| Labels follow the approved rules; 12 pt; none under the HUD | pass |
| HUD: rectangles = V1 package (±1 pt), text ≥ 12 pt, buttons ≥ 44 pt | pass |
| Cinematic camera ≤ 15°, no selection while tilted, back to 0°; reduced motion stays at 0° | pass |
| **Tier budgets, worst case** (all Skyscrapers + routes + networks, Pro Max @3x) | Low **96 calls / 25.6k triangles** (≤ 120 / 60k); Medium **98 / 35.0k** (≤ 250 / 150k); High **98 / 42.3k** (≤ 450 / 350k) |

Existing suites, now running with the 3D renderer by default:

- `circuit-alpha-browser` passes 6/6, including full matches through the UI.
- The determinism hash is identical across animation speeds.
- `circuit-design-browser` passes 30/30.
- Node tests pass: `circuit-rules` 24, `circuit-screen` 7, `circuit-career` 9, `circuit-design` 30/30 for V1 and V2.

## Failures and known gaps (reported separately)

**Test failures: none outstanding.** Issues found and fixed during this work:

1. The board was measured before layout settled, which stretched the 3D image. Fixed with a fixed grid row plus a ResizeObserver; the projection test guards against a return.
2. Open ribbons produced NaN normals. Fixed.
3. Route casing was drawn over the route colour. Fixed with explicit draw order.
4. 652 draw calls in the worst case (over the High budget). Fixed by merging by material, giving 98.
5. Skyscraper roofs rendered as solid glowing gold. Fixed with a crown frame around a glass roof.
6. The SE left column truncated names. Fixed by wrapping.

**Known gaps:**

- **Visual polish:** facades read weakly at the 0° decision camera, which shows mostly roofs, so stage identity relies on roof treatment. A movement-only 15° view shows the facades. ChatGPT's visual review should judge the roofs.
- **Glow:** there's no bloom (no post-processing addon in the repo). Crowns and bridge lights use emissive materials instead.
- **Zoom/pan fallback:** validated geometrically (CIRCUIT-ALPHA.md) but **not yet implemented** in this renderer. The 320 pt screens currently show the overview.
- **Not wired into the native app bundle.**

## Real-device measurements

**None yet.** All numbers above come from headless browsers using **software WebGL** (SwiftShader in Chromium, the WebKit test build). Their frame times are not representative of iPhones, so this document claims no device performance.

On-device QA follows the plan in CIRCUIT-ALPHA.md §8:

- devices: SE 2nd gen, iPhone 12/13, a Pro / Pro Max, a mid-range Android;
- run with `?perf=1`;
- the tier is shown in the setting, and a downgrade is announced in the feed.

The Low/Medium/High budgets in CIRCUIT-V2-REVIEW.md §4 are the acceptance targets. The renderer downgrades one tier automatically after sustained frames over 20 ms at the 95th percentile.

## Reproduce

- `node skyline-estates/tests/circuit-3d-browser.cjs` (add `VISUAL_ENGINE=webkit` for WebKit)
- Add `CIRCUIT_SHOTS=dir` for screenshots and `CIRCUIT_3D_REPORT=path` for a JSON report.
- Open `skyline-estates/circuit-alpha.html?quality=low|medium|high&perf=1`.
