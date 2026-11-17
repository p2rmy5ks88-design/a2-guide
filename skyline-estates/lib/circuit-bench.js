/* Skyline Circuit — on-device benchmark for the 3D renderer (QA only; circuit-alpha.html?bench=1).
   Runs fixed scenarios and reports frame timing, draw cost, memory (where the browser exposes it) and the adaptive
   quality tier, with a Copy button so a tester can paste the JSON back. It drives the public test hooks only; it never
   changes rules or saves (the match it plays is not saved: it runs with a fixed seed in a throwaway state). */
(function(){'use strict';
if(new URLSearchParams(location.search).get('bench')!=='1'&&!window.__circuitBenchAuto)return;
const wait=ms=>new Promise(r=>setTimeout(r,ms)),raf=()=>new Promise(r=>requestAnimationFrame(r));
const pct=(a,q)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(q*s.length))].toFixed(2)};
function device(){const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');let gpu=null,max=null;
 try{const d=g&&g.getExtension('WEBGL_debug_renderer_info');gpu=g?(d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)):null;max=g?g.getParameter(g.MAX_TEXTURE_SIZE):null}catch(e){}
 return{ua:navigator.userAgent,dpr:window.devicePixelRatio,viewport:[innerWidth,innerHeight],screen:[screen.width,screen.height],cores:navigator.hardwareConcurrency||null,memoryGB:navigator.deviceMemory||null,gpu,maxTexture:max,
  reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,webgl2:!!document.createElement('canvas').getContext('webgl2')}}
function mem(){try{const m=performance.memory;return m?{usedMB:+(m.usedJSHeapSize/1048576).toFixed(1),totalMB:+(m.totalJSHeapSize/1048576).toFixed(1)}:null}catch(e){return null}}
async function measure(name,ms,{continuous=false,each=null}={}){const U=window.__circuitUI,R=U.r3(),iv=[],tiers=[];let last=0,t0=performance.now(),tier=R.tier;const m0=mem(),rf0=R.stats().frameMs.length;
 while(performance.now()-t0<ms){const now=await raf();if(last)iv.push(now-last);last=now;if(continuous){R.markDirty();R.tick(now)}if(each)each(now-t0);if(R.tier!==tier){tiers.push({atMs:Math.round(now-t0),from:tier,to:R.tier});tier=R.tier}}
 const st=R.stats(),fps=iv.length?1000/(iv.reduce((a,b)=>a+b,0)/iv.length):0;
 return{name,ms,frames:iv.length,fps:+fps.toFixed(1),frameP50:pct(iv,.5),frameP95:pct(iv,.95),frameP99:pct(iv,.99),longFrames50:iv.filter(x=>x>50).length,renderMsP95:pct(st.frameMs,.95),
  calls:st.calls,triangles:st.triangles,textures:st.textures,geometries:st.geometries,pixelRatio:st.pixelRatio,tierEnd:R.tier,tierChanges:tiers,memoryStart:m0,memoryEnd:mem()}}
function stateFor(kind){const SC=window.SkylineCircuit;const s=SC.newMatch({seed:2026,length:'standard',fx:true,players:[{name:'You'},{name:'Ada',level:'normal'},{name:'Bo',level:'normal'},{name:'Cy',level:'hard'}]});
 if(kind==='skyline'){for(const id of SC.PROPS){const n=SC.NODES.find(x=>x.id===id);s.own[id]={o:n.quadrant,h:4}}}
 if(kind==='ai')for(const p of s.players)p.ai=p.ai||'route';return s}
async function run(panel){const U=window.__circuitUI;const out={tool:'circuit-bench v1',startedAt:new Date().toISOString(),device:device(),tierStart:null,results:[]};
 const log=t=>{panel.querySelector('pre').textContent=t};
 log('Preparing…');await U.load(stateFor('clean'));await wait(600);U.overview&&U.overview();out.tierStart=U.r3().tier;
 log('1/4 Idle board (5 s)…');out.results.push(await measure('idle',5000));
 await U.load(stateFor('skyline'));await wait(500);U.overview&&U.overview();
 log('2/4 Worst case: all Skyscrapers, routes, continuous redraw with adaptive quality (15 s)…');out.results.push(await measure('worst-case-continuous',15000,{continuous:true}));
 log('3/4 Cinematic camera 0°→15°→0° (6 s)…');const R=U.r3();out.results.push(await measure('cinematic',6000,{continuous:true,each:t=>{const k=(Math.sin(t/6000*Math.PI*2-Math.PI/2)+1)/2;R.setCamera({pitch:15*k,dist:6-k})}}));R.setCamera({pitch:0,dist:6});
 log('4/4 Computer-played match, normal animation speed (20 s)…');await U.load(stateFor('ai'));await wait(300);out.results.push(await measure('ai-match',20000));
 out.finishedAt=new Date().toISOString();out.note='Frame times are rAF intervals; renderMs is CPU time inside renderer.render (GPU time is not measurable in the browser). Memory is only reported where the browser exposes it (not Safari).';
 log(JSON.stringify(out,null,1));panel.querySelector('button').disabled=false;window.__circuitBench=out;return out}
document.addEventListener('DOMContentLoaded',()=>{const panel=document.createElement('div');panel.id='cx-bench';
 panel.innerHTML='<div class="cx-bh"><b>Circuit device benchmark</b> <button disabled>Copy results</button></div><pre>Starting…</pre>';
 Object.assign(panel.style,{position:'fixed',left:'8px',right:'8px',bottom:'8px',maxHeight:'45vh',overflow:'auto',background:'#0B1633ee',color:'#F8F6EF',font:'12px/1.3 ui-monospace,monospace',padding:'8px',borderRadius:'10px',zIndex:50,border:'1px solid #F2C45766'});
 document.body.appendChild(panel);panel.querySelector('button').onclick=async()=>{const t=JSON.stringify(window.__circuitBench,null,1);try{await navigator.clipboard.writeText(t);panel.querySelector('button').textContent='Copied'}catch(e){const r=document.createRange();r.selectNodeContents(panel.querySelector('pre'));getSelection().removeAllRanges();getSelection().addRange(r);panel.querySelector('button').textContent='Selected — copy manually'}};
 const go=async()=>{for(let i=0;i<100&&!(window.__circuitUI&&document.querySelector('#cx-start'));i++)await wait(100);document.querySelector('#cx-start').click();for(let i=0;i<100&&!(window.__circuitUI.r3&&window.__circuitUI.r3());i++)await wait(100);
  if(!window.__circuitUI.r3()){panel.querySelector('pre').textContent='3D renderer unavailable on this device (WebGL off?) — the 2D fallback is in use.';return}await run(panel)};go().catch(e=>{panel.querySelector('pre').textContent='Benchmark error: '+(e&&e.stack||e)})})})();
