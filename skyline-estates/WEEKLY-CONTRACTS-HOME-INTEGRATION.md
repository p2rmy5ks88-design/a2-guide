# Weekly contracts home summary — integration checklist

The read-only summary and responsive button renderer are available in `lib/weekly-contracts-summary.js`, and are loaded from the cinematic home renderer on this branch. The standalone button mount is not used: the existing Spotlight card displays the weekly count.

## Existing game source
- `game.html` defines `WEEKLY`, `weekly()`, `weekNo()`, `weeklyAdd()` around lines 4805–4813.
- `weeklyAdd()` immediately credits the existing 400 Season XP and 60 Coins when a contract completes. Do not create a second claim or payout path.
- `paneSpotlight(T)` around line 7578 already renders the full weekly contract list and is reachable with `homeTab('spotlight')`.
- `paneP(T)` around line 5364 is later wrapped by the existing Spotlight banner around line 7620, and the separate `home-redesign.js` script is loaded after boot. Any home integration must be compatible with that override.

## Current branch wiring
1. The protected `game.html` is identical to `main`; no audited hash update is needed.
2. `home-redesign.js` loads the display-only helper asynchronously and refreshes the home pane after it loads.
3. The weekly completion count appears inside the existing Spotlight card. Its click handler still opens `homeTab('spotlight')`.
4. No extra floating panel is created; the unused `mount()` helper is available for later design experiments.

## QA and release gate
- Execute `node skyline-estates/tests/weekly-contracts-summary.cjs`.
- Run existing game build, hash check, full tests and visual screenshots on 956×440 and 2532×1170 equivalent viewport sizes.
- Verify existing weekly progress and coins before/after match completion are unchanged.
- Do not merge or upload native builds until verified.

The summary is a display-only feature; it has no persistence, wallet or gameplay logic.
