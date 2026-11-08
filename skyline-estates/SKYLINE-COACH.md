# Skyline Coach v1 (web prototype, 8 Nov 2026)

Optional background voice commentary. **OFF by default.** Turn it on in Settings → Audio → Skyline Coach. It's also in the in-game Sound menu.

- **Module:** `lib/skyline-coach.js`, loaded last.
  - No HUD, captions or indicators.
  - No change to rules, money, saves, accounts or the network.
  - Not in App Store build 195.
- **Engine:** the browser's `speechSynthesis`.
  - Uses English voices only, preferring en-NG, then the default voice, then en-GB, then en-US.
  - Falls back gracefully when no voice exists.
  - A native adapter can be registered with `SkylineCoach.useEngine({supported, voices, pick, speak, cancel})`.
- **Events** come from committed game state:
  - ownership, building stage, Landmarks, Strategic/Market events, Civic Review, bankruptcy and match end;
  - the game's own turn banner;
  - strictly matched committed log lines: payments, payday, Lockup, Fast-Track and drawn card titles.
  - A new game, reload, reconnect or sync jump only sets a baseline, so history is never read out.
- **Priorities:**
  - 1 = critical: Civic Review on you, bankruptcy, match end.
  - 2 = important: events, Landmarks, completed districts, skyscrapers, big payments, your turn.
  - 3 = routine.
- **Queue rules:**
  - One utterance plays at a time, with at most one waiting.
  - Critical speech cuts off routine speech.
  - Duplicates within 12 s are suppressed, and stale lines are dropped.
  - The game never waits for the Coach.
- **Ducking** works through the existing Web Audio buses: Skyline FM goes to 18%, ambience to 25% and game sounds to 45%.
  - Levels come back from the live radio/ambience state on end, error, timeout, cancel, backgrounding or switch-off.
  - Saved preferences and playlist position are never touched.
- **Test:** `tests/skyline-coach-browser.cjs`, 13 checks. It uses a recording speech stub, so it can't confirm audible output.
