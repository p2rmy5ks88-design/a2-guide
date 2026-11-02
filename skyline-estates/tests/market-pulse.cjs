'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results');
const engine=process.env.VISUAL_ENGINE||'chromium',report={engine,checks:[],simulations:[],errors:[],physicalIPhone:false};
fs.mkdirSync(out,{recursive:true});let browser,server;
const check=(n,ok)=>{assert.ok(ok,n);report.checks.push(n);console.log('PASS',n)};
(async()=>{
 server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=process.env.SKYLINE_LIVE_URL||`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--disable-webgl'],executablePath:process.env.CHROME_PATH||undefined}:{})});
 const ctx=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='log'&&m.text().startsWith('SIM'))console.log(m.text())});
 await page.route('https://**/*',r=>process.env.SKYLINE_LIVE_URL?r.continue():r.abort());
 await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:1740})));
 await page.goto(url);await page.waitForFunction(()=>typeof mpChoose==='function');await page.waitForFunction(()=>!document.querySelector('#boot'));
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}.ov.bye{display:none!important}'});
 const rules=await page.evaluate(()=>{
  const checks=[],ok=(n,v)=>{if(!v)throw Error(n);checks.push(n)},mk=(set={})=>{GEN++;FAST=true;applyCity('lagos');newGame({cash:1600,set:{ai:'normal',city:'lagos',mode:'classic',marketPulse:true,...set},players:[0,1,2].map(i=>({name:'Seat '+i,tok:TOKENS[i],col:PCOL[i],ai:true}))});G.sim=true;G.phase='pre';G.round=3;G.turn=0;G.first=0};
  mk();ok('single event system enabled; classic events off',G.mpVersion===1&&G.set.events2&&!G.set.events&&!G.event);
  ev2Start();let e=G.ev2;ok('first pulse has exact district and bounded two-round rent rise',e.id==='pulseRise'&&e.pct===10&&e.rounds===2&&e.group==='brown');
  const i=e.targets[0],j=GROUPS.navy[0];e.targets.forEach(k=>G.own[k].o=0);G.own[j].o=1;
  const raw=()=>{const ev=G.ev2;G.ev2=null;const r=rentFor(i,7);G.ev2=ev;return r},base=raw();
  ok('target rent uses one 10% modifier',rentFor(i,7)===Math.round(base*1.1));
  ok('other districts, rails and utilities receive no modifier',ev2RentPct(j)===0&&RAILS.every(k=>!ev2RentPct(k))&&UTILS.every(k=>!ev2RentPct(k)));
  G.own[i].m=true;ok('mortgaged rent remains zero',rentFor(i,7)===0);G.own[i].m=false;
  const cash=P(0).cash,coin=PREF.coins,pref=JSON.stringify(PREF),full=SQ[i].h;
  ok('permit costs exactly SC 10M and changes no saved funds',mpChoose(0,'permit')&&P(0).cash===cash-10&&PREF.coins===coin&&JSON.stringify(PREF)===pref);
  ok('duplicate and stale choices cannot charge again',!mpChoose(0,'permit')&&P(0).cash===cash-10&&!mpChoose(1,'permit'));
  ok('permit affects only chooser and target construction',devCost(0,i)===full-Math.round(full*.1)&&ev2Disc(1,i)===0&&ev2Disc(0,j)===0);
  const before=P(0).cash,houses=G.houses;build(0,i);ok('actual build debit equals preview and consumes one house',before-P(0).cash===devCost(0,i)&&G.houses===houses-1);
  ok('even-building restriction preserved',!canBuild(0,i));
  sell(0,i);ok('build and resale cannot create money',P(0).cash<before);
  G.own[e.targets[1]].m=true;ok('mortgage still blocks construction',!canBuild(0,i));G.own[e.targets[1]].m=false;
  const snapshot=JSON.parse(JSON.stringify(G));delete snapshot.sim;ok('pulse save validates with paid choice',validateSave(snapshot));
  const bad=JSON.parse(JSON.stringify(snapshot));bad.ev2.choices[0]='free';ok('invalid choice save rejected',!validateSave(bad));
  const bad2=JSON.parse(JSON.stringify(snapshot));bad2.ev2.targets=[j];ok('mismatched district save rejected',!validateSave(bad2));
  G.round=4;ok('effect remains through second round',ev2RentPct(i)===10&&ev2Disc(0,i)>0);G.round=5;ok('neutral round expires effect and permit together',ev2RentPct(i)===0&&ev2Disc(0,i)===0);
  G.round=6;ev2Start();e=G.ev2;ok('next event rotates district and type',e.id==='pulseBuild'&&e.group==='sky');
  e.targets.forEach(k=>G.own[k].o=0);const k=e.targets[0],h=SQ[k].h;ok('base construction discount is 15%',devCost(0,k)===h-Math.round(h*.15));
  mpChoose(0,'permit');ok('construction discount caps at 25%',devCost(0,k)===h-Math.round(h*.25));
  G.houses=0;ok('empty house bank blocks discounted construction',!canBuild(0,k));G.houses=36;
  G.round=9;ev2Start();e=G.ev2;ok('third pulse is rent relief in third district',e.id==='pulseSoft'&&e.group==='pink'&&e.pct===-10);
  e.targets.forEach(k=>G.own[k].o=0);const z=e.targets[0],saveE=G.ev2;G.ev2=null;const rent=rentFor(z,7);G.ev2=saveE;ok('rent relief rounds once through the shared formula',rentFor(z,7)===Math.round(rent*.9));
  P(0).cash=9;ok('unaffordable permits refused without debt',!mpChoose(0,'permit')&&P(0).cash===9);ok('free choice is always available',mpChoose(0,'hold')&&P(0).cash===9);
  mk();const districts=[];for(let n=0;n<8;n++){G.round=3+n*3;ev2Start();districts.push(G.ev2.group)}ok('all eight districts visited without repeats',new Set(districts).size===8);
  mk();G.round=2;G.turn=2;advanceTurn();ok('normal scheduler starts pulse in round 3',G.round===3&&G.ev2.from===3&&G.ev2Next===6);const ev=JSON.stringify(G.ev2);advanceTurn();ok('mid-round turn cannot restart pulse',JSON.stringify(G.ev2)===ev);
  mk({marketPulse:false,events2:true});ev2Start();ok('legacy strategic new games retain legacy events',!mpEvent(G.ev2)&&!G.mpVersion);const old=JSON.parse(JSON.stringify(G));delete old.sim;ok('legacy strategic saves still validate',validateSave(old));
  mk({marketPulse:false,events2:false});ok('ordinary old games remain valid',validateSave({...G,sim:undefined}));
  setup.rules={...setup.rules,events2:true,marketPulse:true};ok('online config strips both local event systems',!('marketPulse' in cfgSetOnline())&&!('events2' in cfgSetOnline()));
  mk();ev2Start();G.online=true;ok('online defense disables pulse effects',!mpOn()&&!ev2Active()&&ev2Disc(0,1)===0);delete G.online;
  FAST=false;G=null;return checks;
 });rules.forEach(n=>check(n,true));
 // Reproducible paired economy runs, including events-off exact parity with
 // the unchanged native/base game source loaded in a second page.
 if(!process.env.SKYLINE_MARKET_UI_ONLY){
 console.log('Starting base-engine comparison');
 const baseline=await ctx.newPage();await baseline.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/game.html`);await baseline.waitForFunction(()=>typeof __sim==='function');await baseline.waitForFunction(()=>!document.querySelector('#boot'));
 const opts={seed:20261102,set:{events2:false,marketPulse:false}},a=await baseline.evaluate(o=>Promise.race([__sim(20,4,o),new Promise((_,reject)=>setTimeout(()=>reject(Error('Baseline timed out '+JSON.stringify({round:G?.round,turn:G?.turn,phase:G?.phase,fast:FAST,modals:document.querySelector('#modals')?.innerText}))),45000))]),opts);
 console.log('Base games complete');await baseline.close();const b=await page.evaluate(async o=>{const iv=setInterval(()=>console.log('SIM state '+JSON.stringify({round:G?.round,turn:G?.turn,phase:G?.phase,fast:FAST,modals:document.querySelector('#modals')?.innerText})),5000);try{return await __sim(20,4,o)}finally{clearInterval(iv)}},opts);
 check('20 events-off games exactly match unchanged base engine',JSON.stringify(a)===JSON.stringify(b));report.baseline=a;
 for(const [name,count,set] of [['classic',40,{mode:'classic'}],['quick',15,{mode:'quick'}],['timed',15,{mode:'timed',rounds:20}],['ffa',15,{ffa:true,even:false}],['six-seat',10,{mode:'timed',rounds:20}]]){
  const data=await page.evaluate(async({count,set,name})=>{let events=0,paid=0;const es=ev2Start,choose=mpChoose;ev2Start=function(){events++;return es()};mpChoose=function(pid,c,e){const r=choose(pid,c,e);if(r&&c==='permit')paid++;return r};try{return{runs:await __sim(count,name==='six-seat'?6:4,{seed:20261102,set:{...set,marketPulse:true}}),events,paid}}finally{ev2Start=es;mpChoose=choose}},{name,count,set});
  check(`${count} ${name} pulse simulations preserve cash and building banks`,data.runs.every(r=>!r.err&&r.cashOk&&r.houseBank&&r.hotelBank));check(`${name} simulations exercise actual pulses`,data.events>0);
  report.simulations.push({name,count,events:data.events,paidChoices:data.paid,meanRounds:data.runs.reduce((s,r)=>s+r.rounds,0)/count,outcomes:data.runs.reduce((s,r)=>(s[r.outcome]=(s[r.outcome]||0)+1,s),{}),runs:data.runs});
 }
 }
 // Actual choice buttons, save/reload, pass-and-play and landscape geometry.
 await page.reload();await page.waitForFunction(()=>typeof mpChoose==='function'&&!document.querySelector('#boot'));
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}.ov.bye{display:none!important}'});
 for(const vp of [{width:956,height:440},{width:844,height:390},{width:844,height:320},{width:667,height:375}]){
  await page.setViewportSize(vp);await page.evaluate(()=>{GEN++;FAST=false;applyCity('stockholm');newGame({cash:1600,set:{ai:'normal',mode:'classic',city:'stockholm',marketPulse:true},players:[0,1].map(i=>({name:'Player '+(i+1),tok:TOKENS[i],col:PCOL[i],ai:false}))});G.players.forEach(p=>p.cash=1600);G.round=3;G.turn=0;G.phase='pre';ev2Start();G.ev2.targets.forEach(i=>G.own[i].o=0);document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;renderRoster();ev2Chip();window.offer=mpOffer(P(0))});
  const label=`${vp.width}x${vp.height}`;await page.locator('.ov:not(.bye) .mpmodal').waitFor();
  const geometry=await page.locator('.ov:not(.bye) .mpmodal .mbar button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height,visible:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,hit:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}}));
  await page.screenshot({path:path.join(out,`market-choice-${engine}-${label}.png`)});
  console.log('Decision geometry',label,JSON.stringify(geometry));
  check(`${label}: both decision buttons fit and receive touches`,geometry.every(b=>b.w>=44&&b.h>=44&&b.visible&&b.hit));
  await page.getByRole('button',{name:'Permit · SC 10M',exact:true}).click();await page.evaluate(()=>window.offer);
  console.log('Decision state',JSON.stringify(await page.evaluate(()=>({cash:P(0).cash,choices:G.ev2.choices,valid:validateSave(G),saved:loadSave()&&{cash:loadSave().players[0].cash,choices:loadSave().ev2?.choices},warning:saveWarning,phase:G.phase}))));
  check(`${label}: real button pays once and persists`,await page.evaluate(()=>P(0).cash===1590&&loadSave().ev2.choices[0]==='permit'));
  await page.evaluate(()=>{void ev2Info()});await page.locator('.ov:not(.bye) .mpmodal').last().waitFor();await page.screenshot({path:path.join(out,`market-info-${engine}-${label}.png`)});await page.getByRole('button',{name:'OK',exact:true}).last().click();
  await page.evaluate(()=>{G.turn=1;G.phase='post';G.ev2.targets.forEach(i=>G.own[i].o=1);P(1).cash=9;window.offer=mpOffer(P(1))});await page.locator('.ov:not(.bye) .mpmodal').last().waitFor();
  check(`${label}: next human sees their own cash and disabled unaffordable option`,await page.getByRole('button',{name:'Permit · SC 10M',exact:true}).isDisabled());await page.getByRole('button',{name:'Keep cash',exact:true}).click();await page.evaluate(()=>window.offer);
  check(`${label}: pass-and-play choices are independent`,await page.evaluate(()=>G.ev2.choices[0]==='permit'&&G.ev2.choices[1]==='hold'&&P(1).cash===9));
  check(`${label}: decision retains post-roll resume phase`,await page.evaluate(()=>G.phase==='post'&&loadSave().phase==='post'));
 }
 await page.reload();await page.waitForFunction(()=>typeof mpChoose==='function');
 check('real reload preserves event decisions and balances',await page.evaluate(()=>{const s=loadSave();return s.ev2.choices[0]==='permit'&&s.ev2.choices[1]==='hold'&&s.players[0].cash===1590&&s.players[1].cash===9}));
 check('no browser exceptions',report.errors.length===0);await ctx.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`market-pulse-${engine}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));console.log('MARKET PULSE',engine,report.checks.length,'checks',report.simulations.reduce((n,s)=>n+s.count,0),'simulations')});
