# Skyline Estates — City Spotlight feature to-do

Owner request, 29 October 2026. Add these features to the iOS public-release work in SKYLINE-IOS-HANDOFF.md. This document captures the three supplied concept screenshots as implementable requirements. **The features below are not implemented by this document.**

## Product scope and delivery order

The owner wants all three priorities combined into **City Spotlight**, while preserving the existing board, art, scenery, custom rules, saves and collection progression. Public release is iOS first; Android publication is deferred. The owner chose to wait for **one unified cloud wallet and progress sync**, not separate earned/purchased balances.

1. Inspect fresh PR/CI and finish the account/wallet/purchase foundation from the main handoff. The new contract rewards must use the same eventual wallet, inventory and receipt authority.
2. Build a coherent City Spotlight feature using existing events, daily missions, weekly season challenges and Buildings collection. Do not create another currency or unrelated quest system.
3. Test the feature, native account/purchase path and mobile UI together before the final public-release candidate. Optional strategic events must be explicitly opt-in; cosmetic ownership must not confer a paid gameplay advantage.

Estimate: **6–10 additional engineering hours**, plus regression/device testing. This is in addition to unfinished release work, not a promise that it fits within the remaining credit. Reassess after reviewing actual code and dependencies.

## Priority 1 — Dynamic City Events 2.0

Expand the existing optional City Events into visible strategic moments with clearly stated scope and expiry.

- Example **Lagos Film Festival**: a temporary rent bonus for explicitly mapped entertainment properties for **two rounds**. Do not invent entertainment tags that the board does not have; inspect actual Lagos property names/data, define and review the exact affected square IDs/districts, and show them to players before choosing a strategy.
- Example **Stockholm Infrastructure Upgrade**: development becomes cheaper in **one named district for one turn**. Specify whose turn, the exact discount, legal building restrictions and expiry. Do not ambiguously treat a player turn as a complete round.
- Spotlight example **Development Boom**: reuse the existing event where practical; do not silently alter old saved-game behavior or force the rule on standard matches.
- Show the event name, affected district/properties, effect, remaining rounds/turns and a clear expiry. Apply the same information in building/purchase/rent UI so players can decide whether to develop, trade or wait. Do not claim a meaningful decision from a random coin payout alone.
- Define stacking/caps explicitly. Discounts and rent modifiers must be shared by affordability checks, actual debits/refunds, previews, AI choices and trusted server rules. No hidden UI-only discount or extra refund.
- Snapshot event version, city, targets, duration and opt-in settings in the match. Preserve older saves and their approved rules. Round/turn changes, reload, reconnect, offline recovery and host changes must not restart or extend an event.
- Standard matches with City Events off must remain unchanged. Do not alter the 40-space board artwork or existing custom settings.

Current code: EVENTS, EV_UNIVERSAL, EV_LOCAL, evPool, evTitle, evNow, the advanceTurn event wrapper and the _build wrapper in skyline-estates/game.html. Existing events draw every two rounds and generally last one round. Existing boom uses a build/refund path with full-cost affordability; review that carefully before introducing discounts. The hash-pinned server kernels reuse game rules and require browser parity after gameplay changes.

Acceptance: event-off parity; precise two-round/one-turn boundaries; affected/unaffected and mortgaged properties; affordable/unaffordable builds; no double discount/refund; legal building/even-building constraints; deterministic AI/server/browser parity; cash invariants and house/hotel bank conservation; save/reconnect does not repeat effects.

## Priority 2 — Signature Skyline Customization

Provide permanent unlockable building appearances:

- Rooftop gardens.
- Solar panels.
- Luxury pools.
- Distinctive skyline crowns.
- Featured reward: **Golden Rooftop Garden**.

These must appear on the player's **actual buildings on the 3D game board**, not just a card, rarity badge or CSS filter. Add matching selection/preview controls in the existing **Collection → Buildings** area, using the Portfolio/Collection visual language and responsive layout.

- Keep these appearance-only: no extra rent, cheaper construction, bank supply, dice advantage or paid combat/stat benefit. Existing rarity and token powers remain separate and unchanged.
- Use stable cosmetic IDs with ownership and equipped-state persistence. Unlock once, equip/unequip safely, preserve ownership after the event ends and across reinstall/device changes once cloud sync is active. Never make a claimed reward expire.
- Snapshot each player's equipped appearance into new matches for consistent board rendering across clients; whitelist values and preserve old saved-game defaults. Cosmetic selection must not change gameplay hashes/outcomes or silently edit the current match's rules.
- Use the current 3D geometry/material system and approved buildings. Define per-level roof attachment positions; avoid floating/clipped ornaments. Respect mortgaged-property appearance and distinguish another player's buildings.
- Reuse geometry/materials and bound extra mesh/draw cost on phones. Verify low-power/2D fallback and clean disposal during rebuilds; do not require high-end phones to see ownership clearly.
- Preview and actual board must use the same appearance definition. Include the style in preview-cache keys so switching a style cannot show stale art.

Current hooks: famBase, famHome, famTown, famApts, famBoutique, famSkyline, FAM and the property-building renderer near the code that calls FAM[lv](b); mdTree building previews; Collection Buildings UI. Use a shared decorateBuilding/appearance helper rather than duplicating render code.

Acceptance: visible differences on real 3D board screenshots at phone/desktop sizes, correct owner/equipped style, all building stages/mortgaged states, no gameplay/bank/cash changes, no paid stat advantage, unlock/equip/reload/reinstall recovery and a measured mobile rendering budget.

## Priority 3 — Daily Contracts and Seasonal Challenges

Improve the existing system rather than introduce another quest system.

- Examples: **Property Mogul** — complete two matches, develop five properties, or win with a different token. Implement these as well-defined separate objectives or a clearly described multi-step contract; do not hide whether AND or OR is required.
- Use existing completion/progression hooks and display meaningful progress, reward state and reset time. Distinguish cumulative match counts from a best-in-one-match objective.
- Reward coins, cosmetics and collection progress through the unified wallet/inventory. No purchase is required to complete an objective. Keep ordinary match rewards and upgrade gates unchanged unless the owner requests a separate rebalance.
- Make wins, eligible token changes and property development attributable to the account owner, not another human sharing the device or an AI. Simulations/test/unfinished games cannot earn rewards.
- Complete each milestone once via an idempotent completed-match receipt. Support reload, duplicate callbacks, offline queue/reconnect, multiple devices and season changes without losing or duplicating progress/rewards.
- Preserve existing daily missions, daily event, free Lucky Spin, streaks and weekly challenges. Version/migrate existing saved challenge IDs safely; do not wipe earned progress because a rotation changes.
- Define UTC reset/expiry rules consistently with the existing new daily event; show the player's reset time clearly. Clock rollback must not reopen a claimed milestone. Production reward eligibility/time must be server-owned.

Current hooks: MISSIONS/daily/missionScan, DAILY_EVENTS/applyDailyEvent, WEEKLY/weekly/weeklyAdd, season/weekNo, progressGameEnd, token-game receipts and grantTokenMastery. Current local receipts are not authority for verified paid currency or a competitive leaderboard. Finish server reward authority before claiming production-safe fulfillment.

## Combine all three — City Spotlight

Implement one weekly/seasonal featured-city experience:

- **City Spotlight: Lagos** as the first example.
- Clear card/header, existing city art or approved new art, countdown/reset information and a Play action.
- **City event: Development Boom**, active only in explicitly enabled eligible matches.
- **Weekly contract: Lagos Investor** — complete **three eligible Lagos matches** to earn event progress and unlock the featured reward. Define completion clearly; a match does not have to be won unless the contract explicitly says so.
- **Featured reward: Golden Rooftop Garden**, permanent in the collection after it is earned.
- Later rotations can feature Abuja, Stockholm, Tokyo, Dubai, London and other cities **only where actual game boards exist**. Inspect CITY_DATA; do not fabricate a playable board. Preserve city unlock requirements or propose an explicit reviewed access policy rather than bypassing them silently.
- Keep optional-event participation transparent: the Play action may preselect the city, but must show the event rule choice, not silently change the player's saved normal-match settings.
- Spotlight card, contract, progress, reward claim and Buildings equipment must work together. Do not ship a decorative promotional card for a feature whose rewards or gameplay do not work.
- Owned rewards remain after rotation. Define what happens to a match spanning the reset and to queued offline results, with stable campaign/match IDs and a tested grace/eligibility policy. Never grant the same event reward again after a clock/season change.
- Use the existing currency. Any new coin bonus amount, discount or rent percentage is a balance decision to specify and test; the screenshot provides examples, not approved numerical values. Do not invent a second event currency merely because the concept says event points—use non-spendable contract progress unless a new currency is separately requested.

## Test and rollout checklist

- Narrow, reviewable PRs/commits; preserve PR #51/#52 dependency and existing content/music changes.
- Unit tests for eligibility, rotation, exact expiry, server-priced modifiers, idempotency and migrations; negative cases and failure/retry tests, not just implementation-mirroring tests.
- Browser tests on phone (including landscape), tablet and desktop. Confirm navigation, scrolling, readable event state, reward status and actual 3D cosmetics.
- At least 100 seeded game simulations after gameplay changes, recording rounds, errors, cash invariants, house/hotel bank conservation and outcomes. Update audited source hashes only after reviewing the rule changes and rerunning server/browser parity.
- New signed iOS candidate with real device checks for the combined feature and real Apple sandbox purchase/refund/reinstall/account recovery. A green compile is not payment acceptance.
- Refresh privacy/store metadata to match live behavior. Public release only after the account/wallet/purchase and feature acceptance gates are complete. Android remains deferred.

Do not claim any item in this file is implemented merely because this to-do has been committed.

## Status — 29 October 2026 (Claude)

Implemented on branch `skyline-city-spotlight` (draft PR stacked on #52). Details and test numbers are in `skyline-estates/CITY-SPOTLIGHT-RESULTS.md`. Open items: a real iPhone check, server-owned reward eligibility, online support for strategic events and Spotlight counting, and owner sign-off on the proposed balance numbers.
