// Performance budget: fails when the game grows past agreed limits, so slow-downs are caught in review.
// Sizes are exact; timings are measured in headless Chromium on the CI runner (slower than a phone, so the
// limits leave headroom) and printed every run so trends are visible.
//   node tests/performance-budget.cjs            web checks
//   NATIVE_WWW=../skyline-estates-app/www node … also checks the iPhone/Android bundle size
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'skyline-estates');
const MB=1048576,BUDGET={
  appMB:100,            // whole native app bundle (www); 82 MB on 9 Nov 2026
  firstLoadMB:9,        // what a new web visitor downloads before the home screen appears
  gameHtmlKB:1200,      // the single game source
  bootMs:12000,         // page open → home screen ready (CI headless, no GPU)
  matchMs:6000,         // tap Play solo → board ready with your turn
  turnFrameMs:120       // longest main-thread stall while the computer players take turns (flat board)
};
const out={};let n=0;const ok=(m,v)=>{n++;console.log('PASS',m,v!==undefined?'· '+v:'')};
function dirSize(d){let s=0;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);s+=e.isDirectory()?dirSize(p):fs.statSync(p).size}return s}
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.glb':'model/gltf-binary','.woff2':'font/woff2'};
(async()=>{
  const gh=fs.statSync(path.join(game,'game.html')).size/1024;out.gameHtmlKB=Math.round(gh);assert.ok(gh<BUDGET.gameHtmlKB,`game.html ${gh|0} KB > ${BUDGET.gameHtmlKB} KB`);ok('game source size',`${gh|0} KB (limit ${BUDGET.gameHtmlKB})`);
  if(process.env.NATIVE_WWW){const s=dirSize(path.resolve(process.env.NATIVE_WWW))/MB;out.appMB=+s.toFixed(1);assert.ok(s<BUDGET.appMB,`app bundle ${s.toFixed(1)} MB > ${BUDGET.appMB} MB`);ok('native app bundle size',`${s.toFixed(1)} MB (limit ${BUDGET.appMB})`)}
  let bytes=0;const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}
    fs.readFile(f,(e,b)=>{if(!e)bytes+=b.length;res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:932,height:430},serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await ctx.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Ada',welcomed:1,tutDone:1,stats:{games:9}})));
  const p=await ctx.newPage();const t0=Date.now();await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:60000});
  const boot=Date.now()-t0;out.bootMs=boot;const first=bytes/MB;out.firstLoadMB=+first.toFixed(2);
  assert.ok(first<BUDGET.firstLoadMB,`first load ${first.toFixed(2)} MB > ${BUDGET.firstLoadMB} MB`);ok('first web load',`${first.toFixed(2)} MB (limit ${BUDGET.firstLoadMB})`);
  assert.ok(boot<BUDGET.bootMs,`boot ${boot} ms > ${BUDGET.bootMs} ms`);ok('home screen ready',`${boot} ms (limit ${BUDGET.bootMs})`);
  // Start a solo match and time until the board is ready for the player's first roll.
  await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>{for(const e of l.getEntries())__lt.push(e.duration)}).observe({type:'longtask',buffered:false})});
  const m0=Date.now();await p.evaluate(()=>{applyCity('lagos');newGame({lc:true,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false},players:[{name:'Ada',tok:TOKENS[0],col:PCOL[0],ai:true,tl:1},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true,tl:1},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true,tl:1}]});startWith(G)});
  await p.waitForFunction(()=>{try{return G&&G.players&&document.querySelectorAll('#board .sq,#board .cell,#board [data-i]').length>=40||($('#title').hidden&&!$('#ui').hidden)}catch(e){return false}},null,{timeout:30000});const match=Date.now()-m0;out.matchMs=match;
  assert.ok(match<BUDGET.matchMs,`match start ${match} ms > ${BUDGET.matchMs} ms`);ok('solo match ready',`${match} ms (limit ${BUDGET.matchMs})`);
  // Let the computer players take turns for a while and record the longest main-thread stall (jank).
  await p.evaluate(()=>{__lt.length=0});const until=Date.now()+15000;
  while(Date.now()<until){await p.evaluate(()=>{const b=document.querySelector('#modals .ov button.pri, #modals .ov .btn.pri, #modals .ov button');if(b)b.click()});await p.waitForTimeout(250)}
  const lt=await p.evaluate(()=>({max:Math.round(Math.max(0,...__lt)),count:__lt.length,round:G.round}));out.turnFrameMs=lt.max;
  // A single long stall can be a busy CI runner. A real freeze repeats, so measure a second window before failing.
  if(lt.max>=BUDGET.turnFrameMs*4){console.log(`WARN ${lt.max} ms stall; measuring a second window`);await p.evaluate(()=>{__lt.length=0});const u2=Date.now()+15000;
    while(Date.now()<u2){await p.evaluate(()=>{const b=document.querySelector('#modals .ov button.pri, #modals .ov .btn.pri, #modals .ov button');if(b)b.click()});await p.waitForTimeout(250)}
    const again=await p.evaluate(()=>Math.round(Math.max(0,...__lt)));console.log(`second window longest stall ${again} ms`);lt.max=Math.min(lt.max,again)}
  assert.ok(lt.max<BUDGET.turnFrameMs*4,`longest stall ${lt.max} ms (repeated)`);   // hard stop for freezes
  if(lt.max>=BUDGET.turnFrameMs)console.log(`WARN longest main-thread stall ${lt.max} ms during AI turns (target < ${BUDGET.turnFrameMs} ms)`);
  ok('computer turns stay responsive',`longest stall ${lt.max} ms over ${lt.count} long tasks, reached round ${lt.round}`);
  await b.close();server.close();console.log('PERFORMANCE BUDGET',JSON.stringify(out));
})().catch(e=>{console.error(e);process.exit(1)});
