// Skyline Circuit 320 pt zoom/pan fallback in the actual 3D renderer (Chromium, or WebKit with VISUAL_ENGINE=webkit).
// Screens below 44 pt overview spacing (se1, safari-se, safari-12): overview is view-only and taps open a zoom; the zoom is
// exactly the validated SS.zoomed() transform (drawn = measured); selectable nodes keep full 44 pt circles ≥44 pt apart;
// only full circles select; drag pans with clamping; every node can be selected from some pan position; the route
// decision opens a focus showing token, first junction and both exits; double-tap and the HUD button return to the
// overview. A full-size screen never enters the fallback.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const D=require('../design/v2/circuit-design-v2.json'),SS=require('../lib/circuit-screen.js'),SC=require('../lib/circuit-rules.js');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS||null;
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;
(async()=>{
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 async function open(sc,dpr=1){const vp=sc.viewport;const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:dpr,hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+' '+vp.id+': '+String(e)));await context.route('https://**/*',r=>r.abort());
  await p.addInitScript(i=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')})},vp.inset);
  await p.goto(host+'circuit-alpha.html?test=1&speed=instant&quality=low&seed=7');await p.waitForSelector('#cx-start');await p.click('#cx-start');await p.waitForFunction(()=>__circuitUI.r3()&&document.querySelector('#cx-actions [data-state]'));await p.waitForTimeout(300);return{context,p}}
 const info=p=>p.evaluate(()=>{const U=__circuitUI,R=U.r3(),z=U.zoomInfo();const sel=z.zoom?SkylineCircuitScreen.selectable(R.G,{project:R.C.project,rect:R.C.rect}):[];return{z,sel,feed:[...document.querySelectorAll('.cx-n')].map(e=>e.textContent),btn:document.querySelector('#cx-zoom')?.textContent||null}});
 // full-size screen: no fallback
 {const {context,p}=await open(D.screens.i12);const r=await info(p);assert.equal(r.z.fallback,null);assert.equal(r.btn,null);await context.close()}
 for(const id of ['se1','safari-se','safari-12']){const sc=D.screens[id];const {context,p}=await open(sc);
  const G=SS.geometry(D.layout,D.geometry),base=SS.camera(G,D.camera.default,sc.board),want=SS.zoomFallback(G,base,{hudRects:sc.hudRects});
  // 1. fallback factor = the validated one; the route decision opened the plan focus automatically
  let r=await info(p);assert.ok(r.z.fallback,id+' fallback active');assert.equal(r.z.fallback.factor,want.factor);assert.ok(r.z.zoom,id+' plan focus opened');assert.equal(r.btn,'Whole board');
  const pos=await p.evaluate(()=>__circuitUI.state().players[0].pos);let at=pos,k=0;while(k<12&&SC.NODES.find(x=>x.id===at).type!=='junction'){at=SC.next(at);k++}
  for(const need of [pos,at,SC.next(at),SC.LINKS[at]])assert.ok(r.sel.includes(need),`${id} plan focus shows ${need}`);
  // 2. drawn = measured (validated zoom transform), spacing and full circles
  const chk=await p.evaluate(()=>{const R=__circuitUI.r3(),z=__circuitUI.zoomInfo().zoom,Z=SkylineCircuitScreen.zoomed(R.baseC,z.factor,z.focus);let e=0;
   for(const id of Object.keys(R.G.nodes)){const a=Z.project({...R.G.nodes[id],z:0}),b=R.projectNode(id);e=Math.max(e,Math.hypot(a.x-b.x,a.y-b.y))}
   const sel=SkylineCircuitScreen.selectable(R.G,{project:R.C.project,rect:R.C.rect}),P=sel.map(id=>R.C.project({...R.G.nodes[id],z:0}));let m=1e9;for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++)m=Math.min(m,Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y));
   const rc=R.C.rect,inside=P.every(p=>p.x-22>=rc.x-.01&&p.x+22<=rc.x+rc.w+.01&&p.y-22>=rc.y-.01&&p.y+22<=rc.y+rc.h+.01);return{e,m,inside,sel:sel.length}});
  assert.ok(chk.e<.05,`${id} drawn vs zoomed ${chk.e}`);assert.ok(chk.m>=44,`${id} spacing ${chk.m}`);assert.ok(chk.inside);
  // 3. taps: a selectable node selects; a node that is on screen but clipped does not
  const pts=await p.evaluate(()=>{const R=__circuitUI.r3(),rc=R.C.rect,sel=new Set(SkylineCircuitScreen.selectable(R.G,{project:R.C.project,rect:R.C.rect}));const all=Object.keys(R.G.nodes).map(id=>({id,...R.C.project({...R.G.nodes[id],z:0})}));
   return{good:all.find(q=>sel.has(q.id)),clipped:all.find(q=>!sel.has(q.id)&&q.x>rc.x+2&&q.x<rc.x+rc.w-2&&q.y>rc.y+2&&q.y<rc.y+rc.h-2)}});
  await p.mouse.click(pts.good.x,pts.good.y);await p.waitForTimeout(80);r=await info(p);assert.ok(r.feed.some(t=>t.startsWith(pts.good.id+':')),id+' selectable tap selects');
  if(pts.clipped){await p.waitForTimeout(350);const before=(await info(p)).feed.length;await p.mouse.click(pts.clipped.x,pts.clipped.y);await p.waitForTimeout(80);r=await info(p);assert.ok(!r.feed.some(t=>t.startsWith(pts.clipped.id+':')),id+' clipped node not selectable')}
  // 4. drag pans (clamped), double-tap returns to the overview, overview taps never select but open the zoom
  await p.waitForTimeout(350);const f0=(await info(p)).z.zoom.focus;const b=sc.board;await p.mouse.move(b.x+b.w/2,b.y+b.h/2);await p.mouse.down();await p.mouse.move(b.x+b.w/2+40,b.y+b.h/2+10,{steps:5});await p.mouse.up();
  const f1=(await info(p)).z.zoom.focus;const exp=SS.clampFocus(base,G,want.factor,{x:f0.x-40/want.factor,y:f0.y-10/want.factor});assert.ok(Math.abs(f1.x-exp.x)<.6&&Math.abs(f1.y-exp.y)<.6,`${id} pan ${JSON.stringify([f1,exp])}`);
  await p.waitForTimeout(350);await p.mouse.dblclick(b.x+b.w/2,b.y+b.h/2);await p.waitForTimeout(80);r=await info(p);assert.equal(r.z.zoom,null,id+' double-tap → overview');assert.equal(r.btn,'Zoom in');
  const feedN=r.feed.length;const q0=await p.evaluate(()=>{const R=__circuitUI.r3();return R.C.project({...R.G.nodes.O6,z:0})});await p.waitForTimeout(350);await p.mouse.click(q0.x,q0.y);await p.waitForTimeout(80);r=await info(p);
  assert.ok(r.z.zoom,id+' overview tap opens zoom');assert.ok(!r.feed.slice(0,1).some(t=>t.startsWith('O6:')),id+' overview tap does not select');
  await p.click('#cx-zoom');r=await info(p);assert.equal(r.z.zoom,null,id+' HUD button → overview');
  // 5. coverage: every node selectable from the zoom focused on it
  const cov=await p.evaluate(()=>{const U=__circuitUI,R=U.r3(),miss=[];for(const id of Object.keys(R.G.nodes)){const q=R.baseC.project({...R.G.nodes[id],z:0});U.zoomAt(q.x,q.y);if(!SkylineCircuitScreen.selectable(R.G,{project:R.C.project,rect:R.C.rect}).includes(id))miss.push(id)}return miss});
  assert.deepEqual(cov,[],id+' coverage');
  // 6. visibility in the 3D render while zoomed, every property a Skyscraper (ID pass at selectable centres)
  const vis=await p.evaluate(()=>{const U=__circuitUI,R=U.r3(),SC=SkylineCircuit;const st={};for(const id of SC.PROPS)st[id]=4;U.setStages(st);return new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const ids=Object.keys(R.G.nodes),bad=[];for(const f of ['O1','O11','I5']){const q=R.baseC.project({...R.G.nodes[f],z:0});U.zoomAt(q.x,q.y);const sel=SkylineCircuitScreen.selectable(R.G,{project:R.C.project,rect:R.C.rect});
    const pts=sel.map(id=>R.C.project({...R.G.nodes[id],z:R.G.nodes[id].type==='property'?R.G.stageHeight[4]:4.3}));const got=R.idPass(pts);sel.forEach((id,j)=>{const g=got[j];if(!g||!((g.kind===1||g.kind===2)&&g.i===ids.indexOf(id))&&!(g.kind===3))bad.push(f+':'+id)})}res(bad)}))) });
  assert.deepEqual(vis,[],id+' zoomed visibility');
  if(out){fs.mkdirSync(out,{recursive:true});await p.evaluate(()=>{__circuitUI.setStages(null);__circuitUI.planFocus()});await p.waitForTimeout(200);await p.screenshot({path:path.join(out,`zoom-${engine}-${id}-plan-focus.png`)});await p.evaluate(()=>__circuitUI.overview());await p.waitForTimeout(150);await p.screenshot({path:path.join(out,`zoom-${engine}-${id}-overview.png`)})}
  console.log(`  ${id}: overview ${want.overviewSpacing} pt → zoom ×${want.factor} = ${want.zoomSpacing} pt; ${chk.sel} selectable in the plan focus`);
  await context.close()}
 ok('320 pt fallback in 3D: view-only overview, validated zoom (drawn = measured), ≥44 pt full-circle targets, taps/double-tap/drag/HUD button, full coverage, plan focus, zoomed visibility; full screens unaffected');
 assert.deepEqual(errors,[]);console.log(`circuit-zoom-3d (${engine}): ${n} checks passed`);await browser.close();server.close();
})().catch(async e=>{console.error(e);console.error(errors.slice(0,5));try{await browser.close();server.close()}catch(x){}process.exit(1)});
