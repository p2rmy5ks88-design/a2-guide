# Skyline Championship — owner review (10 November 2026)

Feature branch only: **do not merge until preview approved**. PR #189 is intentionally a draft.

## Implemented
- New offline solo Play defaults to a finite **30-round Championship**. Custom offers 20/30/40/45 rounds, plus unchanged unlimited **Classic Endurance**.
- The existing engine ends the game after every player takes their final scheduled turn, or earlier on bankruptcy.
- A compact Final Bell counter in the existing HUD (no new overlay or subtitles), now readable at 667×375.
- Five new Kokoro `af_heart` **recorded natural Voice A** MP3s (`champ_1` to `champ_5`), with indexed entries in the voice manifest. Current pack: **858** recordings.
- Deterministic Championship Score: cash, property value, building investment, a 10% owned-district bonus, and Landmark fee already spent. The final results provide a collapsible score breakdown.
- AI may use lower reserves and try more trades in the last five offline Championship rounds.
- Old saves, online/ranked matches, existing App Store build 195, TestFlight build 222, Android build 237, Firebase and permanent balances/achievements are not migrated or deployed.

## Empirical results
Simulated 100 trade-resistant matches per player-count/round-limit combination. The cash leader won **54–58%** of 30-round tests, not automatically every time; two-player matches averaged **7.91 building levels and 0.38 Skyscrapers** by finish. Human actual playtime is not established.

Rendered browser timing (all AI, Fast speed, four completed rounds):
- 2 players: **19.04s** total, **4.76s/round**
- 3 players: **21.98s** total, **5.50s/round**
- 4 players: **25.88s** total, **6.47s/round**

The browser runs do **not** establish real-human match length.

The 36-home-permit regression reproduces a possible 2-player shortage and verifies that a Landmark Skyscraper releases three home permits. The no-trading stalemate is a separate, more common cause of very long Classic games.

## Validation
- Source SHA-256 pin updated in the same feature-branch commit as regenerated web files.
- Security kernel, online/offline parity, first-session and gameplay UX checks pass in the dedicated Championship workflow.
- Browser screenshots and scrollability checked at **667×375 and 844×390**, **Dark and Daylight**, plus the final results.
- All five natural voice files were generated with Kokoro ONNX `af_heart` and decoded with FFmpeg during build.

## Not approved / next decisions
- **City Boom not implemented:** rent/Payday escalation remains experimental only.
- No production deployment, main merge or native release until owner review.
- Human playtesting should decide whether the 30-round default is best, and should listen to the recorded voice on a phone.
