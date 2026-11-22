import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setManifest } from '../../src/data.js';
export const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const M = setManifest(JSON.parse(fs.readFileSync(path.join(AF, 'data', 'asset_manifest.json'), 'utf8')));
export class MemStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } }
// Simple scripted commander used for balance + flow tests (NOT shipped as auto-combat).
export function autoplay(b, { maxSeconds = 2400, dt = 0.05, tiles } = {}) {
  const plan = tiles || [[3, 3], [3, 5], [7, 3], [7, 5], [9, 4], [8, 6], [12, 3], [12, 6], [4, 4], [10, 2], [13, 5], [6, 4], [16, 3]];
  let t = 0, pi = 0;
  while (!b.over && t < maxSeconds) {
    if (!b.waveActive) b.startWave();
    for (const id of b.cards()) {
      const u = b.byId[id];
      if (b.energy >= u.energy_cost) {
        for (let k = 0; k < plan.length; k++) { const [x, y] = plan[(pi + k) % plan.length]; if (b.canDeploy(id, x, y).ok) { b.deploy(id, x, y); pi++; break; } }
      }
    }
    if (b.ultReady()) b.ultimate(14, 4);
    for (const a of b.allies) if (a.mk < 3 && b.battleAlloy > 400) b.upgradeMk(a.uid);
    b.step(dt); b.drain(); t += dt;
  }
  return t;
}
