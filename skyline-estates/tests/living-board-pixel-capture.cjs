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
 for(const scale of [1.5,2,2.5,3]){
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'PixelQA',nickSet:true,welcomed:1,tutDone:1,coins:10000,xp:3000,flat2d:false,rig:false,riders:false,coach:{pre:1,post:1}})));
  await page.route('https://**/*',route=>route.abort());
  const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html?skylineRenderScale='+scale;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#boot').waitFor({state:'detached',timeout:60000});
  await page.evaluate(()=>{FAST=true;GEN++;achScan=()=>{};achBump=()=>{};achShow=()=>{};coachTip=()=>{};trackable=()=>false;applyCity('lagos');newGame({cash:5000,set:{city:'lagos',mode:'classic',even:true,perks:false,events2:false,ai:'normal',speed:'fast'},players:[{name:'PixelQA',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true},{name:'Lucas',tok:TOKENS[3],col:PCOL[3],ai:true}]});G.turn=0;G.phase='post';G.keysShown=true;Object.values(GROUPS).forEach((ids,k)=>ids.forEach(i=>G.own[i]={o:k%2,h:[0,1,2,3,4,5,0,1][k],m:false}));FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;document.querySelector('#modals').innerHTML='';buildBoard();renderRoster();camOverview(0,0)});
  // Stabilize camera and animation clock for comparable crops.
  await page.waitForFunction(()=>typeof camS!=='undefined'&&typeof camT!=='undefined'&&Math.abs(camS.L-camT.L)<.005&&Math.abs(camS.pitch-camT.pitch)<.0005&&Math.abs(camS.yaw-camT.yaw)<.0005&&camS.look.every((v,i)=>Math.abs(v-camT.look[i])<.005),null,{timeout:45000});
  await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>{const canvases=[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,visible:c.getBoundingClientRect().width>100&&c.getBoundingClientRect().height>100}));return {dpr:devicePixelRatio,canvases}});
  const filename='living-board-lagos-'+String(scale).replace('.','_')+'x.png';
  await page.screenshot({path:path.join(out,filename)});
  // Keep source-pixel crops unscaled, so reviewers can inspect fine geometry and label antialiasing.
  // These fixed viewport regions are diagnostic only; no game UI is modified.
  const crops=[
   {name:'center',clip:{x:270,y:95,width:304,height:210}},
   {name:'lower',clip:{x:205,y:235,width:434,height:140}}
  ];
  const cropFiles=[];
  for(const crop of crops){
   const cropName='living-board-'+crop.name+'-'+String(scale).replace('.','_')+'x.png';
   await page.screenshot({path:path.join(out,cropName),clip:crop.clip});
   cropFiles.push(cropName);
  }
  results.push({scale,filename,cropFiles,metrics,errors});
  await context.close();
 }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(out,'living-board-pixel-metrics.json'),JSON.stringify({environment:'Chromium SwiftShader simulated mobile; not physical iPhone',results},null,2));
 for(const r of results){console.log(JSON.stringify({scale:r.scale,canvases:r.metrics.canvases.filter(c=>c.visible),errors:r.errors}));if(r.errors.length)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
