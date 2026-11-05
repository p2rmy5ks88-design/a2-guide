# Skyline Estates closed beta (Task 15)

Status: **plan and tooling ready; not started.** Recruiting and running the beta need the owner. Every metric below stays blank until it is observed.

## Scope

- **Players:** 20–50 volunteers, recruited only through the owner's own channels:
  - the TestFlight internal/external groups (each upload needs separate owner approval);
  - the web link shared directly.
- **Length:** 2 weeks.
- **Minimum participation:** 3 matches per player, including at least 1 Solo and 1 online or Pass & Play match.
- **Builds:** the web build at the exact SHA recorded in the action log, and the TestFlight build number if used.

## Consent and privacy

- Participation is voluntary. Players can stop at any time.
- **In-game data:** the opt-in beta diary (`lib/beta-diary.js`).
  - Players open the game with **`?beta=1`** and confirm the consent dialog.
  - It records **anonymous counts only, on the device**: sessions, active days, matches started / completed / unfinished, match minutes, leaving mid-match, reconnects, tutorial finished or skipped, and tips skipped.
  - It records no names, account IDs, chats, purchases, locations or device IDs, and **nothing is sent anywhere**.
  - `?beta=export` shows the summary for the player to copy into the feedback form.
  - `?beta=0` stops the diary and deletes it.
- **Feedback form:** no names. An optional contact address is kept separately and deleted after the beta.
- **Storage:** results are stored anonymised (player A, B, C…). Raw form exports are deleted after analysis.

## Feedback questions (5-point scale plus one free-text line each)

1. **First match:** Did you know what to do in your first match? Where did you hesitate?
2. **Buying, trading and auctions:** Were buy, trade and auction decisions clear? Did any feel unfair?
3. **Building and Portfolio:** Could you find how to build, mortgage and redeem? Was anything hidden or confusing?
4. **Currencies:** In your own words, what is the difference between match SC, saved SC and Coins?
5. **Collection upgrades:** Did you understand how token and building upgrades work, and what they cost?
6. **Rewards:** Did trophies, Season progress and rewards match what you expected after a match?
7. **Social:** Did online or Pass & Play matches start, reconnect and finish correctly?
8. **Look and feel:** Was any button hard to tap or hidden, on what device and in what orientation?
9. **Problems:** Any crash, freeze, lost progress or wrong amount? Please give a screenshot and the time.
10. **Coming back:** Would you play again tomorrow? Why or why not?
11. **Diary summary:** paste it here (optional).

## Results — anonymised (fill after the beta)

| Metric | Value | Source |
|---|---|---|
| Players (consented / active) | | form + diary |
| Matches started / completed | | diary |
| Completion rate | | diary |
| Median match minutes | | diary |
| Players returning on ≥2 days | | diary |
| Tour finished / skipped | | diary |
| Left mid-match | | diary |
| Reconnects | | diary |
| Correct answer to Q4 (currencies) | | form |

Anecdotes go in a separate list and are never mixed with measured values.

## Issue severity table

| ID | Severity | Area | Observation (anonymised) | Players | Fix / deferral | PR |
|---|---|---|---|---|---|---|

**Severity levels:**
- **S1:** crash, lost progress or wrong currency/purchase. Fix before any public release.
- **S2:** blocks understanding or a core action.
- **S3:** confusing but has a workaround.
- **S4:** polish.

## Beta action log

| Date | Action | Build / SHA | By |
|---|---|---|---|

## Rules

- Prioritise S1 and S2 issues and comprehension problems.
- Don't add compulsive retention mechanics (streak pressure, loss-aversion timers) without evidence.
- Don't grant currency to hide defects.
