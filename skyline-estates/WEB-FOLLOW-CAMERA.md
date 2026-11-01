# Web follow camera, board art and HUD placement (web only)

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
