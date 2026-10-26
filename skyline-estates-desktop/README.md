# Skyline Estates for Steam Deck (and Linux)

A desktop build of the game as an AppImage. It bundles the whole game (no browser needed), opens full screen and plays with a controller.

**Download:** https://github.com/p2rmy5ks88-design/a2-guide/releases/download/skyline-deck/Skyline-Estates-x86_64.AppImage

## Install on Steam Deck
1. Hold the power button and choose **Switch to Desktop**.
2. Open the download link above in the browser and save the file (it lands in **Downloads**).
3. In the **Dolphin** file manager, right-click the file → **Properties** → **Permissions** → tick **Is executable** → OK.
4. Right-click the file again → **Add to Steam**.
5. Return to **Gaming Mode**. The game is under **Library → Non-Steam**.
6. Optional: in the game's **Controller settings** pick the **Gamepad** layout. Artwork can be set with the SteamGridDB plugin or by hand.

## Controls
| Button | Action |
|---|---|
| D-pad / left stick | Move the gold focus ring |
| A | Select |
| B | Back / close |
| X | Roll dice / end turn |
| Y | Your properties |
| LB / RB | Switch tabs |
| Right stick | Turn the camera |
| LT / RT | Zoom out / in |
| View | Board map |
| Menu | Game menu (on the home screen: Settings) |

Typing a username: press **Steam + X** to bring up the on-screen keyboard. The touchscreen also works everywhere.
Quit from **Settings → Desktop app → Quit game**, or with the Steam button.

## Build a new version
Pull requests and relevant pushes to `main` build the AppImage and retain it as an Actions artifact. Changes to the game, assets, shared inputs, desktop wrapper or workflow trigger these checks. Manual runs default to build-only. To replace the file on the `skyline-deck` release, manually run **Skyline Estates Desktop (Steam Deck)** and explicitly enable **publish**. Ordinary validation cannot update the public download. Compilation and packaging do not establish Steam Deck device acceptance.
Locally: `npm install && npm run dist` (output in `dist/`), or `npm start` to run it.
