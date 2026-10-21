# Eko Estates

A Lagos-themed property trading game for phones and tablets, played in landscape. It runs as a single web page with a hand-built WebGL 3D board and no external libraries.

## What's in it

- **The board**: 40 squares of Lagos streets and landmarks, from Agege Motor Road to Banana Island, with Chance and Esusu cards, Kirikiri jail and the National Theatre as Free Parking.
- **Rules**: buying, auctions, rent, colour sets, houses and hotels with a limited bank supply, mortgages, trading, jail and bankruptcy.
- **Game modes**: Classic, Quick deal and Round limit, plus six house rules you can switch on or off.
- **Seven cities**: Lagos plus Abuja, Port Harcourt, Warri, Enugu, Calabar and Benin City, each with its own streets, premium patterned board, 3D centrepiece and radio station. New cities unlock through achievements.
- **Achievements**: 12 to earn, unlocking cities and six new tokens (Durbar horse, canoe, oil barrel, carnival mask, coal train, Oba’s crown), each with its own movement.
- **City achievements**: 15 per city (105 in all) with progress bars and Bronze, Silver and Gold city medals.
- **Progression**: XP and levels with ranks from JJC to Landlord of Naija, level rewards, daily missions with streaks, a daily Owambe Wheel spin, end-of-game highlights, and an optional City events house rule.
- **Five Lagos locations**, each with its own board colours, centrepiece and crowds:
  - Lekki Beach
  - Lagos at Night
  - Harmattan / Balogun Market
  - Rainy Season / Oshodi
  - Obudu Highlands
- **Sound**: street ambience that matches each location, and *Eko Estates FM 97.3*, a shuffled, crossfaded playlist of 13 Kenstylez tracks. Each part can be switched on and off.
- **Tokens** each move their own way: the danfo drives and sways, the keke rocks, the okada zips and leans, the talking drum bounces, the jollof pot waddles and the eagle flies.
- **Turn timer**: an optional 90-second limit per turn, chosen when starting a game.
- **Players**: 2 to 6 per game, as pass-and-play humans, AI landlords (Easy, Normal or Hard), or online friends.

## Files

| File | Purpose |
| --- | --- |
| `game.html` | The source: page content, styles and scripts. Edit this one. |
| `index.html` | A standalone page built from `game.html` by `python3 build.py`. Open it in a browser or host it anywhere. |

## Online play (Firebase Realtime Database)

The web link and the iOS/Android apps play online through **Firebase Realtime Database**, using players' phones and no server of our own. The game talks to Firebase over its REST and live-stream API, so it needs no SDK download. Players sign in anonymously in the background, without an account or email.

When the game runs as a claude.ai artifact it still uses claude.ai's built-in storage instead.

### One-time setup (about 10 minutes, free Spark plan)

1. Go to https://console.firebase.google.com and click **Create a project** (for example `eko-estates`). You can leave Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
3. **Build → Realtime Database → Create database.** Pick a location (`europe-west1` is closest to Nigeria and Europe) and start in **locked mode**.
4. Open the database's **Rules** tab, paste in everything from [`database.rules.json`](database.rules.json), and click **Publish**.
5. **Project settings (gear icon) → General → Your apps → Web (`</>`)**. Register an app called "Eko Estates" (Hosting isn't needed) and copy the `firebaseConfig` values.
6. Paste those values into [`firebase-config.js`](firebase-config.js) as `window.EKO_FIREBASE = { apiKey: ..., databaseURL: ..., ... }` and commit. Make sure `databaseURL` is included; it appears once the Realtime Database exists.

The web link picks up the change in about a minute, and the next app build includes it. The config is not secret, because access is controlled by the rules.

### How it works

- `games/{CODE}`: the lobby (seats, settings) and, once started, the whole game state with a sequence number. The player whose turn it is (or the host, for AI turns) is the only one who writes; everyone else follows a live stream.
- `sub/games~{CODE}/ask|ans|ctl`: questions to a specific player (auction bids, trade offers, counter offers) and their answers, plus "take back control" requests.
- `locks/…`: a short lock so two friends joining at the same moment don't take the same seat.
- `usr/{uid}`: each player's own list of games, for the "Your games in progress" rejoin list.
- An online game is about 2–5 KB, so the free plan (1 GB stored, 10 GB/month downloaded, 100 players connected at once) covers a lot of play. Lobbies left unused for 24 hours are cleaned up automatically.
- **Invite friends** in the lobby opens the phone's share sheet (WhatsApp, SMS and so on) with a link like `…/eko-estates/?join=CODE`. The link opens the game with the code already filled in.

## Updating

1. Edit `game.html`.
2. Run `python3 build.py`.
3. Commit and push.

To publish it as a website, turn on GitHub Pages for this repo and point it at the `eko-estates/` folder.

## Radio audio

The radio plays the tracks in `audio/fm/`. To add a song, put a loudness-matched MP3 in that folder and add a line to `FM_LIST` in `game.html`.
