// Packs static Meshy meshes (test-results/meshy_src/<id>/static.glb) into the game contract.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs'; import { launch } from '../browser.mjs';
const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const T = (glow, extra = {}) => ({ kind: 'tower', size: 1.05, glow, muzzleY: 0.75, ...extra });
export const STATIC = {
  pulse_cannon: T('#3ce5ff'), nova_mortar: T('#ff8a2a', { muzzleY: 0.9, flashScale: 1.6, yaw: Math.PI / 2 }), arc_pylon: T('#c58bff', { size: 1.3, muzzleY: 0.95 }),
  glacial_emitter: T('#9ff4ff'), volt_sentinel: T('#4f8bff', { size: 1.3, muzzleY: 0.85 }), quantum_spire: T('#ff7ae6', { size: 1.3, muzzleY: 0.85 }), aegis_barrier: T('#4aa8ff', { size: 1.15, muzzleY: 0.7 }),
  aether_drone_swarm: { kind: 'flyer', size: 0.85, axis: 'max', alt: 0.85, glow: '#3ce5ff', centerY: true, muzzleY: 0.5 },
  halo_medic: { kind: 'flyer', size: 0.55, alt: 0.4, glow: '#8affc8', centerY: true, muzzleY: 0.5 },
  atlas_walker: { kind: 'walker', size: 1.0, glow: '#3ce5ff', step: 0.6, muzzleY: 0.8 },
  scavenger_drone: { kind: 'flyer', size: 0.55, axis: 'max', alt: 0.9, glow: '#ff3348', centerY: true, muzzleY: 0.4 },
  spectral_interceptor: { kind: 'flyer', size: 0.75, axis: 'max', alt: 1.05, glow: '#ff7ae6', centerY: true, muzzleY: 0.5, yaw: -Math.PI / 2 },
  crawler_swarm: { kind: 'walker', size: 0.6, axis: 'max', glow: '#ff3348', step: 0.3, muzzleY: 0.6 },
  assault_crab: { kind: 'walker', size: 0.85, axis: 'max', glow: '#ff6a3d', step: 0.45, muzzleY: 0.8 },
  siege_walker: { kind: 'walker', size: 1.25, axis: 'max', glow: '#ff6a3d', step: 0.9, muzzleY: 0.85, flashScale: 1.5, yaw: Math.PI / 2 },
  core_reactor: { kind: 'env', size: 1.7, glow: '#3ce5ff' }, entry_gate: { kind: 'env', size: 1.9, glow: '#3ce5ff' },
};
const ids = process.argv.slice(2).filter((i) => fs.existsSync(path.join(AF, 'test-results/meshy_src', i, 'static.glb')));
const server = await serve(8801); const browser = await launch(); const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8801/aetherfront/tools/meshy/pack.html'); await page.waitForFunction(() => window.packReady);
const mpath = path.join(AF, 'data/asset_manifest.json'); const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
for (const id of ids) {
  const r = await page.evaluate(([id, cfg]) => window.packStatic(id, '../../test-results/meshy_src/' + id + '/static.glb', cfg), [id, STATIC[id]]);
  fs.mkdirSync(path.join(AF, 'assets/models/forge'), { recursive: true });
  const forgeCopy = path.join(AF, 'assets/models/forge', id + '.glb');
  if (!fs.existsSync(forgeCopy)) fs.copyFileSync(path.join(AF, 'assets/models', id + '.glb'), forgeCopy);
  fs.writeFileSync(path.join(AF, 'assets/models', id + '.glb'), Buffer.from(r.b64, 'base64'));
  const u = m.units.find((x) => x.id === id) || m.environment.find((x) => x.id === id);
  Object.assign(u, { model: `assets/models/${id}.glb`, forge_model: `assets/models/forge/${id}.glb`, model_version: 3, model_source: 'Meshy AI text-to-3D (static PBR mesh) + procedural clips, packed by tools/meshy/run-static.mjs', bounds: r.bounds });
  if (u.portrait) { const url = await page.evaluate((id) => window.portraitObj('../../assets/models/' + id + '.glb'), id); fs.writeFileSync(path.join(AF, 'assets/portraits', id + '.png'), Buffer.from(url.split(',')[1], 'base64')); }
  console.log(id, (r.bytes / 1e6).toFixed(2), 'MB', JSON.stringify(r.bounds));
}
fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');
await browser.close(); server.close();
