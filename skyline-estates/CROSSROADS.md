# CROSSROADS CAPITAL — LANDMARK CHASE
## Complete original game-design proposal · Version 1.0

**Authority:** This file defines the NEW gameplay rules. The original approved Crossroads Capital double-loop art is the board-shape / palette authority. The new widescreen artwork is a visual framing concept, not permission to redesign that approved board.

### Identity and difference from earlier concepts
Landmark Chase is **not City Ventures: The Living Market** (no temporary city ordinances and no six-corner powers), and is **not Crossroads Capital: Route Wars** (no Influence, Momentum, paid loop-entry tolls, or route-control victory points).

Its signature mechanic is the **Landmark Chain**: make three different achievements across a living city, complete a personal development brief, and unveil a miniature 3D landmark in the world. The buildings and town physically remember what players accomplished. Routes matter because they help reach useful categories of tiles, but the strategic goal is **to develop the most celebrated city**, not to trap opponents or collect tolls.

**Design objective:** Nearly every dice landing causes a consequential choice, without endless forced menus. Essential actions stay player-controlled. Landing dialogs show a maximum of two prominent choices plus a details button.

## 1. Goal, setup, timing
- Players: 2–4; local pass-and-play first; CPU and network turns later.
- Starting budget: **3,000 City Cash** each, **one active Landmark Chain** selected from two randomly offered cards.
- Board: two connected loops (Riverside/West and Highland/East), sharing **Start/Payday**, **Grand Exchange**, **Skybridge Bonus**. See `gameplay/board_graph.json` for a **proposed implementation path**. Source artwork is decorative and must not be used as movement data.
- One active project per player by default. Maximum one completed-but-unclaimed project. Player may replace their unfinished project at Grand Exchange.
- Normal match: **15 turns per player** (3 chapters of 5 turns/player). Quick match: **9 turns/player** (3 chapters of 3 turns/player). Counts are per player, not total turns.
- Bank starts with unlimited currency for local play. Players never need internet connectivity to move, buy, or win.
- Opening turn: each player places a unique unmistakable 3D token on Start; choosing the initial loop is done when the player first leaves Start. No salary or exact-landing Start bonus at initial placement.
- Dice: two ordinary six-sided dice; no extra turn for doubles. Dice determine exact step movement. No optional extra movement unless a card explicitly grants it.

## 2. Signature mechanic — Landmark Chains
At match setup the player chooses one of **two** randomly offered three-stage Landmark Chains. Each stage has an **ordered, achievable objective** that the player must deliberately pursue. Examples:

**River to Ridge**
1. Acquire or upgrade a Riverside property.
2. Land on Grand Exchange (exact landing).
3. Acquire or upgrade a Highland property.

**City Renewal**
1. Own at least two different properties.
2. Upgrade any one of them.
3. Land on a Utility, Metro, or Skybridge tile.

**Connected Communities**
1. Land on Metro West or Metro East.
2. Own a property in the *other* loop.
3. Complete a purchase or upgrade there.

**Community First**
1. Visit an Event or Tax tile.
2. Buy/upgrade one property.
3. Reach Start exactly or pass Start normally.

A stamp is awarded **once** for each objective when satisfied on or after its stage becomes active. Requirements involving ownership may be checked at the start of a turn and after property changes. Later-stage conditions cannot be completed retroactively from earlier actions unless the card says so.

**Completing three stamps** creates a claimable Landmark. The player receives **5 Legacy Points** and **200 City Cash** upon claiming it. At most one claim can be performed per turn. Claim via a **Ribbon Cutting** button immediately in the player's action phase, or by landing on Skybridge to earn an extra **1 Legacy Point** when claimed there. A distinctive public miniature (library, conservatory, marina, gallery, amphitheater) appears in the central city, selected from the card's artwork. Completed landmarks are decorative and scoring assets, not escalating passive rent engines.

On a claim the player draws two new project briefs and chooses one, keeping the strategic loop alive. Three completed landmarks per player are visibly represented; later completions update the player's trophy gallery without overcrowding the board.

**Comeback safeguard:** Every player who ends a chapter with zero completed Landmark Chains receives one chance to replace their current brief from two choices. It is a mission reroll, *not* free cash or secret rubber-banding of dice.

## 3. The chapter system: public City Headlines
The match has three distinct chapters, each lasting five full turns per player (quick match: three). At the beginning of each chapter, reveal **one shared headline** from a shuffled civic deck. The headline creates a *public contest* any player can win, one time only, with visible progress:
- **Waterfront Revival:** First to upgrade a Riverside property wins 2 Legacy Points.
- **Higher Ground:** First to acquire a Highland property wins 2 Legacy Points.
- **Transit Week:** First to land on both Metro stations (across turns) wins 3 Legacy Points.
- **Neighborhood Revival:** First to finish a Landmark Chain during this chapter wins 2 Legacy Points.
- **Open House Weekend:** First to visit two different owned properties during this chapter wins 2 Legacy Points.

Headlines **do not** raise rent, create tolls, change purchase prices, or duplicate Route Wars systems. They introduce fresh goals and visible environmental flourishes (boats, banners, gardens, lanterns) without confusing the property economy. A chapter winner does not block other players' personal projects.

## 4. Turn order and movement
1. Start player turn; show active player and personal project progress.
2. Player may choose next loop **only when permitted at Start or Grand Exchange**; this is separate from dice movement. If route selection is pending, make it before a move reaches a fork.
3. Player taps **ROLL**; show physical dice and determined results.
4. Physical pawn moves one node at a time, with the camera following closely. Stops at every special-junction decision *when the movement graph requires a choice* and then continues the remaining rolled pips.
5. Passing Start by ordinary dice movement pays **200 City Cash** at most once per roll; initial placement and transport jumps pay nothing.
6. The landing tile is resolved exactly once; tile ownership, rent, project stamps and optional landing power are determined.
7. Active player may use **Build**, **Trade**, **Contracts**, and **Claim Landmark** if eligible.
8. End Turn is enabled after mandatory costs, purchases/auctions and choice panels are settled.

Never move a piece automatically during a normal turn without the player pressing Roll; never randomly resolve a property purchase or an offer for a human player.

## 5. Every landing matters — tile-specific consequences

### A. Unowned property
**Acquire** at printed price and immediately test active chain stamps; or **Reserve** for a 25% non-refundable deposit (credited against purchase), giving first right of purchase only until the end of that player's next turn. Max one reservation per player; a reserved tile cannot be auctioned until reservation expires or is waived. If neither is chosen, offer a short bank auction open to all. To avoid loop stalls, a player may choose *Auction* directly.

### B. Your property
Choose **Open House** to collect **50 City Cash** (once per property per chapter), or **Upgrade** one building stage at the printed development cost. Both actions can advance matching project stages. No free upgrade is invented.

### C. Rival's property
Mandatory rent is paid first unless property is mortgaged. Then the visitor chooses **Scout** (reveal the next two project briefs and replace the active unfinished brief, no ownership changes) or **Offer a Deal** (open voluntary trade; owner may decline). Neither action cancels rent. This is constructive interaction, not automatic theft.

### D. Grand Exchange
Exact landing offers **Commission Desk** (claim a completed Landmark Chain immediately, without Skybridge bonus), **Design Desk** (replace unfinished project after seeing two choices), or **Property Auction** (start one public auction of any unowned, unreserved property). Also register a route preference for the next loop; there are **no tolls or Influence points**.

### E. Skybridge Bonus
Choose **Ribbon Cutting** (+1 Legacy Point when claiming an already completed chain), **City Grant** (+180 City Cash), or **Creative Brief** (draw two new chains and replace active unfinished one). Never claim an uncompleted mission; do not auto-award bonus just for passing.

### F. Start / Payday
When passed by normal movement, pay the 200 salary only. On **exact landing**, also choose **Bonus Pay** (+100), **Project Brief** (refresh active incomplete chain from two choices), or **Builders' Voucher** (a one-use 100 discount on the next upgrade; expires at the end of the next personal turn). A movement can earn salary and exact landing benefit, but not multiple salaries.

### G. Metro West / Metro East
Choose **Express Visit** (pay 75, travel to the opposite Metro, resolve only the destination's normal tile effect, with **no further Express** on that turn) or **Neighborhood Survey** (reveal the two active City Headline objectives, then receive a small fixed 60 City Cash travel grant). The Metro stations are **public, non-purchasable** in this mode. No entry tolls.

### H. Utility Waterworks / Power Grid
Utility is purchasable and rent-bearing. Unowned: buy or auction, as for property. Rival-owned: pay rent using final dice sum × 10 (one utility) or × 18 (both). Your own utility: choose **Efficiency Inspection** (one use 60 discount on next upgrade, cannot stack vouchers) or **Income Credit** (+50 City Cash). Landing on a Utility may progress chain tasks; no global power effect.

### I. Event Card
Draw **two face-up City Moments**, choose **one** to resolve, place both cards at deck bottom in the displayed order. Examples: **Pop-up Festival** (+100 Cash or +1 Legacy Point), **Renovation Crew** (spend 100 to advance any owned property by one stage with printed development cost reduced by 100, floored at zero), **Community Award** (earn 1 Legacy Point if you own properties in both loops, else 80 Cash). No forced catastrophic outcomes.

### J. City Tax
Pay **200** to the bank, or contribute **250** to the civic fund and receive **1 Legacy Point**. Both options are deterministic and visible prior to confirmation. No additional hidden penalty.

### K. Development Fee
Pay **150** to the bank and receive a one-use 100 upgrade voucher, or pay **200** and receive **1 Legacy Point**. This becomes a trade-off between investment and prestige.

### L. Mortgaged property
Mortgaged tile charges no rent and cannot be upgraded until redeemed. A player landing on another player's mortgaged property can still Scout or offer a voluntary deal.

## 6. Buildings, districts, and cash
Properties retain color sets and named tiles from the approved board image. Standard stages: **Plot → House 1 → House 2 → House 3 → House 4 → Landmark Residence / Hotel**. Buildings are visible 3D meshes on the properties, not text-only counters. Upgrades require ownership and affordability; completion of full color groups is recommended for the final Hotel stage. Printed per-tile costs and rents live in `gameplay/board_graph.json` and may be balance-tested independently of appearance.

Building-stage rent guideline: plot = printed base rent, house 1 = 2×, house 2 = 3.5×, house 3 = 5×, house 4 = 7×, hotel = 10×, rounding to whole Cash. Owning all properties of a color group earns a **+20% rent multiplier**, applied once. No temporary global rent policy.

**Utility rent** uses dice sum as described above; two-utility bonus does not affect printed ownership price.

If the payer cannot afford rent, they may sell houses back for 50% of their printed build cost, mortgage property for 50% of purchase price, or propose a permitted cash/property trade before bankruptcy. A mortgaged property cannot be traded without showing the debt amount to both players. Remaining debts after liquidation cause bankruptcy.

## 7. Cards, contracts, auctions and player consent
- At most **one unfinished Chain** and **one completed unclaimed Chain** per player.
- An offered property trade requires active explicit acceptance by both sides. Never auto-sell another player's asset.
- Auctions: bank offers a public item with an opening bid equal to 50% of its printed purchase price, bid increments of 20, and 20-second optional human timer; if not implemented, use an explicit pass/raise turn sequence. A player cannot bid more cash than available. On a tie no bids can be simultaneous in offline pass-and-play.
- Card deals require explicit confirmation. City Moment choice is final when clicked.
- Maximum one upgrade voucher held per player; newest voucher replaces previous after confirmation, never stack.
- All move and mission logic should be deterministic and testable with a seeded deck and dice.

## 8. Victory and replayability
After all players have completed **15 personal turns** (or 9 in quick mode), calculate:
- **Legacy Points** earned from completed Landmark Chains and public Headlines.
- **+2 Legacy Points** for each complete property color group.
- **+1 Legacy Point** for each building at stage House 3 or above (once per property).
- **+floor(Net Worth / 500) Legacy Points**, where Net Worth = cash + printed purchase value of owned properties and utilities + 50% of completed upgrade spend − outstanding mortgages.

The highest score wins. Tie-breakers: more completed chains, then higher net worth, then more cash. If one solvent player remains, that player wins immediately. Display transparent scoring and a highlight reel of landmarks the players built.

**Why it invites return play:** Shuffled personal briefs and public City Headlines create different combinations, physical city landmarks persist during the match, all players see progress toward goals, and route choice matters without relying on hostile tolls or arbitrary global rent chaos.

## 9. Example three-turn story
Alex buys Rivergate Avenue, completing Stage 1 of **River to Ridge**. Mia lands on an owned property, pays rent, and chooses **Scout**, swapping to a more reachable contract. Alex later lands on Grand Exchange and earns the Stage 2 stamp. Next Alex upgrades Highland Residences, finishes the Chain, and chooses to claim now for 5 points or take a risk and visit Skybridge for a sixth point. Alex chooses a new brief, and a visible 3D marina landmark appears on the waterfront. The board changed because of strategic decisions, not because an animation ran on its own.

## 10. Critical fairness limits
- Players can gain at most **one mission stage per independent action trigger**, not multiple from the same landing.
- Project stage completion cannot retroactively count actions taken before stage activation.
- A player may claim at most **one Landmark per personal turn**.
- Express movement never awards passing Start salary, never triggers another Express, and never reactivates a special hub power.
- Players cannot hold multiple reservations or stacking upgrade vouchers.
- Timers, wait states, disconnect handling, and save restoration must preserve exact chain progress and payment obligations.
- Screens must never invent new cash, points, wins, or project progress merely to animate the UI.
