# Skyline Dominion (Board 3): rules PROTOTYPE `dominion-p0`

**Status: prototype for owner review. NOT approved and NOT a production ruleset.** Dominion stays `playable:false` in `lib/career.js`. Nothing here changes Career unlocks, saves of other boards, native builds, TestFlight or online play.

- Code: `lib/career-dominion-rules.js` (DOM-free, deterministic).
- Tests: `tests/dominion-rules.cjs` (20 checks) and `tests/dominion-sim.cjs` (balance simulation).
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

## 3. Topology (proposed, validated by tests)
There are 30 nodes with stable IDs and 45 undirected edges. The graph is connected (tested).

| Type | IDs | Count |
|---|---|---|
| Central exchange (starts and hubs) | `central_1` (east), `central_2` (west) | 2 |
| Property sites | `<district>_1..3` for `innovation, cultural, market, harbor, financial, greenbelt, heritage, global` | 24 |
| Contest exchanges (neutral) | `contest_1` Global–Innovation, `contest_2` Cultural–Market, `contest_3` Financial–Greenbelt, `contest_4` Heritage–Global | 4 |

Edges:
- **Within each district:** the three sites form a triangle.
- **To the centre:** each district's `_1` site links to its central hub. Cultural, Market, Harbor and Financial link to `central_1`; the other four link to `central_2`. The two hubs link to each other.
- **Between neighbouring districts:** the clockwise neighbours link `d_2` → `next_3`. Four of these borders run through a contest exchange.

The board positions come from Claude's `board_dominion_30` asset layout (`dominion_30.json`). The lab test checks that rule edges and layout links match.

## 4. Prototype values (all PROPOSED / TEST-ONLY, from `BALANCE`)
| Parameter | Value | Note |
|---|---|---|
| Start cash | 1200 | |
| Action points per turn | **5** | Move = 1 AP. Buy, develop, contest, auction or offer = 1 AP each |
| Income at turn start | 80 + 40 per controlled district | |
| Site prices | Greenbelt / Heritage 80 · Market / Harbor 110 · Cultural / Global 140 · Innovation / Financial 180; `_1` gate site +20 | On Circuit's price scale |
| Build cost per stage | 0.6 × price | One upgrade per site per turn |
| Rent (toll on **entering** an opponent site) | price × [0.12, 0.30, 0.60, 1.00, 1.60] for Plot … Skyscraper | |
| District control | owner of **≥2 of 3** sites | Control is computed from ownership, never from UI colours |
| Advanced stages (Mid, High, Sky) | need district control | **Losing control never removes buildings**; it only blocks further advanced upgrades |
| Contested acquisition | pay the owner 1.25 × (price + stages × build cost); the building transfers intact | |
| Contest eligibility | own a site in this **or a neighbouring** district, or have visited a contest exchange this turn | One contest per turn |
| Contest protection | **High-rise and Skyscraper cannot be contested**; a contested site is protected for **2 rounds** | |
| Auction | any player on an unowned site may open one (1 AP). Everyone solvent bids once, sealed. Minimum is 50% of price; the highest bid wins (ties go to the earlier bidder after the opener) | |
| Negotiation offer | buy an opponent's site in your district or a contest-reachable one. Minimum is price + building value; one offer per site per turn; the recipient accepts or declines | AI accepts at ≥1.25 × value, or ≥1.8 × if it would lose control |
| Scoring | every **2** rounds: 3 CP per controlled district + 1 CP per Mid-rise-or-higher site | |
| Early victory target | 4 districts (2 or 3 players) / 3 districts (4 players), held at **2 successive scoring checks**, not before round 6 | |
| Round cap | 16 (lengths: quick 12 / standard 16 / extended 24, all experimental) | |
| Final ranking / tie-breaks | control points → net worth (cash + prices + build value) → lower seat | |
| Turn order | seeded first player, shown at the start; the start seat rotates every round | |
| Bankruptcy | buildings, then sites, are sold to the bank at 50%. If a toll still can't be paid, the player is out and their sites return unowned | |
| Negotiation challenge (for the Empire unlock) | recorded once per match when an **accepted offer at ≥ list price** gives the buyer district control | |

## 5. Acceptance thresholds and results
Thresholds were written before the held-out run. Seeds 900000–900999, 1,000 AI matches per player count:

| # | Measure | Pass if | 4 players | 3 players | 2 players |
|---|---|---|---|---|---|
| 1 | Errors, stalls, illegal AI actions | 0 | 0 ✅ | 0 ✅ | 0 ✅ |
| 2 | Determinism (same seed gives the same hash; a resumed save finishes identically) | always | ✅ (rule test) | | |
| 3 | Seat balance (identical AIs) | within ±5 points of fair share | 25/25/25/25 ✅ | 31/34/35 ✅ | 52/49 ✅ |
| 4 | No early wins before round 6 | 0% | earliest round 8 ✅ | 14 ✅ | 14 ✅ |
| 5 | Early control victories happen | 10–70% | 63% ✅ | **7% ❌** | 12% ✅ |
| 6 | Close finishes (2nd ≥ 85% of the winner's CP) | ≥ 20% | 76% ✅ | 64% ✅ | 69% ✅ |
| 7 | Comebacks (winner ≠ halfway leader) | ≥ 20% | 48% ✅ | 21% ✅ | 28% ✅ |
| 8 | Contested acquisitions happen | ≥ 3 per match | 15.6 ✅ | 12.8 ✅ | 7.8 ✅ |

**Three players fails #5.** A 4-district target is rarely held there; a 3-district target overshoots (≈80%). A per-count target or hold rule needs an owner decision.

These are AI-vs-AI figures. Human play and difficulty levels are untested.

## 6. Open decisions for the owner
1. Approve or replace every value in §4, especially AP per turn, the contest formula and protection, the targets and the round cap.
2. Should Dominion's match lengths stay at 12/16/24 rounds, or be decided after playtests?
3. Fix the 3-player victory target (§5 #5).
4. The 30-node topology, and the zone mapping to the approved art (eight districts + centre).
5. AI difficulty levels: there is currently one policy.
6. When to wire Dominion into the Career registry (handoff Phase 5, after approval).
