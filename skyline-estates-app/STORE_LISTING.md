# Skyline Estates: store listing

Copy these into App Store Connect and Google Play Console.

## Basics
- **App name:** Skyline Estates
- **Subtitle (iOS, 30 chars):** Property trading world tour
- **Short description (Google Play, 80 chars):** Buy streets in 31 world cities, build towers and become the top landlord.
- **Category:** Games › Board
- **Price:** Free, with optional in-app purchases (coin packs). No ads.
- **Privacy policy URL:** https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/privacy.html
- **Bundle ID / package name:** com.kenstylez.skylineestates
- **Keywords (iOS, 100 chars):** board game,property,trading,landlord,dice,cities,world,multiplayer,family,offline,strategy

## Full description
Build your skyline in 31 cities around the world.

Skyline Estates is a 3D property trading board game. Roll the dice, buy streets, build houses and towers, trade with rivals and collect rent until everyone else is broke.

• 18 COUNTRIES, 31 CITIES: from Lagos, Stockholm and New York to Tokyo, Rio, Dubai, Nairobi and Sydney. Every city has its own streets, board, landmarks and landscape: snowfields, desert dunes, canals, harbours, savanna and more.
• CHARACTERS THAT REACT: 13 original characters ride on your token. They wave on their turn, celebrate a big rent, facepalm when they pay up and dance when they win. Unlock them by winning and progressing.
• 16 TOKENS WITH UPGRADES: upgrade a token to level 5 for a bigger payday, re-rolls and a Lucky Pass. Hosts can switch perks off for a level playing field.
• TROPHIES: 60 Bronze, Silver and Gold trophies plus Skyline Platinum, and 15 achievements in every city.
• 30-DAY SEASONS: climb 30 tiers of rewards with weekly challenges, plus an optional premium track.
• LEAGUES: win trophies to climb from Bronze to Legend and compete on the global season leaderboard.
• PLAY YOUR WAY: against AI landlords, 2 to 6 players on one phone, or online with friends using a game code.
• SKYLINE FM: one radio station for every city with original tracks.
• No ads. No account needed. Works offline (online play needs a connection).

## In-app purchases (consumable)
Create these in App Store Connect and Google Play with exactly these product IDs:

| Product ID | Coins | Suggested price |
|---|---|---|
| com.kenstylez.skylineestates.coins_500 | 500 | $0.99 |
| com.kenstylez.skylineestates.coins_1200 | 1,200 | $1.99 |
| com.kenstylez.skylineestates.coins_3000 | 3,000 | $4.99 |
| com.kenstylez.skylineestates.coins_7000 | 7,000 | $9.99 |

Coins buy cosmetic items (board surrounds, token finishes, dice), token upgrades, the season premium track and early country unlocks. Nothing is random. Characters can only be earned by playing.

## Age rating answers
- Violence, sexual content, profanity, drugs: none
- Simulated gambling: none (dice and play money only; no betting, no real money prizes). The daily Lucky Spin is free, cannot be bought, and shows equal odds for every prize.
- In-app purchases: yes
- User-generated content: usernames (up to 12 characters, filtered) shown to other players online and on the leaderboard. No free chat; reactions are a fixed list. Players can report and block others.
- Expected rating: 4+ (Apple), Everyone / PEGI 3 (Google)

## App privacy answers
- Apple "App Privacy": **Identifiers → User ID** (random anonymous Firebase ID), **User Content → Gameplay Content** (username, moves, leaderboard score), **Purchases → Purchase History** (handled by Apple; the app only records which coin packs were delivered on the device). Used only for **App Functionality**, **not linked to identity**, **not used for tracking**.
- Google "Data safety": **App activity → Other actions**, **Device or other IDs**, **Financial info → Purchase history** (via Google Play Billing). For app functionality only, encrypted in transit, not shared.

## Screenshots needed
- iPhone 6.9" landscape (2868 × 1320)
- iPad 13" landscape (2752 × 2064), only if you keep iPad support
- Android phone landscape (at least 1920 × 1080)
- Google Play feature graphic: 1024 × 500

Good shots: a Tokyo or Dubai board mid-game, the Characters screen, the Season track, the Leagues ladder, the trophy cabinet and the World map of countries.

## Before you submit
- Confirm you own or have licensed all 13 radio tracks for commercial distribution.
- Create the four coin products above and accept the Paid Apps agreement in App Store Connect.
- Deploy `skyline-estates/database.rules.json` to the Firebase Realtime Database (it keeps the rules the other editions need and adds the leaderboard and reports).
- Fill in a support email: add `window.SKYLINE_CONFIG={supportEmail:'you@example.com'}` before the game script, or ask Claude to set it.
