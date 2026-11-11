/* Skyline Duel · Harbour Ring (preview) — rules core. DOM-free: runs in the app and headless in tests/simulations.
   A separate 1v1 mode on its own 24-space ring. It does not touch the classic board, the existing Skyline Duel,
   ranked play, saves or the economy (no coins, XP or rewards).

   Board (index 0–23, clockwise from Payday): 4 corners, 16 streets in 8 two-street districts, 4 specials.
   The two half-laps mirror each other in prices, and salary is paid per lap from each player's own start (0 or 12);
   with Ferry at 9 and Port Tax at 21, both starts win about equally often (tests/harbour-ring-sim.cjs).
   Every match draws 8 different cities from the game's 31 and gives each district two real streets of that city,
   cheapest district first. Prices, rents and bonuses below are prototype values tuned by tests/harbour-ring-sim.cjs.

   Flow: HR.pending(s) says who must decide what; HR.act(s, player, action) applies it and runs every automatic step
   (rent, Payday, events, end of turn) until the next decision. HR.ai(s, player) picks an action for the computer. */
(function(root){'use strict';
const CFG=Object.freeze({
  rounds:15, startCash:1500, secondBonus:0, payday:200, paydayLand:100, bell:13, bellMult:1.25, rushMult:1.5,
  prices:[70,140,220,320,70,140,220,320],   // the two half-laps mirror each other, so the opposite starts (0 and 12) are equal
  rentMult:[0.1,0.35,0.55,0.75,1.0],   // by level: street only (x2 when the district is complete), 1–3 houses, tower
  buildCost:0.5, takeover:1.5, block:0.5, lockRounds:3, portTax:0.1, towerBonus:100, exchangeFee:20
});
const COLORS=['#2ea6a0','#f08a24','#8f6cff','#e0457b','#2f80ed','#27ae60','#e8c547','#56ccf2'];
// Layout: k = corner | prop | special; d = district (0–7) for streets.
const LAYOUT=[
  {k:'corner',id:'payday',n:'Payday'},{k:'prop',d:0},{k:'prop',d:0},{k:'special',id:'event',n:'City Event'},
  {k:'prop',d:1},{k:'prop',d:1},{k:'prop',d:2},{k:'prop',d:2},
  {k:'corner',id:'permit',n:'Permit Office'},{k:'special',id:'ferry',n:'Ferry'},{k:'prop',d:3},{k:'prop',d:3},
  {k:'corner',id:'exchange',n:'Exchange'},{k:'prop',d:4},{k:'prop',d:4},{k:'special',id:'event',n:'City Event'},
  {k:'prop',d:5},{k:'prop',d:5},{k:'prop',d:6},{k:'prop',d:6},
  {k:'corner',id:'rush',n:'Rush Hour'},{k:'special',id:'tax',n:'Port Tax'},{k:'prop',d:7},{k:'prop',d:7}];
const CORNERS=[0,8,12,20];
// Classic city boards list 22 streets in 8 price groups; take the first two streets of the group matching the tier.
const GROUP_START=[0,2,5,8,11,14,17,20];
const EVENTS=[['Film shoot on your street',120],['Tech hub grant',80],['Festival crowds',60],['Road works',-60],['Flood repairs',-100],['Parking fines',-40]];

function rng(s){let a=s.r>>>0;a=(a+0x6D2B79F5)>>>0;s.r=a;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const pick=(s,n)=>Math.floor(rng(s)*n);

function newMatch(o){
  const s={v:1,r:(o.seed>>>0)||1,seed:(o.seed>>>0)||1,round:1,turn:o.first||0,first:o.first||0,moves:0,log:[],over:false,winner:-1,
    rush:[false,false],dice:null,options:null,decision:null,bids:null,lastEvent:null};
  // 8 distinct cities, shuffled.
  const pool=(o.cities||[]).filter(c=>c&&c.props&&c.props.length>=22).slice();
  for(let i=pool.length-1;i>0;i--){const j=pick(s,i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}
  const chosen=pool.slice(0,8);
  s.districts=chosen.map((c,d)=>({d,city:c.key,name:c.name,country:c.country||'',color:COLORS[d],price:CFG.prices[d]}));
  const used=[0,0,0,0,0,0,0,0];
  s.tiles=LAYOUT.map((L,i)=>{const t={i,k:L.k};
    if(L.k==='prop'){const D=s.districts[L.d],c=chosen[L.d],st=c?c.props[GROUP_START[L.d]+used[L.d]++]:null;
      Object.assign(t,{d:L.d,n:st?st[0]:'Street '+i,area:st?st[1]:'',city:D.name,p:D.price,o:-1,lv:0,lock:0})}
    else Object.assign(t,{id:L.id,n:L.n});return t});
  s.players=(o.players||[{name:'You'},{name:'Rival',ai:true}]).slice(0,2).map((p,i)=>({i,name:p.name||('Player '+(i+1)),ai:!!p.ai,avatar:p.avatar||null,
    cash:CFG.startCash+(i!==s.first?CFG.secondBonus:0),pos:i===s.first?0:12,home:i===s.first?0:12,laps:0,bankrupt:false}));
  startTurn(s);return s}

const other=p=>1-p;
const tilesOf=(s,p)=>s.tiles.filter(t=>t.k==='prop'&&t.o===p);
const pair=(s,t)=>s.tiles.filter(x=>x.k==='prop'&&x.d===t.d);
const complete=(s,t)=>t.o>=0&&pair(s,t).every(x=>x.o===t.o);
function rent(s,t){if(t.o<0)return 0;let m=t.lv?CFG.rentMult[t.lv]:CFG.rentMult[0]*(complete(s,t)?2:1);
  let r=t.p*m;if(s.rush[t.o])r*=CFG.rushMult;if(s.round>=CFG.bell)r*=CFG.bellMult;return Math.round(r)}
const buildCost=t=>Math.round(t.p*CFG.buildCost);
const canBuild=(s,t,p)=>t.k==='prop'&&t.o===p&&complete(s,t)&&t.lv<4;
const netWorth=(s,p)=>{const P=s.players[p];let w=P.cash;tilesOf(s,p).forEach(t=>{w+=t.p+t.lv*buildCost(t)});return w};
const towers=(s,p)=>tilesOf(s,p).filter(t=>t.lv===4).length;
const score=(s,p)=>s.players[p].bankrupt?-1:netWorth(s,p)+towers(s,p)*CFG.towerBonus;
const say=(s,p,txt)=>{s.log.push({round:s.round,p,txt});if(s.log.length>60)s.log.shift()};
const fmt=n=>'SC '+(Math.abs(n)>=1000?(n/1000).toFixed(2).replace(/\.?0+$/,'')+'B':n+'M');

function pay(s,p,amt,to){const P=s.players[p];P.cash-=amt;if(to>=0)s.players[to].cash+=amt;if(P.cash<0)liquidate(s,p)}
function liquidate(s,p){const P=s.players[p];
  const built=tilesOf(s,p).filter(t=>t.lv>0).sort((a,b)=>b.p-a.p);
  for(const t of built){while(P.cash<0&&t.lv>0){t.lv--;P.cash+=Math.round(buildCost(t)/2)}}
  const own=tilesOf(s,p).sort((a,b)=>(complete(s,a)-complete(s,b))||a.p-b.p);
  for(const t of own){if(P.cash>=0)break;t.o=-1;t.lock=0;P.cash+=Math.round(t.p/2);say(s,p,`${P.name} sold ${t.n} to the bank`)}
  if(P.cash<0){P.bankrupt=true;say(s,p,`${P.name} is bankrupt`);finish(s)}}

function startTurn(s){if(s.over)return;const p=s.turn;s.rush[p]=false;
  const a=1+pick(s,6),b=1+pick(s,6);s.dice=[a,b];const P=s.players[p];
  const steps=a===b?[a,a+b]:[a,b,a+b];
  s.options=steps.map(n=>({steps:n,target:(P.pos+n)%24}));
  s.decision={type:'move',p}}

// Salary is paid for every full lap from your own start (0 or 12), so both players earn it equally often.
function moveBy(s,p,n){const P=s.players[p],from=P.pos,rel=(from-P.home+24)%24;P.pos=(from+n)%24;
  if(rel+n>=24){P.laps++;P.cash+=CFG.payday;say(s,p,`${P.name} completed a lap: salary +${fmt(CFG.payday)}`)}land(s,p)}

function land(s,p){const P=s.players[p],t=s.tiles[P.pos];s.decision=null;
  if(t.k==='prop'){
    if(t.o<0){if(P.cash>=t.p)s.decision={type:'buy',p,tile:t.i,price:t.p};else startAuction(s,t,p);return}
    if(t.o===p){if(canBuild(s,t,p)&&P.cash>=buildCost(t)){s.decision={type:'build',p,tile:t.i,cost:buildCost(t)};return}return endTurn(s)}
    const r=rent(s,t);pay(s,p,r,t.o);say(s,p,`${P.name} paid ${fmt(r)} rent on ${t.n}`);if(s.over)return;
    if(!complete(s,t)&&t.lv===0&&!(t.lock>s.round)){const price=Math.round(t.p*CFG.takeover);
      if(P.cash>=price){s.decision={type:'takeover',p,tile:t.i,price};return}}
    return endTurn(s)}
  if(t.k==='corner'){
    if(t.id==='payday'){P.cash+=CFG.paydayLand;say(s,p,`${P.name} landed on Payday +${fmt(CFG.paydayLand)}`);return endTurn(s)}
    if(t.id==='permit'){const c=tilesOf(s,p).filter(x=>canBuild(s,x,p));if(c.length){s.decision={type:'permit',p,choices:c.map(x=>x.i)};return}say(s,p,`${P.name}: no district to build on`);return endTurn(s)}
    if(t.id==='exchange'){const sw=swaps(s,p);if(sw.length){s.decision={type:'exchange',p,choices:sw};return}return endTurn(s)}
    if(t.id==='rush'){s.rush[p]=true;say(s,p,`Rush Hour: ${P.name}'s rents +50% until their next turn`);return endTurn(s)}}
  if(t.id==='tax'){const tax=Math.max(20,Math.round(P.cash*CFG.portTax));pay(s,p,tax,-1);say(s,p,`${P.name} paid ${fmt(tax)} Port Tax`);if(s.over)return;return endTurn(s)}
  if(t.id==='event'){const e=EVENTS[pick(s,EVENTS.length)];s.lastEvent={p,txt:e[0],amt:e[1]};if(e[1]>0)P.cash+=e[1];else pay(s,p,-e[1],-1);say(s,p,`City Event · ${e[0]}: ${e[1]>0?'+':'−'}${fmt(Math.abs(e[1]))}`);if(s.over)return;return endTurn(s)}
  if(t.id==='ferry'){s.decision={type:'ferry',p,choices:CORNERS.slice()};return}
  endTurn(s)}

function swaps(s,p){const q=other(p),out=[];
  const mine=tilesOf(s,p).filter(t=>!complete(s,t)&&t.lv===0),theirs=tilesOf(s,q).filter(t=>!complete(s,t)&&t.lv===0&&!(t.lock>s.round));
  for(const a of mine)for(const b of theirs){const cost=Math.max(0,b.p-a.p)+CFG.exchangeFee;if(s.players[p].cash>=cost)out.push({give:a.i,take:b.i,cost})}
  return out}

function startAuction(s,t,declinedBy){s.bids=[null,null];s.decision={type:'bid',tile:t.i,min:10,p:-1,declinedBy};say(s,declinedBy,`${t.n} goes to a sealed bid`)}
function resolveAuction(s){const t=s.tiles[s.decision.tile],[a,b]=s.bids.map(x=>Math.max(0,x|0));s.bids=null;
  const w=a===b?-1:a>b?0:1,amt=Math.max(a,b);
  if(w<0||amt<10){say(s,-1,`No sale on ${t.n}${a===b&&a>=10?' (tied bids)':''}`)}
  else{pay(s,w,amt,-1);if(!s.over){t.o=w;say(s,w,`${s.players[w].name} won ${t.n} in a sealed bid: ${fmt(amt)} vs ${fmt(Math.min(a,b))}`)}}
  if(!s.over)endTurn(s)}

function endTurn(s){if(s.over)return;s.decision=null;s.moves++;
  if(s.turn!==s.first){if(s.round>=CFG.rounds)return finish(s);s.round++}
  s.turn=other(s.turn);startTurn(s)}

function finish(s){s.over=true;s.decision={type:'end',p:-1};const a=score(s,0),b=score(s,1);s.final=[a,b];s.winner=a===b?(s.players[0].cash>=s.players[1].cash?0:1):a>b?0:1}

function pending(s){return s.decision}

function act(s,p,a){const D=s.decision;if(!D||s.over)throw new Error('no decision');a=a||{};
  if(D.type==='bid'){if(p!==0&&p!==1)throw new Error('bad player');if(s.bids[p]!=null)throw new Error('already bid');
    s.bids[p]=Math.max(0,Math.min(s.players[p].cash,Math.floor(+a.bid||0)));if(s.bids[0]!=null&&s.bids[1]!=null)resolveAuction(s);return s}
  if(D.p!==p)throw new Error('not your decision');const P=s.players[p];
  switch(D.type){
    case 'move':{const o=s.options.find(x=>x.steps===a.steps);if(!o)throw new Error('bad move');s.options=null;s.lastMove={p,steps:o.steps,from:P.pos};moveBy(s,p,o.steps);break}
    case 'buy':{const t=s.tiles[D.tile];if(a.yes){pay(s,p,t.p,-1);t.o=p;say(s,p,`${P.name} bought ${t.n} for ${fmt(t.p)}${complete(s,t)?' · '+t.city+' complete':''}`);endTurn(s)}else startAuction(s,t,p);break}
    case 'build':{const t=s.tiles[D.tile];if(a.yes){pay(s,p,D.cost,-1);t.lv++;say(s,p,`${P.name} built ${t.lv===4?'a tower':'house '+t.lv} on ${t.n}`)}endTurn(s);break}
    case 'takeover':{const t=s.tiles[D.tile];if(a.yes){s.decision={type:'defend',p:t.o,attacker:p,tile:t.i,price:D.price,block:Math.round(t.p*CFG.block)};break}endTurn(s);break}
    case 'defend':{const t=s.tiles[D.tile],att=D.attacker;
      if(a.block&&P.cash>=D.block){pay(s,p,D.block,-1);t.lock=s.round+CFG.lockRounds;say(s,p,`${P.name} blocked the takeover of ${t.n} (${fmt(D.block)}), locked for ${CFG.lockRounds} rounds`)}
      else{pay(s,att,D.price,p);t.o=att;t.lock=0;say(s,att,`${s.players[att].name} took over ${t.n}: ${P.name} received ${fmt(D.price)}`)}
      if(!s.over){s.turn=att;endTurn(s)}break}
    case 'permit':{if(a.tile!=null&&D.choices.includes(a.tile)){const t=s.tiles[a.tile];t.lv++;say(s,p,`Permit Office: free ${t.lv===4?'tower':'house'} on ${t.n}`)}endTurn(s);break}
    case 'exchange':{const c=a.give!=null&&D.choices.find(x=>x.give===a.give&&x.take===a.take);
      if(c){const g=s.tiles[c.give],tk=s.tiles[c.take];pay(s,p,c.cost,other(p));if(!s.over){g.o=other(p);tk.o=p;say(s,p,`Exchange: ${P.name} swapped ${g.n} for ${tk.n} (${fmt(c.cost)})`)}}
      if(!s.over)endTurn(s);break}
    case 'ferry':{if(a.corner!=null&&D.choices.includes(a.corner)&&a.corner!==P.pos){P.pos=a.corner;say(s,p,`${P.name} took the Ferry to ${s.tiles[a.corner].n}`);land(s,p)}else endTurn(s);break}
    default:throw new Error('unknown decision')}
  return s}

/* ---------- computer player ---------- */
function landValue(s,p,target,passes){const P=s.players[p],t=s.tiles[target];let v=passes?CFG.payday:0;
  if(t.k==='prop'){if(t.o<0)v+=P.cash>=t.p+80?t.p*0.6+(pair(s,t).some(x=>x.o===p)?t.p:0):10;
    else if(t.o===p)v+=canBuild(s,t,p)&&P.cash>=buildCost(t)+60?buildCost(t)*1.3:5;
    else v-=rent(s,t)}
  else if(t.id==='payday')v+=CFG.paydayLand;else if(t.id==='permit')v+=tilesOf(s,p).some(x=>canBuild(s,x,p))?140:0;
  else if(t.id==='exchange')v+=bestSwap(s,p)?120:0;else if(t.id==='rush')v+=50+tilesOf(s,p).length*8;
  else if(t.id==='tax')v-=Math.max(20,P.cash*CFG.portTax);else if(t.id==='ferry')v+=60;
  return v}
function bestSwap(s,p){let best=null;for(const c of swaps(s,p)){const tk=s.tiles[c.take];
  const completes=pair(s,tk).every(x=>x===tk||x.o===p),breaks=pair(s,tk).every(x=>x===tk||x.o===other(p));
  const v=(completes?tk.p*1.2:0)+(breaks?tk.p*0.5:0)-c.cost+(tk.p-s.tiles[c.give].p)*0.3;
  if(v>40&&s.players[p].cash-c.cost>=120&&(!best||v>best.v))best={...c,v}}return best}
function ai(s,p){const D=s.decision,P=s.players[p];if(!D)return null;
  switch(D.type){
    case 'move':{let best=null;for(const o of s.options){const v=landValue(s,p,o.target,(P.pos-P.home+24)%24+o.steps>=24)+rng(s)*4;if(!best||v>best.v)best={v,o}}return{steps:best.o.steps}}
    case 'buy':{const t=s.tiles[D.tile],mine=pair(s,t).some(x=>x.o===p),theirs=pair(s,t).some(x=>x.o===other(p));return{yes:P.cash-t.p>=(mine||theirs?20:100)}}
    case 'bid':{const t=s.tiles[D.tile],mine=pair(s,t).some(x=>x.o===p),theirs=pair(s,t).some(x=>x.o===other(p));
      const val=t.p*(mine?1.35:theirs?1.15:0.85)*(0.88+rng(s)*0.24);return{bid:Math.max(0,Math.min(P.cash-60,Math.round(val/10)*10))}}
    case 'build':return{yes:P.cash-D.cost>=80};
    case 'takeover':{const t=s.tiles[D.tile],mine=pair(s,t).some(x=>x!==t&&x.o===p);return{yes:P.cash-D.price>=(mine?60:200)&&(mine||t.p>=180)}}
    case 'defend':{const t=s.tiles[D.tile],attPair=pair(s,t).some(x=>x!==t&&x.o===D.attacker);return{block:attPair&&P.cash-D.block>=60}}
    case 'permit':{const c=D.choices.map(i=>s.tiles[i]).sort((a,b)=>b.p-a.p||b.lv-a.lv);return{tile:c[0].i}}
    case 'exchange':{const b=bestSwap(s,p);return b?{give:b.give,take:b.take}:{}}
    case 'ferry':{let best=null;for(const c of D.choices){if(c===P.pos)continue;const v=landValue(s,p,c,false);if(!best||v>best.v)best={v,c}}return{corner:best.c}}
  }return null}

const api={CFG,COLORS,LAYOUT,CORNERS,newMatch,pending,act,ai,rent,score,netWorth,towers,complete,canBuild,buildCost,fmt,tilesOf,swaps};
if(typeof module==='object'&&module.exports)module.exports=api;else root.HarbourRingRules=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
