# Phase 3 reconciliation — existing weekly contracts discovered

**Decision: do not integrate or merge the new weekly engine as a parallel progression system.**

## Verified existing implementation

In `skyline-estates/game.html`:
- The existing `weekly()`, `WEEKLY`, `WEEK_SXP`, `WEEK_COINS` logic is already rendered under `paneSpotlight(T)` as **Weekly contracts**.
- The existing `progressGameEnd` function is wrapped for City Spotlight via `spotRecord()`; it already uses `tokenGameId(G)` receipts to prevent repeated match credit.
- `spotRecord()` excludes unfinished, simulated, fast and online matches, and only counts the eligible owner.
- City Spotlight grants existing rewards via `spotClaim()`; this is not an invitation to reuse the local preview's claim descriptor as a wallet credit.
- Harbour Ring already awards offline match rewards through existing progression/wallet paths; audit its own finalization path before adding any counters.

## Impact on PR #206

The four `weekly-challenges*` JavaScript modules and their tests are **isolated exploratory code**, not a new product feature ready for integration. Their Monday-UTC week, candidate goals and placeholder coins are NOT approved replacements for existing contracts. Their local storage would create a competing progress source.

**Do not mount `weekly-challenges-preview.js` in the home screen or connect `weekly-challenges-local.js` to gameplay. Do not merge this PR as-is.**

## Recommended Phase 3 implementation

1. Read and test the existing `WEEKLY`, `weekly()`, `weekNo()`, `progressGameEnd`, `paneSpotlight` and existing reward/receipt logic end-to-end.
2. Identify any genuine UX gap: make existing weekly progress visible in a small **read-only** home-screen entry point, linking to the existing Spotlight/Progress view.
3. Reuse the **existing** weekly progress, reset, currency and claim rules. Do not duplicate counters, wallet grants, or storage keys.
4. Add regression tests for match completion, purchase counting, save/resume, duplicate receipts, week rollover and mobile layouts.
5. Confirm Harbour Ring's completion reward logic and whether its participation should affect existing weekly objectives; do not infer parity.
6. Keep all production modifications in a separately reviewed PR, with iPhone Safari QA before merging.

## Status

This document records an audit finding, not completed Phase 3 integration. PR #206 remains a draft with no changes to production `game.html`, generated web files, wallet, native builds or backend.
