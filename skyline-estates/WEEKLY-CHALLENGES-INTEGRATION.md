# Phase 3 — Weekly Challenges integration contract (draft)

Status: **not live**. No source event hooks or wallet grants have been installed.

## Modules
- `weekly-challenges.js`: state, UTC Monday rollover, progress and claim descriptor.
- `weekly-challenges-local.js`: untrusted device-only preview persistence.
- `weekly-challenges-event-gate.js`: validates a narrowly scoped event envelope; not anti-cheat.
- `weekly-challenges-preview.js`: read-only UI, not mounted.

## Event envelope
```js
{
  type: 'harbour_ring_completed', // or match_completed / property_purchased
  source: 'harbour_ring_cpu',      // or classic_offline / living_city_offline
  id: 'stable-game-or-transaction-id',
  completed: true,
  practice: false,
  playerIsHuman: true
}
```
IDs must be stable across save/reload and unique per eligible event, not newly generated every time a screen renders. The gate prefixes the ID with event type and source. Only **validated host code** may produce this envelope; arbitrary window events and untrusted client messages must not be accepted. Do not call the gate directly from UI buttons.

## Required code audit before hooking
1. Find canonical end-of-match events and ensure they fire once after a finished match, not on abandoned, resumed or replayed results screens.
2. Find the committed property purchase transaction, not the offer/auction preview or an ownership redraw. Exclude CPU purchases.
3. Find Harbour Ring's final completed result after any payout/reward bookkeeping; do not count early exits or retries.
4. Confirm that existing stable match/transaction IDs are available; otherwise design persistence before enabling progress.
5. Confirm game mode classifications. The current gate **intentionally excludes online/ranked** until server validation exists.

## Reward and security requirements
- Current coin amounts are **placeholders**. No payout is connected.
- A local flag or event ID is not proof of a real match; client storage can be edited.
- Production reward claims require account-level server verification, atomic once-only crediting keyed by account/week/objective, and audit logs.
- No extra currency, no gameplay rule change, no TestFlight/App Store changes.

## Verification before merging
```sh
node skyline-estates/tests/weekly-challenges.cjs
node skyline-estates/tests/weekly-challenges-preview.cjs
node skyline-estates/tests/weekly-challenges-local.cjs
node skyline-estates/tests/weekly-challenges-event-gate.cjs
python3 skyline-estates/build.py --check
```
Then run existing stability, save/resume, Harbour Ring, Living City, online, security and responsive browser suites. Physical iPhone Safari testing is still required for any mounted UI. These commands have **not been executed by this handoff**.
