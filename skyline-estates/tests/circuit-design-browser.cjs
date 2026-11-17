// Design package validation in a real browser (Chromium, or WebKit with VISUAL_ENGINE=webkit). For every screen in the
// package: the page's real HUD and board rectangles must match the package (±1 pt); the design layout and cameras are
// loaded into the alpha renderer; the validators run inside the browser engine and must reproduce the Node measurements;
// drawn tokens (four on O0, all Skyscrapers) and both route previews are checked on screen.
//   node tests/circuit-design-browser.cjs [design.json]    CIRCUIT_SHOTS=dir saves a screenshot per screen and camera.
'use strict';
// geometry; the 3D projection is checked by circuit-3d-browser (pages run with ?renderer=2d)
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const file=process.argv[2]||path.join(__dirname,'../design/circuit-design-v1.json'),D=JSON.parse(fs.readFileSync(file,'utf8'));
const SS=require('../lib/circuit-screen.js');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS||null;
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;
(async()=>{
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 const rows=[];
 for(const [id,sc] of Object.entries(D.screens)){const vp=sc.viewport;
  const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+' '+id+': '+String(e)));await context.route('https://**/*',r=>r.abort());
  await p.addInitScript(i=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')})},vp.inset);
  await p.goto(host+'circuit-alpha.html?seed=5&speed=instant&renderer=2d');await p.waitForSelector('#cx-start');await p.click('#cx-start');await p.waitForFunction(()=>window.__circuitUI.state());
  // 1. The page hosts the package's HUD and board rectangles.
  const dom=await p.evaluate(()=>({hud:__circuitUI.hudRects(),board:__circuitUI.boardRect()}));
  for(const [a,b] of [[dom.board,sc.board],...sc.hudRects.map(h=>[dom.hud.find(x=>x.id===h.id),h])])for(const k of ['x','y','w','h'])assert.ok(Math.abs(a[k]-b[k])<=1,`${id} ${b.id||'board'}.${k}: page ${a[k]} vs design ${b[k]}`);
  for(const [cn,cam] of Object.entries(D.camera)){
   await p.evaluate(([D,cam])=>{__circuitUI.setDesign({layout:D.layout,spec:D.geometry,cam});const st={};for(const k of SkylineCircuit.PROPS)st[k]=4;__circuitUI.setStages(st);__circuitUI.placeAll('O0')},[D,cam]);await p.waitForTimeout(120);
   // 2. Validators inside this browser engine, on the package's values.
   const r=await p.evaluate(([D,sc,cam])=>{const S=SkylineCircuitScreen,v=S.validate({layout:D.layout,cam,vp:sc.viewport,hudRects:sc.hudRects,board:sc.board,spec:D.geometry});
    const G=S.geometry(D.layout,D.geometry),C=S.camera(G,cam,sc.board),z=sc.mode==='zoom-fallback'?S.zoomFallback(G,C,{hudRects:sc.hudRects}):null;
    return{v:{ok:v.ok,touch:v.touch.minCentreDistance,tile:v.touch.minVisibleTileEdge,token:v.tokens.tokenDiameterPt,proj:v.projection.ok,sky:v.skyline.ok,tok:v.tokens.ok,route:Object.values(v.route).every(x=>x.ok),hud:v.hud.errors.filter(e=>!e.startsWith('target-under-hud')).length===0,nodes:v.projection.nodes},z,overlay:__circuitUI.overlay(),drawn:__circuitUI.projected()}},[D,sc,cam]);
   // Same numbers as Node (the report the designer receives).
   const N=SS.validate({layout:D.layout,cam,vp,hudRects:sc.hudRects,board:sc.board,spec:D.geometry});
   assert.equal(r.v.touch,N.touch.minCentreDistance);assert.equal(r.v.tile,N.touch.minVisibleTileEdge);
   for(const a of r.v.nodes){const b=N.projection.nodes.find(x=>x.id===a.id);assert.ok(Math.abs(a.x-b.x)<.05&&Math.abs(a.y-b.y)<.05,`${id} ${a.id} projection differs`)}
   // The renderer draws nodes exactly where the validator measured them.
   for(const d of r.drawn){const b=N.projection.nodes.find(x=>x.id===d.id);assert.ok(Math.abs(d.x-b.x)<.06&&Math.abs(d.y-b.y)<.06,`${id} ${d.id} drawn off`)}
   // 3. Drawn tokens and both route previews.
   const t=Object.values(r.overlay.tokens);assert.equal(t.length,4);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.hypot(t[i].x-t[j].x,t[i].y-t[j].y)>=t[i].r+t[j].r-.01,`${id} tokens overlap`);
   assert.ok(r.overlay.routeStay.length===12&&r.overlay.routeCross.length===12,`${id} route previews`);
   const pass=sc.mode==='full'?r.v.ok:(r.v.proj&&r.v.sky&&r.v.tok&&r.v.route&&r.v.hud&&r.z.ok);
   rows.push({id,cn,mode:sc.mode,pass,touch:r.v.touch,tile:r.v.tile,token:r.v.token,zoom:r.z&&{factor:r.z.factor,spacing:r.z.zoomSpacing}});
   if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,`design-${engine}-${id}-${cn}.png`)})}}
  await context.close()}
 for(const r of rows)console.log(`  ${r.pass?'PASS':'FAIL'} ${r.cn.padEnd(7)} ${r.id.padEnd(10)} ${r.mode.padEnd(13)} spacing ${r.touch} · tile ${r.tile} · token ${r.token}${r.zoom?` · zoom ×${r.zoom.factor} → ${r.zoom.spacing}`:''}`);
 assert.deepEqual(rows.filter(r=>!r.pass).map(r=>r.cn+' '+r.id),[]);
 ok(`${D.name}: ${rows.length}/${rows.length} screen×camera combinations pass in ${engine} (page HUD = package HUD; browser numbers = Node numbers; drawn = measured)`);
 assert.deepEqual(errors,[]);console.log(`circuit-design-browser (${engine}): ${n} checks passed`);await browser.close();server.close();
})().catch(async e=>{console.error(e);console.error(errors);try{await browser.close();server.close()}catch(x){}process.exit(1)});
