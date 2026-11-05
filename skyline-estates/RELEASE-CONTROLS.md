# Release, migration and backup controls (Task 01)

## Build flow

```
game.html (hash-pinned in security/service/audited-rules.cjs)
  + release_hotfixes.py patches
  + lib/*.js, home-redesign.js, reference-redesign.js, web/*
        │  python3 build.py
        ▼
index.html, web-*.html, offline-assets.js, sw.js (build hash stamped)
        │  merge to main → GitHub Pages (static)
        ▼
production web (verify: live sw.js build hash == main's sw.js)

skyline-estates-app/scripts/build-web.mjs
  → build.py --emit-app-body + copies lib/, web/, *-redesign.js into www/
        │  skyline-ios.yml (manual dispatch)
        ▼
signed IPA → TestFlight, ONLY when publish=true (otherwise build/test only)
```

## Reproducible build and freshness

- **Build:** `python3 build.py`
- **Freshness gate:** `python3 build.py --check`, which also runs in CI (`skyline-stability`).
- **Pipeline guard:** `python3 tests/build-pipelines.py` checks the workflow triggers and limits.

## Release boundaries

- `build-ipa.yml` runs on every push to main. It produces an unsigned build only and uploads nothing. Main commits still carry `[skip actions]` to save CI minutes.
- `skyline-ios.yml` reaches TestFlight only from `workflow_dispatch` with `publish=true`. The `ios-release` channel also validates the selected App Store version. Neither path submits for App Store review.
- `skyline-competition-deploy.yml` is dispatch-only. The backend deploy stays paused until the owner approves.
- Android and desktop are dispatch or PR builds only, with no store upload.
- Every change goes through a feature branch and a PR, and the PR records the merge SHA.

## Save and profile fixtures (non-destructive, in-memory or synthetic storage)

| Test | Covers |
|---|---|
| tests/sc-wallet.cjs | Legacy `scReserve` → receipt wallet migration (idempotent); no re-credit of old claims; invalid balances fail closed without deleting data; practice spend limits. |
| tests/collection-sc.cjs | SC upgrade receipts; replay can't double-debit; `repair()` re-applies paid levels; legacy estate receipt prices honoured. |
| tests/currency-sc.cjs | SC vs Coins separation. |
| tests/save-recovery.cjs | Corrupt or partial save recovery. |
| tests/cloud-restore.cjs | Cloud restore merge without losing local progress. |
| tests/offline-worker.cjs, offline-startup.cjs | Service-worker update waits for open game tabs; offline boot. |

## Rollback

- **Web:**
  - `git revert -m 1 <merge-sha>` on a branch, then open a PR, rebuild (`build.py`) and merge.
  - Pages serves the previous assets and the service worker picks up the new build hash.
  - No path clears localStorage, IndexedDB or caches. Saves, SC receipts and Coins survive both a rollback and a roll-forward, because receipts are append-only and keyed by id.
- **Native:** expire the bad build in TestFlight, then re-dispatch `skyline-ios.yml` at the previous good SHA. Owner authorization is required.
- **Backend:** redeploy the previous revision. Owner authorization is required.

## Smoke-test log — 5 Nov 2026, main `d1cceae`

| Check | Result |
|---|---|
| sc-wallet, collection-sc, currency-sc | PASS |
| save-recovery, cloud-restore | PASS |
| offline-worker, offline-startup | PASS |
| release-content | PASS |
| build.py --check, tests/build-pipelines.py | PASS |

These checks do **not** prove the following, which stay as separate gates:

- physical-device save and restore;
- iCloud or Firebase sync on real accounts;
- StoreKit sandbox;
- production backend.
