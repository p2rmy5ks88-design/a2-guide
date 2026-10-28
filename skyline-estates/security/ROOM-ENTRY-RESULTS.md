# Recoverable room entry and private invitations — 28 October 2026

## Confirmed privacy failure and fix

On the prior trusted-service baseline, after the host left a two-member lobby, replaying that host's original create request returned the old invitation again and the old invitation remained active. The baseline reproduction printed formerHostReceivesInvite=true and oldInvitationStillActive=true and failed its redaction assertion.

The current service invalidates invitations when the host leaves. The new host must explicitly issue a replacement; only that verified host can rotate it. Original create/rotation replay and recovery re-expose a secret only while the caller remains the current member/host in a lobby and that capability is still active. Old links fail admission; rotation does not evict players already admitted. These changes affect the isolated v2 service, not the shipped legacy room service or live Firebase permissions.

## Implemented

- HTTPS origin/account-bound room transport; durable request ID and canonical digest saved before authentication/network. Cross-tab locks fence outstanding admission intents. Journals exclude raw invites/share links, tokens, names and settings.
- Authenticated admission settlement returns an existing owner receipt or records a retirement marker that prevents a late original create/join/leave/rotation from applying. No fresh-ID automatic retry after uncertainty. Lost leave replies recover after membership has gone. Private invite recovery is current-authority checked, not just a historical success replay.
- Admission action markers prevent treating game receipts as admission receipts; old unmarked ledgers fail closed in the new settlement path. No unreviewed legacy ledger migration.
- Private HTTPS fragment links are accepted only for the configured game origin/path. The capability is not in request path/query, but remains a secret visible to recipients and same-page scripts. Native app-link associations and public URL routing are not activated.
- Explicit Create/Join-by-link/Replace invitation/Leave/recovery controls hand fresh authorized rooms to the tested waiting-room controls. The UI reads current membership before granting entry or displaying a host share link. The waiting-room callback also exposes replacement links to a transferred host. Acknowledged admission intents with freshly confirmed lost membership are cleared without granting entry; uncertain/transient failures stay recoverable. No profile currency/XP is issued.

## Verification

Local: 21 actual-service/client/invitation/helper cases, eleven real Chrome two-context entry cases, 17 waiting-room controller and 20 canonical-start cases passed. Browser file mode uses test-only data-URL imports/local service bridge; it is not HTTP/CORS or production Firebase evidence. It covers lost create/join/leave replies, reload, stale/foreign links, replacement invitations, secret-free storage, same-room recovery and waiting-room handoff without profile rewards. Ten new real Auth/Database/HTTP cases are wired into isolated CI, including two Admin connections and retirement of a delayed original create.

Generated web/offline assets are current; game source/art/board/scenery/custom rules are unchanged. No native rebuild is needed for these opt-in service modules. The owner reports Blaze active and plans Apple membership renewal; this work makes no billing, credential, live rule, service deployment or store publication change.

## Remaining production gates

The shipped title still uses its existing flow. Production authentication/entry routing, last-room restore, native link association, entitlement resolver, initial board handoff recovery, full supported gameplay/AI/timers/minigames, rate/abuse limits, invitation expiry and ledger/room retention, project incarnation/migration/rollback and staging deployment require further work. The existing v2 whole-subtree transaction is a known scaling hotspot. Signing/distribution waits for Apple access where required; backend development is independent.

## CI evidence

Initial tested implementation: 92dd9899fdd2bb7712e6864b8c51a14df2c0ef3d (PR #43); further host-transfer UI/helper cases follow on the final tested revision.

[Security/Auth/Database run 40740439664](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40740439664) passed: 234 real integration cases (224 prior plus ten room-entry cases), 57 candidate permission checks, 20 new room-entry service/client/link cases and previous kernel/service suites. [Retained results](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40740439664/artifacts/12838832334). The prior first implementation also passed all 234 integration checks.

The first HTTP browser run passed create/join/invitation recovery but checked the guest handoff counter before its asynchronous lobby read completed. The test now waits for both handoffs explicitly; no runtime change was made for that timing correction.

The host-transfer waiting-room invitation controls and confirmed-membership-loss cleanup were added after reviewing the first corrected run. Their final HTTP/browser/gameplay evidence follows after completion.
