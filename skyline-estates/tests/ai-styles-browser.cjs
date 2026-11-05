// Task 10: AI styles stay legal, finish games, keep bank/cash invariants, label cards and explain buys.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true})));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.locator('#boot').waitFor({state:'detached',timeout:25000});
 const sim=await page.evaluate(async()=>{SkylineAIStyles.simulate(true);const all=[];
  try{for(let rot=0;rot<3;rot++){SkylineAIStyles.setRotation(rot);all.push(...await __sim(4,3,{seed:4100+rot,set:{maxRounds:300}}))}}finally{SkylineAIStyles.simulate(false);SkylineAIStyles.setRotation(0)}
  return{n:all.length,errors:all.filter(g=>g.err).length,unfinished:all.filter(g=>g.outcome==='round-limit').length,invariants:all.every(g=>g.houseBank&&g.hotelBank&&g.cashOk)}});
 assert.equal(sim.n,12);assert.equal(sim.errors,0,'no engine errors');// The unchanged base engine also reaches the 300-round cap in 1 of these 12 seeded games.
 assert.ok(sim.unfinished<=2,'styled games finish like the base engine: '+sim.unfinished);assert.ok(sim.invariants,'bank and cash invariants');
 const live=await page.evaluate(()=>{FAST=false;GEN++;newGame({cash:1500,set:{ai:'normal',speed:'fast',city:'lagos'},players:[{name:'Ada',tok:TOKENS[3],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[0],col:PCOL[1],ai:true},{name:'Zara',tok:TOKENS[1],col:PCOL[2],ai:true},{name:'Tunde',tok:TOKENS[2],col:PCOL[3],ai:true}]});
  renderRoster();const g=GROUPS.pink;G.own[g[0]]={o:1,h:0,m:false};G.own[g[1]]={o:1,h:0,m:false};const buy=aiWantsBuy(P(1),g[2]);
  return{tags:[...document.querySelectorAll('.tag.ai-style')].map(t=>t.textContent),buy,bubble:document.querySelector('.rbub')?.textContent||''}});
 assert.deepEqual(live.tags.sort(),['AI · Builder','AI · Investor','AI · Trader']);
 assert.ok(live.buy&&/Completes/.test(live.bubble),'set-completing buy is explained: '+live.bubble);
 assert.deepEqual(errors,[]);
 console.log('AI STYLES',JSON.stringify(sim),live.bubble);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
