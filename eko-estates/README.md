# Eko Estates

A Lagos-themed property trading game for phones and tablets, played in landscape. It runs as a single web page with a hand-built WebGL 3D board and no external libraries.

## What's in it

- **The board**: 40 squares of Lagos streets and landmarks, from Agege Motor Road to Banana Island, with Chance and Esusu cards, Kirikiri jail and the National Theatre as Free Parking.
- **Rules**: buying, auctions, rent, colour sets, houses and hotels with a limited bank supply, mortgages, trading, jail and bankruptcy.
- **Game modes**: Classic, Quick deal and Round limit, plus six house rules you can switch on or off.
- **Five locations**, each with its own board colours, centrepiece and crowds:
  - Lekki Beach
  - Lagos at Night
  - Harmattan / Balogun Market
  - Rainy Season / Oshodi
  - Obudu Highlands
- **Sound**: street ambience, danfo conductor calls, Yoruba and Pidgin voices (through the device's speech engine) and *Eko Estates FM 97.3*, an original afrobeats loop with a DJ. Each part can be switched on and off.
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
