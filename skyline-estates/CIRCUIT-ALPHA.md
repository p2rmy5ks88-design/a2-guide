# Skyline Circuit — playable alpha (functional presentation layer + design validation)

Status: **alpha, not for release.** Approved toward a playable alpha (owner, 17 Nov 2026). Nothing merged or deployed.

- **Branch:** `feat/circuit-alpha`, stacked on `feat/circuit-prototype` (PR #213) with `feat/career-foundation` (Phase A, PR #212) merged in.
- **Rules:** the five approved mechanics and `circuit-v0` are unchanged; no rule was altered for the presentation.

The board art, geometry coordinates, environment, HUD composition and camera come from ChatGPT. What is here is a **replaceable functional layer** plus the **validators** that the final design must pass.

## How to open it

- **Practice:** `skyline-estates/circuit-alpha.html`.
  - Options: `?seed=` (fixed match), `?speed=normal|fast|instant`, `?perf=1` (frame recorder).
- **Career:** the main game with `?career=on&circuitAlpha=on`, then Game Modes → Skyline Career → "Circuit alpha · Standard / Extended / Quick".
  - Circuit must already be unlocked: two qualifying Origins wins.
  - Without `circuitAlpha` the Circuit stays a preview exactly as in Phase A.

It is a separate page. It does not load or change `game.html`. It writes only:

- `skylineCircuitSave`;
- `skylineCareerInbox:<matchId>` after a Career match.

Classic (`skylineSave`) and Harbour Ring (`skylineRingSave`) saves and the profile are untouched. The browser test checks this.

## Owner decisions implemented (17 Nov 2026)

| Decision | Where | Test |
| --- | --- | --- |
| Quick is experimental: mastery XP only, never unlocks | `career.js`. The board definition marks Quick experimental, so reported facts can't override it. | `circuit-career.cjs`, browser |
| Standard and Extended qualify under the existing rules (Normal/Hard, 5 rounds, 2 minutes, 3 actions, no simulation, online or assistance) | `career.js` `qualify` | `circuit-career.cjs` |
| A mixed table counts as its weakest computer player | `SC.careerFacts` | `circuit-career.cjs`, `circuit-rules.cjs` |
| Normal and Hard share route-aware AI; the UI must not imply Hard is smarter | Setup text: "Hard · plans its routes (same as Normal in this alpha)" | browser (setup) |
| The five Circuit mechanics are unchanged | `circuit-rules.js` defaults unchanged; Standard and Extended hashes identical | `circuit-sim.cjs`, `circuit-rules.cjs` |
| Circuit counts only with the alpha on and Circuit unlocked | `qualify` returns `not-career`; `record` returns `board-locked` | `circuit-career.cjs` |

How Career receives results:

- The Circuit page writes one `skylineCareerInbox:<matchId>` key per finished Career match.
- Career reads these when the game starts and when the Career screen opens. It records each one once (receipts reject repeats) and removes the key.
- With one key per match, two open tabs can never overwrite each other's progress.
- A Career record from a newer version is never written, and its inbox entries are left for that version.

## The ten interaction states (functional, placeholder look)

| # | State | Shown as (alpha) |
| --- | --- | --- |
| 1 | Plan and roll | Stay/Cross toggle and Roll. The first junction and how often the plan applies. Both route previews on the board at once (solid for stay, dashed for cross), with likely-landing dots. |
| 2 | Movement | Hop-by-hop token animation, with connector hops slower. Skip button. |
| 3 | Buy | Node, district, price, rent at Plot, whether it joins a network. Buy and Pass. |
| 4 | Build | Every owned property with its next stage and cost, or the reason it can't be built, in plain words. End turn. |
| 5 | Event card | Feed entry with the card's effect. |
| 6 | Rent | Feed entry: payer, owner, amount, node. |
| 7 | Bankruptcy | Forced sales one by one, then bankruptcy. |
| 8 | End of round | Influence tally per player by source, then "Turn order reverses". |
| 9 | Victory clock | Banner: "*Name* is at the target — wins at the end of round *N* if still leading". |
| 10 | Game over | Winner, reason, influence and net worth. Career note (Quick: XP only). |

**Deterministic animation:**

- The rules act first. The renderer then replays the effect events, so speed, skipping or a hidden tab can never change a match.
- The browser test plays the same seed with the same choices at `instant` and at `fast` with skipping, and the transcript hashes are identical.
- Computer turns start only after the previous animation ends; this affects pacing only.

## Design validation (required before finalising the renderer)

All checks use `lib/circuit-screen.js`, the same projection code the alpha renderer draws with. The browser test also measures the real page DOM for the HUD and board rectangles, and the drawn token and route positions.

- `node skyline-estates/tests/circuit-screen.cjs`: all viewports × 4 camera presets, in Node.
- `node skyline-estates/tests/circuit-alpha-browser.cjs` (Chromium, or `VISUAL_ENGINE=webkit`): every viewport against the real page.
- `CIRCUIT_SHOTS=dir` saves an all-Skyscraper screenshot per viewport.

### 1. Supported iPhone landscape viewports and safe areas

All values are CSS points, landscape orientation, measured inside the safe area.

| ID | Device | Viewport | Insets L/R/T/B | Source |
| --- | --- | --- | --- | --- |
| se1 | iPhone SE (1st gen) | 568×320 | 0/0/0/0 | app's iOS 15 floor (to confirm) |
| **se** | **iPhone SE (2nd/3rd gen), 8 — Circuit minimum** | 667×375 | 0/0/0/0 | to confirm |
| mini | iPhone 12/13 mini | 812×375 | 50/50/0/21 | to confirm |
| x | iPhone X/XS/11 Pro | 812×375 | 44/44/0/21 | to confirm |
| xr | iPhone XR/11 | 896×414 | 48/48/0/21 | to confirm |
| i12 | iPhone 12/13/14, 16e | 844×390 | 47/47/0/21 | to confirm |
| i14p | iPhone 14 Pro, 15, 15 Pro, 16 | 852×393 | 59/59/0/21 | published (16) |
| i14pl | iPhone 14 Plus, 13 Pro Max | 926×428 | 47/47/0/21 | to confirm |
| i16pl | iPhone 15 Pro Max, 16 Plus | 932×430 | 59/59/0/21 | published (16 Plus) |
| i16p | iPhone 16 Pro | 874×402 | 62/62/0/21 | published |
| i17 | iPhone 17, 17 Pro | 874×402 | 62/62/20/20 | published |
| air | iPhone Air | 912×420 | 68/68/20/29 | published |
| i16pm | iPhone 16 Pro Max, 17 Pro Max | 956×440 | 62/62/20/21 | published |
| safari-se | Safari with toolbars, SE | 667×320 | 0/0/0/0 | web version |
| safari-12 | Safari with toolbars, 12–16 | 844×320 | 47/47/0/0 | web version |

"Published" values come from Apple device metrics as listed at useyourloaf.com (iPhone 16 and 17 screen sizes). Rows marked "to confirm" must be checked on device with `env(safe-area-inset-*)`; the page already reads those insets.

### 2–7. Results

Conditions: alpha HUD (two side columns), reference circle-on-circle layout, top-down camera. Every property is a Skyscraper, and four tokens are on `O0`.

| Viewport | Board area | Closest node centres | Smallest visible tile | Token | Result |
| --- | --- | --- | --- | --- | --- |
| se1 568×320 | 280×320 | 37.3 pt | 32 pt | 9.6 pt | **fail**: targets overlap; O5/O15 targets under the HUD |
| **se 667×375** | 379×375 | 50.3 pt | 43.2 pt | 13 pt | pass |
| mini / x 812×375 | 372–384×354 | 47.4 pt | 40.8 pt | 12.2 pt | pass |
| i12 844×390 | 410×369 | 49.4 pt | 42.5 pt | 12.8 pt | pass |
| i14p 852×393 | 394×372 | 49.9 pt | 42.9 pt | 12.9 pt | pass |
| i16p / i17 874×402 | 410×381 / 410×362 | 51.1 / 48.5 pt | 43.9 / 41.7 pt | 13.2 / 12.5 pt | pass |
| xr, i14pl, i16pl, air, i16pm | 436–492 wide | 49.7–54.9 pt | 42.8–47.2 pt | 12.8–14.2 pt | pass |
| safari-se / safari-12 (320 tall) | 379–410×320 | 42.7 pt | 36.8 pt | 11 pt | **fail**: targets overlap |

What each numbered check tests (all pass on every app viewport from SE 2nd gen up, in Chromium and WebKit):

2. **Projection:** every tile corner of all 32 nodes is inside the safe area and the board rectangle. Screen positions are reported per node.
3. **Touch targets:** 44 pt circles on all 32 node centres never overlap.
4. **Every property at Skyscraper:** at least 60% of each tile and roof (5 sample points) is visible, with no node hidden behind a nearer tower.
5. **Four tokens on O0:** no overlap, on the tile, not hidden. Checked both in the drawn positions and in geometry.
6. **Route preview:** both plans drawn at once, all 12 steps each. Every node on both paths is visible and outside the HUD, from `O0`, `O1` and `I1`.
7. **HUD occlusion:** no node target, tile corner, token slot or Skyscraper roof under a HUD element. The real DOM rectangles match the plan within 1 pt.

**Camera trade-off** (same layout and HUD):

| Camera | Smallest square board area for 44 pt spacing | App viewports passing |
| --- | --- | --- |
| Top-down | 330 pt | all 12 |
| 25° tilt | 366 pt | 10 of 12; the 375 pt-tall phones (mini, X) fail touch spacing |
| 40° tilt | 427 pt | 0. O5 and O15 hidden behind neighbouring Skyscrapers; touch fails on most |
| 55° tilt | 576 pt | 0 |

### 8. Performance measurement plan (real devices)

**Instrument.** `?perf=1` records frame intervals and draw time (`__circuitUI.perf()`: p50, p95, max, frames over 50 ms, draw-time p50 and p95). The final renderer must keep the same hook.

**Devices:**

- iPhone SE (2nd gen, A13): the minimum.
- iPhone 12 or 13: typical.
- iPhone 15 Pro or 16 Pro: ProMotion, 120 Hz.
- A mid-range Android (e.g. Pixel 6a): Android build.
- Use each device's oldest supported iOS where possible.

**Scenarios, each 3 runs:**

1. Idle board at round 1.
2. A full Standard match at normal speed against 3 computer players. That is about 15 minutes, which covers sustained heat.
3. Late-game worst case: all 20 properties at Skyscraper with four tokens moving (`setStages` hook).
4. Route-preview redraw while toggling Stay/Cross 20 times.
5. Resume from a save after the app was killed.

**Targets (provisional, same budget as the Living Board):**

- p95 frame time ≤ 20 ms at 60 Hz and ≤ 10 ms at 120 Hz on ProMotion when animating.
- No frame over 50 ms during movement.
- Draw time p95 ≤ 6 ms.
- No thermal throttling warning in a 15-minute match.
- Memory growth under 20 MB over the match.
- Battery drain within 10% of Origins for the same duration.

**Method:**

- TestFlight or internal build only, with no TestFlight update without approval.
- Xcode Instruments (Time Profiler, Core Animation FPS, Energy Log) alongside the `?perf=1` export.
- Results go in a table per device and scenario. Any target missed blocks finalising the renderer for that device class.

**Not measured yet:** this placeholder is Canvas 2D. The final 3D renderer must be measured with this plan.

## Design blockers and constraints for ChatGPT

1. **Minimum device (decision needed).** The app's iOS 15 floor includes the iPhone SE (1st gen, 568×320). The 32-node board can't keep 44 pt targets there with any HUD beside it.
   - **Recommendation:** Circuit requires a 667×375 viewport or larger. Smaller screens show "not available on this screen size", or use pinch-zoom.
2. **Safari with toolbars (320 pt tall).** Same problem on the web version. Options:
   - require full-screen or a home-screen web app for Circuit;
   - allow zoom and pan; or
   - accept 42.7 pt targets on the web only (below Apple's 44 pt guidance).
3. **Camera.**
   - With this layout, any default camera tilt of 40° or more hides `O5` and `O15` behind neighbouring Skyscrapers. That needs shorter towers, a different layout or building transparency.
   - At 25° the 375 pt-tall phones lose 44 pt spacing.
   - The validated default is **top-down or nearly so (≤ 20°)**. A tilted camera could be an optional close-up during moves, not the decision view.
4. **HUD width.** With side columns, the board gets 372–492 pt. The board needs at least 330 pt square top-down.
   - On a 375 pt-tall phone, a HUD element **above or below** the board (a top banner, for example) breaks the 44 pt rule.
   - The victory-clock banner and turn-order strip must sit beside the board, not over it.
5. **Tokens are small:** 12–14 pt at a 2×2 slot pattern. They are never tap targets in the rules (only nodes are), but they need strong contrast.
6. **Supply layout coordinates for validation.** Please deliver node coordinates as `{unit:'pt', nodes:{O0:{x,y}, …}}`, plus the camera and the HUD rectangles per viewport. `SS.validate({layout, cam, vp, hudRects, board})` and the browser test will then check the real design before any renderer work.
7. **Safe areas still to confirm.** The inset values marked "to confirm" must be checked on devices; the page reads the real `env()` values at run time.

## Known limitations of the alpha

- Placeholder art, a 2D canvas and the HUD composition are all to be replaced.
- During a move, ownership and cash update immediately while tokens animate. The final renderer may delay those visuals until the matching event plays.
- There are no street names (they come from the design or the global street generator), so nodes show IDs and prices.
- Hard is identical to Normal (stated in the UI).
- Not wired into the native app's bundled `www`. The page is in the web build and the offline manifest only.

## Design package V1 validation (17 Nov 2026)

Input: ChatGPT's `design/circuit-design-v1.json` ("validation candidate, not final 3D art"), committed unchanged as validation data. It specifies:

- node coordinates;
- two cameras: default top-down (pitch 0, distance 6) and detail (pitch 15, distance 5);
- HUD and board rectangles for 15 screens;
- geometry multipliers;
- a zoom fallback for the 320 pt-tall screens.

The game rules are unchanged.

- **Node test:** `node skyline-estates/tests/circuit-design.cjs [design.json]`.
  - It writes the full screen-space measurements to `design/circuit-design-v1.report.json`: per screen, per camera, all 32 node positions, closest pair, smallest tile, the O0 token slots, the least-visible tiles at Skyscraper and the zoom figures.
- **Browser test:** `node skyline-estates/tests/circuit-design-browser.cjs [design.json]`, in Chromium and WebKit. It checks that:
  - the page's real HUD and board rectangles match the package within 1 pt;
  - the browser engine reproduces the Node figures exactly;
  - nodes are drawn exactly where they were measured;
  - four tokens are drawn on O0 without overlap, with every property at Skyscraper;
  - both route previews are drawn at once.

### Result: 30/30 screen×camera combinations pass, in Node, Chromium and WebKit

- **Topology:** passes.
  - All 32 IDs, both rings clockwise, inner ring inside the outer.
  - Closest pair I1–I2 at 52.8 layout units.
  - Four connectors of 68 units, none passing over a tile.
  - Board 340×340 units.
- **Coordinates:** the package's coordinates are identical to the reference layout (largest difference 0.000). **No coordinate corrections are required.**

| Screen | Mode | Closest node centres (default / detail 15°) | Smallest visible tile edge | Token at O0 | Result |
| --- | --- | --- | --- | --- | --- |
| se 667×375 | full | 50.3 / 47.7 pt | 43.2 / 37.9 pt | 13.0 / 12.3 pt | pass |
| mini, x 812×375 | full | 47.4 / **44.9** pt | 40.8 / 35.8 pt | 12.2 / 11.6 pt | pass (detail: 0.9 pt headroom) |
| xr 896×414 | full | 52.7 / 50.0 pt | 45.4 / 39.8 pt | 13.6 / 12.9 pt | pass |
| i12 844×390 | full | 49.4 / 46.9 pt | 42.5 / 37.3 pt | 12.8 / 12.1 pt | pass |
| i14p 852×393 | full | 49.9 / 47.3 pt | 42.9 / 37.6 pt | 12.9 / 12.2 pt | pass |
| i14pl 926×428 | full | 54.7 / 51.8 pt | 47.0 / 41.2 pt | 14.1 / 13.3 pt | pass |
| i16pl 932×430 | full | 54.9 / 52.1 pt | 47.2 / 41.5 pt | 14.2 / 13.4 pt | pass |
| i16p 874×402 | full | 51.1 / 48.4 pt | 43.9 / 38.6 pt | 13.2 / 12.5 pt | pass |
| i17 874×402 | full | 48.5 / 46.0 pt | 41.7 / 36.6 pt | 12.5 / 11.8 pt | pass |
| air 912×420 | full | 49.7 / 47.1 pt | 42.8 / 37.5 pt | 12.8 / 12.1 pt | pass |
| i16pm 956×440 | full | 53.6 / 50.8 pt | 46.1 / 40.4 pt | 13.8 / 13.1 pt | pass |
| se1 568×320 | zoom fallback | overview 37.3 / 35.6 → **zoom ×1.25 / ×1.3 → 46.6 / 46.3 pt** | 32.0 / 28.4 pt | 9.6 / 9.2 pt (zoomed 12.0) | pass with fallback |
| safari-se 667×320 | zoom fallback | overview 42.7 / 40.5 → **zoom ×1.1 / ×1.15 → 47.0 / 46.6 pt** | 36.8 / 32.3 pt | 11.0 / 10.4 pt (zoomed 12.1) | pass with fallback |
| safari-12 844×320 | zoom fallback | overview 42.7 / 40.5 → **zoom ×1.1 / ×1.15 → 47.0 / 46.6 pt** | 36.8 / 32.3 pt | 11.0 / 10.4 pt (zoomed 12.1) | pass with fallback |

On every screen, with both cameras, every property at Skyscraper and four tokens on O0:

- every node, tile, roof and token stays visible;
- both route previews are fully visible from O0, O1 and I1;
- nothing sits under the HUD.

On the fallback screens, the only overview failure is the 44 pt spacing, as expected; there the overview is view-only.

### 320 pt screens: current failure and the validated zoom/pan fallback

**Current failure.** At the overview, adjacent outer-ring nodes are 37.3 pt apart on SE (1st gen) and 42.7 pt apart in Safari with toolbars. With the detail camera they are 35.6 and 40.5 pt. 44 pt targets would overlap. On SE (1st gen) the O5 and O15 target circles also reach under the HUD. **Targets are not shrunk.**

**Proposed fallback** (`SS.zoomFallback`, validated):

1. **Trigger:** use the fallback whenever the measured overview spacing is below 44 pt, not a list of devices. A future layout or HUD change therefore switches screens in or out automatically.
2. **Overview:** the whole board, view-only.
   - It shows ownership, buildings, tokens and both route previews; all of these pass the visibility and HUD checks.
   - Tapping the board never selects at the overview. It opens the zoom centred on the tap.
3. **Zoom:** a uniform magnification of the overview, rounded up to 0.05: (44 ÷ overview spacing) × 1.05.
   - That gives ×1.25 on SE (1st gen) (×1.3 with the detail camera) and ×1.1 in Safari (×1.15 detail).
   - Spacing becomes at least 46.3 pt everywhere.
   - The camera is unchanged, so what hides what is exactly as at the overview.
4. **Pan:** drag to pan. The view may go past the board edge by half a target plus 4 pt, so edge nodes (O0, O10) can be fully targeted.
5. **Selection:** only nodes whose **whole 44 pt circle** is inside the board area are selectable. Partly clipped nodes are dimmed and inert. A button or double-tap returns to the overview.
6. **Route decision focus:** at Plan and roll, an automatic zoom centres between the token and its first junction.
   - Validated for all 32 start positions: the token, the junction and both exits (ring and connector) are selectable together.
7. **Coverage:** every node is selectable when the view is centred on it.
   - Two pan positions cover the whole board: O1/O11 on SE (1st gen), O0/O6 in Safari.
   - SE (1st gen) with the detail camera needs three: O0/O6/O11.
8. **Tokens:** four on O0 stay apart and clear of the HUD at about 12 pt when zoomed.

All rule decisions in Circuit are made with panel buttons (Stay/Cross, Roll, Buy/Pass, the Build list, End turn). Board taps are for inspection and selection only, so the fallback never blocks a move.

### Recommendations for the final renderer (no corrections required)

- **Detail camera:** keep it at **15° or less**. On the 375 pt-tall phones it leaves only 0.9 pt above the 44 pt minimum (44.9 pt). Any increase in pitch, tile size or HUD width needs revalidation.
- **Hit-testing:** select by the nearest node centre within 22 pt, as the alpha does, not by the visible tile shape. Visible tile edges are 28–47 pt, smaller than the tap target on most screens.
- **Tokens:** 9–14 pt at the overview, so they need strong contrast and an outline.
- **Rerun on every change:** run `circuit-design.cjs` and `circuit-design-browser.cjs` on every new package version. CI runs them for V1.
