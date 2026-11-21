/* City Ventures — The Living Market (Career Board 2, replaces Skyline Circuit; owner decision 20 Nov 2026).
   Headless, DOM-free, deterministic rules from the owner's design package (City_Ventures_Full_Rules.md,
   board_topology_37_tiles.json, corner_powers.json, rules_parameters.json). Numbers are the package defaults.

   API: CV.newMatch(opts) → state · CV.pending(s) → {kind,pid,...} · CV.legal(s,pid) → actions
        CV.act(s,pid,action) → {ok,error?,events} · CV.ai(s,pid) → action · CV.rent(s,i) · CV.cityValue(s,pid)
        CV.careerFacts(s,opts) · CV.serialize/CV.restore. State is plain JSON so saves resume exactly. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.CityVentures=m})(typeof self!=='undefined'?self:this,function(){'use strict';
const RULESET='city-ventures-v1',VERSION=1,SAVE_KEY='skylineCityVenturesSave';
const TILES=Object.freeze([{"i":0,"id":"start","name":"Start","type":"corner"},{"i":1,"id":"event-south","name":"Opportunity","type":"event"},{"i":2,"id":"city-tram","name":"City Tram","type":"transit","price":240,"rent":30},{"i":3,"id":"meadow-way","name":"Meadow Way","type":"property","district":"green","price":220,"rent":26,"upgrades":[110,180,290]},{"i":4,"id":"parkside-lane","name":"Parkside Lane","type":"property","district":"green","price":220,"rent":26,"upgrades":[110,180,290]},{"i":5,"id":"garden-circle","name":"Garden Circle","type":"property","district":"green","price":220,"rent":26,"upgrades":[110,180,290]},{"i":6,"id":"free-lounge","name":"Free Lounge","type":"corner"},{"i":7,"id":"service-charge","name":"Service Charge","type":"fee","charge":90},{"i":8,"id":"power-grid","name":"Power Grid","type":"utility","price":200},{"i":9,"id":"event-east","name":"Opportunity","type":"event"},{"i":10,"id":"marina-point","name":"Marina Point","type":"property","district":"yellow","price":290,"rent":34,"upgrades":[145,225,370]},{"i":11,"id":"pier-district","name":"Pier District","type":"property","district":"yellow","price":290,"rent":34,"upgrades":[145,225,370]},{"i":12,"id":"harbor-quay","name":"Harbor Quay","type":"property","district":"yellow","price":290,"rent":34,"upgrades":[145,225,370]},{"i":13,"id":"civic-review","name":"Civic Review","type":"corner"},{"i":14,"id":"city-levy","name":"City Levy","type":"tax","charge":125},{"i":15,"id":"metro-link","name":"Metro Link","type":"transit","price":240,"rent":30},{"i":16,"id":"summit-place","name":"Summit Place","type":"property","district":"orange","price":350,"rent":42,"upgrades":[175,280,450]},{"i":17,"id":"cedar-avenue","name":"Cedar Avenue","type":"property","district":"orange","price":350,"rent":42,"upgrades":[175,280,450]},{"i":18,"id":"maple-heights","name":"Maple Heights","type":"property","district":"orange","price":350,"rent":42,"upgrades":[175,280,450]},{"i":19,"id":"market-boom","name":"Market Boom","type":"corner"},{"i":20,"id":"event-north","name":"Opportunity","type":"event"},{"i":21,"id":"water-works","name":"Water Works","type":"utility","price":200},{"i":22,"id":"lakeside-view","name":"Lakeside View","type":"property","district":"purple","price":410,"rent":52,"upgrades":[205,325,520]},{"i":23,"id":"willow-terrace","name":"Willow Terrace","type":"property","district":"purple","price":410,"rent":52,"upgrades":[205,325,520]},{"i":24,"id":"riverside-row","name":"Riverside Row","type":"property","district":"purple","price":410,"rent":52,"upgrades":[205,325,520]},{"i":25,"id":"skyline-exchange","name":"Skyline Exchange","type":"corner"},{"i":26,"id":"city-works","name":"City Works","type":"utility","price":200},{"i":27,"id":"vista-point","name":"Vista Point","type":"property","district":"pink","price":260,"rent":30,"upgrades":[130,205,330]},{"i":28,"id":"hillcrest-ridge","name":"Hillcrest Ridge","type":"property","district":"pink","price":260,"rent":30,"upgrades":[130,205,330]},{"i":29,"id":"sunset-point","name":"Sunset Point","type":"property","district":"pink","price":260,"rent":30,"upgrades":[130,205,330]},{"i":30,"id":"event-west","name":"Opportunity","type":"event"},{"i":31,"id":"transit-hub","name":"Transit Hub","type":"corner"},{"i":32,"id":"river-line","name":"River Line","type":"transit","price":240,"rent":30},{"i":33,"id":"income-tax","name":"Income Tax","type":"tax","charge":125},{"i":34,"id":"brookfield-avenue","name":"Brookfield Avenue","type":"property","district":"blue","price":180,"rent":20,"upgrades":[90,150,250]},{"i":35,"id":"elm-square","name":"Elm Square","type":"property","district":"blue","price":180,"rent":20,"upgrades":[90,150,250]},{"i":36,"id":"riverside-market","name":"Riverside Market","type":"property","district":"blue","price":180,"rent":20,"upgrades":[90,150,250]}].map(t=>Object.freeze(t)));
const N=TILES.length,CORNERS=Object.freeze([0,6,13,19,25,31]),STATIONS=Object.freeze([2,15,32]),UTILITIES=Object.freeze([8,21,26]);
const DISTRICTS=Object.freeze({green:[3,4,5],yellow:[10,11,12],orange:[16,17,18],purple:[22,23,24],pink:[27,28,29],blue:[34,35,36]});
const DISTRICT_NAMES=Object.freeze({green:'Green',yellow:'Yellow',orange:'Orange',purple:'Purple',pink:'Pink',blue:'Blue'});
const DISTRICT_COLORS=Object.freeze({green:'#70c14e',yellow:'#f1c32c',orange:'#ef8434',purple:'#a35cd4',pink:'#f36f9b',blue:'#39abe4'});
const STAGES=Object.freeze(['Plot','Low-rise','Mid-rise','Landmark']),STAGE_MULT=Object.freeze([1,2,4,7]);
const R=Object.freeze({startCash:3000,salary:200,turns:{standard:18,quick:10},setBonus:.25,boom:1.5,correction:.6,tenant:.7,drive:.8,
 stationRent:[0,30,60,120],utilityMult:[0,4,8,12],auctionFee:50,dealRebate:50,expressFare:75,dividend:80,dividendCap:240,shield:300,
 charter:{developer:150,investor:100,protector:150},handLimit:2,sellBack:.5,mortgage:.5,redeem:1.1,scoreUpgrades:.8,setScore:200,landmarkScore:150,
 bidSteps:[10,50,100]});
const LENGTHS=Object.freeze({standard:{turns:18,experimental:false},quick:{turns:10,experimental:true}});
const CARDS=Object.freeze([
 {id:'tender',name:'The Skyline Tender',text:'The bank puts an unowned property up for auction.'},
 {id:'rush',name:'Construction Rush',text:'Your next eligible upgrade costs 25% less.'},
 {id:'spotlight',name:'Neighborhood Spotlight',text:'Pick one of your properties: its next rent is doubled (bonus up to 300 CC).'},
 {id:'investor',name:'Private Investor',text:'Take 300 CC now and repay 350 CC after you next pass Start — or decline.'},
 {id:'windfall',name:'Infrastructure Windfall',text:'Every player who owns a Transit station receives 100 CC.'},
 {id:'grant',name:'Community Grant',text:'Choose 150 CC now or a 200 CC discount on a future upgrade.'},
 {id:'festival',name:'Street Festival',text:'Crowds fill the city. Collect 120 CC.'},
 {id:'repairs',name:'Building Inspection',text:'Pay 25 CC for each building stage you own (max 250 CC).'},
 {id:'tender',name:'The Skyline Tender',text:'The bank puts an unowned property up for auction.'},
 {id:'grant',name:'Community Grant',text:'Choose 150 CC now or a 200 CC discount on a future upgrade.'},
 {id:'festival',name:'Street Festival',text:'Crowds fill the city. Collect 120 CC.'},
 {id:'rush',name:'Construction Rush',text:'Your next eligible upgrade costs 25% less.'}]);
const CORNER_INFO=Object.freeze({
 0:{id:'start',title:'Start',tagline:'Choose a City Charter',options:[['developer','Developer Charter','Save up to 150 CC on your next upgrade'],['investor','Investor Charter','Save up to 100 CC on your next property purchase'],['protector','Protector Charter','Save up to 150 CC on your next rent payment']]},
 6:{id:'free-lounge',title:'Free Lounge',tagline:'Plan a comeback',options:[['shield','Rent Shield','Covers up to 300 CC of the next rent you owe (lasts until the end of your next turn)'],['preview','Strategic Preview','See 3 Opportunity cards, keep 1 (hand limit 2)']]},
 13:{id:'civic-review',title:'Civic Review',tagline:'Change the city’s laws for one round',options:[['drive','Development Drive','All upgrades cost 20% less'],['tenant','Tenant Protection','All rent is 30% lower']]},
 19:{id:'market-boom',title:'Market Boom',tagline:'Control one district’s rent for one round',options:[['boom','Launch a Boom','Rent +50% in a district you pick'],['correction','Trigger a Correction','Rent −40% in a district you pick']]},
 25:{id:'skyline-exchange',title:'Skyline Exchange',tagline:'Start a property battle',options:[['auction','Open Auction','Auction any unowned property (50 CC fee to you if someone else wins)'],['deal','Deal Desk','Offer a trade; if accepted you both get 50 CC']]},
 31:{id:'transit-hub',title:'Transit Hub',tagline:'Move or cash in',options:[['express','Express Route','Pay 75 CC and ride to any Transit station'],['dividend','Transit Dividend','Collect 80 CC per station you own (max 240)']]}});

// ---------- helpers ----------
const clone=o=>JSON.parse(JSON.stringify(o));
function rng(s){let t=(s.rng=(s.rng+0x6D2B79F5)>>>0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
const P=(s,pid)=>s.players[pid];
const isOwnable=i=>['property','transit','utility'].includes(TILES[i].type);
const active=s=>s.players.filter(p=>!p.out);
function log(s,text,ev){s.log.push({t:s.log.length,text});if(s.log.length>80)s.log.shift();if(ev)ev.push({type:'log',text})}
function owned(s,pid){return s.own.map((o,i)=>o&&o.owner===pid?i:-1).filter(i=>i>=0)}
function districtOf(i){return TILES[i].district||null}
function fullDistrict(s,d,pid){return DISTRICTS[d].every(i=>s.own[i]&&s.own[i].owner===pid)}
function countIn(s,d,pid){return DISTRICTS[d].filter(i=>s.own[i]&&s.own[i].owner===pid).length}
function countType(s,list,pid){return list.filter(i=>s.own[i]&&s.own[i].owner===pid).length}
const fmt=n=>Math.round(n).toLocaleString('en-US')+' CC';

function newMatch(opts={}){
 const seed=(opts.seed>>>0)||((Date.now()^0x9e3779b9)>>>0),length=LENGTHS[opts.length]?opts.length:'standard';
 const players=(opts.players&&opts.players.length?opts.players:[{name:'You'},{name:'Maya',ai:true},{name:'Noah',ai:true},{name:'Ella',ai:true}]).slice(0,4).map((p,id)=>({
  id,name:String(p.name||'Player '+(id+1)).slice(0,24),ai:!!p.ai,color:p.color||['#e85d5d','#3f8fe0','#f1c32c','#4cbf6b'][id],token:p.token||['car','boat','plane','train'][id],
  cash:R.startCash,pos:0,out:false,turns:0,charter:null,shield:null,cards:[],loan:null,discounts:[],spotlight:null,st:{buys:0,builds:0,rentPaid:0,rentIn:0,auctions:0,trades:0,corners:0}}));
 if(players.length<2)throw Error('City Ventures needs 2–4 players');
 const s={ruleset:RULESET,version:VERSION,seed,rng:seed,cfg:{length,turns:LENGTHS[length].turns},meta:opts.meta||null,
  players,own:TILES.map(()=>null),deck:[],discard:[],turn:{pid:0,phase:'roll',dice:null,rolled:false,cornerUsed:false,doubles:0},pending:null,
  market:null,civic:null,log:[],over:false,winner:null,results:null,round:1};
 // highest opening roll goes first
 let best=-1,first=0;for(const p of players){const r=1+Math.floor(rng(s)*6)+1+Math.floor(rng(s)*6);if(r>best){best=r;first=p.id}}
 s.turn.pid=first;s.first=first;
 s.deck=shuffle(s,CARDS.map((_,i)=>i));
 log(s,players[first].name+' rolled highest and goes first.');
 return s;
}
function shuffle(s,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// ---------- prices and rent ----------
function upgradeCost(s,i,pid){const o=s.own[i],t=TILES[i];if(!o||t.type!=='property'||o.stage>=3)return null;let c=t.upgrades[o.stage];if(s.civic&&s.civic.type==='drive')c=Math.round(c*R.drive);return c}
function canUpgrade(s,i,pid){const o=s.own[i],t=TILES[i];if(!o||o.owner!==pid||t.type!=='property'||o.mortgaged||o.stage>=3)return{ok:false,why:'Not upgradable'};
 const n=countIn(s,t.district,pid);if(o.stage<2&&n<2)return{ok:false,why:'Own 2 of the 3 '+DISTRICT_NAMES[t.district]+' properties first'};if(o.stage===2&&n<3)return{ok:false,why:'Own the whole '+DISTRICT_NAMES[t.district]+' district for a Landmark'};
 if(DISTRICTS[t.district].some(j=>s.own[j]&&s.own[j].mortgaged))return{ok:false,why:'Redeem the district’s mortgages first'};
 return{ok:true}}
function discountFor(p,kind,cost){let best=0,which=null;for(const d of p.discounts){if(d.kind!==kind)continue;const v=d.pct?Math.round(cost*d.pct):Math.min(d.amount,cost);if(v>best){best=v;which=d}}
 if(kind==='upgrade'&&p.charter==='developer'&&Math.min(R.charter.developer,cost)>best){best=Math.min(R.charter.developer,cost);which='charter'}
 if(kind==='buy'&&p.charter==='investor'&&Math.min(R.charter.investor,cost)>best){best=Math.min(R.charter.investor,cost);which='charter'}return{amount:best,which}}
function rent(s,i,dice){const o=s.own[i],t=TILES[i];if(!o||o.mortgaged)return 0;let r=0;
 if(t.type==='property'){r=t.rent*STAGE_MULT[o.stage];if(fullDistrict(s,t.district,o.owner))r*=1+R.setBonus;if(s.market&&s.market.district===t.district)r*=s.market.type==='boom'?R.boom:R.correction}
 else if(t.type==='transit')r=R.stationRent[countType(s,STATIONS,o.owner)];
 else if(t.type==='utility'){const roll=dice?dice[0]+dice[1]:7;r=roll*R.utilityMult[countType(s,UTILITIES,o.owner)]}
 if(s.civic&&s.civic.type==='tenant')r*=R.tenant;return Math.round(r)}
function cityValue(s,pid){const p=P(s,pid);let v=p.cash,sets=0,landmarks=0;
 for(const i of owned(s,pid)){const t=TILES[i],o=s.own[i];v+=t.price;if(o.mortgaged)v-=Math.round(t.price*R.mortgage);if(t.type==='property'){for(let k=0;k<o.stage;k++)v+=Math.round(t.upgrades[k]*R.scoreUpgrades);if(o.stage===3)landmarks++}}
 for(const d in DISTRICTS)if(fullDistrict(s,d,pid))sets++;
 if(p.loan)v-=p.loan.repay;
 return{total:Math.round(v+sets*R.setScore+landmarks*R.landmarkScore),cash:p.cash,sets,landmarks}}

// ---------- money ----------
function pay(s,pid,amount,to,reason,ev){amount=Math.max(0,Math.round(amount));if(!amount)return true;const p=P(s,pid);
 if(p.cash>=amount){p.cash-=amount;if(to!=null)P(s,to).cash+=amount;log(s,p.name+' paid '+fmt(amount)+(to!=null?' to '+P(s,to).name:'')+(reason?' ('+reason+')':'')+'.',ev);return true}
 s.pending={kind:'debt',pid,amount,to:to==null?null:to,reason:reason||'',resume:s.pending};log(s,p.name+' owes '+fmt(amount)+' and must raise cash.',ev);return false}
function gain(s,pid,amount,reason,ev){amount=Math.round(amount);if(!amount)return;P(s,pid).cash+=amount;log(s,P(s,pid).name+' received '+fmt(amount)+(reason?' ('+reason+')':'')+'.',ev)}
function liquidity(s,pid){let v=P(s,pid).cash;for(const i of owned(s,pid)){const o=s.own[i],t=TILES[i];if(t.type==='property')for(let k=0;k<o.stage;k++)v+=Math.round(t.upgrades[k]*R.sellBack);if(!o.mortgaged)v+=Math.round(t.price*R.mortgage)}return v}

// ---------- turn flow ----------
function pending(s){if(s.over)return{kind:'over'};if(s.pending)return s.pending;return{kind:s.turn.phase==='roll'?'roll':'action',pid:s.turn.pid}}
function move(s,pid,steps,ev,{salary=true}={}){const p=P(s,pid),from=p.pos,path=[];let passed=false;
 for(let k=1;k<=steps;k++){const at=(from+k)%N;path.push(at);if(at===0)passed=true}
 p.pos=(from+steps)%N;ev.push({type:'move',pid,from,to:p.pos,path});
 if(passed&&salary)passStart(s,pid,ev);return p.pos}
function passStart(s,pid,ev){const p=P(s,pid);gain(s,pid,R.salary,'passed Start',ev);
 if(p.charter){log(s,p.name+'’s '+p.charter+' charter expired.',ev);p.charter=null}
 if(p.loan){const due=p.loan.repay;p.loan=null;pay(s,pid,due,null,'Private Investor repayment',ev)}}
function land(s,pid,ev,{viaExpress=false}={}){const p=P(s,pid),i=p.pos,t=TILES[i];ev.push({type:'land',pid,tile:i});
 if(t.type==='corner'){
  if(viaExpress||s.turn.cornerUsed)return;
  if(i===0){s.turn.cornerUsed=true;s.pending={kind:'corner',pid,tile:0,step:'choose'};return}
  s.turn.cornerUsed=true;p.st.corners++;s.pending={kind:'corner',pid,tile:i,step:'choose'};return}
 if(isOwnable(i)){const o=s.own[i];
  if(!o){s.pending={kind:'buy',pid,tile:i};return}
  if(o.owner===pid||o.mortgaged)return;
  chargeRent(s,pid,i,ev);return}
 if(t.type==='tax'||t.type==='fee'){pay(s,pid,t.charge,null,t.name,ev);return}
 if(t.type==='event'){draw(s,pid,ev);return}}
function chargeRent(s,pid,i,ev){const o=s.own[i],owner=P(s,o.owner),p=P(s,pid);let due=rent(s,i,s.turn.dice);
 if(owner.spotlight===i){const bonus=Math.min(due,300);due+=bonus;owner.spotlight=null;log(s,'Neighborhood Spotlight doubles the rent on '+TILES[i].name+'.',ev)}
 let cover=0;if(p.charter==='protector'){cover=Math.min(R.charter.protector,due);p.charter=null;if(cover)log(s,p.name+'’s Protector Charter saves '+fmt(cover)+'.',ev)}
 if(p.shield&&due-cover>0){const c=Math.min(p.shield.amount,due-cover);cover+=c;p.shield=null;log(s,p.name+'’s Rent Shield covers '+fmt(c)+'.',ev)}
 const net=due-cover;if(net<=0)return;p.st.rentPaid+=net;owner.st.rentIn+=net;ev.push({type:'rent',pid,to:o.owner,amount:net,tile:i});pay(s,pid,net,o.owner,'rent on '+TILES[i].name,ev)}
function draw(s,pid,ev){if(!s.deck.length){s.deck=shuffle(s,s.discard);s.discard=[]}const c=s.deck.shift();ev.push({type:'card',pid,card:CARDS[c].id});log(s,P(s,pid).name+' drew '+CARDS[c].name+'.',ev);resolveCard(s,pid,c,ev)}
function resolveCard(s,pid,c,ev){const card=CARDS[c],p=P(s,pid);
 const done=()=>{s.discard.push(c)};
 switch(card.id){
  case'tender':{const free=TILES.filter(t=>isOwnable(t.i)&&!s.own[t.i]).map(t=>t.i);done();if(!free.length){log(s,'No unowned property is left to tender.',ev);return}startAuction(s,free[Math.floor(rng(s)*free.length)],null,ev);return}
  case'rush':done();p.discounts.push({kind:'upgrade',pct:.25,label:'Construction Rush'});log(s,p.name+' holds a Construction Rush (25% off an upgrade).',ev);return;
  case'spotlight':{const mine=owned(s,pid).filter(i=>!s.own[i].mortgaged);done();if(!mine.length){gain(s,pid,100,'no property to spotlight',ev);return}s.pending={kind:'card',pid,card:'spotlight',options:mine.map(i=>['tile:'+i,TILES[i].name])};return}
  case'investor':done();if(p.loan){log(s,p.name+' already has a Private Investor deal.',ev);return}s.pending={kind:'card',pid,card:'investor',options:[['accept','Take 300 CC now (repay 350 CC after Start)'],['decline','Decline']]};return;
  case'windfall':done();{let any=false;for(const q of active(s))if(countType(s,STATIONS,q.id)){gain(s,q.id,100,'Infrastructure Windfall',ev);any=true}if(!any)log(s,'Nobody owns a Transit station yet.',ev)}return;
  case'grant':done();s.pending={kind:'card',pid,card:'grant',options:[['cash','Take 150 CC now'],['voucher','Keep a 200 CC upgrade discount']]};return;
  case'festival':done();gain(s,pid,120,'Street Festival',ev);return;
  case'repairs':{done();let n=0;for(const i of owned(s,pid))n+=s.own[i].stage||0;pay(s,pid,Math.min(250,25*n),null,'Building Inspection',ev);return}}}
function startAuction(s,tile,initiator,ev){const bidders=active(s).map(p=>p.id);
 s.pending={kind:'auction',tile,initiator,high:0,highPid:null,bidders,passed:[],pid:bidders[0],resume:s.pending&&s.pending.kind!=='auction'?null:null};
 // first bidder is the player after the active one (the active player still bids in turn order)
 const order=[];for(let k=0;k<s.players.length;k++){const id=(s.turn.pid+k)%s.players.length;if(!P(s,id).out)order.push(id)}s.pending.bidders=order;s.pending.pid=order[0];
 ev.push({type:'auction',tile});log(s,'Auction opened for '+TILES[tile].name+'.',ev)}
function nextBidder(s){const a=s.pending,live=a.bidders.filter(id=>!a.passed.includes(id));
 if(live.length===0||(live.length===1&&a.highPid===live[0])||(live.length===1&&a.highPid!=null)){return finishAuction(s)}
 if(live.length===1&&a.highPid==null){a.pid=live[0];return}
 let k=a.bidders.indexOf(a.pid);for(let n=0;n<a.bidders.length;n++){k=(k+1)%a.bidders.length;const id=a.bidders[k];if(!a.passed.includes(id)&&id!==a.highPid){a.pid=id;return}}finishAuction(s)}
function finishAuction(s,ev=[]){const a=s.pending;s.pending=null;
 if(a.highPid==null){log(s,'No bids — '+TILES[a.tile].name+' stays with the bank.',ev);return}
 const w=P(s,a.highPid);w.cash-=a.high;s.own[a.tile]={owner:w.id,stage:0,mortgaged:false};w.st.buys++;w.st.auctions++;log(s,w.name+' won '+TILES[a.tile].name+' for '+fmt(a.high)+'.',ev);
 if(a.initiator!=null&&a.initiator!==w.id&&!P(s,a.initiator).out)gain(s,a.initiator,R.auctionFee,'introduction fee',ev)}

// ---------- legal actions ----------
function legal(s,pid){const pd=pending(s);if(s.over)return[];const p=P(s,pid),out=[];
 if(pd.kind==='debt'){if(pd.pid!==pid)return[];for(const i of owned(s,pid)){const o=s.own[i];if(o.stage>0&&!DISTRICTS[TILES[i].district]?.some(j=>s.own[j]&&s.own[j].owner===pid&&s.own[j].stage>o.stage))out.push({type:'sell',tile:i,value:Math.round(TILES[i].upgrades[o.stage-1]*R.sellBack)});
  if(!o.mortgaged&&!(o.stage>0)&&!(TILES[i].district&&DISTRICTS[TILES[i].district].some(j=>s.own[j]&&s.own[j].stage>0)))out.push({type:'mortgage',tile:i,value:Math.round(TILES[i].price*R.mortgage)})}
  out.push({type:'bankrupt'});return out}
 if(pd.pid!==pid)return[];
 if(pd.kind==='roll')return[{type:'roll'}];
 if(pd.kind==='buy'){const t=TILES[pd.tile],d=discountFor(p,'buy',t.price),cost=t.price-d.amount;if(p.cash>=cost)out.push({type:'buy',cost,discount:d.amount});out.push({type:'decline'});return out}
 if(pd.kind==='auction'){const steps=R.bidSteps.map(x=>Math.max(pd.high+x,10));for(const b of steps)if(p.cash>=b)out.push({type:'bid',amount:b});out.push({type:'pass'});return out}
 if(pd.kind==='card'){return pd.options.map(([k])=>({type:'choose',option:k}))}
 if(pd.kind==='preview'){return pd.cards.map(c=>({type:'keep',card:c}))}
 if(pd.kind==='trade'){if(pd.to===pid)return[{type:'accept'},{type:'reject'}];return[]}
 if(pd.kind==='corner'){const c=CORNER_INFO[pd.tile];
  if(pd.step==='choose'){for(const [k] of c.options){if(k==='auction'&&!TILES.some(t=>isOwnable(t.i)&&!s.own[t.i]))continue;if(k==='express'&&p.cash<R.expressFare)continue;if(k==='preview'&&p.cards.length>=R.handLimit)continue;out.push({type:'choose',option:k})}if(!out.length||pd.tile===25)out.push({type:'choose',option:'skip'});return out}
  if(pd.step==='district')return Object.keys(DISTRICTS).map(d=>({type:'district',district:d}));
  if(pd.step==='auction')return TILES.filter(t=>isOwnable(t.i)&&!s.own[t.i]).map(t=>({type:'pickTile',tile:t.i}));
  if(pd.step==='express')return STATIONS.filter(i=>i!==p.pos).map(i=>({type:'pickTile',tile:i}));
  if(pd.step==='deal')return[{type:'cancel'}];
  return out}
 if(pd.kind==='action'){for(const i of owned(s,pid)){const o=s.own[i],t=TILES[i];
   const u=canUpgrade(s,i,pid);if(u.ok){const base=upgradeCost(s,i,pid),d=discountFor(p,'upgrade',base);if(p.cash>=base-d.amount)out.push({type:'build',tile:i,cost:base-d.amount})}
   if(o.mortgaged){const c=Math.round(TILES[i].price*R.mortgage*R.redeem);if(p.cash>=c)out.push({type:'redeem',tile:i,cost:c})}}
  for(let k=0;k<p.cards.length;k++)out.push({type:'useCard',index:k});
  out.push({type:'end'});return out}
 return out}

// ---------- actions ----------
function act(s,pid,a){const ev=[];if(s.over)return{ok:false,error:'Match over',events:ev};const pd=pending(s),p=P(s,pid);
 const fail=e=>({ok:false,error:e,events:ev}),ok=()=>{afterAction(s,ev);return{ok:true,events:ev}};
 if(!a||typeof a.type!=='string')return fail('No action');
 if(pd.kind==='debt'){if(pd.pid!==pid)return fail('Not your decision');
  if(a.type==='sell'){const o=s.own[a.tile];if(!o||o.owner!==pid||!o.stage)return fail('Nothing to sell');const v=Math.round(TILES[a.tile].upgrades[o.stage-1]*R.sellBack);o.stage--;p.cash+=v;log(s,p.name+' sold a building on '+TILES[a.tile].name+' for '+fmt(v)+'.',ev);settleDebt(s,ev);return ok()}
  if(a.type==='mortgage'){const o=s.own[a.tile];if(!o||o.owner!==pid||o.mortgaged||o.stage)return fail('Cannot mortgage');const v=Math.round(TILES[a.tile].price*R.mortgage);o.mortgaged=true;p.cash+=v;log(s,p.name+' mortgaged '+TILES[a.tile].name+' for '+fmt(v)+'.',ev);settleDebt(s,ev);return ok()}
  if(a.type==='bankrupt'){bankrupt(s,pid,pd.to,ev);return ok()}return fail('Raise cash or declare bankruptcy')}
 if(pd.pid!==pid&&!(pd.kind==='trade'&&pd.to===pid))return fail('Not your turn');
 switch(pd.kind){
 case'roll':{if(a.type!=='roll')return fail('Roll the dice');const d=[1+Math.floor(rng(s)*6),1+Math.floor(rng(s)*6)];s.turn.dice=d;s.turn.rolled=true;s.turn.phase='action';ev.push({type:'dice',pid,dice:d});log(s,p.name+' rolled '+d[0]+' + '+d[1]+'.',ev);
  move(s,pid,d[0]+d[1],ev);if(!s.pending)land(s,pid,ev);return ok()}
 case'buy':{const t=TILES[pd.tile];if(a.type==='buy'){const d=discountFor(p,'buy',t.price),cost=t.price-d.amount;if(p.cash<cost)return fail('Not enough cash');p.cash-=cost;useDiscount(p,d);s.own[pd.tile]={owner:pid,stage:0,mortgaged:false};p.st.buys++;s.pending=null;ev.push({type:'bought',pid,tile:pd.tile});log(s,p.name+' bought '+t.name+' for '+fmt(cost)+'.',ev);return ok()}
  if(a.type==='decline'){s.pending=null;log(s,p.name+' declined '+t.name+'.',ev);startAuction(s,pd.tile,null,ev);return ok()}return fail('Buy or decline')}
 case'auction':{if(a.type==='bid'){const amt=Math.round(a.amount);if(!(amt>pd.high)||amt>p.cash)return fail('Invalid bid');pd.high=amt;pd.highPid=pid;log(s,p.name+' bid '+fmt(amt)+'.',ev);nextBidder(s);return ok()}
  if(a.type==='pass'){pd.passed.push(pid);nextBidder(s);return ok()}return fail('Bid or pass')}
 case'card':{const opt=String(a.option||'');
  if(pd.card==='spotlight'&&opt.startsWith('tile:')){const i=+opt.slice(5);if(!s.own[i]||s.own[i].owner!==pid)return fail('Pick your property');p.spotlight=i;s.pending=null;log(s,p.name+' put the spotlight on '+TILES[i].name+'.',ev);return ok()}
  if(pd.card==='investor'){s.pending=null;if(opt==='accept'){p.cash+=300;p.loan={repay:350};log(s,p.name+' took 300 CC from a Private Investor (repay 350 CC after Start).',ev)}else log(s,p.name+' declined the Private Investor.',ev);return ok()}
  if(pd.card==='grant'){s.pending=null;if(opt==='voucher'){p.discounts.push({kind:'upgrade',amount:200,label:'Community Grant'});log(s,p.name+' kept a 200 CC upgrade discount.',ev)}else gain(s,pid,150,'Community Grant',ev);return ok()}
  return fail('Choose an option')}
 case'preview':{if(a.type!=='keep'||!pd.cards.includes(a.card))return fail('Keep one card');p.cards.push(a.card);for(const c of pd.cards)if(c!==a.card)s.deck.push(c);s.pending=null;log(s,p.name+' kept '+CARDS[a.card].name+' for later.',ev);return ok()}
 case'trade':{if(pid!==pd.to)return fail('Waiting for the other player');s.pending=null;if(a.type==='accept'){if(!tradeValid(s,pd))return fail('Trade no longer possible');doTrade(s,pd,ev);return ok()}log(s,P(s,pd.to).name+' declined the deal.',ev);return ok()}
 case'corner':return cornerAct(s,pid,pd,a,ev,fail,ok);
 case'action':{
  if(a.type==='build'){const u=canUpgrade(s,a.tile,pid);if(!u.ok)return fail(u.why);const base=upgradeCost(s,a.tile,pid),d=discountFor(p,'upgrade',base),cost=base-d.amount;if(p.cash<cost)return fail('Not enough cash');p.cash-=cost;useDiscount(p,d);s.own[a.tile].stage++;s.own[a.tile].spent=(s.own[a.tile].spent||0)+cost;p.st.builds++;ev.push({type:'built',pid,tile:a.tile,stage:s.own[a.tile].stage});log(s,p.name+' built a '+STAGES[s.own[a.tile].stage]+' on '+TILES[a.tile].name+' for '+fmt(cost)+'.',ev);return ok()}
  if(a.type==='redeem'){const o=s.own[a.tile];if(!o||o.owner!==pid||!o.mortgaged)return fail('Not mortgaged');const c=Math.round(TILES[a.tile].price*R.mortgage*R.redeem);if(p.cash<c)return fail('Not enough cash');p.cash-=c;o.mortgaged=false;log(s,p.name+' redeemed '+TILES[a.tile].name+'.',ev);return ok()}
  if(a.type==='useCard'){const c=p.cards[a.index];if(c==null)return fail('No card');p.cards.splice(a.index,1);log(s,p.name+' played '+CARDS[c].name+'.',ev);resolveCard(s,pid,c,ev);return ok()}
  if(a.type==='offer'){const o={kind:'trade',pid,from:pid,to:a.to,give:a.give||{},get:a.get||{},rebate:false};if(!tradeValid(s,o))return fail('Invalid trade');s.pending=o;log(s,p.name+' offered a deal to '+P(s,a.to).name+'.',ev);return ok()}
  if(a.type==='end'){endTurn(s,ev);return ok()}return fail('Unknown action')}}
 return fail('Unknown state')}
function useDiscount(p,d){if(!d||!d.which)return;if(d.which==='charter')p.charter=null;else p.discounts.splice(p.discounts.indexOf(d.which),1)}
function cornerAct(s,pid,pd,a,ev,fail,ok){const p=P(s,pid),c=CORNER_INFO[pd.tile];
 if(pd.step==='choose'){if(a.type!=='choose')return fail('Choose an option');const opt=a.option;
  if(opt==='skip'){s.pending=null;log(s,p.name+' made no '+c.title+' move.',ev);return ok()}
  if(!legal(s,pid).some(x=>x.option===opt))return fail('Not available');ev.push({type:'corner',pid,tile:pd.tile,option:opt});
  switch(opt){
   case'developer':case'investor':case'protector':p.charter=opt;s.pending=null;log(s,p.name+' took the '+opt[0].toUpperCase()+opt.slice(1)+' Charter.',ev);return ok();
   case'shield':p.shield={amount:R.shield,until:p.turns+1};s.pending=null;log(s,p.name+' took a Rent Shield (up to 300 CC).',ev);return ok();
   case'preview':{const cards=[];for(let k=0;k<3;k++){if(!s.deck.length){s.deck=shuffle(s,s.discard);s.discard=[]}if(s.deck.length)cards.push(s.deck.shift())}s.pending={kind:'preview',pid,cards};return ok()}
   case'drive':case'tenant':s.civic={type:opt,by:pid,until:p.turns+1};s.pending=null;log(s,p.name+' passed '+(opt==='drive'?'Development Drive: upgrades cost 20% less':'Tenant Protection: all rent is 30% lower')+' for one round.',ev);return ok();
   case'boom':case'correction':pd.step='district';pd.option=opt;return ok();
   case'auction':pd.step='auction';return ok();
   case'deal':pd.step='deal';return ok();
   case'express':pd.step='express';return ok();
   case'dividend':{const n=countType(s,STATIONS,pid);s.pending=null;const v=Math.min(R.dividendCap,n*R.dividend);if(v)gain(s,pid,v,'Transit Dividend',ev);else log(s,p.name+' owns no Transit stations, so the dividend is 0 CC.',ev);return ok()}}
  return fail('Unknown option')}
 if(pd.step==='district'){if(a.type!=='district'||!DISTRICTS[a.district])return fail('Pick a district');s.market={type:pd.option,district:a.district,by:pid,until:p.turns+1};s.pending=null;ev.push({type:'market',district:a.district,option:pd.option});log(s,p.name+' triggered a '+(pd.option==='boom'?'Boom (+50% rent)':'Correction (−40% rent)')+' in the '+DISTRICT_NAMES[a.district]+' district for one round.',ev);return ok()}
 if(pd.step==='auction'){if(a.type!=='pickTile'||!isOwnable(a.tile)||s.own[a.tile])return fail('Pick an unowned property');s.pending=null;startAuction(s,a.tile,pid,ev);return ok()}
 if(pd.step==='express'){if(a.type!=='pickTile'||!STATIONS.includes(a.tile))return fail('Pick a Transit station');if(p.cash<R.expressFare)return fail('Not enough cash');p.cash-=R.expressFare;log(s,p.name+' paid '+fmt(R.expressFare)+' for the Express Route to '+TILES[a.tile].name+'.',ev);
  const from=p.pos,steps=(a.tile-from+N)%N;move(s,pid,steps,ev,{salary:false});ev[ev.length-1].express=true;s.pending=null;land(s,pid,ev,{viaExpress:true});return ok()}
 if(pd.step==='deal'){if(a.type==='cancel'){s.pending=null;log(s,p.name+' closed the Deal Desk.',ev);return ok()}
  if(a.type==='offer'){const o={kind:'trade',pid,from:pid,to:a.to,give:a.give||{},get:a.get||{},rebate:true};if(!tradeValid(s,o))return fail('Invalid trade');s.pending=o;log(s,p.name+' offered a Deal Desk trade to '+P(s,a.to).name+'.',ev);return ok()}return fail('Make an offer or cancel')}
 return fail('Unknown step')}
function tradeValid(s,o){const from=P(s,o.from),to=P(s,o.to);if(!from||!to||to.out||from.id===to.id)return false;const g=o.give||{},r=o.get||{};
 const tiles=(x,pid)=>(x.tiles||[]).every(i=>s.own[i]&&s.own[i].owner===pid&&!s.own[i].stage&&!(TILES[i].district&&DISTRICTS[TILES[i].district].some(j=>s.own[j]&&s.own[j].stage)));
 const cg=Math.max(0,Math.round(g.cash||0)),cr=Math.max(0,Math.round(r.cash||0));
 return tiles(g,o.from)&&tiles(r,o.to)&&cg<=from.cash&&cr<=to.cash&&((g.tiles||[]).length+(r.tiles||[]).length+cg+cr)>0}
function doTrade(s,o,ev){const from=P(s,o.from),to=P(s,o.to),g=o.give||{},r=o.get||{};
 for(const i of g.tiles||[])s.own[i].owner=to.id;for(const i of r.tiles||[])s.own[i].owner=from.id;
 const cg=Math.round(g.cash||0),cr=Math.round(r.cash||0);from.cash-=cg;to.cash+=cg;to.cash-=cr;from.cash+=cr;from.st.trades++;to.st.trades++;
 log(s,from.name+' and '+to.name+' closed a deal.',ev);ev.push({type:'trade',from:from.id,to:to.id});
 if(o.rebate){gain(s,from.id,R.dealRebate,'brokerage rebate',ev);gain(s,to.id,R.dealRebate,'brokerage rebate',ev)}}
function settleDebt(s,ev){const d=s.pending;if(!d||d.kind!=='debt')return;const p=P(s,d.pid);if(p.cash>=d.amount){p.cash-=d.amount;if(d.to!=null)P(s,d.to).cash+=d.amount;log(s,p.name+' paid '+fmt(d.amount)+(d.reason?' ('+d.reason+')':'')+'.',ev);s.pending=d.resume||null}}
function bankrupt(s,pid,to,ev){const p=P(s,pid);p.out=true;log(s,p.name+' is bankrupt.',ev);ev.push({type:'bankrupt',pid});
 for(const i of owned(s,pid)){if(to!=null&&!P(s,to).out){s.own[i].owner=to;s.own[i].stage=0}else s.own[i]=null}
 if(to!=null)P(s,to).cash+=Math.max(0,p.cash);p.cash=0;s.pending=null;
 if(s.market&&s.market.by===pid)s.market=null;if(s.civic&&s.civic.by===pid)s.civic=null;
 if(active(s).length<=1){finish(s,ev);return}if(s.turn.pid===pid)endTurn(s,ev)}
function endTurn(s,ev){const p=P(s,s.turn.pid);p.turns++;
 if(p.shield&&p.turns>p.shield.until){p.shield=null}
 if(s.market&&s.market.by===p.id&&p.turns>s.market.until){log(s,'The '+DISTRICT_NAMES[s.market.district]+' district market effect ended.',ev);s.market=null}
 if(s.civic&&s.civic.by===p.id&&p.turns>s.civic.until){log(s,'The city ordinance ended.',ev);s.civic=null}
 if(active(s).every(q=>q.turns>=s.cfg.turns)){finish(s,ev);return}
 let k=s.turn.pid;for(let n=0;n<s.players.length;n++){k=(k+1)%s.players.length;if(!P(s,k).out&&P(s,k).turns<s.cfg.turns)break}
 s.round=Math.min(s.cfg.turns,Math.min(...active(s).map(q=>q.turns))+1);
 s.turn={pid:k,phase:'roll',dice:null,rolled:false,cornerUsed:false};ev.push({type:'turn',pid:k});log(s,P(s,k).name==='You'?'Your turn.':P(s,k).name+'’s turn.',ev)}
function afterAction(s,ev){if(s.over)return;if(s.pending&&s.pending.kind==='debt'){const d=s.pending;if(liquidity(s,d.pid)<d.amount&&legal(s,d.pid).every(x=>x.type==='bankrupt')){bankrupt(s,d.pid,d.to,ev)}}}
function finish(s,ev){s.over=true;s.turn.phase='over';s.pending=null;const res=s.players.map(p=>({pid:p.id,name:p.name,out:p.out,...cityValue(s,p.id)}));
 res.sort((a,b)=>(a.out-b.out)||(b.total-a.total)||(b.sets-a.sets)||(b.cash-a.cash));s.results=res;s.winner=res[0].pid;log(s,P(s,s.winner).name+' wins with a City Value of '+fmt(res[0].total)+'!',ev);ev.push({type:'over',winner:s.winner})}

function closeMatch(s, declareBankruptcy=false){
 if(!s||s.over)return false;
 const events=[];
 s.closedFromMenu=true;
 if(declareBankruptcy)bankrupt(s,0,null,events);
 if(!s.over)finish(s,events);
 return true;
}

// ---------- computer players ----------
function ai(s,pid){const L=legal(s,pid),pd=pending(s),p=P(s,pid);if(!L.length)return null;const has=t=>L.find(x=>x.type===t);
 const reserve=250+40*Math.max(0,s.cfg.turns-p.turns)/3;
 if(pd.kind==='debt'){return L.find(x=>x.type==='sell')||L.find(x=>x.type==='mortgage')||{type:'bankrupt'}}
 if(pd.kind==='roll')return{type:'roll'};
 if(pd.kind==='buy'){const b=has('buy');const t=TILES[pd.tile];const d=t.district,mine=d?countIn(s,d,pid):0;if(b&&(p.cash-b.cost>=reserve*.6||mine>=1&&p.cash-b.cost>=60))return b;return{type:'decline'}}
 if(pd.kind==='auction'){const t=TILES[pd.tile],d=t.district,val=t.price*(d&&countIn(s,d,pid)>=1?1.35:t.type==='property'?1.0:.9);const cap=Math.min(val,p.cash-120);const bids=L.filter(x=>x.type==='bid').sort((a,b)=>a.amount-b.amount);const room=cap-pd.high;const bid=room>250?bids.find(x=>x.amount>=pd.high+100&&x.amount<=cap):room>80?bids.find(x=>x.amount>=pd.high+50&&x.amount<=cap):null;const pick=bid||bids[0];if(pick&&pick.amount<=cap)return pick;return{type:'pass'}}
 if(pd.kind==='card'){if(pd.card==='investor')return{type:'choose',option:p.cash<400?'accept':'decline'};if(pd.card==='grant')return{type:'choose',option:canAnyBuild(s,pid)?'voucher':'cash'};return{type:'choose',option:pd.options.sort((a,b)=>rentOfTile(s,b[0])-rentOfTile(s,a[0]))[0][0]}}
 if(pd.kind==='preview')return{type:'keep',card:pd.cards.slice().sort((a,b)=>cardScore(b)-cardScore(a))[0]};
 if(pd.kind==='trade')return aiTrade(s,pd)?{type:'accept'}:{type:'reject'};
 if(pd.kind==='corner'){const opts=L.map(x=>x.option);
  if(pd.step==='choose'){if(pd.tile===0)return{type:'choose',option:TILES.filter(t=>isOwnable(t.i)&&!s.own[t.i]).length>8?'investor':canAnyBuild(s,pid)?'developer':'protector'};
   if(pd.tile===6)return{type:'choose',option:opts.includes('shield')&&p.cash<900?'shield':opts.includes('preview')?'preview':'shield'};
   if(pd.tile===13)return{type:'choose',option:canAnyBuild(s,pid)?'drive':'tenant'};
   if(pd.tile===19)return{type:'choose',option:bestOwnDistrict(s,pid)?'boom':'correction'};
   if(pd.tile===25)return{type:'choose',option:opts.includes('auction')&&p.cash>500?'auction':'skip'};
   if(pd.tile===31){const n=countType(s,STATIONS,pid);const free=STATIONS.filter(i=>!s.own[i]&&i!==p.pos);return{type:'choose',option:n===0&&free.length&&p.cash>600&&opts.includes('express')?'express':'dividend'}}}
  if(pd.step==='district'){const d=pd.option==='boom'?bestOwnDistrict(s,pid):bestRivalDistrict(s,pid);return{type:'district',district:d||'blue'}}
  if(pd.step==='auction'){const free=L.map(x=>x.tile).sort((a,b)=>(countIn(s,TILES[b].district||'blue',pid)-countIn(s,TILES[a].district||'blue',pid))||TILES[a].price-TILES[b].price);return{type:'pickTile',tile:free[0]}}
  if(pd.step==='express'){const free=L.map(x=>x.tile).filter(i=>!s.own[i]);return{type:'pickTile',tile:(free[0]!=null?free[0]:L[0].tile)}}
  if(pd.step==='deal')return{type:'cancel'}}
 if(pd.kind==='action'){const builds=L.filter(x=>x.type==='build'&&p.cash-x.cost>=reserve).sort((a,b)=>a.cost-b.cost);if(builds.length)return builds[0];
  const red=L.find(x=>x.type==='redeem'&&p.cash-x.cost>=reserve*1.5);if(red)return red;
  const card=L.find(x=>x.type==='useCard'&&['festival','windfall','grant','spotlight','investor'].includes(CARDS[p.cards[x.index]].id));if(card)return card;
  return{type:'end'}}
 return L[0]}
function canAnyBuild(s,pid){return owned(s,pid).some(i=>canUpgrade(s,i,pid).ok)}
function rentOfTile(s,opt){const i=+String(opt).slice(5);return isNaN(i)?0:rent(s,i)}
function cardScore(c){return{festival:3,grant:3,rush:2,windfall:2,spotlight:2,investor:1,tender:1,repairs:-2}[CARDS[c].id]||0}
function bestOwnDistrict(s,pid){let best=null,v=0;for(const d in DISTRICTS){const n=countIn(s,d,pid),others=DISTRICTS[d].some(i=>s.own[i]&&s.own[i].owner!==pid);const score=n*2-(others?1:0);if(n>=1&&score>v){v=score;best=d}}return best}
function bestRivalDistrict(s,pid){let best=null,v=-1;for(const d in DISTRICTS){let sc=0;for(const i of DISTRICTS[d]){const o=s.own[i];if(o&&o.owner!==pid)sc+=1+o.stage*2;if(o&&o.owner===pid)sc-=3}if(sc>v){v=sc;best=d}}return best}
function aiTrade(s,o){const me=o.to,val=(tiles,pid)=>(tiles||[]).reduce((n,i)=>n+TILES[i].price*(TILES[i].district&&countIn(s,TILES[i].district,pid)>=2?1.6:1),0);
 const gets=val((o.give||{}).tiles,me)+((o.give||{}).cash||0)+(o.rebate?R.dealRebate:0),gives=val((o.get||{}).tiles,me)*1.15+((o.get||{}).cash||0);
 if((o.get||{}).tiles&&o.get.tiles.some(i=>TILES[i].district&&fullDistrict(s,TILES[i].district,me)))return false;return gets>=gives&&gets>0}

// ---------- read model, saves, career ----------
function view(s){return{ruleset:s.ruleset,round:s.round,turns:s.cfg.turns,turn:s.turn,pending:pending(s),market:s.market,civic:s.civic,over:s.over,winner:s.winner,results:s.results,
 players:s.players.map(p=>({...p,value:cityValue(s,p.id).total})),own:s.own,log:s.log.slice(-12)}}
function serialize(s){return JSON.stringify(s)}
function restore(str){try{const s=typeof str==='string'?JSON.parse(str):clone(str);if(!s||s.ruleset!==RULESET||s.version!==VERSION||!Array.isArray(s.players)||s.own.length!==N)return{ok:false,error:'incompatible save'};return{ok:true,state:s}}catch(e){return{ok:false,error:'unreadable save'}}}
function careerFacts(s,{ownerSeat=0,endedAt=Date.now()}={}){const owner=P(s,ownerSeat),m=s.meta||{};const st=owner.st;
 const challenges=Object.keys(DISTRICTS).filter(d=>fullDistrict(s,d,ownerSeat)).map(d=>({id:'cv-district-'+d,tag:'district'}));
 const rank=s.results?Math.max(0,s.results.findIndex(r=>r.pid===ownerSeat)):null;
 return{board:'circuit',ruleset:RULESET,rank,length:s.cfg.length,matchId:m.matchId,startedAt:m.startedAt,endedAt,over:!!s.over,ownerHuman:!!owner&&!owner.ai,
  rounds:Math.min(...s.players.filter(p=>!p.out||p.id===ownerSeat).map(p=>p.turns)),activity:st.buys+st.builds+st.trades+st.auctions+st.corners,
  won:s.winner===ownerSeat,score:cityValue(s,ownerSeat).total,aiOpponents:s.players.filter(p=>p.ai).length,aiLevel:'normal',experimental:LENGTHS[s.cfg.length].experimental,challenges}}
return Object.freeze({closeMatch,RULESET,VERSION,SAVE_KEY,TILES,N,CORNERS,STATIONS,UTILITIES,DISTRICTS,DISTRICT_NAMES,DISTRICT_COLORS,STAGES,CARDS,CORNER_INFO,RULES:R,LENGTHS,
 newMatch,pending,legal,act,ai,rent,upgradeCost,canUpgrade,cityValue,view,serialize,restore,careerFacts,owned,fullDistrict,countIn});
});
