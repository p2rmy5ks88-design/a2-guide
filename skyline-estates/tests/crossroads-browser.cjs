// Crossroads Capital — Landmark Chase (Career Board 3) browser smoke test: Career card → length → board page,
// a complete Quick match with every human decision made through the page, Career inbox report, layout checks.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.VISUAL_ENGINE||'chromium',root=path.resolve(__dirname,'../..'),out=path.resolve(__dirname,'../test-results/crossroads');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff2':'font/woff2'};
let n=0;const ok=m=>{n++;console.log('PASS',m)};
(async()=>{const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 const browser=await({chromium,webkit}[engine]).launch(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}:{});
 try{const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true});/* 1x: gameplay checks; software WebGL on CI is slow at retina resolution */const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(base+'index.html');await p.evaluate(()=>{localStorage.clear();const s=SkylineCareer.raw();s.unlocked.circuit=1;s.unlocked.crossroads=1;PREF.career=s;savePref()});await p.reload();await p.waitForSelector('#hdCareer');await p.waitForSelector('#boot',{state:'hidden',timeout:60000});
  await p.evaluate(()=>{document.querySelector('#modals').innerHTML='';document.querySelector('#hdCareer').click()});await p.waitForSelector('.crc-btn[data-board="crossroads"]:not([disabled])');
  assert.match(await p.locator('.crc').nth(2).innerText(),/Crossroads Capital/);await p.locator('.crc-btn[data-board="crossroads"]').click();
  await p.locator('.crl[data-len="quick"]').waitFor();assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('.crl')].map(b=>b.dataset.len)),['standard','quick']);
  await Promise.all([p.waitForURL(/crossroads-capital\.html\?career=1&length=quick/),p.locator('.crl[data-len="quick"]').click()]);ok('Career card → Quick opens Crossroads Capital as a Career match');
  await p.goto(base+'crossroads-capital.html?career=1&length=quick&speed=fast&seed=11');await p.locator('#startBtn').waitFor();
  assert.equal(await p.locator('#careerNote').isVisible(),true);await p.click('#startBtn');
  await p.waitForFunction(()=>window.__cc&&__cc.state()&&__cc.renderer.stats().tiles===33);const ringStats=await p.evaluate(()=>__cc.renderer.stats());assert.equal(ringStats.layout,'classic-circular');assert.equal(ringStats.environment,'skyline-terrace','premium city terrace replaces the plain floor');assert.equal(ringStats.perimeterTiles,32);assert.ok(ringStats.diameter>=11.5&&ringStats.diameter<=12,'classic-scale circular tabletop');ok('32 spaces on one circular perimeter + selectable central Exchange, same classic-scale diameter');
  const small=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<43.5).map(b=>b.id||b.textContent.trim()));assert.deepEqual(small,[],'touch targets');
  const overlap=await p.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();const a=r('players'),b=r('dock'),c=r('top'),h=r('help');return a.bottom>b.top&&a.right>b.left||c.bottom>a.top+1||a.bottom>h.top+1});assert.equal(overlap,false);ok('HUD fits 844×390 with 44pt buttons and no overlaps');
  await p.screenshot({path:path.join(out,engine+'-start.png')});

  // Independent camera acceptance: the full-board view must be recoverable,
  // followed by an upright, close three-quarter token view. Renderer-only UI
  // controls are used here: no match state, money, movement or save is changed.
  await p.evaluate(()=>__cc.renderer.overview(true));
  await p.waitForFunction(()=>{const s=__cc.renderer.stats();return s.mode==='overview'&&s.goalDist>10&&Math.abs(s.camDist-s.goalDist)<.18},null,{timeout:90000});
  const cameraOverview=await p.evaluate(()=>__cc.renderer.stats());
  await p.evaluate(()=>__cc.renderer.overview(false));
  await p.waitForFunction(()=>{const s=__cc.renderer.stats();return s.mode==='follow'&&s.goalDist<7&&Math.abs(s.camDist-s.goalDist)<.18},null,{timeout:90000});
  const cameraFollow=await p.evaluate(()=>__cc.renderer.stats());
  assert.ok(cameraOverview.camDist>cameraFollow.camDist*1.55,'camera overview vs close-follow distance: '+JSON.stringify({overview:cameraOverview.camDist,follow:cameraFollow.camDist}));
  assert.ok(cameraFollow.goalDist<5.1,'approved close-up game camera should make tiles larger');
  assert.ok(cameraOverview.mode==='overview'&&cameraFollow.mode==='follow'&&cameraFollow.camPitch>0.5&&cameraFollow.camPitch<1.2&&cameraFollow.cameraUp[1]>.999&&Math.abs(cameraFollow.cameraUp[0])<.001&&Math.abs(cameraFollow.cameraUp[2])<.001,'camera upright / modes: '+JSON.stringify({overview:cameraOverview,follow:cameraFollow}));
  ok('camera can return to overview and smoothly follow a token upright');


  // Phone landscape acceptance: the 956 x 440 CSS viewport corresponds to
  // the iPhone 18 Pro Max aspect ratio; manually inject conservative cutouts
  // without spoofing the device's GPU pixel ratio.
  await p.setViewportSize({width:956,height:440});
  await p.evaluate(()=>{const st=document.documentElement.style;st.setProperty('--sl','62px');st.setProperty('--sr','62px');st.setProperty('--sb','21px')});
  const phoneFit=await p.evaluate(()=>{
   const box=id=>document.getElementById(id).getBoundingClientRect();
   const players=box('players'),top=box('top'),side=box('side'),dock=box('dock'),help=box('help'),main=box('mainBtn');
   const inPhone=(r,l=62,rPad=62)=>r.left>=l-1&&r.right<=innerWidth-rPad+1&&r.top>=0&&r.bottom<=innerHeight+1;
   return {players:inPhone(players),top:inPhone(top),side:inPhone(side),dock:inPhone(dock),help:inPhone(help),main:inPhone(main),
    noRosterDock:players.bottom<=dock.top+1||players.right<dock.left-1,noTopRoster:top.bottom<=players.top+1,
    noRosterHelp:players.bottom<=help.top+1||players.right<help.left-1,
    controls:[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&!b.disabled).every(b=>b.getBoundingClientRect().height>=43.5)};
  });
  assert.ok(Object.values(phoneFit).every(Boolean),'iPhone landscape fit/safe-area UI: '+JSON.stringify(phoneFit));
  ok('iPhone landscape 956×440 safe-area controls, roster and sidebars do not overlap');
  // Camera-only visual evidence for owner approval: never alter state, money or match flow.
  // Hide transient HUD/decisions for two unobstructed, genuine 3D framebuffer captures.
  const clean=['top','players','side','dock','help','decision','dice','foot','toast'];
  await p.evaluate(ids=>{for(const id of ids)document.getElementById(id).style.visibility='hidden';__cc.renderer.overview(true)},clean);
  await p.waitForFunction(()=>{const z=__cc.renderer.stats();return z.mode==='overview'&&Math.abs(z.camDist-z.goalDist)<.12},null,{timeout:90000});
  await p.screenshot({timeout:90000,path:path.join(out,engine+'-circular-board-overview-956x440.png')});
  await p.evaluate(()=>{__cc.renderer.setFrameBias(.2);__cc.renderer.overview(false)});
  await p.waitForFunction(()=>{const z=__cc.renderer.stats();return z.mode==='follow'&&Math.abs(z.camDist-z.goalDist)<.12},null,{timeout:90000});
  await p.screenshot({timeout:90000,path:path.join(out,engine+'-circular-board-close-956x440.png')});
  await p.evaluate(ids=>{for(const id of ids)document.getElementById(id).style.visibility='';__cc.renderer.setFrameBias(.75)},clean);
  ok('unobstructed circular board overview and close-token camera frames at 956×440');
  await p.screenshot({timeout:90000,path:path.join(out,engine+'-iphone-landscape-safe.png')});
  await p.evaluate(()=>{const st=document.documentElement.style;for(const v of ['--sl','--sr','--sb'])st.removeProperty(v)});
  await p.setViewportSize({width:844,height:390});

  let shots=0;const seen={};const t0=Date.now();
  while(Date.now()-t0<480000){const st=await p.evaluate(()=>{const s=__cc.state(),pd=__cc.rules.pending(s);return{over:s.over,kind:pd.kind,mine:(pd.kind==='trade'?pd.to:pd.pid)===0,busy:__cc.busy(),panel:!document.getElementById('decision').hidden}});
   if(st.over)break;
   if(st.mine&&!st.busy){seen[st.kind]=(seen[st.kind]||0)+1;if(!['roll','action','dealDesk'].includes(st.kind)){assert.equal(st.panel,true,'decision panel shown for '+st.kind);if(shots<3){await p.screenshot({path:path.join(out,`${engine}-decision-${st.kind}-${shots++}.png`)})}}
    if(st.kind==='roll'){await p.click('#mainBtn')}else await p.evaluate(()=>{const s=__cc.state();__cc.act(0,__cc.rules.ai(s,0))})}
   await p.waitForTimeout(100)}
  assert.ok(await p.evaluate(()=>__cc.state().over),'match finished');ok('a complete Quick match plays through the page ('+Object.entries(seen).map(([k,v])=>k+' '+v).join(', ')+')');
  await p.waitForSelector('#results:not([hidden])');await p.screenshot({path:path.join(out,engine+'-results.png')});
  const fact=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('skylineCareerInbox:'));return k&&JSON.parse(localStorage.getItem(k))});
  assert.ok(fact&&fact.board==='crossroads'&&fact.ruleset==='crossroads-lc-v1'&&fact.length==='quick'&&fact.over,JSON.stringify(fact));assert.equal(await p.evaluate(()=>localStorage.getItem('skylineCrossroadsSave')),null);ok('the finished match is reported once to the Career inbox and the save is cleared');
  const before=await p.evaluate(()=>{const P=JSON.parse(localStorage.getItem('skylinePrefs')||'{}');return{coins:P.coins??null}});
  // a fast test match can finish in under 2 minutes, which Career rightly refuses; age the start time like a real match
  await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('skylineCareerInbox:'));const f=JSON.parse(localStorage.getItem(k));f.startedAt-=600000;localStorage.setItem(k,JSON.stringify(f))});
  await p.click('#resHome');await p.waitForURL(/index\.html/,{timeout:60000});await p.waitForFunction(()=>window.SkylineCareer&&SkylineCareer.raw().boards.crossroads,null,{timeout:60000});
  assert.equal(await p.evaluate(()=>SkylineCareer.raw().boards.crossroads.matches),1);ok('back on the main screen the match is recorded in Career');
  const after=await p.evaluate(id=>({coins:PREF.coins,sc:(SkylineSCWallet.create(localStorage).view().transactions.find(t=>t.id==='board:'+id)||{}).amount||0}),fact.matchId);
  const exp=await p.evaluate(f=>({coins:gameCoinReward(f.won,f.rank)*6,sc:6*(SkylineSCWallet.RULES.completion+(f.won?SkylineSCWallet.RULES.win:0))}),fact);
  assert.equal(after.sc,exp.sc,'SC ×6');if(before.coins!=null)assert.equal(after.coins-before.coins,exp.coins,'coins ×6');
  await p.waitForSelector('#modals .mp:has-text("Crossroads Capital rewards")',{timeout:10000});await p.screenshot({path:path.join(out,engine+'-rewards.png')});
  ok(`Crossroads Capital pays 6× rewards: +${exp.coins} coins and +${exp.sc} SC (${fact.won?'win':'rank '+(fact.rank+1)})`);
  assert.deepEqual(errors,[]);ok('no browser errors');await context.close()}
 finally{await browser.close();server.close()}console.log(`CROSSROADS BROWSER ${engine} ${n} checks`)})().catch(e=>{console.error(e);process.exit(1)});
