# Public release checkpoint — 29 October 2026

Target: public iOS and Android release, as requested by the owner. This is an implementation checkpoint, not a release approval or evidence of production readiness.

## Completed in this change

Added an injectable purchase-delivery coordinator, with 14 passing regression cases. It verifies a purchase with the trusted wallet, queries durable delivery, and only then permits native completion. Concurrent duplicate callbacks share one operation. Offline verification and failed native completion can be retried. Pending/refunded delivery, malformed verification results and account changes cannot complete a purchase. Recovery isolates transaction failures and bounds each batch.

The coordinator is not yet wired into the native app. It does not create accounts, grant device coins, configure stores or enable payments. A native bridge must supply unfinished transactions at launch; the server remains responsible for authentication, purchase ownership, signature verification and idempotent grants. No receipt is written to browser storage by this module. Existing game saves and coins are untouched.

## Validation

- New coordinator: 14/14 local tests.
- Existing trusted wallet: 14/14 local fixture tests.
- Existing delivery/refund/spend: 18/18 local fixture tests.
- Existing store adapter: 9/9 local fixture tests.
- Total this checkpoint: 55 passing tests. These use injected store calls; they do not prove real store billing, live backend deployment or sandbox purchase acceptance.
- Added the coordinator tests to the existing isolated security CI job. Remote CI status must be checked separately.
- Previously accepted physical test: native Apple authorization in private TestFlight 1.0.39 (39). That diagnostic does not create a Firebase player account.

## Remaining sequence and estimates

1. Implement and test native billing integration, localized store prices and launch recovery; connect the coordinator. Choose StoreKit 2 or verify the existing plugin receipt contract before implementation. Estimate 60–120 minutes.
2. Deployable authenticated account/wallet API, deletion and Apple token revocation, scoped permissions, verified paid inventory and safe treatment of existing local coins/progress. Estimate 90–150 minutes. Never trust arbitrary local balances as verified paid funds or overwrite a local save during sign-in.
3. Store product drafts, purchase verification credentials, agreements/pricing and sandbox setup. Estimate 30–60 minutes once account access and required owner details are available. Source pack prices are drafts, not approved store prices. The displayed starter bundle has no matching server product and must stay unavailable.
4. Real sandbox purchase/reinstall/retry/refund acceptance, release candidate and public listing preparation. Estimate 60–120 minutes plus store processing/review time. Owner device testing will be required for final live-store acceptance.

These estimates overlap the earlier broad 3–6 hour estimate and may increase if store onboarding or account migration needs more work. Do not promise a public-release date before store readiness is verified.

## Release blockers

- Online accounts and purchases are currently paused in shipped game code.
- Native purchase integration and deployed trusted wallet/account service are absent.
- Account deletion/revocation and durable cross-device inventory need completion.
- Decide how legacy earned coins and local collections coexist with a secure paid wallet; preserve existing progress without trusting client financial claims.
- Verify Apple and Google product configuration, owner agreements/tax/banking status and current Android developer verification requirements. These are not confirmed complete.
- Review the exact Firebase deployment and permissions before changing production; never deploy the prototype deny-all rules over unrelated existing data.
- Real sandbox purchases/refunds and load testing remain required.
- Public store submission/release has been requested, but no submission or public release occurred in this checkpoint.

## Resume

Working branch: skyline-public-release-commerce. Continue this branch and draft PR. Keep generated screenshots/results and private signing material out of commits. Existing encrypted signing secrets and accepted TestFlight signing pipeline should be reused; do not regenerate keys unnecessarily. No scheduled resume has been created by this change.
