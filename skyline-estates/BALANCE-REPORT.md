# Balance audit (Task 14, 5 Nov 2026)

**Reproduce:** `node skyline-estates/tests/balance-sim.cjs [config ...] > rows.csv`, then `python3 skyline-estates/tests/balance-report.py rows.csv`.

**Data:** `balance/balance-2026-11-05.csv`.

## Method

- Engine: seeded AI-only 3-player matches on the shipped web build (`index.html`, FAST engine).
- Settings: SC 1.6B start, 300-round cap, Lagos unless stated.
- AI styles are neutral in simulations (Task 10), so results reflect the rules.
- In the tier configurations, one seat holds the higher token tier, and that seat rotates across the 3 seats.
- Intervals are Wilson 95% confidence intervals.
- Measures:
  - "First seat" = the player who opened the game (Skyline Keys draw).
  - "Comeback" = the winner was not the net-worth leader at round 20.

## Results (600 games, 0 errors)

| Config | Games (seeds) | Finished | Avg rounds | Bankrupt/game | First-seat win 95% CI | Boosted-seat win 95% CI | Comeback | Builds | Auctions | Trades |
|---|---|---|---|---|---|---|---|---|---|---|
| base | 90 (5000–5089) | 90 | 58 | 2.00 | 33% [24–44] | — | 41% [32–51] | 53 | 3.6 | 5.0 |
| tier6 | 90 (6000–6089) | 90 | 58 | 2.00 | 37% [27–47] | 36% [26–46] | 36% [26–46] | 54 | 3.8 | 5.0 |
| tier3 | 60 (7000–7059) | 59 | 63 | 1.98 | 32% [22–45] | 46% [34–58] | 36% [25–48] | 54 | 3.6 | 6.0 |
| events | 60 (8000–8059) | 60 | 60 | 2.00 | 40% [29–53] | — | 43% [32–56] | 54 | 3.9 | 4.8 |
| pulse | 60 (9000–9059) | 60 | 60 | 2.00 | 32% [21–44] | — | 37% [26–49] | 52 | 3.6 | 5.2 |
| stockholm | 30 (10000–10029) | 30 | 63 | 2.00 | 20% [10–37] | — | 37% [22–54] | 52 | 3.9 | 4.2 |
| tokyo | 30 (11000–11029) | 30 | 74 | 2.00 | 37% [22–54] | — | 37% [22–54] | 61 | 3.6 | 5.2 |
| dubai | 30 (12000–12029) | 30 | 57 | 2.00 | 33% [19–51] | — | 30% [17–48] | 56 | 2.9 | 4.3 |
| hard | 30 (13000–13029) | 30 | 65 | 2.00 | 33% [19–51] | — | 50% [33–67] | 53 | 3.6 | 5.1 |
| easy | 30 (14000–14029) | 30 | 66 | 2.00 | 30% [17–48] | — | 40% [25–58] | 53 | 9.9 | 5.0 |
| tier3b | 90 (17000–17089) | 90 | 59 | 2.00 | 30% [22–40] | 33% [24–44] | 46% [36–56] | 54 | 3.4 | 4.6 |

Expected with no advantage: 33% for one seat of three. Errors: 0

## Findings

1. **Turn order.** First-seat win rates are 30–40% in every configuration. All intervals include 33% except Stockholm (20% [10–37], n=30, small sample). No first-mover advantage is detected.
2. **Token powers.**
   - Chaotic (tier 6) vs tier 1 seats: 36% [26–46], n=90.
   - Epic (tier 3): first sample 46% [34–58], n=59; replication with fresh seeds 33% [24–44], n=90; combined about 38%.
   - Earned perks give at most a small edge that these samples cannot separate from chance.
   - **No rebalancing is justified.** Ranked matches already disable perks (Task 03).
3. **Events.** Strategic Events (40% [29–53]) and Market Pulse (32% [21–44]) leave seat fairness, match length (60 rounds) and bankruptcies unchanged against the base (58 rounds).
4. **Comebacks.** 30–50% of games are won by a player who was not leading at round 20. Matches are not decided early.
5. **Cities.** Tokyo runs longer (74 rounds vs 57–63), with more building (61 builds), probably because of its price and rent table. Worth watching but not unfair, since the seat intervals overlap 33%.
6. **AI difficulty.**
   - Easy AI declines more purchases, so auctions rise (9.9 per game vs 3.6).
   - Hard AI produces the most comebacks (50%).
   - Both finish every game.

## Decisions

- No rule or price change.
- Re-run this matrix after any future change to token powers, events or city tables, and publish a before/after table.
- Gathering more data: Stockholm seat order, and the tier 3/6 perk effect with ≥300 games each.
