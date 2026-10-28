# Account UI and durable wallet delivery

Status: implementation and automated validation in progress. Production accounts, cloud progress sync and payments are NOT activated by this change.

## Implemented

- Profile menu entry for Account & recovery, with readable portrait/landscape dialog, email registration/sign-in, verification, password recovery, Apple/Google provider linking and sign-out. Default public state is an honest setup message. No Firebase account SDK is downloaded at ordinary game startup.
- Firebase JS SDK 13.1.0 is loaded from Google's official CDN only when enabled accounts are opened. Firebase owns credential persistence; no password is stored in preferences, logs or the account controller. Native OAuth requires the actual FirebaseAuthentication plugin and its platform configuration; missing native setup disables those methods instead of trying a web popup.
- Identity operations are serialized. Provider collisions never trigger automatic merges. Linking must preserve the UID; a changed identity is signed out. Device-local coins, collection and saved game are never copied or replaced by sign-in.
- Account removal is blocked until a secure deletion endpoint can remove cloud data and handle Apple token revocation. For that reason accounts must remain disabled in the shipped configuration until that endpoint and provider configuration are ready.
- Durable Google consumption outbox is committed atomically with the coin grant. AES-256-GCM protects persisted purchase tokens with environment-bound authenticated encryption. Delivery workers use expiring leases, bounded batches, retry backoff and an attention state; only confirmed consumption allows Google device finishing. Apple finishing remains device-side after durable server credit. No invented Apple consume endpoint is used.
- Refunds spend available balance first, then record a non-spendable deficit. Later credits clear that deficit before increasing available coins. Owned items stay intact; no payment-card charge is made. Server-catalog spending is optional and disabled unless explicitly configured; clients cannot submit prices or wins. Spending uses an idempotency journal and preserves owned entitlements on refund.
- Apple adapter uses signed-data verification, bundle/environment/product/quantity/account binding and revocation checks. Google adapter queries the authenticated Play API, requires purchased state and a mapped obfuscated account ID, checks environment/quantity, and re-queries consumption after a lost response. Store cryptographic and API behavior in unit tests uses explicit fixtures; real sandbox transactions are still required.
- Candidate outbox index and deny-by-default permissions only. No live Firebase rules were changed.

## Validation so far

- 11 account controller checks passed locally.
- 8 responsive/offline account browser checks passed with zero page errors.
- 14 existing wallet checks passed locally.
- 15 delivery, refund and spend checks passed locally, including lost responses, competing/expired leases, exhausted retries, refund deficits and duplicate spending.
- 8 store-adapter fixture tests passed locally. Full emulator/browser/native CI is being completed before merge. Account emulator tests use the same Firebase JS SDK 13.1.0 as the new browser loader, installed under a separate alias to preserve the existing rules-test dependency pins.
- Added real Auth emulator email registration, verification, reset and guest linking tests, plus 100 unique wallet purchases +100 duplicate delivery calls across two independent server instances with concurrency four. Results will include measured p50/p95 latency. These are correctness/contended-emulator load checks, not production capacity certification.

## Production gates and owner access

Firebase access was checked in the browser: only Anonymous is enabled. Email, Google and Apple provider setup has not been saved. Apple needs Services ID/code-flow configuration, team/key setup and callback https://eko-estates.firebaseapp.com/__/auth/handler; native platform registration and OAuth files/capabilities are also needed.

App Store Connect is at Apple sign-in. Google Play Console currently shows developer-account creation for the signed-in account; the owner is switching to the existing developer login. No new developer account, purchase agreement or paid service was created.

Before activation: secure deletion and migration endpoints; platform OAuth integration; server-issued purchase account bindings; real Apple trust roots/App Store app ID and Google API permissions; real sandbox receipt tests; authenticated Google Pub/Sub/Voided Purchases reconciliation and Apple refund handling (including refund reversal policy); encrypted-proof key management/rotation; dead-letter alerts and acknowledgement-deadline monitoring; starter-bundle entitlement restoration; production wallet partitioning/load validation and bounded server-side history queries; client checkout/reconnect; signed native and cross-device acceptance. Existing local saves remain the source for offline play and are not verified paid currency.

The current Realtime Database whole-namespace transaction remains a correctness prototype. Production payment activation requires reducing contention or migrating to a multi-document transaction store, then measuring realistic account/history sizes. No production payments or cloud-save durability claims are justified by this emulator test alone.

## Primary implementation references

- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/auth/web/account-linking
- https://firebase.google.com/docs/auth/web/apple
- https://github.com/firebase/firebase-js-sdk/releases/tag/firebase%4013.1.0
- https://github.com/apple/app-store-server-library-node
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/billing/rtdn-reference
