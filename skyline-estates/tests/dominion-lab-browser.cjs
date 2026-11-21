/* Skyline Dominion interactive 3D lab: real taps/clicks drive the prototype rules engine (dominion-p0).
   Env: VISUAL_ENGINE=chromium|webkit, VISUAL_ORIGIN (default http://127.0.0.1:8790/), DOMINION_SHOTS output dir.
   Needs the local supplied assets in assets/dominion-local/ (see DOMINION-3D.md). physicalDevice is always false. */
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.VISUAL_ENGINE||'chromium',origin=process.env.VISUAL_ORIGIN||'http://127.0.0.1:8790/',out=process.env.DOMINION_SHOTS||path.resolve(__dirname,'../test-results/dominion-lab');fs.mkdirSync(out,{recursive:true});
const base=origin+'skyline-estates/dominion-production-lab.html';
const report={engine,physicalDevice:false,checks:[],errors:[],viewports:[]};const check=(name,ok,extra)=>{assert.ok(ok,name+(extra?' '+JSON.stringify(extra):''));report.checks.push(name);console.log('PASS',engine,name)};
const VPS=[{width:956,height:440,dpr:3,name:'956x440'},{width:844,height:390,dpr:3,safe:true,name:'844x390-safe'},{width:667,height:375,dpr:2,name:'667x375'}];
const launch=()=>({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});

async function open(browser,vp,url,normalMotion=false){const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,hasTouch:true,serviceWorkers:'block',reducedMotion:normalMotion?'no-preference':'reduce'});
 const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(String(e.stack||e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,300))});
 await p.goto(url);return{ctx,p}}
async function started(p,vp){if(vp.safe)await p.evaluate(()=>{for(const[k,v]of Object.entries({sal:47,sar:47,sab:21}))document.documentElement.style.setProperty('--'+k,v+'px')});
 await p.waitForFunction(()=>document.getElementById('loading')?.hidden||document.getElementById('loading')?.dataset.error,null,{timeout:300000});
 const err=await p.evaluate(()=>document.getElementById('loading').dataset.error||null);assert.equal(err,null,'assets load: '+err)}
const humanTurn=p=>p.waitForFunction(()=>{const s=__dominionLab.state();return s.phase==='over'||(SkylineDominion.pending(s).player===0&&SkylineDominion.pending(s).kind==='act'&&!__dominionLab.busy())},null,{timeout:300000});

(async()=>{const browser=await launch();try{
 // ---------- full interaction pass at the large-phone landscape target ----------
 {const vp=VPS[0],{ctx,p}=await open(browser,vp,base+'?seed=838&speed=instant',true);
  await p.evaluate(()=>{localStorage.setItem('skylineSave','CLASSIC-SENTINEL');localStorage.setItem('skylineCircuitSave','CIRCUIT-SENTINEL')});
  await p.click('#start');await started(p,vp);
  const st=await p.evaluate(()=>__dominionLab.r3().stats());report.stats=st;
  check('61 live nodes (48 track spaces + 8 plazas + Central + 4 contest exchanges) and four visible tokens',st.nodes===61&&st.tokensVisible===4);
  check("Claude's supplied art-matched Dominion board (48-space hexagonal track) and city GLBs submitted to the GPU",st.files.includes('board_dominion_48.glb')&&st.files.includes('dominion_waterfront_city.glb')&&st.triangles>300000);
  check('five stage models loaded (Plot, Low-rise, Mid-rise, High-rise, Skyscraper)',['dev_0_lot.glb','dev_1_midrise_L1.glb','dev_2_midrise_L2.glb','dev_4_highrise_L4.glb','dev_5_skyscraper_L5.glb'].every(f=>st.files.includes(f)));
  check('drawing buffer is native DPR × CSS board size (measured separately from screenshot size)',st.buffer[0]===Math.round(st.css[0]*Math.min(vp.dpr,3))&&st.buffer[1]===Math.round(st.css[1]*Math.min(vp.dpr,3)),{buffer:st.buffer,css:st.css});
  check('supplied track layout matches the rule track space-for-space (type and district)',await p.evaluate(()=>{const L=__dominionLab.r3().layout,D=SkylineDominion;return L.spaces.length===48&&L.spaces.every(sp=>{const[t,g]=D.TRACK[sp.index].split(':');return (t==='square'?'contest':t)===sp.type&&(g||null)===(sp.group||null)})}));
  check('every node projects inside the free board area between the HUD panels',await p.evaluate(()=>{const b=document.getElementById('board').getBoundingClientRect(),L=document.querySelector('.sk-left').getBoundingClientRect(),R=document.querySelector('.sk-right').getBoundingClientRect(),c={left:L.right,right:R.left,top:b.top,bottom:document.querySelector('.sk-strip').getBoundingClientRect().top};return SkylineDominion.NODES.every(n=>{const q=__dominionLab.r3().project(n.id);return q.x>=c.left&&q.x<=c.right&&q.y>=c.top&&q.y<=c.bottom})}));
  await humanTurn(p);
  const idle=await p.evaluate(()=>__dominionLab.r3().stats().renders);await p.waitForTimeout(1200);check('no continuous idle rendering',await p.evaluate(()=>__dominionLab.r3().stats().renders)===idle);
  // Real movement test: ordinary camera motion, not reduced-motion overview.
  // Manipulates only the renderer's test token; authoritative match state stays untouched.
  // First match runs with normal motion from context creation (Safari-safe).
  const normalMotion=await p.evaluate(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  check('regular motion enabled before moving the camera',normalMotion);
  const followProof=await p.evaluate(async()=>{
   const r=__dominionLab.r3(),state=__dominionLab.state(),from=state.players[0].pos,to=SkylineDominion.NODES.find(n=>n.id!==from).id;
   const samples=[],timer=setInterval(()=>samples.push(r.stats()),40);
   await r.moveToken(0,from,to,980);
   await new Promise(done=>setTimeout(done,1650));
   // SwiftShader can take several wall-clock seconds to submit a 3× frame.
   // Wait for the actual return instead of assuming a fixed frame count.
   const deadline=performance.now()+15000;
   while(r.stats().tracking>.05&&performance.now()<deadline)await new Promise(done=>setTimeout(done,200));
   clearInterval(timer);
   const current=r.stats(),result={max:Math.max(current.trackingPeak||0,...samples.map(x=>x.tracking||0)),upright:samples.every(x=>x.cameraUp?.[1]>.999),returned:current.tracking,redMotion:current.prefersReducedMotion,focused:current.focused};
   r.sync(SkylineDominion.view(state));return result;
  });
  check('smooth upright follow camera and overview recovery in regular motion',followProof.max>.07&&followProof.upright&&followProof.returned<.05&&!followProof.redMotion&&!followProof.focused,followProof);
  // No media-mode switch here: verify restored overview in the original context.
  // tap an adjacent unowned site on the 3D board
  const target=await p.evaluate(()=>{const s=__dominionLab.state(),D=SkylineDominion,me=s.players[0];return D.NEIGH[me.pos].find(id=>D.BY[id].type==='property'&&s.own[id].o<0)||Object.keys(__dominionLab.reach()).find(id=>D.BY[id].type==='property'&&s.own[id].o<0)});
  const pt=await p.evaluate(id=>__dominionLab.r3().project(id),target);await p.mouse.click(pt.x,pt.y);
  check('tapping the rendered node selects that node (deterministic hit test)',await p.evaluate(()=>__dominionLab.r3().stats().selected)===target,{target});
  const plan=await p.evaluate(id=>__dominionLab.reach()[id],target);const before=await p.evaluate(()=>{const s=__dominionLab.state();return{ap:s.players[0].ap,cash:s.players[0].cash}});
  await p.click('[data-go]');await p.waitForFunction(id=>__dominionLab.state().players[0].pos===id&&!__dominionLab.busy(),target,{timeout:60000});
  check('Move spends exactly the shown action points along legal edges',await p.evaluate(({b,c})=>__dominionLab.state().players[0].ap===b.ap-c,{b:before,c:plan.cost}));
  const price=await p.evaluate(id=>SkylineDominion.BY[id].price,target),cash=await p.evaluate(()=>__dominionLab.state().players[0].cash);
  await p.click('[data-act="buy"]');check('Buy charges once and transfers ownership',await p.evaluate(({id,cash,price})=>{const s=__dominionLab.state();return s.own[id].o===0&&s.players[0].cash===cash-price},{id:target,cash,price}));
  check('owned site shows its Plot model and owner ring',await p.evaluate(()=>__dominionLab.r3().stats().stagesShown)>=1);
  if(await p.locator('[data-act="develop"]:not([disabled])').count()){await p.click('[data-act="develop"]');check('Build creates a Low-rise in the rules and the 3D scene',await p.evaluate(id=>__dominionLab.state().own[id].h===1,target))}
  const why=await p.locator('[data-act="develop"] + .why').first().textContent().catch(()=>'');check('blocked actions explain why',/control|One upgrade|action points|cash/.test(why),{why});
  await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}-human-turn.png`)});
  // view controls never change the match
  const snap=await p.evaluate(()=>SkylineDominion.serialize(__dominionLab.state()));await p.click('#v-insp');await p.click('#v-over');check('Inspect/Overview keep match state unchanged',await p.evaluate(()=>SkylineDominion.serialize(__dominionLab.state()))===snap);
  // context loss recovery
  const lc=await p.evaluate(async()=>{const c=document.getElementById('board'),gl=c.getContext('webgl2')||c.getContext('webgl'),x=gl.getExtension('WEBGL_lose_context');if(!x)return'no-ext';x.loseContext();await new Promise(r=>setTimeout(r,300));x.restoreContext();await new Promise(r=>setTimeout(r,1500));__dominionLab.r3().invalidate();await new Promise(r=>setTimeout(r,500));return __dominionLab.r3().stats().renders});
  check('graphics context loss is recovered without touching the match',lc==='no-ext'||(typeof lc==='number'&&await p.evaluate(()=>SkylineDominion.serialize(__dominionLab.state()))===snap));
  // end turn → real AI turns → back to the human
  await p.click('#end');await humanTurn(p);check('AI opponents act only through the rules engine and return the turn',await p.evaluate(()=>{const s=__dominionLab.state();return s.phase==='over'||SkylineDominion.pending(s).player===0}));
  // save / resume
  const saved=await p.evaluate(()=>SkylineDominion.serialize(__dominionLab.state()));await p.reload();await p.locator('#resume').waitFor({state:'visible'});await p.click('#resume');await started(p,vp);
  check('resume restores the exact saved match in its own slot',await p.evaluate(()=>SkylineDominion.serialize(__dominionLab.state()))===saved);
  check('Classic and Circuit saves untouched',await p.evaluate(()=>localStorage.getItem('skylineSave')==='CLASSIC-SENTINEL'&&localStorage.getItem('skylineCircuitSave')==='CIRCUIT-SENTINEL'));
  await ctx.close()}
 // ---------- complete match through the visible End turn button ----------
 {const vp=VPS[0],{ctx,p}=await open(browser,vp,base+'?seed=4242&speed=instant&quality=low');await p.click('#start');await started(p,vp);let n=0;
  while(await p.evaluate(()=>__dominionLab.state().phase!=='over')){await humanTurn(p);if(await p.evaluate(()=>__dominionLab.state().phase==='over'))break;await p.click('#end');assert.ok(n++<40,'match too long')}
  const end=await p.evaluate(()=>{const s=__dominionLab.state();return{reason:s.endReason,winner:s.winner,round:s.round,ranking:SkylineDominion.ranking(s)}});report.completedMatch=end;
  check('a full match ends with a published reason and ranking shown',['district-control','round-limit','last-standing'].includes(end.reason)&&await p.locator('#again').isVisible());
  await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}-match-over.png`)});await ctx.close()}
 // ---------- viewport matrix: board, HUD and touch targets ----------
 for(const vp of VPS){const {ctx,p}=await open(browser,vp,base+'?seed=838&speed=instant&quality='+(vp.width<700?'medium':'high'));await p.click('#start');await started(p,vp);await humanTurn(p);
  const lay=await p.evaluate(()=>{const W=innerWidth,H=innerHeight,r=e=>e.getBoundingClientRect(),c=r(document.getElementById('board'));
   const btn=[...document.querySelectorAll('#dock button')].filter(b=>b.offsetParent).map(b=>{const q=r(b);return{t:b.textContent.trim().slice(0,20),w:q.width,h:q.height,in:q.left>=0&&q.right<=W+.5&&q.top>=0&&q.bottom<=H+.5}});
   const L2=r(document.querySelector('.sk-left')),R2=r(document.querySelector('.sk-right')),S2=r(document.querySelector('.sk-strip'));const nodesIn=SkylineDominion.NODES.filter(n=>{const q=__dominionLab.r3().project(n.id);return q.x>=L2.right&&q.x<=R2.left&&q.y>=c.top&&q.y<=S2.top}).length;
   const panels=['p-career','p-mech','p-groups','p-up','p-neg','p-sel'].every(id=>document.getElementById(id)),cards=document.querySelectorAll('#players .sk-card').length,fits=[...document.querySelectorAll('#players .sk-card .v')].every(e=>e.scrollWidth<=e.clientWidth+1);
   return{panels,cards,fits,W,H,canvas:[c.width,c.height],nodesIn,btn,hScroll:document.documentElement.scrollWidth>W,st:__dominionLab.r3().stats()}});
  report.viewports.push({vp,buffer:lay.st.buffer,css:lay.st.css,pixelRatio:lay.st.pixelRatio,screenshot:[vp.width*vp.dpr,vp.height*vp.dpr],triangles:lay.st.triangles,calls:lay.st.calls});
  check(`${vp.name}: all 61 nodes inside the free board area (not under panels or player strip)`,lay.nodesIn===61);
  check(`${vp.name}: every visible action button is on screen and ≥44 CSS px tall`,lay.btn.length>0&&lay.btn.every(b=>b.in&&b.h>=44),{bad:lay.btn.filter(b=>!(b.in&&b.h>=44))});
  check(`${vp.name}: no horizontal page overflow`,!lay.hScroll);
  check(`${vp.name}: HUD icons stay icon-sized (no oversized SVGs)`,await p.evaluate(()=>[...document.querySelectorAll('.sk-col svg,.sk-strip svg')].every(e=>{const q=e.getBoundingClientRect();return q.height<=48||e.closest('.sk-map,.sk-stages')})));
  check(`${vp.name}: art sidebars (career, mechanics, property groups, upgrades, negotiation) and four territory cards present; card figures not clipped`,lay.panels&&lay.cards===4&&lay.fits);
  await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}.png`)});await ctx.close()}
 check('no page errors',report.errors.length===0,{errors:report.errors.slice(0,3)});
}finally{fs.writeFileSync(path.join(out,`${engine}-report.json`),JSON.stringify(report,null,1));await browser.close()}
console.log(`${report.checks.length} checks passed on ${engine}`)})().catch(e=>{console.error(e);process.exit(1)});
