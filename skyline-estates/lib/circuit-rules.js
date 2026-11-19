/* Skyline Circuit — headless rules prototype (research; see CIRCUIT.md). DOM-free and deterministic: runs in Node
   tests and simulations, and later behind a UI module. Not loaded by the game. No artwork, camera or HUD here.

   Flow (same shape as Harbour Ring): SC.newMatch(opts) → state; SC.pending(s) says who must decide what;
   SC.act(s, player, action) applies it and runs every automatic step until the next decision; SC.ai(s, player)
   picks an action ('route' = route-aware AI, 'random' = random-route AI; both share the same buy and build policy).
   State is plain JSON (save-ready): ruleset, version, seed, RNG state, players, ownership, development, turn state,
   scoring and the pending decision all live in it. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.SkylineCircuit=m})(typeof self!=='undefined'?self:this,function(){'use strict';
const RULESET='circuit-v0',VERSION=1;
const CFG=Object.freeze({startCash:1500,payday:200,buildFactor:.5,rentBase:.12,stageMult:[1,3,6,11,18],netRent:.1,
 influence:[1,2,3,5,8],netInf:2,districtMin:3,districtInf:4,outerPrices:[70,110,150,200],outerStep:10,innerPrices:[200,240,280,320],innerStep:20,
 target:300,rounds:40,buyReserve:120,buildReserve:200,
 // Validated defaults (CIRCUIT.md). Rejected variants stay selectable for research: routeTiming 'after-roll',
 // buildCooldown false, skyRule 'net4-both', seatBonus > 0, start 'spread', order 'fixed'.
 routeTiming:'before-roll',buildCooldown:true,skyRule:'net3-both',seatBonus:0,start:'same',order:'snake'});
const STAGES=['Plot','Low-rise','Mid-rise','High-rise','Skyscraper'];
// Match lengths (owner review 17 Nov 2026): Standard and Extended approved for playable testing; Quick stays experimental.
const LENGTHS=Object.freeze({quick:Object.freeze({target:200,rounds:30,experimental:true,rules:Object.freeze({minWinRound:12})}),standard:Object.freeze({target:300,rounds:40,experimental:false}),extended:Object.freeze({target:480,rounds:60,experimental:false})});
// Computer difficulty → route policy. Buy and build policy is shared; Hard is route-aware for now (no stronger AI yet).
const AI_LEVELS=Object.freeze({easy:'random',normal:'route',hard:'route'});
const SAVE_KEY='skylineCircuitSave';
// ---------- topology ----------
const NODES=[],BY={};
for(let i=0;i<20;i++){const q=Math.floor(i/5),k=i%5;const type=k===0?'junction':k===3?'event':'property';
 const slot=k===1?0:k===2?1:2;NODES.push({id:'O'+i,ring:'O',idx:i,type,quadrant:q,price:type==='property'?CFG.outerPrices[q]+CFG.outerStep*slot:0})}
for(let i=0;i<12;i++){const q=Math.floor(i/3),k=i%3;const type=k===0?'junction':'property';NODES.push({id:'I'+i,ring:'I',idx:i,type,quadrant:q,price:type==='property'?CFG.innerPrices[q]+CFG.innerStep*(k-1):0})}
for(const n of NODES)BY[n.id]=n;
const LINKS={O0:'I0',I0:'O0',O5:'I3',I3:'O5',O10:'I6',I6:'O10',O15:'I9',I9:'O15'};
const next=id=>{const n=BY[id];return n.ring==='O'?'O'+((n.idx+1)%20):'I'+((n.idx+1)%12)};
const prev=id=>{const n=BY[id];return n.ring==='O'?'O'+((n.idx+19)%20):'I'+((n.idx+11)%12)};
const NEIGH=Object.fromEntries(NODES.map(n=>[n.id,[next(n.id),prev(n.id),...(LINKS[n.id]?[LINKS[n.id]]:[])]]));
const PROPS=NODES.filter(n=>n.type==='property').map(n=>n.id);
const DISTRICTS=[0,1,2,3].map(q=>PROPS.filter(id=>BY[id].quadrant===q));
const EVENTS=Object.freeze(['grant','tax','festival','rentday','repairs','fund','inspection','toll']);
// ---------- RNG (state kept in s.rng, so saves resume exactly) ----------
function rnd(s){s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd(s)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// ---------- helpers ----------
const solvent=s=>s.players.filter(p=>!p.out);
const owner=(s,id)=>s.own[id]?s.own[id].o:-1;
function networks(s,pid){const seen=new Set(),out=[];
 for(const id of PROPS){if(owner(s,id)!==pid||seen.has(id))continue;const comp=[],q=[id],vis=new Set([id]);
  while(q.length){const c=q.pop();if(BY[c].type==='property'){comp.push(c);seen.add(c)}
   for(const nb of NEIGH[c]){if(vis.has(nb))continue;const t=BY[nb].type;if((t==='property'&&owner(s,nb)===pid)||t==='junction'){vis.add(nb);q.push(nb)}}}
  out.push({props:comp,size:comp.length,rings:new Set(comp.map(c=>BY[c].ring)).size})}
 return out}
const netOf=(s,id)=>{const o=owner(s,id);if(o<0)return null;return networks(s,o).find(n=>n.props.includes(id))};
function rent(s,id){const n=BY[id],o=s.own[id];if(!o||o.o<0)return 0;const net=netOf(s,id);return Math.round(n.price*CFG.rentBase*CFG.stageMult[o.h]*(1+CFG.netRent*((net?net.size:1)-1)))}
const stageCost=(id,s)=>Math.ceil(BY[id].price*(s?s.cfg.buildFactor:CFG.buildFactor));
const skyOk=(s,net)=>s.cfg.skyRule==='net3-both'?net.size>=3&&net.rings===2:net.size>=4&&net.rings===2;
function canBuild(s,pid,id){const o=s.own[id];if(!o||o.o!==pid||o.h>=4||s.built[id])return false;if(s.cfg.buildCooldown&&s.bought[id])return false;const net=netOf(s,id),need=o.h+1;
 if(need===1)return true;if(need===2)return net.size>=2;if(need===3)return net.size>=3;return skyOk(s,net)}
function whyNot(s,pid,id){const o=s.own[id];if(!o||o.o!==pid)return 'not-owned';if(o.h>=4)return 'max-stage';if(s.built[id])return 'one-stage-per-turn';if(s.cfg.buildCooldown&&s.bought[id])return 'bought-this-turn';const net=netOf(s,id),need=o.h+1;
 if(need===2&&net.size<2)return 'needs-network-2';if(need===3&&net.size<3)return 'needs-network-3';if(need===4&&!skyOk(s,net))return s.cfg.skyRule==='net3-both'?'needs-network-3-both-rings':'needs-network-4-both-rings';return null}
// Influence scored at a round end, split into its three sources (the renderer shows this tally).
function influenceParts(s,pid){let props=0,nets=0,dist=0;for(const id of PROPS){const o=s.own[id];if(o&&o.o===pid)props+=CFG.influence[o.h]}
 for(const n of networks(s,pid))if(n.size>=2)nets+=CFG.netInf*(n.size-1);
 const districts=[];DISTRICTS.forEach((d,q)=>{if(d.filter(id=>owner(s,id)===pid).length>=CFG.districtMin){dist+=CFG.districtInf;districts.push(q)}});
 return{properties:props,networks:nets,districts:dist,districtIds:districts,total:props+nets+dist}}
const influenceOf=(s,pid)=>influenceParts(s,pid).total;
function netWorth(s,p){let v=p.cash;for(const id of PROPS){const o=s.own[id];if(o&&o.o===p.id)v+=BY[id].price+o.h*stageCost(id,s)}return v}
const log=(s,t)=>{s.log.push(t)};
// Presentation events for a renderer (opt-in with newMatch({fx:true})). Never read by the rules, never part of the hash.
const fx=(s,e)=>{if(s.cfg.fx)s.fx.push(e)};
function drain(s){const out=s.fx||[];s.fx=[];return out}
// ---------- match ----------
function newMatch({seed=1,players=[{name:'A',ai:'route'},{name:'B',ai:'route'}],length=null,target,rounds,first=0,rules={},fx:withFx=false,meta=null}={}){
 const L=length?LENGTHS[length]:null;if(length&&!L)throw Error('unknown length '+length);
 target=target??(L?L.target:CFG.target);rounds=rounds??(L?L.rounds:CFG.rounds);
 // Pacing knobs (Quick-mode research; Standard and Extended use the defaults): payday, build cost factor,
 // rounds the target and lead must be held, and the earliest round an influence victory may complete.
 const R=Object.assign({routeTiming:CFG.routeTiming,buildCooldown:CFG.buildCooldown,skyRule:CFG.skyRule,seatBonus:CFG.seatBonus,start:CFG.start,order:CFG.order,
  payday:CFG.payday,buildFactor:CFG.buildFactor,hold:1,minWinRound:0},L&&L.rules||{},rules);
 // 'spread' starts players on different outer junctions in turn order (2 players: O0, O10; 3: O0, O5, O10; 4: O0, O5, O10, O15).
 const STARTS={2:['O0','O10'],3:['O0','O5','O10'],4:['O0','O5','O10','O15']};
 if(players.length<2||players.length>4)throw Error('Circuit needs 2–4 players');
 const s={v:VERSION,ruleset:RULESET,seed:seed>>>0,rng:seed>>>0,cfg:{target,rounds,length:length||null,fx:!!withFx,...R},meta:meta?{matchId:String(meta.matchId||''),startedAt:+meta.startedAt||0,career:!!meta.career}:null,fx:[],round:1,turn:first,first,
  players:players.map((p,i)=>({id:i,name:String(p.name||'P'+(i+1)),ai:p.ai||(p.level?AI_LEVELS[p.level]:null),level:p.level||null,cash:CFG.startCash+R.seatBonus*((i-first+players.length)%players.length),pos:R.start==='spread'?STARTS[players.length][(i-first+players.length)%players.length]:'O0',inf:0,out:false,plan:null,st:{turns:0,routeDecisions:0,buys:0,builds:0,paid:0}})),
  bought:{},order:players.map((_,i)=>(first+i)%players.length),orderIdx:0,
  own:Object.fromEntries(PROPS.map(id=>[id,{o:-1,h:0}])),phase:'roll',move:null,built:{},deck:[],clock:null,over:false,winner:null,endReason:null,
  hist:{firstBuy:null,firstLow:null,firstMid:null,firstHigh:null,firstSky:null,firstBankrupt:null,leaders:{}},log:[]};
 s.deck=shuffle(s,[...EVENTS]);fx(s,{t:'turn',pid:s.turn,round:1,order:[...s.order]});return s}
function pending(s){if(s.over)return null;const p=s.players[s.turn];
 if(s.phase==='roll'){if(s.cfg.routeTiming==='before-roll')return{player:p.id,type:'roll',options:[{type:'roll',via:'stay'},{type:'roll',via:'cross'}]};return{player:p.id,type:'roll',options:[{type:'roll'}]}}
 if(s.phase==='route'){const at=s.move.at;return{player:p.id,type:'route',at,steps:s.move.steps,options:[{type:'route',via:'stay',to:next(at)},{type:'route',via:'cross',to:LINKS[at]}]}}
 if(s.phase==='buy')return{player:p.id,type:'buy',node:p.pos,price:BY[p.pos].price,options:[{type:'buy'},{type:'pass'}]};
 if(s.phase==='build'){const opts=PROPS.filter(id=>canBuild(s,p.id,id)&&p.cash>=stageCost(id,s)).map(id=>({type:'build',node:id,cost:stageCost(id,s),to:STAGES[s.own[id].h+1]}));return{player:p.id,type:'build',options:[...opts,{type:'end'}]}}
 return null}
function act(s,pid,a){const pd=pending(s);if(!pd||pd.player!==pid)throw Error('not this player’s decision');const p=s.players[pid];
 if(pd.type==='roll'){if(a.type!=='roll')throw Error('roll expected');
  // Before-roll timing: the route at the first junction reached this move is declared before the dice (later junctions: stay).
  if(s.cfg.routeTiming==='before-roll'){if(!['stay','cross'].includes(a.via))throw Error('declare stay or cross before rolling');p.plan=a.via;p.st.routeDecisions++}const d1=1+Math.floor(rnd(s)*6),d2=1+Math.floor(rnd(s)*6);p.st.turns++;fx(s,{t:'roll',pid,dice:[d1,d2],plan:p.plan,from:p.pos});log(s,`r${s.round} ${p.name} rolls ${d1+d2}`);
  s.move={steps:d1+d2,at:p.pos,noChoice:false};advance(s)}
 else if(pd.type==='route'){if(a.type!=='route'||!['stay','cross'].includes(a.via))throw Error('route expected');p.st.routeDecisions++;log(s,`${p.name} ${a.via} at ${s.move.at}`);
  // Crossing lands on the paired junction; the next step must follow that ring (no immediate re-cross).
  if(a.via==='cross'){step(s,p,LINKS[s.move.at]);s.move.noChoice=true}else{step(s,p,next(s.move.at));s.move.noChoice=false}advance(s)}
 else if(pd.type==='buy'){if(a.type==='buy'){const id=p.pos,pr=BY[id].price;if(p.cash<pr)throw Error('cannot afford');p.cash-=pr;s.own[id]={o:pid,h:0};s.bought[id]=true;p.st.buys++;fx(s,{t:'buy',pid,node:id,price:pr});if(s.hist.firstBuy==null)s.hist.firstBuy=s.round;log(s,`${p.name} buys ${id}`)}else if(a.type!=='pass')throw Error('buy or pass');else fx(s,{t:'pass',pid,node:p.pos});s.phase='build'}
 else if(pd.type==='build'){if(a.type==='end'){endTurn(s)}else if(a.type==='build'){const id=a.node;if(!canBuild(s,pid,id))throw Error('cannot build: '+whyNot(s,pid,id));const c=stageCost(id,s);if(p.cash<c)throw Error('cannot afford');
   p.cash-=c;s.own[id].h++;s.built[id]=true;p.st.builds++;const h=s.own[id].h,key=['','firstLow','firstMid','firstHigh','firstSky'][h];if(s.hist[key]==null)s.hist[key]=s.round;fx(s,{t:'build',pid,node:id,stage:h,cost:c});log(s,`${p.name} builds ${STAGES[h]} on ${id}`)}else throw Error('build or end')}
 return s}
function step(s,p,to){const from=p.pos;p.pos=to;s.move.at=to;s.move.steps--;fx(s,{t:'step',pid:p.id,from,to,via:LINKS[from]===to?'connector':'ring',left:s.move.steps});if(to==='O0'){p.cash+=s.cfg.payday;fx(s,{t:'payday',pid:p.id,amount:s.cfg.payday})}}
function advance(s){const p=s.players[s.turn];
 while(s.move.steps>0){const at=s.move.at;
  if(BY[at].type==='junction'&&!s.move.noChoice){
   if(s.cfg.routeTiming==='before-roll'){const via=p.plan||'stay';if(p.plan!==null)p.st.plansUsed=(p.st.plansUsed||0)+1;p.plan=null;if(via==='cross'){step(s,p,LINKS[at]);s.move.noChoice=true}else{step(s,p,next(at));s.move.noChoice=false}continue}
   s.phase='route';fx(s,{t:'route',pid:p.id,at,steps:s.move.steps});return}
  s.move.noChoice=false;step(s,p,next(at));if(BY[s.move.at].type==='junction'&&s.move.steps>0)continue}
 land(s)}
function land(s){const p=s.players[s.turn],id=p.pos,n=BY[id];s.move=null;fx(s,{t:'land',pid:p.id,node:id,type:n.type});
 if(n.type==='property'){const o=owner(s,id);if(o<0){s.phase=p.cash>=n.price?'buy':'build';if(s.phase==='build')return;return}
  if(o!==p.id){const r=rent(s,id);fx(s,{t:'rent',pid:p.id,to:o,node:id,amount:r});pay(s,p,r,s.players[o]);log(s,`${p.name} pays ${r} rent to ${s.players[o].name}`)}}
 else if(n.type==='event')event(s,p);
 s.phase=p.out?'roll':'build';if(p.out)endTurn(s)}
function event(s,p){if(!s.deck.length)s.deck=shuffle(s,[...EVENTS]);const e=s.deck.pop();log(s,`${p.name} event ${e}`);fx(s,{t:'card',pid:p.id,card:e});
 if(e==='grant')p.cash+=150;else if(e==='fund')p.cash+=100;else if(e==='festival')p.inf+=6;else if(e==='inspection')p.inf=Math.max(0,p.inf-3);
 else if(e==='tax')p.cash-=Math.floor(Math.max(0,p.cash)*.1);else if(e==='toll')pay(s,p,50,null);
 else if(e==='repairs'){const st=PROPS.reduce((n,id)=>n+(owner(s,id)===p.id?s.own[id].h:0),0);pay(s,p,25*st,null)}
 else if(e==='rentday'){for(const q of solvent(s))if(q!==p)pay(s,q,30,p)}}
function pay(s,p,amt,to){if(amt<=0)return;
 if(p.cash<amt){// sell buildings back at half their cost, highest stage first
  const mine=PROPS.filter(id=>owner(s,id)===p.id&&s.own[id].h>0).sort((a,b)=>s.own[b].h-s.own[a].h);
  for(const id of mine){while(s.own[id].h>0&&p.cash<amt){s.own[id].h--;p.cash+=Math.floor(stageCost(id,s)/2);fx(s,{t:'sell',pid:p.id,node:id,stage:s.own[id].h,refund:Math.floor(stageCost(id,s)/2)})}if(p.cash>=amt)break}}
 if(p.cash>=amt){p.cash-=amt;p.st.paid+=amt;if(to)to.cash+=amt;return}
 if(to)to.cash+=Math.max(0,p.cash);p.cash=0;p.out=true;if(s.hist.firstBankrupt==null)s.hist.firstBankrupt=s.round;log(s,`${p.name} is bankrupt`);fx(s,{t:'bankrupt',pid:p.id,creditor:to?to.id:null});
 for(const id of PROPS)if(owner(s,id)===p.id)s.own[id]={o:-1,h:0};
 if(solvent(s).length<=1)finish(s,solvent(s)[0]?.id??null,'last-solvent')}
// Turn order: s.order lists seats for this round. 'fixed' repeats it; 'snake' reverses it every round (1-2-3-4, 4-3-2-1, ...).
function endTurn(s){if(s.over)return;s.built={};s.bought={};
 for(let guard=0;guard<2*s.players.length+2;guard++){s.orderIdx++;
  if(s.orderIdx>=s.order.length){endRound(s);if(s.over)return;if(s.cfg.order==='snake'){s.order=[...s.order].reverse();fx(s,{t:'order',order:[...s.order]})}s.orderIdx=0}
  if(!s.players[s.order[s.orderIdx]].out)break}
 s.turn=s.order[s.orderIdx];s.phase='roll';fx(s,{t:'turn',pid:s.turn,round:s.round,order:[...s.order]})}
function endRound(s){const tally=[];for(const p of solvent(s)){const g=influenceParts(s,p.id);p.inf+=g.total;tally.push({pid:p.id,...g,inf:p.inf})}fx(s,{t:'round',round:s.round,tally});
 const al=solvent(s).sort((a,b)=>b.inf-a.inf||b.cash-a.cash);s.hist.leaders[s.round]=al[0].id;
 const lead=al[0],unique=!al[1]||lead.inf>al[1].inf;
 // Victory clock: the unique leader at or above the target starts it; after holding both for `hold` more round ends they win
 // (default 1: two consecutive round ends). A tie or a lost lead resets it.
 if(unique&&lead.inf>=s.cfg.target){const held=s.clock&&s.clock.pid===lead.id&&s.clock.round===s.round-1;
  if(!held)s.clock={pid:lead.id,round:s.round,since:s.round};else s.clock.round=s.round;
  if(held&&s.round-s.clock.since>=s.cfg.hold&&s.round>=s.cfg.minWinRound){finish(s,lead.id,'influence');return}
  fx(s,{t:'clock',pid:lead.id,round:s.round,since:s.clock.since})}
 else{if(s.clock)fx(s,{t:'clock-reset',pid:s.clock.pid});s.clock=null}
 if(s.round>=s.cfg.rounds){finish(s,lead.id,'round-limit');return}
 s.round++}
function finish(s,pid,why){s.over=true;s.winner=pid;s.endReason=why;s.phase='over';fx(s,{t:'over',winner:pid,reason:why});log(s,`over: ${why} ${pid}`)}
// ---------- AI ----------
function nodeValue(s,pid,id,paydays){const p=s.players[pid],n=BY[id];let v=paydays*s.cfg.payday*.5;
 if(n.type==='property'){const o=owner(s,id);
  if(o<0){if(p.cash-n.price>=CFG.buyReserve){const joins=NEIGH[id].some(nb=>owner(s,nb)===pid||(BY[nb].type==='junction'&&NEIGH[nb].some(x=>x!==id&&owner(s,x)===pid)));
    const dist=DISTRICTS[n.quadrant].filter(x=>owner(s,x)===pid).length;v+=.5*n.price+(joins?60:0)+25*dist+(n.ring==='I'?20:0)}}
  else if(o===pid)v+=15;else v-=rent(s,id)}
 else if(n.type==='event')v+=10;return v}
// Best value reachable from `at` with `steps` left, choosing optimally at later junctions (no dice involved).
function routeValue(s,pid,at,steps,noChoice,paydays){
 if(steps===0)return nodeValue(s,pid,at,paydays);
 if(BY[at].type==='junction'&&!noChoice){const a=routeValue(s,pid,next(at),steps-1,false,paydays+(next(at)==='O0'?1:0)),b=routeValue(s,pid,LINKS[at],steps-1,true,paydays+(LINKS[at]==='O0'?1:0));return Math.max(a,b)}
 const nx=next(at);return routeValue(s,pid,nx,steps-1,false,paydays+(nx==='O0'?1:0))}
function routeOptions(s,pid){const at=s.move.at,k=s.move.steps;
 return{stay:routeValue(s,pid,next(at),k-1,false,next(at)==='O0'?1:0),cross:routeValue(s,pid,LINKS[at],k-1,true,LINKS[at]==='O0'?1:0)}}
// Expected value of declaring stay or cross before the dice: average over the 36 rolls, later junctions stay.
function planPath(s,pid,via,steps){const p=s.players[pid];let at=p.pos,no=false,first=true,pays=0;
 while(steps>0){if(BY[at].type==='junction'&&!no){const c=first?via:'stay';first=false;if(c==='cross'){at=LINKS[at];no=true}else{at=next(at);no=false}}else{at=next(at);no=false}steps--;if(at==='O0')pays++}
 return{at,pays,used:!first}}
function planValues(s,pid){const v={stay:0,cross:0};for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(const via of ['stay','cross']){const r=planPath(s,pid,via,a+b);v[via]+=nodeValue(s,pid,r.at,r.pays)/36}return v}
function ai(s,pid){const pd=pending(s);if(!pd||pd.player!==pid)return null;const p=s.players[pid];
 if(pd.type==='roll'){if(s.cfg.routeTiming!=='before-roll')return{type:'roll'};if(p.ai==='random')return{type:'roll',via:rnd(s)<.5?'stay':'cross'};const e=planValues(s,pid);return{type:'roll',via:e.cross>e.stay?'cross':'stay'}}
 if(pd.type==='route'){if(p.ai==='random')return{type:'route',via:rnd(s)<.5?'stay':'cross'};const o=routeOptions(s,pid);return{type:'route',via:o.cross>o.stay?'cross':'stay'}}
 if(pd.type==='buy')return p.cash-pd.price>=CFG.buyReserve?{type:'buy'}:{type:'pass'};
 if(pd.type==='build'){let best=null,score=-1;for(const o of pd.options){if(o.type!=='build'||p.cash-o.cost<CFG.buildReserve)continue;const h=s.own[o.node].h;
   const gain=(CFG.influence[h+1]-CFG.influence[h])+(CFG.stageMult[h+1]-CFG.stageMult[h])*BY[o.node].price*CFG.rentBase/50;const sc=gain/o.cost;if(sc>score){score=sc;best=o}}
  return best?{type:'build',node:best.node}:{type:'end'}}
 return null}
// Play a whole match with AIs (simulation helper). `onDecision(s,pd)` sees each route decision before it is made.
function playOut(s,{onDecision,maxSteps=200000}={}){let n=0;while(!s.over&&n++<maxSteps){const pd=pending(s);if(!pd)break;if(onDecision&&pd.type==='route')onDecision(s,pd);act(s,pd.player,ai(s,pd.player))}if(!s.over)throw Error('match did not finish');return s}
// ---------- renderer read model ----------
// Everything a renderer needs to draw the current moment; pure (never changes s).
function routePreview(s,pid){const out={};for(const via of ['stay','cross']){const land={};let used=0;
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){const r=planPath(s,pid,via,a+b);land[r.at]=(land[r.at]||0)+1/36;if(r.used)used+=1/36}
  out[via]={landing:Object.entries(land).map(([node,p])=>({node,p:+p.toFixed(4)})).sort((x,y)=>y.p-x.p),junctionChance:+used.toFixed(4)}}
 // Which first junction this move would meet, given the roll (null = none within 12 steps of a non-junction start).
 let at=s.players[pid].pos,k=0;while(k<12&&BY[at].type!=='junction'){at=next(at);k++}out.firstJunction=BY[at].type==='junction'?{node:at,stepsAway:k,crossTo:LINKS[at]}:null;return out}
function view(s){const pd=pending(s);
 return{ruleset:RULESET,version:VERSION,length:s.cfg.length,round:s.round,rounds:s.cfg.rounds,target:s.cfg.target,turn:s.turn,order:[...s.order],orderIdx:s.orderIdx,phase:s.phase,
  pending:pd,clock:s.clock?{...s.clock,winsAtEndOfRound:Math.max(s.clock.since+s.cfg.hold,s.cfg.minWinRound)}:null,over:s.over,winner:s.winner,endReason:s.endReason,
  nodes:NODES.map(n=>{const o=s.own[n.id];const v={id:n.id,type:n.type,ring:n.ring,idx:n.idx,quadrant:n.quadrant,link:LINKS[n.id]||null};
   if(n.type==='property'){v.price=n.price;v.owner=o.o;v.stage=o.h;v.stageName=STAGES[o.h];v.rent=o.o>=0?rent(s,n.id):0;v.nextCost=o.h<4?stageCost(n.id):null}return v}),
  players:s.players.map(p=>({id:p.id,name:p.name,ai:p.ai,level:p.level,cash:p.cash,influence:p.inf,pos:p.pos,out:p.out,netWorth:netWorth(s,p),
   nextTally:p.out?null:influenceParts(s,p.id),networks:p.out?[]:networks(s,p.id).map(x=>({props:[...x.props].sort(),size:x.size,rings:x.rings}))})),
  build:pd&&pd.type==='build'?PROPS.filter(id=>owner(s,id)===pd.player).map(id=>({node:id,stage:s.own[id].h,cost:s.own[id].h<4?stageCost(id,s):null,reason:whyNot(s,pd.player,id)??(s.players[pd.player].cash<stageCost(id,s)?'cannot-afford':null)})):null,
  preview:pd&&pd.type==='roll'&&s.cfg.routeTiming==='before-roll'?routePreview(s,pd.player):null}}
// ---------- saves (own slot; never touches Classic or Harbour Ring saves) ----------
function serialize(s){const c=JSON.parse(JSON.stringify(s));c.fx=[];return JSON.stringify({key:SAVE_KEY,ruleset:RULESET,v:VERSION,state:c})}
function restore(text){let o;try{o=typeof text==='string'?JSON.parse(text):text}catch(e){return{ok:false,reason:'invalid'}}
 if(!o||typeof o!=='object'||o.key!==SAVE_KEY||!o.state)return{ok:false,reason:'invalid'};
 if(o.ruleset!==RULESET)return{ok:false,reason:'wrong-ruleset'};if(!(Number.isInteger(o.v)&&o.v>=1))return{ok:false,reason:'invalid'};
 if(o.v>VERSION)return{ok:false,reason:'newer-version'};const s=o.state;
 const okShape=s.ruleset===RULESET&&Array.isArray(s.players)&&s.players.length>=2&&s.players.length<=4&&s.own&&PROPS.every(id=>s.own[id]&&Number.isInteger(s.own[id].h)&&s.own[id].h>=0&&s.own[id].h<=4&&Number.isInteger(s.own[id].o)&&s.own[id].o>=-1&&s.own[id].o<s.players.length)
  &&s.players.every(p=>BY[p.pos]&&Number.isFinite(p.cash)&&Number.isFinite(p.inf))&&Array.isArray(s.order)&&s.order.length===s.players.length&&Number.isInteger(s.rng)&&['roll','route','buy','build','over'].includes(s.phase);
 if(!okShape)return{ok:false,reason:'invalid'};s.fx=[];return{ok:true,state:s}}
// ---------- Career adapter ----------
// Facts in the shape SkylineCareerCore.record() takes (PR #212). The match id and start time come from the caller (s.meta);
// endedAt is wall-clock and supplied by the caller, so the rules stay deterministic.
function careerFacts(s,{ownerSeat=0,endedAt=Date.now(),online=false,assisted=false,sim=false}={}){const me=s.players[ownerSeat];
 const levels=s.players.filter(p=>p.ai&&p.id!==ownerSeat).map(p=>p.level||(p.ai==='random'?'easy':'normal'));
 const order=['easy','normal','hard'],aiLevel=levels.length?levels.reduce((a,b)=>order.indexOf(b)<order.indexOf(a)?b:a):null; // weakest opponent decides
 return{board:'circuit',length:s.cfg.length,ruleset:RULESET,matchId:s.meta?s.meta.matchId:'',startedAt:s.meta?s.meta.startedAt:NaN,endedAt,sim:!!sim,fast:false,online:!!online,assisted:!!assisted,
  over:!!s.over,ownerHuman:!!me&&!me.ai,rounds:s.round,activity:me?me.st.buys+me.st.builds:0,won:s.over&&s.winner===ownerSeat,score:me?me.inf:0,
  aiOpponents:levels.length,aiLevel,experimental:!!(s.cfg.length&&LENGTHS[s.cfg.length].experimental),
  // District challenge (owner decision 19 Nov 2026, feeds the Dominion unlock): finish a Career match holding 3+ of a district's 5 properties.
  challenges:me?DISTRICTS.map((ids,q)=>ids.filter(id=>s.own[id]&&s.own[id].o===ownerSeat).length>=3?{id:'circuit-district-'+q,tag:'district'}:null).filter(Boolean):[]}}
// ---------- board layout check (for the visual design hand-off) ----------
// A layout maps every node ID to board-plane coordinates (top view: x right, y toward the viewer / screen-down).
// layout = {unit:'pt', nodes:{O0:{x,y},...}, minSpacing?:number}. Returns {ok, errors[], warnings[], stats}.
// Mechanical checks only; the shape and art are the designer's.
function referenceLayout(R=170,r=102){const nodes={};
 for(let i=0;i<20;i++){const a=-Math.PI/2+i*2*Math.PI/20;nodes['O'+i]={x:+(R*Math.cos(a)).toFixed(2),y:+(R*Math.sin(a)).toFixed(2)}}
 for(let i=0;i<12;i++){const a=-Math.PI/2+i*2*Math.PI/12;nodes['I'+i]={x:+(r*Math.cos(a)).toFixed(2),y:+(r*Math.sin(a)).toFixed(2)}}
 return{unit:'pt',reference:true,nodes}}
function validateLayout(L,{minSpacing=44}={}){const errors=[],warnings=[];const N=L&&L.nodes;
 if(!N||typeof N!=='object')return{ok:false,errors:['no-nodes'],warnings,stats:null};
 const ids=NODES.map(n=>n.id);for(const id of ids){const p=N[id];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))errors.push('missing-or-bad:'+id)}
 for(const k of Object.keys(N))if(!BY[k])errors.push('unknown-node:'+k);if(errors.length)return{ok:false,errors,warnings,stats:null};
 const ring=pre=>NODES.filter(n=>n.ring===pre).sort((a,b)=>a.idx-b.idx).map(n=>N[n.id]);
 const area=pts=>pts.reduce((v,p,i)=>{const q=pts[(i+1)%pts.length];return v+(p.x*q.y-q.x*p.y)},0)/2; // >0 = clockwise with y pointing down
 const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x)c=!c}return c};
 const O=ring('O'),I=ring('I');if(area(O)<=0)errors.push('outer-ring-not-clockwise');if(area(I)<=0)errors.push('inner-ring-not-clockwise');
 for(const n of NODES.filter(n=>n.ring==='I'))if(!inside(N[n.id],O))errors.push('inner-node-outside-outer-ring:'+n.id);
 const d=(a,b)=>Math.hypot(N[a].x-N[b].x,N[a].y-N[b].y);let minAdj=Infinity,minAny=Infinity,minPair=null;
 for(const n of NODES){const nx=next(n.id);minAdj=Math.min(minAdj,d(n.id,nx))}
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const v=d(ids[i],ids[j]);if(v<minAny){minAny=v;minPair=[ids[i],ids[j]]}}
 if(minAny<minSpacing)errors.push(`nodes-closer-than-${minSpacing}${L.unit||''}:${minPair.join('-')}`);
 const conn=Object.entries(LINKS).filter(([a])=>a[0]==='O').map(([a,b])=>({from:a,to:b,length:+d(a,b).toFixed(2)}));
 // Connectors should not pass over another node (a token crossing must not appear to stop on a property).
 for(const c of conn){const A=N[c.from],B=N[c.to];for(const id of ids){if(id===c.from||id===c.to)continue;const P=N[id];
   const t=Math.max(0,Math.min(1,((P.x-A.x)*(B.x-A.x)+(P.y-A.y)*(B.y-A.y))/((B.x-A.x)**2+(B.y-A.y)**2)));const q={x:A.x+t*(B.x-A.x),y:A.y+t*(B.y-A.y)};
   if(Math.hypot(P.x-q.x,P.y-q.y)<minSpacing/2)errors.push(`connector-${c.from}-${c.to}-passes-${id}`)}
  if(c.length<minSpacing)warnings.push(`connector-${c.from}-${c.to}-short`)}
 const xs=ids.map(i=>N[i].x),ys=ids.map(i=>N[i].y);
 return{ok:errors.length===0,errors,warnings,stats:{minAdjacent:+minAdj.toFixed(2),minAnyPair:+minAny.toFixed(2),closestPair:minPair,connectors:conn,
  bounds:{w:+(Math.max(...xs)-Math.min(...xs)).toFixed(2),h:+(Math.max(...ys)-Math.min(...ys)).toFixed(2)}}}}
function hash(s){let h=2166136261;for(const c of JSON.stringify(s.log))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16)}
return Object.freeze({RULESET,VERSION,CFG,STAGES,LENGTHS,AI_LEVELS,SAVE_KEY,view,drain,serialize,restore,careerFacts,validateLayout,referenceLayout,influenceParts,routePreview,NODES:Object.freeze(NODES.map(n=>Object.freeze({...n}))),LINKS:Object.freeze({...LINKS}),DISTRICTS,PROPS,EVENTS,
 newMatch,pending,act,ai,playOut,planValues,planPath,networks,influenceOf,rent,canBuild,whyNot,stageCost,netWorth,routeOptions,nodeValue,hash,next});
});
