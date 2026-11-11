// Screen stays on during a match (native SkylineAwake plugin), and is released on the menus and at the results.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await ctx.addInitScript(()=>{window.__awake=[];window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{SkylineAwake:{set:async o=>{__awake.push(o.on);return o}}},isPluginAvailable:()=>true};
    localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Ada',welcomed:1,tutDone:1,lc:true,stats:{games:9}}))});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  assert.equal(await p.evaluate(()=>SkylineKeepAwake.active()),false);ok('menus: the phone may sleep as usual');
  await p.evaluate(()=>{const me=setup.slots[0];startFromSetup(document.body,setup.slots.map((s,i)=>({...s,type:i===0?'human':i===1?'ai':'off',tok:i===0?me.tok:s.tok})),{mode:'timed',rounds:30,championship:1})});
  await p.waitForFunction(()=>__awake.at(-1)===true);ok('match started: screen kept on');
  await p.evaluate(()=>showTitle());await p.waitForFunction(()=>__awake.at(-1)===false);ok('back on the menus: screen allowed to sleep again');
  assert.deepEqual(errs,[]);await b.close();server.close();console.log(`KEEP AWAKE ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
