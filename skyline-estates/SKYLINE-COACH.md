# Skyline Coach v1 (web prototype, 8 Nov 2026)

Optional background voice commentary. **OFF by default.** Turn it on in Settings → Audio → Skyline Coach. It's also in the in-game Sound menu.

- **Module:** `lib/skyline-coach.js`, loaded last.
  - No HUD, captions or indicators.
  - No change to rules, money, saves, accounts or the network.
  - Not in App Store build 195.
- **Engine:** the browser's `speechSynthesis`.
  - Voice choices: System English (Automatic) plus American, British, Indian and Nigerian English, female and male, each mapped to the best working installed voice of that accent and gender (choices with no matching voice are hidden).
  - Style: Standard English or Naija Pidgin wording for every announcement. With Pidgin and Automatic, a Nigerian English voice is used when the device has one.
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

## V2: natural recorded voice (8 Nov 2026)

- **Default voice** is "Natural voice · Female": pre-recorded clips (`coach/natural-en-f/`, mono MP3 at 48 kbps, about 770 clips).
  - **Source:** generated offline with Kokoro-82M v1.0, voice `af_heart`. The model and voices are Apache-2.0, so commercial use is allowed. No paid service or account is involved, and no data leaves the machine.
  - **Content:** core lines, "Do you want to acquire …?" for every property name in all 31 cities, every city festival and Strategic/Market event, plus rent up/down and building-cost lines.
- **Playback:** clips are fetched on demand and kept in the Cache API (`skyline-coach-natural-en-f-v1`). Settings → Audio → Skyline Coach → Voice pack **Download** stores them all for offline play, and **Remove** frees the space.
  - Clips play through the game's AudioContext, so priorities, cancellation and Skyline FM ducking are unchanged.
- **No robotic mixing:** with the natural voice selected, lines without a recording (player names, amounts, card titles) are skipped, never sent to system speech.
  - Player names become "your turn", "next player" and "a rival".
  - Amounts become "Rent paid", "Rent collected" and "Payment made".
- **Device voices** (Automatic and accent slots, including Naija Pidgin) remain available as an alternative.
- **Regenerate:** `tools/coach-voice/build_lines.py names.json coach-lines-en.json`, then `tools/coach-voice/generate.py coach-lines-en.json coach/natural-en-f kokoro-v1.0.onnx voices-v1.0.bin`.
  - The model files come from the kokoro-onnx GitHub release `model-files-v1.0`.
- **Native (1.1):** bundle `coach/natural-en-f/` in the app or offer it as on-demand download. The same code plays it.
