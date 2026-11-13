// Run on the isolated Championship feature branch. Creates actual mobile screenshots
// and times rendered AI matches (rather than using a zero-delay headless simulator).
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const engine=process.env.VISUAL_ENGINE||'chromium';
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
 const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--disable-webgl','--autoplay-policy=no-user-gesture-required'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const vp of [{width:667,height:375},{width:844,height:390},{width:915,height:412},{width:780,height:360}]){
   for(const ui of ['dark','light']){
     const page=await open(browser,vp,ui);
     await page.evaluate(()=>{setup.mode='timed';homeTab('custom')});
     await page.locator('[data-step="1"]').click();
     assert.deepEqual(await page.locator('#seRounds button').allTextContents(),['20','30','40','45'],'active Custom screen Championship choices');
     await page.locator('#seRounds button').filter({hasText:/^40$/}).click();
     assert.equal(await page.evaluate(()=>setup.rounds),40,'40-round option updates live setup');
     assert.match(await page.locator('[data-mode="classic"]').innerText(),/Unlimited rounds/);
     assert.match(await page.evaluate(()=>onlineCfgSummary({mode:'timed',rounds:30,cash:1600})),/^Round limit/,'online timed mode retains legacy name');
     await page.screenshot({path:path.join(out,engine+'-custom-'+vp.width+'-'+ui+'.png'),fullPage:false});
     await page.evaluate(ui=>{
       FAST=true;GEN++;newGame({cash:1600,set:{ai:'normal',speed:'fast',city:'lagos',mode:'timed',rounds:30,championship:1,lc:true},
         players:[{name:'QA',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Mei',tok:TOKENS[1],col:PCOL[1],ai:true}]});
       FAST=false;G.round=28;G.phase='post';
       document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
       PREF.ui=ui;applyUI();renderRoster();flatDraw();
     },ui);
     await page.waitForTimeout(700);
     const round=await page.locator('#round').innerText();
     assert.match(round,/Round 28\/30.*🔔3 left/,'compact round countdown '+ui);
     const dims=await page.locator('#round').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,screen:innerWidth}});
     assert.ok(dims.h>0&&dims.h<88&&dims.w>0&&dims.x<dims.screen,'round badge compact and visible '+JSON.stringify(dims));
     await page.screenshot({path:path.join(out,engine+'-round-'+vp.width+'-'+ui+'.png'),fullPage:false});
     await page.evaluate(()=>{G.round=31;renderRoster()});
     const finalRound=await page.locator('#round').innerText();
     assert.match(finalRound,/Round 30\/30/,'post-finish round must be clamped');
     await page.evaluate(ui=>{G.round=30;G.phase='post';if(ui==='dark'){G.rv=LC_RV;G.lcv=1}const s0=st(G.players[0]);s0.houses=6;s0.hotels=1;void finish()},ui);
     await page.locator('.endgrid .stand').waitFor({state:'visible',timeout:15000});
     await page.waitForTimeout(3500);
     await page.screenshot({path:path.join(out,engine+'-results-overview-'+vp.width+'-'+ui+'.png'),fullPage:false});
     const barCheck=async when=>{const b=await page.evaluate(()=>{const bar=document.querySelector('#modals .mp.endres>.mbar');if(!bar)return null;const r=bar.getBoundingClientRect();
       const hits=[...bar.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect(),t=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.height>=40&&(t===x||x.contains(t))});return{top:r.top,bottom:r.bottom,h:innerHeight,hits}});
       assert.ok(b&&b.top>=0&&b.bottom<=b.h+1&&b.hits.length>=3&&b.hits.every(Boolean),'results buttons visible and tappable '+when+' '+JSON.stringify({vp,ui,b}))};
     await barCheck('before scrolling');
     const mb=await page.evaluate(()=>[...document.querySelectorAll('#modals .hls small')].map(e=>e.textContent).find(t=>/upgrade|houses/.test(t))||'');
     assert.match(mb,ui==='dark'?/made 7 building upgrades and topped out 1 Skyscraper/:/built 6 houses and 1 towers/,'Master builder wording (Living City in dark run, classic in light run): '+mb);
     const detail=page.locator('.champ-score-details summary');
     assert.equal(await detail.count(),1,'Championship breakdown must be discoverable');
     await detail.click();
     assert.match(await page.locator('.champ-score-details').innerText(),/Landmark investment/);
     const canScroll=await page.evaluate(()=>{const p=document.querySelector('#modals .mp');if(!p)return null;const scrollable=p.scrollHeight>p.clientHeight+5;if(scrollable)p.scrollTop=p.scrollHeight;return {scrollable,scrollTop:p.scrollTop,max:p.scrollHeight-p.clientHeight}});
     assert.ok(canScroll&&(!canScroll.scrollable||canScroll.scrollTop>0),'Score breakdown must remain scrollable '+JSON.stringify(canScroll));
     await page.waitForTimeout(200);await barCheck('after scrolling');
     await page.screenshot({path:path.join(out,engine+'-results-'+vp.width+'-'+ui+'.png'),fullPage:false});
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
 for(const width of (process.env.CHAMP_SCREENS_ONLY==='1'?[]:[844,1366]))for(const seats of [2,3,4]){
   const page=await open(browser,{width,height:width===844?390:768},'dark');
   await page.evaluate(({seats,speed})=>{
     FAST=true;GEN++;
     newGame({cash:1600,set:{ai:'normal',speed,city:'lagos',mode:'timed',rounds:4,championship:1,lc:true,pot:false},
       players:Array.from({length:seats},(_,i)=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});
     FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
     window.__champTurns=0;const original=playTurn;playTurn=async function(p){window.__champTurns++;return original(p)};
     window.__champStarted=performance.now();void run();
   },{seats,speed:process.env.CHAMP_SPEED||'normal'});
   await page.waitForFunction(()=>G&&G.over,null,{timeout:210000});
   const d=await page.evaluate(()=>({seconds:+((performance.now()-window.__champStarted)/1000).toFixed(2),
     roundsCompleted:G.round-1,turns:window.__champTurns,players:G.players.length,speed:G.set.speed,viewport:innerWidth}));
   assert.equal(d.roundsCompleted,4,'all scheduled rounds should be completed');
   assert.equal(d.players,seats);assert.equal(d.turns,4*seats,'all players take every scheduled turn');
   report.duration.push(d);
   console.log('BROWSER DURATION '+JSON.stringify(d));
   await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 assert.deepEqual(report.errors,[],'No page errors');
 console.log('PASS Championship visual review and browser duration samples '+JSON.stringify({screens:report.screens.length,samples:report.duration.length}));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');process.exit(1)});
