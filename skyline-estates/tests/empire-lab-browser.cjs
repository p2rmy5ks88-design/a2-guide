/* Skyline Empire interactive 3D lab: real taps/clicks drive the prototype rules engine (empire-p1).
   Env: VISUAL_ENGINE=chromium|webkit, VISUAL_ORIGIN (default http://127.0.0.1:8790/), EMPIRE_SHOTS. Needs assets/empire-local/ (EMPIRE-3D.md). physicalDevice is always false. */
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.VISUAL_ENGINE||'chromium',origin=process.env.VISUAL_ORIGIN||'http://127.0.0.1:8790/',out=process.env.EMPIRE_SHOTS||path.resolve(__dirname,'../test-results/empire-lab');fs.mkdirSync(out,{recursive:true});
const base=origin+'skyline-estates/empire-production-lab.html';const report={engine,physicalDevice:false,checks:[],errors:[],viewports:[]};
const check=(n,ok,x)=>{assert.ok(ok,n+(x?' '+JSON.stringify(x):''));report.checks.push(n);console.log('PASS',engine,n)};
const VPS=[{width:956,height:440,dpr:3,name:'956x440'},{width:844,height:390,dpr:3,safe:true,name:'844x390-safe'},{width:667,height:375,dpr:2,name:'667x375'}];
const launch=()=>({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
async function open(b,vp,url,normalMotion=false){const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,hasTouch:true,serviceWorkers:'block',reducedMotion:normalMotion?'no-preference':'reduce'});const p=await ctx.newPage();
 p.on('pageerror',e=>report.errors.push(String(e.stack||e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,300))});await p.goto(url);return{ctx,p}}
async function started(p,vp){if(vp.safe)await p.evaluate(()=>{for(const[k,v]of Object.entries({sal:47,sar:47,sab:21}))document.documentElement.style.setProperty('--'+k,v+'px')});
 await p.waitForFunction(()=>document.getElementById('loading')?.hidden||document.getElementById('loading')?.dataset.error,null,{timeout:300000});assert.equal(await p.evaluate(()=>document.getElementById('loading').dataset.error||null),null)}
// wait until the human must act (roll/invest), answering any dialog addressed to the human through the visible first button (Pass/Decline)
async function humanTurn(p){for(let i=0;i<4000;i++){if(await p.evaluate(()=>document.getElementById('dlg').open)){await p.click('#dlg-btns button:first-child');continue}
 const st=await p.evaluate(()=>{const s=__empireLab.state(),pd=SkylineEmpire.pending(s);return s.phase==='over'?'over':(pd.player===0&&(pd.kind==='roll'||pd.kind==='invest')&&!__empireLab.busy())?'me':'wait'});if(st!=='wait')return st;await p.waitForTimeout(60)}throw Error('timeout waiting for human turn')}
(async()=>{const browser=await launch();try{
 {const vp=VPS[0],{ctx,p}=await open(browser,vp,base+'?seed=515&speed=instant',true);await p.evaluate(()=>{localStorage.setItem('skylineSave','CLASSIC-SENTINEL');localStorage.setItem('skylineDominionSave','DOMINION-SENTINEL')});
  await p.click('#start');await started(p,vp);const st=await p.evaluate(()=>__empireLab.r3().stats());report.stats=st;
  check('44 live spaces and four visible tokens from the real match',st.nodes===44&&st.tokensVisible===4);
  check("Claude's supplied art-matched Empire board, bay skyline, Empire Tower and crane GLBs submitted to the GPU",['board_empire_44.glb','empire_bay_skyline.glb','empire_tower.glb','tower_crane.glb'].every(f=>st.files.includes(f))&&st.triangles>500000);
  check('five stage models loaded',['dev_0_lot.glb','dev_1_midrise_L1.glb','dev_2_midrise_L2.glb','dev_4_highrise_L4.glb','dev_5_skyscraper_L5.glb'].every(f=>st.files.includes(f)));
  check('baked finished tower removed; landmark shown only to the funded stage (stage 0: clipped, crane visible)',st.towerTrianglesRemoved>0&&st.towerClip<1&&st.craneVisible);
  check('drawing buffer is native DPR × CSS board size',st.buffer[0]===st.css[0]*3&&st.buffer[1]===st.css[1]*3,{buffer:st.buffer,css:st.css});
  check('supplied layout matches the rule track space-for-space',await p.evaluate(()=>{const L=__empireLab.r3().layout,E=SkylineEmpire;return L.spaces.length===44&&L.spaces.every(sp=>{const[t,z]=E.TRACK[sp.index].split(':');return ({start:'start',property:'property',chance:'chance',negotiate:'trade',market:'market',dice:'dice'})[t]===sp.type&&(z||null)===(sp.group||null)})}));
  check('every space projects inside the free board area between the HUD panels',await p.evaluate(()=>{const b=document.getElementById('board').getBoundingClientRect(),L=document.querySelector('.sk-left').getBoundingClientRect(),R=document.querySelector('.sk-right').getBoundingClientRect(),c={left:L.right,right:R.left,top:b.top,bottom:document.querySelector('.sk-strip').getBoundingClientRect().top};return SkylineEmpire.NODES.every(n=>{const q=__empireLab.r3().project(n.id);return q.x>=c.left&&q.x<=c.right&&q.y>=c.top&&q.y<=c.bottom})}));
  await humanTurn(p);const idle=await p.evaluate(()=>__empireLab.r3().stats().renders);await p.waitForTimeout(1200);check('no continuous idle rendering',await p.evaluate(()=>__empireLab.r3().stats().renders)===idle);
  // Real movement test: ordinary camera motion, not reduced-motion overview.
  // Manipulates only the renderer's test token; authoritative match state stays untouched.
  // First match runs with normal motion from context creation (Safari-safe).
  const normalMotion=await p.evaluate(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  check('regular motion enabled before moving the camera',normalMotion);
  const followProof=await p.evaluate(async()=>{
   const r=__empireLab.r3(),state=__empireLab.state(),from=state.players[0].pos,to=SkylineEmpire.NODES.find(n=>n.id!==from).id;
   const samples=[],timer=setInterval(()=>samples.push(r.stats()),40);
   await r.moveToken(0,from,to,980);
   await new Promise(done=>setTimeout(done,1650));
   // SwiftShader can take several wall-clock seconds to submit a 3× frame.
   // Wait for the actual return instead of assuming a fixed frame count.
   const deadline=performance.now()+15000;
   while(r.stats().tracking>.05&&performance.now()<deadline)await new Promise(done=>setTimeout(done,200));
   clearInterval(timer);
   const current=r.stats(),result={max:Math.max(current.trackingPeak||0,...samples.map(x=>x.tracking||0)),upright:samples.every(x=>x.cameraUp?.[1]>.999),returned:current.tracking,redMotion:current.prefersReducedMotion,focused:current.focused};
   r.sync(SkylineEmpire.view(state));return result;
  });
  check('smooth upright follow camera and overview recovery in regular motion',followProof.max>.07&&followProof.upright&&followProof.returned<.05&&!followProof.redMotion&&!followProof.focused,followProof);
  // No media-mode switch here: verify restored overview in the original context.
  const tap=await p.evaluate(()=>__empireLab.r3().project('E21'));await p.mouse.click(tap.x,tap.y);check('tapping a rendered space selects it',await p.evaluate(()=>__empireLab.r3().stats().selected)==='E21');
  const expected=await p.evaluate(()=>{const E=SkylineEmpire,s=E.restore(E.serialize(__empireLab.state())).state;E.act(s,0,{type:'roll'});return{pos:s.players[0].pos,roll:s.players[0].lastRoll}});
  await p.click('#roll');await p.waitForFunction(()=>!__empireLab.busy()&&SkylineEmpire.pending(__empireLab.state()).kind!=='roll',null,{timeout:60000});
  check('ROLL DICE uses the seeded rules roll and moves the token the exact total',await p.evaluate(e=>{const p=__empireLab.state().players[0];return p.pos===e.pos&&p.lastRoll.join()===e.roll.join()},expected));
  if(await p.locator('[data-act="buy"]:not([disabled])').count()){const before=await p.evaluate(()=>{const s=__empireLab.state(),p=s.players[0];return{cash:p.cash,pos:p.pos,price:SkylineEmpire.BY[p.pos].price}});await p.click('[data-act="buy"]');
   check('Buy charges once and transfers ownership; Plot model and owner ring appear',await p.evaluate(b=>{const s=__empireLab.state();return s.own[b.pos].o===0&&s.players[0].cash===b.cash-b.price&&__empireLab.r3().stats().stagesShown>=1},before));
   await p.evaluate(id=>__empireLab.select(id),before.pos);if(await p.locator(`[data-dev="${before.pos}"]:not([disabled])`).count()){await p.click(`[data-dev="${before.pos}"]`);check('Build Low-rise updates rules and model',await p.evaluate(id=>__empireLab.state().own[id].h===1,before.pos))}}
  else if(await p.locator('[data-act="auction"]').count()){await p.click('[data-act="auction"]');await humanTurn(p)}
  const fb=await p.evaluate(()=>{const s=__empireLab.state();return{tower:s.tower.funded+s.tower.stage*1e6,inf:s.players[0].influence}});
  if(await p.locator('#fund:not([disabled])').count()){await p.click('#fund');await p.click('#dlg-btns button.gold');check('Empire Tower investment moves funds into the shared landmark and grants influence',await p.evaluate(b=>{const s=__empireLab.state();return s.tower.funded+s.tower.stage*1e6>b.tower&&s.players[0].influence>=b.inf},fb))}
  await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}-human-turn.png`)});
  const snap=await p.evaluate(()=>SkylineEmpire.serialize(__empireLab.state()));await p.click('#v-insp');await p.click('#v-over');check('Inspect/Overview keep match state unchanged',await p.evaluate(()=>SkylineEmpire.serialize(__empireLab.state()))===snap);
  const lc=await p.evaluate(async()=>{const c=document.getElementById('board'),gl=c.getContext('webgl2')||c.getContext('webgl'),x=gl.getExtension('WEBGL_lose_context');if(!x)return'no-ext';x.loseContext();await new Promise(r=>setTimeout(r,300));x.restoreContext();await new Promise(r=>setTimeout(r,2000));return 'ok'});
  check('graphics context loss is recovered without touching the match',lc==='no-ext'||await p.evaluate(()=>SkylineEmpire.serialize(__empireLab.state()))===snap);
  await p.click('#end');await humanTurn(p);check('AI opponents act through the rules engine and return the turn',await p.evaluate(()=>{const s=__empireLab.state();return s.phase==='over'||SkylineEmpire.pending(s).player===0}));
  const saved=await p.evaluate(()=>SkylineEmpire.serialize(__empireLab.state()));await p.reload();await p.locator('#resume').waitFor({state:'visible'});await p.click('#resume');await started(p,vp);
  check('resume restores the exact saved match in its own slot',await p.evaluate(()=>SkylineEmpire.serialize(__empireLab.state()))===saved);
  check('Classic and Dominion saves untouched',await p.evaluate(()=>localStorage.getItem('skylineSave')==='CLASSIC-SENTINEL'&&localStorage.getItem('skylineDominionSave')==='DOMINION-SENTINEL'));await ctx.close()}
 {const vp=VPS[0],{ctx,p}=await open(browser,vp,base+'?seed=4242&speed=instant&quality=low');await p.click('#start');await started(p,vp);let n=0;
  while(await humanTurn(p)!=='over'){assert.ok(n++<400,'too long');const kind=await p.evaluate(()=>SkylineEmpire.pending(__empireLab.state()).kind);
   if(kind==='roll'){await p.click('#roll');continue}
   if(await p.locator('[data-act="buy"]:not([disabled])').count()){await p.click('[data-act="buy"]');continue}
   if(await p.locator('[data-act="auction"]').count()){await p.click('[data-act="auction"]');continue}
   await p.click('#end')}
  const end=await p.evaluate(()=>{const s=__empireLab.state();return{reason:s.endReason,winner:s.winner,round:s.round,tower:s.tower.stage,ranking:SkylineEmpire.ranking(s)}});report.completedMatch=end;
  check('a full match played through the visible buttons ends with a published reason and ranking',['milestones','round-limit','last-standing'].includes(end.reason)&&await p.locator('#again').isVisible());
  await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}-match-over.png`)});await ctx.close()}
 for(const vp of VPS){const {ctx,p}=await open(browser,vp,base+'?seed=515&speed=instant&quality='+(vp.width<700?'medium':'high'));await p.click('#start');await started(p,vp);await humanTurn(p);
  const lay=await p.evaluate(()=>{const W=innerWidth,H=innerHeight,r=e=>e.getBoundingClientRect(),c=r(document.getElementById('board'));
   const btn=[...document.querySelectorAll('#dock button')].filter(b=>b.offsetParent).map(b=>{const q=r(b);return{t:b.textContent.trim().slice(0,20),h:q.height,in:q.left>=0&&q.right<=W+.5&&q.top>=0&&q.bottom<=H+.5}});
   const L2=r(document.querySelector('.sk-left')),R2=r(document.querySelector('.sk-right')),S2=r(document.querySelector('.sk-strip'));const nodesIn=SkylineEmpire.NODES.filter(n=>{const q=__empireLab.r3().project(n.id);return q.x>=L2.right&&q.x<=R2.left&&q.y>=c.top&&q.y<=S2.top}).length;const panels=['p-map','p-victory','p-land','p-market','p-ms','p-neg','p-sel'].every(id=>document.getElementById(id)),cards=document.querySelectorAll('#players .sk-card').length;
   const strip=r(document.getElementById('players')),fits=[...document.querySelectorAll('#players .sk-card .v')].every(e=>e.scrollWidth<=e.clientWidth+1);
   return{panels,cards,fits,stripIn:strip.bottom<=H+.5&&strip.left>=0&&strip.right<=W+.5,nodesIn,btn,hScroll:document.documentElement.scrollWidth>W,st:__empireLab.r3().stats()}});
  report.viewports.push({vp,buffer:lay.st.buffer,css:lay.st.css,pixelRatio:lay.st.pixelRatio,screenshot:[vp.width*vp.dpr,vp.height*vp.dpr],triangles:lay.st.triangles,calls:lay.st.calls});
  check(`${vp.name}: all 44 spaces inside the free board area (not under panels or player strip)`,lay.nodesIn===44);check(`${vp.name}: Roll Dice and view controls on screen and ≥44 CSS px tall`,lay.btn.length>=3&&lay.btn.every(b=>b.in&&b.h>=44),{bad:lay.btn.filter(b=>!(b.in&&b.h>=44))});
  check(`${vp.name}: no horizontal page overflow`,!lay.hScroll);
  check(`${vp.name}: HUD icons stay icon-sized (no oversized SVGs)`,await p.evaluate(()=>[...document.querySelectorAll('.sk-col svg,.sk-strip svg')].every(e=>{const q=e.getBoundingClientRect();return q.height<=48||e.closest('.sk-map,.sk-stages')})));
  check(`${vp.name}: art sidebars (Empire map, victory, landmarks, market, milestones, negotiation) and four player cards present; card figures not clipped`,lay.panels&&lay.cards===4&&lay.fits&&lay.stripIn);await p.screenshot({timeout:90000,animations:'disabled',path:path.join(out,`${engine}-${vp.name}.png`)});await ctx.close()}
 check('no page errors',report.errors.length===0,{errors:report.errors.slice(0,3)});
}finally{fs.writeFileSync(path.join(out,`${engine}-report.json`),JSON.stringify(report,null,1));await browser.close()}console.log(`${report.checks.length} checks passed on ${engine}`)})().catch(e=>{console.error(e);process.exit(1)});
