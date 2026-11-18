# Skyline Circuit — Premium Design Package V2 review (17 Nov 2026)

Status: **review before the final renderer.** No final 3D renderer has been started, and no rules, save keys, Career eligibility, backend, production or TestFlight were changed. PRs #212–#214 remain drafts.

The package from ChatGPT is stored as delivered in `design/v2/`: README, JSON, V1 baseline, topology SVG and manifest. All four SHA-256 hashes match `MANIFEST.json`. It is a specification only: no images or 3D assets.

## 1. Geometry: unchanged from V1 (confirmed)

`circuit-design-v2.json` has `layout`, `camera`, `screens` (HUD and board rectangles) and `geometry` **exactly equal** to the approved V1 baseline. The embedded `circuit-design-v1-baseline.json` is the same JSON as ours; only a trailing newline differs.

| Check | Node | Chromium | WebKit |
| --- | --- | --- | --- |
| Topology (IDs, clockwise rings, connectors clear) | pass | — | — |
| Screen checks: projection, 44 pt targets, all Skyscrapers, 4 tokens on O0, both routes, HUD; 15 screens × 2 cameras | 30/30 | 30/30 | 30/30 |
| Zoom/pan fallback on the three 320 pt screens | pass | pass | pass |
| V2 review: HUD inside the package rectangles on all 15 screens, text ≥ 12 pt, buttons ≥ 44 pt, HUD text contrast ≥ 4.5:1 | pass | pass | pass |

The Chromium and WebKit measurements are identical.

## 2. Review screenshots

A 2D **review renderer** (`circuit-review.html` + `lib/circuit-review-art.js`) approximates the V2 art direction on the validated geometry:

- golden-hour light from the west, island platform, water, boulevard trees, central garden;
- illuminated bridges;
- district accents with vector symbols;
- the five stage silhouettes **inside the alpha collision envelopes**;
- owner rims on the tile and the building base;
- distinct token shapes;
- the HUD laid out to V2's left/right specification.

The scenes are real rules states. It is not the final 3D renderer.

Captured at real iPhone scale (SE 2nd gen @2x, Pro Max @3x) in Chromium and WebKit, 16 per engine, by `tests/circuit-v2-review.cjs` with `CIRCUIT_SHOTS=dir`:

- (a) clean board;
- (b) all 20 Skyscrapers plus four tokens on O0;
- (c) both route previews with the side HUD;
- variants: proposed labels, 15° detail camera, greyscale, low quality tier.

## 3. Design conflicts found (for ChatGPT and the owner)

| # | Conflict | Evidence | Proposed resolution |
| --- | --- | --- | --- |
| 1 | **Cross route colour = Harbour Quarter accent** (#58B9CF for both) | ΔE 0. A dashed cyan line over Harbour tiles loses contrast. | Give the Cross route its own colour, or keep cyan and rely on the dark casing the review renderer adds (5.5 pt navy under each route line). The casing alone made routes readable in the screenshots. |
| 2 | **Stay route gold ≈ Civic Heights amber** (#F2C457 vs #E6B45B) | ΔE 10.1; deuteranopia 8.8; greyscale ΔL 5.1 | Same: route casing, plus solid vs dashed already separates the two routes. Gold is reserved for the Stay route and Skyscraper crowns; the review renderer moved junction outlines, road dashes and bridge lights to ivory. |
| 3 | **12 pt ID and price on all 32 tiles at overview** | In the all-Skyscraper scene, labels cover all 20 roofs, which hides the stage art. The O0 label sits under the four tokens. The 2×2 token slots cover the label area, so this can't be fixed by moving the label within the tile. | Overview labels **only on unbuilt plots**, junctions and events. Developed tiles show stage and owner, with name and price on inspection (the V2 README already puts full names there). A node's label is hidden while tokens stand on it. Measured: 0 labels over buildings, and the only overlaps left are the token-occupied nodes, which this rule hides. |
| 4 | **Premium towers vs the 0° decision camera** | Top-down, Skyscrapers read as gold-crowned roofs, not towers. At the validated 15° detail camera the facades show and the silhouette works, but roofs shift up the screen away from their tiles. | Keep 0° for decisions as validated. Convey the stage at 0° through roof plan, crown and footprint (as the review does). Use 15° for movement and celebration moments only. **No change to camera limits.** |
| 5 | **District colours in greyscale** | All four accents have nearly the same lightness (L 69–76). | Already covered by V2's "symbol and colour" rule. Symbols (wave, sun, leaf, spark) must be kept on plots and on building bases. Verified in the greyscale screenshot. |
| 6 | **Player colours not specified in V2** | Owner colour is needed for rims, network lines and tokens. | Proposed set: P1 coral #FF7A59 (circle), P2 blue #4C7DFF (square), P3 ivory #F8F6EF (triangle), P4 magenta #E055C8 (hexagon). All pairs ΔE ≥ 20. The weakest is P4 vs the Cross cyan under deuteranopia (8.3), which token shape and line dashing cover. ChatGPT to confirm or replace. |
| 7 | **HUD on the SE (132 pt left column)** | "Influence → target 300" and "Order · reverses each round" wrap to two lines. Everything fits, with no scrolling on any screen and every scene. | None required; noted for the HUD typography pass. |

No conflict requires changing V1 coordinates, the cameras, the HUD rectangles or the game rules.

## 4. Per-device performance budget and low-quality fallback

No real-device measurements yet. The headless draw times of the 2D review renderer are not device numbers. This is the budget the final renderer must meet, measured with the `?perf=1` hook and the plan in CIRCUIT-ALPHA.md §8.

| Device class (examples) | Starting tier | Frame target | Draw calls | Triangles | Texture memory | Shadows / bloom / water | Render scale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A9 (SE 1st gen, iOS 15 floor) | **Low** (forced) | 30 fps during moves, idle redraw only | ≤ 120 | ≤ 60k | ≤ 48 MB | none / none / static | 1.5× |
| A13–A15, 60 Hz (SE 2nd/3rd gen, iPhone 11/XR) | Medium | 60 fps, p95 ≤ 20 ms | ≤ 250 | ≤ 150k | ≤ 96 MB | one soft shadow map (1024) / off / simple | 2× |
| A14–A16, 60 Hz (iPhone 12–14, 16e) | Medium → High if within budget | 60 fps, p95 ≤ 18 ms | ≤ 350 | ≤ 250k | ≤ 128 MB | soft / low / modest | 2× (not 3×) |
| ProMotion Pro models, 16/17, Air | High | board at 60 fps (UI may run 120) | ≤ 450 | ≤ 350k | ≤ 160 MB | soft / controlled / reflections | adaptive 2–2.5× (as Living Board) |
| Safari web (any iPhone) | Medium cap | 60 fps | ≤ 300 | ≤ 200k | ≤ 96 MB | soft / off / simple | 2× |
| Mid-range Android | Low → Medium | 60 fps, p95 ≤ 20 ms | ≤ 250 | ≤ 150k | ≤ 96 MB | none–soft / off / static–simple | 1.5–2× |

**Low-quality fallback** is needed in these cases:

- always on the A9 (SE 1st gen, which also needs the zoom fallback);
- on mid-range Android;
- on any device in Low Power Mode;
- after sustained over-budget frames (p95 above target for 5 s → drop one tier);
- on a thermal warning or memory warning.

Rules for tier changes:

- Never upgrade mid-match.
- Tier changes are visual only and never touch the rules state or randomness.
- The Low tier looks like the "low quality" review screenshot: no trees, glints or glow, flat water, and still fully readable.

**Watch items:** with 20 Skyscrapers × 3–4 volumes each, plus 32 tiles, bridges, trees and water, instancing is required to stay under the draw-call budget on the Medium tier. Bloom on crowns and bridges is the first effect to drop.

## 5. Before implementing the final renderer

1. ChatGPT to confirm or revise conflicts 1–3 and 6. Conflict 4 is guidance within the existing camera limits.
2. Then build the final 3D renderer behind the existing interface (`view(s)` + ordered effects).
3. Re-run, on the real assets:
   - `circuit-design.cjs` and `circuit-design-browser.cjs`;
   - `circuit-v2-review.cjs`;
   - the device performance plan.
4. Don't call V2 production-ready until real-device readability and performance pass.

## How to reproduce

- `node skyline-estates/tests/circuit-design.cjs skyline-estates/design/v2/circuit-design-v2.json`
- `node skyline-estates/tests/circuit-design-browser.cjs skyline-estates/design/v2/circuit-design-v2.json` (add `VISUAL_ENGINE=webkit` for WebKit)
- `CIRCUIT_SHOTS=out CIRCUIT_V2_REPORT=out/report.json node skyline-estates/tests/circuit-v2-review.cjs` (add `VISUAL_ENGINE=webkit` for WebKit)
- Open `skyline-estates/circuit-review.html?scene=clean|skyline|route&labels=all|plots&camera=default|detail&quality=low|medium|high&gray=1`
