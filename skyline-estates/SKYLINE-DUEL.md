# Skyline Duel: design spec (Stage 1, for owner approval)

Skyline Duel is a short 1-vs-1 online match and the **only mode with a ranked leaderboard**. Online Rooms (2–6 players) stay as they are, unranked.

## 1. Match format (recommended)
- **Rules:** Living City, with the Championship scoring and Final Bell already built (countdown plus Coach Voice A).
- **Start:** each player is dealt **3 streets**, value-balanced. The 3-street deal gives more development than 2 streets (6.6 vs 5.1 building levels, guarded human).
- **Length:** **15 rounds**. The winner is the player with the higher Championship score, or the last player standing if the other goes bankrupt.
- **Opening fairness:** the first player starts with **+SC 100M**. This offsets a measured second-seat edge (see the simulation).
- **Trades in ranked:** **none**. This blocks win-trading between friends, and a 15-round duel barely uses trades anyway (about 1 per match in simulation). Auctions stay on so streets keep moving.
- **Turn timer:** 25 seconds per decision. On timeout, the AI makes that one decision. 3 timeouts in a row, or 90 seconds disconnected, forfeits the match; leaving counts as a loss.

## 2. Simulation (`tests/endgame-sim.cjs`, 2 players, headless rules core)

| Config | Avg rounds | Ends in bankruptcy | First player wins | Close finish (<15% gap) | Comeback after midpoint | Building levels | Complete districts |
|---|---|---|---|---|---|---|---|
| 12 rounds, 3 streets each | 13.0 | 1% | 40% | 49% | 38% | 8.6 | 1.9 |
| **15 rounds, 3 streets each** | 15.9 | 3% | 44% (46% on fresh seeds) | 37% | 37% | 10.4 | 2.6 |
| 18 rounds, 3 streets each | 18.8 | 5% | 48% | 32% | 39% | 12.1 | 3.2 |
| 15 rounds + first player +SC 60M | | 3% | 47% | 36% | | | |
| **15 rounds + first player +SC 120M** | | 2% | **51%** | 38% | | | |
| 15 rounds, guarded human (no trades) | 15.9 | 2% | 40% | 54% | 31% | 6.6 | 1.2 |

AI vs AI, 400–800 seeded matches per row; the last row is a "guarded human" who never trades.

**Reading the results:**
- **15 rounds** is the sweet spot: real development (about 10 building levels, 2–3 complete districts), many close finishes (37–54%) and frequent comebacks (31–37%).
- **12 rounds** is too thin: under 2 districts.
- **18 rounds** runs longer than a phone session.
- **Real time:** a human duel round is two decision turns, about 40–60 seconds with the 25-second timer, so 15 rounds is about **11–15 minutes**. Rendered AI rounds take 4.8 seconds at Fast speed.
- **Seat edge:** the second seat wins slightly more (54–56%). A first-player head start of about SC 100M brings it to 47–51%.

## 3. Rating and seasons
- **Rating:** hidden Glicko-2 on the server. Visible tiers: Bronze, Silver, Gold, Platinum, Skyline Elite.
- **Placement:** 5 placement matches.
- **Seasons:** 4 weeks, soft reset (rating moves halfway toward the default), season-end trophy and cosmetic.
- **Repeat opponents:** no rating change from a third or later match against the same opponent within 24 hours.

## 4. Rewards (earned only, never sold)
- **Win:** about 2× casual Coins and XP, plus Duel trophies.
- **Loss:** a participation share.
- **Win streak:** bonus at 3 and 5 wins.
- **Daily cap:** soft cap after 10 rewarded duels.
- **Server-granted:** rewards are granted by the server only, idempotent per match.

## 5. Matchmaking
- **Queue:** by rating, widening every 10 seconds.
- **Practice:** after 45 seconds, offer a clearly labelled *unranked* practice duel against the AI.
- **Friend challenge:** by code, shareable on WhatsApp, always unranked.

## 6. Leaderboard
- **Tabs:** Global, Friends and Country (Nigeria first).
- **Rows:** tier, rating band, wins and season. Your own row is always shown.
- **Names:** existing usernames only; no real names.

## 7. Anti-abuse
- **Server-run:** every move goes through the authoritative Living City engine; rate limits apply.
- **No trades** in ranked (see section 1).
- **Repeat-opponent rule** (see section 3).
- **Win-trading:** suspected patterns are flagged.
- **Report and block:** existing.

## 8. Store and privacy impact
- **Leaderboard and ratings:** they store the username, rating, tier and match results already linked to the anonymous online ID.
- **App Store privacy:** "Gameplay Content / Other User Content", linked to a user ID, for app functionality. Check against the current answers.
- **Play Data safety:** same category ("App activity").
- **Privacy policy:** add one sentence about the ranked leaderboard.

## 9. Delivery stages
1. **This spec.** ⛔ Owner approval.
2. **Offline Duel prototype on the web**, behind `?duel=1`: AI and pass-and-play, Coach lines, both themes, Safari.
3. **Server Duel rooms:** timer, forfeits, parity tests, and a deployment script for the owner. ⛔ Owner tests on two phones.
4. **Matchmaking queue, timer ring, practice and friend challenge.**
5. **Rating, rewards and leaderboard** (server-only).
6. **Launch report and store text.** ⛔ The owner switches ranked on.

## Decisions for the owner
1. 15 rounds and 3 streets each? (Recommended.)
2. No trades in ranked? (Recommended.)
3. 25-second turn timer, forfeit after 3 timeouts or 90 seconds away?
4. First-player head start of SC 100M?

## Stage 3 status (server, done on branch `feat/skyline-duel`)
- **Shared rules:** the Duel rules (`lcDuelSetup` and no trades) live in `lib/living-city-rules.js`, so the app and the online engine run the same code. App-vs-server parity test: 6/6 identical.
- **Engine** (`online/lc-engine.cjs`): Duel setup at match start. `timeout()` lets the AI play an idle player's whole turn, and the third timeout in a row forfeits (the idle player goes bankrupt to the bank).
- **Service** (`competition/living-city-service.cjs`):
  - `start` with `mode:'duel'` needs exactly two humans;
  - each move sets a 25-second deadline on the server clock;
  - new route `/v3/lc/timeout`: refused before the deadline, and only in Duel rooms.
- **Tests:** `tests/skyline-duel-online.cjs` covers setup, the timer, forfeit, a full 15-round online Duel, and that ordinary rooms are unaffected. It runs in the Stability gate.
- **No database rules or IAM changes:** Duel rooms use the existing `skylineV2/lc` path.

### Owner deployment (after the PR is approved and merged)
Run in Cloud Shell, in `skyline-estates/competition-functions`:
```
node prepare.cjs && node prepare.cjs --check
firebase deploy --project eko-estates --config firebase.json --only functions:skyline-competition
bash lc-test-access.sh on 3        # two test accounts, 3 hours; global Living City online stays off
```
The two-phone test needs the Stage 4 app screens (queue, timer ring, Duel lobby). Do it after Stage 4.

## Stage 4 status (matchmaking and app screens, done)
- **Server:**
  - `/v3/lc/queue` is first come, first served: one waiting place per pool (test or live). Calling again keeps your place or collects your match.
  - Waits expire after 60 seconds; `/v3/lc/queue-cancel` removes you from the queue.
  - A paired match starts at once as a Duel room.
  - The `state` response now includes `turnMsLeft` for Duel rooms.
- **App, Play online → Living City:**
  - a new **Skyline Duel** card with **Find a match** (search screen with a timer, Cancel, and "Practice instead" after 45 seconds) and **Practice** (offline Duel against the computer);
  - friend challenge: create a room and choose **Skyline Duel** as the mode;
  - in a Duel, a small ring above the Roll button counts down the 25 seconds; at zero, the app asks the server to play the turn.
- **Tests:** `tests/skyline-duel-client.cjs` covers two app instances matched through the queue, the timer ring, the timeout, practice, and no errors. `tests/skyline-duel-online.cjs` covers the queue, expiry and cancel. Both run in the Stability gate.
- **Ready for the two-phone test:** run the owner deployment steps above, switch on test access for both accounts, then on each phone go to Play online → Living City rooms (test) → Skyline Duel → Find a match.

## Stage 5 status (ranked ladder, done)
- **Rating module** (`competition/duel-rating.cjs`): Glicko-2; tiers Bronze, Silver, Gold, Platinum and Skyline Elite after 5 placement games; 4-week seasons with a soft reset (halfway to 1500, uncertainty at least 200).
- **Settling a match:**
  - only matchmade Duels are ranked; friend challenges and practice are not;
  - each finished match is written once to `skylineV2/duel/<live|test>/s<season>/` (`r/<uid>` records, `m/<code>` results, `p/<pair>/<day>` rematch counts);
  - a third or later match against the same opponent on the same day is unrated.
- **Rewards:**
  - win: 300 Coins + 600 XP; loss: 80 Coins + 200 XP;
  - win-streak bonus: +100 at 3 wins, +250 at 5;
  - 10 rewarded Duels per day.
  - Claimed once per match through `/v3/duel/claim`; the app adds them to the local wallet. They are earned only, never sold.
- **Leaderboard:**
  - `/v3/duel/leaderboard` returns the top 50 plus your own row, with ratings rounded to 25;
  - `/v3/duel/me` returns your tier and placement games left;
  - in the app: Skyline Duel card → **Leaderboard**.
- **Not built yet:** Friends and Country tabs. The game has no friend list or country data today, so they need a later stage. Cosmetic season rewards come with the season-end job in Stage 6.
- **Privacy:** `privacy.html` has a "Skyline Duel ranked leaderboard" section. In the stores, the App Store answer "Gameplay Content" and the Play Data safety answer "App activity → Other user-generated content" already cover usernames and game results, so no new data types are needed.
- **Tests:** `tests/skyline-duel-online.cjs` (14 checks) covers rating maths, settle-once, claim-once, unranked friend rooms, the rematch rule, placement, tiers and leaderboard ordering. `tests/skyline-duel-client.cjs` (7 checks) covers the leaderboard screen.
