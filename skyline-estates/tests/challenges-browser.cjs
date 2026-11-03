'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results/challenges'),engine=process.env.VISUAL_ENGINE||'chromium';
fs.mkdirSync(out,{recursive:true});const report={engine,physicalIPhone:false,checks:[],errors:[],images:[]};let browser,server;
const check=(n,v)=>{assert.ok(v,n);report.checks.push(n);console.log('PASS',n)};
(async()=>{
 let url=process.env.SHOWCASE_LIVE_URL;
 if(!url&&process.env.SHOWCASE_FILE)url=pathToFileURL(path.join(root,'skyline-estates/index.html')).href;
 if(!url){server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`}
 report.url=url;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl',...(process.env.SHOWCASE_FILE?['--allow-file-access-from-files']:[])]}:{})});
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
 p.on('console',m=>{if(m.text().startsWith('SHOWCASE'))console.log(m.text())});
 await context.route('https://**/*',r=>process.env.SHOWCASE_LIVE_URL&&r.request().url().startsWith(new URL(url).origin)?r.continue():r.abort());
 await p.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Showcase QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,scReserve:145,coins:1740}))});
 async function ready(){await p.waitForFunction(()=>!!window.SkylineChallenges&&!document.querySelector('#boot'));await p.waitForTimeout(500);await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}.ov.bye{display:none!important}'})}
 await p.goto(url);await ready();

 const result=await p.evaluate(async()=>{
  const checks=[];const ok=(n,v)=>{if(!v)throw Error(n);checks.push(n)};
  const ledger=SkylineSCWallet.create(localStorage,()=>Date.now()-180000);
  const beforeSave=localStorage.getItem(SKEY),oldCoins=PREF.coins,oldSC=SkylineEarnedCash.balance();
  window.challengeFixture=(city,id,owner=0)=>{GEN++;FAST=true;applyCity(city);newGame({cash:1600,set:{city,mode:'classic',ai:'normal',perks:false,minigames:false},players:[0,1].map(i=>({name:'QA '+i,tok:TOKENS[i],col:PCOL[i],ai:false,owner:i===owner}))});FAST=false;G.owner=owner;G.masteryId=id;G.round=8;G.over=true;G.players[owner].st={houses:3,buys:4,go:1};for(const ids of Object.values(GROUPS))for(const i of ids)G.own[i]={o:owner,h:city==='tokyo'?5:1,m:false};ledger.start(id,{city});return G.players[owner]};
  const me=challengeFixture('lagos','qual-0');ok('qualified local completion recorded',!!SkylineChallenges.record(me));ok('duplicate match receipt rejected',!SkylineChallenges.record(me));
  const snap=JSON.stringify(PREF),cash=G.players[0].cash;const spec=SkylineChallenges.specs.find(s=>s.city==='lagos');ok('actual Arts district objective completes',SkylineChallenges.value(spec)===3);
  ok('render does not grant rewards',PREF.coins===oldCoins&&SkylineEarnedCash.balance()===oldSC);
  const a=await SkylineChallenges.claim(spec.id);ok('city reward claimed',a.ok);ok('saved SC credited once',SkylineEarnedCash.balance()===oldSC+25);ok('Coins credited once',PREF.coins>=oldCoins+60);ok('XP and Season XP integrated',PREF.xp>=200&&season().sxp>=200);ok('cosmetic unlocked in existing inventory',itemOwned('dice','mint'));ok('match cash unchanged',G.players[0].cash===cash);
  const profile=JSON.stringify(PREF),sc=SkylineEarnedCash.balance();ok('duplicate claim rejected',!(await SkylineChallenges.claim(spec.id)).ok);ok('repeat claim changes no balances',PREF.coins===JSON.parse(profile).coins&&PREF.xp===JSON.parse(profile).xp&&SkylineEarnedCash.balance()===sc);
  for(const mode of ['online','sim','scAssisted']){challengeFixture('lagos','denied-'+mode);G[mode]=true;ok(mode+' excluded',!SkylineChallenges.record(G.players[0]))}
  challengeFixture('lagos','denied-fast');FAST=true;ok('FAST simulation excluded',!SkylineChallenges.record(G.players[0]));FAST=false;
  challengeFixture('lagos','denied-short');G.round=4;ok('short matches excluded',!SkylineChallenges.record(G.players[0]));
  challengeFixture('lagos','denied-fresh');G.masteryId='fresh-start';SkylineSCWallet.create(localStorage).start('fresh-start',{city:'lagos'});ok('under two minutes excluded',!SkylineChallenges.record(G.players[0]));
  const friend=challengeFixture('stockholm','owner-one',1);G.players[0].st={houses:900};ok('pass-and-play owner records',!!SkylineChallenges.record(friend));const tx=SkylineEarnedCash.view().transactions.find(t=>t.id==='objective-match:owner-one');ok('friend stats not attributed',tx.houses===3);
  for(let i=1;i<20;i++){const c=['lagos','stockholm','tokyo'][i%3];const who=challengeFixture(c,'season-'+i);SkylineChallenges.record(who)}
  for(const id of ['season-games-v1','season-cities-v1','season-build-v1']){const s=SkylineChallenges.specs.find(s=>s.id===id);ok(id+' reaches target',SkylineChallenges.value(s)===s.target);ok(id+' claims', (await SkylineChallenges.claim(id)).ok)}
  const now=Date.now,latest=season().n;Date.now=()=>SEASON_EPOCH-864e5;ok('clock rollback retains Season and claim flags',season().n===latest&&!!SkylineChallenges.claims()['s'+latest+':'+spec.id]);Date.now=()=>SEASON_EPOCH+(latest-1)*SEASON_LEN+1;ok('next Season resets new objectives',season().n===latest+1&&SkylineChallenges.value(spec)===0);Date.now=now;
  ok('wallet and inventory survive Season reset',itemOwned('dice','mint')&&SkylineEarnedCash.balance()>=oldSC+25);ok('existing save key preserved',localStorage.getItem(SKEY)===beforeSave);

  const who=challengeFixture('stockholm','storage-recovery');SkylineChallenges.record(who);const stock=SkylineChallenges.specs.find(s=>s.city==='stockholm');
  const originalSet=Storage.prototype.setItem,cb=PREF.coins,xb=PREF.xp,sb=SkylineEarnedCash.balance();let failed=false;
  Storage.prototype.setItem=function(k,v){if(k===PKEY&&!failed){failed=true;throw Error('quota probe')}return originalSet.call(this,k,v)};
  const rejected=await SkylineChallenges.claim(stock.id);Storage.prototype.setItem=originalSet;
  ok('profile write failure rejects claim',!rejected.ok);ok('failed profile commit preserves rewards',PREF.coins===cb&&PREF.xp===xb&&SkylineEarnedCash.balance()===sb);
  ok('failed profile claim can retry safely',(await SkylineChallenges.claim(stock.id)).ok);
  const dub=challengeFixture('dubai','wallet-recovery');SkylineChallenges.record(dub);const ds=SkylineChallenges.specs.find(s=>s.city==='dubai');let broken=false;
  Storage.prototype.setItem=function(k,v){if(k.includes('objective-reward')&&!broken){broken=true;throw Error('wallet probe')}return originalSet.call(this,k,v)};
  const interrupted=await SkylineChallenges.claim(ds.id);Storage.prototype.setItem=originalSet;const committedCoins=PREF.coins,committedXP=PREF.xp;
  ok('interrupted SC write reports pending recovery',!interrupted.ok);SkylineChallenges.repair();
  ok('SC receipt recovery retains claimed profile rewards',PREF.coins===committedCoins&&PREF.xp===committedXP&&SkylineEarnedCash.view().transactions.some(t=>t.id==='objective-reward:s'+season().n+':'+ds.id));
  const concurrent=await Promise.all([SkylineChallenges.claim(ds.id),SkylineChallenges.claim(ds.id)]);ok('concurrent retries cannot repeat rewards',concurrent.every(r=>!r.ok)&&PREF.coins===committedCoins);
  G.progDone=false;const replayBefore=JSON.stringify(PREF);progressGameEnd(dub);ok('replayed finished match cannot grant existing profile rewards',JSON.stringify(PREF)===replayBefore);
  return checks;
 });result.forEach(n=>check(n,true));
 for(const tab of ['daily','season','spotlight','ach','shop','portfolio']){await p.evaluate(tab=>homeTab(tab),tab);await p.waitForTimeout(80);check(tab+' opens without exceptions',report.errors.length===0)}
 await p.evaluate(()=>homeTab('season'));await p.locator('.challenge-extension summary').click();await p.locator('.challenge-cards article').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`challenges-${engine}-season.png`)});
 const last=p.locator('[data-objective]').last();await last.scrollIntoViewIfNeeded();check('landscape objective action remains reachable',await last.isVisible());
 await p.reload();await ready();check('claimed objective receipt survives refresh',await p.evaluate(()=>Object.keys(SkylineChallenges.claims()).length>=4));
 check('no browser exceptions',report.errors.length===0);await context.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`challenges-${engine}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));console.log('CHALLENGES',engine,report.checks.length,'checks')});
