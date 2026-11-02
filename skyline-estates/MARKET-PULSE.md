# Phase 1 — Market Pulse and district decisions

Web-only optional rule for new local matches. Select **Set up your game → Rules → Market Pulse + choices**. Off by default. Selecting it replaces both legacy City events and Strategic city events for that match; those systems remain available separately. Online rooms exclude all new settings and effects. The 40-space board, movement, dice, cards, ownership, auctions, even building, mortgages, supply and bankruptcy rules are unchanged.

## Audit and implementation boundary

Baseline main: `04215a3a018c786227217ff0728d69aed9b78f54`, merged PR #98. That release stamps the offline worker and its imported manifest. It does not change currency amounts. Keep that build/update mechanism.

`game.html` already has two exclusive event engines: classic round-based City events and opt-in Strategic Events (every three rounds). The latter has one snapshotted `G.ev2` record and shared `ev2Disc`, `devCost`, `ev2RentPct` hooks. Affordability, actual construction debits, property management, AI and rent use those hooks. Rent already includes normal full-set/building rent and estate perks; the event multiplier is applied once after those calculations. Stations/utilities are outside district target lists. Selling refunds half the original construction cost.

This increment adds `lib/market-pulse.js` to generated web pages before boot, reusing those hooks and that single event slot. `game.html`, the trusted online service, wallet/Coins modules, native source and native build settings are unchanged. The builder adds mutually exclusive setup controls and strips the new setting on both online-create paths. Spotlight's explicit Standard/Strategic buttons override saved Pulse preferences. No migration changes the rules of an older saved match.

## Balance specification

| Event | Effect | Duration |
| --- | --- | --- |
| District Demand | +10% street rent in the named colour district | Two rounds |
| Permit Window | 15% lower house/tower cost in that district | Two rounds |
| Quiet Market | −10% street rent in that district | Two rounds |

Start in round 3, repeat every three rounds: rounds 3–4 active, 5 neutral, 6–7 active, 8 neutral. Rotate the eight districts in board order and the three events in listed order. There are no ownership-dependent targets, random rerolls or player-specific global events. All eight districts are visited before a district repeats; the event/district combination cycle takes 24 events. The panel previews the next district, type and starting round.

At the start of a turn during an active event, an owner of a targeted street can choose once:

- **Keep cash:** no fee, retain the common event effect.
- **District permit:** pay SC 10M from match cash now for an extra 10 percentage points off construction in the target district until the event expires. No income or saved-wallet reward is granted. No debt is forced if cash is below the fee. The choice and debit are saved together and retries cannot debit again.

The total construction discount is 10% during rent events or 25% during Permit Window. Rent varies only ±10%. Normal integer rounding is retained. A base SC 100M build saves an additional SC 10M with a permit, recovering its SC 10M fee after one build; a SC 200M build saves SC 20M. A player who cannot or does not build loses the fee. Maximum discount (25%) remains below the half-price resale refund threshold, so construction/resale cannot create money. Buying, mortgage/redeem, base resale and net-worth valuations are unchanged.

AI receives the same optional offer and pays the same fee. Its conservative policy buys only when presently legal target builds offer at least SC 20M of extra savings and current cash is at least SC 210M. It cannot see future dice and does not receive extra money. This policy is a heuristic, not a claim of optimal play. Full turn/decision screens name the current player for pass-and-play. The offer precedes the ordinary turn timer; its choice screen has no forced paid default.

## Compatibility and limits

Legacy saves have no `marketPulse` opt-in or `mpVersion`, so their event definitions and amounts are retained. New Pulse saves validate district targets, percentages, duration and choice values. Paid permits survive reload without resetting the saved pre/post-roll phase. Event panels and deeds show effective construction costs for the current player; normal building legality remains required. The decision text scrolls while its two action buttons remain reachable on short landscape screens.

Saved SC and Coins are independent of match cash; this feature never reads, credits, spends or converts those balances. Normal existing progression rules remain in effect. All QA uses isolated browser profiles. No physical phone balance is inspected or changed.

Market Pulse is local-only, including solo AI and pass-and-play. Verified online effects require a separate trusted-service release. Browser automation with WebKit checks Safari-engine behavior; it is not a physical iPhone test. The deterministic rotation is a modest economy variation, not a simulated real-world property market. Existing device-local wallet and browser-update limitations remain.

## Subsequent independent increments (not shipped here)

1. **Phase 2 — Skyline Showcase:** an end-game share card using actual recorded match statistics and existing building visuals. Begin with local preview/export, no new currency or social backend.
2. **Phase 3 — weekly extensions:** reuse Season, Awards, Collection and existing unique reward receipts; add repeatable objectives and test rollover/duplicate-claim behavior separately.
3. **Phase 4 — social competition:** establish reliable accounts and authoritative result validation before leaderboards, then friend challenges; shared city projects follow only after backend persistence and abuse controls are reliable.

Release evidence and exact test/deployment results are recorded in the accompanying implementation report.
