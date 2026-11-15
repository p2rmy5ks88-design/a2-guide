// Diagnostic-only screenshots and backing-buffer metrics. Never publishes or modifies game state.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=process.env.RUNNER_TEMP||path.join(root,'skyline-estates/test-results');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'missing':b)})});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{
 for(const [scale,textureSize,labelContrast,labelHierarchy,roster] of [[1.5,2048,'standard','standard','standard'],[2,2048,'standard','standard','standard'],[2.5,2048,'standard','standard','standard'],[3,2048,'standard','standard','standard'],[2,4096,'standard','standard','standard'],[2,2048,'high','standard','standard'],[2,2048,'high','large','standard'],[2,2048,'standard','standard','compact']]){
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'PixelQA',nickSet:true,welcomed:1,tutDone:1,coins:10000,xp:3000,flat2d:false,rig:false,riders:false,coach:{pre:1,post:1}})));
  await page.route('https://**/*',route=>route.abort());
  const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html?skylineRenderScale='+scale+'&skylineBoardTexture='+textureSize+'&skylineLabelContrast='+labelContrast+'&skylineLabelHierarchy='+labelHierarchy;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#boot').waitFor({state:'detached',timeout:60000});
  await page.evaluate(()=>{FAST=true;GEN++;achScan=()=>{};achBump=()=>{};achShow=()=>{};coachTip=()=>{};trackable=()=>false;applyCity('lagos');newGame({cash:5000,set:{city:'lagos',mode:'classic',even:true,perks:false,events2:false,ai:'normal',speed:'fast'},players:[{name:'PixelQA',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true},{name:'Lucas',tok:TOKENS[3],col:PCOL[3],ai:true}]});G.turn=0;G.phase='post';G.keysShown=true;Object.values(GROUPS).forEach((ids,k)=>ids.forEach(i=>G.own[i]={o:k%2,h:[0,1,2,3,4,5,0,1][k],m:false}));FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;document.querySelector('#modals').innerHTML='';buildBoard();renderRoster();camOverview(0,0)});
  if(roster==='compact')await page.evaluate(()=>document.querySelector('#roster')?.classList.add('qa-compact'));
  // Stabilize camera and animation clock for comparable crops.
  await page.waitForFunction(()=>typeof camS!=='undefined'&&typeof camT!=='undefined'&&Math.abs(camS.L-camT.L)<.005&&Math.abs(camS.pitch-camT.pitch)<.0005&&Math.abs(camS.yaw-camT.yaw)<.0005&&camS.look.every((v,i)=>Math.abs(v-camT.look[i])<.005),null,{timeout:45000});
  await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>{const maxTextureSize=GL?.getParameter(GL.MAX_TEXTURE_SIZE)||null;const boardTexture={width:S3?.boardCanvas?.width||null,height:S3?.boardCanvas?.height||null};const canvases=[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,visible:c.getBoundingClientRect().width>100&&c.getBoundingClientRect().height>100}));return {dpr:devicePixelRatio,maxTextureSize,boardTexture,canvases}});
  if(scale===2&&textureSize===2048&&labelContrast==='standard'&&labelHierarchy==='standard'){
   const hud=await page.evaluate(()=>{
    const roster=document.querySelector('#roster');
    const cards=[...roster.querySelectorAll('.pcard')];
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return {variant:roster.classList.contains('qa-compact')?'compact':'standard',viewport:{width:innerWidth,height:innerHeight},roster:box(roster),cards:cards.map(c=>({bounds:box(c),name:box(c.querySelector('.pn')||c),nameClipped:!!c.querySelector('.pn')&&c.querySelector('.pn').scrollWidth>c.querySelector('.pn').clientWidth,propertyChips:[...c.querySelectorAll('.pg')].map(box),visible:c.getBoundingClientRect().width>0&&c.getBoundingClientRect().height>0}))};
   });
   fs.writeFileSync(path.join(out,'living-board-hud-'+roster+'-metrics.json'),JSON.stringify(hud,null,2));
   if(hud.cards.length!==4||hud.cards.some(c=>!c.visible||c.bounds.right>hud.viewport.width||c.bounds.bottom>hud.viewport.height))errors.push('HUD roster card visibility/viewport mismatch');
   if(roster==='compact'&&hud.cards.some(c=>c.nameClipped))errors.push('Compact HUD player name clipped');
  }
  const filename='living-board-lagos-'+String(scale).replace('.','_')+'x-tex'+textureSize+'-'+labelContrast+'-'+labelHierarchy+'-'+roster+'.png';
  await page.screenshot({path:path.join(out,filename)});
  // Keep source-pixel crops unscaled, so reviewers can inspect fine geometry and label antialiasing.
  // These fixed viewport regions are diagnostic only; no game UI is modified.
  const crops=[
   {name:'center',clip:{x:270,y:95,width:304,height:210}},
   {name:'lower',clip:{x:205,y:235,width:434,height:140}}
  ];
  const cropFiles=[];
  for(const crop of crops){
   const cropName='living-board-'+crop.name+'-'+String(scale).replace('.','_')+'x-tex'+textureSize+'-'+labelContrast+'-'+labelHierarchy+'-'+roster+'.png';
   await page.screenshot({path:path.join(out,cropName),clip:crop.clip});
   cropFiles.push(cropName);
  }
  // Building-stage geometry audit: isolated fixture in the disposable browser only.
  // Inspect real scene-node counts and a close camera; never alters game.html or saves.
  if(scale===2&&textureSize===2048&&labelContrast==='standard'&&roster==='standard'){
   const stages=await page.evaluate(()=>{
    const ids=SQ.map((q,i)=>q.t==='prop'&&i>0&&i<10?i:-1).filter(i=>i>=0);
    if(ids.length<4)throw Error('Insufficient first-side properties for stage audit');
    ids.forEach((i,k)=>{G.own[i]={o:0,h:k%6,m:false};updateCell(i,false)});
    const inspected=ids.map(i=>({index:i,stage:G.own[i].h,expectedFloors:1,actualFloors:S3.plots[i].floors.length,plotTop:S3.plots[i].top,houseParts:S3.houses[i].kids.length}));
    camGoal([0,0,2.5],0,10,.72,60);
    return inspected;
   });
   await page.waitForFunction(()=>Math.abs(camS.L-camT.L)<.005&&Math.abs(camS.pitch-camT.pitch)<.0005&&camS.look.every((v,i)=>Math.abs(v-camT.look[i])<.005),null,{timeout:45000});
   await page.waitForTimeout(500);
   // A second camera angle tests whether the architectural silhouettes remain
   // distinguishable when the player rotates the board. QA capture only.
   const stageGeometry=await page.evaluate(()=>{
    const ids=SQ.map((q,i)=>q.t==='prop'&&i>0&&i<10?i:-1).filter(i=>i>=0);
    const count=n=>n?1+(n.kids||[]).reduce((sum,k)=>sum+count(k),0):0;
    return ids.map(i=>({index:i,stage:G.own[i].h,sceneNodes:count(S3.plots[i].floors[0]),markerNodes:count(S3.houses[i]),height:S3.plots[i].top}));
   });
   const geometryFile='living-board-building-stage-geometry.json';
   fs.writeFileSync(path.join(out,geometryFile),JSON.stringify({environment:'QA-only simulated mobile',stageGeometry},null,2));
   const stageFile='living-board-building-stages-baseline.png';
   await page.screenshot({path:path.join(out,stageFile)});
   await page.evaluate(()=>{camT.yaw+=Math.PI/5});
   await page.waitForFunction(()=>Math.abs(camS.yaw-camT.yaw)<.0005,null,{timeout:45000});
   await page.waitForTimeout(350);
   const rotatedFile='living-board-building-stages-rotated.png';
   await page.screenshot({path:path.join(out,rotatedFile)});
   if(stageGeometry.some(x=>x.sceneNodes<2||x.height<=0))errors.push('Missing building geometry or height');

   fs.writeFileSync(path.join(out,'living-board-building-stages-metrics.json'),JSON.stringify({environment:'QA-only simulated mobile; not physical iPhone',stages,stageFile},null,2));
   console.log('BUILDING_STAGE_AUDIT '+JSON.stringify(stages));
   if(stages.some(x=>x.actualFloors!==x.expectedFloors))errors.push('Building stage scene-node count mismatch');
   if(stages.some((x,i)=>i>0&&x.plotTop<=stages[i-1].plotTop))errors.push('Building stage height progression mismatch');
  }
  results.push({scale,textureSize,labelContrast,labelHierarchy,roster,filename,cropFiles,metrics,errors});
  await context.close();
 }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(out,'living-board-pixel-metrics.json'),JSON.stringify({environment:'Chromium SwiftShader simulated mobile; not physical iPhone',results},null,2));
 for(const r of results){console.log(JSON.stringify({scale:r.scale,textureSize:r.textureSize,labelContrast:r.labelContrast,labelHierarchy:r.labelHierarchy,roster:r.roster,boardTexture:r.metrics.boardTexture,maxTextureSize:r.metrics.maxTextureSize,canvases:r.metrics.canvases.filter(c=>c.visible),errors:r.errors}));if(r.errors.length||r.metrics.boardTexture.width!==r.textureSize||r.metrics.maxTextureSize<r.textureSize)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
