/* Skyline Empire — Board 4 headless rules PROTOTYPE `empire-p1` (see EMPIRE.md). DOM-free and deterministic.
   NOT a production ruleset: every number in BALANCE is a provisional prototype value awaiting owner approval.
   Not loaded by the game or the Career registry (Empire stays playable:false).

   Turn cycle (handoff §2.2): market review (shown) → roll and move along the island loop → act on the landing space
   (buy / auction) → allocate investments (develop owned sites, fund the Empire Tower, negotiate) → end turn.
   Seeded, bounded market events resolve at the start of each round; milestones are checked at scoring rounds.
   API mirrors Dominion: newMatch, pending, legal, act, ai, view, serialize, restore, hash, runAI, ranking. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.SkylineEmpire=m})(typeof self!=='undefined'?self:this,function(){'use strict';
const RULESET='empire-p1',VERSION=1,SAVE_KEY='skylineEmpireSave';

// ---------- provisional balance table (all values PROPOSED / TEST-ONLY, see EMPIRE.md §4) ----------
const BALANCE=Object.freeze({
 startCash:1500, payday:250, investActions:2,                     // build/fund actions per turn after moving
 buildFactor:.55, rentMult:[.10,.35,.75,1.3,2.0],                  // rent = price × rentMult[stage] × zone demand
 zoneSetBonus:.5,                                                  // +50% rent when the owner holds a zone majority
 infraFromStage:3,                                                 // High-rise and Skyscraper need a transport (Trade) site
 towerStageCost:[300,450,600,800,1000], towerInfluencePer:35,     // Empire Tower: shared landmark, 5 funded stages
 scoringEvery:2, influencePerMajority:5, influencePerTowerStage:3,
 milestones:{worth:2600,stages:5,highStage:2,influence:18}, leadFactor:1.05, minWinRound:8,
 marketStep:.05, marketMin:.8, marketMax:1.25,                     // seeded random walk per economic system
 rounds:20, auctionMinFactor:.5,
 aiBuyReserve:180, aiBuildReserve:260, aiTowerReserve:600});
const LENGTHS=Object.freeze({quick:Object.freeze({rounds:15,experimental:true}),standard:Object.freeze({rounds:20,experimental:false}),extended:Object.freeze({rounds:28,experimental:false})});
const STAGES=Object.freeze(['Plot','Low-rise','Mid-rise','High-rise','Skyscraper']);

// ---------- topology: the approved Empire artwork's single winding loop (44 spaces, from empire_44.json) ----------
const ZONES=Object.freeze([
 {id:'luxury',name:'Luxury Zone',system:'residential',price:220},{id:'trade',name:'Trade Zone',system:'transport',price:120},
 {id:'innovation',name:'Innovation Zone',system:'commercial',price:160},{id:'finance',name:'Finance Zone',system:'commercial',price:200},
 {id:'culture',name:'Culture Zone',system:'landmark',price:150},{id:'residential',name:'Residential Zone',system:'residential',price:130}]);
const SYSTEMS=Object.freeze(['commercial','residential','transport','landmark']);
const ZBY=Object.fromEntries(ZONES.map(z=>[z.id,z]));
const TRACK=('start property:luxury property:luxury chance property:luxury property:trade property:trade property:trade negotiate property:trade property:trade property:trade '+
 'property:innovation market property:innovation property:innovation property:innovation property:innovation dice property:innovation property:innovation property:finance property:finance negotiate '+
 'property:finance property:finance property:finance property:finance chance property:finance property:finance property:culture property:culture chance property:culture property:culture property:culture '+
 'property:residential negotiate property:residential property:residential property:residential property:residential market').split(' ');
const STREET=['Avenue','Quay','Plaza','Row','Square','Terrace','Gardens','Point'];
const NODES=[],BY={},seen={};
TRACK.forEach((t,i)=>{const[type,z]=t.split(':');const n={id:'E'+i,idx:i,type,zone:z||null};
 if(type==='property'){const k=seen[z]=(seen[z]||0)+1;n.name=`${ZBY[z].name.replace(' Zone','')} ${STREET[k-1]}`;n.price=ZBY[z].price+10*((k-1)%4);n.system=ZBY[z].system}
 else n.name={start:'Empire Start',chance:'City Event',negotiate:'Negotiation Desk',market:'Market Exchange',dice:'Fortune Roll'}[type];
 NODES.push(n);BY[n.id]=n});
const N=NODES.length,PROPS=NODES.filter(n=>n.type==='property').map(n=>n.id);
const SITES=Object.fromEntries(ZONES.map(z=>[z.id,PROPS.filter(id=>BY[id].zone===z.id)]));
const MAJ=Object.fromEntries(ZONES.map(z=>[z.id,Math.floor(SITES[z.id].length/2)+1]));
const EVENTS=Object.freeze([
 {k:'boom',system:'commercial',d:+2,msg:'Commercial boom: commercial demand up'},{k:'slump',system:'commercial',d:-2,msg:'Office slump: commercial demand down'},
 {k:'housing',system:'residential',d:+2,msg:'Housing shortage: residential demand up'},{k:'rates',system:'residential',d:-2,msg:'Rate rise: residential demand down'},
 {k:'port',system:'transport',d:+2,msg:'Port expansion: transport demand up'},{k:'strike',system:'transport',d:-2,msg:'Logistics strike: transport demand down'},
 {k:'tourism',system:'landmark',d:+2,msg:'Tourism season: landmark demand up'},{k:'steel',cost:+2,msg:'Steel prices rise: build costs up'},{k:'subsidy',cost:-2,msg:'Construction subsidy: build costs down'}]);

// ---------- RNG ----------
function rnd(s){s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
const clampM=(s,v)=>Math.round(Math.min(s.cfg.marketMax,Math.max(s.cfg.marketMin,v))*100)/100;

// ---------- helpers ----------
const owner=(s,id)=>s.own[id]?s.own[id].o:-1;
const sitesOf=(s,pid)=>PROPS.filter(id=>owner(s,id)===pid);
const cur=s=>s.players[s.turn];
const majority=(s,z)=>{for(const p of s.players)if(!p.out&&SITES[z].filter(id=>owner(s,id)===p.id).length>=MAJ[z])return p.id;return -1};
const stageCost=(s,id)=>Math.ceil(BY[id].price*s.cfg.buildFactor*s.market.cost);
const rent=(s,id)=>{const o=s.own[id];if(!o||o.o<0)return 0;const n=BY[id];return Math.round(n.price*s.cfg.rentMult[o.h]*s.market.demand[n.system]*(majority(s,n.zone)===o.o?1+s.cfg.zoneSetBonus:1))};
const hasInfra=(s,pid)=>sitesOf(s,pid).some(id=>BY[id].system==='transport');
const netWorth=(s,p)=>p.cash+sitesOf(s,p.id).reduce((a,id)=>a+BY[id].price+s.own[id].h*Math.ceil(BY[id].price*s.cfg.buildFactor),0)+p.towerFund;
const stagesBuilt=(s,pid)=>sitesOf(s,pid).reduce((a,id)=>a+s.own[id].h,0);
const log=(s,msg)=>{s.log.push({r:s.round,t:s.turn,msg});if(s.log.length>200)s.log.shift()};
function milestones(s,p){const M=s.cfg.milestones,worth=netWorth(s,p),st=stagesBuilt(s,p.id),hi=sitesOf(s,p.id).some(id=>s.own[id].h>=M.highStage);
 return{economic:{done:worth>=M.worth,value:worth,target:M.worth},development:{done:st>=M.stages&&hi,value:st,target:M.stages,needsHigh:STAGES[M.highStage]},
  influence:{done:p.influence>=M.influence,value:p.influence,target:M.influence}}}

function newMatch(opts={}){
 const seed=(opts.seed>>>0)||1,cfg={...BALANCE,...(opts.length&&LENGTHS[opts.length]?{rounds:LENGTHS[opts.length].rounds}:{}),...(opts.cfg||{})};
 const names=opts.names||['You','Investor AI','Trader AI','Builder AI'],n=Math.max(2,Math.min(4,opts.players||names.length));
 const s={ruleset:RULESET,version:VERSION,seed,rng:seed,cfg:{...cfg,length:opts.length&&LENGTHS[opts.length]?opts.length:'standard'},meta:opts.meta||null,round:1,turn:0,idx:0,turns:0,phase:'roll',winner:null,endReason:null,
  market:{demand:Object.fromEntries(SYSTEMS.map(k=>[k,1])),cost:1,trend:'Steady',event:null},
  players:Array.from({length:n},(_,i)=>({id:i,st:{buys:0,builds:0,wins:0},name:names[i]||'Player '+(i+1),ai:opts.ai?!!opts.ai[i]:i>0,cash:cfg.startCash,pos:'E0',out:false,
   influence:0,towerFund:0,invest:0,offered:[],desk:false,lastRoll:null})),
  own:Object.fromEntries(PROPS.map(id=>[id,{o:-1,h:0}])),tower:{stage:0,funded:0,by:{}},auction:null,offer:null,checks:[],log:[]};
 s.first=Math.floor(rnd(s)*n);s.turn=s.first;marketEvent(s);startTurn(s);return s}

function marketEvent(s){const e=EVENTS[Math.floor(rnd(s)*EVENTS.length)],m=s.market,step=s.cfg.marketStep;
 if(e.system)m.demand[e.system]=clampM(s,m.demand[e.system]+e.d*step);if(e.cost)m.cost=clampM(s,m.cost+e.cost*step);
 for(const k of SYSTEMS)if(k!==e.system)m.demand[k]=clampM(s,m.demand[k]+(m.demand[k]>1?-step:m.demand[k]<1?step:0)); // drift back to neutral
 const avg=SYSTEMS.reduce((a,k)=>a+m.demand[k],0)/4;m.trend=avg>1.04?'Bullish':avg<.96?'Bearish':'Steady';m.event={k:e.k,msg:e.msg,round:s.round};log(s,'Market: '+e.msg)}
function startTurn(s){const p=cur(s);s.phase='roll';p.invest=s.cfg.investActions;p.offered=[];p.desk=false;p.lastRoll=null}

// ---------- legality ----------
function legal(s,pid){const out=[];if(s.phase==='over')return out;
 if(s.phase==='auction'){const a=s.auction;if(a.waiting[0]===pid)out.push({type:'bid',min:a.min,max:s.players[pid].cash},{type:'bid-pass'});return out}
 if(s.phase==='offer'){if(s.offer.to===pid)out.push({type:'accept'},{type:'decline'});return out}
 if(pid!==s.turn)return out;const p=s.players[pid],block=(type,reason,x)=>out.push({type,blocked:reason,...x});
 if(s.phase==='roll'){out.push({type:'roll'});return out}
 const here=BY[p.pos];
 if(here.type==='property'&&owner(s,p.pos)<0&&!p.decided){if(p.cash<here.price)block('buy','Not enough cash',{node:p.pos,price:here.price});else out.push({type:'buy',node:p.pos,price:here.price});
  out.push({type:'auction',node:p.pos,min:Math.ceil(here.price*s.cfg.auctionMinFactor)})}
 for(const id of sitesOf(s,pid)){const o=s.own[id],next=o.h+1,c=stageCost(s,id),z=BY[id].zone;
  if(o.h>=4)continue;let why=null;
  if(p.invest<1)why='No investment actions left this turn';else if(next===2&&SITES[z].filter(x=>owner(s,x)===pid).length<2)why=`Mid-rise needs 2 sites in ${ZBY[z].name}`;
  else if(next>=3&&majority(s,z)!==pid)why=`${STAGES[next]} needs a ${ZBY[z].name} majority (${MAJ[z]} of ${SITES[z].length})`;
  else if(next>=s.cfg.infraFromStage&&!hasInfra(s,pid))why=`${STAGES[next]} needs transport infrastructure (own a Trade Zone site)`;else if(p.cash<c)why='Not enough cash';
  if(why)block('develop',why,{node:id,stage:next,price:c});else out.push({type:'develop',node:id,stage:next,price:c})}
 if(s.tower.stage<5){const need=s.cfg.towerStageCost[s.tower.stage]-s.tower.funded,min=Math.min(need,100);
  if(p.invest<1)block('fund','No investment actions left this turn',{min});else if(p.cash<min)block('fund','Not enough cash',{min});else out.push({type:'fund',min,max:Math.min(p.cash,need),need})}
 for(const id of PROPS){const o=owner(s,id);if(o<0||o===pid||s.players[o].out)continue;const z=BY[id].zone;
  if(!(p.desk||(here.zone===z)))continue;const min=BY[id].price+s.own[id].h*Math.ceil(BY[id].price*s.cfg.buildFactor);
  if(p.offered.includes(id))block('offer','Already offered this turn',{node:id,to:o,min});else if(p.cash<min)block('offer','Not enough cash for the minimum offer',{node:id,to:o,min});else out.push({type:'offer',node:id,to:o,min,max:p.cash})}
 if(!(here.type==='property'&&owner(s,p.pos)<0&&!p.decided))out.push({type:'end'});else block('end','Buy or auction the site first',{});
 return out}
function pending(s){if(s.phase==='over')return null;if(s.phase==='auction')return{kind:'bid',player:s.auction.waiting[0],node:s.auction.node,min:s.auction.min};
 if(s.phase==='offer')return{kind:'respond',player:s.offer.to,from:s.offer.from,node:s.offer.node,amount:s.offer.amount};return{kind:s.phase,player:s.turn}}

// ---------- payments ----------
function pay(s,from,to,amount){const p=s.players[from];if(p.cash<amount)raise(s,p,amount);const paid=Math.min(amount,Math.max(0,p.cash));p.cash-=paid;if(to>=0)s.players[to].cash+=paid;if(paid<amount)bankrupt(s,p);return paid}
function raise(s,p,need){const mine=()=>sitesOf(s,p.id).sort((a,b)=>s.own[b].h-s.own[a].h||BY[b].price-BY[a].price);
 for(const id of mine())while(p.cash<need&&s.own[id].h>0){s.own[id].h--;p.cash+=Math.floor(Math.ceil(BY[id].price*s.cfg.buildFactor)/2);log(s,`${p.name} sells a building on ${BY[id].name}`)}
 for(const id of mine()){if(p.cash>=need)break;s.own[id]={o:-1,h:0};p.cash+=Math.floor(BY[id].price/2);log(s,`${p.name} sells ${BY[id].name} to the bank`)}}
function bankrupt(s,p){p.out=true;p.cash=0;for(const id of sitesOf(s,p.id))s.own[id]={o:-1,h:0};log(s,`${p.name} is bankrupt`);const alive=s.players.filter(x=>!x.out);if(alive.length===1)finish(s,alive[0].id,'last-standing')}

// ---------- actions ----------
function act(s,pid,a){const L=legal(s,pid),ok=L.find(x=>x.type===a.type&&!x.blocked&&(x.node===undefined||a.node===undefined||x.node===a.node));
 if(!ok)return{ok:false,error:(L.find(x=>x.type===a.type&&x.blocked&&(a.node===undefined||x.node===a.node))||{}).blocked||'Illegal action'};
 const p=s.players[pid];
 switch(a.type){
 case'roll':{const d1=1+Math.floor(rnd(s)*6),d2=1+Math.floor(rnd(s)*6),from=BY[p.pos].idx,to=(from+d1+d2)%N;p.lastRoll=[d1,d2];p.path=[];
  for(let k=1;k<=d1+d2;k++)p.path.push('E'+((from+k)%N));if(to<from||from+d1+d2>=N){p.cash+=s.cfg.payday;log(s,`${p.name} passes Empire Start: +${s.cfg.payday}`)}
  p.pos='E'+to;p.decided=false;s.phase='invest';log(s,`${p.name} rolls ${d1}+${d2} to ${BY[p.pos].name}`);land(s,p);break}
 case'buy':p.st&&p.st.buys++;p.cash-=ok.price;s.own[a.node].o=pid;p.decided=true;log(s,`${p.name} buys ${BY[a.node].name} for ${ok.price}`);break;
 case'auction':{p.decided=true;const order=s.players.map((_,i)=>(pid+i)%s.players.length).filter(i=>!s.players[i].out);
  s.auction={node:a.node,min:ok.min,bids:{},waiting:order,order:order.slice()};s.phase='auction';log(s,`${p.name} auctions ${BY[a.node].name}`);break}
 case'bid':case'bid-pass':{const A=s.auction;let b=a.type==='bid'?Math.max(0,Math.min(p.cash,Math.floor(a.amount||0))):0;if(b<A.min)b=0;A.bids[pid]=b;A.waiting.shift();if(!A.waiting.length)closeAuction(s);break}
 case'develop':p.st&&p.st.builds++;p.invest--;p.cash-=ok.price;s.own[a.node].h++;log(s,`${p.name} builds ${STAGES[s.own[a.node].h]} on ${BY[a.node].name}`);break;
 case'fund':{const amt=Math.max(ok.min,Math.min(ok.max,Math.floor(a.amount||ok.min)));p.invest--;p.cash-=amt;p.towerFund+=amt;s.tower.funded+=amt;s.tower.by[pid]=(s.tower.by[pid]||0)+amt;
  const gain=Math.floor(amt/s.cfg.towerInfluencePer);p.influence+=gain;log(s,`${p.name} invests ${amt} in the Empire Tower (+${gain} influence)`);
  if(s.tower.funded>=s.cfg.towerStageCost[s.tower.stage]){s.tower.stage++;s.tower.funded=0;log(s,`Empire Tower reaches ${STAGES[s.tower.stage-1+1]||'completion'}`)}break}
 case'offer':{const amount=Math.max(ok.min,Math.min(p.cash,Math.floor(a.amount||ok.min)));p.offered.push(a.node);s.offer={from:pid,to:ok.to,node:a.node,amount};s.phase='offer';log(s,`${p.name} offers ${amount} for ${BY[a.node].name}`);break}
 case'accept':case'decline':{const O=s.offer;s.offer=null;s.phase='invest';if(a.type==='accept'&&owner(s,O.node)===O.to&&s.players[O.from].cash>=O.amount){s.players[O.from].cash-=O.amount;s.players[O.to].cash+=O.amount;s.own[O.node].o=O.from;log(s,`${s.players[O.to].name} accepts: ${BY[O.node].name} sold for ${O.amount}`)}else log(s,`${s.players[O.to].name} declines`);break}
 case'end':endTurn(s);break}
 return{ok:true}}
function land(s,p){const n=BY[p.pos];
 if(n.type==='property'){const o=owner(s,p.pos);if(o>=0&&o!==p.id){p.decided=true;const r=rent(s,p.pos);pay(s,p.id,o,r);log(s,`${p.name} pays ${r} rent to ${s.players[o].name}`)}else if(o===p.id)p.decided=true}
 else if(n.type==='chance'){const opts=[[120,'Investor grant +120'],[-80,'Maintenance bill −80'],[60,'Tenant bonus +60'],[-50,'Permit fees −50']],e=opts[Math.floor(rnd(s)*opts.length)];
  log(s,`${p.name}: ${e[1]}`);if(e[0]>0)p.cash+=e[0];else pay(s,p.id,-1,-e[0])}
 else if(n.type==='negotiate'){p.desk=true;log(s,`${p.name} may negotiate for any site this turn`)}
 else if(n.type==='market'){const best=SYSTEMS.slice().sort((a,b)=>s.market.demand[b]-s.market.demand[a])[0],div=Math.round(sitesOf(s,p.id).filter(id=>BY[id].system===best).reduce((a,id)=>a+BY[id].price,0)*.1);
  p.cash+=div;log(s,`${p.name} collects a ${best} dividend of ${div}`)}
 else if(n.type==='dice'){const r=1+Math.floor(rnd(s)*6);p.cash+=r*25;log(s,`${p.name} Fortune Roll ${r}: +${r*25}`)}}
function closeAuction(s){const A=s.auction;s.auction=null;s.phase='invest';let best=-1,amt=0;for(const k of A.order){const v=A.bids[k]||0;if(v>amt){best=k;amt=v}} // ties: earliest in bidding order (opener first)
 if(best>=0&&owner(s,A.node)<0){const W=s.players[best];W.st&&W.st.wins++;W.cash-=amt;s.own[A.node].o=best;log(s,`${s.players[best].name} wins the auction at ${amt}`)}else log(s,'Auction closes with no valid bid')}
function endTurn(s){const n=s.players.length;s.turns++;s.idx++;
 const advance=()=>{if(s.idx>=n){roundEnd(s);if(s.phase==='over')return false;s.idx=0}return true};
 if(!advance())return;const first=(s.first+s.round-1)%n;let guard=0;while(s.players[(first+s.idx)%n].out){s.idx++;if(!advance()||guard++>8)return}
 s.turn=(first+s.idx)%n;startTurn(s)}
function roundEnd(s){
 if(s.round%s.cfg.scoringEvery===0){const check={round:s.round,players:[]};
  for(const p of s.players){if(p.out)continue;const maj=ZONES.filter(z=>majority(s,z.id)===p.id).length,gain=maj*s.cfg.influencePerMajority;p.influence+=gain;
   const m=milestones(s,p);check.players.push({id:p.id,majorities:maj,gain,milestones:{economic:m.economic.done,development:m.development.done,influence:m.influence.done},worth:netWorth(s,p)})}
  // tower stages reward their funders in proportion (rounded down), once per check
  s.checks.push(check);log(s,`Milestone check, round ${s.round}`);
  if(s.round>=s.cfg.minWinRound){const r=ranking(s),lead=r[0],second=r[1],p=s.players[lead.id],m=milestones(s,p);
   if(m.economic.done&&m.development.done&&m.influence.done&&(!second||lead.worth>=second.worth*s.cfg.leadFactor)){finish(s,lead.id,'milestones');return}}}
 if(s.round>=s.cfg.rounds){finish(s,ranking(s)[0].id,'round-limit');return}
 s.round++;marketEvent(s)}
// Published final score: net worth + 25 per influence + 150 per completed milestone. Ties: net worth, then lower seat.
function score(s,p){const m=milestones(s,p);return Math.round(netWorth(s,p)+25*p.influence+150*[m.economic,m.development,m.influence].filter(x=>x.done).length)}
function ranking(s){return s.players.filter(p=>!p.out).map(p=>({id:p.id,score:score(s,p),worth:netWorth(s,p),influence:p.influence})).sort((a,b)=>b.score-a.score||b.worth-a.worth||a.id-b.id)}
function finish(s,id,why){s.phase='over';s.winner=id;s.endReason=why;s.auction=null;s.offer=null;log(s,`${s.players[id].name} wins (${why})`)}

// ---------- AI (legal actions only) ----------
function ai(s,pid){const L=legal(s,pid).filter(x=>!x.blocked),p=s.players[pid],find=t=>L.find(x=>x.type===t);
 if(s.phase==='auction'){const A=s.auction,v=Math.min(p.cash-s.cfg.aiBuyReserve,Math.round(BY[A.node].price*(SITES[BY[A.node].zone].some(x=>owner(s,x)===pid)?1.1:.8)));return v>=A.min?{type:'bid',amount:v}:{type:'bid-pass'}}
 if(s.phase==='offer'){const O=s.offer,z=BY[O.node].zone,loses=majority(s,z)===pid,val=(BY[O.node].price+s.own[O.node].h*stageCost(s,O.node))*(loses?1.8:1.3);return{type:O.amount>=val?'accept':'decline'}}
 if(s.phase==='roll')return{type:'roll'};
 const buy=find('buy'),auc=find('auction');if(buy&&p.cash-buy.price>=s.cfg.aiBuyReserve)return{type:'buy',node:buy.node};if(auc)return{type:'auction',node:auc.node};
 const dev=L.filter(x=>x.type==='develop'&&p.cash-x.price>=s.cfg.aiBuildReserve).sort((a,b)=>b.stage-a.stage||rent(s,b.node)-rent(s,a.node))[0];if(dev)return{type:'develop',node:dev.node};
 const fund=find('fund');if(fund&&p.cash-fund.min>=s.cfg.aiTowerReserve)return{type:'fund',amount:Math.min(fund.max,Math.max(fund.min,Math.floor((p.cash-s.cfg.aiTowerReserve)/2)))};
 const off=L.filter(x=>x.type==='offer').map(x=>({x,mine:SITES[BY[x.node].zone].filter(y=>owner(s,y)===pid).length})).filter(o=>o.mine>=MAJ[BY[o.x.node].zone]-1&&p.cash-o.x.min*1.35>=s.cfg.aiBuyReserve)[0];
 if(off)return{type:'offer',node:off.x.node,amount:Math.ceil(off.x.min*1.35)};
 return{type:'end'}}

const SCORE=(s,p)=>score(s,p);
// Career facts for a finished match (read by lib/career.js through the localStorage inbox). The computer players use the
// single 'normal' policy. Activity = buys + builds + contests/auction wins by the owner.
function careerFacts(s,{ownerSeat=0,endedAt=Date.now()}={}){const me=s.players[ownerSeat],st=me&&me.st||{};const ais=s.players.filter(p=>p.ai&&p.id!==ownerSeat).length;
 return{board:'empire',length:s.cfg.length||'standard',ruleset:RULESET,matchId:s.meta?s.meta.matchId:'',startedAt:s.meta?s.meta.startedAt:NaN,endedAt,sim:false,fast:false,online:false,assisted:false,
  over:s.phase==='over',ownerHuman:!!me&&!me.ai,rounds:s.round,activity:(st.buys||0)+(st.builds||0)+(st.wins||0),won:s.phase==='over'&&s.winner===ownerSeat,score:me?SCORE(s,me):0,
  aiOpponents:ais,aiLevel:ais?'normal':null,experimental:!!(LENGTHS[s.cfg.length||'standard']||{}).experimental,
  challenges:[]}}
// ---------- views & saves ----------
function view(s){return{ruleset:s.ruleset,round:s.round,rounds:s.cfg.rounds,turn:s.turn,phase:s.phase,winner:s.winner,endReason:s.endReason,market:JSON.parse(JSON.stringify(s.market)),tower:{...s.tower},
 players:s.players.map(p=>({id:p.id,name:p.name,ai:p.ai,cash:p.cash,pos:p.pos,out:p.out,influence:p.influence,invest:p.invest,lastRoll:p.lastRoll,worth:netWorth(s,p),score:score(s,p),milestones:milestones(s,p)})),
 sites:PROPS.map(id=>({id,owner:s.own[id].o,stage:s.own[id].h,stageName:s.own[id].o<0?'Unowned':STAGES[s.own[id].h],rent:rent(s,id),price:BY[id].price})),
 zones:ZONES.map(z=>({id:z.id,system:z.system,majority:majority(s,z.id),demand:s.market.demand[z.system]})),auction:s.auction,offer:s.offer,checks:s.checks.slice(-2),log:s.log.slice(-8)}}
const serialize=s=>JSON.stringify(s);
function restore(json){try{const s=typeof json==='string'?JSON.parse(json):json;if(!s||s.ruleset!==RULESET)return{ok:false,error:'Not an Empire prototype save'};
 if(s.version>VERSION)return{ok:false,error:'Save from a newer version (left untouched)'};if(!Array.isArray(s.players)||!s.own||!s.market||PROPS.some(id=>!s.own[id])||s.players.some(p=>!BY[p.pos]))return{ok:false,error:'Corrupted save'};return{ok:true,state:s}}catch(e){return{ok:false,error:'Corrupted save'}}}
function hash(s){let h=2166136261;const str=serialize(s);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function runAI(s,limit=8000){let n=0;while(s.phase!=='over'&&n++<limit){const pd=pending(s);const r=act(s,pd.player,ai(s,pd.player));if(!r.ok)throw Error('AI illegal: '+r.error+' '+JSON.stringify(ai(s,pd.player)))}if(s.phase!=='over')throw Error('stall');return s}
return Object.freeze({careerFacts,RULESET,VERSION,SAVE_KEY,BALANCE,LENGTHS,STAGES,ZONES,SYSTEMS,TRACK,NODES,BY,PROPS,SITES,MAJ,EVENTS,
 newMatch,legal,pending,act,ai,view,serialize,restore,hash,runAI,ranking,score,milestones,majority,rent,stageCost,netWorth,hasInfra})});
