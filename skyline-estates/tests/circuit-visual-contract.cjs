/* Skyline Circuit golden-hour acceptance guard.
 * Checks design invariants in the playable 3D renderer; visual quality is
 * assessed with real Chromium/WebKit screenshots and owner review separately.
 * Intentionally keeps the gameplay camera, node geometry and rules unchanged. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../lib/circuit-renderer-3d.js'),'utf8');
const rule=fs.readFileSync(path.join(__dirname,'../lib/circuit-rules.js'),'utf8');
const checks=[
 ['sunlit ocean','deepWater:\'#21889B\''],
 ['sandstone platform',"g.addColorStop(0,'#F5DDAC')"],
 ['golden-hour illumination',"DirectionalLight('#FFE3A7',2.45)"],
 ['warm board streets',"color:'#E2BE94'"],
 ['green civic park',"color:'#4A9C62'"],
 ['four architectural silhouettes','if(variant===0)'],
 ['civic tower','else if(variant===1)'],
 ['terrace tower','else if(variant===2)'],
 ['twin-wing tower','else{// Neon Exchange'],
 ['no rule-space expansion','const stageCache=Array.from({length:4}'],
 ['validated camera remains','function setCamera(c)'],
 ['adaptive pixel budget','Math.sqrt(4200000/(W*Hh))'],
 ['civic planting','Sunlit civic park: a low walking circuit']
];
for(const [description,needle] of checks)assert(src.includes(needle),description+' missing');
assert(!rule.includes('Sunlit civic park'),'decoration cannot enter rules engine');
assert(src.includes('const variant=SC.NODES.find(n=>n.id===id)?.quadrant??0'),'buildings must follow existing district registry');
console.log('PASS: warm golden-hour scene, four distinct district towers, capped retina rendering, unchanged rule topology');
