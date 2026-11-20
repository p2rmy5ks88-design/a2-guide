// Career boards 2–4 end to end (owner decision 19 Nov 2026: Career on for everyone, own main-screen button, unlock order kept).
// Main screen → Career button → board buttons follow unlocks → Dominion/Empire pages take Career matches → the finished match
// reaches Career through the inbox and is recorded once. Env: VISUAL_ENGINE=chromium|webkit, PLAYWRIGHT_MODULE.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=path.resolve(__dirname,'../test-results/career-boards');fs.mkdirSync(out,{recursive:true});
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];
const PREFS={nick:'Career QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:500,xp:2000};
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
(async()=>{const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();
 fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 try{
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,serviceWorkers:'block'});await context.route('https://**/*',r=>r.abort());
  // Career already at Dominion: Origins and Circuit unlocked and Dominion unlocked by the guide (2 Circuit wins + 3 district challenges).
  const career={v:1,unlocked:{origins:0,circuit:1,crossroads:1,dominion:2},boards:{},tutorials:{origins:1},challenges:{circuit:{'circuit-district-0':{tag:'district',at:1},'circuit-district-1':{tag:'district',at:1},'circuit-district-2':{tag:'district',at:1}}},receipts:[],floor:0};
  await context.addInitScript(v=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',v)},JSON.stringify({...PREFS,career}));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('dialog',d=>d.accept());
  await p.goto(base+'index.html');await p.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(400);
  assert.equal(await p.locator('#hdCareer').count(),1);await p.screenshot({path:path.join(out,engine+'-home.png')});ok('main screen shows the Career button');
  const st=await p.evaluate(()=>SkylineCareer.state().map(b=>[b.id,b.status]));
  assert.deepEqual(st,[['origins','playable'],['circuit','playable'],['crossroads','playable'],['dominion','playable'],['empire','locked']]);ok('unlock order kept: Dominion playable after its requirements, Empire still locked');
  await p.click('#hdCareer');await p.waitForTimeout(400);const labels=await p.evaluate(()=>[...document.querySelectorAll('#modals .crc-btn:not([disabled])')].map(b=>b.dataset.board));
  assert.deepEqual(labels,['origins','circuit','crossroads','dominion'],JSON.stringify(labels));assert.equal(await p.locator('#modals .crc').count(),5);
  const tiny=await p.evaluate(()=>[...document.querySelectorAll('#modals .crc-btn')].filter(b=>b.getBoundingClientRect().height<43.5).length);assert.equal(tiny,0,'Play buttons are at least 44pt');
  await p.screenshot({path:path.join(out,engine+'-career.png')});ok('Career shows four board cards: Origins, Circuit and Dominion playable, Empire locked');
  await p.locator('#modals .crc-btn[data-board="dominion"]').click();await p.locator('#modals .crl[data-len="quick"]').waitFor();await p.screenshot({path:path.join(out,engine+'-career-length.png')});await p.locator('#modals .crl[data-len="quick"]').click();await p.waitForURL(/dominion-production-lab\.html\?career=1&length=quick/);ok('Dominion button opens the Dominion board as a Career match');
  await p.goto(base+'dominion-production-lab.html?career=1&length=quick&speed=instant&quality=low&seed=77');
  assert.equal(await p.evaluate(()=>document.querySelector('[name=len]:checked').value),'quick');assert.equal(await p.locator('#careernote').count(),1);
  await p.click('#start');await p.waitForFunction(()=>document.getElementById('loading').hidden||document.getElementById('loading').dataset.error,null,{timeout:300000});
  let guard=0;while(await p.evaluate(()=>__dominionLab.state().phase!=='over')){assert.ok(guard++<60,'match too long');
   await p.waitForFunction(()=>{const s=__dominionLab.state();return s.phase==='over'||(SkylineDominion.pending(s).player===0&&SkylineDominion.pending(s).kind==='act'&&!__dominionLab.busy())},null,{timeout:300000});
   if(await p.evaluate(()=>__dominionLab.state().phase==='over'))break;await p.click('#end')}
  const key=await p.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('skylineCareerInbox:')));assert.ok(key&&key.includes('dominion-'));
  const f=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(f.board,'dominion');assert.equal(f.ruleset,'dominion-p1');assert.equal(f.length,'quick');assert.equal(f.over,true);
  assert.equal(await p.evaluate(()=>localStorage.getItem(SkylineDominion.SAVE_KEY)),null);ok('a finished Career match is reported once to the Career inbox and its board save is cleared');
  // Real play takes minutes; age the start time so the 2-minute qualification rule applies as in a real match.
  await p.evaluate(k=>{const x=JSON.parse(localStorage.getItem(k));x.startedAt=x.endedAt-180000;x.rounds=Math.max(x.rounds,5);x.activity=Math.max(x.activity,3);localStorage.setItem(k,JSON.stringify(x))},key);
  await p.goto(base+'index.html');await p.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));
  const after=await p.evaluate(()=>({inbox:Object.keys(localStorage).filter(k=>k.startsWith('skylineCareerInbox:')).length,d:SkylineCareer.state().find(b=>b.id==='dominion').mastery,last:SkylineCareer.inbox()}));
  assert.equal(after.inbox,0);assert.equal(after.d.matches,1,JSON.stringify(after.last));ok('back on the main screen the Dominion match is recorded once in Career');
  await p.goto(base+'empire-production-lab.html?career=1&length=standard');assert.equal(await p.locator('#careernote').count(),1);ok('Empire page also accepts Career matches');
  // Career Board 1: Origins plays the real Classic game on the approved Origins 3D board, in this page (no reload),
  // and the classic board comes back for Play Solo afterwards.
  await p.goto(base+'index.html');await p.waitForSelector('#hdCareer');await p.evaluate(()=>{PREF.ai='easy';setup.ai='easy'});await p.locator('#hdCareer').click();
  await p.locator('#modals .crc-btn[data-board="origins"]').click();await p.locator('#modals .crl[data-len="quick"]').click();
  await p.waitForFunction(()=>typeof G!=='undefined'&&G&&G.set&&G.set.career==='origins');
  await p.waitForFunction(()=>window.SkylineOriginsProduction&&SkylineOriginsProduction.active(),null,{timeout:60000});
  const og=await p.evaluate(()=>({url:location.pathname+location.search,len:G.set.careerLength,rounds:G.set.rounds,ai:G.set.ai,board:document.documentElement.classList.contains('origins-production'),canvas:!!document.querySelector('#originsProductionCanvas'),acts:document.querySelector('#acts').parentElement.id,label:(document.querySelector('#orgCareer')||{}).textContent||''}));
  assert.deepEqual([og.url.endsWith('/index.html'),og.len,og.rounds,og.ai,og.board,og.canvas,og.acts],[true,'quick',20,'normal',true,true,'orgActs'],JSON.stringify(og));assert.ok(!/preview/i.test(og.label),og.label);
  await p.waitForTimeout(3000);await p.screenshot({path:path.join(out,engine+'-origins-career.png')});ok('Origins opens a Career match (Quick 20, Normal AI) on the approved Origins 3D board in the same page');
  await p.evaluate(()=>{G.over=true;clearSave();showTitle()});
  await p.waitForFunction(()=>!SkylineOriginsProduction.active());
  const back=await p.evaluate(()=>({url:location.pathname,board:document.documentElement.classList.contains('origins-production'),hud:document.querySelector('#originsProductionHud').hidden,acts:document.querySelector('#acts').parentElement.id,career:!!document.querySelector('#hdCareer')}));
  assert.deepEqual(back,{url:back.url,board:false,hud:true,acts:back.acts,career:true});assert.ok(back.url.endsWith('/index.html'));assert.notEqual(back.acts,"orgActs");ok('leaving the match returns to the main screen without reloading and restores the classic layout');
  await p.evaluate(()=>{const me=setup.slots[0];startFromSetup(document.body,setup.slots.map((x,i)=>({...x,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:x.tok})),{mode:'timed',rounds:20})});
  await p.waitForFunction(()=>G&&!G.set.career);await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(()=>SkylineOriginsProduction.active()||document.documentElement.classList.contains('origins-production')),false);ok('Play Solo keeps the classic board');
  await p.evaluate(()=>{G.over=true;clearSave();showTitle()});
  await p.goto(base+'origins-career.html?length=extended');await p.waitForFunction(()=>typeof G!=='undefined'&&G&&G.set&&G.set.career==='origins'&&G.set.careerLength==='extended',null,{timeout:60000});
  assert.ok((await p.evaluate(()=>location.pathname+location.search)).endsWith('/index.html'));ok('the old Origins Career address still starts a match, then clears itself from the address');
  await p.evaluate(()=>{G.over=true;showTitle()});
  await context.close();
  assert.equal(errors.length,0,errors.join('\n'));ok('no browser errors');
 }finally{await browser.close();server.close()}
 console.log(`CAREER BOARDS ${engine} ${n} checks`)})().catch(e=>{console.error(e);process.exit(1)});
