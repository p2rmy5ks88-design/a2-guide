# Weekly contracts home summary — integration checklist

The read-only summary and responsive button renderer are available in `lib/weekly-contracts-summary.js`, but are **not loaded or mounted** in production yet.

## Existing game source
- `game.html` defines `WEEKLY`, `weekly()`, `weekNo()`, `weeklyAdd()` around lines 4805–4813.
- `weeklyAdd()` immediately credits the existing 400 Season XP and 60 Coins when a contract completes. Do not create a second claim or payout path.
- `paneSpotlight(T)` around line 7578 already renders the full weekly contract list and is reachable with `homeTab('spotlight')`.
- `paneP(T)` around line 5364 is later wrapped by the existing Spotlight banner around line 7620, and the separate `home-redesign.js` script is loaded after boot. Any home integration must be compatible with that override.

## Suggested production wiring (after QA)
1. Load `lib/weekly-contracts-summary.js` after the home redesign script.
2. Use a tiny adapter inside `game.html` (where existing lexical `WEEKLY` and `weekly()` are accessible), calling `SkylineWeeklySummary.mount(host, weekly(), WEEKLY, loc, ()=>homeTab('spotlight'))`.
3. Place the button in a verified unobstructed home-screen container. Do not append blindly to the existing Spotlight banner; inspect iPhone landscape first.
4. Ensure it is rendered only once after navigation/re-render, with no stale DOM references.
5. Verify light mode, reduced viewport height, touch target and screen-reader label.

## QA and release gate
- Execute `node skyline-estates/tests/weekly-contracts-summary.cjs`.
- Run existing game build, hash check, full tests and visual screenshots on 956×440 and 2532×1170 equivalent viewport sizes.
- Verify existing weekly progress and coins before/after match completion are unchanged.
- Do not merge or upload native builds until verified.

The summary is a display-only feature; it has no persistence, wallet or gameplay logic.
