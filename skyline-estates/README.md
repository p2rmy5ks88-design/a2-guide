# Skyline Estates

An international 3D property trading board game: 18 countries, 31 cities, characters that ride the tokens, trophies, 45-day seasons, leagues, a coin shop and online play.

Play on the web: https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/

## Current development status

See [Phase 1 closeout and acceptance checklist](PHASE1-CLOSEOUT.md). The web game and iOS 1.0.21 Sideloadly test build include the current Collection/Portfolio and illustrated setup tokens. Automated browser/native build checks passed. The owner reports successful physical iOS testing with no issues. Android physical-device acceptance, production authoritative multiplayer and store purchase validation remain open in issue #2.

Progress is device-local; browser and native saves are separate. Unsigned rewards/promo balances are not verified competitive or purchase entitlements.

## Files
- `game.html`: the whole game (page body). Generated from the Eko Estates engine plus the Skyline build scripts.
- `index.html`: the standalone web page, made by `python3 build.py`.
- `privacy.html`: privacy policy for the stores.
- `database.rules.json`: Firebase Realtime Database rules (the other editions' rules plus `lb/` for leaderboards and `reports/` for player reports).
- `../skyline-estates-app/`: the iOS and Android app (Capacitor), with coin packs as in-app purchases.

## What's in the game
- **World:** 18 countries unlock with player level (or early with coins); a country's other cities unlock as you play there (or with coins). Every city has its own board, centrepiece, landscape around the board and 15 achievements.
- **Board surrounds:** each city has its own ground and water (snowfields, dunes, canals, harbours, savanna, plazas). Premium surrounds such as Golden Marble, Neon Night, Sky Deck and Lava Isle unlock through levels, seasons and leagues, or with coins.
- **Characters:** 14 original characters ride on the tokens and react with gestures. They are unlocked only by playing: wins, levels, streaks, leagues, season tiers and trophies.
- **Tokens:** 16 tokens with six rarity stages and distinct power paths. Upgrades require saved coins and token wins; token XP records play. Existing saves retain their match rules. The host can switch perks off.
- **Trophies:** about 60 Bronze, Silver and Gold trophies plus Skyline Platinum.
- **Seasons:** 45 days, 40 tiers, free and premium reward tracks and weekly challenges.
- **Leagues:** trophies move you from Bronze to Legend. Legacy Firebase leaderboard submissions are client-supplied; trusted public ranking remains a release gate.
- **Shop:** native coin-pack integration (receipt validation/restoration and store testing remain release gates), board surrounds, token finishes, dice, boosts, season premium pass. Nothing random is sold.
- **Online:** Skyline lobbies use their own status (`lobby-sk`), so they never mix with the other editions' lists. Seats carry the character, token level and finish. Names are filtered; players can report and block.

## Setup notes
- Online play uses the Firebase project already set up for Eko Estates (`../eko-estates/firebase-config.js`). The checked-in legacy rules are not a production security sign-off. Do not deploy them as a closeout step; candidate trusted-service rules/composition require reviewed migration and denial tests.
- Radio tracks are shared from `../eko-estates/audio/fm/`.
- Progress is stored in the browser under its own keys (`skylinePrefs`, `skylineSave`), separate from the other editions.

## Validation

The `Skyline stability tests` GitHub workflow is the full browser/gameplay baseline and uploads per-game reports. See PHASE1-CLOSEOUT.md for tested revisions, build links and remaining manual checks. `python3 skyline-estates/build.py --check` verifies generated web/offline files.

## Originality
All names, board layout, prices, rents, cards, corner squares, trophies and characters are original. The game avoids other games' trademarked names, phrases and trade dress, and draws landmarks as generic shapes.
