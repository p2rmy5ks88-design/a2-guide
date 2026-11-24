// Skyline Career in the real game (Chromium, or WebKit with VISUAL_ENGINE=webkit):
// Career is on for everyone by default (owner decision 19 Nov 2026) with a main-screen Career button; ?career=off still gives
// no UI and no profile writes; flag on = Career entry, Origins career matches are today's game,
// qualifying wins unlock Circuit, nothing else in the profile changes, saves and reloads keep working.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium';
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;
const PREFS={nick:'Career QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:500,xp:2000};
(async()=>{
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl']}:{})});
 async function session(query,extra){const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+': '+String(e)));await context.route('https://**/*',r=>r.abort());
  await p.addInitScript(v=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',v)},JSON.stringify(Object.assign({},PREFS,extra||{})));
  await p.goto(base+(query||''));await p.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));await p.waitForTimeout(400);return{context,p}}
 // One finished Origins career match, identical for every call with the same id/won/level.
 const fixture=(p,id,won,ai='normal')=>p.evaluate(([id,won,ai])=>{const ledger=SkylineSCWallet.create(localStorage,()=>Date.now()-180000);
  GEN++;FAST=true;applyCity('lagos');newGame({cash:1600,set:{city:'lagos',mode:'timed',rounds:30,championship:1,ai,career:'origins',careerLength:'standard'},
   players:[0,1,2,3].map(i=>({name:'QA '+i,tok:TOKENS[i],col:PCOL[i],ai:i>0,owner:i===0}))});FAST=false;
  G.masteryId=id;G.round=12;G.over=true;G.players[0].st={houses:3,buys:4,go:1};ledger.start(id,{city:'lagos'});
  const w=won?G.players[0]:G.players[1];G.progDone=false;progressGameEnd(w);const r=SkylineCareer.last();G=null;return r},[id,won,ai]);
 const snapshot=p=>p.evaluate(()=>{const P=JSON.parse(localStorage.getItem(PKEY));return JSON.stringify({cach:P.cach,champ:P.champ,spot:P.spot,challengeClaims:P.challengeClaims,coins:P.coins,xp:P.xp,trophies:P.trophies,stats:P.stats,tokLv:P.tokLv,inv:P.inv}).replace(/1[0-9]{12}/g,'T')});// timestamps masked

 // ---- Default: on for everyone, with its own main-screen button ----
 let {context,p}=await session('');
 assert.equal(await p.evaluate(()=>SkylineCareer.enabled),true);
 await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(200);assert.equal(await p.locator('#hdCareer').count(),1);
 const cb=await p.locator('#hdCareer').boundingBox();assert.ok(cb&&cb.height>=44);ok('career is on by default with a Career button on the main screen');
 await context.close();
 // ---- Flag off (?career=off) ----
 ({context,p}=await session('?career=off'));
 assert.equal(await p.evaluate(()=>SkylineCareer.enabled),false);
 await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(200);assert.equal(await p.locator('#crOpen').count(),0);assert.equal(await p.locator('#hdCareer').count(),0);ok('?career=off adds no menu entry or button');
 // What Game Modes holds, and what tapping Pass & Play does, with the flag off (compared with the flag on below).
 const modes=async()=>p.evaluate(()=>[...document.querySelectorAll('.hd-gm-list>button')].map(b=>b.id));
 const passPlay=async()=>{await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(150);await p.evaluate(()=>document.querySelector('#qPP').click());await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({tab:setup.tab,modal:document.querySelector('#modals .mh')?.textContent||'',game:!!(G&&!G.over)}));await p.evaluate(()=>{document.querySelector('#modals').innerHTML='';if(G&&!G.over){G.over=true}homeTab('play')});return r};
 const offModes=await modes(),offPass=await passPlay();
 const offRes=await fixture(p,'match-off-1',true);const offPref=await snapshot(p);
 assert.equal(offRes,null);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(PKEY)).career),undefined);
 assert.equal((await p.evaluate(()=>SkylineCareer.completeTutorial('origins'))).reason,'career-disabled');ok('with the flag off, finished matches and helper calls write nothing');
 await context.close();

 // ---- Flag on ----
 ({context,p}=await session('?career=on'));
 assert.equal(await p.evaluate(()=>SkylineCareer.enabled),true);
 await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(200);
 assert.equal(await p.locator('#crOpen').count(),0);assert.equal(await p.locator('#hdCareer').count(),1);ok('flag on: Career has its own main-screen button and is not repeated in Game Modes');
 const onModes=await modes();assert.deepEqual(onModes,offModes);assert.deepEqual(await passPlay(),offPass);
 ok('every existing Game Modes entry is still there, in the same order, and Pass & Play behaves the same');
 const view=await p.evaluate(()=>SkylineCareer.state().map(b=>[b.id,b.status]));
 assert.deepEqual(view,[['origins','playable'],['circuit','locked'],['crossroads','locked-hidden'],['dominion','locked-hidden'],['empire','locked-hidden']]);ok('new player: Origins playable, Circuit locked with requirements, later boards hidden');
 // Origins = today's game: the set matches a Quick Play start except the two career tags.
 await p.evaluate(()=>{document.querySelector('#hdCareer').click()});await p.waitForSelector('.career-cards');
 assert.equal(await p.locator('.career-cards .crc').count(),5);
 await p.locator('.career-cards .crc-btn[data-board="origins"]').click();await p.locator('.career-lengths .crl[data-len="standard"]').click();await p.waitForFunction(()=>G&&G.set&&G.set.career==='origins');
 const career=await p.evaluate(()=>{const s={...G.set};delete s.career;delete s.careerLength;return {set:s,ai:G.players.map(q=>q.ai),cash:G.players.map(q=>q.cash).sort((x,y)=>x-y)}});
 // Let the opening Skyline Keys reveal finish (it reads the live match when it closes) before ending the match.
 for(let i=0;i<40;i++){const open=await p.evaluate(()=>{const m=[...document.querySelectorAll('#modals .mp')].find(x=>/Skyline Keys/.test(x.textContent));if(m){const b=m.querySelector('.btn.pri');if(b)b.click()}return !!m||!G.keysShown});if(!open)break;await p.waitForTimeout(250)}await p.waitForTimeout(400);
 await p.evaluate(()=>{G.over=true;showTitle()});await p.waitForTimeout(200);
 await p.evaluate(()=>{const me=setup.slots[0];startFromSetup(document.body,setup.slots.map((s,i)=>({...s,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:s.tok})),{mode:'timed',rounds:30,championship:1})});
 const quick=await p.evaluate(()=>({set:{...G.set},ai:G.players.map(q=>q.ai),cash:G.players.map(q=>q.cash).sort((x,y)=>x-y)}));// Skyline Keys gives a random seat the late-start bonus, so cash is compared as a set
 assert.deepEqual(career,quick);assert.equal(career.set.rounds,30);assert.equal(career.set.mode,'timed');ok('an Origins career match uses exactly the Quick Play rules (30-round Championship, same players)');
 await p.evaluate(()=>{G.over=true;showTitle()});
 // Save compatibility: a career match saves and loads through the existing save path.
 const saved=await p.evaluate(()=>{SkylineCareer.startOrigins('quick');const okSave=save();const g=loadSave();const r={okSave,career:g&&g.set.career,rounds:g&&g.set.rounds,valid:!!g&&validateSave(g)};G.over=true;clearSave();showTitle();return r});
 assert.deepEqual(saved,{okSave:true,career:'origins',rounds:20,valid:true});ok('a career match saves and resumes through the existing save slot (set.career kept)');
 // Qualification and unlocks.
 const r1=await fixture(p,'match-on-1',true);const onPref=await snapshot(p);
 assert.ok(r1.ok&&r1.qualifiedWin);assert.equal(onPref,offPref);ok('a qualifying win is recorded and nothing else in the profile differs from the same match with the flag off');
 assert.equal((await fixture(p,'match-on-1',true)).reason,'duplicate');
 // A stale tab (its in-memory profile from before the match was counted) finishing the same match must not count it again.
 const stale=await p.evaluate(()=>{const now=PREF.career;PREF.career={v:1,unlocked:{origins:0},boards:{},tutorials:{},challenges:{},receipts:[],floor:0};return !!now});
 assert.ok(stale);assert.equal((await fixture(p,'match-on-1',true)).reason,'duplicate');
 assert.equal(await p.evaluate(()=>SkylineCareerCore.normalize(JSON.parse(localStorage.getItem(PKEY)).career).boards.origins.qualifiedWins),1);ok('a stale tab cannot count the same match twice (the saved profile is re-read first)');
 const easy=await fixture(p,'match-on-easy',true,'easy');assert.ok(easy.ok&&!easy.qualifiedWin);
 const loss=await fixture(p,'match-on-loss',false);assert.ok(loss.ok&&!loss.won);ok('duplicates rejected; Easy-only wins and losses earn mastery but not unlocks');
 const r2=await fixture(p,'match-on-2',true);assert.deepEqual(r2.unlocked,['circuit']);
 assert.equal(await p.evaluate(()=>SkylineCareer.state()[1].status),'playable');ok('two qualifying wins (tutorial already done) unlock Circuit, playable now');
 const short=await p.evaluate(()=>{GEN++;FAST=true;newGame({cash:1600,set:{city:'lagos',mode:'timed',rounds:30,career:'origins'},players:[0,1].map(i=>({name:'S'+i,tok:TOKENS[i],col:PCOL[i],ai:i>0,owner:i===0}))});FAST=false;G.masteryId='too-short';G.round=12;G.over=true;G.players[0].st={buys:5};SkylineSCWallet.create(localStorage).start('too-short',{});G.progDone=false;progressGameEnd(G.players[0]);const r=SkylineCareer.last();G=null;return r});
 assert.equal(short.reason,'too-short');ok('a match finished under two minutes does not count');
 await p.reload();await p.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));
 const after=await p.evaluate(()=>SkylineCareer.state().map(b=>[b.id,b.status,b.mastery.qualifiedWins,b.mastery.matches]));
 assert.deepEqual(after[0],['origins','playable',2,4]);assert.equal(after[1][1],'playable');ok('career progress survives a reload');
 await p.goto(base+'?career=off');await p.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));
 assert.equal(await p.evaluate(()=>SkylineCareer.enabled),false);assert.ok(await p.evaluate(()=>!!JSON.parse(localStorage.getItem(PKEY)).career));ok('?career=off turns the flag off and keeps stored progress');
 await context.close();
 // A career record from a newer app version is never overwritten by this build.
 ({context,p}=await session('?career=on',{career:{v:2,unlocked:{origins:0,circuit:1},future:{keep:true}}}));
 const newer=await fixture(p,'match-newer',true);assert.equal(newer.reason,'newer-version');
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem(PKEY)).career),{v:2,unlocked:{origins:0,circuit:1},future:{keep:true}});
 ok('a newer-version career record is left exactly as it was');
 await context.close();
 assert.deepEqual(errors,[]);ok('no browser errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close();console.log(`CAREER BROWSER ${engine} ${n} checks`)});
