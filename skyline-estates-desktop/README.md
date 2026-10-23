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
Run the **Skyline Estates Desktop (Steam Deck)** workflow in GitHub Actions. It rebuilds the AppImage from the current game and replaces the file on the `skyline-deck` release, so the link above always gets the latest version.
Locally: `npm install && npm run dist` (output in `dist/`), or `npm start` to run it.
