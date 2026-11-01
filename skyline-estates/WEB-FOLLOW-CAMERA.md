# Web follow camera, board art and HUD placement (web only)

> v4 (board polish) supersedes the v3 art and HUD details below where they differ; see “v4 board polish”.

Rollback reference: `964c88e` (merge of #86). Native packaging still reads the unchanged `game.html`; this change is limited to the browser presentation layer, the offline manifest and the worker's navigation aliases.

## What changed

**Camera.** This supersedes #86's fixed-yaw overview.

- **Follow** is the default mode.
  - The camera frames the active token and its neighbours (about eight tiles across the free width), plus some of the inner plots.
  - It tracks the animated token continuously, for human and AI turns alike.
  - Along a side the view stays square to that side. Over the last tiles before each corner it blends a quarter turn, so the board appears to rotate beneath the view. The blend comes from the token's world position, which gives continuous rotation with no 90° jumps.
  - Long changes travel more slowly, so the view never whips: a new player's turn, the Lockup, or a turn of more than one radian.
  - The look point is offset so the token sits in the free rectangle between the HUD rows: right of the player cards, below the turn banner and above the footer. This rectangle is re-measured on resize, orientation change and Safari toolbar changes.
- **Overview** comes from the camera button in the tool row, and the same option remains in the Menu.
  - It reuses #86's frame-corner fit, which accounts for the HUD and safe areas.
  - The fit is rotated to the nearest quarter turn of the current view, so switching modes never spins the board.
  - Pressing the button again returns to Follow.
- **Manual drag, pinch and gamepad** are kept until the next move or turn, which then hands control back to the selected mode.
- **Locate and double-tap inspection** are temporary.
- **Reduced motion** never moves the camera during hops. It cuts once to the landing and keeps the view square to the side.
- Occlusion fading of tall buildings works from any camera angle.
- Only the camera moves. Board geometry, property positions and token paths are unchanged.

**HUD (approved reference layout).**
- **Top left:** the turn banner, with a new Home button. Home runs the existing Save & exit outcome after a confirmation. Online games open the Menu, so the existing leave flow runs.
- **Top right:** the Strategic events pill. Below it is one compact tool row: Portfolio (new non-house icon), Trade, Camera, Map and Menu, all 44 px.
- **Left:** compact navy/gold player cards, with a gold highlight on the active player.
- **Bottom row:** Skyline FM on the left, round statistics in the centre, and Roll Dice (orange, with Canva dice art) or End Turn (navy/gold) on the right.
- Action legality is untouched. The game still renders only the legal action, so Roll and End Turn are never offered together.

**Artwork (Canva, owner's account; see ASSET-LICENSES.md).**
- `web/board-skyline.webp`: the Lagos night skyline and lagoon band behind the top HUD row.
- `web/board-palms.webp`: palm fronds at the left edge, behind the cards.
- Both are decorative only: no pointer events, painted below every control, and shown only with the Lagos night board (Daylight, other cities and equipped surrounds keep their own look).

## Remaining visible differences from the reference

The reference is an illustration, and the game renders a live 3D board.
- The tiles keep the real 40-space names, prices and district colours. The image's illustrative names and numbers were not copied.
- Buildings remain the existing low-poly models on inward plots, not the painted houses on tiles.
- The board centre keeps the existing 3D stadium, towers and lagoon rather than the illustrated fountain.
- The reference's full-board view corresponds to Overview. Follow is deliberately closer, as requested.

A closer match would need new 3D building models and a re-textured board centre. Painted images cannot be used for these without losing live ownership and building stages.

## Cache and release

- The new assets are versioned (`presentation-v3.*`), and `web-follow.html` is a fresh entry for testing. A phone holding an older cached shell can therefore reach the candidate without deleting saves or reloading a running match.
- The v2 files are retained only for already cached v2 shells.
- Commits and the merge use `[skip actions]`. None of the changed paths match the native PR or push triggers.

## Verification

- **Chromium with software WebGL:**
  - Real animated hops across all four sides and corners, sampled every frame.
  - An AI turn, manual-drag hand-back, Overview ↔ Follow switching, resize and reduced motion.
  - Every Shop category and both Season tracks.
  - Save, refresh and Continue.
- **Desktop WebKit:** the visual suite runs in CI (`skyline-stability`).
- **Physical iPhone Safari:** still to be done by the owner. Desktop engines cannot establish touch feel, GPU frame rate or toolbar behaviour.

## v4 board polish (after owner iPhone review)

Rollback reference: `0f57688` (merge of #87).

- **Plots attached to their streets.**
  - Each plot is derived from its own tile with `plotGeometry(i)`. It shares the tile's inner edge across a 1 px seam, spans the tile width less a 3 px kerb, and is 64 px deep, which fits the largest model footprint of about 58 px.
  - The node keeps the existing per-side rotation, so the same rule applies on all four sides. The old fixed 28/80 px insets are gone.
  - Plot paving is light, with a street-side band in the district colour that continues the tile's colour bar.
  - Building fronts face their street.
  - A geometry test checks every model footprint against its tile's inner edge.
- **Waterfront.**
  - The CSS header band and the photographic palm overlay are removed.
  - The Canva skyline is cropped at its waterline (no reflection) and fades out at the sky and sides. It stands as an unlit backdrop on the far shore of the existing 3D lagoon, opposite the camera, and turns with it. It appears wherever the horizon is in view (Overview, wide turns) and is hidden by the board otherwise.
  - At Follow's readable 47° pitch the horizon is outside the frame, so it is deliberately not faked as a header.
- **Composition.** The token is centred left-right in the free area and sits about three-quarters down it. The offsets use the camera's own axes, so corner turns never slide the board against one edge.
- **HUD.**
  - One top row: Home and the guidance banner on the left; one gold-edged tool capsule (Portfolio, Trade, Camera, Map, Menu, each 44 px) and Strategic events on the right.
  - Player cards stay on the left. Skyline FM, the statistics and the legal Roll/End action form the bottom row.
- **Dice.** Their landing spot moves to the board interior ahead of the roller's street. Values and timing are unchanged.
- **Cache.** The assets are versioned `presentation-v4.*`, with a fresh `web-board.html` entry. The v3 files are retained for cached shells.
- **Camera flow (owner, 1 Nov).**
  - The game opens on the whole board, and the whole board stays while players decide.
  - A roll starts a zoom toward the active token, and the camera then follows it hop by hop, turning smoothly at corners.
  - About 1.1 s after landing it eases back to the whole board, rotated to the nearest quarter turn so it never spins.
  - The camera button pins the whole board (no zoom on moves). Reduced motion keeps the whole board still.
  - This replaces the "Follow at rest" behaviour described in the v3 sections above.
