// Builds a single self-contained HTML file of the Circuit 3D alpha + device benchmark for on-device QA
// (open it in iPhone Safari; it runs the benchmark automatically and shows Copy results).
//   node tests/build-circuit-qa-bundle.cjs out.html [--play]   (--play: normal alpha, no automatic benchmark)
// The ES modules (three.js r160, BufferGeometryUtils, the renderer) are converted to plain inline scripts, so the file
// needs no module loading, blob URLs or network access. Benchmark mode never writes saves.
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');const L=f=>fs.readFileSync(path.join(__dirname,'../lib',f),'utf8');
const out=process.argv[2]||'circuit-qa.html',play=process.argv.includes('--play');
// export{a as B,c} → {B:a,c:c}
const exportsOf=clause=>'{'+clause.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.split(/\s+as\s+/);return`${JSON.stringify(m[1]||m[0])}:${m[0]}`}).join(',')+'}';
function threeIIFE(){let src=L('three.module.min.js');const i=src.lastIndexOf('export{');assert.ok(i>0&&/};\s*$/.test(src));const clause=src.slice(i+7,src.lastIndexOf('}'));
 assert.ok(!/\bimport\s*[\s{*(]/.test(src.slice(0,i).replace(/import\.meta/g,'')),'three has no imports');return`window.__THREE=(function(){"use strict";${src.slice(0,i)}\nreturn ${exportsOf(clause)}})();`}
function bguIIFE(){let src=L('BufferGeometryUtils.js');src=src.replace(/import\s*\{([^}]*)\}\s*from\s*'\.\/three\.module\.min\.js';/,(m,n)=>`const {${n}}=window.__THREE;`);
 const i=src.lastIndexOf('export {');const clause=src.slice(i+8,src.indexOf('}',i));src=src.slice(0,i)+src.slice(src.indexOf('}',i)+1).replace(/^;/,'');src=src.replace(/^export function /gm,'function ');
 assert.ok(!/^\s*(import|export)\b/m.test(src),'BufferGeometryUtils fully converted');return`window.__BGU=(function(){"use strict";${src}\nreturn ${exportsOf(clause)}})();`}
function rendererIIFE(){let src=L('circuit-renderer-3d.js');const names=[];
 src=src.replace("import * as THREE from './three.module.min.js';",'const THREE=window.__THREE;').replace("import {mergeGeometries} from './BufferGeometryUtils.js';",'const {mergeGeometries}=window.__BGU;');
 src=src.replace(/^export (const|function) (\w+)/gm,(m,k,n)=>{names.push(n);return`${k} ${n}`});assert.deepEqual(names.sort(),['DECISIONS','TIERS','create','pickTier']);
 assert.ok(!/^\s*(import|export)\b/m.test(src),'renderer fully converted');return`window.SkylineCircuitRenderer3D=(function(){"use strict";${src}\nreturn {${names.join(',')}}})();`}
let html=fs.readFileSync(path.join(__dirname,'../circuit-alpha.html'),'utf8');
const inlineJS=code=>`<script>${code.replace(/<\/script/gi,'<\\/script')}</script>`;
// order: flags + three.js + BufferGeometryUtils, rules, screen, renderer (reads SkylineCircuit/Screen at load), UI, bench
const prelude=(play?'':inlineJS('window.__circuitBenchAuto=true;'))+inlineJS(threeIIFE())+inlineJS(bguIIFE());
for(const f of ['circuit-rules.js','circuit-screen.js','circuit-ui.js','circuit-bench.js']){const tag=`<script src="./lib/${f}"></script>`;assert.ok(html.includes(tag),'missing '+tag);
 html=html.replace(tag,()=>(f==='circuit-rules.js'?prelude:'')+inlineJS(L(f))+(f==='circuit-screen.js'?inlineJS(rendererIIFE()):''))}
html=html.replace('<title>Skyline Circuit (alpha)</title>',`<title>Skyline Circuit ${play?'(alpha)':'device benchmark'}</title>`);
assert.ok(!/<script[^>]+src=/i.test(html),'no external scripts');
fs.writeFileSync(out,html);console.log(out,(fs.statSync(out).size/1048576).toFixed(2)+' MB');
