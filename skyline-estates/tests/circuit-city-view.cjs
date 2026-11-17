/* Skyline Circuit owner-review City View contract. Run: node tests/circuit-city-view.cjs */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../lib/circuit-ui.js'),'utf8');
const rules=fs.readFileSync(path.join(__dirname,'../lib/circuit-rules.js'),'utf8');
assert.match(ui,/const CITY_REVIEW=\{pitch:40,dist:6\}/);
assert.match(ui,/const want=cityReview\?CITY_REVIEW:/);
assert.match(ui,/function hit\(x,y\)\{if\(cityReview\)return null;/,'no picking in City View');
assert.match(ui,/function act\(a\)\{if\(cityReview\)\{cityReview=false;/,'rule actions return to strategy');
assert.match(ui,/if\(R3\)h\+=`<div class="cx-sect"><button id="cx-city-view"/,'no City View without WebGL');
assert.match(ui,/if\(cityReview&&zoom\)overview\(\)/,'zoom reset for cinematic view');
assert.match(ui,/Return to Strategy View/);
assert(!rules.includes('CITY_REVIEW'),'camera mode must not enter rules engine');
console.log('PASS: City View presentation-only, no board selection, return to Strategy View, no rules change');
