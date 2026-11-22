// Packs Meshy outputs (test-results/meshy_src/<id>/{rigged,idle,move,fire,hit,die}.glb) into assets/models/<id>.glb
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs'; import { launch } from '../browser.mjs';
const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const gun = { idle: ['shoot', 'hold', 0.35], move: ['move'], fire: ['shoot', 'upper'], hit: ['hit'], die: ['die'] };
const JOBS = {
  aegis_trooper: { clips: gun, weapon: 'rifle', glow: '#3ce5ff', height: 1.45, aim: 'forward' },
  vesper_ranger: { clips: gun, weapon: 'rifle', glow: '#ff4fd8', height: 1.4, aim: 'forward', weaponScale: 1.15 },
  sovereign_lyra: { clips: { idle: ['calm'], move: ['move'], fire: ['cast'], hit: ['hit'], die: ['die'] }, weapon: 'lance', glow: '#d78bff', height: 1.5, aim: 'up', weaponScale: 1.5 },
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const server = await serve(8795); const browser = await launch(); const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message)); page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
await page.goto('http://127.0.0.1:8795/aetherfront/tools/meshy/pack.html'); await page.waitForFunction(() => window.packReady);
const mpath = path.join(AF, 'data/asset_manifest.json'); const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
for (const id of ids) {
  const r = await page.evaluate(([id, cfg]) => window.pack(id, '../../test-results/meshy_src/' + id, cfg), [id, JOBS[id]]);
  fs.mkdirSync(path.join(AF, 'assets/models/forge'), { recursive: true });
  const forgeCopy = path.join(AF, 'assets/models/forge', id + '.glb');
  if (!fs.existsSync(forgeCopy)) fs.copyFileSync(path.join(AF, 'assets/models', id + '.glb'), forgeCopy);
  fs.writeFileSync(path.join(AF, 'assets/models', id + '.glb'), Buffer.from(r.b64, 'base64'));
  const u = m.units.find((x) => x.id === id);
  Object.assign(u, { model: `assets/models/${id}.glb`, forge_model: `assets/models/forge/${id}.glb`, model_version: 3, model_source: 'Meshy AI (text-to-3D → refine → auto-rig → animation library), packed by tools/meshy', bounds: r.bounds, skinned: true });
  const url = await page.evaluate((id) => window.portrait('../../assets/models/' + id + '.glb'), id);
  fs.writeFileSync(path.join(AF, 'assets/portraits', id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(id, (r.bytes / 1e6).toFixed(2), 'MB', JSON.stringify(r.bounds));
}
fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');
await browser.close(); server.close();
