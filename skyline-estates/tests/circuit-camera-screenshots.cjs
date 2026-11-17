/* Capture visual evidence from the standalone cinematic camera lab.
   Does NOT represent the production renderer or constitute iPhone device QA. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.CIRCUIT_PREVIEW_URL||'http://127.0.0.1:8765/circuit-cinematic-lab.html';
(async()=>{
 const out=path.resolve(process.env.CIRCUIT_SCREENSHOT_DIR||'circuit-camera-screenshots');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-web-security','--no-sandbox']});
 try{
  const profiles=[{id:'iphone-landscape',w:956,h:440,dpr:2},{id:'compact-landscape',w:844,h:390,dpr:2},{id:'desktop',w:1440,h:900,dpr:1}];
  for(const p of profiles){
   const context=await browser.newContext({viewport:{width:p.w,height:p.h},deviceScaleFactor:p.dpr});
   const page=await context.newPage();const failures=[];
   page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error')failures.push('console: '+m.text())});
   await page.goto(base,{waitUntil:'networkidle',timeout:30000});
   try{await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0&&c.height>0},{timeout:20000})}catch(e){throw Error('WebGL initialization failed on '+p.id+': '+JSON.stringify({errors:failures,html:(await page.content()).slice(0,300)}))}
   await page.waitForTimeout(1500);
   const status=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');return{width:c.width,height:c.height,webgl:!!gl}});
   if(!status.webgl||failures.length)throw Error(p.id+' '+JSON.stringify({status,failures}));
   if(p.h<=520){const hud=await page.evaluate(()=>{const a=document.querySelector('aside').getBoundingClientRect(),b=document.querySelector('#status').getBoundingClientRect();return{asideBottom:a.bottom,statusTop:b.top,collapsed:getComputedStyle(document.querySelector('#buttons')).display==='none'}});if(!hud.collapsed||hud.asideBottom>=hud.statusTop)throw Error('Landscape HUD collision: '+JSON.stringify(hud))}
   await page.screenshot({path:path.join(out,p.id+'-cinematic.png')});
   if(p.h<=520)await page.locator('#toggle-controls').click();
   await page.locator('#strat').click();await page.waitForTimeout(500);
   await page.screenshot({path:path.join(out,p.id+'-strategy.png')});
   console.log('CAPTURED '+p.id+' '+JSON.stringify(status));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
