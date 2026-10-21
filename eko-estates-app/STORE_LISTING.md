# Eko Estates: store listing

Copy these into App Store Connect and Google Play Console.

## Basics
- **App name:** Eko Estates
- **Subtitle (iOS, 30 chars):** Naija property board game
- **Short description (Google Play, 80 chars):** Buy Lagos streets, build hotels and bankrupt your friends in 3D Naija style.
- **Category:** Games › Board
- **Price:** Free, no in-app purchases, no ads
- **Privacy policy URL:** https://p2rmy5ks88-design.github.io/a2-guide/eko-estates/privacy.html
- **Bundle ID / package name:** com.kenstylez.ekoestates
- **Keywords (iOS, 100 chars):** board game,property,naija,nigeria,lagos,abuja,dice,trading,landlord,family,offline,multiplayer

## Full description
Become the biggest landlord in Naija!

Eko Estates is a 3D property trading board game set in real Nigerian cities. Roll the dice, buy streets from Agege to Banana Island, build houses and hotels, and collect rent until everyone else is broke.

• SEVEN CITIES: start in Lagos, then unlock Abuja, Port Harcourt, Warri, Enugu, Calabar and Benin City. Every city has its own streets, landmarks, board design and radio station.
• LIVING 3D BOARDS: watch the Lekki-Ikoyi Link Bridge, Balogun Market, Oshodi danfo parks, Aso Rock, the Oba's Palace and the Calabar Carnival come alive as you play.
• 12 TOKENS WITH PERSONALITY: the danfo drives, the okada leans into corners, the eagle flies, the Durbar horse gallops and the talking drum bounces.
• PLAY YOUR WAY: 2 to 6 players on one phone, against AI landlords (Easy, Normal or Hard), or online with friends on their own phones. Just share a game code.
• FUN FOR ALL AGES: the Naija Quiz, Catch the Naira, emoji reactions and city festivals like Eyo, Mmanwu and the Calabar Carnival.
• GAME MODES AND HOUSE RULES: Classic, Quick Deal and Round Limit, plus the speed die, city events, Free Parking jackpot, a 90-second turn timer and more.
• 120+ ACHIEVEMENTS: earn Bronze, Silver and Gold medals in every city.
• LEVEL UP: climb from JJC to Landlord of Naija, finish daily missions, keep your streak and spin the Owambe Wheel every day.
• NAIJA RADIO: Eko Estates FM and other city stations play original Afrobeats while you build your empire.
• Works offline. No ads. No account needed, even for online play.

## Age rating answers
- Violence, sexual content, profanity, drugs: none
- Simulated gambling: none (dice and play money only; no betting, no real money, no prizes)
- User-generated content / chat: no free chat. Players can type a game nickname (up to 12 characters) that others in the same online game see, and reactions are a fixed list of emojis and phrases
- Expected rating: 4+ (Apple), Everyone / PEGI 3 (Google)

## App privacy answers
Once online play is switched on (Firebase), declare this. Without online play, it's "Data Not Collected".
- Apple "App Privacy": **Identifiers → User ID** (a random anonymous Firebase ID) and **User Content → Gameplay Content** (nicknames, moves). Both are used only for **App Functionality**, are **not linked to the user's identity**, and are **not used for tracking**.
- Google "Data safety": **App activity → Other actions** and **Device or other IDs**. Collected for **App functionality** only, encrypted in transit, not shared with third parties (Google Firebase is a service provider, not a "share"). Users can ask for deletion through the store contact.

## Screenshots needed
- iPhone 6.9" landscape (2868 × 1320 or 1320 × 2868 rotated)
- iPad 13" landscape (2752 × 2064), only if you keep iPad support
- Android phone landscape (at least 1920 × 1080)
- Google Play feature graphic: 1024 × 500

Good shots: the Lagos beach board with a hotel row, a trade offer with "Completes your set!", Benin City's palace, the Calabar carnival, the achievements screen and the Owambe Wheel.

## Before you submit
- Confirm you own or have licensed all 13 radio tracks for commercial distribution.
- Online multiplayer switches on once `eko-estates/firebase-config.js` has your Firebase settings. Do the Firebase setup in `eko-estates/README.md` first, and use the privacy answers above.
