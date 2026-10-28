# Accounts, wallet and store rollout

Status: first implementation slice; no production login, cloud-save migration or paid purchase activation yet.

## What is saved today

The public game writes coins, XP, unlocks, token evolution and portfolio progression to device-local skylinePrefs. Native apps and browsers have separate saves. Existing Firebase room authentication does not make this an online wallet. Preserve these saves; do not uninstall the app to migrate. The existing promo reward is local and is not a verified purchase.

The owner selected Apple, Google and email sign-in. These providers must be explicitly linked to one Firebase UID. Never join accounts merely because an email string matches (Apple can use private relay addresses). Link an existing guest identity when safe; when a credential belongs to another UID, require authentication of both accounts and a reviewed server-side merge. Provide password reset, verified email, Apple nonce validation, recent-auth protections for account linking/deletion, and recovery before enabling purchases.

## Implemented in this slice

- Removed the approved-callback local coin grant and transaction finish. Orders and bridge initialization are paused on all platforms. Queued receipts are not acknowledged or discarded by this change. Local earned coins, purchases already recorded locally, XP, collections and saved games are preserved.
- Added an isolated server-only wallet service with mandatory trusted verifier dependencies. There are no HTTP endpoints, production configuration or imports into the shipped game. Candidate database rules deny all direct client access to this namespace; no live rules were changed.
- Four existing consumable product IDs have a server-owned catalog (500/1200/3000/7000 coins). Client amounts are ignored; unsupported quantities, app IDs, stores, environments and purchase states are rejected. Starter bundle delivery is deferred until durable non-consumable entitlements are implemented, including its existing 1500 coins, gold finish and midnight dice.
- A single atomic database transaction records ownership, balance and ledger. A hashed store/environment/transaction identity globally prevents double grants or reassignment between accounts. For Google the identifier must be the purchase token, not the order ID.
- Refund reversal and refund-before-purchase tombstones are idempotent. History is owner-scoped, returns the newest 50 entries and excludes raw store tokens. No client spending API exists in this foundation; refunds after spending, revocation reversal, pagination/retention and support tools remain required before production.
- Explicit sandbox/production separation, revoked-token checks, supported persistent providers and verified password email are required. Anonymous/custom room identities cannot claim a paid wallet.
- iOS CI now uses macOS 26, checks Xcode and iPhoneOS SDK >=26 before compilation and checks the actual device binary linked SDK after compilation. The minimum supported iPhone OS version is unchanged. This is a build requirement, not App Store acceptance.

## Remaining implementation, in order

1. Account UI and native Apple/Google/email authentication, safe provider linking and recovery; approximately 3–5 hours plus provider-console setup/testing. Keep the current local progress backup. Review migration rules before accepting any device-owned coins or XP into authoritative balances; unsigned local totals cannot be trusted as purchased currency. Offer a clear account/device save choice and protect existing collections.
2. StoreKit 2 and Play Billing bridge and server verification, approximately 4–8 hours plus sandbox access. The current installed Cordova bridge is not the completed native StoreKit 2 integration. The maintained native capacitor-plugin-cdv-purchase 13.19.1 declares compatibility with Capacitor 6/7/8 and uses StoreKit 2 and Play Billing 9.0.0 in its native source. Its separate module must be bundled/imported and tested; replacing a package name alone is insufficient. Pin the validated version and audit native privacy behavior. Store prices must be localized from the store.
3. Deploy verified wallet endpoints, durable delivery/consume/ack recovery, refund notification adapters, server-owned earnings/spending/collection upgrades, account history UI and cross-device tests; approximately 4–8 hours. These are provisional hands-on estimates and may change after store configuration.

Real verifiers must use Apple's signed transaction verification/App Store Server API and Google Play Developer API, checking app identity, environment, purchased state, quantity and account binding. Map server-generated Apple appAccountToken and Google obfuscatedAccountId to the authenticated UID. Never accept a client verified flag, coin amount, ownership UID or locally completed transaction as proof. Validate Apple server notifications and authenticate Google notification delivery, then re-query Google. Do not place secrets in the web app or Git repository.

Store consumption/acknowledgement/finish occurs only after durable server fulfillment, with a persistent retry/outbox and monitoring (Google acknowledgement deadlines apply). App crashes, repeated callbacks and restored non-consumables must not grant twice. Finished consumable packs cannot reconstruct a spent wallet through native restore: the account ledger supplies the remaining balance. A refund of already-spent coins needs an explicit reviewed recovery/debt policy; do not silently delete collections or charge the player again.

Before activation: real Apple/Google sandbox purchases, cancelled/pending/declined purchases, retries after lost responses, duplicate callbacks across devices, reinstall/account recovery, starter entitlement restoration, refund-before/after-spending, forged/expired/foreign receipts, environment isolation and permission-denial tests. Upgrade SDK builds need renewed physical iPhone testing even though the previous build passed. Android physical acceptance remains open. No paid service enablement, live permission changes or store publication is part of this slice.

## Primary references checked 2026-10-28

- Apple SDK requirement since 2026-04-28: https://developer.apple.com/news/upcoming-requirements/?id=04282026a
- Firebase provider linking preserves a single UID: https://firebase.google.com/docs/auth/web/account-linking
- Play purchase verification and acknowledgement: https://developer.android.com/google/play/billing/security
- Native plugin source and migration: https://github.com/j3k0/cordova-plugin-purchase/tree/v13.19.1/capacitor
- Hosted macOS 26 toolchains: https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md
