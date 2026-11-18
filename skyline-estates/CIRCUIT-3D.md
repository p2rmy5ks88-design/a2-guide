# Skyline Circuit — 3D renderer (draft for visual review and device QA)

Status: **draft.** It stays in draft until the visual review and real-device QA are complete. Approved for device QA and a visual-polish pass, not for production (owner, 17 Nov 2026). Branch `feat/circuit-renderer-3d` is stacked on `feat/circuit-alpha` (PR #214 → #213 + #212). Nothing is merged or deployed. The rules, saves and Career eligibility are unchanged, as are the V1 coordinates, cameras and HUD rectangles.

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

- **(Superseded by the polish pass below.)** Facades read weakly at the 0° decision camera, which shows mostly roofs, so stage identity relies on roof treatment. A movement-only 15° view shows the facades. ChatGPT's visual review should judge the roofs.
- **Glow:** there's no bloom (no post-processing addon in the repo). Crowns and bridge lights use emissive materials instead.
- **Zoom/pan fallback:** implemented in M1 (see below).
- **Not wired into the native app bundle.**

## Real-device measurements

**None yet.** All numbers above come from headless browsers using **software WebGL** (SwiftShader in Chromium, the WebKit test build). Their frame times are not representative of iPhones, so this document claims no device performance.

On-device QA follows the plan in CIRCUIT-ALPHA.md §8:

- devices: SE 2nd gen, iPhone 12/13, a Pro / Pro Max, a mid-range Android;
- run with `?perf=1`;
- the tier is shown in the setting, and a downgrade is announced in the feed.

The Low/Medium/High budgets in CIRCUIT-V2-REVIEW.md §4 are the acceptance targets. The renderer downgrades one tier automatically after sustained frames over 20 ms at the 95th percentile.

## Polish pass (17 Nov 2026): milestones

Each milestone was committed and tested separately in Chromium and WebKit. Rules, coordinates, camera limits, HUD rectangles, saves, Career eligibility and the renderer interface are unchanged.

| Milestone | Commit | What changed | Measured |
| --- | --- | --- | --- |
| M1 · 320 pt zoom/pan fallback | 63f0d45 | Zoom folded into the projection matrix (exactly `SS.zoomed`). The overview is view-only; taps open the zoom; drag to pan with overscroll; only full 44 pt circles select; double-tap or the HUD button returns. At your route decision the view focuses on your token, the first junction and both exits. | `circuit-zoom-3d`: se1 ×1.25 → 46.6 pt; Safari ×1.1 → 47.0 pt. Drawn = measured. Full coverage. Zoomed visibility passes. Full screens unaffected. |
| M2 · Five distinct stages | 706a95e | **Low-rise:** hipped slate roof and chimney. **Mid-rise:** podium with roof garden and an L-shaped glass block. **High-rise:** cross-shaped tower on a terraced podium. **Skyscraper:** an octagonal landmark with three stepped drums, bronze fins, a gold crown ring and a pavilion. | All stages 1–4 inside the envelopes on every property (new test) |
| M3 · City environment | 5ccc5bd | Promenade shops, low civic blocks between the rings, plaza paving, street lamps, quay and promenade, two marinas, garden hedges, fountain and statue, bridge trusses. | Decorative geometry is low and off the tiles, and counted as an occluder in the ID pass, which still shows all 32 nodes. Worst case Low 89, Medium 95, High 95 draw calls. |
| M4 · Premium HUD | 845f727 | **Left column:** turn card, ranked scoreboard with leader highlight, target marker and a "holding target" flag, turn-order chips. **Right column:** Stay/Cross with descriptors, dice Roll, build rows with district symbol and stage meter, value pulses (off with reduced motion). | Text ≥ 12 pt and targets ≥ 44 pt on all 15 screens |
| M5 · Device QA tools | 7cd2e4b | `?bench=1` benchmark and a standalone QA bundle. Adaptive quality now uses 2 s windows. | Software WebGL: High → Medium at 11.9 s, → Low 5.7 s later, then render scale down |

**Cost of the polish (worst case: all Skyscrapers + routes + networks, Pro Max @3x):**

| Tier | Draw calls (before → after) | Triangles (before → after) | Budget (calls / triangles) |
| --- | --- | --- | --- |
| Low | 96 → 89 | 25.6k → 35.9k | 120 / 60k |
| Medium | 98 → 95 | 35.0k → 55.3k | 250 / 150k |
| High | 98 → 95 | 42.3k → 62.6k | 450 / 350k |

Draw calls fell because static parts are now merged; triangles rose with the extra detail. All are within budget.

## Device QA (iPhone Safari)

**Not run yet.** This environment has no physical iPhone. Its browsers render WebGL in software, so frame rates here say nothing about devices. The tools are ready:

- **On the web build:** `circuit-alpha.html?bench=1`.
- **Standalone:** `node skyline-estates/tests/build-circuit-qa-bundle.cjs circuit-qa.html` produces one self-contained 0.82 MB file that runs the benchmark automatically.
- **Scenarios** (about 50 s): idle 5 s; worst case continuous with adaptive quality 15 s; cinematic 0° → 15° → 0° 6 s; computer-played match 20 s.
- **Reported:**
  - FPS and frame-interval p50/p95/p99, plus frames over 50 ms;
  - CPU render time (p95);
  - draw calls, triangles, textures, geometries and pixel ratio;
  - tier at start and end, with timed tier changes;
  - memory (not exposed by Safari; reported as null);
  - device, GPU string, DPR and reduced-motion setting.
- A **Copy results** button gives JSON to paste back.
- **Acceptance targets:** CIRCUIT-V2-REVIEW.md §4.

## Remaining visual compromises (for ChatGPT's review)

1. **Perspective lean at 0°:** at the top-down decision camera, tall towers lean outward from the board centre. This is validated: no node or token is hidden. Roofs are offset from their tiles, most visibly for Skyscrapers on the inner ring.
2. **No bloom:** there's no post-processing. Crowns, lamps and bridge lights use emissive materials and a sky reflection map.
3. **Procedural textures:** facades and paving are generated textures, with no authored PBR texture sets or models. A higher-fidelity asset pass would add download weight and needs its own budget check.
4. **Small environment details:** boats, lamps and blocks are deliberately low-detail instanced geometry to stay inside the Low-tier budget.
5. **The 2D fallback** (no WebGL) has no zoom/pan and none of the new visuals.

## Reproduce

- `node skyline-estates/tests/circuit-3d-browser.cjs` (add `VISUAL_ENGINE=webkit` for WebKit)
- Add `CIRCUIT_SHOTS=dir` for screenshots and `CIRCUIT_3D_REPORT=path` for a JSON report.
- Open `skyline-estates/circuit-alpha.html?quality=low|medium|high&perf=1`.
- `CIRCUIT_SHOTS=dir node skyline-estates/tests/circuit-3d-shots.cjs`: the review screenshot set at native resolution.
- `node skyline-estates/tests/circuit-zoom-3d.cjs`: the 320 pt fallback in 3D.
