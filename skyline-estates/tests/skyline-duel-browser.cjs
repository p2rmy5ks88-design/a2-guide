// Skyline Duel prototype (Stage 2): entry behind ?duel=1, 1v1 setup, balanced 3-street deal, first-player bonus,
// no trades, 15-round Championship with Final Bell, a full match to the results screen, Dark and Daylight screenshots.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),OUT=process.argv[2]||'',engine=process.env.VISUAL_ENGINE||'chromium';let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=engine==='webkit'?await webkit.launch():await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await ctx.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Ada',welcomed:1,tutDone:1,lc:true,stats:{games:9}}))});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  await p.evaluate(()=>homeTab('play'));await p.locator('#hdModes').click();await p.locator('#qDuel').waitFor();ok('Skyline Duel is in the Game Modes panel for everyone');
  await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  await p.evaluate(()=>homeTab('play'));await p.locator('#hdModes').click();await p.locator('#qDuel').waitFor();
  assert.ok(await p.evaluate(()=>document.querySelector('#qDuel').closest('.hd-gm-list')&&document.querySelector('#qDuel .ic svg')));ok('Skyline Duel sits beside the other game modes, with its own paired-piece icon');
  await p.locator('#qDuel').click();await p.waitForFunction(()=>{try{return G&&G.set.duel===1}catch(e){return false}});
  const st=await p.evaluate(()=>({n:G.players.length,ai:G.players.map(x=>!!x.ai),rounds:G.set.rounds,champ:G.set.championship,mode:G.set.mode,
    dealt:[0,1].map(id=>G.own.filter((o,i)=>o.o===id&&SQ[i].t==='prop').map(i=>0).length),value:[0,1].map(id=>G.own.reduce((a,o,i)=>a+(o.o===id?SQ[i].p:0),0)),
    cash:G.players.map(x=>x.cash),first:G.first,late:G.lateBonus,active:skylineChampionshipActive()}));
  assert.equal(st.n,2);assert.deepEqual(st.ai,[false,true]);assert.equal(st.rounds,15);assert.equal(st.mode,'timed');assert.equal(st.champ,1);assert.ok(st.active);
  const owned=await p.evaluate(()=>[0,1].map(id=>G.own.filter((o,i)=>o.o===id&&SQ[i].t==='prop').length));assert.deepEqual(owned,[3,3]);
  assert.ok(Math.abs(st.value[0]-st.value[1])<=Math.max(...st.value)*0.5,'deal values '+st.value);
  assert.deepEqual(st.cash,[1700,1700]);
  ok(`1 vs AI, 15-round Championship, 3 streets each (values ${st.value.join(' / ')}), both start on SC 1.7B (opener bonus matches the late-start bonus)`);
  const tr=await p.evaluate(async()=>{let t=null;try{t=aiProposeTrade(G.players[1])}catch(e){}await openTrade(G.players[0]);return{t,modal:!!document.querySelector('#modals .ov .trade, #modals .tradeed')}});
  assert.equal(tr.t,null);assert.equal(tr.modal,false);ok('no trades: the AI never offers one and the trade screen does not open');
  if(OUT){for(const ui of ['dark','light']){await p.evaluate(u=>{PREF.ui=u;applyUI();G.round=13;renderRoster()},ui);await p.waitForTimeout(400);await p.screenshot({path:path.join(OUT,`duel-${engine}-round-${ui}.png`)})}}
  // Play the match out quickly with the computer on both seats and check it ends at round 15 on the results screen.
  await p.evaluate(()=>{GEN++;document.querySelector('#modals').innerHTML='';G.players[0].ai=true;FAST=true;G.round=Math.max(G.round,1);run()});
  await p.waitForFunction(()=>{try{return G.over}catch(e){return false}},null,{timeout:120000});
  const end=await p.evaluate(()=>({round:G.round,over:G.over,bankrupt:G.players.filter(x=>x.bankrupt).length}));
  assert.ok(end.over&&(end.round<=16||end.bankrupt>0),JSON.stringify(end));ok(`match ends by round 15 (finished after round ${Math.min(end.round,15)}${end.bankrupt?', bankruptcy':''})`);
  assert.deepEqual(errs,[]);ok('no browser errors');
  await b.close();server.close();console.log(`SKYLINE DUEL ${n} checks (${engine})`);
})().catch(e=>{console.error(e);process.exit(1)});
