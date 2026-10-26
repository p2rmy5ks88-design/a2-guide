# Offline web startup — Phase 1 follow-up

The previous browser pass showed that an open game could save offline but could not reload with both network and ordinary HTTP cache unavailable. This change adds an installable local copy for Skyline's web page; native wrappers continue using their packaged assets.

## Behavior and scope

After an initial online installation, a same-folder service worker serves the game shell and approved local assets without a connection. The generated manifest currently covers **137 files, about 20.1 MiB**: the page, icons, privacy page, manifest, art, items, city photos, rider models and local 3D libraries. Files are cached without modifying their contents.

The worker handles only declared GET assets and the Skyline root/index navigation inside its own folder. It does not intercept writes, online room/API paths, neighbouring apps, external fonts or radio services. Game saves remain in the existing local save/backup system, separate from cached application files. Offline fonts can use the existing system fallback; online features still need a connection.

Installations succeed only after every declared resource downloads. A failed candidate cache is discarded while the working version is kept. Updates do not call skipWaiting: a new complete version waits until old game tabs close, then activates and removes only this folder's obsolete cache versions. Close all Skyline tabs and reopen to adopt a waiting version; a running match is not forcibly replaced.

No existing artwork, board spaces, scenery, layout, labels or custom game rules are changed. A brief Ready to play offline message appears only after the first complete installation. An inline secure-context registration skips native/desktop wrappers. The app's existing native packaging does not need the web service worker.

## Reproducible builds and tests

`python3 skyline-estates/build.py` preserves the standalone wrapper and regenerates `offline-assets.js`. Its version hashes canonical text/binary assets and the worker source. `--check` rejects stale generated output; it runs in CI. Rebuild after game, worker or cached asset changes.

- 15 local worker/client checks passed: installation, failed-install rollback, scoped cleanup, root/index/query navigation, asset caching, storage failure fallback, excluded writes/API/neighbouring apps native registration guards and the installation-readiness message.
- The new browser suite exercises cold offline tabs with HTTP cache disabled, local artwork, actual offline roll/buy/save/continue, exclusion of room/write/neighbour traffic, failed and successful updates, delayed activation, safe cleanup, saved-state retention and offline 3D startup. A synthetic version marker is served only by the test server to prove the updated cached document is used.
- Existing source, human-flow, economy, save and view suites disable service workers for isolation. Their negative no-worker reload case describes that isolated context; production offline behavior is verified by `offline-startup.cjs`.
- Final CI results and JSON reports are recorded on the PR before merging. Earlier passing results are not evidence for an untested head.

Run after installing the existing test dependencies:

```sh
python3 skyline-estates/build.py --check
npm run test:offline --prefix skyline-estates/tests
```

The first successful online installation is required. Offline opening cannot work before it completes, or after browser storage is cleared/evicted. This milestone does not claim physical Android/iOS lifecycle or App Store readiness. Full ordinary-start human matches, native builds, multiplayer security and payments/store checks remain in issue #2.

Lifecycle/reference behavior follows [MDN's service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and [imported-script cache update settings](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache).
