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

Web-only file: `skyline-estates/lib/skyline-currency.js`. Loaded after the existing menu layer by `skyline-estates/build.py` when creating the generated web pages. Native, iOS and TestFlight release workflows are unchanged. This deliberately avoids altering core math and preexisting saves.

## To finish this implementation

1. From the repository root, run: `python3 skyline-estates/build.py`.
2. Run `python3 skyline-estates/build.py --check`.
3. Run `node skyline-estates/tests/currency-sc.cjs` and the existing browser/gameplay tests.
4. Test an existing Lagos save and a Stockholm save: verify `SC` replaces ₦/kr but amounts are identical.
5. Test Season tier 5 once, re-open and re-claim (no duplicate); finish a weekly challenge twice (no duplicate).
6. Toggle and start an offline solo match; verify the cash bonus and no progression; verify online and resumed games never gain extra cash.
7. Test in actual iPhone Safari landscape, including the Season card, coin balance label and cache update.
8. Merge only after tests are green and web screenshots are checked. Deploy GitHub Pages web only; **do not change TestFlight**.

## Notes on future expansion

The current SC reserve is intentionally limited to opt-in solo practice to keep ranked and social competition fair. Do not route earned SC into online/ranked starting money. Future Market Pulse, Skyline Showcase and social competition are separate work items.
