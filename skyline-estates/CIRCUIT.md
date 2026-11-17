# Skyline Circuit — headless prototype (research)

Status: rules research only. No artwork, camera, HUD or production UI. The dual-ring identity is fixed; the node layout below is the **mechanical** topology that the visual design must respect. All numbers are provisional until simulation and owner approval.

## Acceptance thresholds (written before any results)

These were committed before the first simulation run. Tuning uses development seeds (1–20,000). The verdict uses **held-out seeds from 900,000**, never used for tuning, with 1,000 matches per configuration. Figures are for the Standard match unless noted.

| # | Measure | Pass if | Why |
| --- | --- | --- | --- |
| 1 | Route choices happen | ≥ 60% of player turns include at least one junction decision | Route choice is the board's core mechanic, so it must come up most turns. |
| 2 | Route choices matter | ≥ 35% of junction decisions have option values that differ by ≥ 25 (route-aware AI's own valuation, in cash units) | Choices that never change anything are noise. |
| 3 | Strategic advantage (2 players) | Route-aware AI beats random-route AI in 60%–85% of matches, seats alternating | Skill must pay off, but not so much that the game is solved. |
| 4 | Strategic advantage (4 players) | One route-aware AI against three random-route AIs wins ≥ 35% (fair share 25%) | Same, with crowded tables. |
| 5 | First meaningful development | Median first Mid-rise (needs a connection) between rounds 4 and 12; first Skyscraper in ≥ 60% of matches | Connection-based building must arrive early and be reachable. |
| 6 | No early wins | < 5% of matches end by influence victory before round 15 | Avoid wins before the board has developed. |
| 7 | Natural endings | ≥ 70% of matches end by influence victory or last player standing, not the round limit; median victory round between 18 and 32 | The influence target should be the normal way a match ends. |
| 8 | Close finishes | ≥ 20% of matches end with second place at ≥ 85% of the winner's influence | Avoid runaway leaders. |
| 9 | Comebacks | ≥ 25% of matches are won by someone other than the halfway leader | Same. |
| 10 | Seat balance | With identical AIs, every seat within 5 points of its fair share; first mover at most +5 points | No seat or turn order should decide the game. |
| 11 | Low-impact turns | ≤ 42% of turns (Origins baseline: 42.5% at 30 rounds, 4 players) | Circuit should feel busier than Origins, not quieter. |
| 12 | Robustness | 0 errors; the same seed always produces the same match (identical transcript hash) | Required for saves, replays and online play later. |

A threshold that fails is reported as failed. Rules may be revised and re-run on new held-out seeds, and every revision is reported.

## Board topology (prototype v0)

32 nodes on two clockwise rings joined by four connectors.

- **Outer ring:** `O0`–`O19`. Junctions at `O0` (Payday Junction, start), `O5`, `O10` and `O15`.
- **Inner ring:** `I0`–`I11`. Junctions at `I0`, `I3`, `I6` and `I9`.
- **Connectors (both directions):** `O0`↔`I0`, `O5`↔`I3`, `O10`↔`I6`, `O15`↔`I9`.
- **Each quadrant `q` (0–3):**
  - outer properties `O(5q+1)`, `O(5q+2)` and `O(5q+4)`;
  - an outer event space `O(5q+3)`;
  - inner (premium) properties `I(3q+1)` and `I(3q+2)`.
- **Totals:** 20 properties, 4 event spaces, 8 junctions. Each district is one quadrant's 5 properties.

## Rules (prototype v0)

- **Setup:** 2–4 players, 1,500 cash each, all on `O0`. Seat 0 moves first.
- **Movement:** roll two dice and move that many steps clockwise. On a junction with steps left, the player chooses to stay on the ring or cross the connector; crossing uses one step. A turn that starts on a junction offers the choice too.
- **Payday:** entering `O0`, by passing or landing, pays 200. The inner ring has no Payday, so going inside trades salary for premium streets.
- **Landing:**
  - an unowned property can be bought at its price, or left;
  - an opponent's property charges rent;
  - an event space draws from a seeded event deck;
  - junctions do nothing.
- **Networks:** a player's network is a group of their properties linked along the rings or through junctions. A junction links the properties on either side of it and, through its connector, the properties beside the paired junction. Event spaces break a chain.
- **Building:** Plot → Low-rise → Mid-rise → High-rise → Skyscraper.
  - Low-rise needs ownership only.
  - Mid-rise needs a network of 2 or more.
  - High-rise needs a network of 3 or more.
  - Skyscraper needs a network of 4 or more that includes properties on both rings.
  - Each stage costs half the property's price. A property rises at most one stage per turn.
- **Rent:** 12% of price × stage multiplier (1, 3, 6, 11, 18), × (1 + 0.1 for each other property in its network).
- **Influence:** scored at the end of every round and added up over the match.
  - Each property earns 1, 2, 3, 5 or 8 influence by stage.
  - Each network of 2 or more earns 2 × (size − 1).
  - Each district where the player owns 3 or more of the 5 properties earns 4.
- **Victory:**
  - Reach the influence target as the clear leader at the end of a round. If you still hold the target and the lead at the end of the next round, you win.
  - Or be the last solvent player.
  - At the round limit, the highest influence wins.
- **Bankruptcy:** a player who can't pay first sells buildings back at half their cost. If that's still not enough, they are out and their properties return to the bank.

Prices, targets and round limits are tuning parameters, listed with the results.
