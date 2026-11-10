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

## Follow-up completion audit

The full Stability workflow exposed an obsolete native Coach manifest assertion
(853 rather than 858 recordings). The branch now checks all five exact phrase
mappings as well as bundle presence. Championship component scoring, legacy and
online ranking isolation, permit exhaustion, mobile layouts and final-turn
completion are now included in the required Stability gate.

The scoring regression now checks actual rankings with a fixture where the
Championship and legacy winners differ. It also runs the real offline driver
with each of three possible starting seats and verifies that every player gets
exactly the scheduled final turns.

### Score-weight sensitivity (300 matches per player count, seeds 93000–93299)

These are alternative rankings of the **same final portfolios**, not AI agents
retrained for alternative rules. The trade-resistant seat remains seat 0.

| Players | Cash leader wins, current | Winners changed, no district premium | Winners changed, double district premium | Winners changed, +20% building value |
|---|---:|---:|---:|---:|
| 2 | 61.0% | 0.7% | 0.7% | 1.7% |
| 3 | 55.0% | 2.7% | 0.3% | 1.7% |
| 4 | 53.3% | 1.3% | 0.7% | 1.7% |

No tested alternative provides a clear reason to change the pilot formula.
Cash leadership alone is not a test of an intentional cash-hoarding strategy.
All 900 matches finished without simulator errors or round-cap stalls.

The guarded two-player sample favored the last mover (61.7% of wins). In a
separate **1,000 all-AI two-player matches** (seeds 93000–93999), first/last-mover
wins were **45.7% / 54.3%**, with seat 0/1 wins **52.9% / 47.1%**. This deserves
human testing; the proxy player and the existing last-player starting bonus
are confounders. The audit does not establish that turn order is unbiased.

Normal-speed rendered timing checks now cover desktop and phone-sized layouts,
2/3/4 players, and count actual completed turns rather than reporting only the
configured round limit. These remain automated AI timing samples; human decision
time and real-device performance remain unmeasured. The latest workflow result
is the authority for whether these checks passed.

City Boom remains excluded: finite Championship already resolves indefinite
matches, and the audit does not establish a benefit from extra rent pressure.
No main merge, production deployment or native upload is part of this audit.
