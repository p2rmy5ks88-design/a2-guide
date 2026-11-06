// Living City V2 (offline rule version 2): versioning, legacy saves, and each task's rules in the shipped web build.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const shots=process.env.LC_SHOTS||'';
const legacy=fs.readFileSync(path.join(__dirname,'fixtures','legacy-v1-save.json'),'utf8');
let n=0;const ok=(m)=>{n++;console.log('PASS',m)};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const open=async(prefs,vp={width:844,height:390})=>{const p=await browser.newPage({viewport:vp,deviceScaleFactor:shots?2:1});const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.errs=errs;
  await p.route('https://**/*',r=>r.abort());
  await p.addInitScript(v=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s',1);localStorage.clear();localStorage.setItem('skylinePrefs',v)}},JSON.stringify(Object.assign({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:9},city:'lagos'},prefs)));
  await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.locator('#boot').waitFor({state:'detached',timeout:25000});return p};
 const quick=p=>p.evaluate(()=>{homeTab('play');document.querySelector('#qAI').click();return 1});
 // ---- Task 01 ----
 let p=await open({});await quick(p);await p.waitForFunction(()=>G&&G.players);
 let r=await p.evaluate(()=>({rv:G.rv,lcv:G.lcv,e2:G.set.events2,e1:G.set.events,next:G.ev2Next,online:G.online||false,save:validateSave(G),setOnline:'rv' in cfgSetOnline()||'events2' in cfgSetOnline()}));
 assert.deepEqual(r,{rv:2,lcv:1,e2:true,e1:false,next:3,online:false,save:true,setOnline:false},'new solo match is V2 with Strategic Events '+JSON.stringify(r));ok('new solo match: rule version 2, Strategic Events on, classic City Events off, online settings carry no V2 keys');
 r=await p.evaluate(()=>{GEN++;G.phase='busy';let guard=0;while(G.round<3&&guard++<20)advanceTurn();ev2Chip();const c=document.querySelector('#ev2chip');
  return{ev:!!G.ev2,from:G.ev2&&G.ev2.from,icon:!!(c&&c.querySelector('img.lc-ic')),one:!(G.set.events&&G.set.events2),cells:document.querySelectorAll('#flatbd .mc.lc-ev').length>=0}});
 assert.ok(r.ev&&r.from===3&&r.icon&&r.one,'event in round 3 with kit icon '+JSON.stringify(r));ok('first Strategic Event starts in round 3 (cadence unchanged) and the chip uses the kit icon');
 if(shots){await p.waitForTimeout(5000);for(const [w,h] of [[844,390],[956,440]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{$('#modals').innerHTML='';flatDraw();ev2Chip()});await p.waitForTimeout(700);await p.screenshot({path:path.join(shots,`01-event-chip-${w}x${h}.png`)})}}
 assert.deepEqual(p.errs,[]);await p.close();
 p=await open({lc:false});await quick(p);await p.waitForFunction(()=>G&&G.players);
 r=await p.evaluate(()=>({rv:G.rv??null,e2:G.set.events2??null}));assert.deepEqual(r,{rv:null,e2:null});ok('Living City switched off: classic rules exactly as before (no rule version, events off)');await p.close();
 p=await open({rules:{events:true}});await quick(p);await p.waitForFunction(()=>G&&G.players);
 r=await p.evaluate(()=>({rv:G.rv,e1:G.set.events,e2:!!G.set.events2}));assert.deepEqual(r,{rv:2,e1:true,e2:false});ok('player who opted into classic City Events keeps them; the two systems never run together');await p.close();
 p=await open({});r=await p.evaluate(fx=>{const g=JSON.parse(fx).game;return{valid:validateSave(g),rv:g.rv??null,e2:g.set.events2??null,jail:g.players[1].inJail,pass:g.players[0].goojf.length,deck:g.chance.length}},legacy);
 assert.deepEqual(r,{valid:true,rv:null,e2:null,jail:true,pass:1,deck:15});ok('legacy v1 fixture validates and keeps classic rules, Lockup state, Bail Pass and deck');
 r=await p.evaluate(fx=>{const g=JSON.parse(fx).game;g.rv=2;g.lcv=1;g.online=true;return validateSave(g)},legacy);assert.equal(r,false);ok('a V2 rule version on an online match is rejected');
 await p.close();
 await browser.close();console.log(`LIVING CITY ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
