# Skyline Circuit — Board 2: interactive 3D city lab

**Status (18 November 2026):** distinct Board 2 research prototype only. **Do not merge or substitute the live Board 1 / Career menu.** Owner review of the iPhone screenshots and physical-device quality remains outstanding.

## Board identity

Board 2 is the approved **dual-ring miniature city** rather than a wireframe, a spreadsheet/simulation display, or a second copy of Board 1. It uses the *existing* `SkylineCircuit` 32-node deterministic rules topology:

- 20 property plots; 4 City Events; 8 junctions; 4 traversable bridges.
- Outer ring = City Boulevard; inner ring = premium buildings. Connector traversal consumes a real step.
- Four districts: Harbour Quarter (saturated blue), Civic Heights (deep gold), Verdant Mile (emerald), Neon Exchange (strong red).
- **Chocolate-brown dual roads**, warm timber and enamel city pieces, legible authentic property names, real 3D architectural stages.
- Four shape-coded pawns: coral circle, blue square, ivory triangle, magenta hexagon.
- True Three.js WebGL city geometry from an isolated version of the existing Circuit 3D renderer; Low / Medium / High quality tiers and a 2D fallback.

## Interaction contract

| User intent / trigger | 3D interaction and on-screen state | Effect on rules/save | Motion & fallback |
|---|---|---|---|
| Stay/Cross then roll | Strategy View remains 0°; genuine mint dashed / gold solid route visualization; 430ms pawn step, 550ms bridge | Real rules apply; the board does **not** follow dice rolls | No automatic camera shift; reduced-motion / instant-speed remain functional |
| Explore 3D City button | Bounded City View, 38° pitch; gameplay actions replaced by an inspector | **Read-only**; match and local practice save unchanged | Direct Strategy return; 2D/WebGL-unavailable mode never exposes dummy 3D controls |
| Drag horizontally on city | Real perspective orbit, yaw clamped to −55°…+55° | None | Left/right orbit buttons give an accessible alternative; no autorotation |
| Zoom +/- | City distance clamped to 4.65…7.3; camera never clips through city | None | Distinct on-screen zoom controls, with smooth bounded response |
| Tap street/building | Highlight and district/owner/stage/price inspection using the real projected 3D coordinates | None | Explicit selected-street summary; no hidden game action |
| Choose Plot → Skyscraper | Swap the exact 3D architectural model **in preview only**; distinct stage dropdown | None; not a purchase; never creates a Career receipt | Returning to Strategy clears every preview |
| Preview full 3D skyline | Opt-in 20-building city showcase to review architecture in all four districts | None; sample occupancy is explicitly labeled visual-only | Off by default; defaults restored on return to Strategy |
| Return to Strategy | Camera yaw returns to 0°, all preview/spotlights clear, all genuine match controls return | Real match continues in original state | Return button stays visible even on compact landscape screens |

## What this first milestone does **not** claim

- Full owner approval for the final Board 2 graphic design.
- Physical iPhone 18 Pro Max FPS, battery life or thermal measurements.
- Career progression, ranked/online server rules, matchmaking or native TestFlight support.
- That showroom buildings represent actually purchased properties.

## Next milestones before Board 2 release

1. **Visual approval:** Owner reviews 3× Retina screenshots of the regular board, the all-district skyline and a chosen Skyscraper. Ensure city remains a real readable game board, never just a computer simulation.
2. **Better gameplay-linked 3D feedback:** Visible property networks along roads and bridges, a short building-growth effect on real upgrades, and a property-level camera focus that always returns to the stable Strategy camera.
3. **Accessibility & performance:** 44pt touch targets where feasible, responsive HUD, reduced-motion controls, software-WebGL fallback, 3× screenshots, and physical Safari FPS/frame-time/battery checks.
4. **Release integration (separate PR):** Preserve Board 1 and Career/Classic/Harbour Ring saves; do not activate until owner approves and all required Stability checks pass.

**Files:** `circuit-board2-lab.html`, `circuit-board2-ui.js`, `circuit-board2-renderer.js`, and `tests/circuit-board2-browser.cjs`, plus a dedicated read-only QA workflow. There are **no edits to shared rules, Board 1, Career entry, offline-assets.js, sw.js or production graphics.**
