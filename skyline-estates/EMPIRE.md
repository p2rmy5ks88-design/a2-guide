# Skyline Empire (Board 4): rules PROTOTYPE `empire-p1`

**Status: prototype for owner review. NOT approved and NOT a production ruleset.** Empire stays `playable:false` in `lib/career.js`. Nothing here changes Career, other boards' saves, native builds, TestFlight or online play.

- Code: `lib/career-empire-rules.js` (DOM-free, deterministic).
- Tests:
  - `tests/empire-rules.cjs`: 17 checks.
  - `tests/empire-lab-browser.cjs`: browser checks, run per engine.
  - `tests/empire-sim.cjs`: balance simulation.
- Playable lab: `empire-production-lab.html`.

## 1. Confirmed (repository registry and owner handoff, 19 Nov 2026)
- Board 4, Advanced. An asymmetric island of connected economic zones, centred on the Empire Tower.
- Higher buildings need supporting investment and infrastructure.
- **Victory:** complete three Empire milestones (economic strength, development achievement, strategic influence) and hold the lead. If nobody qualifies, a published score formula decides at a finite cap.
- **Five physical stages:** Plot → Low-rise → Mid-rise → High-rise → Skyscraper.
- **Own save slot:** `skylineEmpireSave`.
- **Board structure follows the approved Empire artwork** (owner direction): one winding loop of 44 spaces around the island, including the crown Empire Start. The track order is read space-for-space from Claude's art-matched `board_empire_44` asset; the browser test checks this match.

## 2. Zone mapping (PROPOSED: the handoff asks for this to be reviewed)
The six scenic zones from the art stay distinct on the board. Each one is mapped to one of the four economic systems from the earlier concept:

| Scenic zone (art) | Sites | Economic system |
|---|---|---|
| Finance | 8 | Commercial / finance |
| Innovation | 7 | Commercial / finance |
| Residential | 5 | Residential |
| Luxury | 3 | Residential |
| Trade | 6 | Transport / infrastructure |
| Culture | 5 | Landmark / strategic investment |
| Empire Tower | islet | Landmark / strategic investment (shared project) |

## 3. Turn cycle (handoff §2.2)
1. **Market review:** the HUD shows current demand per system, build cost, rental yield and the trend. A seeded, bounded market event resolves at the start of each round.
2. **Roll and move:** two dice; the token moves the exact total along the loop. Passing Empire Start pays the payday. The Roll Dice button is a genuine action here.
3. **Landing:** an unowned site must be bought or auctioned before the turn can end. Rent is paid on rival sites. Special spaces: City Event, Negotiation Desk, Market Exchange dividend, Fortune Roll.
4. **Allocate investments:** up to 2 actions, each either developing an owned site or investing in the Empire Tower. Negotiation offers are also possible.
5. **Milestone check:** every 2 rounds.

## 4. Prototype values (all PROPOSED / TEST-ONLY, from `BALANCE`)
| Parameter | Value |
|---|---|
| Start cash · payday | 1500 · 250 |
| Site prices | Trade 120 · Residential 130 · Culture 150 · Innovation 160 · Finance 200 · Luxury 220, +0/+10/+20/+30 by position |
| Build cost per stage | 0.55 × price × market build-cost modifier |
| Rent | price × [0.10, 0.35, 0.75, 1.30, 2.00] (Plot … Skyscraper) × zone demand × 1.5 if the owner holds the zone majority |
| Stage prerequisites | Low-rise: ownership. Mid-rise: 2 sites in the zone. High-rise and Skyscraper: zone majority **and** transport infrastructure (own a Trade site) |
| Market | 9 seeded events; demand and build cost move in 5% steps, bounded to 80–125%, and drift back towards 100% |
| Empire Tower | **shared landmark** with 5 funded stages costing 300 / 450 / 600 / 800 / 1000. Any player may invest (one investment action); every SC 35 earns 1 influence. The model is shown only up to the funded stage, with a crane and scaffold until complete |
| Influence | +5 per zone majority at each milestone check, plus tower investment |
| Milestones | economic: net worth ≥ 2600; development: ≥ 5 building stages including a Mid-rise; influence: ≥ 18 |
| Milestone victory | all three, plus net worth ≥ 105% of second place, at a check, from round 8 |
| Round cap | 20 (quick 15 / standard 20 / extended 28, all experimental) |
| Final score | net worth + 25 × influence + 150 per completed milestone; ties go to net worth, then lower seat |
| Auction · offers | sealed, minimum 50%, ties to the earliest bidder · offers in your landing zone, or for any site after a Negotiation Desk |

**Open:** the art's "2/5" milestone meter, "Hold 2 Contested Investments" and "Challenge" button are **not implemented**. The handoff says decorative numbers must not become rules without a decision, and Empire contests are undefined. The art's bridges are scenery; they are not movement edges.

## 5. Acceptance thresholds and results
Thresholds were set before the held-out run. Seeds 950000–950999, 1,000 AI matches per player count:

| # | Measure | Pass if | 4 players | 3 players | 2 players |
|---|---|---|---|---|---|
| 1 | Errors, stalls, illegal AI actions | 0 | 0 ✅ | 0 ✅ | 0 ✅ |
| 2 | Determinism and save/resume | always | ✅ | | |
| 3 | Seat balance | ±5 points of fair share | 25/25/25/26 ✅ | 30/35/35 ✅ | 50/50 ✅ |
| 4 | No milestone win before round 8 | 0% | earliest round 8 ✅ | 12 ✅ | 14 ✅ |
| 5 | Milestone victories happen | 10–60% | 26% ✅ | 20% ✅ | 12% ✅ |
| 6 | Close finishes (2nd ≥ 85% of the winner's score) | ≥ 20% | 57% ✅ | 56% ✅ | 49% ✅ |
| 7 | Comebacks | ≥ 20% | 50% ✅ | 45% ✅ | 32% ✅ |
| 8 | Empire Tower progresses | ≥ 1 stage on average | 3.5 ✅ | 2.7 ✅ | 1.9 ✅ |

These are AI-vs-AI figures, and bankruptcies never occurred in AI play. Human play is untested.

## 6. Open decisions
1. The zone→system mapping in §2.
2. Every value in §4.
3. Empire Tower ownership: shared funding is proposed.
4. Contested investments and a fourth or fifth milestone (the art shows 5).
5. Whether bridges become movement shortcuts.
6. AI difficulty levels.
