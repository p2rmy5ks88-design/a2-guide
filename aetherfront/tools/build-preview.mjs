// Builds test-results/preview/: a copy of the shippable game for hosts that cannot serve .glb
// (e.g. the claude.ai artifact host). Each GLB becomes an equivalent embedded glTF JSON (.json).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(AF, 'test-results/preview');
fs.rmSync(OUT, { recursive: true, force: true });
const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.copyFileSync(path.join(AF, rel), path.join(OUT, rel)); };
function glbToJson(src, dst) {
  const b = fs.readFileSync(src); const jl = b.readUInt32LE(12); const json = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  let off = 20 + jl; const bin = off < b.length ? b.subarray(off + 8, off + 8 + b.readUInt32LE(off)) : null;
  if (bin && json.buffers?.[0]) json.buffers[0].uri = 'data:application/octet-stream;base64,' + bin.toString('base64');
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, JSON.stringify(json));
}
for (const f of ['index.html', 'style.css', 'favicon.svg']) copy(f);
const walk = (d) => fs.readdirSync(path.join(AF, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk('src')) copy(f);
for (const f of ['three.module.min.js', 'three.core.min.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/BufferGeometryUtils.js', 'addons/utils/SkeletonUtils.js', 'addons/environments/RoomEnvironment.js', 'addons/libs/meshopt_decoder.module.js']) copy('vendor/three/' + f);
for (const f of walk('assets/audio').concat(walk('assets/portraits'))) copy(f);
const m = JSON.parse(fs.readFileSync(path.join(AF, 'data/asset_manifest.json'), 'utf8'));
const conv = (rel) => { if (!rel) return rel; const j = rel.replace(/\.glb$/, '.json'); if (!fs.existsSync(path.join(OUT, j))) glbToJson(path.join(AF, rel), path.join(OUT, j)); return j; };
for (const u of [...m.units, ...m.environment]) { u.model = conv(u.model); u.forge_model = u.forge_model && conv(u.forge_model); u.starter_model = u.forge_model || u.model; }
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'data/asset_manifest.json'), JSON.stringify(m));
const files = walk('test-results/preview').map((f) => path.relative(OUT, path.join(AF, f)));
const total = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
fs.writeFileSync(path.join(AF, 'test-results/preview-files.json'), JSON.stringify(files.map((f) => ({ as: f, path: path.join(OUT, f) }))));
console.log(files.length, 'files', (total / 1e6).toFixed(1), 'MB; largest', Math.max(...files.map((f) => fs.statSync(path.join(OUT, f)).size)) / 1e6);
