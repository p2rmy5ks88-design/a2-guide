// Skyline Circuit Board 1 — release safety contract.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const career=get('lib/career.js'),tabletop=get('circuit-tabletop-lab.html');
const manifest=get('offline-assets.js'),sw=get('sw.js'),build=get('build.py');
assert(career.includes("circuit:'./circuit-production-lab.html'")&&career.includes("location.href=page[bid]+'?career=1&length='+encodeURIComponent(len)"),
 'Career Circuit selection routes to the production board and carries the selected match length');
assert(career.includes('const boardBtns=(b,name)=>b&&b.playable?'),
 'Board buttons are not exposed before existing Career requirements are met');
assert(tabletop.includes('var CAREER_MODE=wantsCareer&&careerEnabled'),
 'Living Board still requires existing Career and Circuit flags');
assert(tabletop.includes('var PREVIEW_SAVE=CAREER_MODE?SC.SAVE_KEY:"skylineCircuitTabletopRebootSave"'),
 'Career and practice saves remain separated');
assert(tabletop.includes('id="previewMark" href="./index.html"'),
 'Player can return from the board to Skyline Estates in standalone iPhone mode');
assert(!tabletop.includes('NOT THE LIVE GAME'),
 'Player-facing release must not display the former review watermark');
assert(build.includes("'circuit-tabletop-lab.html', 'circuit-tabletop-life.css', 'circuit-tabletop-life.js'"),
 'Build includes the living-board assets');
const context={self:{}};vm.runInNewContext(manifest,context);
const offline=context.self.SKYLINE_OFFLINE;
assert(offline&&typeof offline.version==='string'&&offline.version.length===24);
for(const name of ['circuit-alpha.html','circuit-tabletop-lab.html','circuit-tabletop-life.css','circuit-tabletop-life.js','lib/career.js']){
 assert(offline.files.includes('./'+name),'Offline manifest omits '+name);
 assert.equal(offline.files.filter(x=>x==='./'+name).length,1,'Duplicate offline asset '+name);
}
const swVersion=sw.match(/^\/\/ Skyline offline build: ([0-9a-f]{24})/);
assert(swVersion&&swVersion[1]===offline.version,'Service worker stamp and manifest version must match');
assert(sw.includes("offline-assets.js?build="+offline.version),'Worker imports its matching cache version');
console.log('PASS: Board 1 Career launch, fallback, save separation and matching offline asset manifest');
