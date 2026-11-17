/* Cinematic camera diagnostic, intentionally separate from validated gameplay cameras.
   Run: node tests/circuit-city-camera-audit.cjs
   CITY_CAMERA_REPORT=path node tests/circuit-city-camera-audit.cjs
   The 40° inspection view is non-interactive: occlusion and target spacing are
   measured and reported, NOT silently treated as passing gameplay validation. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const SS=require('../lib/circuit-screen.js'),SC=require('../lib/circuit-rules.js');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'../design/circuit-design-v1.json'),'utf8'));
const G=SS.geometry(D.layout,D.geometry),CITY={pitch:40,dist:6};
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
if(process.env.CITY_CAMERA_REPORT)fs.writeFileSync(process.env.CITY_CAMERA_REPORT,JSON.stringify({camera:CITY,mode:'inspection-only',rows},null,2));
console.log('City View audit completed. 40° is NOT approved as an interactive decision camera.');
