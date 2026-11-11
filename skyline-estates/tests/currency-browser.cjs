'use strict';
// Real generated web game; isolated storage, no production account/online writes.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results');
const engine=process.env.VISUAL_ENGINE||'chromium',report={engine,physicalIPhone:false,checks:[],errors:[]};
fs.mkdirSync(out,{recursive:true});let browser,server;
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS',name)};
(async()=>{
 server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'content-type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 for(const size of [{width:956,height:440},{width:844,height:390},{width:844,height:320},{width:667,height:375}]){
  const label=size.width+'x'+size.height,context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.route('https://**/*',r=>process.env.CURRENCY_BASE_URL&&new URL(r.request().url()).origin===new URL(process.env.CURRENCY_BASE_URL).origin?r.continue():r.abort());
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  await p.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Currency QA',nickSet:true,welcomed:1,tutDone:1,coins:1740,xp:5000,scReserve:145,flat2d:true,rig:false,riders:false}));});
  const url=process.env.CURRENCY_BASE_URL||'http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
  const active=p.locator('#modals .ov:not(.bye)');
  const shot=async tag=>{await p.waitForTimeout(350);return p.screenshot({path:path.join(out,'currency-'+engine+'-'+label+'-'+tag+'.png')})};
  async function loaded(){await p.waitForFunction(()=>window.SkylineEarnedCash&&window.SkylineHome);await p.locator('#boot').waitFor({state:'detached'});await p.waitForFunction(()=>!!document.querySelector('#tbSkylineCash'));}
  // Same source/layout/profile with the new wallet adapter withheld is the before
  // baseline; the currency formatter and shipped home redesign remain active.
  if(!process.env.CURRENCY_BASE_URL){await context.route('**/lib/skyline-earned-cash.js',r=>r.fulfill({contentType:'text/javascript',body:'/* baseline before earned wallet */'}));await p.goto(url);await p.waitForFunction(()=>window.SkylineHome);await p.locator('#boot').waitFor({state:'detached'});await shot('header-before');await context.unroute('**/lib/skyline-earned-cash.js');}
  await p.goto(url);await loaded();
  await p.addStyleTag({content:'.achpop,.float,.coinfloat,.xpfloat,#confetti{display:none!important}'});
  check('saved balance and Coins preserved '+label,await p.evaluate(()=>SkylineEarnedCash.balance()===145&&PREF.coins===1740&&SkylineCurrency.reserve()===145));
  const layout=await p.evaluate(()=>{const controls=['#tbWho','#tbSkylineCash','#tbCoins','#tbLeague','#hdGear'].map(s=>document.querySelector(s)).filter(e=>e&&e.getClientRects().length),boxes=controls.map(e=>({id:e.id,r:e.getBoundingClientRect()}));const logo=document.querySelector('.hd-logo')?.getBoundingClientRect();return {ok:boxes.every(x=>x.r.left>=0&&x.r.right<=innerWidth&&x.r.height>=40)&&boxes.every((x,i)=>boxes.slice(i+1).every(y=>x.r.right<=y.r.left+1||y.r.right<=x.r.left+1||x.r.bottom<=y.r.top||y.r.bottom<=x.r.top)),logo:!logo||boxes.every(x=>logo.right<=x.r.left+1||x.r.right<=logo.left+1||logo.bottom<=x.r.top||x.r.bottom<=logo.top),width:document.documentElement.scrollWidth,viewport:innerWidth,boxes:boxes.map(x=>({id:x.id,left:x.r.left,right:x.r.right,top:x.r.top,bottom:x.r.bottom})),logoBox:logo&&{left:logo.left,right:logo.right,top:logo.top,bottom:logo.bottom}}});
  if(!layout.ok||!layout.logo)console.log('HEADER GEOMETRY',JSON.stringify(layout));
  check('SC Coins League order '+label,await p.evaluate(()=>{const c=document.querySelector('#tbSkylineCash'),coin=document.querySelector('#tbCoins'),league=document.querySelector('#tbLeague');return !!(c.compareDocumentPosition(coin)&4)&&!!(coin.compareDocumentPosition(league)&4)}));
  check('header controls and logo do not overlap '+label,layout.ok&&layout.logo&&layout.width<=layout.viewport);
  await shot('header-after');
  await p.locator('#tbSkylineCash').tap();await active.locator('.sc-wallet').waitFor();
  check('wallet explains distinct currencies and device limits '+label,/SC 145M/.test(await active.locator('.sc-wallet').innerText())&&/not a tamper-proof online wallet/.test(await active.locator('.sc-wallet').innerText()));
  await active.getByRole('button',{name:'Close',exact:true}).click();
  // Real progression APIs, not opening a screen.
  const rewards=await p.evaluate(()=>{
   run=async()=>{};keyReveal=async()=>{};const flags={},S=season();S.sxp=3000;S.cf={};S.cp={};S.prem=true;
   const b=SkylineEarnedCash.balance(),coins=PREF.coins;flags.season=claimTier(5,false)&&SkylineEarnedCash.balance()===b+40&&PREF.coins===coins+150;flags.seasonRepeat=!claimTier(5,false)&&SkylineEarnedCash.balance()===b+40;claimTier(10,true);flags.premium=SkylineEarnedCash.balance()===b+40;
   const W=weekly();W.list=['games5'];W.prog={games5:4};W.done={};const wc=PREF.coins,wx=season().sxp;weeklyAdd('games',1);flags.weekly=SkylineEarnedCash.balance()===b+65&&PREF.coins===wc+WEEK_COINS&&season().sxp===wx+WEEK_SXP;weeklyAdd('games',1);flags.weeklyRepeat=SkylineEarnedCash.balance()===b+65;
   FAST=false;newGame({cash:1600,set:{city:'lagos',mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.owner=0;
   const D=daily();D.list=['buy5','rent300','houses3'];D.done={};D.best={};Object.assign(st(G.players[0]),{buys:5,rent:300,houses:3});const dc=PREF.coins,dx=PREF.xp;missionScan(false);flags.daily=SkylineEarnedCash.balance()===b+80&&PREF.coins>=dc+3*MISSION_COINS&&PREF.xp>=dx+3*MISSION_XP;missionScan(false);flags.dailyRepeat=SkylineEarnedCash.balance()===b+80;
   G.own[1]={o:0,h:5,m:false};G.hotels=11;achScan();flags.firstTower=SkylineEarnedCash.balance()===b+105;achScan();flags.towerRepeat=SkylineEarnedCash.balance()===b+105;
   G.own[3]={o:0,h:5,m:false};G.own[6]={o:0,h:5,m:false};G.hotels=9;achScan();flags.threeTowers=SkylineEarnedCash.balance()===b+155;
   G.own=G.own.map(()=>({o:-1,h:0,m:false}));G.hotels=12;PREF.cach.lagos={};for(const t of CT)if(t.id!=='rich')PREF.cach.lagos[t.id]=Date.now();const originalCash=G.players[0].cash;G.players[0].cash=3000;cityScan(false);flags.cityCollection=SkylineEarnedCash.balance()===b+255;cityScan(false);flags.cityRepeat=SkylineEarnedCash.balance()===b+255;G.players[0].cash=originalCash;
   // Keep earned frames/Coins/XP; omit only the queued avatar showcase in this
   // focused currency fixture so it cannot cover the wallet interaction.
   frameReveal=()=>{};PREF.frameNew=[];
   const cash=G.players.map(p=>p.cash),owned=JSON.stringify(G.own);G.phase='post';save();flags.separation=SkylineEarnedCash.balance()!==G.players[0].cash;flags.save=loadSave().players[0].cash===cash[0]&&JSON.stringify(loadSave().own)===owned;
   return flags;
  });for(const [name,ok]of Object.entries(rewards))check(name+' '+label,ok);
  await p.evaluate(()=>{GEN++;showTitle();homeTab('season')});await p.waitForTimeout(200);await shot('season');
  check('Season reward and weekly SC visible '+label,await p.locator('#track .sc-reward').count()===8&&await p.locator('.swc .sc-reward').count()===1);
  check('both Season tracks remain clear of dock '+label,await p.evaluate(()=>{const a=document.querySelector('#track .scell').getBoundingClientRect(),b=document.querySelector('#track .scell.prem').getBoundingClientRect(),pane=document.querySelector('#pane').getBoundingClientRect(),dock=document.querySelector('#title .rail').getBoundingClientRect();return a.top>=pane.top-1&&b.bottom<=pane.bottom+1&&pane.bottom<=dock.top+1}));
  await p.locator('.sweek').scrollIntoViewIfNeeded();await shot('weekly');
  await p.evaluate(()=>homeTab('daily'));await p.locator('.dgrid').scrollIntoViewIfNeeded();await shot('daily');
  check('Daily reward descriptions show SC '+label,await p.locator('.dgrid .goal:not(.bonus) .grw .sc-reward').count()===3);
  await p.evaluate(()=>homeTab('shop'));await shot('shop');
  check('existing Coins shop remains available '+label,await p.locator('#tbCoins').isVisible());
  await p.evaluate(()=>{showTitle();homeTab('play')});await p.locator('#tbSkylineCash').tap();await active.locator('.sc-wallet').waitFor();await shot('wallet');await active.locator('.sc-wallet details').last().locator('summary').click();await shot('wallet-history');
  await active.getByRole('button',{name:'Use SC in solo practice',exact:true}).click();
  await active.getByRole('button',{name:'Keep my SC',exact:true}).waitFor();check('practice limitations disclosed before opt-in '+label,/earns no career wins.*XP, trophies, Season progress/.test(await p.locator('#modals').innerText()));
  await active.getByRole('button',{name:'Keep my SC',exact:true}).click();await active.locator('.sc-wallet').waitFor();check('declining keeps opt-in off '+label,await p.evaluate(()=>!PREF.scBoostNext));
  await active.getByRole('button',{name:'Use SC in solo practice',exact:true}).click();await active.getByRole('button',{name:'Start practice without progression',exact:true}).click();await active.locator('.sc-wallet').waitFor();check('explicit opt-in enabled '+label,await p.evaluate(()=>PREF.scBoostNext));
  await active.getByRole('button',{name:'Cancel solo bonus',exact:true}).click();await active.locator('.sc-wallet').waitFor();check('can cancel before starting '+label,await p.evaluate(()=>!PREF.scBoostNext));await active.getByRole('button',{name:'Close',exact:true}).click();
  // Qualifying local finish uses existing match ID and real completion hooks.
  const match=await p.evaluate(()=>{
   const cfg={cash:1600,set:{city:'lagos',mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]};FAST=false;newGame(cfg);startWith(G);const id=G.masteryId,now=Date.now;Date.now=()=>now()+120001;
   try{G.round=6;G.over=true;Object.assign(st(G.players[0]),{buys:3});progressGameEnd(G.players[0]);const tx=SkylineEarnedCash.view().transactions.find(t=>t.id==='match:'+id),balance=SkylineEarnedCash.balance();progressGameEnd(G.players[0]);return{amount:tx?.amount,repeat:SkylineEarnedCash.balance()===balance};}finally{Date.now=now}
  });check('local completion and win reward once '+label,match.amount===60&&match.repeat);
  const practice=await p.evaluate(async()=>{
   GEN++;PREF.scBoostNext=true;PREF.scBoostId=crypto.randomUUID();savePref();const cfg={cash:500,set:{city:'lagos',mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]};newGame(cfg);const before=G.players[0].cash,balance=SkylineEarnedCash.balance();await startWith(G);const amount=Math.min(100,Math.floor(before*.1));const flags={cap:G.players[0].cash===before+amount&&balance-SkylineEarnedCash.balance()===amount,practice:G.scAssisted&&!trackable(),spent:SkylineEarnedCash.view().spent>=amount};const profile=JSON.stringify({ach:PREF.ach,xp:PREF.xp,coins:PREF.coins});achAward('catch15');flags.noDirectPracticeAward=JSON.stringify({ach:PREF.ach,xp:PREF.xp,coins:PREF.coins})===profile;G.phase='post';save();return{flags,cash:G.players.map(p=>p.cash),balance:SkylineEarnedCash.balance()};
  });for(const [name,ok]of Object.entries(practice.flags))check(name+' '+label,ok);
  await p.reload();await loaded();
  check('refresh preserves wallet and assisted saved cash '+label,await p.evaluate(practice=>{run=async()=>{};keyReveal=async()=>{};const g=loadSave();startWith(g);return SkylineEarnedCash.balance()===practice.balance&&JSON.stringify(G.players.map(p=>p.cash))===JSON.stringify(practice.cash)&&G.scAssisted&&!trackable()},practice));
  if(size.width===956){
   const before=await p.evaluate(()=>{PREF.scBoostNext=true;PREF.scBoostId=crypto.randomUUID();savePref();return{balance:SkylineEarnedCash.balance(),id:PREF.scBoostId}}),peer=await context.newPage();peer.on('pageerror',e=>report.errors.push(String(e)));await peer.goto(url);await peer.waitForFunction(()=>window.SkylineEarnedCash);await peer.locator('#boot').waitFor({state:'detached'});
   const outcomes=await Promise.all([p,peer].map(page=>page.evaluate(async()=>{run=async()=>{};keyReveal=async()=>{};newGame({cash:500,set:{city:'lagos',mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});await startWith(G);return{assisted:!!G.scAssisted,bonus:G.scStartingBonus||0}})));
   check('two tabs spend one opt-in only once',outcomes.filter(x=>x.assisted).length===1&&await p.evaluate(({balance,id,amount})=>SkylineEarnedCash.balance()===balance-amount&&SkylineEarnedCash.view().transactions.filter(t=>t.id==='practice:'+id).length===1,{...before,amount:outcomes.reduce((n,x)=>n+x.bonus,0)}));await peer.close();
  }
  for(const city of ['lagos','stockholm','nyc','london','tokyo','johannesburg']){
   const result=await p.evaluate(city=>{
    GEN++;FAST=false;applyTheme(city);newGame({cash:1600,set:{city,mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.online=true;const raw='Paid '+fmt(30);G.log=[raw];renderRoster();document.querySelector('#log').textContent=raw;
    const labels=[],canvas=document.createElement('canvas');canvas.width=canvas.height=1100;const ctx=canvas.getContext('2d'),fill=ctx.fillText.bind(ctx);ctx.fillText=(t,...a)=>{labels.push(String(t));return fill(t,...a)};drawBoard(ctx);
    const state=JSON.stringify(G);modal({html:deedHTML(1)+tradeSide([1],30,false,0,false,{from:0,to:1}),btns:[{k:'x',label:'Close'}]});
    return{state,labels,roster:document.querySelector('#roster .pc').textContent,cash:G.players[0].cash,raw,wire:fmt(30)};
   },city);
   await p.waitForFunction(()=>document.querySelector('#log').textContent==='Paid SC 30M');
   check('online '+city+' roster board financial dialogs use SC '+label,result.roster.startsWith('SC ')&&result.labels.some(x=>x.includes('SC '))&&/SC 30M/.test(await p.locator('#modals').innerText()));
   check('online '+city+' snapshot and wire unchanged '+label,await p.evaluate(r=>JSON.stringify(G)===r.state&&G.log[0]===r.raw&&fmt(30)===r.wire,result));
   if(city==='lagos')await shot('gameplay-financial');await active.getByRole('button',{name:'Close',exact:true}).click();if(city==='lagos')await shot('gameplay-roster');
  }
  await context.close();
 }
 check('No runtime errors',report.errors.length===0);
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,'currency-'+engine+'.json'),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r))});
