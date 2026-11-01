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
  if(baseline)await page.route('**/web/presentation-v2.js',r=>r.fulfill({body:'',contentType:'text/javascript'}));
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
   const movement=await page.evaluate(async()=>{const tw=tween;tween=(ms,fn,ease)=>tw(Math.min(ms,65),fn,ease);const angles=[],distances=[],targets=[];
    try{for(let i=1;i<=40;i++){P(0).pos=i%40;await hopTo(P(0));angles.push(camT.yaw);distances.push(camT.L);targets.push(Math.hypot(...SkylineWebPresentation.diagnostics().target))}}
    finally{tween=tw}return{angles,distances,targets,pos:P(0).pos};});
   check('Token traverses every side and all four corners without camera rotation or excess zoom',movement.pos===0&&movement.angles.every(x=>Math.abs(x)<.001)&&Math.max(...movement.distances)-Math.min(...movement.distances)<.01&&movement.targets.every(x=>x<=.9),movement);
   await page.waitForTimeout(1100);check('Camera returns to normal board framing',await page.evaluate(()=>SkylineWebPresentation.diagnostics().target.every(x=>Math.abs(x)<.001)));
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
 const motion=await open({width:844,height:390},false,'reduce');await fixture(motion.page);await motion.page.evaluate(()=>camFollow(29));check('Reduced motion disables automatic follow translation',await motion.page.evaluate(()=>SkylineWebPresentation.diagnostics().reducedMotion&&SkylineWebPresentation.diagnostics().target.every(v=>v===0)));await motion.ctx.close();
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
