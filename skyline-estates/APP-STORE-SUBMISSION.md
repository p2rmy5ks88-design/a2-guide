# Skyline Estates 1.0 — App Store submission pack (drafts)

Prepared 30 October 2026. Drafts only. The owner reviews and enters every **declaration** in App Store Connect (privacy, age rating, export compliance, agreements) and presses **Submit for Review**. No passwords or personal data belong in this repository.

## 1. Build to submit

- Workflow `skyline-ios.yml` on `main` with `publish=true` and `cloud_channel=ios-release` (PR #60). **Never submit a `private-testing` build.**
- Prerequisites: device checklist passed; PR #60 and #61 merged; build appears as "Ready to Submit" in App Store Connect.
- Attach to version 1.0 together with the four coin packs (first in-app purchases must ship with an app version):
  - `com.kenstylez.skylineestates.coins_600`
  - `com.kenstylez.skylineestates.coins_1500`
  - `com.kenstylez.skylineestates.coins_4000`
  - `com.kenstylez.skylineestates.coins_10000`

  Each needs a display name, a description and a review screenshot of Shop → Coins.

## 2. App Review notes (paste into "Notes"; owner adds the demo password)

> Skyline Estates is a property trading board game. Everything can be played offline without an account.
>
> **Demo account (email sign-in):** use the App Review demo account entered in Sign-In Information. It's a dedicated test account. Purchases made by it in the review sandbox add coins to it.
>
> **To review accounts and purchases:**
> 1. Tap the profile name (top left) → **Account & recovery** → **Sign in with email** using the demo account.
> 2. Go to **Shop → Coins** and buy any pack with the sandbox Apple account. Coins are verified by our server and added once.
> 3. **Account & recovery → Purchases → Request a refund** opens Apple's refund sheet.
> 4. **Account & recovery → Remove account** deletes the account and its cloud data (Guideline 5.1.1(v)).
>
> Sign in with Apple is available alongside email sign-in. Coins are a consumable in-game currency with no cash value; the daily Lucky Spin is free and can't be bought. There are no ads, no analytics and no tracking.

## 3. App Privacy (nutrition label) — draft answers for the owner to confirm

Data is **not used for tracking**. No third-party advertising or analytics SDKs.

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Contact Info → Email Address | Yes (only with an account) | Yes | App Functionality |
| Contact Info → Name | Only if Sign in with Apple shares it | Yes | App Functionality |
| Identifiers → User ID | Yes (account ID; random player ID for online games) | Yes | App Functionality |
| Purchases → Purchase History | Yes (App Store transaction details for delivery/refunds) | Yes | App Functionality |
| User Content → Gameplay Content | Yes (online game moves, username, leaderboard level/trophies; cloud progress with an account) | Yes | App Functionality |
| Other categories (location, contacts, health, financial info, browsing, search, diagnostics, usage data, sensitive info) | No | — | — |

Privacy policy URL (after merge to main): `https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/privacy.html` (updated 30 Oct for accounts, cloud save, deletion and purchases).

## 4. Age rating — questions to answer yourself

These are the owner's declarations. Points to consider:
- **In-app purchases:** Yes.
- **Simulated gambling:** this is a dice board game with property trading and a free daily Lucky Spin (no purchase, no cash value). Decide whether you consider the free spin to be simulated gambling.
- **User-generated content / social features:**
  - Usernames are visible in online games and leaderboards.
  - There's a username filter and in-game reporting and blocking.
  - There's no chat.
  Answer Apple's social-media and user-generated content questions accordingly.
- Violence, sexual content, profanity, horror, medical, alcohol/tobacco/drugs: none.

## 5. Export compliance

The app uses only the operating system's standard HTTPS/TLS. Builds 65 and 68 were accepted without a compliance question, so the build already declares exempt encryption. Confirm if App Store Connect asks.

## 6. Owner-only items before submitting

1. Accept the updated Apple Developer Program License Agreement (Account Holder).
2. Digital Services Act trader status shows "In Review". EU storefronts open once Apple approves it.
3. Enter the demo account password under App Review → Sign-In Information.
4. Confirm sections 3–5 above in App Store Connect.
5. Decide the Cloud Functions spend cap (pending; not a total-project limit).
6. Press **Submit for Review**.

## 7. Screenshots

- Required: 6.9" iPhone (1320×2868 or 2868×1320, landscape accepted).
- Captured from the release build.
- Planned shots: home with Lagos; 3D board mid-game; property card or building; portfolio; City Spotlight; collection and rooftops.
- Generated in CI from the web game at the exact size, or taken by the owner on the iPhone (Side + Volume Up).
