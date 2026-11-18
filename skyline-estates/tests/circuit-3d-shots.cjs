// Visual-review screenshots of the Circuit 3D renderer at native iPhone landscape resolution
// (SE 2nd gen 667x375 @2x = 1334x750, Medium tier; Pro Max 956x440 @3x = 2868x1320, High tier).
//   CIRCUIT_SHOTS=dir node tests/circuit-3d-shots.cjs        (VISUAL_ENGINE=webkit for WebKit)
// Scenes are real rules states; ownership/stages are set directly for the review scenes.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path');
const D=require('../design/v2/circuit-design-v2.json');
const root=path.resolve(__dirname,'../..'),engine=process.env.VISUAL_ENGINE||'chromium',out=process.env.CIRCUIT_SHOTS;if(!out)throw Error('set CIRCUIT_SHOTS');
(async()=>{fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const host=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 const browser=await({chromium,webkit}[engine]).launch({headless:true});const errors=[];
 async function shot(id,dpr,tier,name,setup,cam=null){const sc=D.screens[id],vp=sc.viewport;const ctx=await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:dpr,serviceWorkers:'block'}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(String(e)));await p.addInitScript(i=>{document.addEventListener('DOMContentLoaded',()=>{const d=document.documentElement.style;d.setProperty('--sal',i.l+'px');d.setProperty('--sar',i.r+'px');d.setProperty('--sat',i.t+'px');d.setProperty('--sab',i.b+'px')})},vp.inset);
  await p.goto(host+`circuit-alpha.html?test=1&speed=instant&quality=${tier}`);await p.waitForSelector('#cx-start');
  await p.evaluate(async([setup,cam])=>{const SC=SkylineCircuit;const s=SC.newMatch({seed:2026,length:'standard',fx:true,players:[{name:'You'},{name:'Ada',level:'normal'},{name:'Bo',level:'normal'},{name:'Cy',level:'hard'}]});
   if(setup==='skyline'){for(const id of SC.PROPS){const n=SC.NODES.find(x=>x.id===id);s.own[id]={o:n.quadrant,h:4}}for(const p of s.players)p.pos='O0'}
   if(setup==='progression'){SC.DISTRICTS.forEach((ids,q)=>ids.forEach((id,k)=>{s.own[id]={o:(q+k)%4,h:k}}));s.phase='build'}
   if(setup==='route'){let g=0;while(!s.over&&g++<20000){const pd=SC.pending(s);if(s.round>=9&&pd.type==='roll'&&pd.player===0)break;SC.act(s,pd.player,SC.ai(s,pd.player))}const lead=[...s.players].sort((a,b)=>b.inf-a.inf)[0];s.clock={pid:lead.id,round:s.round,since:s.round}}
   await __circuitUI.load(s);await new Promise(r=>setTimeout(r,400));__circuitUI.overview();if(cam){const R=__circuitUI.r3();R.setCamera(cam);R.markDirty();R.render()}},[setup,cam]);
  await p.waitForTimeout(700);if(cam)await p.evaluate(c=>{const R=__circuitUI.r3();R.setCamera(c);R.markDirty();R.render()},cam);
  const file=path.join(out,`${engine}-${id}-${name}.png`);await p.screenshot({path:file});const st=await p.evaluate(()=>__circuitUI.r3().stats());console.log(path.basename(file),tier,st.calls+' calls',st.triangles+' tris');await ctx.close()}
 for(const [id,dpr,tier] of [['se',2,'medium'],['i16pm',3,'high']]){
  await shot(id,dpr,tier,'1-clean','clean');await shot(id,dpr,tier,'2-all-skyscrapers','skyline');await shot(id,dpr,tier,'3-routes','route');}
 await shot('i16pm',3,'high','4-progression-top','progression');await shot('i16pm',3,'high','5-progression-cinematic-15','progression',{pitch:15,dist:5});await shot('se',2,'medium','5-skyscrapers-cinematic-15','skyline',{pitch:15,dist:5});
 for(const t of ['low','medium','high'])await shot('i16pm',3,t,`6-quality-${t}`,'skyline');
 console.log(errors.length?errors:'no page errors');await browser.close();server.close()})().catch(e=>{console.error(e);process.exit(1)});
