# Skyline Dominion: interactive 3D lab (local review)

`dominion-production-lab.html` + `dominion-production-renderer.js`. All presentation reads the rules through `SkylineDominion.view()`; the renderer never changes the match.

## Assets
Claude's supplied Dominion pack is copied locally into `assets/dominion-local/` and **is not committed**: the owner has not yet approved publishing it, so the folder is excluded via `.git/info/exclude`. To reproduce, copy these from `SkylineEstates_Dominion_Empire_3D1.zip`:
- `boards/board_dominion_48.glb` (art-matched 48-space hexagonal board, 91k triangles)
- `layouts/dominion_48.json`
- `environments/dominion_waterfront_city.glb` (247k triangles)

The stage models come from the already-committed `assets/approved-v5/buildings/`:
- Plot: `dev_0_lot`
- Low-rise: `dev_1`
- Mid-rise: `dev_2`
- High-rise: `dev_4`
- Skyscraper: `dev_5`

Every material is checked at load time for normal, AO, roughness and metal maps.

## Rendering
- **Rendering on demand:** frames are drawn only on change, never in an idle loop (tested).
- **Reflections:** the planar waterfront reflection is cached and refreshed only when the camera or the static scene changes, never per token frame. Board water is hidden during the reflection pass, which fixes a feedback loop that WebKit caught.
- **Context loss:** losing the graphics context is recovered without touching the match (tested).
- **Quality tiers:**
  - Low: DPR 1.5, no shadows, no city.
  - Medium: DPR 2, shadows, city.
  - High: DPR 3, shadows, city, reflections.
- **Camera:** fitted to the real board footprint inside the canvas between the HUD columns. There is no automatic zoom. Overview and Inspect are manual.
- **Ownership:** player colour plus a unique token shape (cone, cube, cylinder, octahedron) and an owner ring on each site.

## Measured (headless, software GL; physicalDevice:false)
| Viewport (CSS) | DPR | Screenshot px | Board canvas CSS | WebGL buffer | Triangles | Draw calls |
|---|---|---|---|---|---|---|
| 956×440 | 3 | 2868×1320 | 610×440 | 1830×1320 | ~345k | 244 |
| 844×390 + safe insets | 3 | 2532×1170 | 450×369 | 1350×1107 | ~345k | 244 |
| 667×375 (medium) | 2 | 1334×750 | 391×375 | 782×750 | ~345k | 244 |

Not measured: real iPhone frame pacing, thermals, memory, or touch on hardware.

## Known gaps against the approved art
- The draw-call count (244) is high for phones. The supplied GLBs are merged per material, with one material per label, and are not instanced. Optimising them is the next performance step.
- The surrounding city is a ring of repeated towers. The art shows a varied, lit night city with depth of field.
- District plates have neon rims but less glow and bloom than the art. The art's Central District gold ring, glowing bridges and 3D landmark detail (harbour cranes, palace) are simpler here.
- The HUD is functional navy and gold, but it isn't yet the art's Career Progression, Property Groups, Territory Control and Negotiation panel set.
