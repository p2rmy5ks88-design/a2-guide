/* Camera exploration diagnostic. Does not alter the validated decision camera.
   Sweeps 15/20/25/30/35/40 degrees at 5/6/7 radius distances across
   all 15 V1 screen classes, with all properties at Skyscraper stage. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),SS=require('../lib/circuit-screen.js'),SC=require('../lib/circuit-rules.js');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'../design/circuit-design-v1.json'),'utf8'));
const G=SS.geometry(D.layout,D.geometry),rows=[];
for(const pitch of [15,20,25,30,35,40])for(const dist of [5,6,7]){
 let occluded=0,overlap=0,offboard=0,worst=Infinity,hiddenNodes=0;
 for(const sc of Object.values(D.screens)){
  const C=SS.camera(G,{pitch,dist},sc.board),t=SS.touch(G,C),sky=SS.skyline(G,C,{stage:4,hudRects:sc.hudRects});
  if(!sky.ok)occluded++;hiddenNodes+=sky.errors.length;if(!t.ok)overlap++;worst=Math.min(worst,t.minCentreDistance);
  if(Object.values(G.nodes).some(n=>{const p=C.project({...n,z:0});return p.x<sc.board.x||p.x>sc.board.x+sc.board.w||p.y<sc.board.y||p.y>sc.board.y+sc.board.h}))offboard++;
 }
 rows.push({pitch,dist,occludedScreens:occluded,hiddenNodeSamples:hiddenNodes,overlapScreens:overlap,offboardScreens:offboard,minSpacingPt:+worst.toFixed(1)});
}
rows.sort((a,b)=>a.hiddenNodeSamples-b.hiddenNodeSamples||b.pitch-a.pitch||b.minSpacingPt-a.minSpacingPt);
console.log('CAMERA SWEEP — ranked by skyline occlusion, then pitch');
for(const r of rows)console.log(JSON.stringify(r));
if(process.env.CAMERA_SWEEP_REPORT)fs.writeFileSync(process.env.CAMERA_SWEEP_REPORT,JSON.stringify({note:'diagnostic only; decision camera stays at 0 degrees',rows},null,2));
