// Run on the isolated Championship feature branch. Creates actual mobile screenshots
// and times rendered AI matches (rather than using a zero-delay headless simulator).
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),out=process.argv[2]||'/tmp/skyline-championship-review';
fs.mkdirSync(out,{recursive:true});
const report={screens:[],duration:[],errors:[]};
const prefs=ui=>JSON.stringify({nick:'QA',nickSet:true,welcomed:1,tutDone:1,flat2d:true,ui,stats:{games:5},coach:{on:false}});
async function open(browser,vp,ui){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(v=>localStorage.setItem('skylinePrefs',v),prefs(ui));
  await page.goto('file://'+path.join(root,'index.html'),{waitUntil:'domcontentloaded'});
  await page.locator('#boot').waitFor({state:'detached',timeout:30000});
  return page;
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl','--autoplay-policy=no-user-gesture-required'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const vp of [{width:667,height:375},{width:844,height:390}]){
   for(const ui of ['dark','light']){
     const page=await open(browser,vp,ui);
     await page.evaluate(ui=>{
       FAST=true;GEN++;newGame({cash:1600,set:{ai:'normal',speed:'fast',city:'lagos',mode:'timed',rounds:30,championship:1,lc:true},
         players:[{name:'QA',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Mei',tok:TOKENS[1],col:PCOL[1],ai:true}]});
       FAST=false;G.round=28;G.phase='post';
       document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
       PREF.ui=ui;applyUI();renderRoster();flatDraw();
     },ui);
     await page.waitForTimeout(700);
     const round=await page.locator('#round').innerText();
     assert.match(round,/28 of 30.*3 ROUNDS LEFT/,'round countdown '+ui);
     const dims=await page.locator('#round').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,screen:innerWidth}});
     assert.ok(dims.h>0&&dims.w>0&&dims.x<dims.screen,'round badge visible '+JSON.stringify(dims));
     await page.screenshot({path:path.join(out,'round-'+vp.width+'-'+ui+'.png'),fullPage:false});
     await page.evaluate(()=>{G.round=31;renderRoster()});
     const finalRound=await page.locator('#round').innerText();
     assert.match(finalRound,/Round 30 of 30/,'post-finish round must be clamped');
     await page.evaluate(()=>{G.round=30;G.phase='post';void finish()});
     await page.locator('.endgrid .stand').waitFor({state:'visible',timeout:15000});
     const detail=page.locator('.champ-score-details summary');
     assert.equal(await detail.count(),1,'Championship breakdown must be discoverable');
     await detail.click();
     assert.match(await page.locator('.champ-score-details').innerText(),/Landmark investment/);
     await page.screenshot({path:path.join(out,'results-'+vp.width+'-'+ui+'.png'),fullPage:false});
     const layout=await page.evaluate(()=>{
       const el=document.querySelector('.endgrid'),r=el.getBoundingClientRect();
       return{x:r.x,right:r.right,viewport:innerWidth,detail:document.querySelector('.champ-score-details')?.open};
     });
     assert.ok(layout.x>=-3&&layout.right<=vp.width+5,'results overflow viewport '+JSON.stringify(layout));
     report.screens.push({vp,ui,round,finalRound,layout});
     await page.close();
   }
 }
 // Fast speed with real browser async flow and AI moves: measured, NOT simulated rounds.
 for(const seats of [2,3,4]){
   const page=await open(browser,{width:844,height:390},'dark');
   await page.evaluate(seats=>{
     FAST=true;GEN++;
     newGame({cash:1600,set:{ai:'normal',speed:'fast',city:'lagos',mode:'timed',rounds:4,championship:1,lc:true,pot:false},
       players:Array.from({length:seats},(_,i)=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});
     FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
     window.__champStarted=performance.now();void run();
   },seats);
   await page.waitForFunction(()=>G&&G.over,null,{timeout:210000});
   const d=await page.evaluate(()=>({seconds:+((performance.now()-window.__champStarted)/1000).toFixed(2),
     roundsCompleted:G.set.rounds,turns:G.set.rounds*G.players.length,players:G.players.length}));
   assert.equal(d.roundsCompleted,4,'all scheduled rounds should be completed');
   assert.equal(d.players,seats);
   report.duration.push(d);
   console.log('BROWSER DURATION '+JSON.stringify(d));
   await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 assert.deepEqual(report.errors,[],'No page errors');
 console.log('PASS Championship visual review and browser duration samples '+JSON.stringify({screens:report.screens.length,samples:report.duration.length}));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');process.exit(1)});
