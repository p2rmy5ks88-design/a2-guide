// Builds a single self-contained HTML file of the Circuit 3D alpha + device benchmark for on-device QA
// (open it in iPhone Safari; it runs the benchmark automatically and shows Copy results).
//   node tests/build-circuit-qa-bundle.cjs out.html [--play]   (--play: normal alpha, no automatic benchmark)
'use strict';
const fs=require('fs'),path=require('path');const L=f=>fs.readFileSync(path.join(__dirname,'../lib',f),'utf8');
const out=process.argv[2]||'circuit-qa.html',play=process.argv.includes('--play');
let html=fs.readFileSync(path.join(__dirname,'../circuit-alpha.html'),'utf8');
const js=s=>JSON.stringify(s).replace(/<\//g,'<\\/');
const prelude=`<script>(function(){var mk=function(src){return URL.createObjectURL(new Blob([src],{type:'text/javascript'}))};
var T=mk(${js(L('three.module.min.js'))});
var B=mk(${js(L('BufferGeometryUtils.js'))}.split("'./three.module.min.js'").join(JSON.stringify(T)));
window.__circuitRendererURL=mk(${js(L('circuit-renderer-3d.js'))}.split("'./three.module.min.js'").join(JSON.stringify(T)).split("'./BufferGeometryUtils.js'").join(JSON.stringify(B)));
${play?'':'window.__circuitBenchAuto=true;'}})();<\/script>`;
const inline=f=>`<script>${L(f).replace(/<\/script/gi,'<\\/script')}</script>`;
for(const f of ['circuit-rules.js','circuit-screen.js','circuit-ui.js','circuit-bench.js']){const tag=`<script src="./lib/${f}"></script>`;if(!html.includes(tag))throw Error('missing '+tag);html=html.replace(tag,()=>(f==='circuit-rules.js'?prelude:'')+inline(f))}
html=html.replace('<title>Skyline Circuit (alpha)</title>',`<title>Skyline Circuit ${play?'(alpha)':'device benchmark'}</title>`);
fs.writeFileSync(out,html);console.log(out,(fs.statSync(out).size/1048576).toFixed(2)+' MB');
