/* Interactive Circuit tabletop page QA — browser, not a static rendering. */
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.TABLETOP_SCREENSHOTS||null;
const engine=process.env.VISUAL_ENGINE==='webkit'?'webkit':'chromium';
let browser,server;
(async()=>{
 server=http.createServer((q,res)=>{
   let pathname;try{pathname=decodeURIComponent(new URL(q.url,'http://localhost').pathname)}catch(e){res.writeHead(400).end();return}
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
   fs.readFile(file,(err,data)=>{
     if(err){res.writeHead(404).end('not found');return}
     const ext=path.extname(file);
     res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'}[ext]||'application/octet-stream','Cache-Control':'no-store'});
     res.end(data);
   });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/circuit-tabletop-lab.html';
 browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 const shots=[{id:'iphone',w:956,h:440},{id:'iphone15',w:932,h:430},{id:'small',w:844,h:390},{id:'desktop',w:1366,h:768}];
 let total=0;
 for(const vp of shots){
   const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:vp.id==='desktop'?1:3,hasTouch:vp.id!=='desktop',serviceWorkers:'block'});
   const p=await context.newPage();
   const errors=[];p.on('pageerror',e=>errors.push(String(e)));
   await p.goto(url,{waitUntil:'load'});
   await p.waitForFunction(()=>window.__circuitTabletop && document.querySelectorAll('.tile').length===32);
   assert.equal(await p.locator('.tile').count(),32,'all physical squares are rendered');
   assert.equal(await p.locator('.pawn').count(),4,'four player pawns are rendered');
   assert.equal(await p.locator('#circuitLivingWorld .lifeTower').count(),9,'living waterfront skyline is rendered');
   assert.equal(await p.locator('.lifeCar').count(),2,'miniature moving vehicles are in the board world');
   assert.equal(await p.locator('.lifeFountain').count(),1,'central fountain is present');
   assert.equal(await p.locator('#lifeMotionToggle').count(),1,'motion has an accessible pause control');
   await p.locator('#lifeMotionToggle').click();
   assert.equal(await p.locator('#lifeMotionToggle').getAttribute('aria-pressed'),'false','living animations can be paused');
   assert(await p.locator('#game').evaluate(el=>el.classList.contains('scenePaused')),'paused state also stops the world');
   await p.locator('#lifeMotionToggle').click();
   assert.equal(await p.locator('#lifeMotionToggle').getAttribute('aria-pressed'),'true','living world can resume');
   await p.evaluate(()=>SkylineCircuitLife.pulse('card','O3'));
   assert(await p.locator('[data-node="O3"]').evaluate(el=>el.classList.contains('lifeEvent')),'City Event applies a scene effect');
   assert.equal(await p.locator('.tile.property').count(),20,'all land property spaces present');
   assert.equal(await p.locator('.tile.event').count(),4,'four City Events present');
   assert.equal(await p.locator('.tile.special').count(),8,'eight Skyline junction squares present');
   const frame=await p.evaluate(()=>{const r=document.querySelector('#boardStage').getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,screenHeight:innerHeight}});
   assert(frame.top>=-24&&frame.bottom<=vp.h+24,'board corners stay visible in landscape, not cut off by huge default zoom: '+JSON.stringify(frame));
   const text=await p.locator('#tiles').textContent();
   assert(!/\b[OI]\d{1,2}\b/.test(text),'never print raw node identifiers in visible board');
   assert(text.includes('Marina Avenue')&&text.includes('SC 70'),'show street name and real price');
   assert.equal(await p.evaluate(()=>__circuitTabletop.state().ruleset),'circuit-v0','real game rules, not a visual mock');
   assert.equal(await p.locator('[data-action="roll"]').count(),1,'real human roll action');
   await p.locator('[data-node="O1"]').click({force:true});
   assert((await p.locator('#selectedCard').innerText()).includes('Marina Avenue'),'tap selects a named property');
   const before=await p.locator('#boardStage').getAttribute('style');
   await p.locator('#zoomIn').click();const after=await p.locator('#boardStage').getAttribute('style');
   assert.notEqual(after,before,'board zoom is functional');
   if(out&&vp.id==='iphone'){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-zoomed.png'),fullPage:false})}
   // Restore the actual launch zoom before taking the default review screenshot.
   await p.locator('#zoomOut').click();
   assert.equal(await p.locator('#boardStage').getAttribute('style'),before,'zooming back restores the approved full-board framing');
   if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-tabletop.png'),fullPage:false})}
   if(out&&vp.id==='iphone'){
     const beforeCity=await p.evaluate(()=>{
       const state=__circuitTabletop.state(),save=JSON.stringify(state.own);
       for(const id of SkylineCircuit.PROPS){const node=SkylineCircuit.NODES.find(n=>n.id===id);
         state.own[id]={o:node.quadrant,h:4};}
       __circuitTabletop.select('O1');return save;
     });
     assert.equal(await p.locator('.model.level4').count(),20,'20 physical skyline pieces visible in populated preview');
     await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-all-buildings.png'),fullPage:false});
     await p.evaluate(snapshot=>{__circuitTabletop.state().own=JSON.parse(snapshot);__circuitTabletop.select('O1')},beforeCity);
   }
   if(vp.id==='iphone'){
     // Late-game regression: all legal upgrades must remain available in the scrollable build tray.
     await p.evaluate(()=>{
       const state=__circuitTabletop.state();
       state.phase='build';state.players[state.turn].cash=50000;
       SkylineCircuit.PROPS.slice(0,11).forEach(id=>{state.own[id]={o:state.turn,h:0}});
       __circuitTabletop.select('O1');
     });
     assert.equal(await p.locator('[data-action^="build:"]').count(),11,'all 11 legal upgrades are available, not just the first six');
     await p.evaluate(()=>__circuitTabletop.reset());
     await p.evaluate(()=>{window.__firstPawn=document.querySelector('.pawn[data-player="0"]')});
     await p.locator('[data-action="cross"]').click();
     const phase=await p.evaluate(()=>__circuitTabletop.state().phase);
     assert.equal(phase,'roll','route choice never mutates rules before roll');
     await p.locator('[data-action="roll"]').click();
     await p.waitForFunction(()=>!document.querySelector('#actionCard').textContent.includes('On the move'),{timeout:30000});
     const pending=await p.evaluate(()=>SkylineCircuit.pending(__circuitTabletop.state()));
     assert(pending&&['buy','build'].includes(pending.type),'roll enters a genuine buy or build decision');
     const afterRoll=await p.evaluate(()=>({turns:__circuitTabletop.state().players[0].st.turns,pos:__circuitTabletop.state().players[0].pos}));
     assert.equal(afterRoll.turns,1,'human action updates authentic game state');
     assert.notEqual(afterRoll.pos,'O0','physical pawn moves from its starting space');
     assert(await p.evaluate(()=>window.__firstPawn===document.querySelector('.pawn[data-player="0"]')),'moving pawn retains its DOM identity, enabling smooth travel');
     // A fresh page must resume the authoritative move (also persisted before the visual animation).
     const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('skylineCircuitTabletopRebootSave')));
     assert.equal(saved.state.players[0].st.turns,1,'turn is persisted to the preview save slot');
     assert.equal(saved.state.players[0].pos,afterRoll.pos,'saved position matches completed move');
     await p.reload({waitUntil:'load'});
     await p.waitForFunction(()=>window.__circuitTabletop && document.querySelectorAll('.pawn').length===4);
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players[0].pos),afterRoll.pos,'reload resumes the actual last move');
     assert.equal(errors.length,0,'no runtime exceptions during roll and reload');
   }
   assert.deepEqual(errors,[],'browser free of page errors '+vp.id);
   total+=17;
   await context.close();
 }
 console.log('PASS: '+engine+' Circuit physical tabletop interactive smoke tests; '+total+' checks on four viewports');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
