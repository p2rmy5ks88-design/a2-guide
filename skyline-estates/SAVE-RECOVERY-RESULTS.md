# Save validation and recovery — Phase 1 follow-up

Related to issue #2. Branch: `skyline-phase1-save-recovery`, based on main merge `bf93fdcd8809a961ceac6ece6f511d55e666062d` (PR #3).

## Problem and behavior

Previously, `loadSave()` returned any JSON value: even `{}` appeared usable to Continue and then lacked the state needed to resume. Write/read failures were swallowed. Finishing an online game could also remove the device's unrelated offline save through `clearSave()`.

The follow-up validates core saved state: player IDs, cash and positions, settings, turn/phase, board ownership and buildings, 36-house/12-tower conservation, card-deck conservation and held Bail Passes. New saves use `{saveVersion:1,savedAt,game}`. Existing raw game-v1 saves still load unchanged and migrate at the next successful write. Unknown format/game versions are retained and cannot be overwritten by this older game.

Before replacing a valid save, retain it at `skylineSave.backup`. If the current save is unreadable, Continue can recover that earlier checkpoint and reports the recovery. Both unreadable slots produce a clear message instead of offering broken data to Continue. If a new game replaces unreadable current data, retain that raw data locally at `skylineSave.unreadable`. Validation never silently resets cash, ownership or rules to repair a broken economy.

Saving failures report that the game should be kept open. Save & exit returns to the active match if persistence fails. Online/simulation completion leaves offline saves alone; completed offline matches remove both active checkpoints so the backup cannot resurrect a finished game.

## Verification

- 41 save-recovery source tests pass locally, exercising the actual save/load/menu code with isolated storage. The malformed-state regression fails against the previous code (`{}` returned instead of null).
- All 10 existing saved-turn tests still pass. Their fixtures now include the real game's full core state.
- Nine browser checks were added: real Classic/Quick/Timed generated games save and reload, legacy format loads/migrates, and malformed current data recovers a real backup.
- The existing 175 seeded browser games and 29 trade/simulation checks remain in the PR workflow. The PR check and fresh JSON artifact give the browser outcome for this change; previously committed phase1.json belongs to the prior milestone.
- Source and standalone page save implementations are checked for equality. No artwork, 40-space board, scenery, CSS, layout or custom-rule changes.

Run from repository root:

```sh
node skyline-estates/tests/turn-resume.cjs
node skyline-estates/tests/save-recovery.cjs
# Full browser suite after installing the test dependencies as described in PHASE1-RESULTS.md:
npm test --prefix skyline-estates/tests
```

## Limits

Recovery may lose changes since the previous checkpoint; the message identifies it as an earlier saved turn. The backup is on the same device/browser and is not a cloud backup. Clearing browser data still removes saves. These changes do not add exact replay of an interrupted animation, auction or debt dialog. A few targeted storage-failure cases are injected in tests; physical Android and mobile OS lifecycle tests remain outstanding because no Android phone is available.

PR #3 was merged into main at the owner's request with push-triggered native jobs skipped. GitHub Pages independently built and published that web commit successfully. This follow-up is proposed separately for review.
