# Isolated web competition service

Status: implemented and tested in isolated stores; NOT deployed or enabled. Production capabilities endpoint returned404 in this task. This is a separate `skyline-competition` codebase and function `skylineCompetition` in europe-west1, project eko-estates. No Apple/IAP modules, wallet service, native build, billing change, or database-rule deployment is included.

## Access required

Firebase is installed. Local npm/npx setup was repaired, but local package DNS remains unavailable. An authenticated Cloud Shell owner session for eko-estates is now available; Firebase CLI15.34.2 runs there using existing Google authorization. Live rules were read and confirm direct skylineV2 client access is denied. Required APIs and existing billing are enabled. An isolated runtime account/custom role is planned; its specific grant requires action-time confirmation. Public project config and the existing profile endpoint can be read; that does not authorize Admin deployment or IAM inspection. Use the authorized Cloud Shell session for project inspection and deployment. Do not copy secrets into chat. Official project: https://console.firebase.google.com/project/eko-estates/overview ; official CLI authentication reference: https://firebase.google.com/docs/cli#sign-in-test-cli . After connection, the agent should inspect actual IAM/APIs/billing, reuse existing resources, and deploy only this codebase. No new paid infrastructure is authorized.

## Packaging and deployment

`node prepare.cjs` copies the pinned game.html and exact transitive server dependencies into ignored runtime/. `node prepare.cjs --check` verifies equality. Dependencies reuse existing project versions. With an authorized Firebase session: `firebase deploy --project eko-estates --config firebase.json --only functions:skyline-competition`. Never deploy the sibling Apple-coupled player codebase, hosting rewrites or database rules as part of this command.

The service uses Admin SDK access to the existing Realtime Database, verifies Firebase ID tokens with revocation checks and stores protected state under skylineV2. Existing shipped legacy rules deny unspecified skylineV2 access; reviewed v2 rules also deny client game-state writes. No rule is weakened here. Before deployment, read actual deployed rules and verify that root/ancestor grants do not allow client writes into skylineV2; if they do, do not enable competition until a reviewed restrictive rule update passes emulator and staging tests.

Manual GitHub deployment workflow is prepared using short-lived Google Workload Identity Federation. It requires existing/reviewed project authorization; it fails closed if repository deployment variables are absent. No service-account key is stored. Configuring IAM/WIF requires the connected authorized Google account and must stay restricted to this repository/main branch and the isolated competition runtime.

## Acceptance gate before enabling web config

1. Confirm authenticated IAM/API/database access and existing project billing constraints; do not purchase or enable new paid resources without authorization.
2. Deploy only isolated function; verify unauthenticated profile/rank/contribution requests fail401, foreign origins403, forged fields400, revocation/room-membership failures403, and arbitrary browser writes into protected result/ranking/project paths fail.
3. Complete real two-account ten-round matches through authenticated HTTP, including refresh/reconnect/lost acknowledgements, jail/cards/debt/auction/trades, correct cities and result hashes.
4. Verify all five ranking categories, sorting, private defaults/opt-out, mode separation, duplicate/replay rejection, daily cap, Season/week boundaries and authoritative community totals. Never seed fake production participants or project totals. Test goal/badge boundaries only in emulator/staging.
5. Test the enabled browser controls in Chromium and WebKit against staging then production, confirm original saves/SC/Coins are unchanged, and only then commit web/verified-config.js enabled:true as its own verified web release.

Expected service base (not live at writing): https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition . Public GET /v1/competition/capabilities; authenticated POST /v1/competition/me, profile, ingest, rankings, community, project/claim; audited /v2/rooms/* and /v2/game/* transports. Scores are never request fields.

## Scoring and community

Standardized two-human timed10, SC1.6B, level-one tokens, no perks/minigames/events/practice. Four actual boards. Only protected source-pinned, completed, matching-hash results with at least5rounds/2minutes and same start/end Season count. Three results per account per UTC day. Competition points60win/-8loss (floor0), tied net worth0points; actual maximum net worth/development and per-city maxima; weekly points grouped by server UTC week. Competition league uses existing thresholds, displayed separately from the device profile. No SC/Coins/purchases awarded.

Skyline Bridge goal1000 eligible contributions per Season. Opt-in only, one contribution per eligible participant/result, daily cap3; no wallet donations. A contributor can claim a decorative server-side badge exactly once after the actual goal. Shared progress is never simulated. Guest accounts use existing Firebase anonymous auth and can be lost if browser sign-in data is cleared. Server control prevents forged browser scores; collusion, new-account abuse and matchmaking strength still need operational monitoring before prizes are considered. Root RTDB transactions fit an initial limited release; indexed projections/retention are needed before large-scale traffic.
