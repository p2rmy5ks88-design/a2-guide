'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results/social'),engine=process.env.VISUAL_ENGINE||'chromium';
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
 async function ready(){await p.waitForFunction(()=>!!window.SkylineSocial&&!document.querySelector('#boot'));await p.waitForTimeout(500);await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}.ov.bye{display:none!important}'})}
 await p.goto(url);await ready();

 const checks=await p.evaluate(async()=>{const out=[],ok=(n,v)=>{if(!v)throw Error(n);out.push(n)};
  const oldStart=startWith;startWith=()=>{};let item;
  const before={coins:PREF.coins,xp:PREF.xp,sc:SkylineEarnedCash.balance(),save:localStorage.getItem(SKEY)};
  try{item=SkylineSocial.create('lagos','worth');const code=SkylineSocial.encode({invite:item.invite});ok('invitation contains no wallet, UID or save',!JSON.stringify(item.invite).match(/wallet|uid|coins|name|save/));ok('invitation round trips',SkylineSocial.decode(code).invite.id===item.invite.id);
   const adopted=SkylineSocial.accept(code);ok('repeated invitations retain one status record',SkylineSocial.history().length===1&&adopted.invite.id===item.invite.id);
   SkylineSocial.begin(item);const a=JSON.stringify({keys:G.keys,chance:G.chance,esusu:G.esusu,cash:G.players.map(p=>p.cash),first:G.first,own:G.own}),seed=JSON.stringify(G.friendChallenge.rng);const dice=[];for(let i=0;i<30;i++){for(let n=0;n<100;n++)Math.random();dice.push(SkylineSocial.random('dice'))}
   SkylineSocial.begin(item);const b=JSON.stringify({keys:G.keys,chance:G.chance,esusu:G.esusu,cash:G.players.map(p=>p.cash),first:G.first,own:G.own});ok('same seed gives same decks, key order, cash and empty properties',a===b&&G.own.every(o=>o.o<0));ok('presentation randomness cannot affect challenge dice',dice.every(x=>x===SkylineSocial.random('dice')));
   const saved=JSON.parse(JSON.stringify(G));const next=SkylineSocial.random('dice');G=saved;ok('resumed RNG continues the saved stream',next===SkylineSocial.random('dice'));
   ok('standardized challenge excludes perks, events, practice and profile progress',G.set.perks===false&&G.set.events===false&&G.set.events2===false&&G.set.marketPulse===false&&!G.scAssisted&&!trackable());
   G.over=true;G.round=11;G.masteryId='casual-fixture';G.players[0].cash=2000;GROUPS.brown.forEach(i=>G.own[i]={o:0,h:2,m:false});const result=SkylineSocial.capture();ok('completion derives actual ownership and net worth',result.properties===GROUPS.brown.length&&result.score===netWorth(G.players[0]));ok('anonymous result is the default',result.name==='Skyline Player');
   const frozen=JSON.stringify(result);G.players[0].cash=999999;ok('completed attempt cannot be replaced by a replay',JSON.stringify(SkylineSocial.capture())===frozen);
   const mine=SkylineSocial.history()[0];const friend={...result,score:result.score,cash:result.cash};const reply=SkylineSocial.encode({invite:item.invite,result:friend});SkylineSocial.accept(reply);ok('valid matching results compare as a tie',SkylineSocial.compare(SkylineSocial.history()[0])==='tie');
   let rejected=false;try{SkylineSocial.accept(SkylineSocial.encode({invite:item.invite,result:{...friend,score:999999999}}))}catch{rejected=true}ok('altered inconsistent score rejected',rejected);
   rejected=false;try{SkylineSocial.decode(SkylineSocial.encode({invite:{...item.invite,created:Date.now()-8*864e5,expires:Date.now()-864e5}}))}catch{rejected=true}ok('expired invitation rejected',rejected);
   rejected=false;try{SkylineSocial.decode('x'.repeat(15000))}catch{rejected=true}ok('oversized invitation rejected',rejected);
   PREF.social={rankings:false,shareName:false,invitations:false};rejected=false;try{SkylineSocial.accept(code)}catch{rejected=true}ok('unwanted invitations can be disabled',rejected);PREF.social.invitations=true;
   const oldRaw=FIRE?.raw;let writes=0;if(FIRE)FIRE.raw=async()=>writes++;await lbSubmit();if(FIRE)FIRE.raw=oldRaw;ok('legacy public scores opt out by default',writes===0);
   ok('casual share snapshot identifies unverified provenance',SkylineShowcase.capture(0).event.includes('device-reported'));
   ok('casual operations preserve SC, Coins, XP and saved match',PREF.coins===before.coins&&PREF.xp===before.xp&&SkylineEarnedCash.balance()===before.sc&&localStorage.getItem(SKEY)===before.save);
   ok('verified availability matches the explicit release configuration',SkylineVerified.enabled===SKYLINE_COMPETITION.enabled);
   window.socialExample=SkylineSocial.history()[0];
  }finally{startWith=oldStart}return out;
 });checks.forEach(n=>check(n,true));
 await p.evaluate(()=>homeTab('leagues'));await p.locator('.social-card').waitFor();await p.locator('.social-history article').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`social-${engine}-comparison.png`)});
 for(const size of [{width:844,height:390},{width:844,height:320},{width:667,height:375}]){await p.setViewportSize(size);await p.locator('[data-accept]').scrollIntoViewIfNeeded();const b=await p.locator('[data-accept]').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{h:r.height,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,hit:e===hit||e.contains(hit)}});check(size.width+'x'+size.height+' touch action fits and receives touches',b.h>=44&&b.inside&&b.hit)}
 await p.evaluate(()=>{void SkylineSocial.share(window.socialExample)});await p.locator('.social-modal textarea').waitFor();check('Safari fallback provides selectable invitation/result link',(await p.locator('.social-modal textarea').inputValue()).includes('#friend='));await p.screenshot({path:path.join(out,`social-${engine}-share.png`)});await p.getByRole('button',{name:'Close',exact:true}).click();
 await p.reload();await ready();check('challenge status survives refresh',await p.evaluate(()=>SkylineSocial.history().length===1&&!!SkylineSocial.history()[0].mine));
 const invite=await p.evaluate(()=>SkylineSocial.encode({invite:SkylineSocial.history()[0].invite,result:SkylineSocial.history()[0].mine}));
 const other=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'});await other.route('https://**/*',r=>process.env.SHOWCASE_LIVE_URL&&r.request().url().startsWith(new URL(url).origin)?r.continue():r.abort());const q=await other.newPage();q.on('pageerror',e=>report.errors.push(String(e)));await q.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Second QA',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:700,scReserve:55})));await q.goto(url+'#friend='+invite);await q.waitForFunction(()=>window.SkylineSocial&&!document.querySelector('#boot'));
 check('another browser opens invitation without automatically starting a match',await q.getByRole('button',{name:'Open friendly invitation',exact:true}).isVisible());await q.getByRole('button',{name:'Open friendly invitation',exact:true}).click();await q.locator('[data-accept]').click();
 check('second browser accepts conditions and sender result',await q.evaluate(()=>SkylineSocial.history().length===1&&!!SkylineSocial.history()[0].friend&&!SkylineSocial.history()[0].mine));
 const reply=await q.evaluate(()=>{const old=startWith;startWith=()=>{};try{const item=SkylineSocial.history()[0];SkylineSocial.begin(item);G.round=11;G.over=true;G.players[0].cash=1000;SkylineSocial.capture();const h=SkylineSocial.history()[0];return SkylineSocial.encode({invite:h.invite,result:h.mine})}finally{startWith=old}});
 await p.evaluate(code=>SkylineSocial.accept(code),reply);check('two-browser exchange compares completed matching attempts',await p.evaluate(()=>SkylineSocial.compare(SkylineSocial.history()[0])==='you'));check('second browser wallet and Coins remain intact',await q.evaluate(()=>SkylineEarnedCash.balance()===55&&PREF.coins===700));await other.close();
 check('no browser exceptions',report.errors.length===0);await context.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`social-${engine}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));console.log('SOCIAL',engine,report.checks.length,'checks')});
