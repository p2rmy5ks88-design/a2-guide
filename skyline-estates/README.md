# Skyline Estates

An international 3D property trading board game: 18 countries, 31 cities, characters that ride the tokens, trophies, 30-day seasons, leagues, a coin shop and online play.

Play on the web: https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/

## Files
- `game.html`: the whole game (page body). Generated from the Eko Estates engine plus the Skyline build scripts.
- `index.html`: the standalone web page, made by `python3 build.py`.
- `privacy.html`: privacy policy for the stores.
- `database.rules.json`: Firebase Realtime Database rules (the other editions' rules plus `lb/` for leaderboards and `reports/` for player reports).
- `../skyline-estates-app/`: the iOS and Android app (Capacitor), with coin packs as in-app purchases.

## What's in the game
- **World:** 18 countries unlock with player level (or early with coins); a country's other cities unlock as you play there (or with coins). Every city has its own board, centrepiece, landscape around the board and 15 achievements.
- **Board surrounds:** each city has its own ground and water (snowfields, dunes, canals, harbours, savanna, plazas). Premium surrounds such as Golden Marble, Neon Night, Sky Deck and Lava Isle unlock through levels, seasons and leagues, or with coins.
- **Characters:** 13 original adult characters ride on the tokens and react with gestures. They are unlocked only by playing: wins, levels, streaks, leagues, season tiers and trophies.
- **Tokens:** 16 tokens with upgrade levels 1–5 (payday bonus, re-rolls, Lucky Pass). The host can switch perks off.
- **Trophies:** about 60 Bronze, Silver and Gold trophies plus Skyline Platinum.
- **Seasons:** 30 days, 30 tiers, free and premium reward tracks and weekly challenges.
- **Leagues:** trophies from wins move you from Bronze to Legend; a global season leaderboard runs on Firebase.
- **Shop:** coin packs (in-app purchase in the apps only), board surrounds, token finishes, dice, boosts, season premium pass. Nothing random is sold.
- **Online:** Skyline lobbies use their own status (`lobby-sk`), so they never mix with the other editions' lists. Seats carry the character, token level and finish. Names are filtered; players can report and block.

## Setup notes
- Online play uses the Firebase project already set up for Eko Estates (`../eko-estates/firebase-config.js`). Deploy `database.rules.json` from this folder so the leaderboard and reports work.
- Radio tracks are shared from `../eko-estates/audio/fm/`.
- Progress is stored in the browser under its own keys (`skylinePrefs`, `skylineSave`), separate from the other editions.

## Originality
All names, board layout, prices, rents, cards, corner squares, trophies and characters are original. The game avoids other games' trademarked names, phrases and trade dress, and draws landmarks as generic shapes.
