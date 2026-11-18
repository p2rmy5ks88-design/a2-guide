/* Verify public Circuit preview gates using real Chromium/WebKit DOM and a simulated public host. */
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const engine=process.env.VISUAL_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
(async()=>{
 const browser=await {chromium,webkit}[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 const errors=[];
 try{
   const run=async(flags={},suffix='')=>{
     const context=await browser.newContext({serviceWorkers:'block'});
     await context.route('**/*',async route=>{
       const url=new URL(route.request().url());
       if(url.hostname!=='preview.example')return route.abort('blockedbyclient');
       const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
       if(!filename.startsWith(root+path.sep))return route.fulfill({status:403,body:'Forbidden'});
       try{const data=await fs.promises.readFile(filename);
         await route.fulfill({status:200,body:data,contentType:mime[path.extname(filename)]||'application/octet-stream'})}
       catch(e){await route.fulfill({status:404,body:'Not found'})}
     });
     await context.addInitScript(flags=>{
       for(const [key,val] of Object.entries(flags))localStorage.setItem(key,val);
     },flags);
     const page=await context.newPage();
     page.on('pageerror',e=>errors.push(String(e)));
     await page.goto('http://preview.example/skyline-estates/circuit-alpha.html'+suffix,{waitUntil:'load'});
     const state=await page.evaluate(()=>({
       allow:window.__circuitAccessAllowed,
       initialized:!!window.__circuitUI,
       setupHidden:document.querySelector('#cx-setup').hidden,
       notice:document.querySelector('#cx-setup').textContent,
       benchmark:!!document.querySelector('#cx-bench'),
       start:!!document.querySelector('#cx-start')
     }));
     await context.close();return state;
   };
   let r=await run({},'?career=1&circuitAlpha=on&bench=1');
   assert.equal(r.allow,false,'public URL query alone cannot unlock');
   assert.equal(r.initialized,false,'blocked public page cannot initialize match');
   assert.equal(r.setupHidden,false,'blocked public visitor sees preview notice');
   assert(r.notice.includes('preview is not enabled'),'public notice visible');
   assert.equal(r.benchmark,false,'bench query cannot run when locked');
   for(const flags of [
     {'skylineFeature.career':'on'},
     {'skylineFeature.circuitAlpha':'on'}
   ]){
     r=await run(flags);
     assert.equal(r.allow,false,'one flag never unlocks');
     assert.equal(r.initialized,false,'one flag keeps UI inert');
   }
   r=await run({'skylineFeature.career':'on','skylineFeature.circuitAlpha':'on'});
   assert.equal(r.allow,true,'both flags unlock on public host');
   assert.equal(r.initialized,true,'approved opt-in loads Circuit UI');
   assert.equal(r.start,true,'approved opt-in presents playable setup');
   assert.deepEqual(errors,[],'no browser page errors');
   console.log('PASS: '+engine+' public preview gate denies direct URL / partial flags and allows dual opt-in');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
