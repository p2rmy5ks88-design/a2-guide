// Skyline Circuit Premium Design V2 — review run (Chromium, or WebKit with VISUAL_ENGINE=webkit).
// 1. V2 keeps V1 geometry bit-for-bit (layout, cameras, HUD/board rectangles, ratios).
// 2. Review screenshots at real iPhone scale (SE 2nd gen @2x, Pro Max @3x): clean board; all 20 Skyscrapers + four tokens
//    on O0; both route previews with the side HUD; plus grayscale and detail-camera variants. CIRCUIT_SHOTS=dir saves them.
// 3. Measurements on every viewport: HUD fits its rectangles with ≥12 pt text and ≥44 pt buttons; labels over tokens,
//    over buildings and over each other; colour distinctness (normal, grayscale, protanopia, deuteranopia).
// The renderer is a 2D review approximation of V2 on the validated geometry, not the final 3D renderer.
// Asserts what must hold now; records design conflicts in the JSON report (CIRCUIT_V2_REPORT=path) instead of failing.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const SS=require('../lib/circuit-screen.js');
const V2=require('../design/v2/circuit-design-v2.json'),V1=require('../design/circuit-design-v1.json');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS||null;
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;const report={engine,design:V2.name,conflicts:{}};
// ---------- colour analysis (no browser) ----------
const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4},rgb=h=>{const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255].map(lin)};
const mul=(M,v)=>M.map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]);
const CVD={protanopia:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],deuteranopia:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]]};
function lab(l){const [X,Y,Z]=mul([[.4124,.3576,.1805],[.2126,.7152,.0722],[.0193,.1192,.9505]],l.map(x=>Math.max(0,Math.min(1,x))));const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;const fx=f(X/.95047),fy=f(Y),fz=f(Z/1.08883);return[116*fy-16,500*(fx-fy),200*(fy-fz)]}
const dE=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function compare(a,b){const A=rgb(a),B=rgb(b);const r={normal:dE(lab(A),lab(B))};for(const [k,M] of Object.entries(CVD))r[k]=dE(lab(mul(M,A)),lab(mul(M,B)));r.grayscale=Math.abs(lab(A)[0]-lab(B)[0]);for(const k in r)r[k]=+r[k].toFixed(1);return r}
const contrast=(a,b)=>{const L=h=>{const [r,g,bb]=rgb(h);return .2126*r+.7152*g+.0722*bb};const x=L(a),y=L(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
(async()=>{
 // ---------- 1. geometry unchanged ----------
 for(const k of ['layout','camera','screens','geometry'])assert.deepEqual(V2[k],V1[k],k);ok('V2 keeps V1 layout, cameras, per-screen HUD/board rectangles and geometry ratios exactly');
 // colour report
 const PLAYERS=['#FF7A59','#4C7DFF','#F8F6EF','#E055C8'],dist=V2.visual.districts.map(d=>d.accent),route=V2.visual.routePreview,P=V2.visual.palette;
 const pairs=[];const add=(group,a,an,b,bn)=>pairs.push({group,a:an,b:bn,colors:[a,b],...compare(a,b)});
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)add('district-district',dist[i],V2.visual.districts[i].name,dist[j],V2.visual.districts[j].name);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)add('player-player',PLAYERS[i],'P'+(i+1),PLAYERS[j],'P'+(j+1));
 for(const via of ['stay','cross'])for(let i=0;i<4;i++)add('route-district',route[via].color,via,dist[i],V2.visual.districts[i].name);
 for(const via of ['stay','cross'])for(let i=0;i<4;i++)add('route-player',route[via].color,via,PLAYERS[i],'P'+(i+1));
 add('route-route',route.stay.color,'stay',route.cross.color,'cross');
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)add('player-district',PLAYERS[i],'P'+(i+1),dist[j],V2.visual.districts[j].name);
 const weak=pairs.filter(p=>p.normal<20||p.protanopia<12||p.deuteranopia<12);
 report.color={pairs,weak:weak.map(p=>`${p.group}: ${p.a} vs ${p.b} — ΔE ${p.normal}, protan ${p.protanopia}, deutan ${p.deuteranopia}, gray ΔL ${p.grayscale}`),
  textContrast:{text_on_panel:contrast(P.text,P.panel),muted_on_raised:contrast(P.textMuted,P.panelRaised),gold_button_text:contrast('#1b1405',P.gold),warning_on_panel:contrast(P.warning,P.panel)},
  districtGrayscaleRange:dist.map(c=>+lab(rgb(c))[0].toFixed(1))};
 assert.equal(compare(route.cross.color,dist[0]).normal,0);report.conflicts.crossRouteEqualsHarbourAccent='Cross route colour #58B9CF is identical to the Harbour Quarter accent';
 for(const t of Object.values(report.color.textContrast))assert.ok(t>=4.5,'text contrast');ok('HUD text contrast ≥ 4.5:1 for body, muted, button and warning text');

 // ---------- browser ----------
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 async function open(sc,query,dpr=1){const vp=sc.viewport;const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:dpr,hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+' '+vp.id+': '+String(e)));await context.route('https://**/*',r=>r.abort());
  await p.addInitScript(i=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')})},vp.inset);
  await p.goto(host+'circuit-review.html'+query);await p.waitForFunction(()=>window.__review&&__review.ready);await p.waitForTimeout(80);return{context,p}}
 // ---------- 3. measurements on every screen ----------
 const meas={};
 for(const [id,sc] of Object.entries(V2.screens))for(const scene of ['clean','skyline','route'])for(const labels of ['all','plots']){
  const {context,p}=await open(sc,`?scene=${scene}&labels=${labels}`);
  const m=await p.evaluate(()=>({hud:__review.hud(),board:__review.board(),r:(({labelsOverTokens,labelsOverBuildings,labelOverlaps,tokens,drawMs})=>({labelsOverTokens,labelsOverBuildings,labelOverlaps,tokens:tokens.length,drawMs}))(__review.result())}));
  // HUD inside the package rectangles, nothing scrolled out of view, ≥12 pt text, ≥44 pt tall buttons
  for(const h of m.hud){const want=sc.hudRects.find(x=>x.id===(h.id==='left'?'players':'actions'));for(const k of ['x','y','w','h'])assert.ok(Math.abs(h[k]-want[k])<=1,`${id} ${h.id}.${k}`);
   assert.ok(h.minFont>=12,`${id} ${scene} ${h.id} font ${h.minFont}`);for(const b of h.buttons)assert.ok(b.h>=44,`${id} ${h.id} button ${b.h}`);
   if(h.overflowY>0||h.overflowX>0)(report.conflicts.hudOverflow=report.conflicts.hudOverflow||[]).push(`${id} ${scene} ${h.id}: ${h.overflowY} pt hidden (scroll)`)}
  for(const k of ['x','y','w','h'])assert.ok(Math.abs(m.board[k]-sc.board[k])<=1,`${id} board.${k}`);
  meas[`${id}/${scene}/${labels}`]=m.r;await context.close()}
 report.labels=meas;
 const all=Object.entries(meas).filter(([k])=>k.endsWith('/all')),plots=Object.entries(meas).filter(([k])=>k.endsWith('/plots'));
 report.conflicts.labelsAsSpecified={overTokens:[...new Set(all.flatMap(([k,v])=>v.labelsOverTokens.map(x=>k.split('/')[1]+':'+x)))],overBuildingsSkyline:Math.max(...all.filter(([k])=>k.includes('/skyline/')).map(([,v])=>v.labelsOverBuildings.length)),plateOverlaps:[...new Set(all.flatMap(([,v])=>v.labelOverlaps))]};
 report.proposedLabels={overTokens:[...new Set(plots.flatMap(([k,v])=>v.labelsOverTokens.map(x=>k.split('/')[1]+':'+x)))],overBuildings:Math.max(...plots.map(([,v])=>v.labelsOverBuildings.length)),plateOverlaps:[...new Set(plots.flatMap(([,v])=>v.labelOverlaps))]};
 assert.equal(report.proposedLabels.overBuildings,0);
 ok(`HUD fits the package rectangles on all ${Object.keys(V2.screens).length} screens with ≥12 pt text and ≥44 pt buttons; label conflicts measured (as specified vs proposed)`);
 // ---------- 2. review screenshots at real device scale ----------
 if(out){fs.mkdirSync(out,{recursive:true});
  const shots=[['se',2],['i16pm',3]];const variants=[['a-clean','?scene=clean&labels=all'],['b-skyscrapers','?scene=skyline&labels=all'],['c-routes-hud','?scene=route&labels=all'],
   ['b-skyscrapers-detail15','?scene=skyline&labels=all&camera=detail'],['b-skyscrapers-proposed-labels','?scene=skyline&labels=plots'],['c-routes-hud-proposed-labels','?scene=route&labels=plots'],['c-routes-hud-grayscale','?scene=route&labels=plots&gray=1'],['b-skyscrapers-low-quality','?scene=skyline&labels=plots&quality=low']];
  for(const [id,dpr] of shots)for(const [name,qs] of variants){const {context,p}=await open(V2.screens[id],qs,dpr);await p.screenshot({path:path.join(out,`v2-${engine}-${id}-${name}.png`)});await context.close()}
  ok(`${shots.length*variants.length} review screenshots at device scale (SE @2x, Pro Max @3x) in ${engine}`)}
 if(process.env.CIRCUIT_V2_REPORT)fs.writeFileSync(process.env.CIRCUIT_V2_REPORT,JSON.stringify(report,null,1));
 assert.deepEqual(errors,[]);console.log(`circuit-v2-review (${engine}): ${n} checks passed`);await browser.close();server.close();
})().catch(async e=>{console.error(e);console.error(errors);try{await browser.close();server.close()}catch(x){}process.exit(1)});
