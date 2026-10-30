// A release without in-app purchases: no coin-pack tab, no starter bundle, no "+" on the coin pill and
// no "Get coins" path; every such entry explains how to earn coins instead. Earning and spending
// gameplay coins, owned items and saves are unchanged.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');let browser,server,checks=0;const errors=[];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json'};
const check=(name,ok,detail)=>{assert.ok(ok,name+(detail!==undefined?' '+JSON.stringify(detail):''));checks++;console.log('PASS',name)};
(async()=>{
 server=http.createServer((q,r)=>{const p=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
 browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const ctx=await browser.newContext({viewport:{width:956,height:440},hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 // Same as the App Store build without purchases: native iOS, accounts on, purchases off.
 await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:705}));
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',isPluginAvailable:n=>n==='SkylineStoreKit',Plugins:{SkylineStoreKit:{products:async()=>{window.__store=true;return{products:[]}},purchase:async()=>{window.__store=true},unfinished:async()=>({transactions:[]}),addListener:async()=>({remove:async()=>{}})}}}});
 await page.route('https://**/*',r=>r.abort());
 // A purchases-off native config (as shipped in iOS 1.0); the store must stay hidden whenever purchases is false.
 await page.route('**/lib/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'skyline-estates-app/cloud/ios-release.js'),'utf8').replace('purchases:ios','purchases:false')}));
 await page.goto(url);await page.waitForFunction(()=>typeof homeTab==='function'&&typeof COIN_SALES==='function');await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:12000});
 const cfg=await page.evaluate(()=>window.SKYLINE_CLOUD);
 check('release config: accounts on, purchases off, only inside the iOS app',cfg.enabled===true&&cfg.purchases===false&&cfg.channel==='ios-release',cfg);
 check('no coin sales in this release',await page.evaluate(()=>COIN_SALES()===false&&!window.SkylineCloud?.purchasesReady?.()));
 const before=await page.evaluate(()=>JSON.stringify({coins:PREF.coins,inv:PREF.inv}));
 await page.evaluate(()=>{setup.shopTab='coins';homeTab('shop')});
 check('shop has no Coins tab and opens on Daily',await page.locator('.shoptabs [data-k="coins"]').count()===0&&await page.locator('.shoptabs .stab.on').getAttribute('data-k')==='daily');
 check('no starter bundle or price buttons for coin packs',await page.locator('#bStarter').count()===0&&!/kr|\$\d/.test(await page.locator('#pane').innerText()));
 check('coin pill has no "+" and explains earning',await page.locator('#tbCoins .plus').count()===0&&/How to earn more/.test(await page.locator('#tbCoins').getAttribute('aria-label')));
 await page.locator('#tbCoins').click();const m=page.locator('.mp').last();await m.waitFor({state:'visible'});
 check('tapping coins shows how to earn coins',/Earn coins/.test(await m.innerText())&&/Lucky Spin/.test(await m.innerText()));
 await page.getByRole('button',{name:'OK'}).click();
 // Not enough coins for an item: the button says Earn, never Get, and opens the earn explanation.
 const short=await page.evaluate(async()=>{PREF.coins=1;const seen=[];const old=modal;modal=async c=>{seen.push({html:c.html,labels:(c.btns||[]).map(b=>b.label)});return seen.length===1?'shop':'x'};try{await confirmBuy('Test item',500,'')}finally{modal=old}return seen});
 check('not-enough-coins offers How to earn instead of Get coins, then explains earning',short[0].labels.includes('How to earn')&&!short[0].labels.includes('Get coins')&&/You need 499 more coins/.test(short[1]?.html||''),short);
 await page.evaluate(b=>{const v=JSON.parse(b);PREF.coins=v.coins},before);
 // Spending coins in the shop still works.
 const spend=await page.evaluate(()=>{PREF.coins=705;const ok=spendCoins(100);return{ok,coins:PREF.coins}});
 check('earning and spending gameplay coins still work',spend.ok!==false&&spend.coins===605&&await page.evaluate(()=>{addCoins(95,'test');return PREF.coins})===700,spend);
 check('StoreKit was never asked for products or a purchase',await page.evaluate(()=>!window.__store));
 check('no page errors',errors.length===0,errors);
 console.log('NO PURCHASES SUMMARY',JSON.stringify({checks}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
