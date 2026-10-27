# Trades with exact-offer consent — 2026-10-27

Related to issue #2 and PR #26. Tested implementation: `21c19efbe941c050e3ba9c898f84cb07359c765b`.

## Change

The internal turn service now supports human proposeTrade/replyTrade commands during the current turn's pre/post phase. Proposal transfers nothing. Only the current recipient can accept, decline or counter; the server derives the proposer seat and rechecks both participants' verified membership/seat identities.

A proposal identity binds authenticated room/revision/request data. Its offer hash binds that generation, exact terms, turn/phase and counter depth. Acceptance cannot supply altered terms. Counteroffers return to the previous proposer, require a fresh response and retain the source limit of three counters. A later identical proposal gets a new identity; old consent or a late old decline cannot act on it.

Pinned original validTrade/resolveTrade/executeTrade and the trade-counter hook supply financial eligibility, logs, transfers and counters. Developed-group restrictions, mortgage flags and Bail Pass behavior remain unchanged. Whole nonnegative safe cash and the editor's nonempty-offer constraint are enforced. The source's sequential order when both Bail Pass flags are set is deliberately preserved; card provenance is not redesigned.

Each offer/response commits state, revision, current-recipient checkpoint and shared receipt together. Retries/recreated services recover the same receipt. Competing responses accept only one revision. Pending offers fence other offers, property edits, rolls and end-turn. No local profile reward is issued.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40519213935): **199 full game/source offer-depth comparisons across 97 scenarios**, zero captured browser exceptions. Uses actual resolveTrade/executeTrade with controlled human modal/editor responses. Covers 2–6 seats, rotated current player, pre/post phases, acceptance/decline/counters, mortgage flags, cash/property gifts, Bail Passes, jailed recipients and localization.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40519214114): **118 trade kernel checks, 12 trade service checks and 161 total integration checks (12 new trade cases)**. Includes concurrent proposals/acceptances, accept-versus-decline, a fresh Admin connection, lost replies, counter authority, old hashes, later identical proposals, late old replies, property/turn fences, both-party membership, uncertain timeout/revocation and offline decision denial. Prior kernels and 55 candidate permission checks passed; four legacy allowances remain reproducible only in the demo emulator.
- Prior browser comparisons passed: 754 reroll, 95 debt, 568 auction, 377 card, 157 jail, 104 end/progression, 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regression checks passed.
- `window.__sim`: **175 seeded games** (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. No errors or cash/house-bank/hotel-bank failures. Artifact `skyline-stability-results/skyline-phase1.json` records every run's rounds/errors/invariants/outcome.
- Normal-start Classic/Quick/timed matches finished naturally at rounds 60/30/11, Seat 0 winning each. Detailed decisions/states are in the workflow artifact. Generated offline assets and whitespace checks passed.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No shipped game source, 40-space board/art/scenery/UI or custom values changed. No confirmed shipped gameplay bug required a source change.

This remains an isolated internal prototype. Public trade routes and actual v2 client migration remain disabled. No production Firebase/service deployment, native build or store release was performed. The published web game does not expose these internal changes.

AI trade decisions, server expiry/withdrawal/disconnect/forfeit policy, remaining AI workers, trusted rewards/entitlements, redacted live integration and production migration/incarnation/retention/privacy/scaling gates remain open. Legacy UI/network prompt timeouts are not implemented as a server expiry worker. Unavailable participants fail closed.

Phase 1 and issue #2 remain open. Next focused slice: trusted AI decision handling, estimated 90–120 minutes for the first slice, subject to findings.
