// Real game page + real player HTTP handler (in-memory Firestore, fixture ID tokens).
// Proves the glue: migration choice, sync of earning/spending, one balance on a
// second device, backups, and that the default build keeps cloud sync off.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createPlayerHandler,createRateLimiter}=require('../security/service/player-http.cjs');
const {createFakeFirestore}=require('../security/service/firestore-fake.cjs');
const {createProfileService}=require('../security/service/profile-service.cjs');
const root=path.resolve(__dirname,'../..'),shots=process.env.SKYLINE_SHOTS||'';let browser,server,api;const errors=[];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
(async()=>{
 server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,url=origin+'/skyline-estates/index.html';
 const db=createFakeFirestore(),profile=createProfileService({db,environment:'sandbox',verifyIdToken:async t=>{if(!/^[a-z]+$/.test(t))throw Error('bad');return{uid:t,auth_time:0,firebase:{sign_in_provider:'apple.com'}}}});
 api=http.createServer(createPlayerHandler({profile,allowedOrigins:new Set([origin]),limiter:createRateLimiter({perMinute:10000})}));await new Promise(r=>api.listen(0,'127.0.0.1',r));const service='http://127.0.0.1:'+api.address().port;
 browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const check=(name,ok)=>{assert.ok(ok,name);console.log('PASS',name)};
 async function device(prefs,{uid='alice',cloud=true,viewport={width:956,height:440}}={}){
  const ctx=await browser.newContext({serviceWorkers:'block',viewport,hasTouch:true}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(p=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify(p))},{nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,...prefs});
  await page.route('https://**/*',r=>r.abort());
  if(cloud){await page.route('**/lib/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.SKYLINE_CLOUD=Object.freeze({enabled:true,purchases:false,service:${JSON.stringify(service)}});`}));
   await page.route('**/lib/accounts.js',r=>r.fulfill({contentType:'text/javascript',body:`window.SkylineAccounts={open(){},close(){},enabled:()=>true,player:async()=>window.__uid?{uid:window.__uid,token:window.__uid}:null,subscribe:async()=>()=>{}};window.__uid=${JSON.stringify(uid)};`}))}
  await page.goto(url);await page.waitForFunction(()=>typeof PREF==='object'&&typeof addCoins==='function');return{ctx,page};
 }
 // 1. Default build: cloud stays off, nothing contacts a service.
 {const {ctx,page}=await device({coins:321},{cloud:false});await page.waitForTimeout(2500);
  check('default build keeps cloud sync and purchases off',await page.evaluate(()=>window.SKYLINE_CLOUD.enabled===false&&window.SKYLINE_CLOUD.purchases===false&&!window.SkylineCloud&&PREF.coins===321&&!PREF.cloudOwner));await ctx.close()}
 // 2. First device: choice prompt, then progress moves once.
 const A=await device({coins:900,xp:400,inv:{tok:{bus:1}},tokLv:{bus:2}});
 await A.page.getByRole('button',{name:'Move my progress'}).waitFor({timeout:8000});
 if(shots)await A.page.screenshot({path:path.join(shots,'cloud-first-device.png')});
 await A.page.getByRole('button',{name:'Move my progress'}).click();
 await A.page.waitForFunction(()=>PREF.cloudOwner==='alice');
 let p=await profile.get('alice');check('first device moved coins, XP and collection to the account',p.coins===900&&p.xp===400&&p.inv.tok.bus===true&&p.max.tokLv.bus===2);
 check('a full device backup was kept',await A.page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('skylinePrefs.backup.'))));
 // 3. Earning and spending through the game's own functions reach the server.
 await A.page.evaluate(async()=>{addCoins(150,'Browser test');spendCoins(50);await new Promise(r=>setTimeout(r,50));await SkylineCloud.sync()});
 p=await profile.get('alice');check('earning and spending synced to one balance',p.coins===1000);
 // 4. Second device: merge prompt, device coins stay in backup, ONE balance shown.
 const B=await device({coins:5000,xp:10,inv:{tok:{eagle:1}}},{viewport:{width:390,height:844}});
 await B.page.getByRole('button',{name:"Add this device's collection"}).waitFor({timeout:8000});
 if(shots)await B.page.screenshot({path:path.join(shots,'cloud-second-device-portrait.png')});
 await B.page.getByRole('button',{name:"Add this device's collection"}).click();
 await B.page.waitForFunction(()=>PREF.cloudOwner==='alice');
 const b=await B.page.evaluate(()=>({coins:PREF.coins,toks:Object.keys(PREF.inv.tok).sort(),xp:PREF.xp}));
 check('second device shows the account balance, not the sum',b.coins===1000);check('second device collection merged',JSON.stringify(b.toks)==='["bus","eagle"]'&&b.xp===400);
 await A.page.evaluate(()=>SkylineCloud.sync());check('first device receives the merged collection',await A.page.evaluate(()=>!!PREF.inv.tok.eagle));
 // 5. Spending on device B is visible on device A.
 await B.page.evaluate(async()=>{spendCoins(200);await new Promise(r=>setTimeout(r,50));await SkylineCloud.sync()});await A.page.evaluate(()=>SkylineCloud.sync());
 check('spend on one device appears on the other',await A.page.evaluate(()=>PREF.coins)===800&&(await profile.get('alice')).coins===800);
 // 6. Reload keeps owner and state; no double counting.
 await A.page.reload();await A.page.waitForFunction(()=>typeof SkylineCloud==='object');await A.page.evaluate(()=>SkylineCloud.sync());
 check('reload keeps the same balance',await A.page.evaluate(()=>PREF.coins)===800&&(await profile.get('alice')).coins===800);
 check('no page errors',errors.length===0);
 console.log('CLOUD SYNC BROWSER PASS');
})().catch(e=>{console.error(e,errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();for(const s of [server,api])if(s)await new Promise(r=>s.close(r))});
