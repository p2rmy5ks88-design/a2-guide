# Phase 4 — Social Competition acceptance and release gate

## Baseline (main, after Phase 3 merge)
Existing implementations, **not new feature requests**:
- `web/social.js` and `web/social.css`: device-reported casual asynchronous friend invitations; these are never verified rankings or prize inputs.
- `competition/service.cjs`, `competition-functions/index.cjs`, `competition-functions/transaction-store.cjs`: separate protected server-scored competition service, ranking and community projection.
- `web/verified-config.js`: competition `enabled:true` and isolated `skylineCompetition` URL.
- `tests/competition-service.cjs`, `competition-match.cjs`, `competition-transactions.cjs`, `social-browser.cjs`, `competition-production.cjs`: existing test harnesses.
- `competition-functions/DEPLOY.md`: deployment and production acceptance instructions. Note that its opening status text still says web activation is gated, while current config is enabled; verify actual deployed revision and production evidence rather than treating either statement as proof.

## Non-negotiable boundaries
- Do not introduce a second rankings/rewards engine, invent production players or scores, or award SC/Coins for untrusted challenges.
- Keep legacy casual matches and saved games intact; no Apple/IAP, wallet, security rules, native build or existing backend changes without separate approval.
- Do not run the production acceptance harness against real accounts until authorized credentials, limits and test identities are available. Never commit credentials or acceptance artifacts with account identifiers.
- No production Firebase deployment, paid resource enablement or live data reset in this branch.

## Acceptance sequence
- [x] Locate existing social/competition implementation and CI coverage.
- [x] Confirm Phase 3 main branch Pages/iOS/Android/Desktop builds succeeded.
- [ ] Review the enabled web UI against the live function capabilities and consent behavior (including sign-in failure, privacy opt-out, disabled/unavailable service).
- [ ] Validate that legacy device-reported rankings are clearly distinct from server-verified rankings; verify friend links never imply trusted scores.
- [ ] Inspect Chromium and WebKit 844×390 and 844×320 screenshots and verify safe areas, overlays and controls. Both engine jobs passed existing `social-browser` and `verified-browser` checks in run 43862503320; screenshots have not yet been manually reviewed.
- [ ] Check public capabilities endpoint status, origin restrictions and failure modes without credentials or mutations. Initial external read-only request was not accessible through the available web gateway; **no live status claim is made**.
- [x] Static review: `compose.cjs` restricts CORS to the GitHub Pages origin and local/native origins, requires bearer authentication on POST competition routes, and exposes only GET capabilities publicly. These are source-code findings, not deployed-service verification.
- [x] Static review: `verified.js` labels casual scores as ineligible for verified rankings, requires session auth, and uses server-scored match ingest; `social.js` marks manual friend results as device reports.
- [x] Existing isolated service, transaction, match, social and browser regression suites passed in both Chromium and WebKit on initial PR commit `5a7a71a` (GitHub Actions run 43862503320). The latest documentation-only commit's CI must be checked separately.
- [ ] With explicitly authorized private release-test identities only: complete two-account production acceptance per `competition-functions/DEPLOY.md`, including reconnect, duplicate ingest, ranking opt-out and community receipts.
- [ ] Review rate limiting, abuse controls and operational monitoring limitations before release.
- [ ] Record evidence and remaining blockers; merge only verified changes; separately verify Pages deployment before any TestFlight upload.

## Known evidence limits
Source code and green CI do not establish that production Firebase is healthy, that two real authenticated sessions complete matches, or that browser controls are usable on a physical iPhone. The opt-in production harness is intentionally not part of normal CI. A server-verified badge is decorative; no wallet payout is authorized. Production status must be reported separately from local/CI acceptance.
