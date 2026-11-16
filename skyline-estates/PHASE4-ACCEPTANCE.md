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
- [ ] Complete manual Chromium and WebKit visual review across all requested sizes. Existing dual-engine tests pass touch reachability; WebKit 844×390 captured community and friend-result screenshots were manually inspected from artifact `skyline-visual-webkit` (run 43862503320): text is readable and actions are not visibly obscured at the captured scroll position. Chromium 844×390 comparison/community screenshots were also inspected: bottom navigation remains visible and action buttons have accessible touch area at the captured scroll positions. The top of the cards is outside the viewport due to scroll position, so these screenshots do not prove complete-page layout or smaller viewport behavior. Remaining states/sizes require review.
- [ ] Check public capabilities endpoint status, origin restrictions and failure modes without credentials or mutations. Initial external read-only request was not accessible through the available web gateway; **no live status claim is made**.
- [x] Static review: `compose.cjs` restricts CORS to the GitHub Pages origin and local/native origins, requires bearer authentication on POST competition routes, and exposes only GET capabilities publicly. These are source-code findings, not deployed-service verification.
- [x] Static review: `verified.js` labels casual scores as ineligible for verified rankings, requires session auth, and uses server-scored match ingest; `social.js` marks manual friend results as device reports.
- [x] Existing isolated service, transaction, match, social and browser regression suites passed in both Chromium and WebKit on initial PR commit `5a7a71a` (GitHub Actions run 43862503320). WebKit artifact reports 29 casual social browser checks and 10 mocked verified browser checks, zero page errors. These are mocked/isolated, not live two-account acceptance. Latest branch CI at `c2584604` completed successfully (run 43866621154): all nine jobs passed, including both browser engines and the Stability gate.
- [ ] With explicitly authorized private release-test identities only: complete two-account production acceptance per `competition-functions/DEPLOY.md`, including reconnect, duplicate ingest, ranking opt-out and community receipts.
- [ ] Review rate limiting, abuse controls and operational monitoring limitations before release.
- [ ] Record evidence and remaining blockers; merge only verified changes; separately verify Pages deployment before any TestFlight upload.

## Known evidence limits
Source code and green CI do not establish that production Firebase is healthy, that two real authenticated sessions complete matches, or that browser controls are usable on a physical iPhone. The opt-in production harness is intentionally not part of normal CI. A server-verified badge is decorative; no wallet payout is authorized. Production status must be reported separately from local/CI acceptance.

## Browser artifact evidence (initial PR run 43862503320)

| Engine | Casual social checks | Mock verified checks | Browser errors | Artifacts |
|---|---:|---:|---:|---|
| Chromium | 29 | 10 | 0 | `skyline-visual-chromium` |
| WebKit | 29 | 10 | 0 | `skyline-visual-webkit` |

Both reports have no failure field. Captured comparison and community screenshots were manually inspected at their recorded scroll positions; no obvious bottom dock obstruction was observed. This is **not** evidence of authenticated production matches, complete page visibility, or physical Safari acceptance.

## Production acceptance decision

**Current decision: HOLD for verified competition production acceptance; no TestFlight submission or backend mutation.** A direct read-only capabilities request through the available web gateway returned an access error, which cannot distinguish a network restriction from a service issue. The authorized two-account production harness has not run. No production credentials or test identities are stored in this PR.

Before removing HOLD, the release operator must collect a successful public capabilities response from the actual deployment, run the opt-in production harness with two explicitly authorized test accounts, confirm results and privacy opt-out, and attach a sanitized acceptance summary. If the live endpoint is unavailable, keep the existing casual/offline experience intact and investigate service health without altering production data.

## Reuse the existing two test accounts (no new account creation)

The production harness now accepts `COMPETITION_ACCEPTANCE_SESSIONS_FILE` pointing to an **existing local mode-0600 JSON file**. It must contain exactly two distinct authenticated Firebase sessions in the existing harness format (`version:1`, `accounts:[{uid,idToken,refreshToken,expires}, ...]`, `matches:{}`). `expires` is a millisecond epoch timestamp. This file is read and refreshed locally, **never committed or printed**. Obtain sessions for the two approved accounts with the private sign-in procedure below; the separate Living City allowlist contains email hashes only and is **not** sufficient authentication for competition.

### Private sign-in for the two approved QA accounts (Cloud Shell)

The two approved accounts are existing **email-and-password** Firebase accounts. `tools/qa-session-signin.cjs` signs in to them and writes the session file. It uses only `accounts:signInWithPassword` and `accounts:lookup`, never sign-up, so it cannot create an account.

1. Open Cloud Shell in the `eko-estates` project and go to the repository root on this branch.
2. Run `node skyline-estates/tools/qa-session-signin.cjs`.
3. Type each account's email and password when asked. The password is hidden; nothing goes on the command line or into shell history.
4. The tool prints only "signed in", the last four characters of each user ID and whether the email is verified. It writes `~/.skyline-qa/competition-sessions.json` (folder mode 700, file mode 600) and stops without writing if a sign-in fails or both entries are the same account.
5. Run `export PRIVATE_QA_SESSION_FILE="$HOME/.skyline-qa/competition-sessions.json"`.

Sessions expire after about an hour, but the harness refreshes them with the stored refresh token. Run the tool with `--replace` to sign in again (for example after a password change). Never `cat`, copy or upload the file. Delete it when acceptance is finished: `rm -f "$PRIVATE_QA_SESSION_FILE"`. The offline test `tests/qa-session-signin.cjs` covers this tool in CI against a local mock service.

With authorized Cloud Shell access, a release operator may run:

```sh
chmod 600 "$PRIVATE_QA_SESSION_FILE"
COMPETITION_ACCEPTANCE_SESSIONS_FILE="$PRIVATE_QA_SESSION_FILE" \
  COMPETITION_PRODUCTION_ACCEPT=1 \
  node skyline-estates/tests/competition-production.cjs
```

When the environment variable is supplied, missing/invalid/incomplete session files fail closed and the script **will not create anonymous accounts**. Do not paste credentials, tokens, or private session files into GitHub, chat, logs or CI artifacts. The test still writes legitimate QA match and ranking records to production; obtain authorization and review cleanup/retention first. The default script behavior without the variable remains unchanged for backward compatibility. No production test was executed as part of this PR.
