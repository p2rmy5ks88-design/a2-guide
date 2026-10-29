// City Spotlight acceptance in a real browser: strategic events 2.0 rules and boundaries,
// rooftops are appearance-only, Spotlight contract/claim idempotency, seeded simulations and
// phone/desktop layouts. Optional: SKYLINE_BASELINE_URL=<url of an older index.html> compares
// events-off seeded games against that build for exact parity.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.argv[2]||null,shots=process.env.SKYLINE_SHOTS||'',RUNS=+(process.env.SKYLINE_SPOT_RUNS||100),SEED=20261030;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json'};
const report={checks:[],sims:null,parity:null,errors:[]};let browser,server;
const check=(name,ok,detail)=>{assert.ok(ok,name+(detail?' '+JSON.stringify(detail):''));report.checks.push(name);console.log('PASS',name)};
(async()=>{
 server=http.createServer((q,r)=>{const p=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
 browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 async function open(u=url,viewport={width:956,height:440},prefs={}){const ctx=await browser.newContext({viewport,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
  await page.addInitScript(p=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify(p))},{nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:9000,xp:3000,...prefs});
  await page.route('https://**/*',r=>r.abort());await page.goto(u);await page.waitForFunction(()=>typeof window.__sim==='function'&&typeof homeTab==='function');await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:12000});return{ctx,page}}
 const {ctx,page}=await open();
 // ---------- 1. strategic event rules (direct, deterministic) ----------
 const rules=await page.evaluate(()=>{FAST=true;const out={};const mk=(set={})=>{GEN++;newGame({cash:1600,set:{ai:'normal',speed:'fast',city:'lagos',events2:true,...set},players:[0,1,2].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true}))});G.sim=true;G.phase='post'};
  mk();out.snapshot={events2:G.set.events2,classic:G.set.events,next:G.ev2Next};
  // dev event in pink, turn-scoped for player 1, during round 3
  const pink=GROUPS.pink;pink.forEach(i=>G.own[i]={o:1,h:0,m:false});G.round=3;G.turn=0;G.first=0;
  G.ev2={v:1,id:'infra',city:'lagos',kind:'dev',pct:50,from:3,targets:pink.slice(),group:'pink',name:'Infrastructure Upgrade',area:'Pink',turnPid:1};
  const h=SQ[pink[0]].h;out.h=h;out.upcoming=ev2State(G.ev2);out.discBefore=ev2Disc(1,pink[0]);
  G.turn=1;out.active=ev2State(G.ev2);P(1).cash=h-1;out.canFullFail=(()=>{const e=G.ev2;G.ev2=null;const r=canBuild(1,pink[0]);G.ev2=e;return r})();out.canDiscounted=canBuild(1,pink[0]);
  out.otherPlayerDisc=ev2Disc(2,pink[0]);out.devCost=devCost(1,pink[0]);const c0=P(1).cash,hb=G.houses;build(1,pink[0]);out.debit=c0-P(1).cash;out.houseTaken=hb-G.houses;
  // even building still enforced: second house on the same street refused while others are at 0
  P(1).cash=5000;out.unevenRefused=!canBuild(1,pink[0]);
  // selling refunds half of the full price (no profit from the discount)
  const c1=P(1).cash;sell(1,pink[0]);out.sellRefund=P(1).cash-c1;
  // mortgaged street in the set blocks building as usual
  G.own[pink[2]].m=true;out.mortBlocks=!canBuild(1,pink[1]);G.own[pink[2]].m=false;
  // expiry: turn passes -> ended; later round -> ended
  G.turn=2;out.afterTurn=ev2State(G.ev2);out.discAfterTurn=ev2Disc(1,pink[1]);
  // rent event: rounds 3-4 only, +50% on targets, nothing elsewhere, mortgaged pays nothing
  G.ev2={v:1,id:'film',city:'lagos',kind:'rent',pct:50,from:3,targets:pink.slice(),group:'pink',name:'Lagos Film Festival',area:'Surulere & Yaba',rounds:2};G.turn=0;
  const base=(()=>{const e=G.ev2;G.ev2=null;const r=rentFor(pink[0],7);G.ev2=e;return r})();out.rentBase=base;out.rentR3=rentFor(pink[0],7);G.round=4;out.rentR4=rentFor(pink[0],7);G.round=5;out.rentR5=rentFor(pink[0],7);
  G.round=4;const other=GROUPS.navy[0];G.own[other]={o:2,h:0,m:false};out.otherRent=rentFor(other,7)===(()=>{const e=G.ev2;G.ev2=null;const r=rentFor(other,7);G.ev2=e;return r})();
  G.own[pink[0]].m=true;out.mortRent=rentFor(pink[0],7);G.own[pink[0]].m=false;
  // reload: the snapshot survives a save round trip and validation; a tampered event is rejected
  G.over=false;G.phase='pre';delete G.sim;const copy=JSON.parse(JSON.stringify(G));G.sim=true;out.validSave=validateSave(copy);copy.ev2.pct=90;out.tamperRejected=!validateSave(copy);
  const c2=JSON.parse(JSON.stringify(G));delete c2.sim;c2.players[0].roof='crown';out.roofOk=validateSave(c2);c2.players[0].roof='hacker';out.roofTamperRejected=!validateSave(c2);
  // scheduling: next event exactly at round ev2Next, never restarted by a reload or a mid-round turn change
  mk();G.round=2;G.turn=2;G.first=0;const n0=G.ev2n;advanceTurn();out.round3Started=G.round===3&&!!G.ev2&&G.ev2.from===3&&G.ev2n===n0+1&&G.ev2Next===6;
  const ev=JSON.stringify(G.ev2);advanceTurn();out.notRestarted=JSON.stringify(G.ev2)===ev&&G.ev2Next===6;
  // spotlight event comes first in its city when opted in
  mk();G.spot={id:'s0-lagos',city:'lagos',event:'boom',ends:Date.now()+1e6};G.round=2;G.turn=2;G.first=0;advanceTurn();out.spotFirst=!!G.ev2&&G.ev2.id==='boom'&&G.ev2.targets.length===PROP_IDX.length;
  // events off: no event, no discount, unchanged costs even with a stale ev2 object
  mk({events2:false});G.ev2={v:1,id:'boom',kind:'dev',pct:25,from:1,rounds:1,targets:PROP_IDX.slice(),name:'x',area:'y'};out.offNoDisc=ev2Disc(0,PROP_IDX[0])===0&&devCost(0,PROP_IDX[0])===SQ[PROP_IDX[0]].h&&ev2RentPct(PROP_IDX[0])===0;
  // online settings strip the local-only rule
  setup.rules={...setup.rules,events2:true};out.onlineStripped=!('events2' in cfgSetOnline())&&cfgSet().events2===true;setup.rules={...setup.rules,events2:false};
  FAST=false;G=null;return out});
 check('strategic events are snapshotted and replace classic city events',rules.snapshot.events2===true&&rules.snapshot.classic===false&&rules.snapshot.next===3,rules.snapshot);
 check('turn event is upcoming before, active during and ended after the named player’s turn',rules.upcoming==='upcoming'&&rules.discBefore===0&&rules.active==='active'&&rules.afterTurn==='ended'&&rules.discAfterTurn===0,rules);
 check('affordability uses the discounted price only for the named player',rules.canFullFail===false&&rules.canDiscounted===true&&rules.otherPlayerDisc===0&&rules.devCost===rules.h-Math.round(rules.h/2),rules);
 check('the debit equals the discounted price and one house leaves the bank',rules.debit===rules.devCost&&rules.houseTaken===1,rules);
 check('even-building and mortgage rules still apply during an event',rules.unevenRefused&&rules.mortBlocks,rules);
 check('selling refunds half the full price, so no event profit',rules.sellRefund===rules.h/2,rules);
 check('rent event: +50% in rounds 3–4, normal in round 5, other districts and mortgaged streets unchanged',rules.rentR3===Math.round(rules.rentBase*1.5)&&rules.rentR4===rules.rentR3&&rules.rentR5===rules.rentBase&&rules.otherRent&&rules.mortRent===0,rules);
 check('saved matches keep the event; tampered events and rooftops are rejected',rules.validSave&&rules.tamperRejected&&rules.roofOk&&rules.roofTamperRejected,rules);
 check('events start exactly on schedule and are not restarted by later turns',rules.round3Started&&rules.notRestarted,rules);
 check('the Spotlight event is first in its city when opted in',rules.spotFirst,rules);
 check('with strategic events off nothing changes',rules.offNoDisc,rules);
 check('online rooms never carry the local-only rule',rules.onlineStripped,rules);
 // ---------- 2. seeded simulations with strategic events on ----------
 const sims=await page.evaluate(async({runs,seed})=>{let started=0,discounts=0;const s0=ev2Start;ev2Start=function(){started++;return s0()};const b0=build;build=function(pid,i){if(ev2Disc(pid,i))discounts++;return b0(pid,i)};
  try{const res=await window.__sim(runs,4,{seed,set:{events2:true,city:'lagos'}});return{res,started,discounts}}finally{ev2Start=s0;build=b0}},{runs:RUNS,seed:SEED});
 const R=sims.res,errs=R.filter(r=>r.err),bad=R.filter(r=>!r.cashOk||!r.houseBank||!r.hotelBank);
 report.sims={runs:R.length,seed:SEED,rounds:[Math.min(...R.map(r=>r.rounds)),Math.max(...R.map(r=>r.rounds))],outcomes:R.reduce((a,r)=>(a[r.outcome]=(a[r.outcome]||0)+1,a),{}),eventsStarted:sims.started,discountedBuilds:sims.discounts,errors:errs.length,invariantFailures:bad.length};
 check(`${R.length} seeded games with strategic events: no errors, cash and house/tower banks conserved`,!errs.length&&!bad.length,report.sims);
 check('events actually fired and discounted builds happened in simulation',sims.started>R.length&&sims.discounts>0,report.sims);
 // ---------- 3. rooftops are appearance-only ----------
 const roofParity=await page.evaluate(async seed=>{const a=await window.__sim(12,4,{seed});const ng=newGame;newGame=function(cfg){cfg.players.forEach((p,i)=>p.roof=ROOF_IDS[i%ROOF_IDS.length]);return ng(cfg)};try{const b=await window.__sim(12,4,{seed});return{same:JSON.stringify(a)===JSON.stringify(b),n:a.length}}finally{newGame=ng}},SEED+1);
 check('the same seeded games give identical results with every rooftop equipped',roofParity.same,roofParity);
 // ---------- 4. Spotlight contract and claim ----------
 const spot=await page.evaluate(()=>{const out={};const S=spotNow();out.city=S.city;PREF.spot={flags:{}};PREF.inv.roof={};
  const finish=(id,ends=S.ends)=>{GEN++;newGame({cash:1600,set:{ai:'normal',city:S.city},players:[{name:'Me',tok:TOKENS[0],col:PCOL[0],ai:false,owner:true},{name:'Bot',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.spot={id:S.id,city:S.city,event:null,ends};G.masteryId=id;G.over=true;return spotRecord()};
  out.r1=finish('aaaa1111');out.dup=finish('aaaa1111');out.r2=finish('bbbb2222');out.claimEarly=spotClaim(S.id);out.r3=finish('cccc3333');out.r4=finish('dddd4444');
  out.count=spotCount(S.id);const c=spotClaim(S.id);out.claim=c&&c.roof.id;out.owned=roofOwned(S.reward);const coins=PREF.coins;out.again=spotClaim(S.id);out.coinsSame=PREF.coins===coins;
  // a match that ended long after the Spotlight (beyond the grace day) does not count
  const late=Date.now();out.late=finish('eeee5555',late-3*864e5);
  // another human or an AI cannot earn it for the owner
  GEN++;newGame({cash:1600,set:{ai:'normal',city:S.city},players:[{name:'Bot',tok:TOKENS[0],col:PCOL[0],ai:true},{name:'Bot2',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.spot={id:S.id,city:S.city,event:null,ends:S.ends};G.over=true;out.aiOnly=spotRecord();
  // a backwards clock shows an older campaign but can never re-claim this one
  const now=Date.now,back=now()-2*7*864e5;Date.now=()=>back;try{out.rollback=spotClaim(S.id)}finally{Date.now=now}
  // second campaign with an already-owned reward pays coins once
  PREF.spot.flags={};const id2=S.id;['x1','x2','x3'].forEach(k=>PREF.spot.flags[id2+'.m.'+k]=1);const c0=PREF.coins;const d=spotClaim(id2);out.dupCoins=d&&d.had&&PREF.coins-c0===SPOT_DUP_COINS;
  G=null;return out});
 check('a finished Spotlight-city match counts once per match',spot.r1===1&&spot.dup===null&&spot.r2===2&&spot.r3===3&&spot.r4===null&&spot.count===3,spot);
 check('the reward can only be claimed after three matches, exactly once',spot.claimEarly===null&&spot.claim!==null&&spot.owned&&spot.again===null&&spot.coinsSame,spot);
 check('late matches, AI-only matches and a backwards clock earn nothing',spot.late===null&&spot.aiOnly===null&&spot.rollback===null,spot);
 check('an already-owned reward converts to coins once',spot.dupCoins,spot);
 // ---------- 5. UI on phone landscape, phone portrait and desktop ----------
 for(const [label,vp] of [['phone',{width:956,height:440}],['portrait',{width:390,height:844}],['desktop',{width:1280,height:800}]]){
  const v=await open(url,vp,{inv:{roof:{'golden-garden':1}},eq:{roof:'golden-garden'}});
  await v.page.evaluate(()=>homeTab('spotlight'));await v.page.waitForSelector('.spot .spplay');
  const ui=await v.page.evaluate(()=>{const r=e=>e&&e.getBoundingClientRect(),p=r(document.querySelector('.spplay')),pane=r(document.querySelector('#pane'));return{play:!!p&&p.width>40,inside:p.right<=pane.right+1&&p.left>=pane.left-1,overflowX:document.querySelector('#pane').scrollWidth<=document.querySelector('#pane').clientWidth+2}});
  if(shots)await v.page.screenshot({path:path.join(shots,`spotlight-${label}.png`)});
  await v.page.evaluate(()=>homeTab('buildings'));await v.page.waitForSelector('.roofs .roofrow');
  const roof=await v.page.evaluate(()=>({rows:document.querySelectorAll('.roofs .roofrow').length,equipped:document.querySelector('.roofrow.sel b').textContent,stage:!!document.querySelector('.roofstage canvas[data-done]')}));
  if(shots)await v.page.screenshot({path:path.join(shots,`rooftops-${label}.png`)});
  await v.page.evaluate(()=>{setup.rules={...setup.rules,events2:true,events:false};const me=setup.slots[0];startFromSetup(document.body,setup.slots.map((s,i)=>({...s,type:i<2?'human':'off',tok:i===0?me.tok:s.tok})))});
  await v.page.waitForSelector('#ev2chip');const chip=await v.page.evaluate(()=>{const c=document.querySelector('#ev2chip').getBoundingClientRect();return{w:c.width,inView:c.left>=0&&c.right<=innerWidth,roof:G.players[0].roof}});
  check(`${label}: Spotlight, rooftop picker and event chip fit the screen`,ui.play&&ui.inside&&ui.overflowX&&roof.rows===6&&roof.equipped==='Golden Rooftop Garden'&&roof.stage&&chip.inView&&chip.roof==='golden-garden',{ui,roof,chip});
  if(shots)await v.page.screenshot({path:path.join(shots,`event-chip-${label}.png`)});
  await v.ctx.close();
 }
 // ---------- 6. optional exact parity with an older build when events are off ----------
 if(process.env.SKYLINE_BASELINE_URL){const old=await open(process.env.SKYLINE_BASELINE_URL),opts={seed:SEED+2};
  const a=await old.page.evaluate(o=>window.__sim(40,4,o),opts),b=await page.evaluate(o=>window.__sim(40,4,o),opts);
  report.parity={games:a.length,identical:JSON.stringify(a)===JSON.stringify(b)};check('events off: 40 seeded games identical to the previous build',report.parity.identical,report.parity);await old.ctx.close()}
 check('no page errors',report.errors.length===0,report.errors);
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,1));
 console.log('SPOTLIGHT SUMMARY',JSON.stringify({checks:report.checks.length,sims:report.sims,parity:report.parity}));
 await ctx.close();
})().catch(e=>{console.error(e,report.errors.slice(0,5));process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r))});
