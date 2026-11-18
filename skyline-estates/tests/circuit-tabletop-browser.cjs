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
   assert.deepEqual(await p.locator('.pawnTag').allTextContents(),['Y','K','M','L'],'every playing token has a unique, recognizable player initial');
   const pieces=await p.locator('.pawn').evaluateAll(items=>items.map(el=>({
     name:el.getAttribute('aria-label'),color:el.style.getPropertyValue('--player'),
     badgeWidth:parseFloat(getComputedStyle(el.querySelector('.pawnTag')).width)
   })));
   assert.deepEqual(pieces.map(x=>x.name),['You playing token','Kofi playing token','Mei playing token','Lucas playing token'],'player pieces keep the correct name labels');
   assert.equal(new Set(pieces.map(x=>x.color)).size,4,'the four token colors remain distinct');
   assert(pieces.every(x=>x.badgeWidth>=23),'visible player initials have a legible colored badge');
   assert.equal(await p.locator('#moveCounter').isVisible(),false,'movement counter stays hidden until a real dice path is playing');
   assert.equal(await p.locator('#circuitLivingWorld .lifeTower').count(),9,'living waterfront skyline is rendered');
   assert.equal(await p.locator('#circuitLivingWorld').getAttribute('data-developed'),'0','city starts undeveloped, without fake ownership lighting');
   assert.equal(await p.locator('.lifeCar').count(),2,'miniature moving vehicles are in the board world');
   assert.equal(await p.locator('.lifeFountain').count(),1,'central fountain is present');
   assert.equal(await p.locator('#lifeMotionToggle').count(),1,'motion has an accessible pause control');
   await p.locator('#lifeMotionToggle').click();
   assert.equal(await p.locator('#lifeMotionToggle').getAttribute('aria-pressed'),'false','living animations can be paused');
   assert(await p.locator('#game').evaluate(el=>el.classList.contains('scenePaused')),'paused state also stops the world');
   await p.locator('#lifeMotionToggle').click();
   assert.equal(await p.locator('#lifeMotionToggle').getAttribute('aria-pressed'),'true','living world can resume');
   if(vp.id==='iphone'){
     await p.emulateMedia({reducedMotion:'reduce'});
     await p.waitForFunction(()=>document.querySelector('#game').classList.contains('scenePaused'));
     assert.equal(await p.locator('#lifeMotionToggle').getAttribute('aria-pressed'),'false','system reduced-motion preference pauses the scene');
     await p.emulateMedia({reducedMotion:'no-preference'});
     await p.waitForFunction(()=>!document.querySelector('#game').classList.contains('scenePaused'));
   }
   await p.evaluate(()=>SkylineCircuitLife.pulse('card','O3'));
   assert(await p.locator('[data-node="O3"]').evaluate(el=>el.classList.contains('lifeEvent')),'City Event applies a scene effect');
   assert.equal(await p.locator('.tile.property').count(),20,'all land property spaces present');
   assert.equal(await p.locator('.tile.event').count(),4,'four City Events present');
   assert.equal(await p.locator('.tile.special').count(),8,'eight Skyline junction squares present');
   const cameraAtStart=await p.locator('#boardStage').evaluate(el=>el.style.transform);
   assert(cameraAtStart.includes('rotateX(23deg)')&&cameraAtStart.includes('rotateZ(-1deg)'),'default camera is a nearly square, gently tilted physical tabletop');
   assert.equal(await p.locator('#tableViewport').evaluate(el=>getComputedStyle(el).perspective),'1900px','softened perspective removes exaggerated board bend');
   const rollLayout=await p.evaluate(()=>{
     const panel=document.querySelector('#actionCard'),button=panel.querySelector('[data-action="roll"]'),
       detail=document.querySelector('#selectedCard'),card=panel.getBoundingClientRect(),
       roll=button&&button.getBoundingClientRect(),detailBox=detail.getBoundingClientRect();
     return {compact:panel.classList.contains('rollMode'),
       fullyVisible:!!roll&&roll.top>=card.top-2&&roll.bottom<=card.bottom+2&&roll.bottom<innerHeight-4,
       noScroll:panel.scrollHeight<=panel.clientHeight+3,
       detailVisible:detailBox.top>=card.bottom-1&&detailBox.top<innerHeight-8,
       scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight};
   });
   assert(rollLayout.compact,'compact layout activates only for Ready to roll');
   assert(rollLayout.fullyVisible,'the complete Roll Dice button stays visible on landscape iPhone and desktop: '+JSON.stringify(rollLayout));
   assert(rollLayout.noScroll,'the Ready to roll panel does not hide its buttons behind a vertical scroll: '+JSON.stringify(rollLayout));
   assert(rollLayout.detailVisible,'the selected property detail panel remains visible beneath Ready to roll: '+JSON.stringify(rollLayout));
   const frame=await p.evaluate(()=>{const r=document.querySelector('#boardStage').getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,screenHeight:innerHeight}});
   assert(frame.top>=-24&&frame.bottom<=vp.h+24,'board corners stay visible in landscape, not cut off by huge default zoom: '+JSON.stringify(frame));
   const text=await p.locator('#tiles').textContent();
   assert(!/\b[OI]\d{1,2}\b/.test(text),'never print raw node identifiers in visible board');
   assert(text.includes('Marina Avenue')&&text.includes('SC 70'),'show street name and real price');
   assert.equal(await p.evaluate(()=>__circuitTabletop.state().ruleset),'circuit-v0','real game rules, not a visual mock');
   assert.equal(await p.locator('[data-action="roll"]').count(),1,'real human roll action');
   await p.locator('[data-node="O1"]').click({force:true});
   assert((await p.locator('#selectedCard').innerText()).includes('Marina Avenue'),'tap selects a named property');
   assert.equal(await p.locator('#detailBtn').count(),1,'near-flat inspection camera is available');
   const before=await p.locator('#boardStage').getAttribute('style');
   await p.locator('#detailBtn').click();
   assert.equal(await p.locator('#detailBtn').getAttribute('aria-pressed'),'true','Inspect mode announces its state');
   assert(await p.locator('#boardStage').evaluate(el=>el.classList.contains('detailInspect')),'Inspect switches to a close reading view');
   assert((await p.locator('#boardStage').getAttribute('style')).includes('rotateX(12deg)'),'close view uses gentler tilt for sharp property text');
   const labelPx=await p.locator('[data-node="O1"] .name').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert(labelPx>=11.5,'inspection street labels retain vector text at readable CSS size');
   if(out&&vp.id==='iphone'){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-retina-inspect.png'),fullPage:false})}
   await p.locator('#overviewBtn').click();
   assert.equal(await p.locator('#detailBtn').getAttribute('aria-pressed'),'false','full-board camera restores the standard viewing angle');
   await p.locator('#zoomIn').click();const after=await p.locator('#boardStage').getAttribute('style');
   assert.notEqual(after,before,'board zoom is functional');
   if(out&&vp.id==='iphone'){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-zoomed.png'),fullPage:false})}
   // Restore the actual launch zoom before taking the default review screenshot.
   await p.locator('#zoomOut').click();
   const restored=await p.locator('#boardStage').getAttribute('style');
   const scaleOf=s=>Number(s.match(/scale\(([^)]+)\)/)[1]);
   assert(Math.abs(scaleOf(restored)-scaleOf(before))<1e-6,'zooming back restores the approved full-board scale');
   if(out){
     fs.mkdirSync(out,{recursive:true});
     const imagePath=path.join(out,engine+'-'+vp.id+'-tabletop.png');
     await p.screenshot({path:imagePath,fullPage:false});
     const buffer=fs.readFileSync(imagePath);
     const dpr=vp.id==='desktop'?1:3;
     assert.equal(buffer.readUInt32BE(16),vp.w*dpr,'screenshot width contains native 3x browser device pixels');
     assert.equal(buffer.readUInt32BE(20),vp.h*dpr,'screenshot height contains native 3x browser device pixels');
   }
   if(out&&vp.id==='iphone'){
     const beforeCity=await p.evaluate(()=>{
       const state=__circuitTabletop.state(),save=JSON.stringify(state.own);
       for(const id of SkylineCircuit.PROPS){const node=SkylineCircuit.NODES.find(n=>n.id===id);
         state.own[id]={o:node.quadrant,h:4};}
       __circuitTabletop.select('O1');return save;
     });
     assert.equal(await p.locator('.model.level4').count(),20,'20 physical skyline pieces visible in populated preview');
     assert.equal(await p.locator('#circuitLivingWorld').getAttribute('data-developed'),'20','living skyline follows real developed game properties');
     assert.equal(await p.locator('#circuitLivingWorld .lifeTower.cityLit').count(),9,'all skyline quarters respond to true board development');
     const existingModel=await p.evaluate(()=>{
       window.__stableModel=document.querySelector('[data-node="O1"] .model');
       __circuitTabletop.select('O2');
       return window.__stableModel===document.querySelector('[data-node="O1"] .model');
     });
     assert(existingModel,'ordinary re-renders do not recreate owned 3D miniature buildings');
     await p.evaluate(()=>__circuitTabletop.select('O1'));
     await p.screenshot({path:path.join(out,engine+'-'+vp.id+'-all-buildings.png'),fullPage:false});
     await p.evaluate(snapshot=>{__circuitTabletop.state().own=JSON.parse(snapshot);__circuitTabletop.select('O1')},beforeCity);
     assert.equal(await p.locator('#circuitLivingWorld').getAttribute('data-developed'),'0','city reverts its lighting when match properties are cleared');
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
     const cameraBeforeDice=await p.locator('#boardStage').evaluate(el=>el.style.transform);
     const pawnTransition=await p.locator('.pawn').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration));
     assert(pawnTransition>=.3,'pawn moves at a legible pace rather than snapping between squares');
     await p.locator('[data-action="roll"]').click();
     await p.waitForFunction(()=>!document.querySelector('#moveCounter').hidden,null,{timeout:10000});
     const counter=await p.locator('#moveCounter').innerText();
     assert(counter.includes(' / ')&&counter.includes(' spaces'),'on-screen movement counter shows the step number');
     assert((await p.locator('#actionCard').innerText()).includes('On the move'),'dice controls cannot remain visible after pawn movement starts');
     assert.equal(await p.locator('#boardStage').evaluate(el=>el.style.transform),cameraBeforeDice,'rolling dice never moves or rescales the board');
     // Capture the actual moving token and numbered progress on an iPhone-sized screen.
     if(out)await p.screenshot({path:path.join(out,engine+'-iphone-readable-move.png'),fullPage:false});
     await p.waitForFunction(()=>document.querySelector('#moveCounter').hidden,null,{timeout:30000});
     assert.equal(await p.locator('#boardStage').evaluate(el=>el.style.transform),cameraBeforeDice,'the board remains stationary after pawn animation finishes');
     assert.equal(await p.locator('#boardCaption').isVisible(),true,'board title returns when the countdown finishes');
     const positionBeforeSafariResize=await p.locator('#boardStage').evaluate(el=>el.style.transform);
     // iOS Safari browser chrome can change the viewport height without a rotation.
     await p.setViewportSize({width:vp.w,height:vp.h-9});
     assert.equal(await p.locator('#boardStage').evaluate(el=>el.style.transform),positionBeforeSafariResize,'Safari toolbar height changes do not reset the board camera');
     await p.setViewportSize({width:vp.w,height:vp.h});
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
     // Match setup must keep the current game intact unless a new match is confirmed.
     await p.locator('#matchBtn').click();
     assert(await p.locator('#matchSetup').isVisible(),'match setup opens in landscape');
     assert.equal(await p.locator('#matchOpponents').inputValue(),'3','setup defaults to the existing four-person match');
     await p.locator('#matchCancel').click();
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players[0].pos),afterRoll.pos,'cancel keeps the match unchanged');
     await p.locator('#matchBtn').click();
     await p.locator('#matchLength').selectOption('extended');
     await p.locator('#matchOpponents').selectOption('1');
     await p.locator('#matchDifficulty').selectOption('easy');
     await p.locator('#matchStart').click();
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().cfg.length),'extended','new match supports Extended');
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players.length),2,'new match supports one CPU');
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players[1].level),'easy','new match saves selected difficulty');
     assert.equal(await p.locator('.pawn').count(),2,'removed CPU pieces do not remain on the physical board');
     // A newly configured match is saved before the first roll.
     await p.reload({waitUntil:'load'});
     await p.waitForFunction(()=>window.__circuitTabletop && document.querySelectorAll('.pawn').length===2);
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().cfg.length),'extended','initial match setup survives refresh before a move');
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players[1].level),'easy','CPU difficulty survives pre-roll refresh');
     await p.locator('#matchBtn').click();
     await p.locator('#matchLength').selectOption('quick');
     await p.locator('#matchOpponents').selectOption('3');
     await p.locator('#matchDifficulty').selectOption('hard');
     await p.locator('#matchStart').click();
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().cfg.length),'quick','Quick experimental match starts');
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players.length),4,'three computer rivals restore four pawns');
     assert.equal(await p.evaluate(()=>__circuitTabletop.state().players[3].level),'hard','difficulty propagates to every rival');
     assert.equal(await p.locator('.pawn').count(),4,'all physical player pieces are restored');
     await p.evaluate(()=>{
       const s=__circuitTabletop.state();
       s.phase='route';s.move={at:s.players[s.turn].pos,steps:3,noChoice:false};
       __circuitTabletop.select('O1');
     });
     assert.equal(await p.locator('[data-action="route:stay"]').count(),1,'after-roll route phase shows a real stay action');
     assert.equal(await p.locator('[data-action="route:cross"]').count(),1,'after-roll route phase shows a real connector action');
     await p.evaluate(()=>{
       const s=__circuitTabletop.state();
       s.phase='build';s.move=null;s.clock={pid:0,since:1};
       __circuitTabletop.select('O1');
     });
     assert.equal(await p.locator('.victoryClock').count(),1,'victory clock is visible before the match ends');
     await p.evaluate(()=>{
       const s=__circuitTabletop.state();
       s.over=true;s.phase='over';s.winner=0;s.endReason='round-limit';
       __circuitTabletop.select('O1');
     });
     assert.equal(await p.locator('.resultRow').count(),4,'the final scoreboard includes every player');
     assert.equal(await p.locator('[data-action="new"]').count(),1,'finished game offers a real replay flow');
     await p.locator('[data-action="new"]').click();
     assert(await p.locator('#matchSetup').isVisible(),'replay opens the new match configuration');
     await p.locator('#matchCancel').click();
     assert.equal(errors.length,0,'no runtime exceptions during roll, reload, setup, victory or route decision');
   }
   assert.deepEqual(errors,[],'browser free of page errors '+vp.id);
   total+=59;
   await context.close();
 }
 // Career parity: access stays behind the existing dual feature flags.
 // No successful access may silently convert a Career request into practice.
 {
   const ctx=await browser.newContext({viewport:{width:956,height:440},deviceScaleFactor:3,serviceWorkers:'block'});
   const p=await ctx.newPage();
   const errors=[];p.on('pageerror',e=>errors.push(String(e)));
   await p.goto(url+'?career=1&length=extended',{waitUntil:'load'});
   assert((await p.locator('#actionCard').innerText()).includes('Career unavailable'),'Career entry is rejected when existing flags are disabled');
   assert.equal(await p.evaluate(()=>Boolean(window.__circuitTabletop)),false,'blocked Career does not start a practice game');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCircuitSave')),null,'blocked Career does not touch existing Circuit saves');
   await ctx.close();
   total+=3;
 }
 {
   const ctx=await browser.newContext({viewport:{width:956,height:440},deviceScaleFactor:3,serviceWorkers:'block'});
   const p=await ctx.newPage();
   const errors=[];p.on('pageerror',e=>errors.push(String(e)));
   await p.addInitScript(()=>{
     localStorage.setItem('skylineFeature.career','on');
     localStorage.setItem('skylineFeature.circuitAlpha','on');
   });
   await p.goto(url+'?career=1&length=extended',{waitUntil:'load'});
   await p.waitForFunction(()=>window.__circuitTabletop && document.querySelectorAll('.pawn').length===4);
   const info=await p.evaluate(()=>{
     const s=__circuitTabletop.state();
     return {mode:__circuitTabletop.careerMode(),length:s.cfg.length,meta:s.meta,legacy:localStorage.getItem('skylineCircuitSave'),tabletop:localStorage.getItem('skylineCircuitTabletopRebootSave')};
   });
   assert.equal(info.mode,true,'qualifying Circuit requests open in Career mode');
   assert.equal(info.length,'extended','Career match receives the requested match length');
   assert.equal(info.meta.career,true,'Career match includes real career metadata');
   assert(/^circuit-/.test(info.meta.matchId)&&info.meta.startedAt>0,'Career receipts have a unique match id and starting time');
   assert(info.legacy&&JSON.parse(info.legacy).state.meta.matchId===info.meta.matchId,'Career shares the original Circuit alpha save slot');
   assert.equal(info.tabletop,null,'Career does not write to the isolated tabletop practice save');
   await p.reload({waitUntil:'load'});
   await p.waitForFunction(()=>window.__circuitTabletop && window.__circuitTabletop.careerMode());
   assert.equal(await p.evaluate(()=>__circuitTabletop.state().meta.matchId),info.meta.matchId,'an in-progress Career save resumes after Safari reload');
   // Force a valid rules-driven round limit at the next HUMAN End Turn. No debug
   // completion hook exists on the board; only SC.act may end a real match.
   await p.evaluate(()=>{
     const s=__circuitTabletop.state();
     s.order=[1,2,3,0];s.orderIdx=3;
     s.turn=0;s.phase='build';s.round=s.cfg.rounds;s.bought={};s.built={};s.clock=null;
     s.players[0].inf=20;
     s.players.slice(1).forEach((player,i)=>player.inf=10-i);
     __circuitTabletop.select('O1');
   });
   assert.equal(await p.locator('[data-action="end"]').count(),1,'Career match offers the authentic End Turn rules action');
   // Simulate a Safari storage quota failure on the receipt key, but not on the
   // ordinary Circuit save. Match completion MUST preserve the original save.
   await p.evaluate(()=>{
     const orig=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,val){
       if(String(key).startsWith('skylineCareerInbox:'))throw new DOMException('Storage full','QuotaExceededError');
       return orig.call(this,key,val);
     };
   });
   await p.locator('[data-action="end"]').click();
   await p.waitForFunction(()=>__circuitTabletop.state().over,{timeout:15000});
   assert.equal(await p.evaluate(id=>localStorage.getItem('skylineCareerInbox:'+id),info.meta.matchId),null,'failed receipt storage does not create false Career progress');
   assert(await p.evaluate(()=>Boolean(localStorage.getItem('skylineCircuitSave'))),'failed receipt storage preserves the completed Circuit save');
   // The fresh Safari document restores native storage and finishes the
   // pending receipt exactly once without replaying the match.
   await p.reload({waitUntil:'load'});
   await p.waitForFunction(id=>Boolean(localStorage.getItem('skylineCareerInbox:'+id)),info.meta.matchId,{timeout:15000});
   const receipt=await p.evaluate(id=>({
     fact:JSON.parse(localStorage.getItem('skylineCareerInbox:'+id)),
     save:localStorage.getItem('skylineCircuitSave'),
     practice:localStorage.getItem('skylineCircuitTabletopRebootSave')
   }),info.meta.matchId);
   assert.equal(receipt.fact.matchId,info.meta.matchId,'Career completion uses the original match id');
   assert.equal(receipt.fact.board,'circuit','Career receipt is for the Circuit board');
   assert.equal(receipt.fact.length,'extended','Career receipt reports the actual match length');
   assert.equal(receipt.fact.ownerHuman,true,'Career receipt identifies the real human seat');
   assert.equal(receipt.fact.over,true,'Career receipt is only written for completed matches');
   assert.equal(receipt.save,null,'completed Career matches clear only their Circuit save');
   assert.equal(receipt.practice,null,'Career receipts do not write to the practice slot');
   assert.equal(errors.length,0,'Career mode completes with no page errors');
   await ctx.close();total+=17;
 }
 console.log('PASS: '+engine+' Circuit physical tabletop interactive smoke tests; '+total+' checks on four viewports');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
