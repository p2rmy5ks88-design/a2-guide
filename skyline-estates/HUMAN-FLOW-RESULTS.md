# Human gameplay path checks — Phase 1

Related to issue #2. Branch: `skyline-phase1-human-flows`, based on main `96b3ec4229d1d1564123b84c5c5e85688d7f08f2`.

## Confirmed defect

A player with no properties could open the portfolio but could not close it: the active `openAssets` renderer returned when no property was selected, before creating Close and the debt footer. The same path omitted Declare bankruptcy/Pay when a property-less human owed money.

The [baseline browser run](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40365391480) reproduced the missing Close control in an isolated two-human game. It failed waiting for that visible button, with no browser exceptions. The source confirmed both missing control paths share the early return.

Move creation of the existing Close and debt controls ahead of the empty-selection return. No controls, labels, styling, assets or rules are added. The same patch is applied to the app body and standalone page.

## Regression coverage

The new real-browser suite uses deterministic dice and isolated local profiles. It operates rendered controls for: empty portfolio closure; purchase, next-player rent; decline with auctions disabled; auctions with no bids, one winning bid or insufficient funds; mortgage-funded debt payment; bankruptcy to creditor or bank; Classic, Quick and timed terminal outcomes; paid jail release and bankruptcy on the third failed jail roll.

Checks compare cash transfers, property ownership, building-bank conservation, surviving players, winner and completed-game save cleanup. The empty-portfolio check is the reproduced regression. Quick and jail scenarios exercise debt settlement with no owned properties after the fix.

These are focused decision/terminal-state fixtures, not complete human matches from an ordinary starting position. Quick mode's initial two-property deal is checked before setting its targeted debt state. Actual game logic and UI handlers run; dice and starting states are controlled. The existing Roll pulse is disabled only inside the isolated test page so Playwright can click a stable target; no product animation or visual design is changed. Jail uses the existing rendered Roll dice accessible name.

Run `npm run test:human --prefix skyline-estates/tests` after installing the existing test dependencies. The PR workflow runs this suite, the 51 save/turn source checks, 175 seeded games, 38 browser economy/save checks and 16 startup/view checks. Fresh JSON reports are attached to each run. Final pass/fail evidence is recorded on PR #6; an earlier passing report is not evidence for an untested head.

## Still outstanding

Full human matches across every mode, physical Android/native lifecycle tests, reliable cold offline web startup, multiplayer/security and payment/store checks remain open. The approved 40-space board, art, 3D scenery, UI design and custom rules are preserved.
