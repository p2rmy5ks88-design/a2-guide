# Skyline Origins — approved-art visual authority (Board 1 of 4)

**Owner visual approval: November 18, 2026.** The owner's reference is the landscape *Skyline Origins* illustration supplied in ChatGPT (1536×864 source). That reference — not previous Circuit screenshots, circular concepts or standalone stylizations — governs Board 1. The implementation should aim for its proportions, visual richness and feeling while keeping real, readable, accessible gameplay.

## Non-negotiable Board 1 identity
- **40 real, rectangular perimeter tiles** with four distinct corners, property colours, transport, Chance/event, tax and classic GO affordances. Board 1 is **Origins**, not the separate **32-space dual-ring Circuit** and not a numbered simulation.
- Luxurious living 3D city in the middle: varied tall blue-glass towers, smaller townhouses, landscaped gardens, central civic fountain, glowing windows and roads. Actual 3D models and gameplay-authoritative ownership/building stages must remain legible.
- Distinctive warm **golden-hour** waterfront setting and surrounding skyline: deep blue-green water, rich medium-to-dark gold wooden board structure, luminous windows, realistic environmental layering and a strong navy-and-gold visual system.
- Saturated but clean plot colours: full red, orange, sky blue, yellow, deep green, purple. No washed-out desaturation, grey simulation shading or tiny white-on-white labels.
- Desktop and **iPhone 18 Pro Max landscape** must feel retina-sharp. Canvas backing resolution should be measured separately from PNG screenshot pixel count; high-DPR test images do not prove a device actually rendered all 3× pixels.
- Premium layout inspired by the approved composition: Skyline Estates crest and career board indicator to the left, slim luxurious HUD around the board, action buttons (especially a prominent red/gold Roll Dice action), portfolio / players, legible round info, no board-covering overlays.

## Important fidelity honesty
The approved artwork is a **concept render**, not an existing live game screenshot. Pixel-for-pixel identity requires a complete bespoke 3D asset, material, lighting and UI production effort. A recolour or extra low-poly models alone is not a 10/10 match. Use objective side-by-side image review and owner sign-off before calling the final result complete.

## Active project work
- **Draft PR #229:** `origins-premium-lab.html`, `origins-premium.css` and `origins-premium.js` layer onto the actual compiled 40-square game for visual experimentation without altering original source, saves or Career results. Test with real in-game screenshot artifacts.
- Respect the original engine and preserve Classic and Origins Career save/progression. Any later production integration must be feature-gated and separately validated against native builds and the required Stability gate.
- **Board 2** (Circuit / dual-ring) and draft PR #228 are **not** the Board 1 visual authority and must remain unaffected.
- User approval is required on an actual iPhone-gameplay render before any PR is merged. Check fit on 956×440 and 844×390 plus larger landscape; check real device thermals/performance separately.

## Next visual QA priorities
1. Correct board framing (complete 40-space perimeter in view) and avoid dramatic distorted camera.
2. Make city buildings more varied than flat rectangular towers; develop convincing luminous glass, façades, trim, fine vegetation and realistic daytime/golden hour light.
3. Place/size HUD like the reference without losing actual interaction, touch hit targets or board clarity.
4. Show the user **actual browser screenshots as individual PNGs**, never ZIP-only or unrelated concept renderings, and keep the draft review separate from production.
