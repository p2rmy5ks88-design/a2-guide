/* Skyline Dominion — Board 3 headless rules PROTOTYPE (see DOMINION.md). DOM-free and deterministic.
   NOT a production ruleset: every number in BALANCE is a provisional prototype value awaiting owner approval.
   Not loaded by the game or the Career registry (Dominion stays playable:false).

   API (mirrors Circuit): D.newMatch(opts) → state; D.pending(s) → who must decide what;
   D.legal(s, pid) → legal actions with costs and block reasons; D.act(s, pid, action) → {ok, error?};
   D.ai(s, pid) → a legal action; D.view(s) → read-only renderer model; D.serialize/D.restore for saves.
   State is plain JSON: ruleset, version, seed, RNG state, players, ownership, stages, turn state, scoring and
   any pending auction/offer all live in it, so a save resumes exactly. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.SkylineDominion=m})(typeof self!=='undefined'?self:this,function(){'use strict';
const RULESET='dominion-p0',VERSION=1,SAVE_KEY='skylineDominionSave';

// ---------- provisional balance table (all values PROPOSED / TEST-ONLY, see DOMINION.md §4) ----------
const BALANCE=Object.freeze({
 startCash:1200, apPerTurn:5, moveCost:1, actionCost:1,           // action points
 income:80, incomePerDistrict:40,                                  // paid at the start of each own turn
 buildFactor:.6, rentMult:[.12,.3,.6,1.0,1.6],                     // rent = price × rentMult[stage]; stage 0 = Plot
 controlNeed:2,                                                    // sites (of 3) needed to control a district
 contestMult:1.25, contestMaxStage:2, contestCooldown:2,            // contested acquisition (Mid-rise+ protected)
 auctionMinFactor:.5, offerMinFactor:1.0,
 scoringEvery:2, cpPerDistrict:3, cpPerAdvanced:1,                 // control points at scoring rounds
 targetByPlayers:{2:4,3:4,4:3}, holdChecks:2, minWinRound:6,                   // early victory
 rounds:16,                                                        // finite cap (from the earlier proposal; not approved)
 aiBuyReserve:150, aiBuildReserve:220, aiContestBreak:2.5, aiContestPlain:1.2});
const LENGTHS=Object.freeze({quick:Object.freeze({rounds:12,experimental:true}),standard:Object.freeze({rounds:16,experimental:true}),extended:Object.freeze({rounds:24,experimental:true})});
const STAGES=Object.freeze(['Plot','Low-rise','Mid-rise','High-rise','Skyscraper']);

// ---------- topology (proposed 30-node network; positions live in the presentation layout) ----------
const DISTRICTS=Object.freeze([
 {id:'innovation',name:'Innovation District',price:180},{id:'cultural',name:'Cultural District',price:140},
 {id:'market',name:'Market District',price:110},{id:'harbor',name:'Harbor District',price:110},
 {id:'financial',name:'Financial District',price:180},{id:'greenbelt',name:'Greenbelt District',price:80},
 {id:'heritage',name:'Heritage District',price:80},{id:'global',name:'Global Boulevard',price:140}]);
const NODES=[],BY={};
NODES.push({id:'central_1',type:'central',district:'central',name:'Central Exchange East'},{id:'central_2',type:'central',district:'central',name:'Central Exchange West'});
for(const d of DISTRICTS)for(let k=1;k<=3;k++)NODES.push({id:`${d.id}_${k}`,type:'property',district:d.id,slot:k,name:`${d.name.split(' ')[0]} ${['Gate','Row','Point'][k-1]}`,price:d.price+(k===1?20:0)});
for(let k=1;k<=4;k++)NODES.push({id:'contest_'+k,type:'contest',district:'contest',name:'Contest Exchange '+k});
for(const n of NODES)BY[n.id]=n;
const EDGES=[['central_1','central_2']];
const ORDER=DISTRICTS.map(d=>d.id),EAST=new Set(['cultural','market','harbor','financial']);
ORDER.forEach((d,i)=>{const nx=ORDER[(i+1)%8];EDGES.push([d+'_1',d+'_2'],[d+'_1',d+'_3'],[d+'_2',d+'_3'],[d+'_1',EAST.has(d)?'central_1':'central_2']);
 const via={global:'contest_1',cultural:'contest_2',financial:'contest_3',heritage:'contest_4'}[d];
 if(via)EDGES.push([d+'_2',via],[via,nx+'_3']);else EDGES.push([d+'_2',nx+'_3'])});
const NEIGH=Object.fromEntries(NODES.map(n=>[n.id,[]]));for(const[a,b]of EDGES){NEIGH[a].push(b);NEIGH[b].push(a)}
const PROPS=NODES.filter(n=>n.type==='property').map(n=>n.id);
const SITES=Object.fromEntries(ORDER.map(d=>[d,PROPS.filter(id=>BY[id].district===d)]));
const CONTEST_DISTRICTS=Object.fromEntries(NODES.filter(n=>n.type==='contest').map(n=>[n.id,[...new Set(NEIGH[n.id].map(x=>BY[x].district))]]));

// ---------- RNG (state kept in s.rng) ----------
function rnd(s){s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}

// ---------- helpers ----------
const owner=(s,id)=>s.own[id]?s.own[id].o:-1;
const stageCost=(s,id)=>Math.ceil(BY[id].price*s.cfg.buildFactor);
const rent=(s,id)=>{const o=s.own[id];return o&&o.o>=0?Math.round(BY[id].price*s.cfg.rentMult[o.h]):0};
const controller=(s,d)=>{for(const p of s.players){if(p.out)continue;if(SITES[d].filter(id=>owner(s,id)===p.id).length>=s.cfg.controlNeed)return p.id}return -1};
const controlled=(s,pid)=>ORDER.filter(d=>controller(s,d)===pid);
const sitesOf=(s,pid)=>PROPS.filter(id=>owner(s,id)===pid);
const netWorth=(s,p)=>p.cash+sitesOf(s,p.id).reduce((a,id)=>a+BY[id].price+s.own[id].h*stageCost(s,id),0);
const contestPrice=(s,id)=>Math.round(s.cfg.contestMult*(BY[id].price+s.own[id].h*stageCost(s,id)));
const cur=s=>s.players[s.turn];
const log=(s,msg)=>{s.log.push({r:s.round,t:s.turn,msg});if(s.log.length>200)s.log.shift()};
const ADJ_D=Object.fromEntries(ORDER.map(d=>[d,new Set(SITES[d].flatMap(id=>NEIGH[id]).map(x=>BY[x].district).filter(x=>x!==d&&x!=='central'&&x!=='contest'))]));
for(const[c,ds]of Object.entries(CONTEST_DISTRICTS)){ADJ_D[ds[0]].add(ds[1]);ADJ_D[ds[1]].add(ds[0])}
const presence=(s,pid,d)=>sitesOf(s,pid).some(id=>BY[id].district===d||ADJ_D[d].has(BY[id].district))||exchangeReach(s,pid,d);
function exchangeReach(s,pid,d){const p=s.players[pid];return p.exchange&&CONTEST_DISTRICTS[p.exchange]?.includes(d)}

function newMatch(opts={}){
 const seed=(opts.seed>>>0)||1,cfg={...BALANCE,...(opts.length&&LENGTHS[opts.length]?{rounds:LENGTHS[opts.length].rounds}:{}),...(opts.cfg||{})};
 const names=opts.names||['You','Investor AI','Trader AI','Builder AI'],n=Math.max(2,Math.min(4,opts.players||names.length));
 const s={ruleset:RULESET,version:VERSION,seed,rng:seed,cfg,round:1,turn:0,idx:0,turns:0,phase:'act',winner:null,endReason:null,
  players:Array.from({length:n},(_,i)=>({id:i,name:names[i]||'Player '+(i+1),ai:opts.ai?!!opts.ai[i]:i>0,cash:cfg.startCash,pos:i%2?'central_2':'central_1',
   ap:0,out:false,cp:0,hold:0,exchange:null,built:[],offered:[],contests:0})),
  own:Object.fromEntries(PROPS.map(id=>[id,{o:-1,h:0,cool:0}])),auction:null,offer:null,checks:[],challenges:[],log:[]};
 // Seeded first player (shown before the match), then the start rotates each round.
 s.first=Math.floor(rnd(s)*n);s.turn=s.first;s.players.forEach((p,i)=>{p.pos=((i-s.first+n)%n)%2?'central_2':'central_1'});
 startTurn(s);return s}

function startTurn(s){const p=cur(s);const pay=s.cfg.income+s.cfg.incomePerDistrict*controlled(s,p.id).length;p.cash+=pay;p.ap=s.cfg.apPerTurn;p.exchange=BY[p.pos].type==='contest'?p.pos:null;p.built=[];p.offered=[];p.contests=0;log(s,`${p.name} receives ${pay}`)}

// ---------- legality ----------
function legal(s,pid){
 const out=[];if(s.phase==='over')return out;
 if(s.phase==='auction'){const a=s.auction;if(a&&a.waiting.includes(pid))out.push({type:'bid',min:a.min,max:s.players[pid].cash},{type:'bid-pass'});return out}
 if(s.phase==='offer'){const o=s.offer;if(o&&o.to===pid)out.push({type:'accept'},{type:'decline'});return out}
 if(pid!==s.turn)return out;const p=s.players[pid],here=BY[p.pos],block=(type,reason,extra)=>out.push({type,blocked:reason,...extra});
 for(const nb of NEIGH[p.pos]){const t=owner(s,nb);const toll=t>=0&&t!==pid?rent(s,nb):0;
  if(p.ap<s.cfg.moveCost)block('move','No action points left',{to:nb});else out.push({type:'move',to:nb,cost:s.cfg.moveCost,toll})}
 if(here.type==='property'){const o=s.own[p.pos],price=here.price;
  if(o.o<0){if(p.ap<s.cfg.actionCost)block('buy','No action points left',{node:p.pos,price});else if(p.cash<price)block('buy','Not enough cash',{node:p.pos,price});else out.push({type:'buy',node:p.pos,price,cost:s.cfg.actionCost});
   if(p.ap<s.cfg.actionCost)block('auction','No action points left',{node:p.pos});else out.push({type:'auction',node:p.pos,min:Math.ceil(price*s.cfg.auctionMinFactor),cost:s.cfg.actionCost})}
  else if(o.o===pid){const next=o.h+1,c=stageCost(s,p.pos);
   if(o.h>=4)block('develop','Already a Skyscraper',{node:p.pos});
   else if(next>=2&&controller(s,here.district)!==pid)block('develop',`${STAGES[next]} needs control of ${here.district}`,{node:p.pos,stage:next,price:c});
   else if(p.built.includes(p.pos))block('develop','One upgrade per site per turn',{node:p.pos,stage:next,price:c});
   else if(p.ap<s.cfg.actionCost)block('develop','No action points left',{node:p.pos,stage:next,price:c});
   else if(p.cash<c)block('develop','Not enough cash',{node:p.pos,stage:next,price:c});
   else out.push({type:'develop',node:p.pos,stage:next,price:c,cost:s.cfg.actionCost})}
  else{const c=contestPrice(s,p.pos),present=presence(s,pid,here.district);
   if(o.h>s.cfg.contestMaxStage)block('contest',`${STAGES[o.h]} is protected`,{node:p.pos,price:c});
   else if(o.cool>s.round)block('contest',`Protected until round ${o.cool}`,{node:p.pos,price:c});
   else if(!present)block('contest','Needs a site in this or a neighbouring district, or a Contest Exchange visit this turn',{node:p.pos,price:c});
   else if(p.contests>=1)block('contest','One contest per turn',{node:p.pos,price:c});
   else if(p.ap<s.cfg.actionCost)block('contest','No action points left',{node:p.pos,price:c});
   else if(p.cash<c)block('contest','Not enough cash',{node:p.pos,price:c});
   else out.push({type:'contest',node:p.pos,price:c,to:o.o,cost:s.cfg.actionCost})}}
 // negotiation: offer to buy an opponent site in the district you stand in, or one reachable from a Contest Exchange visit
 for(const id of PROPS){const o=owner(s,id);if(o<0||o===pid||s.players[o].out)continue;const d=BY[id].district;
  if(!(BY[p.pos].district===d||exchangeReach(s,pid,d)))continue;const min=Math.ceil((BY[id].price+s.own[id].h*stageCost(s,id))*s.cfg.offerMinFactor);
  if(p.offered.includes(id))block('offer','Already offered this turn',{node:id,to:o,min});else if(p.ap<s.cfg.actionCost)block('offer','No action points left',{node:id,to:o,min});
  else if(p.cash<min)block('offer','Not enough cash for the minimum offer',{node:id,to:o,min});else out.push({type:'offer',node:id,to:o,min,max:p.cash,cost:s.cfg.actionCost})}
 out.push({type:'end'});return out}

function pending(s){if(s.phase==='over')return null;if(s.phase==='auction')return{kind:'bid',player:s.auction.waiting[0],node:s.auction.node,min:s.auction.min};
 if(s.phase==='offer')return{kind:'respond',player:s.offer.to,from:s.offer.from,node:s.offer.node,amount:s.offer.amount};return{kind:'act',player:s.turn,ap:cur(s).ap}}

// ---------- payments ----------
function pay(s,from,to,amount){const p=s.players[from];if(p.cash<amount)raise(s,p,amount);const paid=Math.min(amount,Math.max(0,p.cash));p.cash-=paid;if(to>=0)s.players[to].cash+=paid;if(p.cash<0||paid<amount)bankrupt(s,p,to);return paid}
function raise(s,p,need){ // sell buildings (highest first) then sites to the bank at 50%
 const mine=()=>sitesOf(s,p.id).sort((a,b)=>s.own[b].h-s.own[a].h||BY[b].price-BY[a].price);
 for(const id of mine()){while(p.cash<need&&s.own[id].h>0){s.own[id].h--;p.cash+=Math.floor(stageCost(s,id)/2);log(s,`${p.name} sells a building on ${BY[id].name}`)}}
 for(const id of mine()){if(p.cash>=need)break;s.own[id]={o:-1,h:0,cool:0};p.cash+=Math.floor(BY[id].price/2);log(s,`${p.name} sells ${BY[id].name} to the bank`)}}
function bankrupt(s,p,to){p.out=true;p.cash=0;for(const id of sitesOf(s,p.id))s.own[id]={o:-1,h:0,cool:0};log(s,`${p.name} is bankrupt`);
 const alive=s.players.filter(x=>!x.out);if(alive.length===1)finish(s,alive[0].id,'last-standing')}

// ---------- actions ----------
function act(s,pid,a){
 const L=legal(s,pid),ok=L.find(x=>x.type===a.type&&!x.blocked&&(x.to===undefined||a.to===undefined||x.to===a.to)&&(x.node===undefined||a.node===undefined||x.node===a.node));
 if(!ok)return{ok:false,error:(L.find(x=>x.type===a.type&&x.blocked&&(a.node===undefined||x.node===a.node))||{}).blocked||'Illegal action'};
 const p=s.players[pid];
 switch(a.type){
 case'move':{p.ap-=s.cfg.moveCost;p.pos=a.to;if(BY[a.to].type==='contest')p.exchange=a.to;const o=owner(s,a.to);
  if(o>=0&&o!==pid){const r=rent(s,a.to);pay(s,pid,o,r);log(s,`${p.name} pays ${r} toll to ${s.players[o].name}`)}break}
 case'buy':p.ap-=s.cfg.actionCost;p.cash-=ok.price;s.own[a.node].o=pid;log(s,`${p.name} buys ${BY[a.node].name} for ${ok.price}`);break;
 case'develop':p.ap-=s.cfg.actionCost;p.cash-=ok.price;s.own[a.node].h++;p.built.push(a.node);log(s,`${p.name} builds ${STAGES[s.own[a.node].h]} on ${BY[a.node].name}`);break;
 case'contest':{p.ap-=s.cfg.actionCost;p.contests++;const prev=s.own[a.node].o;pay(s,pid,prev,ok.price);if(p.out)break;
  s.own[a.node].o=pid;s.own[a.node].cool=s.round+s.cfg.contestCooldown;log(s,`${p.name} wins contested ${BY[a.node].name} from ${s.players[prev].name} for ${ok.price}`);break}
 case'auction':{p.ap-=s.cfg.actionCost;const order=s.players.map((_,i)=>(pid+i)%s.players.length).filter(i=>!s.players[i].out);
  s.auction={node:a.node,min:ok.min,bids:{},waiting:order,by:pid};s.phase='auction';log(s,`${p.name} opens an auction for ${BY[a.node].name}`);break}
 case'bid':case'bid-pass':{const A=s.auction;A.bids[pid]=a.type==='bid'?Math.max(0,Math.min(p.cash,Math.floor(a.amount||0))):0;if(A.bids[pid]<A.min)A.bids[pid]=0;A.waiting.shift();if(!A.waiting.length)closeAuction(s);break}
 case'offer':{const amount=Math.max(ok.min,Math.min(p.cash,Math.floor(a.amount||ok.min)));p.ap-=s.cfg.actionCost;p.offered.push(a.node);
  s.offer={from:pid,to:ok.to,node:a.node,amount};s.phase='offer';log(s,`${p.name} offers ${amount} for ${BY[a.node].name}`);break}
 case'accept':case'decline':{const O=s.offer;s.phase='act';s.offer=null;
  if(a.type==='accept'){const buyer=s.players[O.from];if(owner(s,O.node)===O.to&&buyer.cash>=O.amount){buyer.cash-=O.amount;s.players[O.to].cash+=O.amount;s.own[O.node].o=O.from;
   log(s,`${s.players[O.to].name} accepts: ${BY[O.node].name} sold to ${buyer.name} for ${O.amount}`);
   const d=BY[O.node].district;if(controller(s,d)===O.from&&!s.challenges.some(c=>c.player===O.from&&c.tag==='negotiation')&&O.amount>=BY[O.node].price)
    s.challenges.push({player:O.from,tag:'negotiation',id:'dominion-negotiated-control',round:s.round,district:d})}}
  else log(s,`${s.players[O.to].name} declines the offer`);break}
 case'end':endTurn(s);break}
 return{ok:true}}

function closeAuction(s){const A=s.auction;s.auction=null;s.phase='act';let best=-1,amt=0;
 for(const[k,v]of Object.entries(A.bids)){const i=+k;if(v>amt){best=i;amt=v}} // ties keep the earlier bidder (seat order from opener)
 if(best>=0&&owner(s,A.node)<0){s.players[best].cash-=amt;s.own[A.node].o=best;log(s,`${s.players[best].name} wins the auction for ${BY[A.node].name} at ${amt}`)}else log(s,'Auction closes with no valid bid')}

// Turn order rotates: round r starts with seat (r-1) mod n, so no seat always acts first before scoring.
function endTurn(s){const n=s.players.length;s.turns++;s.idx=(s.idx||0)+1;
 if(s.idx>=n){roundEnd(s);if(s.phase==='over')return;s.idx=0}
 const first=(s.first+s.round-1)%n;let k=s.idx,next=(first+k)%n;while(s.players[next].out){k++;if(k>=n){roundEnd(s);if(s.phase==='over')return;k=0}next=(first+k)%n}
 s.idx=k;s.turn=next;startTurn(s)}
function roundEnd(s){
 if(s.round%s.cfg.scoringEvery===0){const check={round:s.round,players:[]};
  for(const p of s.players){if(p.out)continue;const ds=controlled(s,p.id),adv=sitesOf(s,p.id).filter(id=>s.own[id].h>=2).length,gain=ds.length*s.cfg.cpPerDistrict+adv*s.cfg.cpPerAdvanced;
   p.cp+=gain;p.hold=ds.length>=target(s)?p.hold+1:0;check.players.push({id:p.id,districts:ds,advanced:adv,gain,hold:p.hold})}
  s.checks.push(check);log(s,`Scoring round ${s.round}`);
  const ready=s.players.filter(p=>!p.out&&p.hold>=s.cfg.holdChecks&&s.round>=s.cfg.minWinRound).sort((a,b)=>b.cp-a.cp||netWorth(s,b)-netWorth(s,a)||a.id-b.id);
  if(ready.length){finish(s,ready[0].id,'district-control');return}}
 if(s.round>=s.cfg.rounds){const r=ranking(s);finish(s,r[0].id,'round-limit');return}
 s.round++}
const target=s=>s.cfg.targetByPlayers[s.players.length]||3;
function ranking(s){return s.players.filter(p=>!p.out).map(p=>({id:p.id,cp:p.cp,worth:netWorth(s,p)})).sort((a,b)=>b.cp-a.cp||b.worth-a.worth||a.id-b.id)}
function finish(s,id,why){s.phase='over';s.winner=id;s.endReason=why;s.auction=null;s.offer=null;log(s,`${s.players[id].name} wins (${why})`)}

// ---------- AI (legal actions only, no privileges) ----------
function siteValue(s,pid,id){const d=BY[id].district,mine=SITES[d].filter(x=>owner(s,x)===pid).length;return BY[id].price*(1+.6*mine)+rent(s,id)*4}
function ai(s,pid){
 const L=legal(s,pid).filter(x=>!x.blocked),p=s.players[pid],find=t=>L.find(x=>x.type===t);
 if(s.phase==='auction'){const a=s.auction,v=Math.min(p.cash-s.cfg.aiBuyReserve,Math.round(BY[a.node].price*(SITES[BY[a.node].district].some(x=>owner(s,x)===pid)?1.1:.8)));return v>=a.min?{type:'bid',amount:v}:{type:'bid-pass'}}
 if(s.phase==='offer'){const o=s.offer,d=BY[o.node].district,loses=controller(s,d)===pid,value=(BY[o.node].price+s.own[o.node].h*stageCost(s,o.node))*(loses?1.8:1.25);return{type:o.amount>=value?'accept':'decline'}}
 const con0=find('contest');if(con0&&controller(s,BY[con0.node].district)===con0.to&&p.cash-con0.price>=s.cfg.aiBuyReserve*.5)return{type:'contest',node:con0.node};
 const dev=find('develop');if(dev&&p.cash-dev.price>=s.cfg.aiBuildReserve)return{type:'develop',node:dev.node};
 const buy=find('buy');if(buy&&p.cash-buy.price>=s.cfg.aiBuyReserve)return{type:'buy',node:buy.node};
 const con=find('contest');if(con&&p.cash-con.price>=s.cfg.aiBuyReserve*.5)return{type:'contest',node:con.node};
 const off=L.filter(x=>x.type==='offer').map(x=>({x,gain:SITES[BY[x.node].district].filter(y=>owner(s,y)===pid).length})).filter(o=>o.gain>=1&&p.cash-o.x.min*1.3>=s.cfg.aiBuyReserve).sort((a,b)=>b.gain-a.gain)[0];
 if(off&&rnd(s)<.5)return{type:'offer',node:off.x.node,amount:Math.ceil(off.x.min*1.3)};
 if(p.ap>=s.cfg.moveCost){const target=bestTarget(s,pid);if(target){const step=firstStep(s,p.pos,target);if(step&&L.some(x=>x.type==='move'&&x.to===step))return{type:'move',to:step}}}
 return{type:'end'}}
function bestTarget(s,pid){const p=s.players[pid];let best=null,score=-1;const dist=bfs(p.pos);
 for(const id of PROPS){const o=s.own[id],d=dist[id];if(d===undefined||d>p.ap-1||d===0&&false)continue;let v=0;
  if(o.o<0&&p.cash-BY[id].price>=s.cfg.aiBuyReserve)v=siteValue(s,pid,id);
  else if(o.o>=0&&o.o!==pid&&o.h<=s.cfg.contestMaxStage&&o.cool<=s.round&&p.cash-contestPrice(s,id)>=s.cfg.aiBuyReserve*.5&&presence(s,pid,BY[id].district))v=BY[id].price*(controller(s,BY[id].district)===o.o?s.cfg.aiContestBreak:s.cfg.aiContestPlain);
  else if(o.o===pid&&o.h<4&&(o.h+1<2||controller(s,BY[id].district)===pid)&&!p.built.includes(id)&&p.cash-stageCost(s,id)>=s.cfg.aiBuildReserve)v=BY[id].price*.9;
  if(v<=0)continue;let toll=0;const path=pathTo(s,p.pos,id);for(const x of path){const ow=owner(s,x);if(ow>=0&&ow!==pid)toll+=rent(s,x)}
  v=v-toll*2-d*15+rnd(s)*10;if(v>score&&d>0){score=v;best=id}}
 return best}
function bfs(from){const dist={[from]:0},q=[from];while(q.length){const c=q.shift();for(const n of NEIGH[c])if(dist[n]===undefined){dist[n]=dist[c]+1;q.push(n)}}return dist}
function pathTo(s,from,to){const prev={[from]:null},q=[from];while(q.length){const c=q.shift();if(c===to)break;for(const n of NEIGH[c])if(!(n in prev)){prev[n]=c;q.push(n)}}
 const path=[];let c=to;while(c&&c!==from){path.unshift(c);c=prev[c]}return path}
const firstStep=(s,from,to)=>pathTo(s,from,to)[0];

// ---------- views & saves ----------
function view(s){return{ruleset:s.ruleset,round:s.round,rounds:s.cfg.rounds,turn:s.turn,phase:s.phase,winner:s.winner,endReason:s.endReason,
 players:s.players.map(p=>({id:p.id,name:p.name,ai:p.ai,cash:p.cash,pos:p.pos,ap:p.ap,out:p.out,cp:p.cp,hold:p.hold,districts:controlled(s,p.id),worth:netWorth(s,p)})),
 sites:PROPS.map(id=>({id,owner:s.own[id].o,stage:s.own[id].h,stageName:s.own[id].o<0?'Unowned':STAGES[s.own[id].h],rent:rent(s,id),price:BY[id].price,protectedUntil:s.own[id].cool})),
 districts:ORDER.map(d=>({id:d,controller:controller(s,d)})),auction:s.auction,offer:s.offer,checks:s.checks.slice(-2),log:s.log.slice(-8)}}
const serialize=s=>JSON.stringify(s);
function restore(json){try{const s=typeof json==='string'?JSON.parse(json):json;
 if(!s||s.ruleset!==RULESET)return{ok:false,error:'Not a Dominion prototype save'};if(s.version>VERSION)return{ok:false,error:'Save from a newer version (left untouched)'};
 if(!Array.isArray(s.players)||!s.own||PROPS.some(id=>!s.own[id])||s.players.some(p=>!BY[p.pos]))return{ok:false,error:'Corrupted save'};return{ok:true,state:s}}catch(e){return{ok:false,error:'Corrupted save'}}}
function hash(s){let h=2166136261;const str=serialize(s);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function runAI(s,limit=4000){let n=0;while(s.phase!=='over'&&n++<limit){const pd=pending(s);const r=act(s,pd.player,ai(s,pd.player));if(!r.ok)throw Error('AI illegal: '+r.error)}return s}

return Object.freeze({target,RULESET,VERSION,SAVE_KEY,BALANCE,LENGTHS,STAGES,DISTRICTS,NODES,BY,EDGES,NEIGH,PROPS,SITES,
 newMatch,legal,pending,act,ai,view,serialize,restore,hash,runAI,ranking,controller,controlled,rent,stageCost,contestPrice,netWorth,pathTo})});
