# Skyline Circuit — headless prototype (research)

Status: rules research only — **prototype v0 passes all 12 thresholds on held-out seeds (Standard)**; Quick fails three (see Results). Owner approval needed before any UI work. No artwork, camera, HUD or production UI. The dual-ring identity is fixed; the node layout below is the **mechanical** topology that the visual design must respect. All numbers are provisional until simulation and owner approval.

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

## Quick mode criteria (written 17 Nov 2026, before any Quick experiment)

Owner decision: Quick stays experimental; investigate pacing and premature victories **without weakening the Standard criteria**. Standard and Extended rules and thresholds above do not change. Quick candidates are reported against **both** the unchanged Standard table and this Quick table.

Tuning uses development seeds 20,001–20,600. The Quick verdict uses new held-out seeds 910,000–910,999 (never used before), 1,000 matches per configuration.

| # | Quick measure | Pass if |
| --- | --- | --- |
| Q1–Q4 | Route choices happen and matter; strategic advantage (2p and 4p) | Same as Standard #1–#4 |
| Q5 | First development | Median first Mid-rise rounds 3–8; first Skyscraper in ≥ 50% of matches |
| Q6 | No premature wins | < 5% of matches end by influence victory before round 12 |
| Q7 | Natural, shorter endings | ≥ 70% end by influence or last player standing; median victory round 13–16 (Standard: 20) |
| Q8–Q12 | Close finishes, comebacks, seat balance, low-impact turns, robustness | Same as Standard #8–#12 |

Candidate changes apply to Quick only:

- payday;
- build cost factor;
- how many rounds the target and the lead must be held;
- the earliest round an influence victory may complete;
- the target.

## Board topology (prototype v0)

32 nodes on two clockwise rings joined by four connectors. IDs are stable and are what saves, logs and the UI use.

- **Outer ring:** `O0`–`O19`. Junctions at `O0` (Payday Junction, start), `O5`, `O10` and `O15`.
- **Inner ring:** `I0`–`I11`. Junctions at `I0`, `I3`, `I6` and `I9`.
- **Connectors (both directions):** `O0`↔`I0`, `O5`↔`I3`, `O10`↔`I6`, `O15`↔`I9`.
- **Totals:** 20 properties, 4 event spaces, 8 junctions. Each district is one quadrant's 5 properties.

| District (quadrant) | Outer junction | Outer properties (price) | Outer event | Inner junction | Inner properties (price) |
| --- | --- | --- | --- | --- | --- |
| 0 | `O0` Payday | `O1` 70, `O2` 80, `O4` 90 | `O3` | `I0` | `I1` 200, `I2` 220 |
| 1 | `O5` | `O6` 110, `O7` 120, `O9` 130 | `O8` | `I3` | `I4` 240, `I5` 260 |
| 2 | `O10` | `O11` 150, `O12` 160, `O14` 170 | `O13` | `I6` | `I7` 280, `I8` 300 |
| 3 | `O15` | `O16` 200, `O17` 210, `O19` 220 | `O18` | `I9` | `I10` 320, `I11` 340 |

## Rules (prototype v0, as validated)

- **Setup:** 2–4 players, 1,500 cash each, all on `O0`.
- **Turn order (snake):** the order reverses every round: 1-2-3-4, then 4-3-2-1, then 1-2-3-4, and so on. Bankrupt players are skipped.
- **Route plan, then roll:** before rolling, the player declares **Stay** or **Cross**. Then they roll two dice and move that many steps clockwise.
  - The plan applies at the first junction they reach this move, including the one they start on.
  - At any later junction in the same move, they stay on the ring.
  - Crossing a connector uses one step. The next step must follow the new ring, so no immediate re-cross.
  - If no junction is reached, the plan has no effect.
- **Payday:** entering `O0`, by passing or landing, pays 200. The inner ring has no Payday, so going inside trades salary for premium streets.
- **Landing:**
  - an unowned property can be bought at its price, or left;
  - an opponent's property charges rent;
  - an event space draws from a seeded deck of 8: grant +150, fund +100, festival +6 influence, inspection −3 influence, tax 10% of cash, toll 50, repairs 25 per building stage, rent day (every other player pays you 30);
  - junctions do nothing.
- **Networks:** a player's network is a group of their properties linked along the rings or through junctions.
  - A junction links the properties on either side of it and, through its connector, the properties beside the paired junction.
  - Event spaces break a chain.
  - Example: `O19`–`O0`–`O1` is one chain, and `O0`↔`I0` adds `I1` and `I11`. `O2` and `O4` are not linked (event `O3`).
- **Building:** Plot → Low-rise → Mid-rise → High-rise → Skyscraper.
  - Low-rise: ownership only.
  - Mid-rise: a network of 2 or more.
  - High-rise: a network of 3 or more.
  - Skyscraper: a network of 3 or more that includes properties on **both rings**.
  - Each stage costs half the property's price.
  - A property rises at most one stage per turn, and not on the turn it was bought.
  - The rules return a reason for every refusal: `not-owned`, `max-stage`, `one-stage-per-turn`, `bought-this-turn`, `needs-network-2`, `needs-network-3`, `needs-network-3-both-rings`.
- **Rent:** 12% of price × stage multiplier (1, 3, 6, 11, 18), × (1 + 0.1 for each other property in its network).
- **Influence:** scored at the end of every round and added up over the match.
  - Each property earns 1, 2, 3, 5 or 8 influence by stage.
  - Each network of 2 or more earns 2 × (size − 1).
  - Each district where the player owns 3 or more of the 5 properties earns 4.
- **Victory:**
  - Reach the influence target as the unique leader at the end of a round, and still hold the target and the lead at the end of the next round. A tie or a lost lead resets this.
  - Or be the last solvent player.
  - At the round limit, the highest influence wins.
- **Bankruptcy:** a player who can't pay sells buildings back at half their cost, highest stage first. If that's still not enough, they are out and their properties return to the bank.
- **Match lengths (provisional):**
  - Quick: target 200, 30-round cap.
  - Standard: target 300, 40-round cap.
  - Extended: target 480, 60-round cap.
- **AIs:** both AIs share the same buy and build policy and differ only in route choice.
  - Route-aware: picks the plan with the higher expected value over all 36 rolls.
  - Random: picks 50/50.

## Revisions made during tuning (all on development seeds 1–600)

Every revision is listed, in order. None was made after the held-out run.

1. **Route timing: after-roll → before-roll.** Choosing at the junction after seeing the dice lets the AI pick its exact landing square. Route-aware AI then beat random-route AI about 95% of the time in 2 players, failing #3 (≤ 85%). Declaring before the roll brought it to about 72%.
   - **This changes the player experience:** the choice is made on the Roll screen, not mid-move. It needs owner approval.
2. **Target 150 → 300.** At 150, matches ended around round 13, failing #6 and #7.
3. **Building cooldown:** no building on the turn a property is bought. This slowed runaway development.
4. **Skyscraper rule: network 4 on both rings → network 3 on both rings.** Skyscrapers appeared in fewer than 60% of matches (#5).
5. **Turn order: fixed → snake.** With fixed order, 4-player seat 1 won about 31% and seat 4 about 20% (#10).
   - Tried first and rejected: a cash bonus for later seats (50/100/150), and spread starting junctions. Neither fixed seat balance, and spread made the 2-player first mover worse (about 54%).

## Results — held-out verdict (seeds 900,000–900,999, 1,000 matches per configuration)

Command: `CIRCUIT_SEED=900000 CIRCUIT_N=1000 node skyline-estates/tests/circuit-sim.cjs` (about 65 s).

Standard (target 300, cap 40):

| # | Threshold | Result | Verdict |
| --- | --- | --- | --- |
| 1 | Route choice in ≥ 60% of turns | 95.8% | PASS |
| 2 | ≥ 35% of choices differ by ≥ 25 | 67.9% | PASS |
| 3 | 2p route-aware vs random 60–85% | 72.0% | PASS |
| 4 | 4p one route-aware vs three random ≥ 35% | 41.8% | PASS |
| 5 | First Mid-rise median round 4–12; Skyscraper ≥ 60% | round 4; 62.1% | PASS (Skyscraper close to the line) |
| 6 | Influence wins before round 15 < 5% | 0.3% (2p 0.1%, 3p 0.3%) | PASS |
| 7 | Natural endings ≥ 70%; median victory round 18–32 | 100%; round 20 (10th–90th percentile 17–25) | PASS |
| 8 | Close finishes ≥ 20% | 25.4% (2p 20.8%, 3p 24.4%) | PASS |
| 9 | Comebacks ≥ 25% | 31.8% (2p 24.3%, 3p 28.7%) | PASS (4p measure; 2p is just under) |
| 10 | Seats within 5 points | 2p 54.3/45.7, 3p 36.2/32.1/31.7, 4p 26.9/26.7/23.5/22.9 | PASS (2p first mover +4.3, close to the line) |
| 11 | Low-impact turns ≤ 42% | 23.2% | PASS |
| 12 | Deterministic, 0 errors | identical hashes; 0 errors | PASS |

Other measures (4 players, Standard):

- **First development:** first purchase in round 1; first Mid-rise in round 4; first Skyscraper median round 12.
- **Bankruptcy:** happens in only 1.7% of matches, so rent pressure is low.
- **Influence growth** (median leader / trailing player): round 5 25/7, round 10 94/28, round 15 200/58, round 20 284/98. Growth accelerates as buildings rise.
- In 2 players the gap is narrower: round 15 210/133.

**Quick (target 200, cap 30) — fails 3 thresholds:**

- #5: Skyscraper in 53.7%.
- #6: 21.3% of wins come before round 15.
- #7: median victory round 17.

Everything else passes. The thresholds were written for Standard, and a Quick match is by design shorter, but I'm reporting this as a failure rather than redefining it. Options for the owner:

- accept Quick-specific windows; or
- raise the Quick target. That makes Quick only slightly shorter than Standard, because influence grows faster late in the match.

**Extended (target 480, cap 60) — all 12 pass:** median victory round 26, Skyscraper 69.3%, 2p route advantage 78.4%.

Lengths compress: Quick, Standard and Extended medians are rounds 17, 20 and 26. Influence compounds, so the target moves the end less than it might seem. If the three lengths should feel more different, change something other than the target, for example influence per stage.

## Known limitations and open questions

- **AI only.** Both AIs are simple policies, not human players. The route-aware AI is the measure of "skill pays". A stronger AI (one that plans builds and denies opponents) would likely widen the gap in #3.
- **Before-roll route choice is a rule change** from the original "choose at the junction" idea. It needs owner sign-off. Choosing after the roll is still available as a rule option (`routeTiming:'after-roll'`) but fails #3.
- **Two thresholds are close to the line:**
  - Skyscraper frequency: 62.1% against ≥ 60%.
  - 2-player first-mover edge: +4.3 against ≤ +5.
- **Snake order** needs a clear turn-order indicator in the UI.
- **Not built here:** trades, auctions, mortgages, online play, saves in the game and Career integration. The state is plain JSON and resumes exactly; this is tested.

## Handoff to ChatGPT (visual design) — mechanical constraints only

ChatGPT owns board shape, 3D look, HUD and final visual specifications. The requirements below come from the rules and must hold whatever the art direction. The dual-ring identity is unchanged.

- **Nodes and IDs:** the 32 nodes in the table above, with exactly these IDs.
  - The art may bend, stretch or theme the rings.
  - Order and adjacency must stay as listed: `O0`→`O1`→…→`O19`→`O0` and `I0`→…→`I11`→`I0`, both clockwise.
- **Junctions and connectors:**
  - Each of the 4 connectors joins one outer junction to one inner junction, as listed.
  - A connector is one movement step: a token on `O5` that crosses arrives on `I3`.
  - Connectors must read as bridges or roads between the rings. Junction tiles need two visibly distinct exits.
  - The inner ring has no Payday. The outer ring passes `O0` once per lap.
- **Legal movement paths:** clockwise only.
  - At a junction with the plan "Cross", the token takes the connector.
  - Otherwise it continues on its ring.
  - After a crossing, the next step always follows the new ring.
  - The UI should preview both possible routes before the roll. A path preview function, `planPath`, exists in the rules for this.
- **Property and event allocation:**
  - 3 outer properties, 1 outer event and 2 inner properties per quadrant.
  - Inner streets are premium (200–340 against 70–220) and should look it.
  - Districts are the quadrants. Owning 3 of a district's 5 properties scores a bonus, so the district a tile belongs to must be readable.
- **Connectivity (what the art must make visible):**
  - properties next to each other on a ring are linked;
  - junctions link across, including through connectors;
  - event spaces break chains.
  - A player's network should be highlightable, for example a coloured path joining their tiles, because building stages depend on it.
- **Building footprints:**
  - every property tile must show all 5 stages, from Plot to Skyscraper, with a clear stage marker;
  - the owner's colour must stay readable at every stage;
  - a Skyscraper must not hide neighbouring tiles or tokens from the default camera.
  - Junction and event tiles carry no buildings.
- **Token positions:**
  - up to 4 tokens on one node, including junctions, with no overlap;
  - a crossing token needs a visible path along the connector.
- **Interaction states** that the rules expose via `pending(s)`:
  1. **Plan and roll:** a Stay/Cross choice with a route preview, then Roll. The choice only matters if a junction will be reached; the UI can show "no junction this turn" as unknown, since the dice aren't rolled yet.
  2. **Movement:** the animation, including any crossing.
  3. **Buy:** price and district shown, with Buy and Pass.
  4. **Build:** a list of eligible properties with cost and next stage. Ineligible properties show their reason (for example "needs a network of 3 on both rings") and End turn.
  5. **Event card.**
  6. **Rent paid or received.**
  7. **Bankruptcy:** forced sale, then out.
  8. **End of round:** an influence tally (properties, networks, districts) and turn-order reversal (snake).
  9. **Victory clock:** "Hold the lead one more round".
  10. **Game over:** influence win, last solvent player, or round limit.
- **Mobile screen constraints:**
  - landscape first, like the other boards;
  - all 32 nodes and 4 connectors visible at the default zoom;
  - tap targets at least 44 pt on every property;
  - the HUD (cash, influence, target, turn order) must not cover the rings.
- **Recommended camera play area:**
  - the default view frames both rings and all four connectors with a margin, so no node is cut off;
  - a close-up when a player is choosing a route or building is optional.
  - The final camera is ChatGPT's decision.

## Reproducing

- `node skyline-estates/tests/circuit-rules.cjs`: 16 rule checks.
- `node skyline-estates/tests/circuit-sim.cjs`: the CI sample, 200 held-out seeds. It asserts all 12 thresholds, with seat balance tolerance 8 at this sample size.
- `CIRCUIT_SEED=900000 CIRCUIT_N=1000 node skyline-estates/tests/circuit-sim.cjs`: the full verdict.
- Quick: add `CIRCUIT_TARGET=200 CIRCUIT_ROUNDS=30 CIRCUIT_ASSERT=0`.
- Extended: add `CIRCUIT_TARGET=480 CIRCUIT_ROUNDS=60`.
- `CIRCUIT_RULES='{"routeTiming":"after-roll"}'` and similar settings reproduce the rejected variants.
