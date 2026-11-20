# City Ventures — The Living Market (Career Board 2)

Replaces Skyline Circuit (owner decision 20 Nov 2026). Code: `lib/city-ventures-rules.js` (rules), `city-ventures.html` + `city-ventures-renderer.js` (3D board). Tests: `tests/city-ventures-rules.cjs`, `tests/city-ventures-browser.cjs`, `tests/city-ventures-career.cjs`.

**Implementation notes:** City Value subtracts outstanding mortgages and an unpaid Private Investor loan; Transit rent 30 / 60 / 120 CC by stations owned; the Career result pays 5× normal match coins and earned SC.

---

# CITY VENTURES — THE LIVING MARKET
## Playable Rules & Design Contract — v1.0 draft

This is an **original gameplay proposal**, not proof that no similar mechanics exist. Keep the approved hexagonal board and City Ventures visual identity.

### Game objective
Build the most valuable city property empire by buying districts, upgrading properties, using market powers, trading, and surviving opponents' rents. The winner is the solvent player with the highest City Value after **18 personal turns each**, or the last solvent player. A quick match uses 10 turns each.

### Setup
- 2–4 players, each with a colored 3D token and visible player panel.
- Each player begins at START with **3,000 CC (City Cash)**.
- Highest opening roll takes first turn. Turns run in a consistent order.
- Use two six-sided dice. Doubles do **not** grant another turn.
- No Start Charter on initial placement. Players get 200 CC only by passing/landing Start via normal dice movement.
- Board is a **37-tile, single-path, six-corner hexagon**; exact tile IDs and names are in `board_topology_37_tiles.json`.

### Turn sequence
1. Highlight active player and enable Roll Dice.
2. Roll 2 dice and calculate route steps.
3. Animate the token physically along indexed tiles, following it with the close tracking camera.
4. Resolve arrival: purchase/auction, rent, utility, transit station, tax, event, or one of six corner choices.
5. Allow remaining eligible action-phase trades, card use, and upgrades.
6. Require explicit End Turn and advance to next active player.

### Property acquisition and rent
- Landing on an unowned property lets the player **Buy** at the displayed price or **Decline**, which starts an open auction. Owning your own property incurs no rent.
- Each color district consists of **three** properties. Owning at least two in a district unlocks Low-rise and Mid-rise construction on properties you own; owning all three unlocks Landmark construction.
- Development sequence is Plot → Low-rise → Mid-rise → Landmark, with base rent multipliers 1×, 2×, 4×, 7×. Completing all three properties adds a +25% district rent modifier.
- Purchase prices, base rents, and upgrade costs are illustrative balancing defaults, not final tested economy values. Refer to the topology JSON.
- Transit stations are purchasable. Base rent is 30 CC, multiplied by the count of stations owned by the owner. Utilities charge 4× dice total for one, 8× for two, 12× for three owned. This board has three utility stations.
- Taxes: 125 CC, Fees: 90 CC, paid to the bank.

### Six signature corner powers
Each landing brings up a **real player choice**, not automatic outcome. The active player must select a visible option.

**1. START — Claim the City Charter**
Normal pass or exact landing pays 200 CC once. Exact landing additionally offers **one** one-use charter: Developer (up to 150 CC off next eligible upgrade), Investor (up to 100 CC off next property purchase), or Protector (up to 150 CC off next rent paid). Only one Charter may be held, and it expires when the player next crosses Start.

**2. FREE LOUNGE — Defend or plan**
Choose Rent Shield (one use, up to 300 CC on next rent, expires after next personal turn) **or** Strategic Preview (view next 3 Opportunity cards, keep one, return two to bottom; hand limit 2).

**3. CIVIC REVIEW — Govern the city**
Choose Development Drive (20% off all construction costs for one full cycle, plus a one-time eligible immediate upgrade for the chooser) **or** Tenant Protection (30% less rent citywide for one full cycle). A new Civic effect replaces the previous Civic effect.

**4. MARKET BOOM — Manipulate the market**
Select a property district, then choose Launch a Boom (+50% rent in selected district) or Trigger Correction (−40% rent in selected district) for one full cycle. A new Market effect replaces the previous Market effect.

**5. SKYLINE EXCHANGE — Compete for properties**
Choose Open Auction (pick any unowned property and invite all players to bid; if another player wins, initiator receives 50 CC introduction fee) **or** Deal Desk (offer a voluntary property/cash trade, only completed upon both players accepting; both receive 50 CC bank rebate upon completion).

**6. TRANSIT HUB — Reroute or collect**
Choose Express Route (pay 75 CC, physically travel to one of three Transit stations and resolve arrival; no Start payment or further Corner activation from the transfer) **or** Transit Dividend (80 CC per Transit station owned, max 240 CC).

### Events and held cards
Opportunity and Civic card decks are represented in the approved board visuals. Use **Opportunity** for playable chance/strategy cards and **Civic** for narrative/event policy cards if desired; the baseline rule set uses the corner for Civic policies. Keep the deck roles distinct in the implementation to avoid double-triggering ordinances.

Example Opportunity effects: Skyline Tender (auction on bank property), Construction Rush (25% off one eligible upgrade), Neighborhood Spotlight (next rent from one owned property doubled, bonus capped at 300 CC), Private Investor (take 300 CC now and repay 350 CC after next passage through Start), Infrastructure Windfall (station owners each gain 100 CC), Community Grant (choose 150 CC or 200 CC one-use upgrade discount).

### Duration and stacking
- A 'full cycle' starts after the activating landing and ends when the activating player finishes their **next** normal turn, so opponents receive one opportunity to react.
- At most one Citywide Civic ordinance and one district Market event may be active. Both may affect rent; if so apply property stage and complete-set bonuses first, then Market district factor, then Civic citywide factor; round final rent to a whole CC.
- Effects never change printed acquisition prices or City Value.
- Express travel is not an additional dice roll and may not activate another Corner power.
- All duration indicators and affected districts are visible to all players.

### Trading, mortgages, bankruptcy
During action phase, players can offer a cash/property exchange requiring both approvals. If unable to pay, sell building upgrades back to the bank for 50% original upgrade spend, or mortgage properties for 50% of printed price. Mortgaged properties collect no rent and cost principal + 10% to redeem. If debts remain unpaid after all permitted funding actions, player is eliminated.

### Match-end scoring
City Value = remaining CC cash + printed price of all owned assets + 80% of spend on retained upgrades + 200 CC for each complete district + 150 CC for each Landmark. Ties: most complete districts, then most cash.

### Camera, touch, polish
Close, natural 3D tracking inspired by the physical board feel in **classic Skyline Estates**, rather than a distant isometric simulator. Follow one token tile by tile, ease through corners, keep nearby properties readable, animate 3D buildings, highlight destination, and gently push toward the corresponding tile interaction. Desktop/tablet get persistent HUD panels, iPhone landscape gets collapsible side panels and accessible roll/end controls. Render dynamic resolution at device pixel ratio, target 60 FPS where feasible without promising untested hardware performance.

### Design QA
- All 37 tiles addressable; every tile is tappable and valid token landing position.
- Six corner choices are interactive and persist exact outcomes.
- Card, rent, build, auction, and trade actions log properly.
- No overlapping controls at mobile safe areas; no clipped or microscopic text.
- Keyboard/pointer/touch all supported; animations respect reduced-motion settings.
- Economy, durations, and scores tested via deterministic seed/match simulations before release.
