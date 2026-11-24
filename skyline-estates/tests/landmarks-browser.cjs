// Landmarks: earned from existing stats, converted frames/rooftops, no rooftops on buildings, one-time set reward.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const p=await browser.newPage({viewport:{width:844,height:390}});await p.route('https://**/*',r=>r.abort());
 await p.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true,coins:100,stats:{games:9},
  cstat:{skyline:{plays:5,wins:3}},champ:{skyline:1},inv:{roof:{solar:1},frame:{gala:1}},eq:{roof:'solar'}})));
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.locator('#boot').waitFor({state:'detached',timeout:25000});
 const r=await p.evaluate(()=>{const L=SkylineLandmarks.marks('skyline');
  return{skyline:L.map(m=>m.have),plinth:ROOFS.find(x=>x.id==='solar').name,roofOnBuildings:roofOf(0),solarKept:!!PREF.inv.roof.solar,galaWonder:!!frameDef('gala').own}});
 assert.deepEqual(r.skyline,[true,true,true],'Skyline: 3 wins + Champion = all three tiers (Champion frame converted)');
 assert.equal(r.plinth,'Solar Plinth','rooftop renamed to a plinth');assert.equal(r.roofOnBuildings,null,'buildings use the standard roof');assert.ok(r.solarKept,'owned rooftop kept');assert.ok(r.galaWonder,'Gala frame still owned (Wonder)');
 await p.evaluate(()=>{homeTab('collection');homeTab('frames')});await p.waitForSelector('.lmk-setp');
 assert.equal(await p.locator('#pane>.subtabs [data-s="frames"]').innerText().then(t=>t.trim()),'Landmarks');
 assert.match(await p.locator('.lmk-card.have').filter({hasText:'Gala Tower'}).innerText(),/Gala Tower/,'Gala Tower wonder shown as earned');
 const set=await p.evaluate(()=>{PREF.lmSets={};if(PREF.inv.fin)delete PREF.inv.fin.gold;const ng=COUNTRIES.find(c=>c.key==='INT');ng.cities.forEach(c=>{PREF.cstat[c]=PREF.cstat[c]||{plays:1,wins:0};PREF.cstat[c].wins=Math.max(1,PREF.cstat[c].wins)});
  const before=PREF.coins;SkylineLandmarks.checkSets();const once=PREF.coins;SkylineLandmarks.checkSets();return{paid:once-before,again:PREF.coins-once,fin:!!PREF.inv.fin?.gold,marked:!!PREF.lmSets?.INT}});
 assert.deepEqual(set,{paid:500,again:0,fin:true,marked:true},'country set pays once and grants the Gold finish');
 console.log('LANDMARKS 9 checks');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
