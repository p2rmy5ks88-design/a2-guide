# Skyline Dominion (Board 3): rules PROTOTYPE `dominion-p1`

**Status: prototype for owner review. NOT approved and NOT a production ruleset.** Dominion stays `playable:false` in `lib/career.js`. Nothing here changes Career unlocks, saves of other boards, native builds, TestFlight or online play.

- Code: `lib/career-dominion-rules.js` (DOM-free, deterministic).
- Tests: `tests/dominion-rules.cjs` (21 checks), `tests/dominion-lab-browser.cjs` (29 browser checks per engine) and `tests/dominion-sim.cjs` (balance simulation).
- Playable lab: `dominion-production-lab.html`.

Sources: `CAREER.md`, `lib/career.js` (registry preview text), `CAREER-FOUR-BOARDS-APPROVED-ART.md`, the owner's Dominion/Empire rules handoff (19 Nov 2026), and the approved Dominion artwork.

## 1. Confirmed (from the repository and the owner's handoff)
- Board 3, Intermediate. It's a hexagonal district-control network. Players move with **action points across connected districts**.
- Players own sites, negotiate, and contest control.
- Owning a site allows basic development. **Advanced buildings need district control.**
- **Victory:** hold the required districts, or lead on control points at the limit.
- **Five physical stages:** Plot → Low-rise → Mid-rise → High-rise → Skyscraper.
- **Career unlock (unchanged, still provisional in `career.js`):** 2 qualifying Circuit wins + 3 Circuit `district` challenges. A Dominion `negotiation` challenge feeds the Empire unlock.
- **Own save slot:** `skylineDominionSave`, never the Classic, Harbour Ring or Circuit slots.

## 2. Previously proposed (owner notes and handoff, not locked)
- A 30-node hexagonal network, with auctions, trades and contests.
- **Early win:** hold the target districts for **two successive scoring checks**. Otherwise, control points decide at a finite round cap.
- A 16-round match (from the ChatGPT notes). This is not approved, and **the Origins 20/30/40 lengths are deliberately not reused.**

## 3. Topology (follows the approved Dominion artwork; validated by tests)
Owner direction (19 Nov 2026): the board structure must come from and resemble the approved Dominion image. Ruleset `dominion-p1` therefore replaces the earlier 30-node proposal (`dominion-p0`, superseded) with the artwork's layout: 61 nodes with stable IDs and 72 edges, all connected (tested).

| Type | IDs | Count |
|---|---|---|
| Hexagonal outer track | `S0`–`S47`, a loop | 48 |
| ↳ property sites | Heritage 6, Global 3, Innovation 6, Cultural 3, Market 6, Harbor 3, Financial 6, Greenbelt 3 | 36 |
| ↳ gold gateway badges (corners) | `S0` Heritage (chart), `S8` Global (bank), `S16` Cultural (masks), `S24` Market (chart), `S32` Harbor (anchor), `S40` Greenbelt (leaf) | 6 |
| ↳ specials | `S4`/`S28` City Event (?), `S20` Market Dice, `S36` Negotiation Desk, `S12`/`S44` Contest Square | 6 |
| District plazas (the eight hex territories) | `H_<district>`, each bridged to one gate site on the track and to the Central District | 8 |
| Central District hub | `central` | 1 |
| Contest exchanges (the red shields between territories) | `C1` Global–Innovation, `C2` Heritage–Global, `C3` Cultural–Market, `C4` Financial–Greenbelt | 4 |

The track order and space types are taken space-for-space from Claude's art-matched `board_dominion_48` asset; the browser test checks this match.

## 4. Prototype values (all PROPOSED / TEST-ONLY, from `BALANCE`)
| Parameter | Value | Note |
|---|---|---|
| Start cash · AP per turn | 1200 · **7** | Moving one edge costs 1 AP. Buy, develop, contest, auction and offer cost 1 AP each |
| Income at turn start | 80 + 40 per controlled district | |
| Site prices | Greenbelt 90 · Heritage 100 · Market 110 · Harbor 120 · Cultural 130 · Global 150 · Innovation 170 · Financial 180, +0/+10/+20 by position | |
| Build cost per stage | 0.6 × price | One upgrade per site per turn |
| Toll (on entering an opponent site) | price × [0.12, 0.30, 0.60, 1.00, 1.60] for Plot … Skyscraper | |
| District control | **strict majority**: 2 of 3, or 4 of 6 sites | Computed from ownership only |
| Advanced stages (Mid, High, Sky) | need district control | Losing control **never removes buildings**; it only blocks further advanced upgrades |
| Track effects (once per space per turn) | Gateway +30 · Market Dice: seeded roll × 20 · City Event: seeded, one of +100 / −60 / +60 / +1 AP | |
| Contested acquisition | pay the owner 1.25 × (price + building value); the building transfers intact; one contest per turn | Needs a site in this or a neighbouring district, or a visit this turn to a contest exchange, Contest Square or the Negotiation Desk (Desk: any district) |
| Contest protection | High-rise and Skyscraper cannot be contested; a contested site is protected for 2 rounds | |
| Auction | sealed, one bid each; minimum 50% of price; ties go to the earlier bidder | |
| Negotiation offer | minimum = price + building value; one offer per site per turn; the owner accepts or declines | |
| Scoring | every 2 rounds: 3 CP per controlled district + 1 CP per Mid-rise-or-higher site | |
| Early victory | 3 controlled districts at **2 successive scoring checks**, not before round 6 | |
| Round cap | 16 (quick 12 / standard 16 / extended 24, all experimental) | |
| Ranking and tie-breaks | CP → net worth → lower seat | |
| Turn order | seeded first player; the start seat rotates every round; tokens start on gateways spread around the track | |
| Bankruptcy | buildings, then sites, are sold at 50%; a player who still can't pay is out | |
| Negotiation challenge (for the Empire unlock) | recorded once per match when an accepted offer at ≥ list price gives the buyer district control | |

## 5. Results (held-out seeds 900000–900999, 1,000 AI matches each)
| # | Measure | Pass if | 4 players | 3 players | 2 players |
|---|---|---|---|---|---|
| 1 | Errors, stalls, illegal AI actions | 0 | 0 ✅ | 0 ✅ | 0 ✅ |
| 2 | Determinism and save/resume | always | ✅ | | |
| 3 | Seat balance | ±5 points of fair share | 25/26/26/23 ✅ | 34/31/34 ✅ | 50/51 ✅ |
| 4 | No early win before round 6 | 0% | earliest round 12 ✅ | 12 ✅ | 14 ✅ |
| 5 | Early control victories | 10–70% | 13% ✅ | 28% ✅ | 12% ✅ |
| 6 | Close finishes | ≥ 20% | 63% ✅ | 55% ✅ | 55% ✅ |
| 7 | Comebacks | ≥ 20% | 35% ✅ | 23% ✅ | 23% ✅ |
| 8 | Contests per match | ≥ 3 | 14.3 ✅ | 9.8 ✅ | **0.1 ❌** |

**Two players fails #8**: with only two players, the AI rarely needs to contest. This needs a decision (a stronger AI or a rule change). All figures are AI-vs-AI; human play is untested.

## 6. Open decisions for the owner
1. Approve or replace every value in §4, especially AP per turn, the contest formula and protection, the targets and the round cap.
2. Should Dominion's match lengths stay at 12/16/24 rounds, or be decided after playtests?
3. Fix the 3-player victory target (§5 #5).
4. The track's property names and prices; the bridges from plazas to gates; the two-player contest rate.
5. AI difficulty levels: there is currently one policy.
6. When to wire Dominion into the Career registry (handoff Phase 5, after approval).
