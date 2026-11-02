'use strict';
// Real generated game + Chromium/WebKit; WebKit emulation is not physical iPhone Safari.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results');
const engine=process.env.VISUAL_ENGINE||'chromium',report={engine,physicalIPhone:false,checks:[],errors:[]};
fs.mkdirSync(out,{recursive:true});let browser,server;
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS',name)};
(async()=>{
 server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 for(const size of [{width:956,height:440},{width:844,height:390},{width:844,height:320}]){
  const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.route('https://**/*',r=>process.env.CURRENCY_BASE_URL&&new URL(r.request().url()).origin===new URL(process.env.CURRENCY_BASE_URL).origin?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  await p.addInitScript(()=>localStorage.setItem('skylinePrefs',localStorage.getItem('skylinePrefs')||JSON.stringify({nick:'Currency QA',nickSet:true,welcomed:1,tutDone:1,coins:250,xp:5000,flat2d:true,rig:false,riders:false})));
  const url=process.env.CURRENCY_BASE_URL||`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`;
  async function loaded(){await p.waitForFunction(()=>window.SkylineCurrency);await p.locator('#boot').waitFor({state:'detached'});}
  await p.goto(url);await loaded();
  check('SC module loads '+size.height,await p.evaluate(()=>fmt(1890)==='SC 1.89B'&&PREF.coins===250));
  for(const city of ['lagos','stockholm']){
   const before=await p.evaluate(city=>{FAST=true;applyCity(city);newGame({cash:1600,set:{city,mode:'classic'},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.round=7;G.phase='post';G.players[0].cash=765;G.own[1].o=0;PREF.scReserve=500;PREF.scBoostNext=true;savePref();if(!save())throw Error('save failed');return{cash:G.players.map(p=>p.cash),own:G.own,city,coins:PREF.coins}},city);
   await p.reload();await loaded();
   check('Legacy '+city+' save restores unchanged '+size.height,await p.evaluate(before=>{run=async()=>{};keyReveal=async()=>{};const g=loadSave();startWith(g);return JSON.stringify(G.players.map(p=>p.cash))===JSON.stringify(before.cash)&&JSON.stringify(G.own)===JSON.stringify(before.own)&&G.set.city===before.city&&PREF.scReserve===500&&PREF.scBoostNext===true&&PREF.coins===before.coins&&!G.scAssisted&&fmt(765)==='SC 765M'},before));
  }
  for(const [city,raw] of [['lagos','Paid ₦30M; balance ₦1.6bn.'],['stockholm','Paid 30 Mkr; balance 1.6 bn kr.'],['tokyo','Paid ¥3M; balance ¥0.16B.']]){
   const before=await p.evaluate(({city,raw})=>{
    GEN++;FAST=true;applyCity(city);newGame({cash:1600,set:{city,mode:'classic'},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});
    G.online=true;G.log=[raw];FAST=false;renderRoster();document.querySelector('#log').textContent=G.log[0];
    const labels=[],canvas=document.createElement('canvas');canvas.width=canvas.height=1100;const ctx=canvas.getContext('2d'),fill=ctx.fillText.bind(ctx);ctx.fillText=(t,...a)=>{labels.push(String(t));return fill(t,...a)};drawBoard(ctx);
    return {state:JSON.stringify(G),labels,symbol:CUR.pre,coins:PREF.coins,cash:G.players[0].cash,roster:document.querySelector('#roster .pc')?.textContent};
   },{city,raw});
   check('Online '+city+' roster and board show SC '+size.height,before.roster==='SC '+(before.cash/1000)+'B'&&before.labels.some(t=>t.includes('SC '))&&before.symbol==='SC ');
   await p.waitForFunction(()=>document.querySelector('#log').textContent==='Paid SC 30M; balance SC 1.6B.');
   await p.locator('#log').click();
   check('Online '+city+' log history shows SC '+size.height,await p.locator('.loglist').textContent().then(t=>t==='Paid SC 30M; balance SC 1.6B.'));
   check('Online '+city+' snapshot and wallet unchanged '+size.height,await p.evaluate(before=>JSON.stringify(G)===before.state&&PREF.coins===before.coins,before));
   await p.getByRole('button',{name:'Close',exact:true}).click();
   if(city==='lagos')await p.screenshot({path:path.join(out,`currency-${engine}-${size.height}-online.png`)});
  }
  const logic=await p.evaluate(()=>{
   GEN++;FAST=true;run=async()=>{};keyReveal=async()=>{};showTitle();const flags={};
   const S=season();S.sxp=250*12;S.cf={};S.cp={};S.prem=true;PREF.scReserve=0;const coins=PREF.coins;
   flags.claim=claimTier(5,false)&&PREF.scReserve===40;const after=PREF.coins;flags.repeat=!claimTier(5,false)&&PREF.scReserve===40&&PREF.coins===after;
   claimTier(10,true);flags.premium=PREF.scReserve===40;
   const W=weekly();W.list=['games5'];W.prog={games5:4};W.done={};weeklyAdd('games',1);flags.weekly=PREF.scReserve===65;weeklyAdd('games',1);flags.weeklyRepeat=PREF.scReserve===65;
   const cfg=()=>({cash:1600,set:{city:'lagos',mode:'classic',perks:false},players:[{name:'Human',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});
   PREF.scReserve=250;PREF.scBoostNext=true;newGame(cfg());const normal=G.players.map(p=>p.cash);startWith(G);flags.solo=G.players[0].cash===normal[0]+100&&G.players[1].cash===normal[1]&&G.scAssisted&&PREF.scReserve===150&&!trackable(); if(!flags.solo)throw Error(JSON.stringify({cash:G.players.map(p=>p.cash),assisted:G.scAssisted,reserve:PREF.scReserve,next:PREF.scBoostNext,masteryId:G.masteryId,sim:G.sim}));
   const before=JSON.stringify({xp:PREF.xp,coins:PREF.coins,t:PREF.trophies,season:PREF.season,stats:PREF.stats,mastery:PREF.tokenMastery});G.over=true;progressGameEnd(G.players[0]);achGameEnd(G.players[0]);spotRecord();flags.noRewards=before===JSON.stringify({xp:PREF.xp,coins:PREF.coins,t:PREF.trophies,season:PREF.season,stats:PREF.stats,mastery:PREF.tokenMastery});
   G.over=false;G.phase='post';save();const restored=loadSave();PREF.scBoostNext=true;startWith(restored);flags.assistedResume=G.scAssisted&&!trackable()&&G.players[0].cash===normal[0]+100&&PREF.scReserve===150;
   const multi=cfg();multi.players[1].ai=false;newGame(multi);const multiCash=G.players[0].cash;startWith(G);flags.passPlay=G.players[0].cash===multiCash&&PREF.scReserve===150&&!G.scAssisted;
   newGame(cfg());const onlineCash=G.players[0].cash;G.online=true;G.players[0].uid='seat';startWith(G);flags.online=G.players[0].cash===onlineCash&&PREF.scReserve===150&&!G.scAssisted;G.online=false;
   return flags;
  });for(const [name,ok] of Object.entries(logic))check(name+' '+size.height,ok);
  await p.evaluate(()=>{GEN++;FAST=true;showTitle();homeTab('season')});
  await p.addStyleTag({content:'.achpop,.coach{display:none!important}.menu-refined{--web-safe-left:59px;--web-safe-right:59px;--web-safe-bottom:21px}'});
  await p.waitForTimeout(900);
  check('Reward rows clear dock '+size.height,await p.evaluate(()=>{const a=document.querySelector('#track .scell').getBoundingClientRect(),b=document.querySelector('#track .scell.prem').getBoundingClientRect(),pane=document.querySelector('#pane').getBoundingClientRect(),dock=document.querySelector('#title .rail').getBoundingClientRect();return a.top>=pane.top-1&&b.bottom<=pane.bottom+1&&pane.bottom<=dock.top}));
  await p.screenshot({path:path.join(out,`currency-${engine}-${size.height}-season.png`)});
  await p.locator('.skyline-sc-use').scrollIntoViewIfNeeded();
  check('Reserve control touch target / overflow '+size.height,await p.locator('.skyline-sc-use').evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('#pane').getBoundingClientRect();return r.height>=44&&r.top>=p.top-1&&r.bottom<=p.bottom+1&&document.documentElement.scrollWidth<=innerWidth}));
  await p.locator('.skyline-sc-use').tap();check('Reserve toggle responds '+size.height,await p.locator('.skyline-sc-use').textContent().then(t=>/Use SC/.test(t)));
  await p.screenshot({path:path.join(out,`currency-${engine}-${size.height}-reserve.png`)});
  await p.evaluate(()=>homeTab('shop'));check('Skyline Coins label '+size.height,await p.locator('.coinpill').first().getAttribute('aria-label').then(t=>t?.startsWith('Skyline Coins:')));
  await context.close();
 }
 check('No runtime errors',report.errors.length===0);
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`currency-${engine}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r))});
