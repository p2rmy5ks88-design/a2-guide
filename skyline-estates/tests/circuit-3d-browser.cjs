// Skyline Circuit 3D renderer (draft) — checks in Chromium or WebKit (VISUAL_ENGINE=webkit). Software WebGL in CI.
// Every supported viewport (V1 baseline screens): the 3D camera reproduces the validated projection; buildings stay
// inside the validated envelopes; with all 20 Skyscrapers and four tokens on O0 every node and token is visible in the
// actual 3D render (ID pass); both routes are on screen in their approved colours; labels follow the approved rules;
// HUD fits its rectangles with ≥12 pt text and ≥44 pt targets. Plus tier budgets, cinematic camera and reduced motion.
//   CIRCUIT_SHOTS=dir      device-scale screenshots (SE @2x Medium, Pro Max @3x High): clean, all Skyscrapers, routes
//   CIRCUIT_3D_REPORT=path JSON with measurements per viewport and tier.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const D=require('../design/v2/circuit-design-v2.json');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS||null;
let n=0;const ok=m=>{n++;console.log('PASS',m)};const errors=[];let browser,server;const report={engine,viewports:{},tiers:{}};
const BUDGET={low:{calls:120,triangles:60000},medium:{calls:250,triangles:150000},high:{calls:450,triangles:350000}};
(async()=>{
 server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined}:{})});
 async function open(sc,{query='',dpr=1,reduced=false}={}){const vp=sc.viewport;const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:dpr,hasTouch:true,serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(engine+' '+vp.id+': '+String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(engine+' '+vp.id+' console: '+m.text())});await context.route('https://**/*',r=>r.abort());
  await p.addInitScript(i=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')})},vp.inset);
  await p.goto(host+'circuit-alpha.html?test=1'+(query.includes('speed=')?'':'&speed=instant')+query);await p.waitForSelector('#cx-start');return{context,p}}
 // Load a scene built from real rules state (review only: Skyscraper ownership is set directly).
 const scene=(p,name,tokensAt=null)=>p.evaluate(async([name,tokensAt])=>{const SC=SkylineCircuit;const s=SC.newMatch({seed:2026,length:'standard',fx:true,players:[{name:'You'},{name:'Ada',level:'normal'},{name:'Bo',level:'normal'},{name:'Cy',level:'hard'}]});
  if(name==='skyline'){for(const id of SC.PROPS){const n=SC.NODES.find(x=>x.id===id);s.own[id]={o:n.quadrant,h:4}}}
  if(name==='route'){let g=0;while(!s.over&&g++<20000){const pd=SC.pending(s);if(s.round>=9&&pd.type==='roll'&&pd.player===0)break;SC.act(s,pd.player,SC.ai(s,pd.player))}const lead=[...s.players].sort((a,b)=>b.inf-a.inf)[0];s.clock={pid:lead.id,round:s.round,since:s.round}}
  if(tokensAt)for(const p of s.players)p.pos=tokensAt;await __circuitUI.load(s);await new Promise(r=>setTimeout(r,250));return !!__circuitUI.r3()},[name,tokensAt]);
 // ---------- per-viewport checks ----------
 for(const [id,sc] of Object.entries(D.screens)){const {context,p}=await open(sc,{query:'&quality=medium'});
  assert.ok(await scene(p,'skyline','O0'),id+' 3D renderer active');
  const r=await p.evaluate(()=>{const U=__circuitUI,R=U.r3(),G=R.G,C=R.C,SC=SkylineCircuit;
   // (1) same projection as the validators
   let maxErr=0;for(const id of Object.keys(G.nodes)){const a=C.project({...G.nodes[id],z:0}),b=R.projectNode(id);maxErr=Math.max(maxErr,Math.hypot(a.x-b.x,a.y-b.y))}
   // (2) envelopes
   const env=R.envelopeReport(),envBad=env.filter(e=>e.halfX>e.maxHalf+.01||e.halfZ>e.maxHalf+.01||e.top>e.maxTop+.01).map(e=>e.id);
   // (3) ID pass: 5 samples per node (roof for properties, tile top otherwise) and the four token tops on O0
   const ids=Object.keys(G.nodes),pts=[],meta=[];for(const id of ids){const n=G.nodes[id],k=.3*G.tile,z=n.type==='property'?G.stageHeight[4]:4.3;
    for(const [u,v] of [[0,0],[-k,-k],[k,-k],[k,k],[-k,k]]){const c=Math.cos(n.ang),s=Math.sin(n.ang);pts.push(C.project({x:n.x+u*c-v*s,y:n.y+u*s+v*c,z}));meta.push({id,kind:n.type==='property'?2:1,i:ids.indexOf(id)})}}
   const tok=[0,1,2,3].map(i=>{const q=SkylineCircuitScreen.tokenPoint(G,'O0',i);return C.project({...q,z:q.z+4.2})});
   const res=R.idPass([...pts,...tok]);const vis={};meta.forEach((m,j)=>{const x=res[j];vis[m.id]=(vis[m.id]||0)+(x&&(((x.kind===1||x.kind===2)&&x.i===m.i)||(x.kind===3&&m.id==='O0'))?1:0) /* own tile, own building, or the tokens standing on it */});
   const hidden=Object.entries(vis).filter(([,v])=>v<3).map(([k,v])=>k+':'+v+'/5');const tokOk=tok.map((_,i)=>res[pts.length+i]).map((x,i)=>!!x&&x.kind===3&&x.i===i);
   // (4) labels: only junctions and events (all developed), O0 hidden under tokens
   const labels=[...document.querySelectorAll('.c3-l')],labelIds=labels.map(e=>e.dataset.id).sort(),labelFont=Math.min(...labels.map(e=>parseFloat(getComputedStyle(e).fontSize)));
   const hud=U.hudRects(),labelUnderHud=labels.filter(e=>{const b=e.getBoundingClientRect();return hud.some(h=>b.right>h.x&&b.left<h.x+h.w&&b.bottom>h.y&&b.top<h.y+h.h)}).map(e=>e.dataset.id);
   // (5) HUD: ≥12 pt text, ≥44 pt targets
   const texts=[...document.querySelectorAll('#cx-players *,#cx-actions *')].filter(x=>[...x.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())),minFont=Math.min(...texts.map(x=>parseFloat(getComputedStyle(x).fontSize)));
   const buttons=[...document.querySelectorAll('#cx-actions button')].map(b=>b.getBoundingClientRect()).filter(b=>b.width).map(b=>Math.min(b.width,b.height));
   return{maxErr,envCount:env.length,envBad,hidden,tokOk,labelIds,labelFont,labelUnderHud,minFont,minButton:Math.min(...buttons),hud,board:U.boardRect(),stats:R.stats()}});
  assert.ok(r.maxErr<.05,`${id} projection error ${r.maxErr}`);
  assert.equal(r.envCount,20);assert.deepEqual(r.envBad,[],id+' envelope');
  assert.deepEqual(r.hidden,[],id+' hidden nodes');assert.deepEqual(r.tokOk,[true,true,true,true],id+' tokens on O0');
  assert.deepEqual(r.labelIds,['I0','I3','I6','I9','O10','O13','O15','O18','O3','O5','O8'],id+' labels');assert.ok(r.labelFont>=12);assert.deepEqual(r.labelUnderHud,[]);
  assert.ok(r.minFont>=12,id+' font '+r.minFont);assert.ok(r.minButton>=44,id+' button '+r.minButton);
  for(const [a,b] of [[r.board,sc.board],...sc.hudRects.map(h=>[r.hud.find(x=>x.id===h.id),h])])for(const k of ['x','y','w','h'])assert.ok(Math.abs(a[k]-b[k])<=1,`${id} ${k}`);
  // (6) both routes on screen in the approved colours (route scene)
  await scene(p,'route');const rt=await p.evaluate(()=>{const U=__circuitUI,R=U.r3(),s=U.state(),me=s.players[0];const S=R.routeSamples(me.pos),cv=document.getElementById('cx-board'),b=cv.getBoundingClientRect();
   R.markDirty();R.render();const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const x=c.getContext('2d');x.drawImage(cv,0,0);const k=cv.width/b.width;
   const near=(px,hex)=>{const n=parseInt(hex.slice(1),16),t=[n>>16&255,n>>8&255,n&255];return Math.abs(px[0]-t[0])+Math.abs(px[1]-t[1])+Math.abs(px[2]-t[2])<90};
   const frac=(list,hex)=>{let hit=0;for(const p of list){let f=false;for(let dx=-2;dx<=2&&!f;dx++)for(let dy=-2;dy<=2&&!f;dy++){const d=x.getImageData(Math.round((p.x-b.left)*k)+dx,Math.round((p.y-b.top)*k)+dy,1,1).data;if(near(d,hex))f=true}if(f)hit++}return hit/list.length};
   return{stay:frac(S.stay,'#F2C457'),cross:frac(S.cross,'#70F0C2'),overlay:U.overlay()}});
  assert.ok(rt.stay>=.5&&rt.cross>=.5,`${id} route pixels stay ${rt.stay} cross ${rt.cross}`);assert.equal(rt.overlay.routeStay.length,12);assert.equal(rt.overlay.routeCross.length,12);
  report.viewports[id]={projectionErrPt:+r.maxErr.toFixed(4),labelFont:r.labelFont,minHudFont:r.minFont,minButton:+r.minButton.toFixed(1),routeVisible:{stay:+rt.stay.toFixed(2),cross:+rt.cross.toFixed(2)},stats:r.stats};
  await context.close()}
 ok(`${Object.keys(D.screens).length} viewports: 3D projection = validated projection; 20 buildings inside envelopes; all 32 nodes and four O0 tokens visible in the 3D ID pass with every Skyscraper; approved label rules; both routes drawn in approved colours; HUD ≥12 pt text and ≥44 pt targets`);
 // ---------- tiers: draw-call and triangle budgets on the worst case (all Skyscrapers + routes) ----------
 const pm=D.screens.i16pm;for(const tier of ['low','medium','high']){const {context,p}=await open(pm,{query:'&quality='+tier,dpr:3});await scene(p,'skyline','O0');
  const st=await p.evaluate(()=>{const R=__circuitUI.r3();R.markDirty();R.render();return R.stats()});report.tiers[tier]=st;
  assert.equal(st.tier,tier);assert.ok(st.calls<=BUDGET[tier].calls&&st.triangles<=BUDGET[tier].triangles,`${tier} budget ${st.calls} calls ${st.triangles} tris`);await context.close()}
 ok(`tier budgets on the worst case: ${['low','medium','high'].map(t=>`${t} ${report.tiers[t].calls} calls/${report.tiers[t].triangles} tris (≤${BUDGET[t].calls}/${BUDGET[t].triangles})`).join('; ')}`);
 // ---------- cinematic camera (≤15°, no selection while tilted) and reduced motion ----------
 for(const reduced of [false,true]){const {context,p}=await open(D.screens.i12,{query:'&quality=low&speed=normal',reduced});await p.click('#cx-start');await p.waitForFunction(()=>__circuitUI.r3());await p.waitForTimeout(300);
  await p.click('#cx-roll');let maxPitch=0,tiltedHit=null;for(let i=0;i<40;i++){await p.waitForTimeout(25);const c=await p.evaluate(()=>({pitch:__circuitUI.r3().camera.pitch,busy:__circuitUI.busy(),hit:__circuitUI.hit(...(()=>{const q=__circuitUI.projected().find(x=>x.id==='O1');return[q.x,q.y]})())}));maxPitch=Math.max(maxPitch,c.pitch);if(c.pitch>0&&tiltedHit===null)tiltedHit=c.hit}
  // back at the player's next decision (computer turns in between tilt again while they move)
  await p.waitForFunction(()=>document.querySelector('#cx-actions [data-state]')?.dataset.state==='roll'||document.querySelector('#cx-actions [data-state]')?.dataset.state==='buy'||document.querySelector('#cx-actions [data-state]')?.dataset.state==='build',null,{timeout:60000});
  await p.waitForFunction(()=>__circuitUI.r3().camera.pitch===0,null,{timeout:5000}).catch(()=>{});const end=await p.evaluate(()=>__circuitUI.r3().camera.pitch);
  if(reduced)assert.equal(maxPitch,0,'reduced motion keeps 0°');else{assert.ok(maxPitch>0&&maxPitch<=15,'cinematic pitch '+maxPitch);assert.equal(tiltedHit,null,'no selection while tilted')}
  assert.equal(end,0,'back to the decision camera');report['cinematic_'+(reduced?'reduced':'normal')]={maxPitch};await context.close()}
 ok('cinematic camera tilts at most 15° while moving, blocks selection while tilted and returns to 0°; reduced motion keeps 0°');
 // ---------- screenshots at device scale ----------
 if(out){fs.mkdirSync(out,{recursive:true});for(const [id,dpr,tier] of [['se',2,'medium'],['i16pm',3,'high']])for(const [name,sc,at] of [['a-clean','clean',null],['b-skyscrapers','skyline','O0'],['c-route-selection','route',null]]){
   const {context,p}=await open(D.screens[id],{query:'&quality='+tier,dpr});await scene(p,sc,at);await p.waitForTimeout(300);await p.screenshot({path:path.join(out,`3d-${engine}-${id}-${name}.png`)});await context.close()}
  ok(`6 device-scale 3D screenshots in ${engine}`)}
 if(process.env.CIRCUIT_3D_REPORT)fs.writeFileSync(process.env.CIRCUIT_3D_REPORT,JSON.stringify(report,null,1));
 assert.deepEqual(errors,[]);console.log(`circuit-3d-browser (${engine}): ${n} checks passed`);await browser.close();server.close();
})().catch(async e=>{console.error(e);console.error(errors.slice(0,5));try{await browser.close();server.close()}catch(x){}process.exit(1)});
