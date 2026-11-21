# Approved Dominion / Crown Empire board replacements — review only

This branch implements the newly approved 48-space flat-top **Skyline Dominion Hex Ring** and 32-space **Crown Empire** as separate, true 3D, playable Career board replacements. The old prototype pages and their save keys remain unchanged as rollback options.

**Files:** `approved-career-board.html`, `lib/approved-board-app.js`, `lib/approved-board-rules.js`, `lib/approved-board-renderer.js`, `presentation/approved-board.css`, and individual mesh/token/building assets under `assets/approved-replacements/{dominion,empire}`. Asset ZIP is committed for reproducibility and extracted in a branch-restricted GitHub Action. Each 3D tile retains its unique `TILE_###` picking name and the exact `board_data.json` perimeter order.

**Game rules:** This is a separate review-only `skyline-approved-board-v1` engine. It replaces incompatible 61-node Dominion and 44-space Empire prototypes with the owner's 48/32-space approval, including actual 2d6 rolling, sequential token movement, cash, purchases, rent, auctions, trades, stage upgrades, CPU turns, saved/resumed matches and Career receipts. Economic balancing is provisional until playtesting.

**Preview:** serve the repo root over HTTP and open `/skyline-estates/approved-career-board.html?board=dominion&autostart=1` or `?board=empire&autostart=1`.

**Safety:** This is a draft review branch. No changes are merged into main; native/TestFlight and the current live game are untouched. Physical iPhone 18 Pro Max landscape, visual fidelity versus approved images, interactive tile taps, and full CI acceptance are still release gates.

## Review improvements (21 Nov 2026)
- The approved new-board HTML/CSS and the genuine GLB/PNG source assets now enter the deterministic offline service-worker manifest; the committed ZIP is excluded from the offline cache to avoid duplication.
- Purchased plots render the supplied Stage 0 plot model immediately. Subsequent upgrades still use the same 3D prefabs and owner state.
- Preserve full 3× iPhone landscape rendering resolution while reducing idle frame submissions to improve battery and WebGL performance.
- Do not merge until exact rendered screenshots and real browser gameplay QA have been checked. Obsolete production prototypes will be retired only after replacement acceptance.
