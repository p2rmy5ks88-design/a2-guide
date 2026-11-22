# AETHERFRONT: LAST LINE — playable WebGL 3D prototype

This is a **standalone, original tower-defense game**. It is isolated in the `/aetherfront/` folder and does not change Skyline Estates or any other app.

## Play

Open `index.html` from the GitHub Pages URL once this PR is merged and published. On iPhone, rotate to landscape. Tap **Begin Defense**, select Pulse / Arc / Nova / Cryo and tap the 3D battlefield to place turrets. Tap placed turrets to upgrade or sell, start waves, and defend the CORE through all 15 waves.

## Architecture

- `index.html`, `style.css`: responsive iPhone-landscape command HUD.
- `game.js`: working tower-defense simulation (BFS rerouting, 4 turret types, health, energy, flying units, bosses, 15 waves, pause, 1×/2×, sound, score). It remains the **authoritative game engine**.
- `render3d.js`: original shader-based **real WebGL** scene: raised industrial platform, metal terrain, 3D tower meshes, energy core, 3D enemies, moving projectiles and effects, isometric orthographic camera, ray/ground touch coordinate mapping. No external library or CDN required.
- `approved-concept.jpg`: reference image used for background/splash (work-in-progress; not an exact 3D reproduction of every detailed structure).

WebGL unavailable? Game automatically keeps the playable original Canvas 2D fallback rather than crashing.

## Deployment

Once merged into `main`, the existing site's expected path is:

`https://p2rmy5ks88-design.github.io/a2-guide/aetherfront/`

The URL is **not confirmed live** until Pages publishes the merged commit.

## Testing and limits

- JS syntax checks: passed for both `game.js` and `render3d.js`.
- Browser functional smoke checks: passed at 1440×800, 956×440 and 844×390, including tower construction, wave controls and 2D fallback.
- Renderer simulated WebGL test: **458 procedural 3D draws/frame**; pickable tiles cover all 18×10 cells.
- The testing browser here has no WebGL context; **actual GPU appearance, performance and physical iPhone Safari have not yet been validated**.
- Approved image is visual direction: production-quality 3D models, terrain materials, higher-end VFX and iPhone performance optimization remain a further phase.

All code is original; no Fieldrunners assets or source code are used.
