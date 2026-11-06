// Profile avatars: legacy migration keeps progress, 25 distinct portraits, picker saves, riders removed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url='file://'+path.resolve(__dirname,'../index.html');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.route('https://**/*',r=>r.abort());
 const legacy={nick:'PowerLi',nickSet:true,welcomed:1,tutDone:1,flat2d:true,coins:7350,inv:{char:{kofi:1},roof:{solar:1}},eq:{char:'kofi',roof:'solar'},stats:{games:9,wins:4},trophies:75,riders:true,rig:true};
 await p.addInitScript(v=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s',1);localStorage.setItem('skylinePrefs',v)}},JSON.stringify(legacy));
 await p.goto(url);await p.locator('#boot').waitFor({state:'detached',timeout:25000});
 const m=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('skylinePrefs'));return{eq:s.eq.char,legacy:s.charLegacy,name:s.nick,coins:s.coins,inv:s.inv.char.kofi===1&&s.inv.roof.solar===1,roof:s.eq.roof,trophies:s.trophies,riders:s.riders,rig:s.rig}});
 assert.deepEqual(m,{eq:'avatar_10',legacy:'kofi',name:'PowerLi',coins:7350,inv:true,roof:'solar',trophies:75,riders:false,rig:false},'migration keeps progress');
 const b=await p.evaluate(()=>{const i=document.querySelector('#tbWho img.av-img');return i&&{w:Math.round(i.getBoundingClientRect().width),src:i.getAttribute('src')}});
 assert.ok(b&&b.w<=44&&/skyline_avatar_10/.test(b.src),'small header badge uses the avatar '+JSON.stringify(b));
 await p.evaluate(()=>{SkylineAvatars.openPicker();return 1});await p.locator('.avp-t').first().waitFor();
 const g=await p.evaluate(()=>{const t=[...document.querySelectorAll('.avp-t')];return{n:t.length,ids:new Set(t.map(x=>x.dataset.av)).size,src:new Set(t.map(x=>x.querySelector('img').getAttribute('src'))).size,w:Math.round(t[0].getBoundingClientRect().width)>=40}});
 assert.deepEqual(g,{n:25,ids:25,src:25,w:true},'25 distinct touch-sized tiles');
 await p.locator('.avp-t').nth(24).click();
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('skylinePrefs')).eq.char),'avatar_25','choice saved');
 await p.keyboard.press('Escape');await p.locator('.avpm').waitFor({state:'detached'});
 assert.equal(await p.evaluate(()=>SkylineAvatars.resolve('rosa')),'avatar_22','legacy alias kept for older saves and other players');
 assert.deepEqual(errs,[]);
 console.log('AVATARS 8 checks');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
