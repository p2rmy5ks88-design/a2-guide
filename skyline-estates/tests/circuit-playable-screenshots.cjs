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
   if(errors.length||!strategy.renderer||strategy.pixels.w<strategy.css.w*(p.dpr>1?1.5:1)||strategy.pixels.h<strategy.css.h*(p.dpr>1?1.5:1))throw Error(p.id+' strategy '+JSON.stringify({strategy,errors}));
   const strategyPng=await page.screenshot({path:path.join(out,p.id+'-playable-strategy.png')});
   const strategyBoard=await page.locator('#cx-board').screenshot({path:path.join(out,p.id+'-board-strategy.png')});
   await page.locator('#cx-city-view').click();
   await page.waitForTimeout(1600);
   const city=await page.locator('#cx-city-view').getAttribute('aria-pressed');
   if(city!=='true'||errors.length)throw Error(p.id+' city '+JSON.stringify({city,errors}));
   if(await page.locator('#cx-roll, #cx-buy, #cx-end, [data-plan], [data-build]').count())throw Error('Gameplay controls remain visible in inspection-only City View');
   if((await page.locator('#cx-actions').innerText()).match(/City View is for looking only/g))throw Error('Redundant City View warning returned');
   const cityPng=await page.screenshot({path:path.join(out,p.id+'-playable-city.png')});
   if(strategyPng.equals(cityPng))throw Error('City and Strategy screenshots are pixel-identical');
   const cityBoard=await page.locator('#cx-board').screenshot({path:path.join(out,p.id+'-board-city.png')});
   if(strategyBoard.equals(cityBoard))throw Error('3D board did not change between Strategy and City View; HUD-only changes are insufficient');
   const cityPitch=await page.evaluate(()=>window.__circuitUI.r3()?.camera?.pitch);
   if(Math.abs(cityPitch-30)>.1)throw Error('City View camera did not reach validated 30-degree pitch: '+cityPitch);
   // Review-only populated skyline: use the existing presentation test hook, never modify rules state.
   const before=await page.evaluate(()=>JSON.stringify(window.__circuitUI.state()));
   await page.evaluate(()=>{const ids=window.SkylineCircuit.PROPS,st={};ids.forEach((id,i)=>st[id]=1+(i%4));window.__circuitUI.setStages(st)});
   await page.waitForTimeout(700);
   const populatedPng=await page.screenshot({path:path.join(out,p.id+'-populated-city.png')});
   if(populatedPng.equals(cityPng))throw Error('Populated skyline is visually identical to empty city');
   const populatedBoard=await page.locator('#cx-board').screenshot({path:path.join(out,p.id+'-board-populated.png')});
   if(populatedBoard.equals(cityBoard))throw Error('Populated buildings did not change the 3D canvas');
   const after=await page.evaluate(()=>JSON.stringify(window.__circuitUI.state()));
   if(before!==after)throw Error('Presentation-only populated skyline mutated match state');
   const populated=await page.evaluate(()=>({stages:window.SkylineCircuit.PROPS.length,modelStages:window.__circuitUI.state().own}));
   if(populated.stages!==20)throw Error('Expected 20 property stage previews');
   await page.locator('#cx-city-view').click();
   const back=await page.locator('#cx-city-view').getAttribute('aria-pressed');
   if(back!=='false')throw Error('City View did not return to Strategy View');
   await page.waitForTimeout(900);
   const strategyPitch=await page.evaluate(()=>window.__circuitUI.r3()?.camera?.pitch);
   if(Math.abs(strategyPitch)>.1)throw Error('Strategy View did not restore 0-degree decision camera: '+strategyPitch);
   if(!(await page.locator('#cx-roll').count()))throw Error('Gameplay controls were not restored on return');
   console.log('PLAYABLE CAPTURED '+p.id+' '+JSON.stringify(strategy));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
