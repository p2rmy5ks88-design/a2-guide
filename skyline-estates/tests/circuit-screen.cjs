// Skyline Circuit design validation in Node: every supported viewport × camera preset with the reference layout and the
// alpha HUD plan. Records which combinations pass, so the camera trade-off is measured rather than guessed.
// The browser test (circuit-alpha-browser.cjs) repeats the top-down case against the real page DOM.
'use strict';
const assert=require('node:assert/strict'),SS=require('../lib/circuit-screen.js'),SC=require('../lib/circuit-rules.js');
let n=0;const check=(m,f)=>{f();n++;console.log('ok',m)};
const app=SS.VIEWPORTS.filter(v=>!v.web&&!v.floor),table={};
for(const [cam,c] of Object.entries(SS.CAMERAS))table[cam]=SS.VIEWPORTS.map(vp=>{const r=SS.validate({vp,cam:c});return{vp:vp.id,ok:r.ok,touch:r.touch.minCentreDistance,tile:r.touch.minVisibleTileEdge,
 sky:r.skyline.ok,route:Object.values(r.route).every(x=>x.ok),hud:r.hud.ok,tokens:r.tokens.ok}});
check('viewport table: 15 entries, iPhone SE (2nd gen) 667x375 is the Circuit minimum, insets non-negative',()=>{assert.equal(SS.VIEWPORTS.length,15);
 assert.equal(SS.VIEWPORTS.find(v=>v.min).id,'se');for(const v of SS.VIEWPORTS)for(const k of ['l','r','t','b'])assert.ok(v.inset[k]>=0)});
check('top-down camera: every app viewport from iPhone SE (2nd gen) up passes all checks',()=>{for(const vp of app)assert.ok(table.top.find(r=>r.vp===vp.id).ok,vp.id)});
check('blockers are real: SE 1st gen and Safari with toolbars fail the 44 pt rule even top-down',()=>{for(const id of ['se1','safari-se','safari-12'])assert.equal(table.top.find(r=>r.vp===id).touch>=44,false,id)});
check('tilted cameras: 25° fails touch on the 375 pt-tall phones; 40° and 55° hide O5/O15 behind neighbouring Skyscrapers',()=>{
 assert.equal(table.tilt25.find(r=>r.vp==='mini').ok,false);assert.ok(table.tilt25.find(r=>r.vp==='se').ok);
 for(const cam of ['tilt40','tilt55'])for(const vp of app)assert.equal(table[cam].find(r=>r.vp===vp.id).sky,false,cam+' '+vp.id)});
check('minimum square board side for 44 pt between node centres grows with tilt',()=>{const m=Object.fromEntries(Object.entries(SS.CAMERAS).map(([k,c])=>[k,SS.minBoardSide(undefined,c)]));
 console.log('   min board side (pt):',JSON.stringify(m));assert.ok(m.top<=335&&m.top<m.tilt25&&m.tilt25<m.tilt40&&m.tilt40<m.tilt55)});
check('validators catch faults: a crowded layout overlaps targets, a HUD over the board is reported, a missing token slot is caught',()=>{
 const vp=SS.VIEWPORTS.find(v=>v.id==='i12');const small=SC.referenceLayout(170,140);assert.equal(SS.validate({vp,layout:small}).touch.ok,false);
 const plan=SS.hudPlan(vp);const bad=[...plan.rects,{id:'banner',x:plan.board.x,y:plan.board.y,w:plan.board.w,h:40}];assert.equal(SS.validate({vp,hudRects:bad}).hud.ok,false);
 const G=SS.geometry(SC.referenceLayout()),C=SS.camera(G,SS.CAMERAS.top,plan.board);G.tokenSlots[1]=G.tokenSlots[0];assert.equal(SS.tokens(G,C).ok,false)});
check('route preview paths diverge at the first junction and cover 12 steps for both plans',()=>{const p=SS.routePaths('O1');assert.equal(p.stay.length,12);assert.equal(p.cross.length,12);
 assert.equal(p.stay[3].to,'O5');assert.equal(p.cross[4].to,'I3');assert.equal(p.cross[4].connector,true)});
for(const [cam,rows] of Object.entries(table))console.log(`   ${cam.padEnd(7)} `+rows.map(r=>`${r.vp}:${r.ok?'ok':'X'}`).join(' '));
console.log(`circuit-screen: ${n} checks passed`);
