# Skyline Estates — Google Play submission pack

Prepared 6 November 2026 from the real Android build. The owner enters every **declaration** in Play Console. Nothing here is a password or signing secret.

## 1. Release build (verified)

| Item | Value |
|---|---|
| File | `skyline-estates-1.0.194-internal.aab`, GitHub run 42292029476, artifact `skyline-estates-android-1.0.194` (kept 90 days) |
| Source | `main` at `6e8cdf5` (Living City V2/V2.1 and the online client; restricted Living City test mode) |
| Package | `com.kenstylez.skylineestates` |
| Version | name 1.0.194, code 194 |
| SDK | target 36, minimum 23. Release build, not debuggable |
| Signature | `jarsigner -verify`: jar verified |
| Upload certificate | CN=kelvin aiwemhenle, OU/O=kenstylez, Stockholm. SHA-256 `5A:5A:C7:8A:30:13:89:82:1F:91:7E:22:1E:F3:D6:A3:77:03:EE:6C:21:8D:0C:17:16:BC:C8:B0:25:28:44:BC` |
| Billing | Play Billing Library 9.0.0 is linked through the purchase plugin. Purchases are **off** in this Android build: no products are sold. |
| Permissions | INTERNET, ACCESS_NETWORK_STATE, BILLING (library), plus Google services and receiver housekeeping. No camera, microphone, location, contacts or storage. |
| Themes | Dark and Daylight are both included. Native checks on 6 November: runs 42285072689 and 42288014539. |

**What the Android 1.0 build contains.** It is built with the cloud channel `off` (same as the earlier Android builds):
- full offline game, pass-and-play, AI opponents and Living City rules;
- classic online rooms through anonymous Firebase sign-in;
- leagues;
- local saves, Coins, SC and collection on the device.

It does **not** include player accounts, cloud save or purchases. Those remain iOS-only for now, so on Android there is no account to delete and nothing to bill. Living City online stays restricted to listed test accounts (email sign-in), which Android 1.0 can't use.

**ANR note.** The emulator showed "isn't responding" once:
- **Where:** scene 5 of 6 in run 42288014539, on a debug build with an injected validation probe, on the x86_64 software-GPU (SwiftShader) emulator.
- **How often:** once in 14 scene launches across two runs. The previous run had none. It was never seen on iOS.
- **Outcome:** the screen had already rendered, and the app kept running (PID alive after back/resume).
- **Assessment:** consistent with input dispatch waiting on software-emulated WebView drawing. No reproducible freeze.
- **Follow-up:** Google's pre-launch report (real devices, runs automatically on the first closed-test upload) is the confirmation step. Act only if it reports ANRs.

## 2. Store listing (paste)

- **App name (≤30):** Skyline Estates
- **Short description (≤80):** Trade streets, build a skyline and outplay rivals in a Nigerian city board game.
- **Full description:**

> Roll the dice, buy the streets and build your skyline. Skyline Estates is a property-trading board game set in vibrant Nigerian cities. Start in Lagos and own Lekki, Ikeja and Eko Atlantic City.
>
> **Living City rules**
> • Strategic City Events change rents across districts every few rounds
> • Civic Review instead of a jail: Fast-Track it, use a Bail Pass, or wait it out
> • Build in stages from Low-rise to Skyscraper
> • Crown one street per district as its Landmark
> • Special corners: Skyline HQ, Planning Office, Transit Exchange and Investment Forum
>
> **Play your way**
> • Against computer rivals with their own styles: Trader, Investor, Builder
> • Pass-and-play with friends on one device
> • Online rooms with a short code: play with friends on Android, iPhone or the web
> • Classic, Quick Deal or Round Limit modes
>
> **A city that grows with you**
> • Full 3D board or a clean flat board, in Dark or Daylight
> • Seasons, leagues, trophies and achievements
> • Collect tokens, rooftops and board surrounds with coins you earn by playing
>
> Plays fully offline. No ads, no tracking.

- **Graphics:** in this conversation:
  - `icon-512.png` (512×512);
  - `feature-graphic-1024x500.png`;
  - `phone-1…5.png` (2160×1080, 2:1): 3D board, Landmark choice, Civic Review, Strategic Event card, flat board.
- **App category:** Game → **Board**.
- **Tags (pick up to 5):** Board, Strategy, Multiplayer, Offline, Casual.
- **Contact email:** kelvinaiwe@gmail.com. Website optional.
- **Privacy policy:** `https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/privacy.html` (covers Android online play, data kept on the device, no ads, contact).

## 3. App content (owner's declarations; drafted from the code)

- **Ads:** No, the app contains no ads.
- **App access:** "All functionality is available without special access". Online play needs no login; a reviewer can host a room alone and add computer players.
- **Target audience:** owner's decision. Suggested 13–15, 16–17 and 18+. Choosing under-13 brings Google's Families policy, which online usernames and anonymous sign-in would then have to meet.
- **Content rating (IARC questionnaire), owner answers:**
  - Category: Game.
  - Violence, sexuality, language, drugs: none.
  - **Gambling:** the dice/property game is not wagering. There is a free once-a-day Lucky Spin for earned coins, no purchase and no cash value. Answer "no real or simulated gambling" only if you agree.
  - **Users interact:** yes. Online rooms show chosen usernames; no chat; filter, report and block exist.
  - Shares location: no.
  - Digital purchases: no.
- **Data safety** (only what the Android build actually sends):
  - **Collected:** yes, only when the player uses online play or leagues.
    - Personal info → **User IDs**: random player ID / anonymous Firebase ID. App functionality; not shared.
    - App activity → **Other user-generated content**: chosen username, token, game moves and money in an online game, league level and trophies. App functionality; not shared.
  - Optional for the user: online play and leagues are optional.
  - Data shared with third parties: **No.** Firebase/Google Cloud act as service providers.
  - Encrypted in transit: **Yes** (HTTPS).
  - Deletion: users can ask by email (kelvinaiwe@gmail.com) to delete online records. Finished games and old seasons are removed automatically.
  - **Account creation:** "My app does not allow users to create an account" (Android 1.0 has no accounts; online uses automatic anonymous sign-in). This means no account-deletion URL is required.
  - Not collected: location, contacts, financial info, health, messages, photos, audio, files, calendar, web history, device IDs, crash logs, diagnostics, analytics.
- **Government app / financial features / health / news:** No.
- **Countries:** owner's choice. All countries are possible. The listing and app are in English.
- **In-app products:** none in 1.0. Leave the merchant account for later. Before selling coin packs on Android, Play Billing products and the Android payment flow are a separate project.

## 4. Path to production (personal account created after 13 Nov 2023)

1. **Owner** (Play Console → Home), to finish account setup:
   - verify identity;
   - declare trader status (EU);
   - verify the contact phone number;
   - confirm access to an Android device (Play Console app).
2. **Create app:** name Skyline Estates, Game, Free, English. Package `com.kenstylez.skylineestates` is set by the first upload.
3. **Testing → Closed testing → create track:**
   - testers: an email list or Google Group with **at least 12 people**;
   - upload the 1.0.194 AAB and accept Play App Signing (the key above becomes the upload key);
   - roll out.
4. Testers **opt in** through the link and install. They must stay opted in for **14 consecutive days**. Google requires this before production access; nothing else is needed.
5. **Dashboard → Apply for production** (answers about the test). After approval: **Production → Create release** with the same or a newer AAB → **Send for review**.
