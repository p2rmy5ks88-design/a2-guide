# Skyline Estates Career Mode — visual QA review (draft)

This file records the owner-requested quality pass of all five existing Career
boards. **No PR should be merged until every board has passed visual/gameplay
acceptance and the owner has approved the physical iPhone Safari result.**

## Scope
- **PR #241 — Origin**: 40-space approved board, crisp readable square
  labels and prices, upright close-follow camera, landscape HUD-safe framing,
  stage captions that fit on 844px and 956px landscape viewports.
- **PR #242 — Boards 2–5**: preserve existing approved art and interactive
  rules; refine render legibility, camera follow, and landscape controls.
  Changes remain isolated to their draft PR.

## Boards 2–5

| Board | Protected identity | QA focus |
| --- | --- | --- |
| City Ventures | 37-space hexagonal Living Market | Unlit property/hub labels, readable controls, close-up/overview camera |
| Crossroads Capital | 33-space figure-eight / Grand Exchange | High-contrast hub text, route controls, smooth upright close follow |
| Dominion | 61 navigation nodes, supplied art-matched GLBs | Close-follow and settled overview, four-player portrait/figure fit |
| Empire | 44 spaces, financed tower progression and supplied GLBs | Camera return, 844px safe-area roster, retain construction model states |

## Current verified facts
- Origin production visual QA and approved-board visual workflows completed
  successfully on commit `8ad9d8db` (Chromium and WebKit).
- Chromium and WebKit previously completed full-match checks for City Ventures
  and Crossroads at commit `3b608ca8`, before later camera, safe-area
  and disabled-button changes.
- Earlier Dominion and Empire camera checks passed in Chromium after rendering
  slow GPU frames; the latest WebKit and narrow-safe-area changes still need
  complete reruns.
- Regenerate `offline-assets.js` and `sw.js` with
  `python3 skyline-estates/build.py` whenever their included HTML or renderer
  assets change. Do not merge stale generated cache identities.

## Required release gates
1. Complete current Chromium + WebKit game and visual QA with evidence screenshots.
2. Complete repository stability tests and offline-build check on PR head.
3. Inspect actual 956×440 and 844×390 safe-area game views; check property
   text, four player figures, dock controls, and card contents are readable.
4. Test physical iPhone landscape motion (camera corners, no horizon roll,
   follow/return, token and tile tap accuracy, safe-area cutouts, frame pacing).
5. Confirm Classic, currency, saves, Career progression, online/ranked and
   native/TestFlight versions remain untouched.
6. Review all PR screenshots and obtain owner approval before merging.
