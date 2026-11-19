# Skyline Empire: interactive 3D lab (local review)

`empire-production-lab.html` + `empire-production-renderer.js`, with the shared HUD `presentation/skyline-board-hud.{css,js}` and `presentation/board-camera-fit.js`. All presentation reads `SkylineEmpire.view()`.

## Assets
Claude's supplied Empire pack is copied into `assets/empire-local/` and is committed as an owner-approved runtime subset (see `assets/empire-local/ASSET-PROVENANCE.md`). From `SkylineEstates_Dominion_Empire_3D2.zip`, copy:
- `boards/board_empire_44.glb`
- `environments/empire_bay_skyline.glb`
- `layouts/empire_44.json`
- `landmarks/empire_tower.glb`
- `props/tower_crane.glb`

The stage models are the committed `assets/approved-v5/buildings/`.

The supplied board bakes in a finished Empire Tower. Its 1,544 triangles inside the moat are dropped at load time, and the separate tower model is clipped to the real funded stage, with a crane and scaffold until it's complete (tested).

## HUD (shared with Dominion; it follows the approved art's panel layout)
- **Left:** logo, board badge, The Empire Map (zones coloured, ring = majority holder), Victory, Landmarks (Empire Tower progress and zone holders), Match log.
- **Right:** Career badge, Market Strategy (demand per system, build cost, rental yield, trend, event), Milestone Progress (3 real milestones with values), Negotiation, Selected space, then an action dock with **ROLL DICE**, Round, Buy/Auction, Build, Invest in Tower, and End turn.
- **Bottom:** player cards with the game's existing avatars, Cash and Net worth, and a crown on the leader.
- **Scaling:** panels collapse; sizes scale with viewport height. The camera fits the island into the free area between the panels, using a view offset so tap targets stay exact. Player cards drop labels, then portraits, when narrow.

## Measured
Headless, software GL; `physicalDevice:false`. See `test-results/empire-lab/*-report.json`. At the high tier, the scene is about 709k triangles in about 121 draw calls. Most of that is the supplied bay skyline (392k) and the dense board vegetation (315k), so a mobile LOD pass is needed. Not measured: real iPhone frame pacing, thermals or memory.
