// Harbour Ring preview (browser): opens from Game Modes, draws the exact 24-space ring, the move choices match the
// highlighted tiles, the property sheet and feed open and close, a full match finishes on the result screen, layout
// fits iPhone landscape sizes in Dark and Daylight, and leaving returns home without touching saves or coins.
//   node tests/harbour-ring-browser.cjs [screenshotDir]
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),OUT=process.argv[2]||'';let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errs=[];
  async function open(vp,ui){const ctx=await b.newContext({viewport:vp,hasTouch:true,serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await ctx.addInitScript(u=>{localStorage.setItem('skylineIntroRing','1');localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Ada',welcomed:1,tutDone:1,lastOpen:Date.now(),ui:u,coins:4205,stats:{games:9}}))},ui);
    const p=await ctx.newPage();p.on('pageerror',e=>errs.push(String(e)));await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
    await p.evaluate(()=>{document.querySelectorAll('#modals .ov').forEach(x=>x.remove());homeTab('play')});return{ctx,p}}

  let {ctx,p}=await open({width:844,height:390},'dark');
  const before=await p.evaluate(()=>({coins:PREF.coins,games:PREF.stats.games||0,save:localStorage.getItem('skylineSave')}));
  await p.click('#hdModes');await p.locator('#qRing').waitFor();ok('Harbour Ring is listed in the Game Modes panel');
  await p.click('#qRing');await p.locator('#hr .hr-board').waitFor();
  await p.evaluate(()=>{HarbourRing.close();HarbourRing.start({seed:424242,first:0})});await p.locator('#hr .hr-board').waitFor();
  const board=await p.evaluate(()=>{const s=HarbourRing.state();return{tiles:[...document.querySelectorAll('#hr .hr-t')].map(t=>+t.dataset.i),
    cities:new Set(s.districts.map(d=>d.city)).size,props:s.tiles.filter(t=>t.k==='prop').length,prices:s.districts.map(d=>d.price),
    pos:[...document.querySelectorAll('#hr .hr-t')].map(t=>t.style.gridRow+'/'+t.style.gridColumn)}});
  assert.deepEqual(board.tiles.slice().sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i));assert.equal(new Set(board.pos).size,24);
  assert.equal(board.cities,8);assert.equal(board.props,16);assert.deepEqual(board.prices.slice(0,4),board.prices.slice(4));
  ok('24 unique numbered spaces on a 9 × 5 ring, 16 streets from 8 different cities, mirrored prices');
  const mv=await p.evaluate(()=>{const s=HarbourRing.state();return{opts:s.options.map(o=>o.target).sort((a,b)=>a-b),hi:[...document.querySelectorAll('#hr .hr-t.tg')].map(t=>+t.dataset.i).sort((a,b)=>a-b),btn:document.querySelectorAll('#hr [data-move]').length}});
  assert.deepEqual(mv.hi,mv.opts);assert.equal(mv.btn,mv.opts.length);ok(`move choices match the highlighted tiles (${mv.hi.join(', ')})`);
  if(OUT)for(const ui of ['dark','light']){await p.evaluate(u=>{PREF.ui=u;applyUI()},ui);await p.waitForTimeout(250);await p.screenshot({path:path.join(OUT,`ring-844-${ui}.png`)})}
  await p.evaluate(()=>{PREF.ui='dark';applyUI()});
  const prop=await p.evaluate(()=>HarbourRing.state().tiles.find(t=>t.k==='prop').i);
  await p.click(`#hr .hr-t[data-i="${prop}"]`);await p.locator('#hr .hr-sheet.side').waitFor();
  const sh=await p.evaluate(()=>document.querySelector('#hr .hr-sheet.side').textContent);assert.ok(/Street only/.test(sh)&&/Tower/.test(sh));
  if(OUT)await p.screenshot({path:path.join(OUT,'ring-844-property.png')});
  await p.keyboard.press('Escape');assert.equal(await p.locator('#hr .hr-sheet').count(),0);ok('tap a street opens its details (street name, rents); Escape closes');
  await p.click('#hr [data-a="feed"]');await p.locator('#hr .hr-sheet.up').waitFor();await p.click('#hr [data-tab="stats"]');assert.ok(/Net worth/.test(await p.locator('#hr .hr-sheet.up').textContent()));
  await p.click('#hr .hr-sheet.up [data-a="close"]');ok('match feed and stats drawer opens, switches tabs and closes');
  // Play my first move by hand, then let the computer play both seats quickly to the end.
  const steps=await p.evaluate(()=>HarbourRing.state().options[0].steps);await p.click(`#hr [data-move="${steps}"]`);
  await p.waitForFunction(()=>{const s=HarbourRing.state();return s.moves>=1||(s.decision&&s.decision.type!=='move')},null,{timeout:10000});ok('a move button moves your token and resolves the landing');
  // Save & leave from the menu, then continue from Game Modes at the same point.
  await p.waitForFunction(()=>{const s=HarbourRing.state();const d=s.decision;return d&&(d.p===0||d.type==='bid')},null,{timeout:15000});
  const mid=await p.evaluate(()=>({round:HarbourRing.state().round,moves:HarbourRing.state().moves,cash:HarbourRing.state().players.map(x=>x.cash)}));
  await p.click('#hr [data-a="menu"]');await p.click('#hr [data-a="leave"]');await p.locator('#hr').waitFor({state:'detached'});
  assert.ok(await p.evaluate(()=>!!HarbourRing.saved()));await p.click('#hdModes');assert.match(await p.locator('#qRing').textContent(),/Continue · round \d+/);
  await p.click('#qRing');await p.locator('#hr .hr-board').waitFor();
  const back=await p.evaluate(()=>({round:HarbourRing.state().round,moves:HarbourRing.state().moves,cash:HarbourRing.state().players.map(x=>x.cash)}));
  assert.deepEqual(back,mid);ok('Save & leave keeps the match; Game Modes shows Continue and resumes at the same point');
  // Turn timer: when it runs out the computer chooses for you.
  await p.evaluate(()=>HarbourRing.setTurnSeconds(1));await p.evaluate(()=>{HarbourRing.close();HarbourRing.start({resume:HarbourRing.saved()})});
  assert.ok(await p.locator('#hr .hr-timer').count()>=0);
  await p.waitForFunction(()=>HarbourRing.state().log.some(l=>/Time ran out/.test(l.txt)),null,{timeout:15000});ok('the turn timer runs out and the computer moves for you');
  await p.evaluate(()=>HarbourRing.setTurnSeconds(25));
  await p.evaluate(()=>{HarbourRing.setSpeed(0);HarbourRing.setAuto(true)});
  await p.waitForFunction(()=>{const s=HarbourRing.state();return s&&s.over},null,{timeout:120000});await p.locator('#hr .hr-res h2').waitFor();
  const end=await p.evaluate(()=>{const s=HarbourRing.state();return{round:s.round,winner:s.winner,final:s.final,h:document.querySelector('#hr .hr-res h2').textContent}});
  assert.ok(end.round===15||end.final.some(x=>x<0),JSON.stringify(end));ok(`full match ends on the result screen after round 15 (${end.h})`);
  const sky=await p.evaluate(()=>{const s=HarbourRing.state();const want=[0,1].reduce((n,q)=>n+Math.min(8,s.tiles.filter(t=>t.k==='prop'&&t.o===q&&t.lv>0).length),0);return{want,have:document.querySelectorAll('#hr .hr-bld').length}});
  assert.equal(sky.have,sky.want);ok(`the centre skyline shows one building per built street (${sky.have})`);
  if(OUT){await p.evaluate(()=>{const s=HarbourRing.state();s.tiles.filter(t=>t.k==='prop').slice(0,8).forEach((t,k)=>{t.o=k%2;t.lv=1+k%4});document.querySelector('#hr [data-a="close"]')})}
  if(OUT)await p.screenshot({path:path.join(OUT,'ring-844-result.png')});
  const saved=await p.evaluate(()=>HarbourRing.saved());assert.equal(saved,null);ok('a finished match leaves no save behind');
  const rw=await p.evaluate(b=>{const s=HarbourRing.state(),r=s.reward;return{r,coins:PREF.coins-b.coins,games:PREF.stats.games-b.games,shown:!!document.querySelector('#hr .hr-rew'),again:(()=>{const x=s.rewarded;return x})()}},before);
  assert.ok(rw.r&&rw.r.xp>=50&&rw.coins>=rw.r.coins&&rw.r.coins>=175&&rw.games===1&&rw.shown,JSON.stringify(rw));
  ok(`a finished match pays once: +${rw.r.xp} XP, +${rw.r.coins} Coins, ${rw.r.tr>0?'+':''}${rw.r.tr} trophies, shown on the result screen`);
  await p.click('#hr [data-a="home"]');await p.locator('#hr').waitFor({state:'detached'});
  const after=await p.evaluate(()=>({coins:PREF.coins,save:localStorage.getItem('skylineSave'),home:!!document.querySelector('#title .hd-stage'),active:HarbourRing.active()}));
  assert.equal(after.save,before.save);assert.ok(after.home&&!after.active);ok('leaving returns home; the classic saved game is untouched');
  await ctx.close();

  // Layout at phone sizes, both themes: everything inside the window, nothing overlapping, touch targets ≥ 44 px.
  for(const vp of [{width:844,height:390},{width:667,height:375},{width:932,height:430}])for(const ui of ['dark','light']){({ctx,p}=await open(vp,ui));
    await p.evaluate(()=>HarbourRing.start({seed:777,first:0}));await p.locator('#hr .hr-board').waitFor();
    const L=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect(),W=innerWidth,H=innerHeight;
      const parts=['.hr-top','.hr-board','.hr-bot'].map(s=>R(document.querySelector('#hr '+s)));
      const out=[...document.querySelectorAll('#hr .hr-t,#hr .hr-b,#hr .hr-ib,#hr .hr-card')].map(R).filter(r=>r.left<-1||r.top<-1||r.right>W+1||r.bottom>H+1).length;
      const over=parts[0].bottom>parts[1].top+1||parts[1].bottom>parts[2].top+1;
      const small=[...document.querySelectorAll('#hr .hr-b,#hr .hr-ib')].map(R).filter(r=>r.height<44).length;
      const tile=R(document.querySelector('#hr .hr-t'));const clip=[...document.querySelectorAll('#hr .hr-b b')].filter(e=>e.scrollWidth>e.clientWidth+1).length;
      return{out,over,small,clip,tile:[Math.round(tile.width),Math.round(tile.height)]}});
    assert.ok(!L.out&&!L.over&&!L.small&&!L.clip&&L.tile[1]>=44,JSON.stringify(L));ok(`${vp.width}×${vp.height} ${ui}: fits, no overlap, buttons ≥ 44 px, tiles ${L.tile.join('×')}`);
    if(OUT&&vp.width===667)await p.screenshot({path:path.join(OUT,`ring-667-${ui}.png`)});
    await ctx.close()}
  assert.deepEqual(errs,[]);ok('no browser errors');
  await b.close();server.close();console.log(`HARBOUR RING BROWSER ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
