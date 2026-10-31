// Collection Vault phase 1: existing inventory, navigation and profile remain functional.
// Read-only visual changes must never invent items, entitlements or game rewards.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)){r.writeHead(403);return r.end()}fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(b)})});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[];let checks=0;
 const test=(label,yes,details)=>{assert.ok(yes,label+' '+JSON.stringify(details||{}));checks++;console.log('PASS',label)};
 for(const vp of [{width:1920,height:1080},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'VaultTester',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:1500,xp:2000,trophies:3}))});
  await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
  await page.waitForFunction(()=>!!document.querySelector('#title .hd-stage'),null,{timeout:20000});
  await page.locator('#boot').waitFor({state:'detached',timeout:20000});
  // Check the new illustration assets and conditional reward selection without altering saved data.
  const artwork=await page.evaluate(async()=>{
   const load=src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=src});
   const files=await Promise.all(['art/golden-rooftop-garden.svg','art/skyline-gala.svg'].map(load));
   const origNow=Date.now;
   let spotlight='',filter='',seasonArt='',seasonNumber=0;
   try {
    Date.now=()=>Date.UTC(2026,9,26,12);
    setup.city='lagos';homeTab('play');
    spotlight=document.querySelector('#hdSpot .th')?.getAttribute('style')||'';
    filter=getComputedStyle(document.querySelector('.hd-bg.art .hd-photo')).filter;
    seasonArt=document.querySelector('#qSeason')?.getAttribute('style')||'';
    seasonNumber=season().n;
   }finally{Date.now=origNow;homeTab('play')}
   return {files,spotlight,filter,seasonArt,seasonNumber};
  });
  test('Lagos artwork is brighter and reward thumbnail uses the matching rooftop',artwork.files.every(Boolean)&&artwork.filter.includes('brightness(1.14)')&&artwork.spotlight.includes('art/golden-rooftop-garden.svg')&&(artwork.seasonNumber===2?artwork.seasonArt.includes('art/skyline-gala.svg'):artwork.seasonArt.includes('art/shop.jpg')),artwork);
  await page.evaluate(()=>{window.__artClock=Date.now;Date.now=()=>Date.UTC(2026,9,26,12);setup.city='lagos';homeTab('play')});
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-home-art-'+vp.width+'.png')});
  await page.evaluate(()=>{Date.now=window.__artClock;delete window.__artClock;homeTab('collection')});
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-vault-'+vp.width+'.png')});
  const info=await page.evaluate(()=>({
   labels:[...document.querySelectorAll('.cv-category b')].map(x=>x.textContent),
   active:document.querySelector('.cv-category[aria-selected=true] b')?.textContent,
   tokenActual:TOKENS.concat(NEW_TOKENS).filter(tokenUnlocked).length,
   tokenLabel:document.querySelector('[data-vault-tab=tokens] small')?.textContent,
   charVisible:[...document.querySelectorAll('.cv-category')].some(x=>/Characters/i.test(x.textContent)),
   dock:document.querySelector('.hd-di.on')?.textContent.trim()
  }));
  test('vault categories and real owned tokens at '+vp.width,JSON.stringify(info.labels)===JSON.stringify(['Token Vault','Buildings','Board Worlds','Prestige'])&&info.active==='Token Vault'&&info.tokenLabel.startsWith(info.tokenActual+' / ')&&!info.charVisible&&info.dock==='Collection',info);
  await page.click('[data-vault-tab=buildings]');
  const buildings=await page.evaluate(()=>({tab:setup.tab,active:document.querySelector('.cv-category[aria-selected=true] b')?.textContent,preview:document.querySelectorAll('.bldc,.roofrow').length}));
  test('building development and rooftop controls preserved',buildings.tab==='buildings'&&buildings.active==='Buildings'&&buildings.preview>=6,buildings);
  await page.click('[data-vault-tab=vault-worlds]');
  const worlds=await page.evaluate(()=>({count:document.querySelectorAll('.cv-world-card').length,actual:SURROUND_PREMIUM.length,own:document.querySelector('[data-vault-tab=vault-worlds] small')?.textContent,owned:SURROUND_PREMIUM.filter(x=>itemOwned('surr',x.id)).length,highlight:document.querySelector('.hd-di.on')?.textContent.trim()}));
  test('Board Worlds uses real cosmetics and ownership',worlds.count===worlds.actual&&worlds.own.startsWith(worlds.owned+' / ')&&worlds.highlight==='Collection',worlds);
  await page.click('.cv-open-shop');
  const shop=await page.evaluate(()=>({tab:setup.tab,cat:setup.shopTab}));
  test('Board Worlds opens the existing surround Shop',shop.tab==='shop'&&shop.cat==='surr',shop);
  await page.evaluate(()=>homeTab('collection'));
  await page.click('[data-vault-tab=frames]');
  const frames=await page.evaluate(()=>({tab:setup.tab,total:frameIds().length,label:document.querySelector('[data-vault-tab=frames] small')?.textContent,actual:frameIds().map(frameDef).filter(Boolean).filter(x=>x.own).length}));
  test('Prestige retains original frame ownership',frames.tab==='frames'&&frames.label.startsWith(frames.actual+' / '),frames);
  await page.evaluate(()=>homeTab('collection'));
  await page.click('.cv-profile-link');
  const profile=await page.evaluate(()=>({tab:setup.tab,hasChars:!!document.querySelector('.clchar'),back:!!document.querySelector('.cv-profile-back')}));
  test('Avatar customization remains accessible',profile.tab==='cast'&&profile.hasChars&&profile.back,profile);
  await page.click('.cv-profile-back');
  test('Profile returns to Vault',await page.locator('.cv-shell').count()===1);
  await ctx.close();
 }
 test('no page errors',errors.length===0,errors);
 console.log('COLLECTION VAULT',checks,'checks');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
