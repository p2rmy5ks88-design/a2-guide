/* Skyline Circuit — Board 2 true-3D interaction / save isolation smoke test.
   Chromium and WebKit, including 3× iPhone device pixels, using actual game rules. */
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.BOARD2_SHOTS||null,engine=process.env.VISUAL_ENGINE==='webkit'?'webkit':'chromium';
(async()=>{
 const server=http.createServer((q,res)=>{
  const url=new URL(q.url,'http://localhost'),p=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(p,(err,buf)=>{
   res.writeHead(err?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
   res.end(err?'Not found':buf);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 let checks=0;try{
  for(const vp of [{name:'iphone',width:956,height:440,dpr:3},{name:'small',width:844,height:390,dpr:3},{name:'desktop',width:1366,height:768,dpr:1}]){
   const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,hasTouch:vp.dpr>1,serviceWorkers:'block',reducedMotion:'reduce'});
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
   // Test the iPhone at a genuine 2.5× WebGL backing resolution; software
   // Chromium cannot reliably emulate the 2048px-shadow High tier on a 3×
   // canvas. The High 3× renderer remains available on supported real phones.
   const tier=vp.name==='iphone'?'medium':'low';
   await p.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/circuit-board2-lab.html?quality='+tier+'&seed=271828',{waitUntil:'load'});
   await p.locator('#cx-start').click();
   await p.waitForFunction(()=>window.__circuitUI&&window.__circuitUI.r3(),null,{timeout:18000});
   const start=await p.evaluate(()=>({saveKey:__circuitBoard2.saveKey,view:__circuitUI.view(),cam:__circuitUI.r3().camera,orbit:__circuitBoard2.orbit(),r:__circuitUI.r3().stats()}));
   assert.equal(start.saveKey,'skylineCircuitBoard2PracticeSave');
   assert.equal(start.view.nodes.length,32,'dual-ring keeps 32 rules nodes');
   assert.deepEqual(start.view.players.map(x=>x.name),['You','Kofi','Mei','Lucas'],'names match the Y/K/M/L pieces in the premium 3D city');
   assert.equal(start.orbit,0,'decision camera cannot start pre-orbited');
   assert.equal(start.cam.pitch,0,'decision camera stays top-down for fair moves');
   assert(start.r.calls>0,'real WebGL renderer submitted draw calls');
   if(vp.name==='iphone')assert(start.r.pixelRatio>=2.4,'main iPhone uses a true 2.5x WebGL canvas rather than a blurry 1.5x upscale');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCircuitSave')),null,'Board 1/Career slot is never overwritten');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCircuitTabletopRebootSave')),null,'Board 1 practice slot is untouched');
   checks+=9;
   await p.locator('#cx-city-view').click({noWaitAfter:true});
   await p.waitForFunction(()=>window.__circuitBoard2.city()&&window.__circuitUI.r3().camera.pitch>35,null,{timeout:9000});
   await p.waitForFunction(()=>window.__circuitUI.r3().envelopeReport().length===20,null,{timeout:18000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.showcase()),true,'City View opens in owner-approved 20-building concept display');
   assert.equal(await p.locator('[data-plan]').count(),0,'Strategy route buttons are disabled during city inspection');
   assert.equal(await p.locator('#b2-left').count(),1,'City View has explicit orbit controls');
   assert.equal(await p.locator('#b2-zoom-in').count(),1,'City View has explicit zoom controls');
   const before=await p.evaluate(()=>JSON.stringify(__circuitUI.state()));
   await p.locator('#b2-right').click();
   assert.equal(await p.evaluate(()=>__circuitBoard2.orbit()),14,'Orbit button actually changes the WebGL camera yaw');
   await p.locator('#b2-zoom-in').click();
   assert((await p.evaluate(()=>__circuitBoard2.zoom()))<5.65,'Zoom button changes City View distance');
   await p.evaluate(()=>__circuitBoard2.inspect('O1'));
   assert.equal(await p.evaluate(()=>__circuitBoard2.selected()),'O1','3D building inspection selects the intended street');
   assert((await p.locator('.b2-spotlight').innerText()).includes('Marina Avenue'),'building detail displays real street names, not raw tile IDs');
   assert.equal(await p.locator('#b2-preview-stage').count(),1,'selected property exposes a non-purchase building-stage preview');
   await p.locator('#b2-preview-stage').selectOption('4');
   await p.waitForFunction(()=>window.__circuitUI.r3().envelopeReport().some(x=>x.id==='O1'&&x.stage===4),null,{timeout:10000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.preview()),4,'City View can showcase a true 3D Skyscraper model');
   assert.equal(await p.evaluate(()=>JSON.stringify(__circuitUI.state())),before,'previewed Skyscraper cannot affect gameplay or currency');
   // An obvious one-tap control must switch to the TRUE match architecture,
   // then back to the concept world, without any purchase or save mutation.
   await p.locator('#b2-skyline').click();
   await p.waitForFunction(()=>window.__circuitUI.r3().envelopeReport().length===1,null,{timeout:10000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.showcase()),false,'City View can show only actual match buildings plus selected inspection');
   await p.locator('#b2-skyline').click();
   await p.waitForFunction(()=>window.__circuitUI.r3().envelopeReport().length===20,null,{timeout:10000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.showcase()),true,'Concept skyline can be restored with a single tap');
   assert.equal(await p.evaluate(()=>JSON.stringify(__circuitUI.state())),before,'full-city showcase never buys any buildings');
   const panelBounds=await p.evaluate(()=>{
     const card=document.querySelector('#cx-actions').getBoundingClientRect(),back=document.querySelector('#cx-city-view').getBoundingClientRect();
     return{inside:back.top>=card.top&&back.bottom<=card.bottom+2&&back.bottom<innerHeight};
   });
   assert(panelBounds.inside,'Return to Strategy stays visible even with all 3D inspector controls open');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCircuitSave')),null,'preview never touches Career saved game');
   // Touch-drag orbit is a real camera response; the visible arrows are not just decorative.
   const canvas=await p.locator('#cx-board').boundingBox();
   const x=canvas.x+canvas.width*.5,y=canvas.y+canvas.height*.6;
   await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+74,y,{steps:5});await p.mouse.up();
   assert((await p.evaluate(()=>__circuitBoard2.orbit()))>14,'horizontal drag orbits the 3D city, bounded by the same camera control');
   assert.equal(await p.evaluate(()=>JSON.stringify(__circuitUI.state())),before,'drag orbit cannot change game data');
   if(out){
    fs.mkdirSync(out,{recursive:true});
    const f=path.join(out,engine+'-'+vp.name+'-city.png');await p.screenshot({path:f});
    const buf=fs.readFileSync(f);assert.equal(buf.readUInt32BE(16),vp.width*vp.dpr);assert.equal(buf.readUInt32BE(20),vp.height*vp.dpr);
   }
   checks+=22;
   await p.locator('#cx-city-view').click({noWaitAfter:true});
   await p.waitForFunction(()=>!window.__circuitBoard2.city()&&window.__circuitUI.r3().camera.pitch===0,null,{timeout:9000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.orbit()),0,'returning to Strategy resets yaw');
   await p.waitForFunction(()=>window.__circuitUI.r3().envelopeReport().length===0,null,{timeout:10000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.preview()),-1,'leaving City View resets every visual-only stage preview');
   assert.equal(await p.evaluate(()=>__circuitBoard2.showcase()),false,'returning to Strategy turns off skyline showcase');
   assert.equal(await p.locator('#cx-roll').count(),1,'real dice action is restored');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCareerInbox:circuit-board2-lab')),null,'preview never writes Career results');
   await p.locator('#cx-roll').click();
   await p.waitForFunction(()=>window.__circuitUI.state().players[0].st.turns===1,null,{timeout:10000});
   assert.equal(await p.evaluate(()=>__circuitBoard2.orbit()),0,'dice movement cannot start an orbit');
   assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCircuitSave')),null,'Career save remains untouched after a roll');
   assert.equal(errors.length,0,'no JavaScript errors during true WebGL interaction');
   checks+=7;
   await ctx.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
 console.log('PASS: '+engine+' · '+checks+' Board 2 WebGL controls, isolated saves and iPhone Retina assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
