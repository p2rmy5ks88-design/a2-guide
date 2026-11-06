// Living City V2 · Task 00 baseline: legacy (rule version 1) save fixture + phone screenshots of the current game.
// Usage: node tests/living-city-baseline.cjs [outDir]   (writes fixtures/legacy-v1-save.json when SKYLINE_WRITE_FIXTURE=1)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const out=process.argv[2]||path.join(__dirname,'evidence','living-city-before');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl']});
 for(const [w,h] of [[956,440],[844,390],[667,320]]){
  const p=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.route('https://**/*',r=>r.abort());
  await p.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:9},city:'lagos'})));
  await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.locator('#boot').waitFor({state:'detached',timeout:25000});
  await p.screenshot({path:path.join(out,`home-${w}x${h}.png`)});
  const fx=await p.evaluate(()=>{setup.city='lagos';newGame({cash:1600,set:Object.assign(cfgSet(),{city:'lagos'}),players:[{name:'Ada',tok:'🚌',col:PCOL[0],ai:false},{name:'Bot A',tok:'🛺',col:PCOL[1],ai:true},{name:'Bot B',tok:'🏍️',col:PCOL[2],ai:true}]});
   // legacy mid-game: full set with houses, a mortgaged street, a held Bail Pass, a player in the Lockup, a drawn card out of the deck
   [1,2,4].forEach(i=>G.own[i].o=0);G.own[1].h=2;G.own[2].h=2;G.own[4].h=1;G.houses-=5;G.own[7].o=1;G.own[7].m=true;G.own[5].o=2;
   G.players[0].cash=900;G.players[0].pos=6;const c=G.chance.indexOf(9);G.chance.splice(c,1);G.players[0].goojf.push({deck:'chance',idx:9});
   G.players[1].inJail=true;G.players[1].pos=10;G.players[1].jailTurns=1;G.round=7;G.phase='pre';
   startWith(G);save();return localStorage.getItem('skylineSave')});
  await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,`board-${w}x${h}.png`)});
  if(process.env.SKYLINE_WRITE_FIXTURE&&w===956)fs.writeFileSync(path.join(__dirname,'fixtures','legacy-v1-save.json'),JSON.stringify(JSON.parse(fx),null,1));
  if(errs.length)throw Error(errs.join('\n'));await p.close();
 }
 await browser.close();console.log('BASELINE screenshots in',out);
})().catch(e=>{console.error(e);process.exit(1)});
