// First-turn tips on the Career boards: shown one at a time, "Got it" moves on, "Skip tips" turns them off
// for that board, and tips never cover the results screen.
'use strict';
const path=require('path'),http=require('http'),fs=require('fs'),assert=require('node:assert/strict');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const engine=process.env.VISUAL_ENGINE||process.env.ENGINE||'chromium';
const root=path.resolve(__dirname,'../..');let origin,n=0;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff2':'font/woff2'};const ok=m=>{n++;console.log('PASS',m)};
(async()=>{const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}/`;
 const browser=await (engine==='webkit'?webkit:chromium).launch({executablePath:engine==='chromium'?process.env.CHROME_PATH||undefined:undefined,args:engine==='chromium'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]});
 try{const ctx=await browser.newContext({viewport:{width:956,height:440}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(origin+'skyline-estates/approved-career-board.html?board=dominion&autostart=1&seed=7&quality=low&speed=instant');
  await p.waitForFunction(()=>window.__skylineApproved,null,{timeout:120000});
  const tip=()=>p.evaluate(()=>document.querySelector('#boardGuide b')?.textContent||null);
  await p.waitForSelector('#boardGuide',{timeout:10000});assert.equal(await tip(),'Your goal');ok('first tip explains the goal');
  await p.click('#boardGuide .ok');await p.waitForFunction(()=>document.querySelector('#boardGuide b')?.textContent==='Roll the dice',null,{timeout:5000});ok('Got it moves to the next tip: Roll the dice');
  await p.evaluate(()=>__skylineApproved.roll());await p.waitForTimeout(1600);
  assert.notEqual(await tip(),'Roll the dice');ok('the roll tip closes by itself once the dice are rolled');
  await p.click('#boardGuide .skip').catch(()=>{});await p.waitForTimeout(300);
  assert.equal(await p.evaluate(()=>localStorage.getItem('skylineBoardGuide:dominion')),'"off"');assert.equal(await tip(),null);ok('Skip tips turns tips off for this board');
  await p.reload();await p.waitForFunction(()=>window.__skylineApproved,null,{timeout:120000});await p.waitForTimeout(2000);assert.equal(await tip(),null);ok('tips stay off after reload');
  await p.evaluate(()=>localStorage.removeItem('skylineBoardGuide:dominion'));await p.reload();await p.waitForFunction(()=>window.__skylineApproved,null,{timeout:120000});await p.waitForSelector('#boardGuide');
  p.on('dialog',d=>d.accept());await p.click('#menuBtn');await p.click('#endMatch');await p.waitForSelector('#finish:not([hidden])');await p.waitForTimeout(1000);
  assert.equal(await tip(),null);ok('no tip covers the results screen');
  assert.ok(await p.locator('#finish .sumGrid').isVisible()&&await p.locator('#finish #returnCareer').isVisible());ok('results show the match summary and the way home');
  assert.deepEqual(errs,[]);console.log('BOARD GUIDE '+n+' checks');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
