# Token selector and illustrated evolution stages

The token evolution cards used `mdl(...pal:1)`, deliberately bypassing the available collectible illustrations for a live canvas/WebGL preview. That path could show empty geometry on phones. Stage cards now use ordinary local `<img>` elements for every token, with six explicit rarity finishes (silver, blue, purple, gold, pink and Chaotic violet). They reuse the existing detailed collectible artwork; these are derived finishes, not 96 newly commissioned illustrations. No stage preview needs WebGL.

The sixteen-card selection grid is replaced with a native rolling/dropdown list labelled **Choose token**. All/Owned/Locked and sorting remain; previous/next navigation respects the current filter. Corrected a confirmed filtering bug: some locked unlock rules return undefined, so strict comparison to false excluded them. Filtering now normalizes ownership to a boolean.

The selected token, progress, full-width illustrated stages, perks and upgrade action use normal vertical page flow. Desktop shows six stage cards; smaller layouts reflow them. Fixed-height nested token scrollers and horizontal clipping are removed. This preserves all six existing tiers, each token’s distinct power path, saved progress, coin/win gates and the approved board/scenery/artwork. Choosing tokens/stages only previews; Equip and Confirm upgrade remain explicit actions.

Validation:

- Every one of the 16 tokens loads all six stage illustrations: 96 successful image loads, six different computed rarity finishes and no stage canvases.
- Filters, selected token, previous/next, locked equip, Bus/Tuk-tuk distinct power paths and zero wallet/equipment changes from preview are checked.
- Desktop/tablet/phone layouts plus landscape 1280×589 and 844×390: no horizontal page overflow; all stages remain in bounds and the upgrade action is reachable.
- Local focused suite passes 19 UI/reward checks with zero browser errors using Chrome launched with `--disable-webgl`. CI runs this suite in the same GPU-disabled mode, including its existing 48 seeded rarity simulations, followed by the full existing browser/stability suite.
- Reproduce: `SKYLINE_NO_WEBGL=1 SKYLINE_UI_ONLY=1 node skyline-estates/tests/reference-dashboard-browser.cjs results.json` (set environment variables in the local shell; see existing Playwright/Chrome setup).
- Offline manifest rebuilt; 138 resources, no added downloads/services. Engine source and audited rules hash remain unchanged from PR #33. No paid service, live permissions or store release.

Full CI passed; see verified run below. Screenshots and per-game results are in the workflow artifact.


## Verified run

Tested implementation `b2bd38b125a855eb48b7d915d9e51b5cb2aa1336`: [browser/stability CI](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40647643442) passed. The reference suite ran with `SKYLINE_NO_WEBGL=1` and passed 20 checks with zero browser errors, including every stage illustration and 48 seeded rarity games. The same workflow passed 175 standard games, 56 stability regressions, 19 complete-match checks, 35 human-flow checks, 16 browser-smoke checks and all previous service/board/offline/online/save comparisons. Uploaded `skyline-stability-results` contains screenshots and per-game rounds/errors/cash/bank/outcome data. Subsequent report commit is documentation only.
