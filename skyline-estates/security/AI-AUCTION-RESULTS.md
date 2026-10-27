# First trusted AI slice: auction decisions — 2026-10-27

Related to issue #2 and PR #27. Tested implementation: `cbb2568d5e1d73788f835879b3beab5086585fe1`.

## Scope and behavior

This slice handles UID-less AI bidders during human-origin auctions. It does not implement complete AI turns or UID-bearing disconnected-player stand-ins.

The pinned original aiReserve/aiValue/aiBid functions supply difficulty, cash/threat reserve, group/rail/utility valuation, bid limits and the +10/+10/+20/+30/+50 increment pool. Only the integer index draw is replaced with the existing finite crypto-backed bounded tape. Decisions do not mutate game state; a deterministic drop needs no entropy.

An internal privileged worker service requires an explicit server-worker verifier. No permissive default, public route, client trigger, production worker credential or scheduler is added. Actor/decision/amount/entropy cannot be supplied in requests. The current private auction checkpoint, AI flags/UID, source/game hash, revision and active human owner's membership/seat are rechecked.

Reserve stores one immutable private decision/draw plan and receipt. Commit revalidates the saved source result without resampling, applies it through the original auction continuation, and atomically records state/revision, next human/AI checkpoint, plan consumption and receipt. Workers may fail over to an already saved plan. New IDs cannot create another plan for the same revision; retained consumed plans fence rollback replay. Every subsequent AI seat needs its own new-revision plan.

Human bid validation is unchanged; AI-only increments stay behind the worker path. Settlement still charges one winner and updates source counters once. Timeouts remain uncertain, not rollback: recover the original operation.

## Verification

- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40527717403): **1,022** full game/boundary/source-decision/draw-usage comparisons across **401 AI scenarios**, zero captured browser exceptions. Uses actual source aiBid with controlled random index and original auction execution. Covers all five draw indices, difficulties, cash levels, property types, group/rail/utility value, threat reserves, no-entropy drops, AI wins, human handoff and consecutive AI checkpoints.
- [Security/emulator workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40527717133): **415 AI kernel checks, 13 AI service checks and 175 total integration checks (14 new AI cases)**. Includes explicit worker authorization, different-entropy contenders, a fresh Admin connection, private REST denial, duplicate application, human/AI handoffs, lost reservation/application replies, deterministic drops, forged intents, uncertain timeout/owner revocation and offline recovery denial. Prior kernels and 55 candidate permission checks passed; four legacy allowances remain reproducible only in the demo emulator.
- Prior browser comparisons passed: 199 trade, 754 reroll, 95 debt, 568 auction, 377 card, 157 jail, 104 end/progression, 83 movement, 76 setup, 324 dice and 41 property checks. Existing 289 regressions passed.
- `window.__sim`: **175 seeded games** (100 classic, 25 quick, 25 timed, 25 optional rules), seed 20261026. No simulation errors or cash/house-bank/hotel-bank failures. Artifact `skyline-stability-results/skyline-phase1.json` records each run's rounds/errors/invariants/outcome. Normal-start Classic/Quick/timed matches finished naturally at rounds 41/25/11, each won by Seat 0; detailed states/decisions are in the workflow artifact.
- Generated offline assets and whitespace checks passed.

## Limits

Approved game source hash remains `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. No shipped game source, board/art/scenery/UI or custom values changed. No confirmed shipped gameplay bug required a source change.

This remains an isolated internal prototype with injected demo verifier credentials. Tests do not establish production IAM/signature verification, disabled-account lifecycle, multi-host scheduling or database failover. No actual v2 client migration, production Firebase/service deployment, native build or store release occurred. The published web game does not expose these internal changes.

AI rolls/movement/purchases/jail/debt/post-turn/trades, UID-bearing stand-in policy, worker orchestration, disconnect/expiry/rejoin/forfeit, trusted rewards/entitlements, redacted integration and production migration/incarnation/retention/privacy/scaling gates remain open. Phase 1 and issue #2 stay open.

Next focused slice: trusted AI rolls, movement and purchase decisions, estimated 90–120 minutes for that slice, subject to findings.
