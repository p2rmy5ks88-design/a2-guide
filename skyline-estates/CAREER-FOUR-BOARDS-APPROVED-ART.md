# Skyline Estates — approved four-board visual authority

Owner reaffirmed the FOUR separate approved landscape design images in ChatGPT on **18 November 2026**. They supersede older experimental layouts and aesthetic improvisations. All four images depict **concept artwork**, not proof that the current WebGL game achieves this level of visual fidelity.

## Board-by-board visual identity

| Board | Gameplay / physical board | Exact visual target |
|---|---|---|
| **1 — Skyline Origins (Easy)** | Actual original **40-space square perimeter**, with all four corners and original property rules | Warm golden-hour harbour city; rich blue-glass skyscrapers, varied mid-rise blocks, landscaped central civic scene and fountain; premium ivory property tiles with bold readable colour strips; deep teal-blue waterfront and distant metropolitan surroundings; gold/navy slim HUD and a vivid red-gold main Roll Dice control. |
| **2 — Skyline Circuit (Normal)** | Actual **32-space two-ring** network; 20 real properties, four bridges and Stay/Cross decisions | Two thick chocolate-brown circular boulevard rings with luminous gold edging and bold purple/teal/red/green/gold tile grouping; real blue waterways between rings, elegant lit bridges, a recognisable central glass-domed **Circuit City** landmark and a bright high-end city skyline; dark-navy HUD and prominent gold Roll Dice control. |
| **3 — Skyline Dominion (Intermediate)** | **Hexagonal district-control** concept; validate topology independently before implementation | Distinct colourful connected hex territories, central high-rise district, harbour/innovation/market/greenbelt/heritage/cultural zones; clear ownership and negotiation visibility; real 3D buildings and strategic bridges. Not a reshaped Circuit or numbered wireframe. |
| **4 — Skyline Empire (Advanced)** | **Asymmetrical interconnected economic zones**; validate full rules and topology independently before implementation | Landmark-heavy metropolitan archipelago with central Empire Tower, luxury/finance/trade/culture/innovation/residential districts, bold waterfront bridges, construction details and differentiated luxury skylines; prestigious gold/navy HUD and milestones. |

## Across-all-board non-negotiables

1. **Art direction:** saturated jewel-tone districts; deep blue and turquoise water; rich amber/copper/gold highlights; warm realistic golden-hour lights; crisp physical tile borders; intricate window/facade details; strong atmospheric depth. **Never** the washed-out pastel or schematic simulation treatment rejected by the owner.
2. **Gameplay clarity:** real authoritative interactive board first; no flat image pretending to be playable 3D. Each tile, pawn, ownership ring, 3D build stage, trade/build and roll action must remain legible and functional. Preserve each board's distinct topology.
3. **Five visually distinctive property development stages:** Plot, Low-rise, Mid-rise, High-rise, Skyscraper. The actual owned stage must be authoritative; previews must be clearly labelled previews.
4. **Mobile and Retina:** target the iPhone 18 Pro Max in **landscape** with crisp 3× image captures **and** separately measured WebGL pixel-backbuffer scale. Avoid unnecessary blur and broad blur filters; retain dynamic resolution and graceful performance fallbacks. Verify real iPhone Safari thermals, frame pacing and touch accessibility; 3× screenshots produced on headless CI do NOT establish actual 3× device rendering.
5. **Composition:** board remains the hero. Compact gold/blue player / property / district HUD surrounding rather than obscuring the board; highly identifiable moving pieces; well-framed complete board; 44pt touch targets where possible; visible actions and readable labels.
6. **Safety:** no career unlock, rule, save schema, currency, ranked/online, native build, TestFlight or production service-worker changes while visual reviews are in progress. Work on independent draft PRs until actual in-game render is reviewed, approved and regression-tested.

## Current implementation split / evidence

- **Board 1 draft PR #229** = working original 40-square game in an isolated Origins visual iframe. Adds visual-only premium styling, architectural facade textures, harbour, selected camera and contrasting true-moving-piece markers. **The actual current screenshot remains procedural / relatively low-poly and is NOT an approved final 10/10 equivalent.**
- **Board 2 draft PR #228** = interactive actual Three.js Circuit city review with validated original 32-space rules. The current procedural renderer is **not** a photorealistic reproduction of the approved Circuit artwork.
- **Boards 3 and 4** = visual references only; do not claim their pictured layouts have already been implemented or topology-tested.

## Sequential acceptance gates

**First Origins:** establish visual side-by-side against the supplied approved Origins artwork; reduce the gap in building diversity, realistic facades / waterfront atmosphere, richer tile materials and HUD composition, while safeguarding 40-space gameplay; expose actual browser screenshots individually, not ZIP-only. Verify mobile landscape, no clipped board or UI, and real movement/roll/ownership behavior. Physical iPhone QA is still required.

**Then Circuit:** match the approved double-ring landmark-and-bridge composition and saturated physical city materials with the same level of true 3D mobile polish; preserve its 32-node rules and independent save. Validate City/Strategy camera and stage preview separation.

**Then Dominion and Empire:** implement from their distinct approved references with new gameplay acceptance tests and deterministic rule specs, rather than treating them as interchangeable reskins of Origins/Circuit.

**Source of visual truth:** the four owner-supplied approved artwork images in the November 18 ChatGPT conversation, not earlier low-poly GitHub artifacts or unrelated mood-board references. This document describes those images; their original full-resolution binaries are not yet committed to the repository.
