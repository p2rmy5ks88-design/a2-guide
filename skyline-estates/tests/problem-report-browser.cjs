// Problem report: errors are recorded on the device only, scrubbed of personal data, shown in Settings → Help & data,
// and can be copied or cleared. Nothing is sent over the network by the report itself.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:932,height:430},serviceWorkers:'block'});const posts=[];
  await ctx.route('**/*',r=>{const u=r.request().url();if(r.request().method()!=='GET')posts.push(u);return u.startsWith(origin)?r.continue():r.abort()});
  await ctx.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Kelvin',welcomed:1,tutDone:1,stats:{games:9}}))});
  const p=await ctx.newPage();
  await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  assert.equal(await p.evaluate(()=>typeof SkylineProblems.report),'function');ok('problem recorder loads before the game');
  await p.evaluate(()=>{const boom=()=>{throw new Error('Probe failure for ada.lovelace@example.com in room K7Q2Z, account uid_AbCdEfGhIjKlMnOpQrStUv')};
    setTimeout(boom,0);Promise.reject(new Error('Probe promise 123456789'));setTimeout(boom,5)});
  await p.waitForTimeout(400);
  const stored=await p.evaluate(()=>localStorage.getItem('skylineProblems'));
  assert.ok(stored.includes('Probe failure'),stored);assert.ok(!/ada\.lovelace|example\.com|K7Q2Z|AbCdEfGhIjKlMnOpQrStUv|123456789/.test(stored),stored);
  const items=JSON.parse(stored).items;assert.equal(items.find(x=>/Probe failure/.test(x.m)).n,2,JSON.stringify(items));assert.ok(items.some(x=>x.k==='promise'));
  ok('errors and failed promises are recorded once with a count, with emails, room codes, IDs and long numbers scrubbed');
  await p.evaluate(()=>(setup.stCat='help',homeTab('settings')));await p.locator('.prsec').waitFor();
  const txt=await p.locator('#prText').inputValue();assert.match(txt,/Skyline Estates problem report/);assert.match(txt,/App: Web/);assert.match(txt,/\[error\] (Error: )?Probe failure for \[email\]/);assert.match(txt,/Coach off/);
  ok('Settings → Help & data shows the report: app, device, settings and recent problems');
  await p.evaluate(()=>{window.__mail=null;Object.defineProperty(window,'__mailto',{value:null,writable:true})});
  await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await p.locator('.prsec [data-pr="copy"]').click();await p.waitForTimeout(200);assert.match(await p.locator('.prsec .prmsg').innerText(),/Copied|Selected/);
  ok('Copy report copies the text (or selects it where the clipboard is refused)');
  await p.locator('.prsec [data-pr="clear"]').click();await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>SkylineProblems.count()),0);assert.match(await p.locator('#prText').inputValue(),/No problems recorded/);
  ok('Clear removes the report from the device');
  assert.equal(posts.length,0,'no network posts: '+posts.join(', '));
  assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#game .prsec, #ui .prsec')].length),0);
  ok('the report sends nothing by itself and never appears on the game screen');
  await b.close();server.close();console.log(`PROBLEM REPORT ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
