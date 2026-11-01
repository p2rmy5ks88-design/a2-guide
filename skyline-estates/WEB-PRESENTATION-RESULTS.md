# Web presentation refinement — 1 November 2026

Scope: the playable browser game in `p2rmy5ks88-design/a2-guide` only. Working branch: `skyline-web-final-refinements`. Rollback source: `a5a3964d3350247c4d8f0c6905c866e64adb18f2` (before this update). No backend, account, pricing, reward, native configuration or Apple release operation is part of this update.

## Implementation

- The existing custom WebGL renderer remains active. The 40 real tiles, Lagos center, property names, district colors, token circuit and gold frame are retained.
- Existing architectural families (garden and development levels 1–5) move onto separate, smaller inner tile-edge plots. Crowded/corner plots use both diagonal orientations; other plots retain a simple color accent. Redundant miniature house indicators and obsolete painted street pads are suppressed visually, without changing building counts.
- Default Lagos surroundings use restrained navy and gold. Daylight and equipped premium surroundings retain their existing palettes. Original materials are restored when leaving the board.
- Automatic movement framing stays isometric, without per-tile rotation or close zoom. Small bounded focus assistance is used only near screen edges, then returns to the full board. Manual camera gestures and building inspection remain available. Reduced motion disables automatic translation.
- At most two actual obstructing property models are temporarily de-emphasized. Shared materials are cloned and restored; token materials remain opaque.
- Compact HUD, consistent 44 px controls, safe-area offsets and visual-viewport height handling. Shop first-row previews, names, rarity, prices and actions fit short landscape screens. Existing inventory and buying handlers are retained.
- Season banner is smaller, uses actual total XP and accessible next-tier progress, and preserves both reward tracks. Tracks support horizontal swipe/arrow navigation; the pane scrolls vertically when needed. Existing claim/entitlement code is unchanged; rapid repeat clicks are suppressed.

## Isolation and caching

The additive files are `web/presentation.js` and `.css`. `build.py` includes them only in the browser wrappers. Native packaging reads `game.html` directly and copies its existing asset allow-list; it does not load these browser wrappers or fetch remote gameplay. The audited `game.html` hash is unchanged. No native build workflow is edited or run.

`web-play.html` is a fresh, same-origin browser entry point for phones whose old worker still serves the previous root shell. It shares the same saves and does not clear storage. Both entries are generated identically. The offline manifest includes the module and alias. Updates do not force-reload an active match; an update notice asks the player to save and reopen all tabs.

Automatic push/PR Actions are suppressed with `[skip actions]` because the existing main-push IPA workflow would otherwise run even for web-only changes. The existing **web stability** and **isolated security** workflows are dispatched explicitly against the candidate branch. No Apple workflow is dispatched.

## Verification evidence

Local focused browser run: 106 checks passed, zero browser exceptions, using desktop Chromium software WebGL at 844×390, 956×440 and 1280×589. Palette restoration, Daylight contrast and resize/orientation checks are included. Complete candidate CI is recorded in the PR before merge. The new regression is included in the existing stability workflow.

Coverage includes all 40 movement steps/corners, stable camera targets, plot spacing, material restoration/token opacity, unchanged gameplay function implementations, real construction cost, save/reload/Continue, all five Shop categories, genuine preview cancellation without inventory changes, actual season XP, both reward tracks, and idempotent claim/Claim All.

Offline worker: **16/16**; daily-event/content regression: **9/9**; generated browser/offline assets current. Before the final Daylight/keyboard refinements, CI passed security, management/trade, rules parity, offline recovery and 175 simulated games. The menu job exposed a fixed-delay animated-scroll assertion; keyboard tier input now moves immediately and the assertion waits for the actual position. Final-candidate CI and publication are linked in PR #85; do not treat an intermediate checkpoint as evidence of deployment.

Screenshots and JSON diagnostics are retained in the stability artifact (`skyline-web-board-*`, `skyline-web-shop-*`, `skyline-web-season-*`, `skyline-web-presentation.json`). Equivalent 1280×589 views were compared with the owner references. The concept's explanatory A/B/C panels, invented tile names and simultaneous Roll/End controls are not copied into gameplay.

Performance is measured with software rendering, not an iPhone GPU: one recorded complete local comparison had 1,293 versus 1,253 visible meshes, median frame intervals 89.6 versus 78.5 ms and p95 102.7 versus 85.8 ms. These figures demonstrate the test environment only and are not a Safari frame-rate promise. No new heavyweight model assets, animation loop or unbounded texture allocation is introduced.

## Physical iPhone Safari acceptance (owner)

1. Open the published browser link in landscape; confirm saved progress and Continue before starting a new match.
2. Inspect all four sides/corners: separate inner buildings, district colors, readable names/prices and visible moving tokens.
3. Roll human/AI turns, inspect a building, drag the camera, then restore the board view. Check reduced motion if enabled.
4. Build, mortgage and propose/cancel a trade; confirm ownership and money change only through valid actions.
5. Visit all Shop categories, preview/cancel, and inspect prices/actions above navigation.
6. Scroll both Season tracks; claim once and confirm repeat taps do not grant again.
7. Show/hide Safari toolbars, rotate, save, refresh and Continue. Then try offline after the worker finishes caching.

Physical iPhone Safari performance, toolbar behavior and touch feel require owner validation. Desktop touch emulation is reported separately. The artwork is adapted to the existing renderer and actual board, rather than replacing it with a static concept.

## Rollback

Revert this web PR on main, regenerate browser/offline products using `python skyline-estates/build.py`, and publish through Pages. Use a `[skip actions]` commit to avoid native push triggers, explicitly run the web checks, then verify Pages. Never clear localStorage, IndexedDB or player records to roll back styling. Existing native binaries and the App Store submission need no change.
