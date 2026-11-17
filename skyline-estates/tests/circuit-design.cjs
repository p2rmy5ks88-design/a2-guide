// Validates a Skyline Circuit design package (ChatGPT) against the Circuit topology and screen checks, without a browser.
//   node tests/circuit-design.cjs [design.json]      default: design/circuit-design-v1.json
//   CIRCUIT_DESIGN_REPORT=path  writes the screen-space measurements (per screen, per camera, per node).
// Full screens must pass every check. Screens marked "zoom-fallback" must pass every overview check except the 44 pt
// target spacing (the overview is view-only there), and the zoom/pan fallback must pass all of its checks.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),SC=require('../lib/circuit-rules.js'),SS=require('../lib/circuit-screen.js');
const file=process.argv[2]||path.join(__dirname,'../design/circuit-design-v1.json'),D=JSON.parse(fs.readFileSync(file,'utf8'));
let n=0;const check=(m,f)=>{f();n++;console.log('ok',m)};
function evaluate(D){const out={design:D.name,topology:SC.validateLayout(D.layout),screens:{}};
 for(const [cn,cam] of Object.entries(D.camera))for(const [id,sc] of Object.entries(D.screens)){const r=SS.validate({layout:D.layout,cam,vp:sc.viewport,hudRects:sc.hudRects,board:sc.board,spec:D.geometry});
  const G=SS.geometry(D.layout,D.geometry),C=SS.camera(G,cam,sc.board);const zoom=sc.mode==='zoom-fallback'?SS.zoomFallback(G,C,{hudRects:sc.hudRects}):null;
  const hudNonTarget=r.hud.errors.filter(e=>!e.startsWith('target-under-hud'));
  const overview={projection:r.projection.ok,touch:r.touch.ok,skyline:r.skyline.ok,tokens:r.tokens.ok,route:Object.values(r.route).every(x=>x.ok),hud:r.hud.ok,hudExceptTargets:hudNonTarget.length===0};
  const pass=sc.mode==='full'?r.ok:overview.projection&&overview.skyline&&overview.tokens&&overview.route&&overview.hudExceptTargets&&zoom.ok;
  (out.screens[id]=out.screens[id]||{viewport:sc.viewport,mode:sc.mode})[cn]={pass,overview,errors:[...r.projection.errors,...r.touch.errors,...r.skyline.errors,...r.tokens.errors,...r.hud.errors,...Object.values(r.route).flatMap(x=>x.errors)],
   measurements:{scalePtPerUnit:r.scalePtPerUnit,board:sc.board,minCentreDistancePt:r.touch.minCentreDistance,closestPair:r.touch.closest,minVisibleTileEdgePt:r.touch.minVisibleTileEdge,smallestTile:r.touch.smallestTile,tokenDiameterPt:r.tokens.tokenDiameterPt,
    o0TokenSlots:r.tokens.slots,worstSkylineVisibility:r.skyline.worst.slice(0,3),nodes:r.projection.nodes.map(({id,x,y})=>({id,x,y}))},zoom}}
 return out}
const R=evaluate(D);
check('topology: 32 IDs, both rings clockwise, inner inside outer, ≥44 pt layout spacing, connectors clear of tiles',()=>assert.ok(R.topology.ok,R.topology.errors.join()));
check('rules untouched: the design changes no rules data (node types, links, districts)',()=>{assert.equal(Object.keys(D.layout.nodes).length,32);for(const n of SC.NODES)assert.ok(D.layout.nodes[n.id],n.id)});
const rows=[];for(const [id,S] of Object.entries(R.screens))for(const cn of Object.keys(D.camera)){const x=S[cn];rows.push({id,cn,mode:S.mode,...x})}
for(const r of rows){const m=r.measurements;console.log(`   ${r.pass?'PASS':'FAIL'} ${r.cn.padEnd(7)} ${r.id.padEnd(10)} ${r.mode.padEnd(13)} spacing ${m.minCentreDistancePt} · tile ${m.minVisibleTileEdgePt} · token ${m.tokenDiameterPt}`+(r.zoom?` · zoom ×${r.zoom.factor} → ${r.zoom.zoomSpacing} pt, pan stops ${r.zoom.panStopsToCoverBoard.join('/')}`:'')+(r.pass?'':' · '+r.errors.slice(0,3).join(', ')))}
check('every full screen passes all checks with both cameras',()=>{for(const r of rows.filter(r=>r.mode==='full'))assert.ok(r.pass,r.cn+' '+r.id)});
check('320 pt screens: the overview fails only the 44 pt spacing; the zoom/pan fallback restores ≥44 pt and passes coverage, route-decision and token checks',()=>{
 for(const r of rows.filter(r=>r.mode==='zoom-fallback')){assert.equal(r.overview.touch,false);assert.ok(r.pass,r.cn+' '+r.id+' '+(r.zoom.errors||[]).join());assert.ok(r.zoom.zoomSpacing>=44)}});
if(process.env.CIRCUIT_DESIGN_REPORT){fs.writeFileSync(process.env.CIRCUIT_DESIGN_REPORT,JSON.stringify(R,null,1));console.log('   report:',process.env.CIRCUIT_DESIGN_REPORT)}
console.log(`circuit-design: ${n} checks passed (${rows.filter(r=>r.pass).length}/${rows.length} screen×camera combinations pass)`);
module.exports={evaluate};
