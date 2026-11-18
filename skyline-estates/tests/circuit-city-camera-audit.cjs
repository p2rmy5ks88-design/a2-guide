/* Cinematic camera diagnostic, intentionally separate from validated gameplay cameras.
   Run: node tests/circuit-city-camera-audit.cjs
   CITY_CAMERA_REPORT=path node tests/circuit-city-camera-audit.cjs
   The 40° inspection view is non-interactive: occlusion and target spacing are
   measured and reported, NOT silently treated as passing gameplay validation. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const SS=require('../lib/circuit-screen.js'),SC=require('../lib/circuit-rules.js');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'../design/circuit-design-v1.json'),'utf8'));
const G=SS.geometry(D.layout,D.geometry),CITY={pitch:30,dist:5};
assert.equal(Object.keys(G.nodes).length,32,'fixed 32-node layout');
assert.equal(SC.validateLayout(D.layout).ok,true,'validated topology');
const rows=[];
for(const [id,screen] of Object.entries(D.screens)){
 const C=SS.camera(G,CITY,screen.board);
 const projected=Object.values(G.nodes).map(n=>({id:n.id,...C.project({...n,z:0})}));
 const touch=SS.touch(G,C);
 const inside=projected.filter(p=>p.x>=screen.board.x&&p.x<=screen.board.x+screen.board.w&&p.y>=screen.board.y&&p.y<=screen.board.y+screen.board.h).length;
 const skyline=SS.skyline(G,C,{stage:4,hudRects:screen.hudRects});
 const result={screen:id,viewport:screen.viewport,projectedNodesInside:inside,totalNodes:32,minimumNodeSpacingPt:touch.minCentreDistance,touchTargetsOverlap:!touch.ok,skylineVisible:skyline.ok,occlusionExamples:skyline.errors.slice(0,8)};
 rows.push(result);
 console.log(id.padEnd(12)+' nodes '+inside+'/32 · min spacing '+touch.minCentreDistance+' pt · skyline '+(skyline.ok?'clear':'OCCLUDED'));
}
assert.equal(rows.length,15,'all V1 screen classes audited');
assert(rows.every(r=>r.projectedNodesInside===32),'all 32 node centres must remain on screen');
assert(rows.every(r=>r.skylineVisible),'30-degree cinematic camera must avoid full-stage skyline occlusion');
// The more architectural 40-degree City View is a visual tour, not a strategy camera.
 // Record (rather than conceal) its tower occlusions and overlapping decision targets.
 // Every node centre must still fit within the inspection viewport.
const TOUR={pitch:40,dist:5},tourRows=[];
for(const [id,screen] of Object.entries(D.screens)){
 const C=SS.camera(G,TOUR,screen.board),touch=SS.touch(G,C),skyline=SS.skyline(G,C,{stage:4,hudRects:screen.hudRects});
 const all=Object.values(G.nodes).map(n=>C.project({...n,z:0})),inside=all.filter(p=>p.x>=screen.board.x&&p.x<=screen.board.x+screen.board.w&&p.y>=screen.board.y&&p.y<=screen.board.y+screen.board.h).length;
 tourRows.push({screen:id,projectedNodesInside:inside,totalNodes:32,skylineVisible:skyline.ok,occlusionCount:skyline.errors.length,minimumNodeSpacingPt:touch.minCentreDistance,touchTargetsOverlap:!touch.ok});
}
assert.equal(tourRows.length,15,'40-degree City View viewport count');
assert(tourRows.every(r=>r.projectedNodesInside===32),'40-degree City View must retain all 32 projected node centres');
// Do not assert all towers visible here: upper-stage occlusion is expected in the visual-only tour.
if(process.env.CITY_CAMERA_REPORT)fs.writeFileSync(process.env.CITY_CAMERA_REPORT,JSON.stringify({camera:CITY,mode:'validated-baseline',rows,cityTour:{camera:TOUR,mode:'inspection-only-no-decisions',rows:tourRows}},null,2));
console.log('30-degree baseline passed full skyline visibility; 40-degree inspection tour keeps 32 node centres in-frame and reports occlusion, never enables decisions.');
