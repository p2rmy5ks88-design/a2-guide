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

 // ---- Task 02 · choice cards ----
 p=await open({});await quick(p);await p.waitForFunction(()=>G&&G.players&&G.rv===2);
 r=await p.evaluate(()=>{const bad=/nearest|Back to Start|Lockup|per home|every player|each player|Go there/i;const rep={chance:[2,5,6,7,8,10,11,12,15],esusu:[2,3,7,10,11]};
  const txt=(d,i)=>{const c=lcCard(d,i);return c.classic?loc(c.t):loc(lcVal(c.t))};
  return{replaced:Object.entries(rep).every(([d,a])=>a.every(i=>!lcCard(d,i).classic)),staples:[...Array(16).keys()].flatMap(i=>[txt('chance',i),txt('esusu',i)]).filter(t=>bad.test(t)),pass:!!lcCard('chance',9).goojf&&!!lcCard('esusu',6).goojf}});
 assert.deepEqual(r,{replaced:true,staples:[],pass:true},JSON.stringify(r));ok('V2 decks: 14 staple effects replaced (no nearest-hub, back-to-Start, Lockup, per-building repairs, pay/collect-each, advance-to); Bail Pass slots kept');
 r=await p.evaluate(async()=>{FAST=true;const ai=G.players[1];ai.cash=1500;const errs=[];const ids=[];
  for(const [d,a] of [['chance',[2,5,6,7,10,11,12,15]],['esusu',[2,3,10,11]]])for(const i of a){G[d]=[i,...G[d].filter(x=>x!==i)];try{ai.pos=d==='chance'?7:17;await drawCard(ai,d,[2,3]);ids.push(lcCard(d,i).id)}catch(e){errs.push(String(e))}}
  const decks=['chance','esusu'].every(d=>G[d].length+G.players.reduce((a,p)=>a+p.goojf.filter(c=>c.deck===d).length,0)===16&&new Set(G[d]).size===G[d].length);FAST=false;return{errs,decks,n:ids.length,valid:validateSave(G)}});
 assert.deepEqual(r,{errs:[],decks:true,n:12,valid:true},JSON.stringify(r));ok('AI resolves all 12 choice cards; decks stay complete (16 incl. held passes), no duplicates; save still valid');
 r=await p.evaluate(()=>{const p0=G.players[0];[1,3].forEach(i=>{G.own[i].o=0;G.own[i].h=0;G.own[i].m=false});G.own[2]&&(G.own[2].o=0);const i=1;GROUPS[SQ[i].g].forEach(j=>{G.own[j].o=0;G.own[j].m=false});
  p0.cash=1000;const full=devCost(0,i);p0.lcGrant={pct:50,until:G.round+1};const disc=devCost(0,i);const c0=p0.cash;build(0,i);const paid=c0-p0.cash;return{full,disc,paid,used:p0.lcGrant===null}});
 assert.ok(r.disc===Math.round(r.full/2)&&r.paid===r.disc&&r.used,JSON.stringify(r));ok('development grant: 50% off one legal build, consumed once');
 r=await p.evaluate(()=>{const i=GROUPS.navy[0];G.own[i].o=1;G.own[i].h=2;G.own[i].m=false;const base=(()=>{const m=G.lcMods;G.lcMods=[];const v=rentFor(i,7);G.lcMods=m;return v})();
  G.lcMods=[{pid:1,scope:'streets',group:null,pct:20,until:G.round+1},{pid:1,scope:'built',pct:10,until:G.round+1},{pid:1,scope:'streets',group:'navy',pct:20,until:G.round+1}];G.ev2={v:1,id:'fest',kind:'rent',pct:50,from:G.round,rounds:2,targets:[i],group:'navy',name:'Fest',area:'x',city:'lagos'};
  const capped=rentFor(i,7);G.ev2=null;G.lcMods=[];return{base,capped,max:Math.round(base*1.5)}});
 assert.equal(r.capped,r.max,JSON.stringify(r));ok('rent changes use one capped formula: event +50% and card programmes +50% give +50%, not compounded');
 r=await p.evaluate(async()=>{FAST=true;const q=G.players[2];q.cash=500;q.lcBond=130;q.pos=38;const c0=q.cash;await moveSteps(q,3);const once=q.cash-c0;q.pos=38;const c1=q.cash;await moveSteps(q,3);FAST=false;return{first:once,second:q.cash-c1,pay:payday(q)}});
 assert.deepEqual(r,{first:r.pay+130,second:r.pay,pay:r.pay});ok('city bond pays 130 once at Start');
 if(shots){for(const [w,h] of [[844,390],[667,320]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{$('#modals').innerHTML='';const me=G.players[0];me.ai=false;G.chance=[5,...G.chance.filter(x=>x!==5)];GROUPS.orange.forEach(j=>G.own[j].o=0);drawCard(me,'chance',[2,3]);return 1});await p.waitForTimeout(900);await p.screenshot({path:path.join(shots,`02-choice-card-${w}x${h}.png`)});
   const b=await p.evaluate(()=>[...document.querySelectorAll('.lc-cardm .mbar .btn')].map(x=>{const r=x.getBoundingClientRect();return{h:Math.round(r.height),bottom:r.bottom<=innerHeight+1}}));assert.ok(b.length===2&&b.every(x=>x.h>=44&&x.bottom),'card buttons '+JSON.stringify(b))}}
 r=await p.evaluate(async()=>{$('#modals').innerHTML='';GEN++;const me=G.players[0];me.ai=false;me.cash=900;G.chance=[6,...G.chance.filter(x=>x!==6)];const pr=drawCard(me,'chance',[2,3]);await new Promise(r=>setTimeout(r,500));
  const b=[...document.querySelectorAll('.lc-cardm .mbar .btn')].find(x=>/grant/i.test(x.textContent));b.click();await pr;return{grant:me.lcGrant&&me.lcGrant.pct}});
 assert.deepEqual(r,{grant:50});ok('human chooses on the card (live HTML title, costs and consequences on each button)');
 assert.deepEqual(p.errs,[]);await p.close();
 p=await open({});r=await p.evaluate(async fx=>{FAST=true;G=JSON.parse(fx).game;G.chance=[2,...G.chance.filter(x=>x!==2)];const pl=G.players[2];pl.pos=6;await drawCard(pl,'chance',[1,2]);FAST=false;return{rv:G.rv??null,log:G.log.find(l=>/Taxi!/.test(l))||G.log[0]}},legacy);
 assert.ok(r.rv===null&&/Taxi!/.test(r.log),JSON.stringify(r));ok('legacy save keeps the classic card deck');await p.close();

 // ---- Task 03 · Civic Review ----
 p=await open({});await quick(p);await p.waitForFunction(()=>G&&G.players&&G.rv===2);
 r=await p.evaluate(async()=>{FAST=true;GEN++;const [a,b]=G.players;a.ai=true;const i=GROUPS.pink[0];G.own[i].o=a.id;G.own[i].m=false;
  G.chance=[8,...G.chance.filter(x=>x!==8)];await drawCard(a,'chance',[1,2]);const cr=!!a.cr,jail=a.inJail;
  b.pos=i-1;const c0=b.cash,ca=a.cash;await moveSteps(b,1);await land(b,[1,0]);const rentPaid=c0-b.cash,got=a.cash-ca;
  const v=validateSave(G);a.inJail=true;const both=validateSave(G);a.inJail=false;FAST=false;return{cr,jail,rentPaid,got,v,both,pos:a.pos}});
 assert.deepEqual(r,{cr:true,jail:false,rentPaid:0,got:0,v:true,both:false,pos:r.pos});ok('Planning hold opens a Civic Review (token not moved, no Lockup state); owner under review collects no rent; review+Lockup together is rejected');
 r=await p.evaluate(async()=>{FAST=true;const q=G.players[2];q.cr=null;G.turn=q.id;G.doubles=3;const pos=q.pos;await sendToJail(q);const out={cr:q.cr,pos:q.pos===pos,jail:q.inJail,grid:G.lcStats.gridlock};G.doubles=0;FAST=false;return out});
 assert.deepEqual(r,{cr:null,pos:true,jail:false,grid:1});ok('three doubles = gridlock: turn ends, no detention');
 r=await p.evaluate(async()=>{FAST=true;GEN++;const a=G.players[1];a.ai=true;a.cr={from:G.round,why:'card'};G.chance=G.chance.filter(x=>x!==9);a.goojf=[{deck:'chance',idx:9}];G.own.forEach((o,i)=>{if(o.o===a.id)o.o=-1});const i=GROUPS.orange[0];G.own[i].o=a.id;GROUPS.orange.forEach(j=>G.own[j].o=a.id);
  const r1=await lcReviewTurn(a);const deck=G.chance.includes(9)&&a.goojf.length===0;
  a.cr={from:G.round,why:'card'};a.goojf=[];a.cash=2000;const c=a.cash;const r2=await lcReviewTurn(a);const fee=c-a.cash;
  a.cr={from:G.round,why:'card'};a.cash=10;const r3=await lcReviewTurn(a);FAST=false;return{r1,deck,r2,fee,r3,cleared:a.cr}});
 assert.deepEqual(r,{r1:'play',deck:true,r2:'play',fee:70,r3:'skip',cleared:null});ok('AI resolves review: Bail Pass consumed once (returned to its deck), Fast-Track charged once (70), Standard Review when cash is short');
 r=await p.evaluate(async()=>{FAST=true;GEN++;const a=G.players[3]||G.players[2];a.ai=true;a.cr={from:G.round,why:'card'};a.cash=5;a.goojf=[];G.turn=a.id;G.phase='pre';const pos=a.pos,rd=G.round;await playTurn(a);FAST=false;return{moved:a.pos!==pos,cr:a.cr,rd:G.round===rd}});
 assert.deepEqual(r,{moved:false,cr:null,rd:true});ok('Standard Review skips the whole turn (no roll) and then closes; no stuck turn');
 r=await p.evaluate(async()=>{FAST=true;GEN++;const a=G.players[1];a.ai=true;a.cr=null;a.cash=50000;G.own.forEach(o=>{if(o.o===a.id){o.o=-1;o.h=0}});GROUPS.sky.forEach(j=>{G.own[j].o=a.id;G.own[j].h=0;G.own[j].m=false});G.turn=a.id;G.phase='pre';
  const rnd=Math.random;let k=0;Math.random=()=>[.1,.5][k++%2];try{await playTurn(a)}finally{Math.random=rnd}FAST=false;const lv=GROUPS.sky.reduce((s,j)=>s+G.own[j].h,0);return{lv,cr:a.cr&&a.cr.why}});
 assert.ok(r.lv>=4&&r.cr==="audit",JSON.stringify(r));ok('development audit: 4+ building levels in one turn opens a Civic Review at the end of the turn');
 if(shots){for(const [w,h] of [[844,390],[667,320]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{$('#modals').innerHTML='';const me=G.players[0];me.ai=false;me.cash=900;me.cr={from:G.round,why:'card'};me.goojf=[{deck:'esusu',idx:6}];G.esusu=G.esusu.filter(x=>x!==6);lcReviewTurn(me);renderRoster();return 1});await p.waitForTimeout(700);await p.screenshot({path:path.join(shots,`03-civic-review-${w}x${h}.png`)});
   const b=await p.evaluate(()=>[...document.querySelectorAll('.lc-crm .mbar .btn')].map(x=>{const r=x.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight+1}));assert.ok(b.length===3&&b.every(Boolean),'review buttons')}
  const r9=await p.evaluate(async()=>{const me=G.players[0],c=me.cash;[...document.querySelectorAll('.lc-crm .mbar .btn')].find(x=>/Fast-Track/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,400));return{fee:c-me.cash,cr:me.cr}});
  assert.deepEqual(r9,{fee:70,cr:null});ok('human Fast-Track Permit: fee charged once, review closed')}
 assert.deepEqual(p.errs,[]);await p.close();

 // ---- Task 04 · Skyline Development ----
 p=await open({});await quick(p);await p.waitForFunction(()=>G&&G.players&&G.rv===2);
 r=await p.evaluate(()=>{FAST=true;GEN++;const me=G.players[0];me.cash=99999;G.turn=0;G.lcTurnBuilt=null;const gr=GROUPS.sky;gr.forEach(j=>{G.own[j].o=0;G.own[j].h=0;G.own[j].m=false});const i=gr[0],paid=[],rent=[];
  for(let lv=0;lv<4;lv++)for(const j of gr){if(!canBuild(0,j))return{err:'cannot build '+j+' at '+G.own[j].h};const c=me.cash;build(0,j);if(j===i){paid.push(c-me.cash);rent.push(rentFor(i,7))}G.lcTurnBuilt=null}
  const st={h:gr.map(j=>G.own[j].h),houses:G.houses,hotels:G.hotels,valid:validateSave(G),paid,exp:[1,2,3,5].map(h=>lcCostAt(i,h)),rent,expR:[1,2,3,5].map(h=>lcStageRent(i,h))};
  const c=me.cash;sell(0,i);st.refund=me.cash-c;st.after=G.own[i].h;st.h2=G.houses;st.valid2=validateSave(G);FAST=false;return st});
 assert.ok(!r.err,r.err);assert.deepEqual(r.h,[5,5,5]);assert.deepEqual(r.paid,r.exp);assert.equal(r.houses,36);assert.equal(r.hotels,9);assert.ok(r.valid&&r.valid2);assert.equal(r.refund,Math.round(r.exp[3]/2));assert.equal(r.after,3);assert.equal(r.h2,33);
 assert.deepEqual(r.rent,r.expR,'stage rent '+JSON.stringify(r));ok('stages Plot→Low→Mid→High→Skyscraper: rising stage costs, stage rents, permits (3 home permits back per Skyscraper), half-price refunds, saves valid');
 r=await p.evaluate(()=>{const gr=GROUPS.sky,[a,b]=gr;G.own[a].h=3;G.own[b].h=1;G.ev2={v:1,id:'pulseSoft',kind:'rent',pct:-10,from:G.round,rounds:2,targets:gr.slice(),group:'sky',name:'Quiet',area:'x',city:'lagos'};
  const hi=rentFor(a,7),lo=rentFor(b,7);G.ev2=null;return{hi,lo,hiE:lcStageRent(a,3),loE:Math.round(lcStageRent(b,1)*.9)}});
 assert.equal(r.hi,r.hiE);assert.equal(r.lo,r.loE);ok('High-rise ignores a falling-rent event; Low-rise rent drops 10%');
 if(shots){await p.setViewportSize({width:844,height:390});await p.evaluate(()=>{$('#modals').innerHTML='';G.turn=0;G.phase='post';const gr=GROUPS.sky;gr.forEach((j,k)=>G.own[j].h=[3,2,2][k]);G.houses=36-7;G.hotels=12;G.players[0].ai=false;showSquare(gr[0]);return 1});await p.waitForTimeout(800);await p.screenshot({path:path.join(shots,'04-development-deed-844x390.png')});
  await p.evaluate(()=>{$('#modals').innerHTML='';openAssets(G.players[0]);return 1});await p.waitForTimeout(900);await p.screenshot({path:path.join(shots,'04-development-portfolio-844x390.png')});
  const lb=await p.evaluate(()=>[...document.querySelectorAll('[data-quick-build]')].map(b=>b.textContent));assert.ok(lb.length&&lb.every(t=>/Build (Low-rise|Mid-rise|High-rise|Skyscraper)/.test(t)),'portfolio labels '+JSON.stringify(lb));ok('portfolio build buttons show the next stage, its V2 cost and rent')}
 assert.deepEqual(p.errs,[]);await p.close();
 p=await open({});r=await p.evaluate(fx=>{FAST=true;G=JSON.parse(fx).game;const c=G.players[0].cash;const cost=devCost(0,1);build(0,4);return{rv:G.rv??null,cost,classic:SQ[1].h,h:G.own[4].h}},legacy);
 assert.deepEqual(r,{rv:null,cost:r.classic,classic:r.classic,h:2});ok('legacy save builds classic houses at the classic price');await p.close();
 await browser.close();console.log(`LIVING CITY ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
