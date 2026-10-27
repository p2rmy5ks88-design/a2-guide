# Unlocked-token online regression — 27 October 2026

PR #16 fixes a confirmed snapshot-validation regression. The game offers six starter and ten unlockable tokens, but the online decoder accepted only the starter registry. Any valid game containing an unlockable token was rejected during remote updates and reconnect.

The decoder now accepts both existing approved registries. Unknown tokens still fail validation; this grants no token ownership or upgrade entitlement. No new token, artwork, UI, price or custom rule is introduced. The standalone page and offline cache manifest were regenerated. The property-service source pin was updated after auditing this one-line non-economic change.

Reproduction: the new source regression fails on the previous main source with `0 !== 1` (no snapshot applied), then passes after the fix. Ten source cases check updates and reconnect, one per unlockable token. Ten actual-browser cases check the real registry and serialized game. Existing unknown-token denial remains covered.

Verified implementation: `a515c24aa2287da4def13c7d06c51b6db5f00d86`.

- [Browser/game run](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40466805033): 175 simulations, 282 existing/expanded regression checks and 40 property-parity scenarios passed; no captured browser/game exceptions or failed economy invariants.
- [Security run](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40466805019): 58 property-kernel, 47 emulator/HTTP service and 55 candidate-permission checks passed. The four legacy source-rule allowances remain reproducible; no live rule deployment occurred.
- Build checks passed: [Android debug](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40466804927), [unsigned iOS simulator](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40466805094), [Linux desktop](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40466805052). These do not claim physical-device or store acceptance. No store upload occurred.

Re-run `node skyline-estates/tests/remote-state.cjs`; `SOURCE_REF` can select an earlier Git source for the failure demonstration. The stability workflow runs the real-browser cases and retains per-game JSON results. A final documentation-only commit records this report without changing tested code.
