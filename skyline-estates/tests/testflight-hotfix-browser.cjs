'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),native=!!process.env.HOTFIX_NATIVE,base=path.join(root,native?'skyline-estates-app/www':'skyline-estates'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results/hotfix');
fs.mkdirSync(out,{recursive:true});const report={engine,native,physicalIPhone:false,checks:[],errors:[]};let browser;
const check=(n,v)=>{assert.ok(v,n);report.checks.push(n);console.log('PASS',n)};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
(async()=>{
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl']}:{})});
 const c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
 await c.route('https://**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://hotfix.invalid')return r.abort();const f=path.resolve(base,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(base+path.sep))return r.abort();if(u.pathname==='/lib/cloud-config.js')return r.fulfill({contentType:'text/javascript',body:'window.SKYLINE_CLOUD={enabled:false,purchases:false}'});try{return r.fulfill({contentType:mime[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})}catch{return r.fulfill({status:404,body:'missing'})}});
 await c.addInitScript(()=>{Date.now=()=>Date.UTC(2026,10,3,13);if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Hotfix QA',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:10565,xp:1200,trophies:6,scReserve:295,season:{n:2,sxp:15904,prem:true,cf:{1:1},cp:{1:1},tr:6},inv:{dice:{gold:1}}}))});
 const ready=()=>p.waitForFunction(()=>window.SkylineEstateSC&&window.SkylineChallenges&&!document.querySelector('#boot'));
 await p.goto('https://hotfix.invalid/');await ready();
 check('Season 1 starts empty and preserves Coins, SC, premium and inventory',await p.evaluate(()=>seasonDisplay(season().n)===1&&seasonTierNow()===0&&PREF.trophies===0&&season().tr===0&&season().prem&&PREF.coins===10565&&SkylineEarnedCash.balance()===295&&itemOwned('dice','gold')&&PREF.seasonArchive['legacy-s2'].sxp===15904));
 check('Season has a fresh 45-day end and a separate cloud/leaderboard key',await p.evaluate(()=>season().n===1001&&seasonEnds()===Date.UTC(2026,11,18)&&season().cf[1]===undefined));
 await p.reload();await ready();check('launch reset is idempotent',await p.evaluate(()=>PREF.coins===10565&&SkylineEarnedCash.balance()===295&&season().sxp===0&&PREF.seasonArchive['legacy-s2'].tr===6));
 const result=await p.evaluate(()=>{
  FAST=true;GEN++;applyCity('stockholm');newGame({cash:1600,set:{city:'stockholm',mode:'classic',ai:'normal',perks:false,minigames:false},players:[{name:'Hotfix QA',tok:'🚌',col:PCOL[0],ai:false,owner:true},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});FAST=false;G.round=36;G.over=true;G.players[1].bankrupt=true;GROUPS.pink.forEach(i=>G.own[i]={o:0,h:0,m:false});achGameEnd(G.players[0]);const r=progressGameEnd(G.players[0]);setup.city='stockholm';savePref();return{tr:r?.tr,wins:careerWins(),square:GROUPS.pink[0],coins:PREF.coins,sc:SkylineEarnedCash.balance()};
 });
 check('normal completed win grants trophies, career win and collected buildings',result.tr===30&&result.wins===1&&await p.evaluate(i=>PREF.estateOwned.stockholm.includes(i),result.square));
 await p.evaluate(()=>homeTab('portfolio'));await p.locator('.rf-fast-open').click();
 check('earned SC building upgrades are offered with the actual SC cost',await p.locator('.rf-fast-upgrade').first().isEnabled()&&(await p.locator('.rf-fast-hub').innerText()).includes('SC 200M'));
 await p.screenshot({path:path.join(out,`sc-buildings-${engine}-${native?'native':'web'}.png`)});
 await p.locator('.rf-fast-upgrade').first().click();await p.getByRole('button',{name:'Cancel',exact:true}).click();check('cancel keeps SC and Coins',await p.evaluate(d=>SkylineEarnedCash.balance()===d.sc&&PREF.coins===d.coins,result));
 await p.locator('.rf-fast-upgrade').first().click();await p.getByRole('button',{name:'Confirm upgrade',exact:true}).click();
 await p.waitForFunction(i=>propertyRarity('stockholm',i)===2,result.square);
 check('building upgrade spends SC 200M and zero Coins',await p.evaluate(d=>SkylineEarnedCash.balance()===d.sc-200&&PREF.coins===d.coins&&propertyRarity('stockholm',d.square)===2,result));
 check('current match rarity is unchanged by permanent upgrade',await p.evaluate(i=>!P(0).estate[i],result.square));
 check('extra Coins cannot replace insufficient saved SC',await p.evaluate(async i=>{const coins=PREF.coins;PREF.tokWins['🚌']=3;savePref();try{await upgradeCollection('estate',i,2,'stockholm');return false}catch(e){return /saved SC/.test(e.message)&&PREF.coins===coins}},result.square));
 const retry=await p.evaluate(async d=>{try{await upgradeCollection('estate',d.square,1,'stockholm');return false}catch{return SkylineEarnedCash.balance()===d.sc-200}},result);check('stale repeated upgrade cannot double-spend SC',retry);
 await p.evaluate(i=>{delete PREF.estateRarity.stockholm[i];savePref()},result.square);await p.reload();await ready();check('paid SC rarity recovers after backup rollback without recharging',await p.evaluate(d=>propertyRarity('stockholm',d.square)===2&&SkylineEarnedCash.balance()===d.sc-200,result));
 for(const vp of [{width:956,height:440},{width:844,height:390},{width:667,height:320}]){
  await p.setViewportSize(vp);
  await p.evaluate(()=>{GEN++;FAST=true;applyCity('stockholm');newGame({cash:1600,set:{city:'stockholm',mode:'classic',ai:'normal',perks:false,minigames:false},players:[{name:'Hotfix QA',tok:'🚌',col:PCOL[0],ai:false,owner:true},{name:'AI',tok:TOKENS[1],col:PCOL[1],ai:true}]});FAST=false;G.phase='post';PROP_IDX.slice(0,16).forEach((i,k)=>G.own[i]={o:0,h:0,m:k<3});openAssets(P(0))});
  await p.getByRole('tab',{name:'Mortgaged',exact:true}).click();
  const geometry=await p.evaluate(()=>{const l=document.querySelector('.pf2g').getBoundingClientRect();return{list:l.height,buttons:[...document.querySelectorAll('[data-redeem]')].map(b=>({h:b.getBoundingClientRect().height,text:b.textContent})),overview:getComputedStyle(document.querySelector('.pf3overview')).display}});
  check('readable mortgage list and three direct 48px actions '+vp.width,geometry.list>=125&&geometry.buttons.length===3&&geometry.buttons.every(b=>b.h>=48)&&geometry.overview==='none');
  await p.addStyleTag({content:'.achpop,.xpfloat,.coinfloat{visibility:hidden!important}'});await p.screenshot({path:path.join(out,`mortgage-${engine}-${native?'native':'web'}-${vp.width}.png`)});
  const money=await p.evaluate(()=>{const i=+document.querySelector('[data-redeem]').dataset.redeem;return{i,cash:P(0).cash,cost:unmCost(i)}});
  await p.locator('[data-redeem]').first().tap();check('direct redemption uses exact existing mortgage rule '+vp.width,await p.evaluate(d=>!G.own[d.i].m&&P(0).cash===d.cash-d.cost,money));
  await p.getByRole('button',{name:'Close',exact:true}).click();await p.locator('.mp.pf2').waitFor({state:'detached'});
 }
 check('practice does not silently change career or trophies',await p.evaluate(()=>{G.over=true;G.scAssisted=true;const before=[PREF.coins,PREF.trophies,careerWins()].join();const r=progressGameEnd(P(0));return r===null&&[PREF.coins,PREF.trophies,careerWins()].join()===before}));
 await p.evaluate(()=>homeTab('season'));check('practice launch button explicitly says no rewards',await p.locator('.skyline-sc-use').innerText()==='Practice bonus (no rewards)');
 check('no browser exceptions',report.errors.length===0);await c.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`hotfix-${engine}-${native?'native':'web'}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();console.log('HOTFIX',report.checks.length,'checks')});

