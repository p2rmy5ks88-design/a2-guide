# SKYLINE CIRCUIT — PREMIUM VISUAL DESIGN V2

**Status:** Design specification and validated-V1 geometry baseline. **Not** finished 3D assets, not a rendered screenshot, and not approval to merge or deploy.

## Creative direction
Build a memorable, original miniature waterfront metropolis with **two concentric connected rings**. Outer boulevard: urban mixed-use streets, planted promenades, subtle street lighting. Inner ring: luxury glass-and-stone towers and plaza gardens. Four illuminated bridges express strategic crossing. Central civic garden is decorative only. Premium golden-hour lighting, dark navy water, warm brass/gold highlights, polished but restrained materials. Avoid Monopoly visual vocabulary, names, or branding.

## Immutable baseline
`circuit-design-v2.json` retains **exactly** V1's 32 node coordinates, default 0° camera, 15° optional detail camera, viewport-specific board/HUD rectangles and stage/token ratios. Keep all O0–O19, I0–I11 IDs and four connectors. No extra tile on a connector. Re-run the same validator; passing V1 does not prove a new 3D renderer will pass.

## Four district identities
1. Harbour Quarter — cyan / wave — marina gardens (O1 O2 O4; I1 I2).
2. Civic Heights — amber / sun — sandstone plazas (O6 O7 O9; I4 I5).
3. Verdant Mile — green / leaf — planted promenades (O11 O12 O14; I7 I8).
4. Neon Exchange — violet / spark — glass commercial blocks (O16 O17 O19; I10 I11).

Each quadrant must be readable by **symbol and color**, including at 12–14 pt token scale. These are *art-direction labels*, not new game-property names or rules.

## Stage art
- Plot: dark slate parcel plinth, subtle ownership rim.
- Low-rise: cream masonry, navy windows, squat silhouette.
- Mid-rise: stepped stone-and-glass midrise.
- High-rise: broad tower with terraces, distinctive silhouette.
- Skyscraper: premium broad glass tower with subtle gold crown; no needle spires.

Retain alpha collision envelopes for all stages. Prefer detailed textures and roof silhouettes over increasing tower height. Property owner is shown on tile edge and base, not merely colored windows. No buildings on junction or event nodes.

## HUD: compact and cinematic, but testable
**Left column:** current player, cash, influence target, standings, round, snake order. **Right column:** Stay/Cross beside Roll, first-junction indicator, buy/pass or build/end controls, scrollable build list and refusal reasons, victory-clock notice. Keep all HUD elements inside V1's per-screen rectangles. Do not add top or bottom banners that steal board height. Full property names appear on inspection, not all 32 tiles simultaneously.

## Route and network visualization
Show **both** route previews simultaneously: gold solid = Stay; cyan dashed = Cross. Distinguish preview likelihood from guaranteed outcomes. A thin luminous owner-color path connects properties through junctions and bridges; event nodes visually interrupt networks. Connector crossing is one movement hop and never a stoppable tile.

## Small-screen fallback
When full-board projected target spacing is below 44 pt, overview remains visible but node taps open zoom. Zoom/pan must preserve full 44 pt circles and keep only fully onscreen targets selectable. Use actual projected spacing, not a device-name blacklist. Maintain the previously validated SE1 and Safari-toolbar behavior; repeat validation after applying final assets.

## Renderer contract
Read-only rules snapshot; effects animate in recorded order; skip/fast animations never alter results. Use separate visual randomness. Keep all ten interaction states. Preserve Circuit save isolation and Career flags. All four players can occupy O0.

## Required deliverables from Claude **before implementation**
1. Import this V2 JSON as a design spec, not as a replacement for the validated rules.
2. Confirm unchanged V1 geometry/HUD and run all existing tests on all viewports in Node, Chromium, WebKit.
3. Produce **three static review screenshots**: (a) clean full board, (b) all 20 Skyscrapers + four tokens at O0, (c) both route previews with side HUD. Include SE2 and iPhone Pro Max landscape crops.
4. Provide a per-device performance budget and identify where low-quality rendering fallback is needed.
5. Report design conflicts before starting final renderer. Keep PR #212, #213, #214 draft, no merge or deploy.

## Acceptance gates
Do not call V2 production-ready until screen-space checks, WebKit/Chromium browser screenshots, real-device readability and performance measurements pass. Visual quality must be assessed at **actual iPhone display scale**, not only in a large desktop render.
