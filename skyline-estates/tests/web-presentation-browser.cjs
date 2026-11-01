// Real WebGL browser presentation regressions; account/server writes are blocked.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],performance:[],screenshots:[],environment:'Desktop Chromium with software WebGL; not physical iPhone Safari'};
const check=(name,value,detail)=>{assert.ok(value,name+' '+JSON.stringify(detail||{}));report.checks.push(name);console.log('PASS',name)};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const ruleNames=['build','canBuild','sell','canSell','mortgage','canMortgage','unmortgage','executeTrade','validTrade','claimTier','tierReward','spendCoins','save','loadSave'];
let server,browser;
async function fixture(page){return page.evaluate(()=>{
 FAST=true;GEN++;trackable=()=>false;achScan=()=>{};cityScan=()=>{};achAward=()=>{};achShow=()=>{};achBump=()=>{};achQ.length=0;coachTip=()=>{};document.querySelectorAll('.achpop,.coach').forEach(n=>n.remove());setup.city='lagos';applyCity('lagos');
 newGame({cash:5000,set:{city:'lagos',mode:'classic',even:true,perks:false,events2:false,ai:'normal',speed:'fast'},players:[{name:'Safari tester',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true}]});
 G.turn=0;G.phase='post';Object.values(GROUPS).forEach((group,k)=>group.forEach(i=>G.own[i]={o:k%2,h:[0,1,2,3,4,5,0,1][k],m:false}));
 G.houses=36-G.own.reduce((n,o)=>n+(o.h===5?0:o.h),0);G.hotels=12-G.own.filter(o=>o.h===5).length;
 FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;document.querySelector('#modals').innerHTML='';
 buildBoard();renderRoster();setPrompt('<b>Safari tester</b>, your turn. Roll or manage your properties.');updateTools();camOverview(0,0);return JSON.stringify(G);
});}
async function snap(page,name){await page.waitForTimeout(450);const file=path.join(out,'skyline-web-'+name+'.png');const style=await page.addStyleTag({content:'.achpop{display:none!important}'});try{await page.screenshot({path:file});report.screenshots.push(path.basename(file))}finally{await style.evaluate(n=>n.remove())}}
async function perf(page,kind){const sample=await page.evaluate(async()=>{
 const times=[];let last=performance.now();for(let i=0;i<35;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>4)times.push(now-last);last=now}
 let meshes=0;(function walk(n){if(!n.visible)return;if(n.geo&&n.mat)meshes++;n.kids.forEach(walk)})(ROOT);
 times.sort((a,b)=>a-b);return{frameMedianMs:times[Math.floor(times.length*.5)],frameP95Ms:times[Math.floor(times.length*.95)],visibleMeshes:meshes,diagnostics:window.SkylineWebPresentation?.diagnostics()||null};
});report.performance.push({kind,...sample});return sample;}
(async()=>{
 server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const open=async(viewport,baseline=false,motion='no-preference',fallback=false)=>{
  const ctx=await browser.newContext({viewport,hasTouch:true,serviceWorkers:'block',reducedMotion:motion}),page=await ctx.newPage();
  page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(String(e.stack||e)));
  await page.addInitScript(({fallback})=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Safari tester',nickSet:true,welcomed:1,tutDone:1,coins:10000,xp:3000,flat2d:fallback,rig:false,riders:false,coach:{pre:1,post:1}})),{fallback});
  await page.route('https://**/*',r=>r.abort());
  if(baseline)await page.route('**/web/presentation-v3.js',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.goto(origin+'/skyline-estates/index.html');await page.locator('#boot').waitFor({state:'detached',timeout:30000});return{ctx,page};
 };
 const source=fs.readFileSync(path.join(root,'skyline-estates/game.html'),'utf8').replace(/\r\n/g,'\n');
 check('Audited rules source remains unchanged',crypto.createHash('sha256').update(source).digest('hex')===require('../security/service/audited-rules.cjs').sourceHash);
 const baseline=await open({width:844,height:390},true);await fixture(baseline.page);
 const rules=await baseline.page.evaluate(names=>Object.fromEntries(names.map(k=>[k,eval(k).toString()])),ruleNames);
 await perf(baseline.page,'original');await baseline.ctx.close();
 for(const viewport of [{width:844,height:390},{width:956,height:440},{width:1280,height:589}]){
  const {ctx,page}=await open(viewport);check('Web module starts '+viewport.width,await page.evaluate(()=>!!window.SkylineWebPresentation));
  const before=await fixture(page);check('Real WebGL scene available '+viewport.width,await page.evaluate(()=>!!GL&&!!S3&&tok3.length===2));
  const visual=await page.evaluate(()=>({plots:SkylineWebPresentation.diagnostics().plots,own:JSON.stringify(G),markers:S3.houses.filter(Boolean).every(n=>!n.visible),overlap:S3.plots.some((p,i)=>p&&SQ[i].t==='prop'&&p.node.s[0]*.82>CW/100),models:S3.plots.filter((p,i)=>p&&SQ[i].t==='prop').every(p=>p.floors.length===1)}));
  check('Plot styling is state-neutral '+viewport.width,visual.own===before);
  check('All 22 real streets have distinct inward plots '+viewport.width,visual.plots.length===22&&visual.plots.every(p=>p.position.every(Number.isFinite)&&p.scale[0]<=.9)&&!visual.overlap,visual.plots);
  check('Diagonal demarcation supports both directions without splitting every tile '+viewport.width,visual.plots.some(p=>p.diagonal==='/')&&visual.plots.some(p=>p.diagonal==='\\')&&visual.plots.some(p=>p.diagonal===null));
  check('Single family model per owned property; redundant markers hidden '+viewport.width,visual.models&&visual.markers);
  check('All economy and reward functions are the original implementations '+viewport.width,await page.evaluate(({names,rules})=>names.every(k=>eval(k).toString()===rules[k]),{names:ruleNames,rules}));
  await snap(page,'board-'+viewport.width);
  check('Lagos presentation restores the Daylight palette without changing state '+viewport.width,await page.evaluate(()=>{const data=JSON.stringify(G);drawScene(0);const night=S3.waterMat.c.join();document.documentElement.classList.add('light');drawScene(0);const day=S3.waterMat.c.join();document.documentElement.classList.remove('light');drawScene(0);return night!==day&&night===S3.waterMat.c.join()&&data===JSON.stringify(G)}));
  if(viewport.width===844){
   // FOLLOW is the default: real hops (shortened tweens) around every side and corner, sampled every frame.
   await page.evaluate(()=>{window.__cam=[];const tick=()=>{const pl=P(G.turn),t=tok3[pl.id],m=CAMM.vp,d=SkylineWebPresentation.diagnostics().camera,cv=document.getElementById('gl');
    if(m&&t){const[x,y,z]=[t.p[0],t.p[1]+.3,t.p[2]],w=m[3]*x+m[7]*y+m[11]*z+m[15];__cam.push({turn:G.turn,pos:pl.pos,sx:((m[0]*x+m[4]*y+m[8]*z+m[12])/w+1)/2*cv.clientWidth,sy:(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)/2*cv.clientHeight,yaw:camS.yaw,L:camS.L,mode:d.mode,u:d.usable})}
    window.__camRaf=requestAnimationFrame(tick)};tick()});
   // Software WebGL renders few frames per second and the game caps each step at 50 ms, so wait for convergence.
   const settle=()=>page.waitForFunction(()=>Math.abs(camS.yaw-camT.yaw)<.004&&Math.hypot(camS.look[0]-camT.look[0],camS.look[2]-camT.look[2])<.01&&Math.abs(camS.L-camT.L)<.01,null,{timeout:30000});
   const inside=f=>f.u&&f.sx>=f.u.left&&f.sx<=f.u.right&&f.sy>=f.u.top&&f.sy<=f.u.bottom;
   const deg=r=>((r*180/Math.PI)%360+540)%360-180;
   const stops=[];
   for(const n of [5,5,5,5,5,5,5,5]){
    await page.evaluate(async n=>{const tw=tween;tween=(ms,fn,ease)=>tw(Math.min(ms,140),fn,ease);try{await moveSteps(P(0),n)}finally{tween=tw}},n);await settle();
    stops.push(await page.evaluate(()=>__cam[__cam.length-1]));
   }
   const frames=await page.evaluate(()=>__cam.splice(0));
   const overviewL=await page.evaluate(()=>{const cv=document.getElementById('gl');return Math.max(18,7.65/(Math.tan(19*Math.PI/180)*(cv.clientWidth/cv.clientHeight))*1.02)});
   check('Follow is the default mode and frames the token substantially closer than the old overview',stops.every(f=>f.mode==='follow'&&f.L<overviewL*.6),{L:stops.map(f=>f.L),overviewL});
   check('Token traverses every side and all four corners and stays inside the free viewport after each landing',stops.map(f=>f.pos).join()==='5,10,15,20,25,30,35,0'&&stops.every(inside),stops);
   const side={5:0,15:-90,25:180,35:90},corner={10:[0,-90],20:[-90,180],30:[180,90],0:[90,0]},gap=(a,b)=>Math.abs(deg((a-b)*Math.PI/180));
   check('View squares to each board side and turns part-way at each corner',stops.every(f=>{const y=deg(f.yaw);return f.pos in side?gap(y,side[f.pos])<3:gap(y,corner[f.pos][0])>12&&gap(y,corner[f.pos][1])>12&&gap(y,corner[f.pos][0])+gap(y,corner[f.pos][1])<91}),stops.map(f=>[f.pos,Math.round(deg(f.yaw))]));
   let maxStep=0,maxL=0;for(let i=1;i<frames.length;i++){maxStep=Math.max(maxStep,Math.abs(frames[i].yaw-frames[i-1].yaw));maxL=Math.max(maxL,Math.abs(frames[i].L-frames[i-1].L))}
   const total=Math.abs(frames[frames.length-1].yaw-frames[0].yaw);
   check('Rotation is continuous: no 90-degree jumps, no spin, no zoom pumping during movement',frames.length>20&&maxStep<.35&&total>Math.PI*1.6&&total<Math.PI*2.4&&maxL<.05,{frames:frames.length,maxStepDeg:maxStep*180/Math.PI,totalDeg:total*180/Math.PI,maxL});
   check('Token stays inside the free viewport throughout every move',frames.filter(f=>f.mode==='follow'&&!inside(f)).length<=Math.ceil(frames.length*.03),frames.filter(f=>!inside(f)).slice(0,5));
   // AI turns use the same follow framing after the normal turn-start camera call.
   await page.evaluate(async()=>{G.turn=1;renderRoster();camOverview(P(1).pos,700);const tw=tween;tween=(ms,fn,ease)=>tw(Math.min(ms,140),fn,ease);try{await moveSteps(P(1),12)}finally{tween=tw}});await settle();
   const ai=await page.evaluate(()=>__cam[__cam.length-1]);check('AI turn is followed with the same close framing',ai.turn===1&&ai.mode==='follow'&&inside(ai)&&ai.L<overviewL*.6,ai);
   // Manual drag is respected until the next move.
   const manual=await page.evaluate(async()=>{userCam=1;camT.yaw=camS.yaw+.6;const want=camT.yaw;await new Promise(r=>setTimeout(r,500));const kept=Math.abs(camT.yaw-want)<1e-6;const tw=tween;tween=(ms,fn,ease)=>tw(Math.min(ms,140),fn,ease);try{await moveSteps(P(1),1)}finally{tween=tw}return{kept,resumed:!userCam}});
   check('Manual camera gestures are kept until the next move resumes following',manual.kept&&manual.resumed,manual);
   // OVERVIEW through the camera control, then back to FOLLOW.
   await page.locator('#camBtn').click();await page.waitForFunction(()=>__cam.length&&__cam[__cam.length-1].mode==='board');await settle();
   const ov=await page.evaluate(()=>{const m=CAMM.vp,cv=document.getElementById('gl'),F=6.32,b=document.getElementById('camBtn').getBoundingClientRect();return{mode:SkylineWebPresentation.diagnostics().camera.mode,pressed:document.getElementById('camBtn').getAttribute('aria-pressed'),btn:[b.width,b.height],w:cv.clientWidth,h:cv.clientHeight,c:[[-F,0,-F],[F,0,-F],[F,0,F],[-F,0,F]].map(([x,y,z])=>{const w=m[3]*x+m[7]*y+m[11]*z+m[15];return[((m[0]*x+m[4]*y+m[8]*z+m[12])/w+1)/2*cv.clientWidth,(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)/2*cv.clientHeight]})}});
   const ovBox={l:Math.min(...ov.c.map(c=>c[0])),r:Math.max(...ov.c.map(c=>c[0])),t:Math.min(...ov.c.map(c=>c[1])),b:Math.max(...ov.c.map(c=>c[1]))};
   check('Camera control switches to Overview showing all four frame corners and filling the screen',ov.mode==='board'&&ov.pressed==='true'&&ov.btn.every(x=>x>=44)&&ov.c.every(([x,y])=>x>=0&&x<=ov.w&&y>=0&&y<=ov.h)&&(ovBox.r-ovBox.l)>ov.w*.6,ov);
   await snap(page,'overview-844');
   await page.locator('#camBtn').click();await page.waitForFunction(()=>__cam.length&&__cam[__cam.length-1].mode==='follow');await settle();
   const back=await page.evaluate(()=>__cam[__cam.length-1]);check('Camera control returns to Follow on the active token',back.mode==='follow'&&inside(back)&&back.L<overviewL*.6,back);
   await snap(page,'follow-844');
   await page.setViewportSize({width:956,height:440});await page.waitForFunction(()=>{const f=__cam[__cam.length-1];return f&&f.u&&f.u.right>900});await settle();await page.waitForTimeout(300);const resized=await page.evaluate(()=>__cam[__cam.length-1]);
   check('Follow framing adapts to resize / Safari toolbar changes',resized.u&&resized.u.right>900&&inside(resized),resized);
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(600);
   await page.evaluate(()=>{cancelAnimationFrame(__camRaf);G.turn=0;renderRoster()});
   const fade=await page.evaluate(()=>{
    const token=tok3[G.turn],oldPos=token.p.slice(),cp=CAMV.pos.slice(),plot=S3.plots[1],oldPlot=plot.node.p.slice(),top=plot.webTop;
    const mats=[];(function walk(n){if(n.mat)mats.push([n,n.mat,n.mat.a]);n.kids.forEach(walk)})(token);
    CAMV.pos=[0,3,8];token.p=[0,0,0];plot.node.p=[0,0,1];plot.webTop=2;
    const before=plot.floors[0].kids[0].mat;drawScene(performance.now()/1000);const faded=SkylineWebPresentation.diagnostics().fadedPlots;
    const opaque=mats.every(([n,m,a])=>n.mat===m&&n.mat.a===a);token.p=[9,0,0];drawScene(performance.now()/1000);
    const restored=plot.floors[0].kids[0].mat===before;token.p=oldPos;CAMV.pos=cp;plot.node.p=oldPlot;plot.webTop=top;
    return{faded,opaque,restored};
   });check('Only obstructing buildings fade; token stays opaque; original materials return',fade.faded>0&&fade.faded<=2&&fade.opaque&&fade.restored,fade);
   await perf(page,'refined');
   const cash=await page.evaluate(()=>{FAST=true;GEN++;G.over=false;G.phase='post';G.turn=0;GROUPS.brown.forEach(i=>G.own[i]={o:0,h:0,m:false});P(0).cash=5000;G.houses=36-G.own.reduce((n,o)=>n+(o.h===5?0:o.h),0);G.hotels=12-G.own.filter(o=>o.h===5).length;
    const i=GROUPS.brown[0],before=P(0).cash,cost=devCost(0,i);build(0,i);const after=P(0).cash;save();const saved=JSON.stringify(loadSave());FAST=false;return{before,cost,after,saved,i};});
   check('Building still debits the real cost and saves',cash.after===cash.before-cash.cost);
   await page.reload();await page.locator('#boot').waitFor({state:'detached',timeout:30000});check('Refresh preserves saved match exactly',await page.evaluate(saved=>JSON.stringify(loadSave())===saved,cash.saved));
   // Continue uses the original saved-game flow; no custom load or migration.
   await page.locator('#tCont').click();await page.waitForFunction(()=>document.querySelector('#title').hidden);if(await page.locator('.keysm').count())await page.getByRole('button',{name:/^Let.s go$/,exact:true}).click();
   check('Existing Continue opens the saved game',await page.evaluate(i=>G.own[i].h===1,cash.i));
  }
  await page.evaluate(()=>{showTitle();setup.shopTab='daily';homeTab('shop')});
  for(const tab of ['daily','surr','fin','dice','boost']){
   await page.locator('.shoptabs [data-k="'+tab+'"]').click();check('Shop category '+tab+' functional '+viewport.width,await page.locator('.icard').count()>0);
  }
  await page.locator('.shoptabs [data-k="daily"]').click();
  const cards=await page.locator('.icard').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,name:n.querySelector('b')?.textContent,action:n.querySelector('.ibuy,.iown,.ihow')?.textContent,artHeight:n.querySelector('.iwrap')?.getBoundingClientRect().height})));
  check('Shop cards compact with real names and actions '+viewport.width,cards.every(x=>x.height<=290&&x.name&&x.action&&x.artHeight<=114),cards);
  check('First-row shop actions are touch-sized and visible above navigation '+viewport.width,await page.locator('.icard').evaluateAll(nodes=>nodes.slice(0,3).every(n=>{const r=n.querySelector('.ibuy,.iown,.ihow').getBoundingClientRect(),pane=document.querySelector('#pane').getBoundingClientRect();return r.height>=44&&r.bottom<=pane.bottom})));
  await snap(page,'shop-'+viewport.width);
  await page.locator('.shoptabs [data-k="surr"]').click();
  const preview=page.locator('.ipv').first();if(await preview.count()){const inventory=await page.evaluate(()=>JSON.stringify({coins:PREF.coins,eq:PREF.eq,inv:PREF.inv}));await preview.click();check('Original surround preview opens '+viewport.width,await page.evaluate(()=>!!TITLE_CAM||document.querySelector('#modals').children.length>0));await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForFunction(()=>TITLE_CAM===null);check('Preview cleanup preserves owned items, equipment and coins '+viewport.width,await page.evaluate(x=>JSON.stringify({coins:PREF.coins,eq:PREF.eq,inv:PREF.inv})===x,inventory))}
  await page.evaluate(()=>{season().sxp=TIER_XP*2+123;homeTab('season')});
  check('Season shows actual total XP and accessible next-tier progress '+viewport.width,await page.evaluate(()=>document.querySelector('.web-season-total').textContent.includes(nfmt(season().sxp))&&document.querySelector('.sbar').getAttribute('aria-valuenow')==='123'));
  check('Both reward tracks and current tier are intact '+viewport.width,await page.evaluate(()=>document.querySelectorAll('#track .scell').length===TIERS*2&&document.querySelectorAll('#track .web-current-tier').length===2));
  await snap(page,'season-'+viewport.width);
  check('Daylight season headings, XP and reward labels have readable contrast '+viewport.width,await page.evaluate(()=>{
   document.documentElement.classList.add('light');
   const luminance=s=>{const rgb=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
   const ok=['.sbt h2','.sbl','#track .scell small'].every(sel=>{const n=document.querySelector(sel),surface=n.closest('.sban,.scell'),a=luminance(getComputedStyle(n).color),b=luminance(getComputedStyle(surface).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5});document.documentElement.classList.remove('light');return ok;
  }));
  await page.locator('#pane').evaluate(e=>e.scrollTop=e.scrollHeight);check('Premium rewards remain reachable above the navigation '+viewport.width,await page.locator('#track .scell.prem').first().evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('#pane').getBoundingClientRect();return r.bottom<=p.bottom&&r.top>=p.top}));await page.locator('#pane').evaluate(e=>e.scrollTop=0);
  const claim=await page.evaluate(()=>{const first=claimTier(1,false),coins=PREF.coins,xp=PREF.xp,inv=JSON.stringify(PREF.inv);const again=claimTier(1,false);return{first,again,stable:coins===PREF.coins&&xp===PREF.xp&&inv===JSON.stringify(PREF.inv)}});
  check('Season claims cannot be awarded twice '+viewport.width,claim.first&&!claim.again&&claim.stable,claim);
  await page.evaluate(()=>{homeTab('season')});const claimed=await page.locator('#sAll').count();if(claimed){await page.locator('#sAll').click();check('Claim All remains idempotent '+viewport.width,await page.evaluate(()=>{const c=PREF.coins;for(let i=1;i<=seasonTierNow();i++)claimTier(i,false);return c===PREF.coins}))}
  // The existing renderer restores the current tier after 30 ms; wait for that before a new input.
  await page.waitForTimeout(200);const position=await page.evaluate(()=>document.querySelector('#track').scrollLeft);await page.locator('#track').press('ArrowRight');await page.waitForFunction(x=>document.querySelector('#track').scrollLeft>x,position,{timeout:5000});check('Season tier navigation works '+viewport.width,await page.evaluate(x=>document.querySelector('#track').scrollLeft>x,position));
  for(const id of ['play','portfolio','collection','shop','ach','progress']){await page.locator('[data-dock="'+id+'"]').click();check('Navigation '+id+' '+viewport.width,await page.locator('[data-dock="'+id+'"].on').count()===1)}
  check('No horizontal document overflow '+viewport.width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await ctx.close();
 }
 const motion=await open({width:844,height:390},false,'reduce');await fixture(motion.page);await motion.page.waitForTimeout(800);
 await motion.page.waitForFunction(()=>Math.hypot(camS.look[0]-camT.look[0],camS.look[2]-camT.look[2])<.01);
 const still=await motion.page.evaluate(async()=>{const before={yaw:camS.yaw,look:camS.look.slice()},seen=[];let on=true;const tick=()=>{seen.push(camS.look.slice());if(on)requestAnimationFrame(tick)};tick();
  const tw=tween;tween=(ms,fn,ease)=>tw(Math.min(ms,140),fn,ease);try{await moveSteps(P(0),6)}finally{tween=tw}const during=seen.length;await new Promise(r=>setTimeout(r,900));on=false;
  const moved=seen.slice(0,during).filter(l=>Math.hypot(l[0]-before.look[0],l[2]-before.look[2])>.01).length;
  return{reduced:SkylineWebPresentation.diagnostics().reducedMotion,moved,during,yaw:camS.yaw,snapped:Math.abs(camS.yaw/(Math.PI/2)-Math.round(camS.yaw/(Math.PI/2)))<.02,after:Math.hypot(camS.look[0]-before.look[0],camS.look[2]-before.look[2])}});
 check('Reduced motion: no camera travel or rotation during hops, one cut to the landing, square view',still.reduced&&still.moved<=Math.ceil(still.during*.15)&&still.snapped&&still.after>.5,still);await motion.ctx.close();
 const fallback=await open({width:844,height:390},false,'no-preference',true);check('Existing flat-board fallback and menus remain available',await fallback.page.evaluate(()=>PREF.flat2d&&typeof drawMap==='function'&&document.querySelectorAll('.hd-mode').length===4));
 // The normal delayed welcome callback writes lastOpen after boot. Snapshot once startup finishes.
 await fallback.page.waitForFunction(()=>PREF.lastOpen>0);
 await fallback.page.evaluate(()=>homeTab('shop'));const saved=await fallback.page.evaluate(()=>localStorage.getItem('skylinePrefs'));
 for(const size of [{width:844,height:320},{width:390,height:844},{width:844,height:390}]){
  await fallback.page.setViewportSize(size);
  await fallback.page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('[data-dock]')].filter(n=>n.getBoundingClientRect().width).every(n=>n.getBoundingClientRect().height>=44),null,{timeout:8000});
  const result=await fallback.page.evaluate(s=>({savePreserved:localStorage.getItem('skylinePrefs')===s,overflow:document.documentElement.scrollWidth>innerWidth+1,heights:[...document.querySelectorAll('[data-dock]')].map(n=>n.getBoundingClientRect().height)}),saved);
  check('Resize/orientation preserves save and accessible navigation '+size.width+'x'+size.height,result.savePreserved&&!result.overflow&&result.heights.every(h=>h>=44),result);
 }
 await fallback.ctx.close();
 check('No browser exceptions',report.errors.length===0,report.errors);
 console.log('WEB PRESENTATION SUMMARY',JSON.stringify({checks:report.checks.length,errors:report.errors.length,performance:report.performance}));
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,'skyline-web-presentation.json'),JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
