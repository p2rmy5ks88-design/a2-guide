// Coin pack purchases on the iOS app: tapping a pack always shows something. A loading panel while the
// App Store opens, and a visible message (on the home-screen shop, where in-game toasts are hidden) when
// a purchase cannot start: not signed in, email not verified (client or server side), pack not
// returned by StoreKit, or a service error. Uses the real game page with a stand-in StoreKit plugin.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),shots=process.env.SKYLINE_SHOTS||'';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json'};
const SERVICE='https://skyline-test.invalid/skylinePlayer';let browser,server,checks=0;const errors=[];
const check=(name,ok,detail)=>{assert.ok(ok,name+(detail!==undefined?' '+JSON.stringify(detail):''));checks++;console.log('PASS',name)};
(async()=>{
 server=http.createServer((q,r)=>{const p=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
 browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 // who: null | {verified,providers}; products: list of ids StoreKit returns; binding: HTTP status for /v1/store/binding
 async function open({who={verified:true,providers:['password']},products=['coins_600','coins_1500','coins_4000','coins_10000'],binding=200}={}){
  const ctx=await browser.newContext({viewport:{width:956,height:440},hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(({who,products})=>{
   if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:705}));
   window.__calls=[];window.__who=who;window.__release=null;
   const plugin={products:async()=>({products:products.map(id=>({id:'com.kenstylez.skylineestates.'+id,title:id,displayPrice:'9,00 kr'})),canMakePayments:true}),
    purchase:o=>{window.__calls.push(['purchase',o.productId]);return new Promise(r=>{window.__release=()=>r({state:'cancelled'})})},
    unfinished:async()=>({transactions:[]}),finish:async()=>({finished:true}),recentPurchases:async()=>({purchases:[]}),addListener:async()=>({remove:async()=>{}})};
   window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',isPluginAvailable:n=>n==='SkylineStoreKit',Plugins:{SkylineStoreKit:plugin}};
  },{who,products});
  await page.route('https://**/*',r=>r.request().url().startsWith(SERVICE)?null:r.abort());
  await page.route(SERVICE+'/**',r=>{const u=new URL(r.request().url());const json=(s,b)=>r.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(b)});
   if(r.request().method()==='OPTIONS')return json(204,{});
   if(u.pathname.endsWith('/v1/store/binding'))return binding===200?json(200,{appAccountToken:'0f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b'}):json(binding,{error:binding===403?'persistent-account-required':'unavailable'});
   if(u.pathname.endsWith('/v1/wallet/history'))return json(200,{coins:0,entries:[]});
   // Profile sync is refused like the real service does for an unverified email; purchases are what this test covers.
   return json(403,{error:'persistent-account-required'})});
  await page.route('**/lib/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.SKYLINE_CLOUD=Object.freeze({enabled:true,purchases:true,channel:'private-testing',service:${JSON.stringify(SERVICE)}});`}));
  await page.route('**/lib/accounts.js',r=>r.fulfill({contentType:'text/javascript',body:`window.SkylineAccounts={open(){window.__calls.push(['account-open'])},close(){},enabled:()=>true,player:async force=>{window.__calls.push(['player',!!force]);return window.__who?{uid:'tester',token:'t',providers:window.__who.providers,verified:window.__who.verified}:null},subscribe:async()=>()=>{}};`}));
  await page.goto(url);await page.waitForFunction(()=>typeof IAP==='object'&&window.SkylineCloud?.purchasesReady?.()===true,null,{timeout:15000});
  await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:12000});await page.waitForTimeout(4600);return{ctx,page}}
 // Tap the first coin pack the way a player does: Shop > Coins > pack button.
 async function tapPack(page){await page.evaluate(()=>homeTab('shop'));const tab=page.getByRole('tab',{name:/coins/i}).or(page.getByRole('button',{name:/^coins$/i})).first();if(await tab.count())await tab.click().catch(()=>{});
  const btn=page.locator('.igrid [data-i="0"]').first();if(await btn.count()&&await btn.isVisible())await btn.click();else await page.evaluate(()=>{IAP.buy(IAP_PACKS[0])})}
 const dialog=page=>page.locator('.mp').last();
 const visibleText=async(page,re)=>{const d=dialog(page);await d.waitFor({state:'visible',timeout:6000});const t=await d.innerText();const box=await d.boundingBox();return{ok:re.test(t)&&!!box&&box.width>100&&box.height>60,t}};
 // 1. email not verified on the device: clear message, account shortcut, App Store never opened
 {const {ctx,page}=await open({who:{verified:false,providers:['password']}});await tapPack(page);const v=await visibleText(page,/Verify your email first/);
  check('unverified email shows a visible verify message on the home shop',v.ok,v.t);check('the home in-game layer (toasts) is hidden here, so the message is a dialog',await page.evaluate(()=>document.getElementById('ui').hidden===true));
  if(shots){await page.waitForTimeout(900);await page.screenshot({path:path.join(shots,'purchase-verify-first.png')})}
  await page.getByRole('button',{name:'Open account'}).click();const calls=await page.evaluate(()=>window.__calls);
  check('Open account opens Account & recovery and no App Store sheet was requested',calls.some(c=>c[0]==='account-open')&&!calls.some(c=>c[0]==='purchase'),calls);
  check('a fresh account read is used so a verification done meanwhile counts',calls.some(c=>c[0]==='player'&&c[1]===true));await ctx.close()}
 // 2. server says the account is not verified (403 persistent-account-required)
 {const {ctx,page}=await open({binding:403});await tapPack(page);const v=await visibleText(page,/Verify your email first/);check('server-side verification refusal is shown, not swallowed',v.ok,v.t);
  check('no App Store sheet after a refused binding',!(await page.evaluate(()=>window.__calls)).some(c=>c[0]==='purchase'));await ctx.close()}
 // 3. StoreKit returns no products (App Store metadata not ready)
 {const {ctx,page}=await open({products:[]});await tapPack(page);const v=await visibleText(page,/Coin pack not available/);check('missing App Store product shows a visible message',v.ok,v.t);await ctx.close()}
 // 4. not signed in
 {const {ctx,page}=await open({who:null});await tapPack(page);const v=await visibleText(page,/Sign in to buy coins/);check('signed-out player is told to sign in',v.ok,v.t);await ctx.close()}
 // 5. service unreachable
 {const {ctx,page}=await open({binding:500});await tapPack(page);const v=await visibleText(page,/Purchase not completed/);check('service error is shown with a nothing-was-charged message',v.ok&&/Nothing was charged/.test(v.t),v.t);await ctx.close()}
 // 6. happy path: loading panel while the App Store sheet is open, then it clears
 {const {ctx,page}=await open();await tapPack(page);await page.waitForFunction(()=>window.__calls.some(c=>c[0]==='purchase'),null,{timeout:6000});
  const b=await page.evaluate(()=>{const o=document.querySelector('.sky-busy');if(!o)return null;const r=o.getBoundingClientRect();return{text:o.innerText,w:r.width,h:r.height}});
  check('a visible loading panel is shown while the App Store sheet is open',!!b&&/Opening the App Store/.test(b.text)&&b.w>0&&b.h>0,b);
  check('the App Store sheet is requested for the tapped pack',(await page.evaluate(()=>window.__calls)).some(c=>c[0]==='purchase'&&c[1]==='com.kenstylez.skylineestates.coins_600'));
  if(shots){await page.waitForTimeout(900);await page.screenshot({path:path.join(shots,'purchase-loading.png')})}
  await page.evaluate(()=>window.__release());await page.waitForFunction(()=>!document.querySelector('.sky-busy'),null,{timeout:5000});check('the loading panel clears when the sheet closes',true);await ctx.close()}
 check('no page errors',errors.length===0,errors);
 console.log('PURCHASE START SUMMARY',JSON.stringify({checks}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
