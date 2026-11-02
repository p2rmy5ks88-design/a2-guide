# Private coin purchase rollout — 2 November 2026

## Live backend (completed)

Owner explicitly resumed the rollout and separately approved the restricted runtime permissions at the permission-changing step.

- Previous revision: `skylineplayer-00001-zeh`, deployed 30 October, default compute identity.
- Source: `961e65554aeaf3c17d167f6b95fd9636023ee08f` (draft PR #92, stacked on stable build-153 restoration work). The reviewed service includes the previously merged #57/#66 changes.
- New revision: `skylineplayer-00002-hav`, ACTIVE; update time `2026-11-02T11:10:01.832298065Z`.
- Runtime: keyless `skyline-player@eko-estates.iam.gserviceaccount.com`; Firestore user, Firebase Auth user get/delete, log and metric writing, accessor on only the three Apple purchase secrets. No new private service-account key. Default compute roles and existing secret grants were not removed.
- Limits unchanged: europe-west1, Node 22, 256 MiB, 10 maximum instances, concurrency 40, 30-second timeout. No budget, spend cap, database rules, TTL, product price or other application changed.
- Previous function metadata and source ZIP preserved in the owner's Cloud Shell at `~/skyline-payment-rollout-20261102/before-function.json` and `before-source.zip`. Rollback requires redeploying that preserved source under the original default identity, not resetting player documents.

## Verification completed

- Prepared service loads with production and sandbox Apple clients and the dedicated identity guard.
- 9 purchase lifecycle checks, 16 cloud sync checks and 6 account-removal checks passed again in the deployment environment.
- Live anonymous profile request: 401 / unauthenticated. Unknown Origin: 403. Invalid sign-in token: 401.
- Apple Sandbox TEST notification: Apple's delivery status SUCCESS. This verifies transport only; it is not a real purchase or refund acceptance test.
- New revision ERROR-log query returned no entries at the check time.
- Existing owner and reviewer auth accounts remain present and enabled. Owner remains a normal, non-tester player. No existing wallet was reset.
- Owner created a fresh email/password tester; only that fresh account was marked. Exactly two active tester records remain: that account and the existing reviewer demo. Email verification must be performed by the owner.
- Read saved Apple prices without editing: 600 / 1,500 / 4,000 / 10,000 coins = 9 / 19 / 49 / 99 SEK. Products remain drafts; not added to review.

## Private build

GitHub run [41434207801](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/41434207801): build **154**, source `961e655`, `cloud_channel=private-testing`, `publish=true`, `local_test_rewards=false`. Public purchase activation PR #68 remains unmerged.

All workflow steps passed, including native guardrails, web packaging, unsigned simulator compilation, signing checks, archive and upload. Xcode reported Uploaded App / EXPORT SUCCEEDED at 11:17:24 UTC (12:17 Stockholm). Apple completed processing. Version **1.0.154 (154)** is **Ready to Test / Internal**, assigned to **Skyline iOS QA** (one tester). Apple build ID `eaf9b41d-a2a8-4582-96ae-1d8cd578dd39`. Private What to Test instructions were saved. Physical installation and payment acceptance remain pending owner confirmation.

## Public submission protected

Read directly in App Store Connect during this session: **iOS 1.0, build 85, Waiting for Review**. No withdrawal, replacement, resubmission, product attachment or release change was made. Public purchases remain off.

## Remaining acceptance

Fresh tester must verify email and explicitly use its account progress (never import the owner's local promo backup). On the private TestFlight build: purchase +600 once; cancel +0; interrupted delivery +600 exactly once; refund of one transaction removes 600 after Apple's verified notification; sign-out restores the local save. Real transactions, refund/debt, reinstall and physical-device acceptance remain unverified until recorded. Keep the normal Apple account on the phone; TestFlight purchases are free and the game test login requires no card.

Before any future public payment release, complete environment/tester/reviewer prepayment handling and the remaining payment acceptance gates in PAYMENT-PREPARATION.md. Do not merge the activation-only PR #68 as a shortcut.
