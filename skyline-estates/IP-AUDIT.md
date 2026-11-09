# IP originality / trade-dress audit (Task 02, 5 Nov 2026)

**Scope:** what players can see in the web game and the native bundle (both are built from `game.html`; the former `release_hotfixes.py` patches were folded into it on 9 Nov 2026). This is an engineering audit, not legal advice. Items marked LEGAL REVIEW are store-release blockers until counsel signs off.

## Wording audit

| Element | Skyline Estates (player-visible) | Finding |
|---|---|---|
| Corners | START · City Lockup · Rest Stop · "Police check!" go to Lockup | Original names. |
| Card decks | Lucky Break · City Hall | Original names. |
| Card text | City-life wording (street musician, rooftop garden, taxi to transit hub, app goes viral, window cleaning, building inspection) | Original wording. |
| Special card | "Bail Pass: leave the Lockup for free" | Original wording; the function is standard. |
| Tax | City Tax | Generic term. |
| Utilities | was **Power Company / Water Works** | **Fixed.** "Water Works" was identical to a classic board-game utility name. Now **City Power Grid / Lagoon Water Board** (hotfix layer; rules source untouched). |
| Transit | per-city stations and airports (e.g. International Airport, Metro, Xochimilco Boats) | Original. |
| Properties | real city landmarks and districts per city | Original names. Real-landmark use: see the provenance flag below. |
| Tokens | City Bus, Tuk-tuk, Scooter, Drum, Stew Pot, Eagle… | None of the classic tokens (hat, thimble, ship, boot, dog, car, iron…). |
| Buildings | "homes" and "towers"; low-poly city models | Player text says home/tower. "hotel" appears only in internal code and one "Boutique hotel" building style. |
| Currency | Skyline Cash (SC, diamond badge), Coins | Original. |
| Brand | "Skyline Estates", Lagos night skyline, navy/gold | No board-game marks, mascot or logo. |

## Remaining risks — LEGAL REVIEW

1. **Board structure and economics.**
   - The 40-space loop, corner positions (0/10/20/30), four transit stops at 5/15/25/35, two utilities, eight colour groups, and prices and rents in a similar range follow the classic genre layout.
   - Game mechanics are generally not protected, but the whole-board combination together with similar group colours is the main trade-dress question.
   - The owner instructed that the original 40-space board be preserved, so no change was made. **Flag for counsel.**
   - The distinctiveness work in Task 09 (Market Pulse, City Spotlight, token powers, skyline progression) is the product mitigation.
2. **Card effects.**
   - Several effects mirror genre staples: advance to Start, nearest transit at double rent, nearest utility at a dice multiple, pay or collect per player, repairs per home/tower.
   - The wording is original. Counsel should confirm the effect set is acceptable, or Task 09 can replace some effects with city-specific ones.
3. **Real landmarks and city names.** Using them in a commercial game may need checks for some protected building designs or names. Flag for counsel.
4. **Store screenshots and art.**
   - Canva art is recorded in `ASSET-LICENSES.md`.
   - Screenshots must show the Skyline HUD and skyline, with no classic-board framing.
   - Re-check at Task 17.

## Checks

- `python3 build.py --check` passes.
- No "Water Works" or "Power Company" text remains in the generated pages.
- release-content, currency-sc and the security kernel/service tests pass.

Proof still to collect: a comparative screenshot matrix on a physical device (Task 16/17 gate).
