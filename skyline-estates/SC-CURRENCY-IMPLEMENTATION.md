# Skyline Estates currency change — web-only stage

## Two separate currencies

- **Skyline Cash (SC)**: in-match property money. Existing numeric balances, starting cash, property prices, rents, mortgages, trades, cards, and payout formulas are not converted. The existing internal unit represents millions of SC: 1600 displays as `SC 1.6B`.
- **Skyline Coins**: existing persistent gold coins used for Shop purchases, premium Season unlocks, cosmetics, and other collection rewards. Coin balances and purchase paths remain unchanged.

All countries now use the same display for match cash in the **web** implementation. Country identities, names, locations and quiz answers stay unchanged.

## Ways to earn SC

### Inside a normal match
The existing game already awards cash for passing Start, collecting rent, profitable trades, some cards, events and other ordinary property-game mechanisms. No new currency is minted for these activities: their normal payouts are merely displayed in SC.

### Additional seasonal earned SC reserve
- Every **fifth FREE Season tier claimed** gives **40 million SC** to a device-local reserve, in addition to the existing reward.
- Every **weekly challenge completed** gives **25 million SC** to that reserve, in addition to existing Coins and XP.
- Both grants rely on existing once-only Season claim and weekly completion flags. They cannot be awarded by reopening the screen.

### Optional solo practice use
- The Season screen shows the cash reserve and a toggle, **Use SC in next solo game**.
- The next *new*, offline/non-simulated solo game consumes up to **100 million SC**, never more than 10% of the selected player’s normal starting cash.
- Bonuses are disabled for online games; resumed games cannot claim a new starting bonus.
- Assisted games are **practice matches**; progression tracked through `trackable()` is disabled (no match XP, trophies, weekly completion, or leaderboard result).
- The reserve is not real money and cannot buy Skyline Coins or Shop items.

Reserve balances and claim flags are device-local, not server-authoritative. **Do not treat them as competitive-wallet, purchase, or entitlement data.**

## Scope

Web-only file: `skyline-estates/lib/skyline-currency.js`. Installed by `skyline-estates/build.py` after core declarations and before the boot invocation in all six generated web pages. Native, iOS and TestFlight release workflows are unchanged. This deliberately avoids altering core math and preexisting saves.

## Completion and validation — 2 November 2026

- Regenerated all six web entry pages and offline manifest using `python3 skyline-estates/build.py`; `--check` passes.
- Fixed eligibility: only a fresh `newGame` instance with exactly one human can consume reserve. Legacy/current saves, pass-and-play, online seats and simulations cannot. Assisted-save status survives reload and keeps normal rewards disabled.
- Kept the reserve panel below the reward tracks so existing free/premium rows remain visible; its button has a 44px minimum touch target.
- Currency unit checks pass, including once-only grants, resume/multiplayer exclusion, 10% / SC 100M caps and replay prevention.
- Real generated-page currency browser suite: 52 checks each in Chromium and WebKit at 956x440, 844x390 and 844x320. Lagos/Stockholm saves retain cash/ownership; claims, reserve use, assisted reward suppression, account coin isolation, touch control and dock clearance pass.
- Existing tests passed locally: 175 simulated games / 56 regressions; 41 save recovery; 10 turn/save; 14 session; 45 remote-state; 12 online-room; 16 offline-worker; 19 offline-startup; 16 browser smoke; 35 human-flow; 19 complete-match checks. Existing WebKit visual suite: 81 checks across desktop and phone landscape, safe areas, all Shop categories and Season rows. Screenshots visually inspected.
- Existing offline-startup tests verify waiting-worker activation and updated cache, preserving saves. No cache-clearing/reset workaround.
- WebKit is Safari-engine desktop automation, **not physical iPhone Safari**. Real toolbar/orientation behavior needs owner confirmation on the deployed website.
- Installed native apps load bundled `www/index.html` from `game.html`, not the generated Pages entry. `game.html`, native config and native workflows are unchanged. The extra currency module is not imported by native pages. No IPA, native build, TestFlight upload or App Store action is part of this release.
- Native automatic workflows must be suppressed with `[skip actions]` on source and merge commits; run only web stability/Pages validation manually as needed. Check the remote CI/deployment results before calling the release complete.

## Notes on future expansion

The current SC reserve is intentionally limited to opt-in solo practice to keep ranked and social competition fair. Do not route earned SC into online/ranked starting money. Future Market Pulse, Skyline Showcase and social competition are separate work items.

## Web display correction after PR #93 — 2 November 2026

The deployed PR #93 assets were current, but its formatter explicitly selected city currency when `G.online` was true. Its script also ran after boot had drawn the initial board. Cash-note animations and Catch the Cash bypassed `fmt` and used `CUR.pre` directly. These are presentation gaps, not missing match balances.

- The web formatter now uses SC in both local and online games. The web-only `applyCity` wrapper sets the display currency for note symbols too; country identities and educational quiz answers are unchanged.
- Currency installs before boot, retaining the existing boot declaration and its 2D fallback override. All generated aliases include the module exactly once.
- Existing saved/authoritative logs are translated in displayed text nodes only. Amounts are decoded using the original country's suffix and scale (including Japan's 0.1 multiplier). `G.log`, snapshots, rules and server files are not rewritten. Online controls continue sending numeric commands to the unchanged server.
- The generated offline manifest changes with the assets. The existing cache-first worker intentionally waits until all game tabs close before activating an update. Registration uses `updateViaCache: 'none'`. No cache/storage clearing, forced worker takeover or save migration is required. On iPhone: Save & exit, close all Skyline game tabs (and any standalone home-screen game), then reopen online to receive the updated copy.
- Local verification: currency unit and generated-entry checks; 79 currency browser checks in Chromium at three phone landscape heights; 19 actual offline startup/update checks; 41 save-recovery, 45 remote-state, 16 offline-worker and 10 turn/resume checks; 11 authoritative online-control browser checks. No runtime exceptions in the completed browser suites. Safari-engine and remote CI results are recorded with the release PR.
- Native/server source `game.html` and all native configuration/workflows remain unchanged. Source and merge commits use `[skip actions]`; manually run only web stability and Pages. No native/TestFlight/App Store build or backend deployment is part of this correction.
