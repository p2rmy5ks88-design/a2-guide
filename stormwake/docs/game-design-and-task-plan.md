# Stormwake

## Game design and production plan

**Format** · Portrait 3D arcade shooter for iPhone Safari first, with desktop keyboard support.  
**First release** · Two handcrafted missions, two aircraft, two difficulty settings per route.  
**Player promise** · Fly a rescue aircraft into a collapsing storm corridor and decide, under fire, whether to break formation to save a crew or stay on the attack.

The current **Glasswater Strait** browser prototype establishes relative steering, automatic fire, rescue pods, Stormcoil, alloy and repeatable runs. The production slice turns those systems into a two-mission campaign with authored encounters and a persistent hangar. The existing playtest is the baseline for control and responsiveness.

## Screens and player flow

| Screen | Layout and behavior |
|---|---|
| Route map | Full-height map of the island chain. Route cards show mission name, clear status, three objective marks and the selected difficulty. Locked routes explain the unlock condition. Selecting a route leads to its loadout screen. |
| Loadout | Rotatable aircraft on a lit hangar platform. Aircraft name, hull, pickup radius and equipped module sit below it. A sticky **Launch** button displays route and difficulty. |
| Flight | Camera scrolls north at a fixed pace outside boss arenas. Top HUD shows hull, rescues and mission phase. Bottom edge holds a thumb-accessible Stormcoil button with charge. Score appears on the debrief. |
| Debrief | Clear or loss, three objective outcomes, exact alloy breakdown, and **Retry**, **Hangar**, **Route map**. Newly earned objectives and unlocks appear on this screen. |
| Hangar | Three upgrade rows with current tier, next effect and cost. Buy updates the balance immediately. Aircraft and module selections persist. |

## Flight rules

- Auto-fire begins when the mission starts. Relative drag can begin anywhere on the playfield. Lifting and touching again never snaps the craft. The drag keeps a small visual gap between thumb and aircraft. Keyboard movement uses arrows or WASD, and Space fires Stormcoil.
- Hull is measured in whole points. Base Kestrel hull is 5. A hit removes 1 point and grants 0.9 seconds of invulnerability. Give damage a distinct sound and brief outline pulse with reduced-motion support. At zero hull, end the run and record salvage.
- Each rescue has a mint-colored beacon with a visible pickup ring. Stay inside for 0.65 seconds to recover the crew. Leaving the ring drains progress to zero over 0.4 seconds. The radio call and ring completion confirm extraction.
- Stormcoil starts at 20% each sortie and gains 30 percentage points per rescue and 5 per marked target, capped at 100. At 100%, trigger a pulse within a quarter of the playfield width. It clears enemy shots immediately, staggers exposed emitters for 2 seconds and resets charge to zero. Bosses stay beatable with the main cannon.
- Pause freezes waves, bullets, rescue timers and audio. Resume requires a tap after returning to Safari. Left-handed mode moves Stormcoil to the opposite bottom corner. Buttons have at least 44 CSS pixels of touch area.

## Missions and encounters

Times are first-pass pacing targets. Hold the timeline at the boss gate until the boss falls or the player loses.

| Time | Mission 01 · Glasswater Strait | Mission 02 · Breaker’s Reach |
|---|---|---|
| 0:00–0:25 | Kestrel enters between sunlit reefs. A loose drone formation teaches movement and autofire. | Fly beneath rust-orange dock cranes. Small interceptors cross diagonally while the channel guides your approach. |
| 0:25–1:10 | First crew at a damaged ferry. Two marked signal barges patrol separately, with slow, telegraphed bursts. | First crew on a storm service platform. Two marked rail tugs run staggered attack lanes. |
| 1:10–2:05 | Second crew between lighthouse rocks. Third crew and final marked barge appear on opposite sides in held lanes so both can be reached in one skilled run. | Second crew under a crane gantry. The third crew arrives during a barge crossing. A marked crane platform opens and closes its shield on a readable cycle. |
| 2:05–3:30 | **Tempest Ark**. Twin emitter arms fan amber bolts. Destroy either arm and the surviving arm starts sweeping. Destroy both to expose the core. Below half core health, a projected line across the water announces each sweep 1.1 seconds before it fires. | **Breakwater Engine**. Two rotating turbine shields alternate exposed sectors. Damage both sectors to open the core, then weave around staggered ring waves. The rim glows before each wave. |

**Replay logic.** Each mission has three independent objectives per difficulty: rescue all three crews; destroy all three marked targets; clear without hull damage. A successful clear commits newly earned objectives. Normal clear unlocks the next route. Two Normal objectives on a cleared route unlock Storm for that route. Storm remixes formations, angles and timing, with at least one reachable gap in every pattern. Use new patterns before scaling hull values.

## Aircraft, modules and economy

| Item | Rule |
|---|---|
| Kestrel | Starting craft. Five hull points, balanced turn rate, twin forward cannon. |
| Petrel | Unlock after completing the rescue objective on both Normal routes. Four hull points, 30% wider rescue radius and the same base cannon damage. |
| Module slot | Choose one. **Recovery Lens** increases salvage attraction range by 25%. **Surge Cell** adds 20 percentage points to starting Stormcoil charge. Unlock Surge Cell on the first Normal clear. |
| Upgrade tracks | Three tiers per track at **35 / 70 / 120 alloy**. Cannon adds 10% base shot damage per tier. Hull adds one point per tier. Salvage range adds 15% base attraction radius per tier. Show final effective stats before launch. |
| Sources | Ordinary enemies drop alloy pickups. Budget roughly **12–22 alloy** from pickups per Normal route. Each rescue pays **4**, a Normal clear pays **20**, and each newly completed Normal objective pays **8** once. Storm multiplies repeatable gains by **1.5**, rounded down at settlement. |
| Loss and saves | A loss banks collected pickups plus completed rescue pay. Abandoning a run settles zero and returns to the map after confirmation. Persist each result once, including best score, balance and objectives. Migrate the current prototype’s alloy and best score. Map fitted wing cannons to cannon tier 1 and fitted hull reinforcement to hull tier 2. |

One Normal clear with half the available loot and one rescue yields about **30–35 alloy**, enough or close to the first upgrade. An early loss still contributes to it. Tune against this range during playtesting.

## Art and audio direction

Keep a high, stable camera during play. Use 3D geometry for terrain and craft with baked contact shadows, depth from water specular and layered cloud movement. Glasswater Strait uses pale rock, turquoise shallows and sunlit ferry wreckage. Breaker’s Reach uses slate water, caged work lights and red-orange crane steel. Preserve cyan player fire, amber enemy fire and mint rescue rings across both environments. Use silhouettes and motion as recognition cues alongside color.

| Asset | Direction and production treatment |
|---|---|
| Kestrel and Petrel | Kestrel has arrow-shaped wings, ivory armor, cobalt trim and twin cyan engines. Petrel has a short nose, wider gull wings and two lime rescue pods. Review both from the actual flying camera before texturing. |
| Tempest Ark and Breakwater Engine | Ark is a broad offshore ring with articulated emitter arms. Breakwater is a squared tidal gate with counter-rotating turbines. Author core, armor and emitters as separate runtime meshes with explicit pivots and hit regions. |
| Route environment | Build modular reef rocks, beacon, ferry wreck, lighthouse, cargo cranes and pier segments. Reuse primitives and atlases for simple geometry. |
| Audio | Give cannon fire, incoming heavy attacks, rescue confirmation and Stormcoil distinct cues. Use original sound assets and keep music subordinate to warning cues. |

Use **Meshy** when Kestrel, Petrel or environment blockouts need richer surface detail. Begin with one top-down Kestrel preview and review its silhouette before refinement. Use Blender or procedural meshes for boss parts and rigs that need predictable pivots. Export original GLBs with consistent scale, named attachment points, baked textures and track asset provenance. Start with a **6 MB compressed first-mission asset budget**, textures generally 1K or smaller, and pool projectiles and effects. Profile on the phone before raising the budget.

## Ordered task plan

| Task | Depends on | Output and acceptance |
|---|---|---|
| **SW-01 · Campaign foundation** | Current prototype | Move flight data into a reusable mission schema. Implement save migration, economy settlement, route locks and independent objectives. Verify progressing from a legacy save, a loss, a clear and a repeated debrief. |
| **SW-02 · First 3D flight scene** | Current prototype | Implement touch-first portrait renderer and original Kestrel, reef, water and ferry blockouts. Connect gameplay to the renderer. Verify pointer capture, thumb visibility, pause/resume and screen safe areas. |
| **SW-03 · Glasswater Strait** | SW-01, SW-02 | Author all three rescues, three marked barges and the complete Tempest Ark encounter. Test a fresh Kestrel clear, all objectives across multiple runs and Storm unlock. |
| **SW-04 · Route map, loadout and hangar** | SW-01 | Implement the full screen flow, both aircraft, module equip, three upgrade tracks and debrief. Verify balance and choices survive reload. |
| **SW-05 · Breaker’s Reach and Storm variants** | SW-03, SW-04 | Author the second route and boss, remix both routes for Storm, validate Petrel unlock, and exercise every outcome from fresh and migrated saves. |
| **SW-06 · iPhone polish and preview** | SW-05 | Finish assets and sound, profile the boss scenes on physical iPhone Safari, fix input or layout defects, run GitHub checks and publish to the existing private playtest URL. |

### Release gate

- A fresh player clears Glasswater Strait in a stock Kestrel, sees each objective outcome, buys an upgrade and enters Breaker’s Reach without reloading.
- A player clears both rescue objectives across separate runs, unlocks Petrel and flies it after reopening Safari. Retrying objectives and reloading the debrief never double-pay rewards.
- Both bosses can be cleared without using Stormcoil. A deliberately activated pulse clears bullets only within its displayed area and staggers only exposed weapons.
- On a physical iPhone in Safari, aim for a 60 fps presentation on the target device. Capture frame pacing during each boss, check the ship remains visible while dragging, and verify pause/resume, sound unlock, left-handed controls and saved progress.
- For each playtest, record device, build commit, route, loadout, time to clear, damage taken, rescues, objective outcomes and input or performance issues.

**Delivery target** · Repository branch `feat/aetherfront-webgl-3d`, game entry `stormwake/index.html`. Preview updates use the existing private Stormwake playtest after the corresponding GitHub commit is verified.
