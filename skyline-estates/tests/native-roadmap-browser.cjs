'use strict';
// Real generated native bundle. Native OS/identity/payment UI are test doubles;
// no owner account, external service, purchase or live database is contacted.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),www=path.join(root,'skyline-estates-app/www'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results/native');
fs.mkdirSync(out,{recursive:true});const report={engine,physicalIPhone:false,nativeBridges:'test doubles',checks:[],errors:[]};let browser;
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS native',name)};
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const BASE='https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition';
(async()=>{
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl']}:{})});
 const c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
 const auth=[];
 await c.route('https://**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='https://native-bundle.invalid'){
  if(u.pathname==='/lib/cloud-config.js')return r.fulfill({contentType:'text/javascript',body:"window.SKYLINE_CLOUD={enabled:false,purchases:false,channel:'ios-release'}"});
  if(u.pathname==='/lib/accounts.js')return r.fulfill({contentType:'text/javascript',body:"window.SkylineAccounts={enabled:()=>true,player:async()=>window.__nativePlayer||null,subscribe:async()=>()=>{},open(){},close(){}}"});
  const f=path.resolve(www,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(www+path.sep))return r.abort();try{return r.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})}catch{return r.fulfill({status:404,body:'missing'})}
 }
 if(r.request().url().startsWith(BASE+'/')){auth.push(r.request().headers().authorization||'');const name=u.pathname.split('/').at(-1);let data;
  if(name==='capabilities')data={protocol:1,version:1,verified:true,categories:['season','city','worth','developers','weekly'],cities:['lagos','stockholm','tokyo','dubai']};
  else if(name==='me')data={protocol:1,publicId:'native-fixture',publish:false,shareName:false,community:false,name:'SkylineGuest',badges:{}};
  else if(name==='rankings')data={protocol:1,verified:true,mode:'timed-10-two-human-v1',rows:[],myPosition:null,ends:Date.UTC(2026,11,9)};
  else if(name==='community')data={protocol:1,verified:true,title:'Skyline Bridge',total:0,goal:1000,contributed:0,claimed:false,ends:Date.UTC(2026,11,9)};
  else throw Error('Unexpected native API request');return r.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 }
 return r.abort();});
 await c.addInitScript(()=>{
  window.__nativeShares=[];window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios',isPluginAvailable:n=>n==='SkylineShare',Plugins:{SkylineShare:{shareImage:async data=>{window.__nativeShares.push(data);return {completed:!window.__cancelNativeShare}}},SplashScreen:{hide:async()=>{}},StatusBar:{hide:async()=>{}},App:{addListener:async()=>({remove(){}}),getInfo:async()=>({id:'com.kenstylez.skylineestates'})}}};
  if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Native QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:705,xp:1200}));
 });
 await p.goto('https://native-bundle.invalid/');await p.waitForFunction(()=>window.SkylineShowcase&&window.SkylineSocial&&window.SkylineChallenges&&!document.querySelector('#boot'));
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 check('all roadmap modules load from the native package',await p.evaluate(()=>!!window.SkylineEarnedCash&&typeof MP_RULE!=='undefined'&&SkylineVerified.enabled));
 const before=await p.evaluate(()=>({coins:PREF.coins,xp:PREF.xp,sc:SkylineEarnedCash.balance(),save:localStorage.getItem(SKEY)}));
 check('older native profile is retained without currency conversion or free gifts',before.coins===705&&before.xp===1200&&before.sc===0);
 await p.evaluate(()=>{FIRE.token=async()=>{throw Error('Legacy guest identity must not replace the native account')};homeTab('leagues')});
 await p.locator('[data-connect]').click();await p.waitForFunction(()=>document.querySelector('.verified-status').textContent.includes('Sign in from Account'));
 check('native verified competition requires the existing persistent account',!auth.some(x=>x.includes('native-test-token')));
 await p.evaluate(()=>window.__nativePlayer={uid:'native-test-account',token:'native-test-token'});await p.locator('[data-connect]').click();await p.locator('[data-community] progress').waitFor();
 check('native competition uses the existing native account token',auth.includes('Bearer native-test-token'));
 check('native ranking controls and genuine empty state render',await p.locator('[data-category] option').count()===5&&(await p.locator('.verified-rows').innerText()).includes('No published'));
 const record=await p.evaluate(()=>{GEN++;FAST=true;applyCity('lagos');newGame({cash:1600,set:{city:'lagos',mode:'classic',ai:'normal',perks:false,minigames:false},players:[{name:'Native QA',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Opponent',tok:TOKENS[1],col:PCOL[1],ai:true}]});FAST=false;G.owner=0;G.round=11;G.over=true;G.players[0].cash=2450;GROUPS.brown.forEach(i=>G.own[i]={o:0,h:1,m:false});G.houses=36-GROUPS.brown.length;return SkylineShowcase.capture(0)});
 check('native completed result contains actual owned properties',record?.properties===await p.evaluate(()=>GROUPS.brown.length)&&record.houses===record.properties);
 await p.evaluate(r=>SkylineShowcase.open(r),record);await p.locator('[data-share]:not([disabled])').waitFor();
 check('native export offers the OS share route without a broken blob window',await p.locator('[data-open-image]').isHidden());
 await p.locator('[data-share]').click();await p.waitForFunction(()=>window.__nativeShares.length===1);
 check('native share receives only a PNG and explicit public caption',await p.evaluate(()=>{const s=__nativeShares[0];return Object.keys(s).sort().join(',')==='base64,text'&&s.base64.startsWith('iVBORw0KGgo')&&s.text.includes('Skyline Estates')&&!s.text.includes('native-test-token')}));
 await p.evaluate(()=>window.__cancelNativeShare=true);await p.locator('[data-save-image]').click();await p.waitForFunction(()=>window.__nativeShares.length===2&&document.querySelector('.sh-status').textContent.includes('closed'));
 check('cancelling native sharing keeps the generated image usable',await p.locator('.sh-stage img').isVisible()&&await p.locator('[data-share]').isEnabled());
 await p.locator('[data-save-record]').click();check('native Showcase history saves on the device',await p.evaluate(()=>SkylineShowcase.history().items.length===1));
 await p.locator('#skyline-showcase [data-close]').click();
 check('native screens and sharing preserve balances and the existing saved match',JSON.stringify(before)===JSON.stringify(await p.evaluate(()=>({coins:PREF.coins,xp:PREF.xp,sc:SkylineEarnedCash.balance(),save:localStorage.getItem(SKEY)}))));
 await p.evaluate(()=>homeTab('leagues'));await p.locator('.verified-card').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`native-roadmap-${engine}.png`)});
 check('no native-bundle browser exceptions',report.errors.length===0);await c.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,`native-roadmap-${engine}.json`),JSON.stringify(report,null,2));if(browser)await browser.close();console.log('NATIVE ROADMAP',engine,report.checks.length,'checks')});
