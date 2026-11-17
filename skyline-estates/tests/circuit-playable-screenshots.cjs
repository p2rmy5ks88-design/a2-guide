/* Browser evidence from the actual playable Circuit renderer, isolated from production.
   Uses a fresh browser context and fixed seed; no live deployment or native build. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.CIRCUIT_GAME_URL||'http://127.0.0.1:8765/circuit-alpha.html?renderer=3d&quality=high&seed=32981&speed=instant';
(async()=>{
 const out=path.resolve(process.env.CIRCUIT_SCREENSHOT_DIR||'circuit-camera-screenshots');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 try{
  for(const p of [{id:'iphone',w:956,h:440,dpr:2},{id:'compact',w:844,h:390,dpr:2},{id:'desktop',w:1440,h:900,dpr:1}]){
   const context=await browser.newContext({viewport:{width:p.w,height:p.h},deviceScaleFactor:p.dpr});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url())});
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#cx-n').selectOption('1');
   await page.locator('#cx-start').click();
   await page.waitForSelector('#cx-game:not([hidden])',{timeout:20000});
   await page.waitForSelector('#cx-city-view',{timeout:25000});
   await page.waitForTimeout(1800);
   const strategy=await page.evaluate(()=>{const c=document.querySelector('#cx-board');return{css:{w:c.clientWidth,h:c.clientHeight},pixels:{w:c.width,h:c.height},renderer:!!document.querySelector('#cx-city-view')}});
   if(errors.length||!strategy.renderer||strategy.pixels.w<strategy.css.w*1.5||strategy.pixels.h<strategy.css.h*1.5)throw Error(p.id+' strategy '+JSON.stringify({strategy,errors}));
   const strategyPng=await page.screenshot({path:path.join(out,p.id+'-playable-strategy.png')});
   await page.locator('#cx-city-view').click();
   await page.waitForTimeout(1600);
   const city=await page.locator('#cx-city-view').getAttribute('aria-pressed');
   if(city!=='true'||errors.length)throw Error(p.id+' city '+JSON.stringify({city,errors}));
   const cityPng=await page.screenshot({path:path.join(out,p.id+'-playable-city.png')});
   if(strategyPng.equals(cityPng))throw Error('City and Strategy screenshots are pixel-identical');
   // Review-only populated skyline: use the existing presentation test hook, never modify rules state.
   await page.evaluate(()=>{const ids=window.SkylineCircuit.PROPS,st={};ids.forEach((id,i)=>st[id]=1+(i%4));window.__circuitUI.setStages(st)});
   await page.waitForTimeout(700);
   await page.screenshot({path:path.join(out,p.id+'-populated-city.png')});
   const populated=await page.evaluate(()=>({stages:window.SkylineCircuit.PROPS.length,modelStages:window.__circuitUI.state().own}));
   if(populated.stages!==20)throw Error('Expected 20 property stage previews');
   await page.locator('#cx-city-view').click();
   const back=await page.locator('#cx-city-view').getAttribute('aria-pressed');
   if(back!=='false')throw Error('City View did not return to Strategy View');
   console.log('PLAYABLE CAPTURED '+p.id+' '+JSON.stringify(strategy));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
