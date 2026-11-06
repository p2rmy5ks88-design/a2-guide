/* Skyline Estates · Living City V2 (rule version 2).
   New OFFLINE matches only. A match is V2 when G.rv===2; saves without rv, online/ranked matches and the
   authoritative backend copy keep the classic rules. game.html stays byte-unchanged: everything here wraps
   existing functions, and every hook checks lc() first. Wallet, Coins, Shop and purchases are untouched. */
'use strict';
const LC_RV=2;
const lc=(g=G)=>!!(g&&g.rv===LC_RV&&!g.online);
const lcOptIn=()=>PREF.lc!==false;               // Living City rules for new offline matches (default on)
const LC_ICON=(id,size=24)=>`<img class="lc-ic" src="living/icons/${size>32?128:64}/${id}.png" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async">`;

/* ---------- Task 01 · Strategic City Events on by default ---------- */
// One event system per match: Strategic Events (events2) unless the player explicitly opted into the classic
// City Events or explicitly switched Strategic Events off. Cadence is unchanged (round 3, then every 3 rounds).
let lcNext=false;
{const _sfs=startFromSetup;startFromSetup=function(...a){lcNext=lcOptIn();try{return _sfs.apply(this,a)}finally{lcNext=false}}}
{const _ng=newGame;newGame=function(cfg){
  const v2=(lcNext||!!(cfg&&cfg.lc===true))&&!!(cfg&&cfg.set);lcNext=false; // startFromSetup is the offline-only entry point
  if(v2){cfg={...cfg,set:{...cfg.set}};if(cfg.set.events2!==false&&!cfg.set.events){cfg.set.events2=true;cfg.set.events=false}}
  _ng(cfg);
  if(v2){G.rv=LC_RV;G.lcv=1}}}
const EV2_ICON={boom:'building_boom',fest:'festival',film:'festival',infra:'power_grid',slussen:'power_grid',pulseRise:'market_pulse',pulseBuild:'grant',pulseSoft:'market_pulse'};
const lcEvIcon=e=>EV2_ICON[e&&e.id]||'district_growth';
const stripEmoji=s=>String(s).replace(/^[^\p{L}\p{N}]+/u,'');
{const _c=ev2Chip;ev2Chip=function(){_c();if(!lc()||FAST)return;const c=$('#ev2chip');if(!c)return;const b=c.querySelector('b');if(!b||b.querySelector('.lc-ic'))return;
  const e=G.ev2,live=e&&ev2State(e)!=='ended';b.innerHTML=LC_ICON(live?lcEvIcon(e):'district_growth',20)+esc(live?stripEmoji(b.textContent):'City events');c.setAttribute('aria-label',(live?'City event: ':'City events: ')+c.textContent)}}
{const _b=ev2Banner;ev2Banner=function(e){_b(e);if(!lc())return;const n=[...document.querySelectorAll('.ev2ban')].pop();const b=n&&n.querySelector('b');if(b)b.innerHTML=LC_ICON(lcEvIcon(e),32)+esc(stripEmoji(b.textContent))}}
// Board: outline the streets an active or upcoming event affects (2D board and city map; live HTML class, no new art).
const lcEvTargets=()=>{if(!lc()||!G.set.events2)return null;const e=G.ev2;return e&&ev2State(e)!=='ended'?e.targets:null};
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a),t=lcEvTargets();return t&&t.includes(i)?h.replace('<div class="mc','<div class="mc lc-ev'):h}}
{const _fd=flatDraw;document.documentElement.classList.toggle('lc-on',false);let last='';flatDraw=function(){document.documentElement.classList.toggle('lc-on',lc());const t=lcEvTargets(),k=t?G.ev2.id+G.ev2.from+ev2State(G.ev2):'';if(k!==last){last=k;const H=$('#flatbd');if(H)H.dataset.sig=''}return _fd.apply(this,arguments)}}
const LC_RULES=[['district_growth','Living City rules','This match uses Skyline Estates’ Living City rules. Saved classic matches and online games keep the classic rules.'],
  ['festival','Strategic city events','From round 3, every 3 rounds, a named city event changes one district: festival rent, cheaper building or a development boom. One event at a time; tap the event chip to see the streets and the end round.']];
function lcRulesModal(){return modal({cls:'wide lc-rules',html:`<div class="mh">${LC_ICON('district_growth',28)} Living City rules</div><div class="lc-rl">${LC_RULES.map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,32)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`,btns:[{k:'x',label:'Got it',primary:true}]})}
// Rules page: add the V2 section when this match uses it.
{const _m=modal;modal=function(o){if(o&&typeof o.html==='string'&&lc()&&o.html.includes('How to play')&&!o.html.includes('lc-rl'))o={...o,html:o.html+`<h4>Living City rules (this match)</h4><div class="lc-rl">${LC_RULES.slice(1).map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,28)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`};return _m.call(this,o)}}
// Custom setup › Rules: one switch for the whole V2 ruleset (stored separately from the classic house rules).
{const _pc=paneCustom;paneCustom=function(T){const r=_pc.apply(this,arguments);try{if(typeof SE!=='undefined'&&SE.step===1){const P2=T.querySelector('.se-panel');if(P2&&!P2.querySelector('[data-lc]')){
  const row=el('div','se-rule lc-setup',`<div><b>${LC_ICON('district_growth',20)} Living City rules</b><small>New offline matches: strategic city events and Skyline Estates’ own city rules. Turn off for classic rules. Online games always use classic rules.</small></div><button class="se-switch" data-lc="1" aria-label="Living City rules" aria-pressed="${lcOptIn()}"></button>`);
  P2.prepend(row);row.querySelector('[data-lc]').onclick=()=>{PREF.lc=!lcOptIn();savePref();sfx('tap');paneCustom(T)}}}}catch(e){}return r}}
// Saves: rule version is explicit and validated; V2 state is checked by each feature's validator.
const LC_VALID=[];
{const _vs=validateSave;validateSave=function(g){if(!_vs(g))return false;try{if(g.rv==null)return true;if(g.rv!==LC_RV||g.lcv!==1||g.online)return false;return LC_VALID.every(f=>f(g))}catch(e){return false}}}

/* ---------- Shared V2 helpers: capped rent modifiers, development grants ---------- */
// One capped formula for every temporary rent change in a V2 match: Strategic/Market Pulse event % + card
// programmes + Landmark bonus, clamped to −25%…+50%. Never compounds multiplicatively.
const LC_CAP=[-25,50],lcRound=()=>G.round;
function lcMods(){return (G.lcMods||(G.lcMods=[])).filter(m=>m.until>=G.round)}
function lcModPct(i){const o=G.own[i];if(o.o<0)return 0;let t=0;for(const m of lcMods()){if(m.pid!==o.o)continue;
  if(m.scope==='hubs'&&SQ[i].t==='rail')t+=m.pct;else if(m.scope==='streets'&&SQ[i].t==='prop'&&(!m.group||SQ[i].g===m.group))t+=m.pct;else if(m.scope==='built'&&SQ[i].t==='prop'&&o.h>0)t+=m.pct}return t}
const LC_EXTRA_PCT=[];                              // later tasks add (i)=>pct (Landmark)
function lcRentPct(i){const ev=typeof ev2RentPct==='function'?ev2RentPct(i):0,shield=(G.lcMods||[]).some(m=>m.shield&&m.until>=G.round&&m.pid===G.own[i].o);
  let t=(shield&&ev<0?0:ev)+lcModPct(i);for(const f of LC_EXTRA_PCT)t+=f(i);return Math.max(LC_CAP[0],Math.min(LC_CAP[1],t))}
{const _rf=rentFor;rentFor=function(i,dsum,o2){if(!lc())return _rf.apply(this,arguments);
  const ev=ev2RentPct;let r;ev2RentPct=()=>0;try{r=_rf.apply(this,arguments)}finally{ev2RentPct=ev}
  const m=r?lcRentPct(i):0;return m?Math.round(r*(100+m)/100):r}}
// Development grant: one building level at a discount, normal build rules still apply, expires after its rounds.
// Total discount (event + grant) is capped at 50%, and selling refunds half the full price, so no money is created.
function lcGrantDisc(pid,i,base){const p=P(pid),g=p&&p.lcGrant;if(!lc()||!g||g.until<G.round||SQ[i].t!=='prop')return 0;
  const ev=typeof ev2Disc==='function'?ev2Disc(pid,i):0;return Math.max(0,Math.min(Math.round(base*g.pct/100),Math.floor(base*.5)-ev))}
const lcBase=i=>typeof lcStageCost==='function'&&lc()?lcStageCost(i):SQ[i].h;
{const _dc=devCost;devCost=function(pid,i){const c=_dc(pid,i);return lc()?c-lcGrantDisc(pid,i,lcBase(i)):c}}
{const _cb=canBuild;canBuild=function(pid,i){const d=lc()?lcGrantDisc(pid,i,lcBase(i)):0;if(!d)return _cb(pid,i);const p=P(pid);p.cash+=d;try{return _cb(pid,i)}finally{p.cash-=d}}}
{const _b=build;build=function(pid,i){const d=lc()?lcGrantDisc(pid,i,lcBase(i)):0;if(d){P(pid).cash+=d;P(pid).lcGrant=null}const r=_b(pid,i);if(d){if(!FAST)float(pid,d);log(`${P(pid).name} used a development grant: ${fmt(d)} off`)}return r}}

/* ---------- Task 02 · City-specific choice cards (V2 decks) ---------- */
// Same 16-index decks and the same Bail Pass slots (Lucky Break 9, City Hall 6), so deck order, held passes,
// bankruptcy returns and save validation work unchanged. Familiar staple effects are replaced with decisions.
const lcFest=()=>CITY.festival||'the city festival';
const lcBestGroup=pid=>{let best=null,n=0;for(const g in GROUPS){const k=GROUPS[g].filter(i=>G.own[i].o===pid&&!G.own[i].m).length;if(k>n){n=k;best=g}}return best};
const lcNextHub=pos=>RAILS.find(x=>x>pos)??RAILS[0];
const lcLevels=pid=>propsOf(pid).reduce((a,i)=>a+(G.own[i].h===5?4:G.own[i].h),0);
const lcSteps=(p,t)=>(t-p.pos+40)%40;
const lcHubRentFor=(p,j)=>{const o=G.own[j];return o.o>=0&&o.o!==p.id&&!o.m?rentFor(j,7):0};
let lcEnterReview=async(p)=>sendToJail(p);   // Task 03 replaces this with Civic Review
// card: {t (plain text), title, art, icon, ask(p)->[choices], ai(p,choices)->k}. choice: {k,label,info,cost,ok}
const simple=(t,f,extra)=>Object.assign({t,f},extra||{});
const LC_CHANCE=[
 null,null,                                                                   // 0,1 keep classic text
 {id:'corridor',title:'Transit corridor',art:'city_transit',
  t:()=>`A new rapid transit corridor opens. Ride it to ${SQ[lcNextHub(G.players[G.turn].pos)].n}, or stay and take the commuter rebate.`,
  ask:p=>{const j=lcNextHub(p.pos),rent=lcHubRentFor(p,j),pass=p.pos+lcSteps(p,j)>=40;return[
   {k:'ride',label:`Ride to ${SQ[j].n}`,info:`${G.own[j].o<0?'Unowned: you may buy it.':rent?'Pay normal rent '+fmt(rent)+'.':'Your own hub.'}${pass?' Collect payday at Start.':''}`},
   {k:'stay',label:`Stay · +${fmt(20)}`,info:'Collect the commuter rebate and stay here.'}]},
  ai:(p,c)=>{const j=lcNextHub(p.pos),o=G.own[j];return o.o<0&&p.cash>=SQ[j].p+aiReserve(p)?'ride':o.o===p.id?'ride':lcHubRentFor(p,j)<=20&&p.pos+lcSteps(p,j)>=40?'ride':'stay'},
  run:async(p,k,d)=>{if(k==='ride'){await moveTo(p,lcNextHub(p.pos));await land(p,d)}else await collect(p,20)}},
 null,null,                                                                   // 3,4 keep
 {id:'sponsor',title:()=>`Sponsor ${lcFest()}`,art:'lagos_festival',
  t:()=>`${lcFest()} is looking for sponsors. Back it for a short rent boost in your strongest district, or volunteer for a small stipend.`,
  ask:p=>{const g=lcBestGroup(p.id);return[
   {k:'sponsor',label:`Sponsor · ${fmt(60)}`,ok:!!g&&p.cash>=60,info:g?`Your streets in ${GNAME[g]} earn +20% rent for 2 rounds (city rent changes are capped at +50%).`:'You need an unmortgaged street.'},
   {k:'volunteer',label:`Volunteer · +${fmt(20)}`,info:'Collect a volunteer stipend.'}]},
  ai:p=>{const g=lcBestGroup(p.id);if(!g)return'volunteer';const n=GROUPS[g].filter(i=>G.own[i].o===p.id).length;return n>=2&&p.cash-60>=aiReserve(p)?'sponsor':'volunteer'},
  run:async(p,k)=>{if(k==='sponsor'){const g=lcBestGroup(p.id);if(!await pay(p,60,null,'fee'))return;G.lcMods.push({pid:p.id,scope:'streets',group:g,pct:20,until:G.round+1,src:'sponsor'});log(`${p.name} sponsors ${lcFest()}: +20% rent in ${GNAME[g]} until round ${G.round+1}`)}else await collect(p,20)}},
 {id:'grant',title:'Development grant',art:'development_grant',
  t:()=>`City Hall offers a development grant: 50% off your next building level (normal building rules apply) before the end of next round, or take the cash.`,
  ask:p=>[{k:'grant',label:'Take the grant',info:'Your next build costs 50% less. Expires after next round. Building rules unchanged.'},{k:'cash',label:`Take ${fmt(40)}`,info:'Collect the cash now.'}],
  ai:p=>Object.keys(GROUPS).some(g=>ownsAll(p.id,g))?'grant':'cash',
  run:async(p,k)=>{if(k==='grant'){p.lcGrant={pct:50,until:G.round+1};log(`${p.name} holds a 50% development grant until round ${G.round+1}`)}else await collect(p,40)}},
 {id:'forecast',title:'Market forecast',art:'market_surge',
  t:()=>G.set.events2?`An analyst offers a forecast of the next city event. Pay to see which district it hits and what it does, or take a small dividend.`:`City events are off in this match. Collect a small market dividend.`,
  ask:p=>G.set.events2?[{k:'buy',label:`Buy forecast · ${fmt(20)}`,ok:p.cash>=20,info:'See the next event now (round '+(G.ev2Next||3)+').'},{k:'skip',label:`Dividend · +${fmt(10)}`,info:'Collect a small dividend.'}]:[{k:'skip',label:`Collect ${fmt(30)}`,info:''}],
  ai:p=>'skip',
  run:async(p,k)=>{if(k==='buy'){if(!await pay(p,20,null,'fee'))return;const f=lcForecast();if(!FAST&&!p.ai)await modal({html:`<div class="mh">${LC_ICON('market_pulse',28)} Forecast</div><div class="mtxt">${esc(f)}</div>`,btns:[{k:'x',label:'OK',primary:true}]});log(`${p.name} bought a market forecast`)}else await collect(p,G.set.events2?10:30)}},
 {id:'hold',title:'Planning hold',art:'civic_review_notice',t:()=>`The Planning Office has questions about your paperwork. Your file goes to Civic Review.`,run:async p=>lcEnterReview(p,'card')},
 {classic:true,goojf:true,t:'Bail Pass: clears one Civic Review at once. Keep this card.'},   // 9 Bail Pass (same slot)
 {id:'green',title:'Green initiative',art:'green_development',
  t:()=>`Join the city’s solar-roof programme: pay per street you own for a Rent Shield and a small rent rise, or stay out.`,
  ask:p=>{const n=propsOf(p.id).filter(i=>SQ[i].t==='prop').length,c=Math.min(90,15*n);return[
   {k:'join',label:`Join · ${fmt(c)}`,ok:n>0&&p.cash>=c,info:n?`For 3 rounds: +10% rent on your streets, and falling-rent events can’t cut it.`:'You need at least one street.'},
   {k:'no',label:'Stay out',info:'Nothing changes.'}]},
  ai:p=>{const n=propsOf(p.id).filter(i=>SQ[i].t==='prop').length;return n>=3&&p.cash-Math.min(90,15*n)>=aiReserve(p)?'join':'no'},
  run:async(p,k)=>{if(k!=='join')return;const n=propsOf(p.id).filter(i=>SQ[i].t==='prop').length,c=Math.min(90,15*n);if(!await pay(p,c,null,'fee'))return;G.lcMods.push({pid:p.id,scope:'streets',group:null,pct:10,shield:true,until:G.round+2,src:'green'});log(`${p.name} joins the solar-roof programme until round ${G.round+2}`)}},
 {id:'bond',title:'City infrastructure bond',art:'market_surge',icon:'investment',
  t:()=>`The city sells infrastructure bonds: pay now and collect more when you next reach Start.`,
  ask:p=>[{k:'buy',label:`Buy bond · ${fmt(100)}`,ok:p.cash>=100&&!p.lcBond,info:p.lcBond?'You already hold a bond.':`Collect ${fmt(130)} the next time you pass or land on Start.`},{k:'no',label:'No thanks',info:'Keep your cash.'}],
  ai:p=>!p.lcBond&&p.cash-100>=aiReserve(p)*1.2?'buy':'no',
  run:async(p,k)=>{if(k==='buy'&&!p.lcBond){if(!await pay(p,100,null,'fee'))return;p.lcBond=130;log(`${p.name} bought a city bond`)}}},
 simple('You sponsor new street lights along {traffic}. Pay {m40}.',async p=>pay(p,40,null,'fee'),{id:'lights',title:'Street lights'}),
 null,null,                                                                   // 13,14 keep
 {id:'grid',title:'Smart grid connection',art:'green_development',icon:'power_grid',
  t:()=>`The new smart grid reaches your buildings. Pay per building level for a 3-round rent rise on your developed streets, or skip it.`,
  ask:p=>{const l=lcLevels(p.id),c=15*l;return[{k:'join',label:l?`Connect · ${fmt(c)}`:'No buildings',ok:l>0&&p.cash>=c,info:l?'+10% rent on your developed streets for 3 rounds.':'You have no buildings to connect.'},{k:'no',label:'Skip',info:'Nothing changes.'}]},
  ai:p=>{const l=lcLevels(p.id);return l>=3&&p.cash-15*l>=aiReserve(p)?'join':'no'},
  run:async(p,k)=>{if(k!=='join')return;const c=15*lcLevels(p.id);if(!c||!await pay(p,c,null,'fee'))return;G.lcMods.push({pid:p.id,scope:'built',pct:10,until:G.round+2,src:'grid'});log(`${p.name} connects to the smart grid until round ${G.round+2}`)}}
];
const LC_ESUSU=[
 null,null,
 {id:'buslanes',title:'Bus lanes',art:'city_transit',icon:'transit',
  t:()=>`City Hall asks transit owners to co-fund new bus lanes. Hubs you own earn more for 3 rounds if you join.`,
  ask:p=>{const n=RAILS.filter(j=>G.own[j].o===p.id).length;return[{k:'join',label:`Co-fund · ${fmt(60)}`,ok:n>0&&p.cash>=60,info:n?`+25% rent on your ${n} transit hub${n>1?'s':''} for 3 rounds.`:'You own no transit hubs.'},{k:'no',label:`Decline · +${fmt(15)}`,info:'Collect a consultation fee.'}]},
  ai:p=>{const n=RAILS.filter(j=>G.own[j].o===p.id).length;return n>=2&&p.cash-60>=aiReserve(p)?'join':'no'},
  run:async(p,k)=>{if(k==='join'){if(!await pay(p,60,null,'fee'))return;G.lcMods.push({pid:p.id,scope:'hubs',pct:25,until:G.round+2,src:'buslanes'});log(`${p.name} co-funds bus lanes until round ${G.round+2}`)}else await collect(p,15)}},
 {id:'greenpermit',title:'Green development permit',art:'green_development',icon:'grant',
  t:()=>`A green-building permit is available: 25% off your next building level before the end of next round, or a small rebate now.`,
  ask:p=>[{k:'grant',label:'Take the permit',info:'25% off your next build (expires after next round). Rules unchanged.'},{k:'cash',label:`Rebate · +${fmt(30)}`,info:'Collect now.'}],
  ai:p=>Object.keys(GROUPS).some(g=>ownsAll(p.id,g))?'grant':'cash',
  run:async(p,k)=>{if(k==='grant'){if(!p.lcGrant||p.lcGrant.pct<25)p.lcGrant={pct:25,until:G.round+1}}else await collect(p,30)}},
 null,null,{classic:true,goojf:true,t:'Bail Pass: clears one Civic Review at once. Keep this card.'},   // 4,5 keep · 6 Bail Pass
 {id:'notice',title:'Civic Review notice',art:'civic_review_notice',t:()=>`A neighbour objects to your plans. City Hall opens a Civic Review of your file.`,run:async p=>lcEnterReview(p,'card')},
 null,null,
 {id:'surge',title:'Market surge',art:'market_surge',
  t:()=>`Buyers are queuing for land. Sell one unbuilt, unmortgaged street back to the city for 120% of its price, or hold.`,
  ask:p=>{const c=propsOf(p.id).filter(i=>SQ[i].t==='prop'&&!G.own[i].m&&!G.own[i].h&&!GROUPS[SQ[i].g].some(j=>G.own[j].o===p.id&&G.own[j].h)).sort((a,b)=>SQ[b].p-SQ[a].p);
   return[...c.slice(0,3).map(i=>({k:'s'+i,label:`Sell ${SQ[i].n} · +${fmt(Math.round(SQ[i].p*1.2))}`,info:`Back to the bank, unowned.`})),{k:'hold',label:'Hold',info:'Keep your streets.'}]},
  ai:(p,c)=>{const s=c.filter(x=>x.k[0]==='s');if(!s.length)return'hold';const i=+s[s.length-1].k.slice(1),g=SQ[i].g,mine=GROUPS[g].filter(j=>G.own[j].o===p.id).length;return p.cash<aiReserve(p)&&mine===1?s[s.length-1].k:'hold'},
  run:async(p,k)=>{if(k[0]!=='s')return;const i=+k.slice(1);if(G.own[i].o!==p.id||G.own[i].h||G.own[i].m)return;G.own[i].o=-1;updateCell(i);await collect(p,Math.round(SQ[i].p*1.2));log(`${p.name} sold ${SQ[i].n} to the city`)}},
 {id:'pass',title:'City transit pass',art:'city_transit',icon:'transit',
  t:()=>`Your city transit pass is valid today: ride to a transit hub you own, or take the fare refund.`,
  ask:p=>[...RAILS.filter(j=>G.own[j].o===p.id).map(j=>({k:'h'+j,label:`Ride to ${SQ[j].n}`,info:p.pos+lcSteps(p,j)>=40?'Collect payday at Start.':''})),{k:'refund',label:`Refund · +${fmt(25)}`,info:'Stay here.'}],
  ai:(p,c)=>{const h=c.filter(x=>x.k[0]==='h').find(x=>p.pos+lcSteps(p,+x.k.slice(1))>=40);return h?h.k:'refund'},
  run:async(p,k,d)=>{if(k[0]==='h'){await moveTo(p,+k.slice(1));await land(p,d)}else await collect(p,25)}},
 null,null,null,null
];
function lcCard(deck,idx){const v2=(deck==='chance'?LC_CHANCE:LC_ESUSU)[idx];return v2||{classic:true,...(deck==='chance'?CHANCE:ESUSU)[idx]}}
const lcVal=x=>typeof x==='function'?x():x;
function lcForecast(){if(!G.lcFore)G.lcFore=ev2Pick();const D=EV2_DEFS[G.lcFore],n=G.ev2n||0,r=G.ev2Next||3;let g=D.group;if(g==='fest')g=festGroup();else if(g==='rot')g=EV2_GROUPS[(n+r)%EV2_GROUPS.length];
  const area=D.area||(g?GNAME[g]:'every street'),eff=D.kind==='rent'?`rent ${D.pct>0?'+':''}${D.pct}% on ${area} streets`:`building ${D.pct}% cheaper ${g?'in '+area:'on every street'}`;
  return `${D.name||lcFest()} starts in round ${r}: ${eff}.`}
{const _pk=ev2Pick;ev2Pick=function(){if(lc()&&G.lcFore){const f=G.lcFore;G.lcFore=null;if(EV2_DEFS[f])return f}return _pk.apply(this,arguments)}}
{const _og=onPassGo;onPassGo=function(p){_og.apply(this,arguments);if(lc()&&p.lcBond){const a=p.lcBond;p.lcBond=0;p.cash+=a;float(p.id,a);log(`${p.name}’s city bond pays ${fmt(a)}`)}}}
function lcCardHTML(deck,c,p,choices){const art=c.art?`<img class="lc-art" src="living/cards/${c.art}.webp" width="160" height="160" alt="" aria-hidden="true" decoding="async">`:'';
  return `<div class="lc-card ${deck}">${art}<div class="lc-cbody"><small>${deck==='chance'?'LUCKY BREAK':'CITY HALL'}</small><b>${c.icon?LC_ICON(c.icon,22):''}${esc(lcVal(c.title)||'')}</b><p>${esc(loc(lcVal(c.t)))}</p>
   ${choices?`<ul class="lc-ch">${choices.map(x=>`<li class="${x.ok===false?'off':''}"><b>${esc(x.label)}</b>${x.info?`<span>${esc(x.info)}</span>`:''}</li>`).join('')}</ul>`:''}${p.ai&&choices?`<em>${esc(p.name)} is deciding…</em>`:''}</div></div>`}
{const _dc=drawCard;drawCard=async function(p,deck,d){if(!lc())return _dc.apply(this,arguments);
  const idx=G[deck].shift();let c=lcCard(deck,idx);
  if(c.goojf)p.goojf.push({deck,idx});else G[deck].push(idx);
  if(c.classic){log(`${p.name} drew: ${loc(c.t)}`);if(!FAST){sfx('card');await _cardShow(p,deck,c,null)}if(!c.goojf)await c.f(p,d);return}
  if(!c.ask){log(`${p.name} drew: ${lcVal(c.title)||loc(lcVal(c.t))}`);if(!FAST){sfx('card');await _cardShow(p,deck,c,null)}await (c.run||c.f)(p,d);return}
  const ch=c.ask(p),ok=ch.filter(x=>x.ok!==false);let k;
  if(p.ai||FAST){k=c.ai(p,ok);if(!ok.some(x=>x.k===k))k=ok[ok.length-1].k;if(!FAST){sfx('card');await _cardShow(p,deck,c,ch,k)}}
  else{sfx('card');k=await _cardShow(p,deck,c,ch)}
  const pick=ch.find(x=>x.k===k);log(`${p.name} drew ${lcVal(c.title)} and chose: ${pick?pick.label:k}`);
  G.lcCardStats=G.lcCardStats||{};const key=c.id+':'+k;G.lcCardStats[key]=(G.lcCardStats[key]||0)+1;
  await c.run(p,k,d)}}
async function _cardShow(p,deck,c,ch,aiPick){
  if(!ch||p.ai)return modal({cls:'lc-cardm',html:lcCardHTML(deck,c.classic?{title:deck==='chance'?'Lucky Break':'City Hall',t:c.t}:c,p,ch),btns:[{k:'ok',label:p.ai?(aiPick?`${esc(p.name)}: ${esc(ch.find(x=>x.k===aiPick).label)}`:`${esc(p.name)} reads the card…`):'OK',primary:!p.ai,disabled:p.ai}],auto:p.ai?2600:0,tdef:p.ai?undefined:'ok'});
  const ok=ch.filter(x=>x.ok!==false);
  return modal({cls:'lc-cardm',html:lcCardHTML(deck,c,p,ch),btns:ch.map((x,j)=>({k:x.k,label:esc(x.label),primary:j===0&&x.ok!==false,disabled:x.ok===false})),tdef:ok[ok.length-1].k})}
LC_VALID.push(g=>{const okMod=m=>m&&Number.isInteger(m.pid)&&m.pid>=0&&m.pid<g.players.length&&['hubs','streets','built'].includes(m.scope)&&Number.isInteger(m.pct)&&Math.abs(m.pct)<=50&&Number.isInteger(m.until);
  if(g.lcMods!=null&&!(Array.isArray(g.lcMods)&&g.lcMods.length<=64&&g.lcMods.every(okMod)))return false;
  if(g.lcFore!=null&&!EV2_DEFS[g.lcFore])return false;
  return g.players.every(p=>(p.lcBond==null||p.lcBond===0||p.lcBond===130)&&(p.lcGrant==null||p.lcGrant&&[25,50].includes(p.lcGrant.pct)&&Number.isInteger(p.lcGrant.until)))});
{const _ng2=newGame;newGame=function(cfg){_ng2(cfg);if(lc()){G.lcMods=[]}}}
// prune expired programmes each round so saves stay small
{const _a=advanceTurn;advanceTurn=function(){_a();if(lc()&&G.lcMods)G.lcMods=G.lcMods.filter(m=>m.until>=G.round)}}
{const st=document.createElement('style');st.textContent=`
.lc-ic{display:inline-block;vertical-align:-4px;margin-right:6px;object-fit:contain}
#ev2chip .lc-ic{width:20px;height:20px}.ev2ban .lc-ic{width:32px;height:32px;vertical-align:-8px}
html.lc-on.flat #ev2chip{max-width:clamp(96px,calc(50vw - 50vh - 72px),200px)!important;padding:5px 10px!important}html.lc-on.flat #ev2chip b{font-size:11.5px!important}html.lc-on.flat #ev2chip span{font-size:11px!important;-webkit-line-clamp:2!important}
.mc.lc-ev{box-shadow:inset 0 0 0 3px #f4d28b,0 0 10px #f4d28b88!important}
.lc-rl{display:grid;gap:8px;margin-top:6px}.lc-r{display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:start}.lc-r small{display:block;opacity:.85;font-size:12px;line-height:1.35}
.lc-setup b .lc-ic{vertical-align:-5px}
.lc-cardm .mp{max-width:min(620px,94vw)}
.lc-card{display:grid;grid-template-columns:clamp(84px,22vh,150px) minmax(0,1fr);gap:12px;align-items:start}
.lc-card .lc-art{width:100%;height:auto;aspect-ratio:1;border-radius:14px;background:#0b2131;object-fit:cover}
.lc-cbody small{display:block;font-size:10px;letter-spacing:.12em;opacity:.7;font-weight:800}.lc-cbody>b{display:block;font-size:17px;margin:2px 0 4px}
.lc-cbody p{margin:0 0 6px;font-size:13px;line-height:1.35}.lc-ch li{display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:baseline}.lc-ch li b::after{content:' ·'}.lc-cbody em{font-size:12px;opacity:.8}
.lc-ch{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:12px}.lc-ch li b{display:block}.lc-ch li span{opacity:.8}.lc-ch li.off{opacity:.5}
.lc-cardm .mbar{flex-wrap:wrap}.lc-cardm .mbar .btn{min-height:44px;flex:1 1 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2}
.lc-cardm .mbar .btn small{display:block;font-size:10.5px;font-weight:600;opacity:.85;margin-top:2px;white-space:normal}
.lc-crtag{background:#e2b13c!important;color:#10283b!important}.lc-cr{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:start}.lc-crm .mbar{flex-wrap:wrap}.lc-crm .mbar .btn{min-height:44px;flex:1 1 150px}
@media (max-height:420px){.lc-cr{grid-template-columns:40px 1fr}.lc-cr .lc-ic{width:40px;height:40px}.lc-crm .lc-ch{font-size:11px}}
.lc-dev{width:100%;border-collapse:collapse;font-size:12px}.lc-dev th{text-align:left;font-size:10.5px;opacity:.7}.lc-dev td{padding:2px 3px;white-space:nowrap;font-size:11px}html.lc-on .pfm-pips i:nth-child(4){display:none}.lc-dev .lc-stg{width:24px;height:24px;vertical-align:middle;margin-right:5px;border-radius:5px}
.lc-dev tr.lc-now td{background:#e2b13c22;font-weight:800}.lc-dev small{opacity:.7;font-size:10px}.lc-devnote{font-size:10.5px;opacity:.75;margin-top:4px}
.lc-sky .lc-stg{width:1.2em;height:1.2em;vertical-align:middle}[data-quick-build] .lc-stg{width:22px;height:22px;vertical-align:-6px;margin-right:4px;border-radius:4px}
.mc.lc-lm{box-shadow:inset 0 0 0 2px #e2b13c}.mc .lc-lmb{position:absolute;right:1px;top:1px;width:14px;height:14px;pointer-events:none}.lc-lmline{font-size:11px;margin:4px 0;display:flex;align-items:center;gap:2px}.lc-lmline .lc-ic{width:18px;height:18px}
.mc .lc-cic{width:1.9em;height:1.9em;max-width:80%;object-fit:contain}.lc-lmm .mbar{flex-wrap:wrap}.lc-lmm .mbar .btn{min-height:44px;flex:1 1 160px}
html.light .mc.lc-ev{box-shadow:inset 0 0 0 3px #b45309,0 0 8px #b4530966!important}
html.light .mc.lc-lm{box-shadow:inset 0 0 0 2px #8a6100}
html.light .lc-dev tr.lc-now td{background:#f5e3b0}
html.light .lc-crtag{background:#8a6100!important;color:#fff!important}
html.light .lc-ch li span,html.light .lc-cbody p{color:#1d3046}
html.light .lc-card .lc-art{background:#e9eef5}
html.light .lc-lmline.muted{color:#3c4f63}
@media (max-height:420px){.lc-card{grid-template-columns:84px minmax(0,1fr)}.lc-cbody p{font-size:12px;margin-bottom:4px}.lc-cbody>b{font-size:15px}.lc-ch{font-size:11px;gap:2px}}`;document.head.append(st)}

/* ---------- Task 03 · Civic Review (replaces the Lockup in V2 matches) ---------- */
// Triggers (city-planning causes, not dice): a Planning hold / Civic Review notice card, a development audit when a
// player adds 3+ building levels in one turn, and the Police Check corner (until Task 06 gives it a new role).
// Three doubles in V2 is "gridlock": you stay put and the turn ends, with no detention.
// Under review: you collect NO rent. At the start of your next turn choose exactly one:
//   Fast-Track Permit (pay LC_PERMIT, then play normally) · Bail Pass (consume one held pass, play normally) ·
//   Standard Review (skip this whole turn; review ends at the end of it). The token is never moved.
const LC_PERMIT=70,LC_AUDIT=4;
const lcUnder=p=>!!(lc()&&p&&p.cr&&!p.bankrupt);
lcEnterReview=async function(p,why){if(!lc()||p.bankrupt)return sendToJail(p);if(p.cr)return;
  p.cr={from:G.round,why:String(why||'card').slice(0,12)};G.lcStats=G.lcStats||{};G.lcStats['cr_'+p.cr.why]=(G.lcStats['cr_'+p.cr.why]||0)+1;
  log(`${p.name} is under Civic Review (${why==='audit'?'development audit':why==='inspect'?'planning inspection':'planning hold'}). No rent until it is resolved.`);
  if(!FAST){sfx('jail');toast(`${p.name}: Civic Review opened`)}renderRoster()};
// sendToJail in V2: three doubles = gridlock (no detention). Other legacy callers open a review instead.
{const _sj=sendToJail;sendToJail=async function(p){if(!lc())return _sj.apply(this,arguments);
  if(G.turn===p.id&&(G.doubles||0)>=3){G.lcStats=G.lcStats||{};G.lcStats.gridlock=(G.lcStats.gridlock||0)+1;log(`${p.name} hits gridlock after three doubles. Turn over.`);if(!FAST)toast('Gridlock! Your turn ends');return}
  return lcEnterReview(p,'inspect')}}
// no rent while the owner is under review
{const _ld=land;land=async function(p,d,o2){if(lc()){const i=p.pos;if(buyable(i)){const o=G.own[i];if(o.o>=0&&o.o!==p.id&&!o.m&&lcUnder(P(o.o))){G.lcStats=G.lcStats||{};G.lcStats.crRentSaved=(G.lcStats.crRentSaved||0)+rentFor(i,d[0]+d[1],o2||{});
    if(!FAST)toast(`${P(o.o).name} is under Civic Review. No rent today.`);log(`${p.name} owes no rent: ${P(o.o).name} is under Civic Review`);renderRoster();return}}
   if(SQ[i].t==='gojail'&&!LC_CORNERS_ON()){await lcEnterReview(p,'inspect');renderRoster();return}}
  return _ld.apply(this,arguments)}}
let LC_CORNERS_ON=()=>false;                       // Task 06 gives the corner its own role
function lcAiReview(p){const earning=propsOf(p.id).filter(i=>!G.own[i].m&&(G.own[i].h>0||SQ[i].t!=='prop'||ownsAll(p.id,SQ[i].g))).length;
  if(p.goojf.length&&earning>=1)return'pass';if(earning>=2&&p.cash-LC_PERMIT>=aiReserve(p))return'permit';return'standard'}
async function lcReviewTurn(p){const can=p.cash>=LC_PERMIT;let k;
  if(p.ai||FAST){k=lcAiReview(p);if(k==='permit'&&!can)k='standard';if(k==='pass'&&!p.goojf.length)k='standard'}
  else{k=await modal({cls:'lc-crm',html:`<div class="lc-cr">${LC_ICON('civic_review',48)}<div><div class="mh">Civic Review</div><p class="mtxt">${esc(p.name)}, your file is under review since round ${p.cr.from}. While it is open you collect <b>no rent</b>. Choose one:</p>
     <ul class="lc-ch"><li><b>Fast-Track Permit · ${fmt(LC_PERMIT)}</b><span>Pay now, review closes, play this turn normally.${can?'':' (Not enough cash.)'}</span></li><li><b>Bail Pass</b><span>${p.goojf.length?'Use 1 of your '+p.goojf.length+' Bail Pass'+(p.goojf.length>1?'es':'')+'. Review closes, play normally.':'You hold no Bail Pass.'}</span></li><li><b>Standard Review</b><span>Skip this whole turn (no roll, no building or trades). The review closes at the end of it.</span></li></ul></div></div>`,
     btns:[{k:'permit',label:`Fast-Track · ${fmt(LC_PERMIT)}`,primary:can,disabled:!can},{k:'pass',label:'Use Bail Pass',disabled:!p.goojf.length},{k:'standard',label:'Standard Review',primary:!can}],tdef:'standard'})}
  G.lcStats=G.lcStats||{};G.lcStats['crx_'+k]=(G.lcStats['crx_'+k]||0)+1;
  if(k==='permit'){if(!await pay(p,LC_PERMIT,null,'fee'))return'out';p.cr=null;log(`${p.name} paid for a Fast-Track Permit`);renderRoster();return'play'}
  if(k==='pass'){const c=p.goojf.pop();G[c.deck].push(c.idx);p.cr=null;log(`${p.name} used a Bail Pass to close the review`);renderRoster();return'play'}
  log(`${p.name} completes a Standard Review and skips this turn`);if(!FAST)toast(`${p.name}: Standard Review, turn skipped`);p.cr=null;renderRoster();return'skip'}
// Development audit: count building levels added this turn by the player whose turn it is.
{const _b=build;build=function(pid,i){const r=_b.apply(this,arguments);if(lc()&&pid===G.turn){const t=G.lcTurnBuilt||(G.lcTurnBuilt={pid,n:0});if(t.pid!==pid){t.pid=pid;t.n=0}t.n++;
   if(t.n===LC_AUDIT-1&&!P(pid).ai&&!FAST)toast(`One more building level this turn triggers a Civic Review (development audit)`);if(t.n===LC_AUDIT&&!FAST)toast(`Development audit: a Civic Review opens at the end of your turn`)}return r}}
{const _cb=canBuild;canBuild=function(pid,i){const ok=_cb.apply(this,arguments);if(!ok||!lc())return ok;const p=P(pid),t=G.lcTurnBuilt;
   if(p.ai&&pid===G.turn&&t&&t.pid===pid&&t.n>=LC_AUDIT-1&&!p.cr&&p.cash<aiReserve(p)*2.5)return false;return ok}}
{const _pt=playTurn;playTurn=async function(p){if(!lc())return _pt.apply(this,arguments);
  if(G.phase!=='post')G.lcTurnBuilt={pid:p.id,n:0};
  if(p.cr&&G.phase!=='post'){G.phase='busy';const r=await lcReviewTurn(p);if(r!=='play'){G.phase='busy';return}}
  await _pt.apply(this,arguments);
  const t=G.lcTurnBuilt;if(!p.bankrupt&&!G.over&&t&&t.pid===p.id&&t.n>=LC_AUDIT&&!p.cr)await lcEnterReview(p,'audit');G.lcTurnBuilt=null}}
{const _bk=bankrupt;bankrupt=function(p,to){if(lc())p.cr=null;return _bk.apply(this,arguments)}}
{const _rr=renderRoster;renderRoster=function(){const r=_rr.apply(this,arguments);try{if(lc()&&!FAST)for(const p of G.players){const pn=document.querySelector('#pc'+p.id+' .pn');if(!pn)continue;let t=pn.querySelector('.lc-crtag');
   if(lcUnder(p)&&!t){t=el('span','tag lc-crtag','Review');t.title='Civic Review: no rent until resolved';pn.append(t)}else if(!lcUnder(p)&&t)t.remove()}}catch(e){}return r}}
LC_VALID.push(g=>g.players.every(p=>!p.inJail&&(p.cr==null||p.cr&&Number.isInteger(p.cr.from)&&p.cr.from>=1&&p.cr.from<=g.round&&typeof p.cr.why==='string'&&p.cr.why.length<=12))&&(g.lcTurnBuilt==null||Number.isInteger(g.lcTurnBuilt.n)));
LC_RULES.push(['civic_review','Civic Review','Replaces the Lockup. Opened by a Planning hold card, a planning inspection, or a development audit (4+ building levels in one turn). While under review you collect no rent. At your next turn: pay a Fast-Track Permit, use a Bail Pass, or take a Standard Review (skip that turn). Three doubles cause gridlock: your turn simply ends.']);


/* ---------- Task 04 · Skyline Development (Plot → Low-rise → Mid-rise → High-rise → Skyscraper) ---------- */
// Explicit stage mapping on the existing numeric slot (so 3D models, saves and bank counters stay valid):
//   G.own[i].h  0 Plot · 1 Low-rise · 2 Mid-rise · 3 High-rise · 5 Skyscraper   (4 is never used in V2)
// Differences from four houses + tower:
//   • costs rise by stage (0.8× / 1.0× / 1.2× / 2.0× the street's build price) — same 5.0× total to the top;
//   • High-rise rent is 10% above the classic three-house rent; there is no four-house step;
//   • High-rise and Skyscraper are resilient: falling-rent events (e.g. Quiet Market) do not cut their rent;
//   • only a district's designated Landmark can rise to Skyscraper (Task 05);
//   • selling refunds half of that stage's price; bank permits: Low/Mid/High use 1 home permit, a Skyscraper
//     uses 1 tower permit and returns its 3 home permits (selling it needs 3 home permits back).
const LC_STAGES=[{k:'plot',n:'Plot',m:0},{k:'low_rise',n:'Low-rise',m:.8},{k:'mid_rise',n:'Mid-rise',m:1},{k:'high_rise',n:'High-rise',m:1.2},null,{k:'skyscraper',n:'Skyscraper',m:2}];
const lcNextH=h=>h===3?5:h+1, lcPrevH=h=>h===5?3:h-1;
let lcSwap=null;const lcH0=i=>lcSwap&&lcSwap.i===i?lcSwap.h0:SQ[i].h;
const lcCostAt=(i,h)=>Math.round(lcH0(i)*LC_STAGES[h].m/5)*5;           // price of the stage that results in level h
function lcStageCost(i){const h=G.own[i].h;return h>=5?0:lcCostAt(i,lcNextH(h))}
let lcCanSky=i=>true;                                                   // Task 05: Landmark only
const lcStageRent=(i,h)=>{const r=SQ[i].r;return h===3?Math.round(r[3]*1.1):h===5?r[5]:r[h]};
function lcWithCost(i,c,fn){if(lcSwap)return fn();const h0=SQ[i].h;lcSwap={i,h0};SQ[i].h=c;try{return fn()}finally{SQ[i].h=h0;lcSwap=null}}
{const _dc=devCost;devCost=function(pid,i){if(!lc()||SQ[i].t!=='prop')return _dc.apply(this,arguments);const c=lcStageCost(i);return lcWithCost(i,c,()=>_dc(pid,i))}}
{const _cb=canBuild;canBuild=function(pid,i){if(!lc()||SQ[i].t!=='prop')return _cb.apply(this,arguments);const o=G.own[i];if(o.h>=5)return false;
  if(o.h===3&&(!lcCanSky(i)||G.hotels<1))return false;
  const c=lcStageCost(i);if(o.h===3){const hs=G.houses;G.houses=Math.max(1,hs);try{return lcWithCost(i,c,()=>_cb(pid,i))}finally{G.houses=hs}}return lcWithCost(i,c,()=>_cb(pid,i))}}
{const _b=build;build=function(pid,i){if(!lc()||SQ[i].t!=='prop')return _b.apply(this,arguments);const o=G.own[i],h0=o.h,c=lcStageCost(i);
  const r=lcWithCost(i,c,()=>_b(pid,i));
  if(h0===3&&o.h===4){o.h=5;G.houses+=4;G.hotels--;updateCell(i,true)}
  G.lcStats=G.lcStats||{};G.lcStats['st_'+o.h]=(G.lcStats['st_'+o.h]||0)+1;if(!FAST&&!P(pid).ai)toast(`${SQ[i].n}: ${LC_STAGES[o.h].n}`);return r}}
{const _cs=canSell;canSell=function(pid,i){if(!lc()||SQ[i].t!=='prop')return _cs.apply(this,arguments);const o=G.own[i];if(o.h!==5)return _cs(pid,i);
  const hs=G.houses;G.houses=hs>=3?Math.max(4,hs):0;try{return _cs(pid,i)}finally{G.houses=hs}}}
{const _sl=sell;sell=function(pid,i){if(!lc()||SQ[i].t!=='prop')return _sl.apply(this,arguments);const o=G.own[i],h=o.h,back=Math.round(lcCostAt(i,h)/2);
  P(pid).cash+=back;if(h===5){G.hotels++;G.houses-=3}else G.houses++;o.h=lcPrevH(h);updateCell(i);float(pid,back)}}
// Rent: stage table above; resilience = falling-rent events never reduce High-rise or Skyscraper rent.
{const _rp=lcRentPct;lcRentPct=function(i){let t=_rp(i);const h=G.own[i].h;if((h===3||h===5)&&typeof ev2RentPct==='function'&&ev2RentPct(i)<0)t-=ev2RentPct(i);return Math.max(LC_CAP[0],Math.min(LC_CAP[1],t))}}
{const _rf=rentFor;rentFor=function(i,dsum,o2){const r=_rf.apply(this,arguments);if(!lc()||SQ[i].t!=='prop'||G.own[i].h!==3||!r)return r;return Math.round(r*1.1)}}
// Bankruptcy refunds use V2 stage prices (half of everything paid), permits return correctly.
{const _bk=bankrupt;bankrupt=function(p,to){if(lc()){let adj=0;for(const i of propsOf(p.id)){const h=G.own[i].h;if(!h||SQ[i].t!=='prop')continue;let paid=0;for(let k=h;k>0;k=lcPrevH(k))paid+=lcCostAt(i,k);adj+=Math.round(paid/2)-h*SQ[i].h/2}if(to&&adj)to.cash+=adj}return _bk.apply(this,arguments)}}
const lcStageImg=(h,size=40)=>`<img class="lc-stg" src="living/buildings/${size>48?256:128}/${LC_STAGES[h].k}.${size>48?'webp':'png'}" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async">`;
{const _dh=deedHTML;deedHTML=function(i){const h=_dh(i);if(!lc()||SQ[i].t!=='prop')return h;const s=SQ[i],cur=G&&G.own[i]?G.own[i].h:0;
  const rows=[0,1,2,3,5].map(k=>`<tr class="${k===cur?'lc-now':''}"><td>${lcStageImg(k,28)}${LC_STAGES[k].n}${k===5?' <small>Landmark only</small>':''}</td><td>${k?fmt(lcCostAt(i,k)):'—'}</td><td>${fmt(k?lcStageRent(i,k):s.r[0])}</td></tr>`).join('');
  return h.replace(/(Owned by [^<]*?·\s*)(\d houses?|tower|Skyline Tower)/,(m,a)=>a+(LC_STAGES[cur]?LC_STAGES[cur].n:'')).replace(/<table[\s\S]*?<\/table>/,`<table class="lc-dev"><tr><th>Stage</th><th>Build</th><th>Rent</th></tr>${rows}</table><div class="lc-devnote">High-rise and Skyscraper ignore falling-rent events. Selling refunds half the stage price.</div>`)}}
// 2D board / map: stage pips (1–3) and a skyscraper marker
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);if(!lc()||SQ[i].t!=='prop'||G.own[i].h!==5)return h;return h.replace(/<span class="hs ht">[^<]*<\/span>/,`<span class="hs ht lc-sky">${lcStageImg(5,14)}</span>`)}}
// Portfolio: build buttons and level labels show stages and the real V2 cost/rent.
function lcPortfolioFix(root){document.documentElement.classList.toggle('lc-on',lc());if(!lc())return;
  root.querySelectorAll('.pfm-row[data-square] .pfm-acts button').forEach(b=>{if(b.dataset.quickBuild==null&&/^Build (house|tower)/.test(b.textContent))b.dataset.lcBuild=b.closest('.pfm-row').dataset.square});
  root.querySelectorAll('[data-quick-build],[data-lc-build]').forEach(b=>{const i=+(b.dataset.quickBuild??b.dataset.lcBuild),o=G.own[i];if(!o||o.h>=5)return;const nh=lcNextH(o.h),lbl=`Build ${LC_STAGES[nh].n}`;
   const html=`${lcStageImg(nh,22)}${lbl}<small>${fmt(devCost(G.turn,i))} · rent → ${fmt(lcStageRent(i,nh))}${nh===5&&!lcCanSky(i)?' · Landmark only':''}</small>`;if(b.dataset.lcl!==html){b.dataset.lcl=html;b.innerHTML=html;b.setAttribute('aria-label',lbl);b.title=lbl}});
  root.querySelectorAll('.pfm-row[data-square]').forEach(r=>{const i=+r.dataset.square,o=G.own[i];if(!o||SQ[i].t!=='prop')return;if(o.h){const sb=[...r.querySelectorAll('.pfm-acts button')].find(b=>/^Sell/.test(b.textContent)),sm2=sb&&sb.querySelector('small'),v='+'+fmt(Math.round(lcCostAt(i,o.h)/2));if(sm2&&sm2.textContent!==v)sm2.textContent=v}const sm=r.querySelector('.pfm-info small');if(sm&&!sm.dataset.lc){sm.innerHTML=sm.innerHTML.replace(/Skyline Tower|\d houses?|No buildings/,LC_STAGES[o.h]?LC_STAGES[o.h].n:'');sm.dataset.lc=1}})}
new MutationObserver(()=>{if(G&&lc()){const m=$('#modals');if(m)lcPortfolioFix(m)}}).observe(document.getElementById('modals')||document.body,{childList:true,subtree:true});
LC_VALID.push(g=>{let hs=0,tw=0;for(let i=0;i<40;i++){const h=g.own[i].h;if(h===4)return false;if(h===5)tw++;else hs+=h}return hs+g.houses===36&&tw+g.hotels===12});
LC_RULES.push(['district_growth','Skyline Development','Streets grow Plot → Low-rise → Mid-rise → High-rise → Skyscraper. Each stage costs more (0.8×, 1×, 1.2×, 2× the build price). High-rise rent is 10% above the classic three-house rent, and High-rise and Skyscraper ignore falling-rent events. Only a district’s Landmark can become a Skyscraper. Selling refunds half the stage price.']);


/* ---------- Task 05 · District Growth and one Landmark per district ---------- */
// Replaces the classic blanket rule (a full colour set doubles every unbuilt street's rent) in V2 matches:
//   District Growth: owning 2+ streets of a district gives those streets +15% rent (counted in the −25…+50% cap).
//   Landmark: once you own the whole district, you may designate ONE street (fee: 25% of its price, match cash).
//     The Landmark keeps double rent while unbuilt, earns +20% at every stage (in the cap), and is the only street
//     in the district that can rise to Skyscraper.
//   A Landmark is tied to its owner and to whole-district ownership. When ownership of the district breaks
//   (trade, bankruptcy, a city sale) the designation is removed; a new owner of the whole district may designate again.
const LC_LM_FEE=.25,LC_GROWTH=15,LC_LM_PCT=20;
const lcLM=()=>G.lm||(G.lm={});
function lcLandmarkAt(i){if(!lc()||SQ[i].t!=='prop')return false;const L=G.lm&&G.lm[SQ[i].g];return !!(L&&L.i===i&&G.own[i].o===L.pid&&ownsAll(L.pid,SQ[i].g))}
function lcSyncLandmarks(){if(!lc()||!G.lm)return;for(const g of Object.keys(G.lm)){const L=G.lm[g];if(!GROUPS[g]||!ownsAll(L.pid,g)||G.own[L.i].o!==L.pid||P(L.pid).bankrupt){delete G.lm[g];log(`${SQ[L.i].n} is no longer a Landmark: district ownership changed`)}}}
lcCanSky=i=>lcLandmarkAt(i);
const lcEligibleDistricts=pid=>Object.keys(GROUPS).filter(g=>ownsAll(pid,g)&&!lcLM()[g]&&GROUPS[g].some(i=>!G.own[i].m));
const lcLmFee=i=>Math.round(SQ[i].p*LC_LM_FEE/5)*5;
function lcDesignate(pid,i){const g=SQ[i].g,p=P(pid),fee=lcLmFee(i);if(!lc()||!ownsAll(pid,g)||lcLM()[g]||G.own[i].m||p.cash<fee)return false;
  p.cash-=fee;float(pid,-fee);G.lm[g]={i,pid};G.lcStats=G.lcStats||{};G.lcStats.landmarks=(G.lcStats.landmarks||0)+1;log(`${p.name} made ${SQ[i].n} the Landmark of ${GNAME[g]} (${fmt(fee)})`);if(!FAST)toast(`${SQ[i].n} is now a Landmark`);updateCell(i);renderRoster();return true}
LC_EXTRA_PCT.push(i=>{if(SQ[i].t!=='prop')return 0;const o=G.own[i];if(o.o<0)return 0;let t=0;const n=GROUPS[SQ[i].g].filter(j=>G.own[j].o===o.o).length;if(n>=2)t+=LC_GROWTH;if(lcLandmarkAt(i))t+=LC_LM_PCT;return t});
// remove the blanket full-set doubling; keep double unbuilt rent only on the Landmark
{const _rf=rentFor;rentFor=function(i,dsum,o2){const r=_rf.apply(this,arguments);if(!lc()||SQ[i].t!=='prop'||!r)return r;const o=G.own[i];
  if(o.h===0&&ownsAll(o.o,SQ[i].g)&&!lcLandmarkAt(i))return Math.round(r/2);return r}}
const lcAiPickLM=(p,g)=>GROUPS[g].filter(i=>!G.own[i].m).sort((a,b)=>SQ[b].r[5]-SQ[a].r[5])[0];
async function lcOfferLandmarks(p){for(const g of lcEligibleDistricts(p.id)){
  if(p.ai||FAST){const i=lcAiPickLM(p,g);if(i!=null&&p.cash-lcLmFee(i)>=aiReserve(p)*.5)lcDesignate(p.id,i);continue}
  const ask=(G.lmAsked||(G.lmAsked={}));if(ask[p.id+':'+g]!=null&&G.round-ask[p.id+':'+g]<3)continue;ask[p.id+':'+g]=G.round;
  const opts=GROUPS[g].filter(i=>!G.own[i].m);
  const k=await modal({cls:'lc-lmm',html:`<div class="lc-cr">${LC_ICON('landmark',48)}<div><div class="mh">Choose a Landmark · ${esc(GNAME[g])}</div><p class="mtxt">You own the whole district. One street can become its Landmark: double rent while unbuilt, +20% rent at every stage, and the only street here that can rise to Skyscraper. Other streets keep District Growth (+15%). Fee: 25% of the street’s price.</p></div></div>`,
    btns:[...opts.map(i=>({k:'i'+i,label:`${esc(SQ[i].n)} · ${fmt(lcLmFee(i))}`,disabled:p.cash<lcLmFee(i)})),{k:'later',label:'Later',primary:false}],tdef:'later'});
  if(k&&k[0]==='i')lcDesignate(p.id,+k.slice(1))}}
{const _ap=aiPostTurn;aiPostTurn=async function(p){if(lc()){lcSyncLandmarks();await lcOfferLandmarks(p)}return _ap.apply(this,arguments)}}
{const _ac=actions;actions=function(text,btns){if(lc()&&G&&!G.over&&btns&&btns.some(b=>b.k==='end')){const p=P(G.turn);if(p&&!p.ai&&lcEligibleDistricts(p.id).length){const ask=G.lmAsked||{};if(lcEligibleDistricts(p.id).some(g=>ask[p.id+':'+g]==null||G.round-ask[p.id+':'+g]>=3))return lcOfferLandmarks(p).then(()=>_ac.call(this,text,btns))}}return _ac.apply(this,arguments)}}
{const _ex=executeTrade;executeTrade=function(t){const r=_ex.apply(this,arguments);try{lcSyncLandmarks()}catch(e){}return r}}
{const _bk=bankrupt;bankrupt=function(p,to){const r=_bk.apply(this,arguments);try{lcSyncLandmarks()}catch(e){}return r}}
{const _a=advanceTurn;advanceTurn=function(){_a();try{lcSyncLandmarks()}catch(e){}}}
// presentation: badge on the board cell and the property card
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);return lcLandmarkAt(i)?h.replace('<div class="mc','<div class="mc lc-lm').replace(/<\/div>$/,`<img class="lc-lmb" src="living/icons/64/landmark.png" alt="Landmark" width="14" height="14"></div>`):h}}
{const _dh=deedHTML;deedHTML=function(i){const h=_dh(i);if(!lc()||SQ[i].t!=='prop')return h;const g=SQ[i].g,L=G.lm&&G.lm[g];
  const line=lcLandmarkAt(i)?`<div class="lc-lmline">${LC_ICON('landmark',18)}Landmark of ${esc(GNAME[g])}: +20% rent, Skyscraper allowed</div>`:L?`<div class="lc-lmline muted">${esc(SQ[L.i].n)} is this district’s Landmark</div>`:`<div class="lc-lmline muted">${LC_ICON('district_growth',18)}District Growth: own 2+ streets here for +15% rent</div>`;
  return h.replace('<div class="own">',line+'<div class="own">')}}
{const _fd=flatDraw;let last='';flatDraw=function(){const k=lc()?JSON.stringify(G.lm||{}):'';if(k!==last){last=k;const H=$('#flatbd');if(H)H.dataset.sig=''}return _fd.apply(this,arguments)}}
LC_VALID.push(g=>{const L=g.lm;if(L==null)return true;if(typeof L!=='object'||Array.isArray(L))return false;return Object.entries(L).every(([k,v])=>GROUPS[k]&&v&&GROUPS[k].includes(v.i)&&Number.isInteger(v.pid)&&v.pid>=0&&v.pid<g.players.length)});
LC_RULES.push(['landmark','District Growth & Landmarks','No automatic double rent for a full colour set. Owning 2+ streets in a district gives them +15% rent. Own the whole district to name one Landmark (fee 25% of its price): double rent while unbuilt, +20% rent, and the only street that can become a Skyscraper. Selling or trading away part of the district removes the Landmark. All city rent changes together are capped at +50%.']);


/* ---------- Task 06 · Original corner functions (V2 only; positions and economy of the 40 spaces unchanged) ---------- */
// 0  Skyline HQ        passing pays payday as before; LANDING exactly lets you choose +50% payday or a 25% development grant.
// 10 Planning Office   visiting square (Civic Review never moves tokens); landing offers a Pre-approval (pay 40):
//                      the next Civic Review trigger against you is cancelled (one use).
// 20 Transit Exchange  landing lets you pay a 20 fare to ride to any transit hub (normal rent/buy applies there).
// 30 Investment Forum  no detention: buy one unowned street anywhere at its price +10%, or take a 25 stipend.
const LC_CORNER={0:['Skyline HQ','city_cash'],10:['Planning Office','planning_hold'],20:['Transit Exchange','transit'],30:['Investment Forum','investment']};
LC_CORNERS_ON=()=>true;
const LC_SQ0={0:SQ[0].n,30:SQ[30].n};
{const _bb=buildBoard;buildBoard=function(...a){if(lc())for(const k in LC_CORNER)SQ[k].n=LC_CORNER[k][0];else{SQ[0].n=LC_SQ0[0];SQ[30].n=LC_SQ0[30];if(CITY){if(CITY.jail)SQ[10].n=CITY.jail;if(CITY.free)SQ[20].n=CITY.free}}return _bb.apply(this,a)}}
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);if(!lc()||!LC_CORNER[i])return h;return h.replace(/<span class="ic">[^<]*<\/span>/,`<span class="ic"><img class="lc-cic" src="living/icons/64/${LC_CORNER[i][1]}.png" alt="" width="24" height="24"></span>`)}}
async function lcChoose(p,icon,title,text,choices,aiK){const ok=choices.filter(c=>c.ok!==false);if(p.ai||FAST){let k=aiK();if(!ok.some(c=>c.k===k))k=ok[ok.length-1].k;return k}
  return modal({cls:'lc-crm',html:`<div class="lc-cr">${LC_ICON(icon,48)}<div><div class="mh">${esc(title)}</div><p class="mtxt">${esc(text)}</p><ul class="lc-ch">${choices.map(c=>`<li class="${c.ok===false?'off':''}"><b>${esc(c.label)}</b><span>${esc(c.info||'')}</span></li>`).join('')}</ul></div></div>`,
   btns:choices.map((c,j)=>({k:c.k,label:esc(c.label),primary:j===0&&c.ok!==false,disabled:c.ok===false})),tdef:ok[ok.length-1].k})}
const lcStat=k=>{G.lcStats=G.lcStats||{};G.lcStats[k]=(G.lcStats[k]||0)+1};
async function lcCorner(p,d){const i=p.pos;
  if(i===0){const pd=payday(p),half=Math.round(pd/2);const k=await lcChoose(p,'city_cash','Skyline HQ','You stopped at Skyline HQ. Pick a head-office bonus.',[{k:'cash',label:`Bonus payday · +${fmt(half)}`,info:'Half a payday on top of the payday you just collected.'},{k:'grant',label:'Development grant (25%)',info:'25% off your next building level, before the end of next round.'}],()=>Object.keys(GROUPS).some(g=>ownsAll(p.id,g))?'grant':'cash');
   lcStat('hq_'+k);if(k==='grant'){if(!p.lcGrant||p.lcGrant.pct<25)p.lcGrant={pct:25,until:G.round+1};log(`${p.name} takes an HQ development grant`)}else await collect(p,half);return}
  if(i===10){if(p.lcPre)return;const k=await lcChoose(p,'planning_hold','Planning Office','The permit desk offers a Pre-approval: the next Civic Review opened against you is cancelled.',[{k:'pre',label:`Pre-approval · ${fmt(40)}`,ok:p.cash>=40,info:'One use. Keeps your rent flowing.'},{k:'no',label:'Just visiting',info:'Nothing changes.'}],()=>p.cash-40>=aiReserve(p)*1.5&&propsOf(p.id).length>=4?'pre':'no');
   lcStat('po_'+k);if(k==='pre'&&await pay(p,40,null,'fee')){p.lcPre=true;log(`${p.name} holds a planning Pre-approval`)}return}
  if(i===20){const opts=RAILS.map(j=>({j,steps:(j-p.pos+40)%40})).sort((a,b)=>a.steps-b.steps);
   const k=await lcChoose(p,'transit','Transit Exchange','Pay a fare to ride to any transit hub. Normal rent applies there, or you may buy it. Passing Skyline HQ pays your payday.',[...opts.map(o=>{const own=G.own[o.j],r=own.o>=0&&own.o!==p.id&&!own.m?rentFor(o.j,7):0;return{k:'h'+o.j,label:`${SQ[o.j].n} · ${fmt(20)}`,ok:p.cash>=20+r,info:own.o<0?'Unowned':own.o===p.id?'Your hub':`Rent ${fmt(r)}`}}),{k:'stay',label:'Stay',info:'Rest here.'}],
    ()=>{const b=opts.find(o=>G.own[o.j].o<0&&p.cash>=SQ[o.j].p+20+aiReserve(p));return b?'h'+b.j:'stay'});
   lcStat('tx_'+(k==='stay'?'stay':'ride'));if(k!=='stay'&&await pay(p,20,null,'fee')){await moveTo(p,+k.slice(1));await land(p,d)}return}
  if(i===30){const val=j=>{const g=SQ[j].g,mine=GROUPS[g].filter(x=>G.own[x].o===p.id).length,open=GROUPS[g].every(x=>G.own[x].o<0||G.own[x].o===p.id);return SQ[j].p*(1+mine*(open?.8:.3))};
   const cand=SQ.map((s,j)=>j).filter(j=>SQ[j].t==='prop'&&G.own[j].o<0).sort((a,b)=>val(b)-val(a)).slice(0,3),price=j=>Math.round(SQ[j].p*1.1/5)*5;
   const k=await lcChoose(p,'investment','Investment Forum','Investors pitch city land. Buy one unowned street anywhere at its price +10%, or network for a stipend.',[...cand.map(j=>({k:'b'+j,label:`Buy ${SQ[j].n} · ${fmt(price(j))}`,ok:p.cash>=price(j),info:GNAME[SQ[j].g]})),{k:'net',label:`Network · +${fmt(25)}`,info:'Collect a stipend.'}],
    ()=>{const j=cand.find(j=>p.cash-price(j)>=aiReserve(p)&&val(j)>SQ[j].p*1.5);return j!=null?'b'+j:'net'});
   lcStat('if_'+(k==='net'?'net':'buy'));if(k[0]==='b'){const j=+k.slice(1);if(G.own[j].o<0&&p.cash>=price(j))buyProp(p,j,price(j))}else await collect(p,25)}}
{const _ld=land;land=async function(p,d,o2){if(lc()&&LC_CORNER[p.pos]!=null){const i0=p.pos;renderRoster();await lcCorner(p,d);renderRoster();if((i0===0||i0===20)&&p.pos===i0)return _ld.apply(this,arguments);return}return _ld.apply(this,arguments)}}
// Pre-approval cancels the next Civic Review trigger (one use).
{const _er=lcEnterReview;lcEnterReview=async function(p,why){if(lc()&&p.lcPre&&!p.cr){p.lcPre=false;lcStat('pre_used');log(`${p.name}’s Pre-approval cancels the Civic Review`);if(!FAST)toast(`${p.name}: Pre-approval used`);return}return _er.apply(this,arguments)}}

// 3D board texture: V2 corner tiles (original art; kit icons + live labels). Classic matches keep their tiles.
const LC_CIMG={};for(const k in LC_CORNER){const im=new Image();im.decoding='async';im.src=`living/icons/128/${LC_CORNER[k][1]}.png`;LC_CIMG[k]=im}
{const _at=applyTheme;applyTheme=function(...a){try{if(typeof S3!=='undefined'&&S3){const key=lc()?'v2':'classic';if(S3.lcKey!==key){S3.boardDrawnFor=null;S3.lcKey=key}}}catch(e){}return _at.apply(this,a)}}
const LC_CSUB={0:()=>'PAYDAY +'+fmt(PAYDAY),10:()=>'PRE-APPROVAL DESK',20:()=>'RIDE TO ANY HUB',30:()=>'BUY ANY STREET'};
{const _dc=drawCorner;drawCorner=function(ctx,i,r){if(!lc()||!LC_CORNER[i])return _dc.apply(this,arguments);
  const cx=r.x+r.w/2,cy=r.y+r.h/2,dark=!!(typeof BP!=='undefined'&&BP.glow),g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
  g.addColorStop(0,dark?'#0f2a3d':'#fff6dc');g.addColorStop(1,dark?'#1d4560':'#f1d58c');ctx.fillStyle=g;ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle='#c9a227';ctx.lineWidth=4;ctx.strokeRect(r.x+6,r.y+6,r.w-12,r.h-12);
  const rot={0:-Math.PI/4,10:Math.PI/4,20:Math.PI*.75,30:-Math.PI*.75}[i];ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.textAlign='center';ctx.textBaseline='middle';
  const im=LC_CIMG[i];if(im&&im.complete&&im.naturalWidth)try{ctx.drawImage(im,-26,-50,52,52)}catch(e){}
  const name=LC_CORNER[i][0].toUpperCase();let fs=17;ctx.font=`800 ${fs}px ${typeof FD!=='undefined'?FD:'sans-serif'}`;while(ctx.measureText(name).width>124&&fs>9){fs--;ctx.font=`800 ${fs}px ${typeof FD!=='undefined'?FD:'sans-serif'}`}
  ctx.fillStyle=dark?'#f4d28b':'#5a3d00';ctx.fillText(name,0,16);ctx.font=`800 9.5px ${typeof FB!=='undefined'?FB:'sans-serif'}`;ctx.fillStyle=dark?'#e8eef4':'#1d3046';ctx.fillText(LC_CSUB[i](),0,34);ctx.restore()}}
LC_VALID.push(g=>g.players.every(p=>p.lcPre==null||typeof p.lcPre==='boolean'));
LC_RULES.push(['investment','City corners','Skyline HQ (landing: bonus payday or a 25% grant) · Planning Office (Pre-approval cancels your next Civic Review) · Transit Exchange (pay a fare to ride to any hub) · Investment Forum (buy any unowned street at +10%, or a stipend). Nobody is detained.']);


/* ---------- V2.1 · 3D board parity (crown, event outlines, corner markers) and Daylight/Dark ---------- */
// The 3D board already maps stages to geometry through FAM[o.h] (1 Low-rise, 2 Mid-rise, 3 High-rise, 5 Skyscraper),
// so 3D and 2D read the same o.h. V2.1 adds: a gold crown above a Landmark, a gold outline on streets affected by
// an active/upcoming city event; the four V2 corner tiles are drawn into the 3D board texture (Task 06 section). All read G only; no state is written.
const lcLight=()=>document.documentElement.classList.contains('light');
function lc3DPlot(i){if(FAST||typeof S3==='undefined'||!S3||!S3.plots)return;const pl=S3.plots[i];if(!pl||!pl.node)return;
  if(pl.lcCrown){pl.node.remove(pl.lcCrown);pl.lcCrown=null}if(pl.lcRing){pl.node.remove(pl.lcRing);pl.lcRing=null}
  if(!lc()||!G||SQ[i].t!=='prop')return;
  if(lcLandmarkAt(i)){const c=new Node(),y=(pl.top||.2)+.1,gold=S3.M.gold;c.add(N(S3.geo.cyl8,gold,0,y,0).sc(.12,.045,.12));
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;c.add(N(S3.geo.cone4,gold,Math.cos(a)*.095,y+.08,Math.sin(a)*.095).sc(.035,.1,.035))}
    c.add(N(S3.geo.sph,mat('#fff3c4',{spec:.6}),0,y+.05,0).sc(.04,.04,.04));pl.node.add(c);pl.lcCrown=c}
  const t=lcEvTargets();if(t&&t.includes(i)){const r=new Node(),m=mat(lcLight()?'#b45309':'#f4d28b',{spec:.2}),s=.3,w=.05,h=.045;
    r.add(N(S3.geo.box,m,0,h,s).sc(s*2,h,w),N(S3.geo.box,m,0,h,-s).sc(s*2,h,w),N(S3.geo.box,m,s,h,0).sc(w,h,s*2),N(S3.geo.box,m,-s,h,0).sc(w,h,s*2));pl.node.add(r);pl.lcRing=r}}
function lc3DAll(){if(FAST||typeof S3==='undefined'||!S3||!S3.plots)return;for(let i=0;i<40;i++)if(SQ[i].t==='prop')lc3DPlot(i)}
{const _uc=updateCell;updateCell=function(i){const r=_uc.apply(this,arguments);try{lc3DPlot(i)}catch(e){}return r}}
{const _a=advanceTurn;advanceTurn=function(){_a();try{lc3DAll()}catch(e){}}}
{const _sw=startWith;startWith=function(...a){const r=_sw.apply(this,a);try{lc3DAll()}catch(e){}return r}}
{const _sy=lcSyncLandmarks;lcSyncLandmarks=function(){const before=JSON.stringify(G&&G.lm||{});_sy();if(JSON.stringify(G&&G.lm||{})!==before)try{lc3DAll()}catch(e){}}}
// Theme switches only change CSS and 3D materials; refresh markers so outlines keep their contrast.
{const _ui=applyUI;applyUI=function(){const r=_ui.apply(this,arguments);try{if(G&&lc())lc3DAll()}catch(e){}return r}}
window.SkylineLivingCity3D={plot:i=>lc3DPlot(i),all:()=>lc3DAll()};

window.SkylineLivingCity={lc,LC_RV,optIn:lcOptIn,rulesModal:()=>lcRulesModal()};
