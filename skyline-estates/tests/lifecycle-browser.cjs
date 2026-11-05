// Task 13: radio streams pause while hidden and resume on return; a local match is saved when hidden.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const p=await browser.newPage({viewport:{width:844,height:390}});await p.route('https://**/*',r=>r.abort());
 await p.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:5}})));
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.locator('#boot').waitFor({state:'detached',timeout:25000});
 const r=await p.evaluate(()=>{
  const fake=()=>({paused:false,plays:0,pause(){this.paused=true},play(){this.paused=false;this.plays++;return Promise.resolve()}});
  const a=fake(),b=fake();b.paused=true;FMS.slots.splice(0,FMS.slots.length,{a:b},{a});AUD.radioOn=true;PREF.audio=PREF.audio||{};PREF.audio.radio=true;PREF.audio=PREF.audio||{};PREF.audio.radio=true;
  GEN++;newGame({cash:1500,set:{ai:'normal',speed:'fast',city:'lagos'},players:[{name:'Ada',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true}]});
  G.players[0].cash=1234;localStorage.removeItem(SKEY);
  SkylineLifecycle.hide();const hidden={a:a.paused,b:b.paused,saved:(loadSave()?.players?.[0]?.cash)===1234};
  SkylineLifecycle.show();const shown={a:a.paused,b:b.paused,plays:a.plays};
  a.pause();AUD.radioOn=false;SkylineLifecycle.hide();a.paused=true;SkylineLifecycle.show();const off=a.plays;
  return{hidden,shown,off}});
 assert.deepEqual(r.hidden,{a:true,b:true,saved:true},'streams paused and match saved when hidden');
 assert.deepEqual(r.shown,{a:false,b:true,plays:1},'only the playing stream resumes');
 assert.equal(r.off,1,'radio switched off stays off');
 console.log('LIFECYCLE 3 checks');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
