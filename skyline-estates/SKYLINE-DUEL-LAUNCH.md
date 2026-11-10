# Skyline Duel: launch report (Stage 6)

Status: **built and tested; not live.** Everything is on branch `feat/skyline-duel` (PR #190, draft). Nothing changes for players until you:
1. merge the PR;
2. deploy the server;
3. ship an app build;
4. switch the flags on.

## What players get
- **Play online → Living City → Skyline Duel:**
  - **Find a match:** 1 v 1, 15 rounds, about 12 minutes;
  - **Practice:** against the computer, offline;
  - **Leaderboard:** the season ladder.
- **Friend challenge:** create a room and choose "Skyline Duel" (unranked).
- **Match rules:**
  - Living City rules; 3 value-balanced streets each; both start on SC 1.7B; no trades;
  - Final Bell countdown with the Coach;
  - 25 seconds per move, with a timer ring;
  - if a player runs out of time, the computer plays that turn, and 3 timeouts in a row forfeit the match.
- **Ranked:**
  - tiers Bronze → Skyline Elite after 5 placement games;
  - 4-week seasons;
  - rewards: win 300 Coins + 600 XP, loss 80 Coins + 200 XP, streak bonuses, 10 rewarded Duels per day.
  - Rewards are earned only, never sold.

## Evidence

| Area | Result |
|---|---|
| Match length | 15 rounds, about 11–15 minutes for two people (2 decision turns per round at the 25-second timer); simulated games average 15.9 rounds |
| Fairness | Simulated first-player win rate 47–51% with the equal start (2-player AI simulations, 600–800 games each). The plan set 47–53% as the target. |
| Development | About 10 building levels and 2–3 complete districts per Duel, with 37% close finishes (under a 15% gap) and comebacks after the midpoint in 37% of games |
| Online/offline parity | 6/6 identical seeded matches, app vs server rules |
| Server tests | 15 checks: setup, timer, forfeit, full online Duel, queue (pairing, expiry, cancel), ranked switch, Glicko-2, settle-once, claim-once, rematch rule, placement, tiers, leaderboard |
| App tests | 7 checks (two app copies matched through the queue, timer ring, timeout, leaderboard, practice, no errors) + 6 checks for the offline prototype |
| Existing online | Living City online client (14 checks), service (6) and engine (5): unchanged and passing |
| Themes | Duel screens checked in Dark and Daylight (Chromium); Safari visuals run in the Stability gate |

**Not measured yet:** timeout and forfeit rates with real players, and rewards per day in practice. Collect them in the TestFlight test with `lc-test-access.sh report CODE` and the server records under `skylineV2/duel/test`.

## Store and privacy text
- **App Store "What's New" (next version):**
  > NEW: Skyline Duel. Take on one rival in a fast 15-round match with Living City rules. Find a match, climb from Bronze to Skyline Elite each season, or practise against the computer. Every move is checked by the game server.
- **Google Play release notes:** same text.
- **Privacy:**
  - `privacy.html` has a new section, "Skyline Duel ranked leaderboard".
  - App Store answers: still "Gameplay Content" and "User ID" for app functionality, not used for tracking.
  - Play Data safety: still "App activity → Other user-generated content" and "User IDs".
  - No new data types.

## Rollout (owner steps)
1. **Review and merge** PR #190. The gate must be green.
2. **Deploy the server** from Cloud Shell, in `skyline-estates/competition-functions`:
   ```
   node prepare.cjs && node prepare.cjs --check
   firebase deploy --project eko-estates --config firebase.json --only functions:skyline-competition
   ```
3. **Test on two phones** (ranked stays off for live players; test rooms are always rated so you can see the ladder):
   - `bash lc-test-access.sh on 3`;
   - start a TestFlight build;
   - on both phones: Play online → Living City rooms (test) → Skyline Duel → Find a match;
   - play a full Duel, one forfeit (let the timer run out 3 times) and one friend challenge;
   - check rewards and the leaderboard.
4. **Go live (casual):** switch Living City online on for everyone. Duels can then be played, unranked.
5. **Go live (ranked):** `bash lc-test-access.sh ranked on`. Turn it off again with `ranked off`; matches keep working, unrated.

## Known limits (next stages)
- **Matchmaking** is first come, first served (one waiting slot). Rating-based search widening needs more players first.
- **Leaderboard tabs:** Friends and Country tabs need a friend list and country data, which the game doesn't have yet.
- **Season-end trophy and cosmetic grants:** they need a scheduled season-end job.
- **Win-trading:** suspected patterns are only reduced by the rematch rule; automatic flagging comes later.
