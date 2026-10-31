# Skyline Estates 1.0 — App Store submission pack (drafts)

**Decision 30 Oct 11:09: version 1.0 ships without in-app purchases.** Coin packs stay in App Store Connect but are **not** attached to version 1.0. Payment testing and activation are deferred to a later version.

Prepared 30 October 2026. Drafts only. The owner reviews and enters every **declaration** in App Store Connect (privacy, age rating, export compliance, agreements) and presses **Submit for Review**. No passwords or personal data belong in this repository.

## 1. Build to submit

- Workflow `skyline-ios.yml` on `main` with `publish=true` and `cloud_channel=ios-release`. This build has accounts and cloud save on and purchases off.
- **Never submit a `private-testing` build.**
- Do **not** add the coin packs to version 1.0.

## 2. App Review notes (paste into "Notes"; owner adds the demo password)

> Skyline Estates is a property trading board game. Everything can be played offline without an account. There are no in-app purchases in this version; coins are earned in play and have no cash value. The daily Lucky Spin is free.
>
> **Optional accounts and cloud save:** tap the profile name (top left) → **Account & recovery**. Sign in with the demo account in Sign-In Information (email sign-in), or use Sign in with Apple. Progress is then saved to the account.
>
> **Account deletion (5.1.1(v)):** Account & recovery → **Remove account** → confirm. This deletes the account and its cloud data; the device save stays.
>
> No ads, no analytics, no tracking.

## 3. App Privacy (nutrition label) — draft answers for the owner to confirm

Data is **not used for tracking**. No third-party advertising or analytics SDKs.

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Contact Info → Email Address | Yes (only with an account) | Yes | App Functionality |
| Contact Info → Name | Only if Sign in with Apple shares it | Yes | App Functionality |
| Identifiers → User ID | Yes (account ID; random player ID for online games) | Yes | App Functionality |
| User Content → Gameplay Content | Yes (online game moves, username, leaderboard level/trophies; cloud progress with an account) | Yes | App Functionality |
| Other categories (location, contacts, health, financial info, browsing, search, diagnostics, usage data, sensitive info) | No | — | — |

Privacy policy URL (after merge to main): `https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/privacy.html` (updated 30 Oct for accounts, cloud save, deletion and purchases).

## 4. Age rating — questions to answer yourself

These are the owner's declarations. Points to consider:
- **In-app purchases:** No (not in this version).
- **Simulated gambling:** this is a dice board game with property trading and a free daily Lucky Spin (no purchase, no cash value). Decide whether you consider the free spin to be simulated gambling.
- **User-generated content / social features:**
  - Usernames are visible in online games and leaderboards.
  - There's a username filter and in-game reporting and blocking.
  - There's no chat.
  Answer Apple's social-media and user-generated content questions accordingly.
- Violence, sexual content, profanity, horror, medical, alcohol/tobacco/drugs: none.

### Correction 31 Oct (after automated rejection 2.3.6)
Apple blocked build 85 because "Simulated Gambling: Infrequent/Mild" is not allowed from an individual developer account. Audit of build 85 (`0eaa477`) against Apple's definition ("betting or wagering"): Lucky Spin is free once a day, cannot be bought or repeated, has no stake, equal 1-in-8 prizes; all coin spending buys fixed items (no random paid outcomes, no loot boxes); dice, auctions, chance cards and the Rest Stop jackpot use in-match play money; no casino games; no IAP in 1.0. Owner-approved answers: **Simulated Gambling: None**, **Contests: Frequent** (online season leaderboard, top 50 by trophies; league promotions). Apple's calculated rating: **13+** in 172 countries or regions (Frequent contests map to 13+), 12+ Vietnam and Brazil. Explanation sent to App Review; build 85 resubmitted unchanged (Waiting for Review). Keep these answers accurate if features change: any paid or repeatable spin, stakes or wagers would change the classification.

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
