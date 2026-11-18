# Skyline Circuit — Board 2: Golden-Hour Living City
**Owner visual direction:** Approved conceptual 3D circular cityboard, November 18, 2026. Design target, *not* evidence of shipped fidelity.

## Game identity
Board 2 must feel like a tangible, beautifully produced real-estate board game. Retain authoritative **32 spaces / 20 properties / four bridges**, Stay vs Sky Bridge route choices, deterministic Skyline Circuit rules and clear property/owner information. This is not a numbered dashboard, artificial simulation, or the square Board 1 geometry.

## Premium rendering
- **Physical geometry:** two thick chocolate-brown boulevards, ivory/gold accents, physically raised plot bases with brass-framed enamel inserts, central civic plaza and fountain, gold-trimmed glass pavilion, water and waterfront architecture.
- **Saturated district coding:** Harbour royal blue `#1989D0`; Civic gold `#F5B629`; Verdant green `#22A565`; Neon red `#E34B42`. Keep them clearly distinguished by shape/symbol and district legend where necessary, not color alone.
- **Warm golden hour:** rich brown board and polished gold trim; deeper blue-green water, warm windows, meaningful material roughness/metalness, layered shadows and clear bright edges without a washed-out LUT.
- **Development silhouettes:** Plot, Low-rise, Mid-rise, High-rise, Skyscraper. Distinct 3D architectural character for each district, with a guaranteed **actual-game** view for purchases and a clearly marked **concept preview** for all 20 potential buildings. Never imply previews were purchased.
- **Player pieces:** same player identification semantics as Board 1 (Y / K / M / L badges, color and geometric shapes).

## Two real interactions
1. **Strategy View:** stable rules-oriented camera, real dice and step-by-step pawn travel, route/ownership/build decisions. No automatic camera shift after a roll.
2. **City View:** user-directed yaw orbit within ±55°, zoom, tap any real street to highlight/inspect, stage preview and a 20-lot architectural showcase. `Show actual match buildings` switches to the authoritative physical stage state. Returning to Strategy resets visual-only stages and camera, never the match.

## Mobile / sharpness
- Landscape-first iPhone 3× device-pixel capture; GPU canvas rendered at a device-appropriate fraction of DPR (up to true 3× in High). Battery-saving fallback levels Low/Medium/High and `prefers-reduced-motion` should remain functional.
- Player panels/buttons must not cover the main board or make a gameplay action inaccessible; minimum touch target 44px.
- Keep the skyline in the dedicated **lab**, its own `skylineCircuitBoard2PracticeSave`, and a separate renderer/UI. Never touch Board 1, legacy Circuit Career, Classic, Harbour Ring, ranked/online, native releases or shared offline cache before approval.

## Approval gates
- Tests on Chromium and WebKit for 32-space rules, four bridges, save isolation, orbit/zoom/tap inspection, both City states, built-state-to-plot reset, reduced-motion behavior and iPhone landscape screenshots.
- Review screenshots must be **actual browser captures** distinct from the more photorealistic generated concept artwork.
- Validate physical iPhone memory/thermals/frame pacing before any player-facing activation. Draft PR only until owner confirms that the actual render—not just the concept—meets the approved visual direction.
