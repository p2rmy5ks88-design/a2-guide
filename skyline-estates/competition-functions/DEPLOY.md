# Isolated web competition service

Status: deployed to eko-estates, europe-west1 as the isolated `skyline-competition` codebase / `skylineCompetition` function. Web activation remains gated on authenticated production acceptance and browser checks. The existing `skylinePlayer` function, Apple/IAP, wallet service, native builds, billing settings and database rules are unchanged.

## Deployment access and isolation

The authorized Cloud Shell session deployed this service with Firebase CLI 15.34.2 using the existing Google authorization. Local package DNS remains unavailable; no credentials or service-account keys were copied into the repository. Existing APIs and billing were reused.

Runtime identity: `skyline-competition@eko-estates.iam.gserviceaccount.com`. Approved custom role `projects/eko-estates/roles/skylineCompetitionRuntime` has exactly `firebasedatabase.instances.get`, `firebasedatabase.instances.update`, and `firebaseauth.users.get`. This supports protected database transactions and token-revocation checks; it does not grant Firestore wallet, Apple secrets, purchase validation, billing management or account-deletion permissions. RTDB IAM permissions cover the instance; the code adapter restricts all paths to skylineV2 and its room reads. The existing database is shared, so code isolation is essential.

Live deployed rules were inspected before deployment. Neither unauthenticated clients nor a valid signed-in guest can directly read or write skylineV2. No database rules were changed. Required APIs were already enabled. The function uses Node22, minInstances0, maxInstances3, concurrency10 and 30-second request timeout.

## Packaging and deployment

`node prepare.cjs` copies the pinned game.html and exact transitive server dependencies into ignored runtime/. `node prepare.cjs --check` verifies equality. Dependencies reuse existing project versions. With an authorized Firebase session: `firebase deploy --project eko-estates --config firebase.json --only functions:skyline-competition`. Never deploy the sibling Apple-coupled player codebase, hosting rewrites or database rules as part of this command.

The service uses server-side IAM-authenticated conditional REST transactions (fresh acknowledged reads, ETag compare-and-set, bounded retries, no cached parent replacement) against the existing Realtime Database, verifies Firebase ID tokens with revocation checks and stores protected state under skylineV2. Existing shipped legacy rules deny unspecified skylineV2 access; reviewed v2 rules also deny client game-state writes. No rule is weakened here. Before deployment, read actual deployed rules and verify that root/ancestor grants do not allow client writes into skylineV2; if they do, do not enable competition until a reviewed restrictive rule update passes emulator and staging tests.

Manual GitHub deployment workflow is prepared using short-lived Google Workload Identity Federation. It requires existing/reviewed project authorization; it fails closed if repository deployment variables are absent. No service-account key is stored. Configuring IAM/WIF requires the connected authorized Google account and must stay restricted to this repository/main branch and the isolated competition runtime.

## Acceptance gate before enabling web config

1. Confirm authenticated IAM/API/database access and existing project billing constraints; do not purchase or enable new paid resources without authorization.
2. Deploy only isolated function; verify unauthenticated profile/rank/contribution requests fail401, foreign origins403, forged fields400, revocation/room-membership failures403, and arbitrary browser writes into protected result/ranking/project paths fail.
3. Complete real two-account ten-round matches through authenticated HTTP, including refresh/reconnect/lost acknowledgements, jail/cards/debt/auction/trades, correct cities and result hashes.
4. Verify all five ranking categories, sorting, private defaults/opt-out, mode separation, duplicate/replay rejection, daily cap, Season/week boundaries and authoritative community totals. Never seed fake production participants or project totals. Test goal/badge boundaries only in emulator/staging.
5. Test the enabled browser controls in Chromium and WebKit against staging then production, confirm original saves/SC/Coins are unchanged, and only then commit web/verified-config.js enabled:true as its own verified web release.

Deployed service base: https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition . Public GET /v1/competition/capabilities; authenticated POST /v1/competition/me, profile, ingest, rankings, community, project/claim; audited /v2/rooms/* and /v2/game/* transports. Scores are never request fields.

## Scoring and community

Standardized two-human timed10, SC1.6B, level-one tokens, no perks/minigames/events/practice. Four actual boards. Only protected source-pinned, completed, matching-hash results with at least5rounds/2minutes and same start/end Season count. Three results per account per UTC day. Competition points60win/-8loss (floor0), tied net worth0points; actual maximum net worth/development and per-city maxima; weekly points grouped by server UTC week. Competition league uses existing thresholds, displayed separately from the device profile. No SC/Coins/purchases awarded.

Skyline Bridge goal1000 eligible contributions per Season. Opt-in only, one contribution per eligible participant/result, daily cap3; no wallet donations. A contributor can claim a decorative server-side badge exactly once after the actual goal. Shared progress is never simulated. Guest accounts use existing Firebase anonymous auth and can be lost if browser sign-in data is cleared. Server control prevents forged browser scores; collusion, new-account abuse and matchmaking strength still need operational monitoring before prizes are considered. Root RTDB transactions fit an initial limited release; indexed projections/retention are needed before large-scale traffic.

## Production persistence acceptance

A pre-activation live match exposed lost state in the initial SDK transaction composition. Activation remained off. The isolated function now uses conditional REST writes with server ETags; no-op authorization reads perform no write. Conflicts re-evaluate the complete callback against the latest acknowledged value; out-of-namespace paths and null subtree deletion are rejected. Tests also model Firebase dropping empty maps, which are normalized on each competition/profile read. The production acceptance script reuses private release-test identities, completes new natural matches, checks result deduplication and verifies live opt-in contributions. Its credentials remain only in a mode0600 Cloud Shell temporary file and never enter reports.

The manual GitHub deployment workflow is a prepared optional path, not the path used for this release. Its repository WIF variables are not configured and it intentionally fails closed. Future deployments can use an authorized Cloud Shell session with the scoped command above. Rollback web activation with enabled:false and rebuild manifests; do not erase protected results or redeploy wallet/native codebases.
