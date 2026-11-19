# Skyline Estates reconstructed board reviews

These independent playable web entries use the existing rules and saves. They do not activate a new renderer in the default game, change native build configuration, or submit a release.

- Origins: `origins-premium-lab.html?production=1` (40-space Classic match).
- Circuit: `circuit-production-lab.html` (20 outer + 12 inner spaces, four bridges).
- Previous previews remain at Origins without `production=1` and `circuit-board2-lab.html`.

Serve the repository root using `python3 -m http.server 8773 --bind 127.0.0.1`. Run browser checks with `PRODUCTION_BASE_URL=http://127.0.0.1:8773/skyline-estates/`, `VISUAL_ORIGIN=http://127.0.0.1:8773/`, `VISUAL_MATRIX=1` and `VISUAL_ENGINE=chromium` or `webkit`, then `node skyline-estates/tests/origins-production-browser.cjs` or `circuit-production-browser.cjs`. The matching branch must contain that board's implementation. The web-only workflow captures the same matrix after integration.

## Presentation

Origins has an illustrated overview, horizontally scrollable real district cards, original vector building-stage illustrations and working deed inspection. District colors come from the game; non-property spaces use cool neutral surfaces. Ownership uses small player-colored markers instead of covering the district plot. Only decorative central scenery is shortened to preserve far-street sightlines; owned development prototypes and economic stages remain intact.

Both boards use mapped local GLBs, warm lighting, bounded scene reflections, demand redraw and graphics-context recovery. Circuit includes an oval civic landmark batched into four material draws, an instanced waterfront, a stable 48-degree review camera and a live four-district portfolio. Route decisions, buying, building, AI and saves remain in the existing engines.

## Asset scope and limits

The owner approved repository inclusion of the 19 required runtime GLB/layout/lighting files (56.1 MiB) under `assets/approved-v5`. Files are copied unchanged from the supplied pack; labels and geometry adjustments happen at runtime. Original artwork, demo HTML, ZIPs and generator scripts are not included. Presentation helpers are kept outside the shared native-library paths.

The scenes still differ from the painted originals in architectural repetition, foliage and soft atmospheric lighting. Full-resolution captures distinguish screenshot dimensions from render-buffer dimensions. Desktop WebKit is not physical iPhone Safari testing. Device thermal behavior, sustained FPS and real Safari toolbar behavior remain unverified. The default game's existing offline manifest is unchanged; these review-only assets are not added to its precache.
