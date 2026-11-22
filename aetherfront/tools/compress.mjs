// Mobile delivery compression for every shipped model: meshopt geometry + quantization, WebP textures
// (max 1024 px). Keeps empty marker nodes (muzzle/flash/sockets) and all animation clips.
// Usage: node tools/compress.mjs [ids...]   (needs `npx gltf-transform` available, see README)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(AF, 'assets/models');
const ids = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb') && (!ids.length || ids.includes(f.replace('.glb', ''))));
let before = 0, after = 0;
for (const f of files) {
  const p = path.join(dir, f), tmp = p + '.tmp.glb';
  const b0 = fs.statSync(p).size;
  const head = fs.readFileSync(p).subarray(0, 4000).toString('latin1');
  if (head.includes('EXT_meshopt_compression')) { before += b0; after += b0; continue; } // already done
  execFileSync('npx', ['--yes', '@gltf-transform/cli@4', 'optimize', p, tmp, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024',
    '--prune', 'false', '--palette', 'false', '--simplify', 'false', '--join', 'false', '--flatten', 'false', '--instance', 'false'], { stdio: 'pipe' });
  fs.renameSync(tmp, p);
  const b1 = fs.statSync(p).size; before += b0; after += b1;
  console.log(f.padEnd(28), (b0 / 1024).toFixed(0).padStart(6), '→', (b1 / 1024).toFixed(0).padStart(5), 'KB');
}
console.log('TOTAL', (before / 1e6).toFixed(2), 'MB →', (after / 1e6).toFixed(2), 'MB');
