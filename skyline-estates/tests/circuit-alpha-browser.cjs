// Skyline Circuit playable alpha (Chromium, or WebKit with VISUAL_ENGINE=webkit). Design validation at every supported
// iPhone landscape viewport, using the real page DOM for the HUD and the same geometry code the renderer draws with:
// projection, touch targets, every property at Skyscraper, four tokens on O0, both route previews at once, HUD occlusion.
// Then the ten interaction states, deterministic animation, separate saves and the Career inbox.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const SS=require('../lib/circuit-screen.js');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS||null;
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;
(async()=>{
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 async function page(vp,query,init){const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+' '+vp.id+': '+String(e)));await context.route('https://**/*',r=>r.abort());
  // Browsers report no safe-area insets off-device, so the page reads them from CSS variables in tests.
  await p.addInitScript(([i,init])=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')});
   if(init)for(const [k,v] of Object.entries(init))localStorage.setItem(k,v)},[vp.inset,init||null]);
  await p.goto(host+'circuit-alpha.html'+(query||''));await p.waitForSelector('#cx-start');return{context,p}}
 const start=async p=>{await p.click('#cx-start');await p.waitForFunction(()=>window.__circuitUI.state()&&document.querySelector('#cx-actions [data-state]'))};

 // ---------- 1–7. Design validation at every viewport (top-down placeholder camera, reference layout) ----------
 const report=[];
 for(const vp of SS.VIEWPORTS){const {context,p}=await page(vp,'?seed=11&speed=instant');await start(p);
  await p.evaluate(()=>{const stages={};for(const id of SkylineCircuit.PROPS)stages[id]=4;__circuitUI.setStages(stages);__circuitUI.placeAll('O0')});await p.waitForTimeout(120);
  const r=await p.evaluate(vp=>{const S=SkylineCircuitScreen,U=__circuitUI;const hud=U.hudRects(),board=U.boardRect();
   const res=S.validate({vp,hudRects:hud,board});const o=U.overlay();return{res,hud,board,overlay:o}},vp);
  // The page's real HUD must match the plan the Node validators use (within 1 pt).
  const plan=SS.hudPlan(vp);for(const [a,b] of [[r.board,plan.board],...r.hud.map((h,i)=>[h,plan.rects[i]])])for(const k of ['x','y','w','h'])assert.ok(Math.abs(a[k]-b[k])<=1,`${vp.id} layout ${k} ${a[k]} vs ${b[k]}`);
  // Drawn tokens: four on O0, not overlapping, not under the HUD.
  const t=Object.values(r.overlay.tokens);assert.equal(t.length,4);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.hypot(t[i].x-t[j].x,t[i].y-t[j].y)>=t[i].r+t[j].r-0.01,`${vp.id} drawn tokens overlap`);
  for(const k of t)for(const h of r.hud)assert.ok(!(k.x>h.x&&k.x<h.x+h.w&&k.y>h.y&&k.y<h.y+h.h),`${vp.id} token under HUD`);
  // Drawn route previews: both plans at the same time.
  assert.ok(r.overlay.routeStay.length===12&&r.overlay.routeCross.length===12,`${vp.id} both previews drawn`);
  if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,`circuit-${engine}-${vp.id}.png`)})}
  report.push({vp,ok:r.res.ok,res:r.res});await context.close()}
 const fails=report.filter(x=>!x.ok).map(x=>x.vp.id).sort();
 for(const x of report){const R=x.res;console.log(`  ${x.ok?'ok  ':'FAIL'} ${x.vp.id.padEnd(10)} ${x.vp.w}x${x.vp.h} board ${Math.round(R.board.w)}x${Math.round(R.board.h)} · min target spacing ${R.touch.minCentreDistance} pt · smallest tile edge ${R.touch.minVisibleTileEdge} pt · token ${R.tokens.tokenDiameterPt} pt`+(x.ok?'':' · '+[...R.projection.errors,...R.touch.errors.slice(0,2),...R.skyline.errors,...R.tokens.errors,...R.hud.errors.slice(0,2),...Object.values(R.route).flatMap(z=>z.errors)].slice(0,4).join(', ')))}
 // Expected with the placeholder HUD: every app viewport from iPhone SE (2nd gen) up passes; the iOS 15 floor
 // (SE 1st gen, 568x320) and Safari with toolbars (320 pt tall) are too small for 44 pt targets — reported as blockers.
 assert.deepEqual(fails,['safari-12','safari-se','se1']);
 ok(`design validation: ${report.length-fails.length}/${report.length} viewports pass projection, touch, all-Skyscraper visibility, four tokens on O0, both route previews and HUD occlusion (blocked: ${fails.join(', ')})`);

 // ---------- Ten interaction states, played through the real UI ----------
 const vp=SS.VIEWPORTS.find(v=>v.id==='i12');
 const CLASSIC='{"classic":"untouched"}',RING='{"ring":"untouched"}';
 let {context,p}=await page(vp,'?seed=21&speed=instant&career=1',{skylineSave:CLASSIC,skylineRingSave:RING,skylinePrefs:'{"nick":"QA"}'});
 await p.selectOption('#cx-n','1');await start(p);
 const seen=new Set();
 const play=async(limit=4000)=>{for(let i=0;i<limit;i++){const st=await p.evaluate(()=>{const e=document.querySelector('#cx-actions [data-state]');return e?e.dataset.state:null});if(st)seen.add(st);
   if(st==='over')return;if(st==='roll'){if(await p.evaluate(()=>__circuitUI.view().round%2===0))await p.click('[data-plan=cross]');else await p.click('[data-plan=stay]');await p.click('#cx-roll')}
   else if(st==='buy')await p.click(await p.evaluate(()=>{const v=__circuitUI.view(),me=v.players[0];return me.cash-v.pending.price>=120?'#cx-buy':'#cx-pass'}));
   else if(st==='build'){const b=await p.$('[data-build]');if(b&&await p.evaluate(()=>__circuitUI.view().players[0].cash>400))await b.click();else await p.click('#cx-end')}
   else await p.waitForTimeout(20)}throw Error('match did not finish')};
 // Save and resume mid-match: reload, resume, identical state.
 for(let i=0;i<30;i++){const st=await p.evaluate(()=>document.querySelector('#cx-actions [data-state]')?.dataset.state);if(st==='roll'){await p.click('#cx-roll')}else if(st==='buy')await p.click('#cx-pass');else if(st==='build')await p.click('#cx-end');else await p.waitForTimeout(20)}
 const before=await p.evaluate(()=>JSON.stringify(SkylineCircuit.restore(localStorage.getItem(SkylineCircuit.SAVE_KEY)).state));
 await p.reload();await p.waitForSelector('#cx-resume');await p.click('#cx-resume');await p.waitForFunction(()=>window.__circuitUI.state());
 assert.equal(await p.evaluate(()=>JSON.stringify(SkylineCircuit.restore(SkylineCircuit.serialize(__circuitUI.state())).state)),before);ok('save after every action; reload and Resume restore the identical match');
 // States 5–7 also come from presentation-only events (bankruptcy is rare in real play).
 await p.evaluate(()=>__circuitUI.present([{t:'card',pid:1,card:'grant'},{t:'rent',pid:0,to:1,node:'I1',amount:120},{t:'sell',pid:0,node:'O1',stage:1,refund:20},{t:'bankrupt',pid:1,creditor:0}]));await p.waitForTimeout(100);
 const feed=await p.evaluate(()=>[...document.querySelectorAll('.cx-n')].map(e=>e.className));
 for(const k of ['cx-card','cx-rent','cx-sell','cx-bankrupt'])assert.ok(feed.some(c=>c.includes(k)),k);
 await play();
 const panels=[...seen].sort();for(const k of ['build','buy','over','roll'])assert.ok(seen.has(k),'state '+k);
 const final=await p.evaluate(()=>({over:__circuitUI.state().over,tally:!!document.querySelector('[data-state=round]')||true,save:localStorage.getItem(SkylineCircuit.SAVE_KEY),
  inbox:Object.keys(localStorage).filter(k=>k.startsWith('skylineCareerInbox:')).map(k=>JSON.parse(localStorage.getItem(k))),classic:localStorage.getItem('skylineSave'),ring:localStorage.getItem('skylineRingSave'),prefs:localStorage.getItem('skylinePrefs')}));
 assert.equal(final.over,true);assert.equal(final.save,null);assert.equal(final.classic,CLASSIC);assert.equal(final.ring,RING);assert.equal(final.prefs,'{"nick":"QA"}');
 assert.equal(final.inbox.length,1);assert.equal(final.inbox[0].board,'circuit');assert.equal(final.inbox[0].ruleset,'circuit-v0');assert.equal(final.inbox[0].aiLevel,'normal');
 ok(`full match through the UI: states ${panels.join(', ')}; card, rent, forced sale and bankruptcy shown; Classic and Harbour Ring saves and the profile untouched; one Career inbox entry`);
 // Round tally (8), victory clock (9) and turn-order reversal: presented from the event stream.
 await p.evaluate(()=>__circuitUI.present([{t:'round',round:3,tally:[{pid:0,properties:4,networks:2,districts:0,total:6,inf:20}]},{t:'order',order:[1,0]}]));await p.waitForTimeout(50);
 assert.ok(await p.evaluate(()=>!!document.querySelector('[data-state=round]')&&/Turn order reverses/.test(document.querySelector('.cx-feed').textContent)));
 await context.close();
 ({context,p}=await page(vp,'?seed=21&speed=normal'));await start(p);await p.click('#cx-roll');await p.waitForTimeout(60);
 assert.equal(await p.evaluate(()=>document.querySelector('#cx-actions [data-state]').dataset.state),'moving');await p.click('#cx-skip');await p.waitForTimeout(60);
 assert.notEqual(await p.evaluate(()=>document.querySelector('#cx-actions [data-state]').dataset.state),'moving');
 // Victory clock banner from a real clock in the state.
 await p.evaluate(()=>{const s=__circuitUI.state();s.clock={pid:1,round:s.round,since:s.round};__circuitUI.present([{t:'clock',pid:1,round:s.round,since:s.round}])});await p.waitForTimeout(60);
 assert.ok(await p.evaluate(()=>/wins at the end of round/.test(document.querySelector('.cx-clock')?.textContent||'')));
 ok('movement animation with Skip, end-of-round tally, turn-order reversal and the victory-clock banner');await context.close();

 // ---------- Deterministic animation: same seed and same choices give the same match at any speed ----------
 const hashAt=async speed=>{const s=await page(vp,`?seed=33&speed=${speed}`);await s.p.selectOption('#cx-n','1');await start(s.p);
  for(let i=0;i<6000;i++){const st=await s.p.evaluate(()=>document.querySelector('#cx-actions [data-state]')?.dataset.state);if(st==='over')break;
   if(st==='roll')await s.p.click('#cx-roll');else if(st==='buy')await s.p.click('#cx-buy');else if(st==='build')await s.p.click('#cx-end');else if(st==='moving'){if(speed==='fast'&&i%3===0)await s.p.click('#cx-skip').catch(()=>{});else await s.p.waitForTimeout(15)}else await s.p.waitForTimeout(15)}
  const h=await s.p.evaluate(()=>({hash:SkylineCircuit.hash(__circuitUI.state()),over:__circuitUI.state().over}));await s.context.close();return h};
 const a=await hashAt('instant'),b=await hashAt('fast');assert.ok(a.over&&b.over);assert.equal(a.hash,b.hash);ok('animation speed and skipping never change the match (identical transcript hash)');

 // ---------- Career inbox → Career (game page, flags on) ----------
 const gp=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'block'}),g=await gp.newPage();g.on('pageerror',e=>errors.push(engine+' game: '+String(e)));await gp.route('https://**/*',r=>r.abort());
 const career={v:1,unlocked:{origins:0,circuit:1},boards:{},tutorials:{},challenges:{},receipts:[],floor:0};
 const good={board:'circuit',length:'standard',ruleset:'circuit-v0',matchId:'circuit-qa-1',startedAt:1000,endedAt:400000,sim:false,fast:false,online:false,assisted:false,over:true,ownerHuman:true,rounds:21,activity:9,won:true,score:301,aiOpponents:2,aiLevel:'normal',experimental:false};
 const quick={...good,matchId:'circuit-qa-2',length:'quick',startedAt:2000,experimental:true};
 await g.addInitScript(([c,a,b])=>{if(!localStorage.getItem('skylinePrefs')){localStorage.setItem('skylinePrefs',JSON.stringify({nick:'QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,career:c}));
  localStorage.setItem('skylineCareerInbox:circuit-qa-1',a);localStorage.setItem('skylineCareerInbox:circuit-qa-2',b);localStorage.setItem('skylineCareerInbox:circuit-qa-1b',a)}},[career,JSON.stringify(good),JSON.stringify(quick)]);
 await g.goto(host+'index.html?career=on&circuitAlpha=on');await g.waitForFunction(()=>window.SkylineCareer&&!document.querySelector('#boot'));await g.waitForTimeout(300);
 const cr=await g.evaluate(()=>({inbox:SkylineCareer.inbox(),left:Object.keys(localStorage).filter(k=>k.startsWith('skylineCareerInbox:')),circuit:SkylineCareer.raw().boards.circuit,view:SkylineCareer.state().find(b=>b.id==='circuit')}));
 assert.deepEqual(cr.left,[]);assert.equal(cr.circuit.qualifiedWins,1);assert.equal(cr.circuit.wins,2);assert.equal(cr.circuit.xp,400);
 assert.equal(cr.inbox.find(x=>x.key==='circuit-qa-1b').reason,'duplicate');assert.equal(cr.inbox.find(x=>x.key==='circuit-qa-2').experimental,true);assert.equal(cr.view.status,'playable');
 ok('Career ingests Circuit results once: Standard win qualifies, Quick win gives XP only, a repeated match is refused, inbox emptied');
 await gp.close();
 assert.deepEqual(errors,[]);console.log(`circuit-alpha-browser (${engine}): ${n} checks passed`);
 await browser.close();server.close();
})().catch(async e=>{console.error(e);console.error(errors);try{await browser.close();server.close()}catch(x){}process.exit(1)});
