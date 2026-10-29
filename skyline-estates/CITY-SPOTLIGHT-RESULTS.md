# City Spotlight — implementation and results

Branch `skyline-city-spotlight`, stacked on PR #52 (`skyline-ios-accounts-storekit`), which is stacked on PR #51. This file records what was built and how it was tested. Real-device checks are still open (see the end).

## 1. Strategic city events 2.0 (opt-in)

- New house rule in **Custom game → Rules**: *Strategic city events*. It can't be on at the same time as classic *City events*; turning one on turns the other off. Saved matches without the rule behave exactly as before.
- **Snapshot:** the match stores `G.set.events2`, `G.ev2Next`, `G.ev2n` and the active event `G.ev2`: version, id, city, targets, percentage, start round, and either a number of rounds or one player's turn. Reloading or changing turns never restarts or extends an event. A tampered event or rooftop in a save is rejected by `validateSave`.
- **Schedule:** the first event starts in round 3, then one every 3 rounds. Only one event is active at a time, so effects never stack.

| Event | Where | Effect | Duration |
|---|---|---|---|
| 🎬 Lagos Film Festival | Lagos, pink group (Herbert Macaulay Way, Ojuelegba Road, Adeniran Ogunsanya: “Surulere & Yaba”) | rent +50% | 2 rounds (R, R+1) |
| 🚧 Slussen Infrastructure Upgrade | Stockholm, sky group (Södermalm) | houses/towers −50% | one named player's turn in round R |
| 🏗️ Development Boom (Spotlight event) | every street | houses/towers −25% | round R only |
| 🥁 City festival | the city's existing festival district | rent +50% | 2 rounds |
| 🚧 Infrastructure Upgrade | one rotating district | houses/towers −50% | one named player's turn |

- **One shared rule:** `ev2Disc` and `devCost` feed affordability (`canBuild`), the actual debit (`build`), portfolio and manage-panel prices, and AI building (`aiPostTurn`). `ev2RentPct` is applied inside `rentFor`. Selling still refunds half of the full price, so building and then selling during an event can never create money. Full-set, even-building, mortgage and bank-supply rules are unchanged.
- **Shown to players:** a banner when an event starts, a top-right chip with effect and time left (tap it for the affected streets, owners, current rents and build costs), and a line on each affected property card. Every start and end is also written to the game log.
- **Local games only:** online room settings strip `events2` (`cfgSetOnline`), because the trusted room service doesn't implement it. The pinned server kernels are unchanged. Classic events still work online as before.

## 2. Rooftops (appearance only)

- Rooftop Garden (1,800 coins), Solar Roof (1,500), Rooftop Pool (2,600), Skyline Crown (3,200), and the **Golden Rooftop Garden**, which can only be earned through City Spotlight.
- They are drawn by `decorateRoof` on the real 3D building families: one roof anchor per level for Home, Townhouse, Apartments, Boutique and Tower, replacing that level's default roof garnish. Mortgaged plots (garden level) never show a rooftop.
- **Collection → Buildings → Rooftops:** a large preview built from the same `FAM` + `decorateRoof` definition as the board, a level selector, and Use or Buy buttons. The preview cache key includes the rooftop.
- **Snapshot:** player 1's equipped and owned rooftop is copied into `G.players[0].roof` when a match starts. AI players, friends and online opponents use standard roofs. Changing your rooftop never changes a match already in progress.
- **No effect on gameplay:** the same 12 seeded games give identical results with every rooftop equipped. Rooftops sync through the unified profile (`roof` items and the `roof` equipped slot).
- **Cost:** about 8–16 extra boxes per decorated building; it adds at most a few hundred nodes on a full board. The 2D board is unaffected.

## 3. Contracts and City Spotlight

- **City Spotlight** has its own tab under **Progress** (first tab) and a banner on the Play hero. It rotates weekly on UTC weeks starting Sunday 25 Oct 2026: Lagos (Golden Rooftop Garden), Stockholm (Solar Roof), Tokyo (Rooftop Garden), Dubai (Rooftop Pool), London (Skyline Crown). Only real boards are used. A locked city shows its unlock requirement instead of Play.
- **Lagos Investor contract:** finish three Lagos matches this week; you don't have to win. Each finished match adds one receipt (`PREF.spot.flags["<campaign>.m.<match id>"]`), so reloads, repeated end screens and cloud merges never double count. Only player 1 on the device earns progress. AI-only, simulated, online and unfinished matches don't count. A match that ends more than one day after the campaign ends doesn't count.
- **Claim:** the reward is available only after three receipts and can be claimed once (`<campaign>.claimed`). If you already own the rooftop, the claim gives 1,500 coins instead. Last week's reward can still be claimed during the grace day. Rewards never expire.
- **Play:** asks whether to play with Strategic city events, so the Spotlight event is the first event, or with standard rules. It applies the choice to that match only and doesn't change your saved settings.
- **Existing systems improved:**
  - Daily goals and the Lucky Spin now reset at 00:00 UTC, like the daily event, and a backwards clock can't reopen a finished day.
  - Weekly challenges can't be reset by a backwards clock.
  - Daily goals, city awards, achievements and game-end rewards now go to player 1 only, not to other humans in pass-and-play. Matches saved before this change keep the old behaviour.
  - Weekly contracts are shown with progress and their UTC reset on the Spotlight tab. No new currency or quest system was added.

## Tests

- `tests/spotlight-browser.cjs` (23 checks): rule boundaries (turn and round expiry, affordability, debit, even-building, mortgage, refund, rent), save round-trip and tamper rejection, scheduling, Spotlight event first, events-off no-op, online stripping, seeded games with events on, rooftop gameplay parity, contract and claim idempotency, grace period, AI-only, clock rollback, duplicate-reward coins, and layout checks on phone landscape (956×440), phone portrait (390×844) and desktop (1280×800).
- **100 seeded games with Strategic city events on** (seed 20261030, Lagos, 4 AI players): rounds 28–301, 98 ended with one player left, 2 hit the 300-round limit, **0 errors, 0 cash or house/tower bank failures**, 2,551 events started and 708 discounted builds.
- **Events off: 40 seeded games were identical** to the previous build (commit e4d55d3), compared result by result.

## Still open (not claimed)

- Real iPhone check of the board rooftops, the event chip and the Spotlight flow in a signed TestFlight build.
- Server-owned reward eligibility: Spotlight receipts are device-reported like other earnings. The unified profile dedupes them across devices but can't prove a match was played.
- Online play: strategic events and Spotlight counting are local-only until the trusted room service supports them.
- Balance numbers (+50% rent, −50% and −25% build costs, rooftop prices, 1,500 duplicate coins) are proposals for the owner to confirm.
