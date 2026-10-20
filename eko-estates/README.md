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
- **Sound**: street ambience that matches each location, and *Eko Estates FM 97.3*, a shuffled, crossfaded playlist of 9 Kenstylez tracks. Each part can be switched on and off.
- **Tokens** each move their own way: the danfo drives and sways, the keke rocks, the okada zips and leans, the talking drum bounces, the jollof pot waddles and the eagle flies.
- **Turn timer**: an optional 90-second limit per turn, chosen when starting a game.
- **Players**: 2 to 6 per game, as pass-and-play humans, AI landlords (Easy, Normal or Hard), or online friends.

## Files

| File | Purpose |
| --- | --- |
| `game.html` | The source: page content, styles and scripts. Edit this one. |
| `index.html` | A standalone page built from `game.html` by `python3 build.py`. Open it in a browser or host it anywhere. |

## Online play

Online play uses the claude.ai artifact runtime (`window.claude.use("db")`) to share game state, so it only works when the game is opened as a claude.ai artifact.

When `index.html` is opened anywhere else, local and AI play work normally and the *Play online* button explains that online play isn't available. To play online outside claude.ai, swap the `NET` functions for a backend such as Firebase or Supabase.

## Updating

1. Edit `game.html`.
2. Run `python3 build.py`.
3. Commit and push.

To publish it as a website, turn on GitHub Pages for this repo and point it at the `eko-estates/` folder.

## Radio audio

The radio plays the tracks in `audio/fm/`. To add a song, put a loudness-matched MP3 in that folder and add a line to `FM_LIST` in `game.html`.
