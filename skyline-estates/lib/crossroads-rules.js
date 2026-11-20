/* Crossroads Capital — Landmark Chase (Career Board 3, owner decision 21 Nov 2026).
   Headless, DOM-free, deterministic rules from the owner's design package (GAME_RULES.md, board_graph.json,
   contracts.json, city_headlines.json, city_moments.json). Separate from every other mode and save.

   API: CC.newMatch(opts) → state · CC.pending(s) → {kind,pid,...} · CC.legal(s,pid) → actions
        CC.act(s,pid,action) → {ok,error?,events} · CC.ai(s,pid) → action · CC.rent(s,id,dice) · CC.score(s,pid)
        CC.careerFacts(s,opts) · CC.serialize/CC.restore. State is plain JSON so saves resume exactly. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.CrossroadsCapital=m})(typeof self!=='undefined'?self:this,function(){'use strict';
const RULESET='crossroads-lc-v1',VERSION=1,SAVE_KEY='skylineCrossroadsSave';
const DATA={"tiles":[{"id":"START","name":"Start / Payday","type":"start","next":["W00","E00"]},{"id":"SKY","name":"Skybridge Bonus","type":"skybridge","next":["EXCHANGE"]},{"id":"EXCHANGE","name":"Grand Exchange","type":"exchange","next":["START"]},{"id":"W00","name":"Event Card","type":"event","next":["W01"],"loop":"west"},{"id":"W01","name":"Rivergate Avenue","type":"property","next":["W02"],"loop":"west","group":"red","price":140,"rent":13,"build":140},{"id":"W02","name":"Foundry Square","type":"property","next":["W03"],"loop":"west","group":"red","price":160,"rent":14,"build":140},{"id":"W03","name":"Millstone Row","type":"property","next":["W04"],"loop":"west","group":"red","price":180,"rent":16,"build":160},{"id":"W04","name":"City Tax","type":"tax","next":["W05"],"loop":"west"},{"id":"W05","name":"Maple Grove","type":"property","next":["W06"],"loop":"west","group":"green","price":200,"rent":18,"build":160},{"id":"W06","name":"Cedar Terrace","type":"property","next":["W07"],"loop":"west","group":"green","price":220,"rent":20,"build":160},{"id":"W07","name":"Waterworks","type":"utility","next":["W08"],"loop":"west","price":150},{"id":"W08","name":"Willow Heights","type":"property","next":["W09"],"loop":"west","group":"green","price":240,"rent":22,"build":180},{"id":"W09","name":"Lakeside Villas","type":"property","next":["W10"],"loop":"west","group":"green","price":260,"rent":23,"build":180},{"id":"W10","name":"Metro West Line","type":"metro","next":["W11"],"loop":"west"},{"id":"W11","name":"Riverside Pier","type":"property","next":["W12"],"loop":"west","group":"purple","price":280,"rent":25,"build":200},{"id":"W12","name":"Harbor Market","type":"property","next":["W13"],"loop":"west","group":"purple","price":300,"rent":27,"build":200},{"id":"W13","name":"Dockside Lofts","type":"property","next":["W14"],"loop":"west","group":"purple","price":320,"rent":29,"build":200},{"id":"W14","name":"Event Card","type":"event","next":["SKY"],"loop":"west"},{"id":"E00","name":"Event Card","type":"event","next":["E01"],"loop":"east"},{"id":"E01","name":"Pinecrest Lane","type":"property","next":["E02"],"loop":"east","group":"blue","price":520,"rent":47,"build":280},{"id":"E02","name":"Beacon Circle","type":"property","next":["E03"],"loop":"east","group":"blue","price":500,"rent":45,"build":280},{"id":"E03","name":"Skyview Avenue","type":"property","next":["E04"],"loop":"east","group":"blue","price":480,"rent":43,"build":280},{"id":"E04","name":"Development Fee","type":"fee","next":["E05"],"loop":"east"},{"id":"E05","name":"Valley Gardens","type":"property","next":["E06"],"loop":"east","group":"orange","price":460,"rent":41,"build":260},{"id":"E06","name":"Meadow Point","type":"property","next":["E07"],"loop":"east","group":"orange","price":440,"rent":40,"build":260},{"id":"E07","name":"Power Grid","type":"utility","next":["E08"],"loop":"east","price":150},{"id":"E08","name":"Sunridge Estates","type":"property","next":["E09"],"loop":"east","group":"orange","price":420,"rent":38,"build":240},{"id":"E09","name":"Orchard Hills","type":"property","next":["E10"],"loop":"east","group":"orange","price":400,"rent":36,"build":240},{"id":"E10","name":"Metro East Line","type":"metro","next":["E11"],"loop":"east"},{"id":"E11","name":"Highland Residences","type":"property","next":["E12"],"loop":"east","group":"rust","price":380,"rent":34,"build":240},{"id":"E12","name":"Crestview Towers","type":"property","next":["E13"],"loop":"east","group":"rust","price":360,"rent":32,"build":220},{"id":"E13","name":"Summit Plaza","type":"property","next":["E14"],"loop":"east","group":"rust","price":340,"rent":31,"build":220},{"id":"E14","name":"Event Card","type":"event","next":["SKY"],"loop":"east"}],"groups":{"red":["W01","W02","W03"],"green":["W05","W06","W08","W09"],"purple":["W11","W12","W13"],"blue":["E01","E02","E03"],"orange":["E05","E06","E08","E09"],"rust":["E11","E12","E13"]},"chains":[{"id":"river_to_ridge","name":"River to Ridge","landmark":"Marina","stages":[{"label":"Buy or upgrade in Riverside","condition":"property_invest","loop":"west"},{"label":"Land exactly on Grand Exchange","condition":"land_on","tile":"EXCHANGE"},{"label":"Buy or upgrade in Highland","condition":"property_invest","loop":"east"}]},{"id":"highland_link","name":"Highland Link","landmark":"Mountain Gallery","stages":[{"label":"Invest in Highland","condition":"property_invest","loop":"east"},{"label":"Pass or land on Start","condition":"pass_or_land","tile":"START"},{"label":"Invest in Riverside","condition":"property_invest","loop":"west"}]},{"id":"connected_communities","name":"Connected Communities","landmark":"Train Museum","stages":[{"label":"Visit either Metro station","condition":"land_on_type","type":"metro"},{"label":"Own a property in the opposite loop","condition":"own_property_other_loop"},{"label":"Upgrade property in that loop","condition":"upgrade_other_loop"}]},{"id":"neighborhood_revival","name":"Neighborhood Revival","landmark":"Arts Pavilion","stages":[{"label":"Visit City Tax or an Event","condition":"land_on_type","types":["tax","event"]},{"label":"Upgrade one owned property","condition":"upgrade_any"},{"label":"Pass or land on Start","condition":"pass_or_land","tile":"START"}]},{"id":"waterfront_renaissance","name":"Waterfront Renaissance","landmark":"Harbor Lighthouse","stages":[{"label":"Own a Riverside property","condition":"own_property","loop":"west"},{"label":"Upgrade a Riverside property","condition":"upgrade_any","loop":"west"},{"label":"Visit Skybridge","condition":"land_on","tile":"SKY"}]},{"id":"rise_of_highland","name":"Rise of Highland","landmark":"Hill Observatory","stages":[{"label":"Own a Highland property","condition":"own_property","loop":"east"},{"label":"Own two Highland properties","condition":"own_property_count","loop":"east","count":2},{"label":"Visit Grand Exchange","condition":"land_on","tile":"EXCHANGE"}]},{"id":"bright_future","name":"Bright Future","landmark":"Eco Conservatory","stages":[{"label":"Visit Waterworks or Power Grid","condition":"land_on_type","type":"utility"},{"label":"Upgrade any property","condition":"upgrade_any"},{"label":"Collect salary at Start","condition":"collect_salary"}]},{"id":"creative_districts","name":"Creative Districts","landmark":"Open-Air Theatre","stages":[{"label":"Choose an Event outcome","condition":"resolve_event"},{"label":"Invest in a different loop than prior investment","condition":"property_invest_other_loop"},{"label":"Visit Grand Exchange","condition":"land_on","tile":"EXCHANGE"}]},{"id":"east_west_pact","name":"East-West Pact","landmark":"Cross-City Bridge","stages":[{"label":"Buy one Riverside property","condition":"purchase_property","loop":"west"},{"label":"Buy one Highland property","condition":"purchase_property","loop":"east"},{"label":"Visit Skybridge","condition":"land_on","tile":"SKY"}]},{"id":"new_landmarks","name":"New Landmarks","landmark":"Public Library","stages":[{"label":"Buy any property","condition":"purchase_property"},{"label":"Upgrade it","condition":"upgrade_owned"},{"label":"Make a second upgrade anywhere","condition":"upgrade_any"}]},{"id":"grand_opening","name":"Grand Opening","landmark":"Grand Arcade","stages":[{"label":"Own any two properties","condition":"own_property_count","count":2},{"label":"Visit Grand Exchange","condition":"land_on","tile":"EXCHANGE"},{"label":"Upgrade a property","condition":"upgrade_any"}]},{"id":"green_corridor","name":"Green Corridor","landmark":"City Gardens","stages":[{"label":"Visit a Utility","condition":"land_on_type","type":"utility"},{"label":"Own properties on both loops","condition":"own_both_loops"},{"label":"Invest in any property","condition":"property_invest"}]},{"id":"harbor_heritage","name":"Harbor Heritage","landmark":"Heritage Hall","stages":[{"label":"Own Harbor Market or Riverside Pier","condition":"own_one_of","tiles":["W11","W12"]},{"label":"Pass or land on Start","condition":"pass_or_land","tile":"START"},{"label":"Visit an Event tile","condition":"land_on_type","type":"event"}]},{"id":"hilltop_future","name":"Hilltop Future","landmark":"Skyline Museum","stages":[{"label":"Own Crestview Towers or Summit Plaza","condition":"own_one_of","tiles":["E12","E13"]},{"label":"Upgrade property in Highland","condition":"upgrade_any","loop":"east"},{"label":"Visit Metro East","condition":"land_on","tile":"E10"}]},{"id":"two_worlds","name":"Two Worlds","landmark":"Twin Cities Plaza","stages":[{"label":"Make purchase or upgrade in Riverside","condition":"property_invest","loop":"west"},{"label":"Make purchase or upgrade in Highland","condition":"property_invest","loop":"east"},{"label":"Land on the Skybridge","condition":"land_on","tile":"SKY"}]},{"id":"fresh_start","name":"Fresh Start","landmark":"Founders Monument","stages":[{"label":"Receive Start salary","condition":"collect_salary"},{"label":"Resolve an Event choice","condition":"resolve_event"},{"label":"Buy or upgrade a property","condition":"property_invest"}]}],"headlines":[{"id":"waterfront_revival","name":"Waterfront Revival","condition":"first_upgrade_loop","loop":"west","first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"higher_ground","name":"Higher Ground","condition":"first_purchase_loop","loop":"east","first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"transit_week","name":"Transit Week","condition":"visit_both_metros","loop":null,"first_claim_bonus_legacy_points":3,"max_winners_per_chapter":1},{"id":"neighborhood_revival","name":"Neighborhood Revival","condition":"first_contract_claim","loop":null,"first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"open_house_weekend","name":"Open House Weekend","condition":"two_distinct_open_houses","loop":null,"first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"city_bridge","name":"City Bridge","condition":"own_both_loops","loop":null,"first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"renovation_race","name":"Renovation Race","condition":"first_two_upgrades_chapter","loop":null,"first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1},{"id":"marketday","name":"Market Day","condition":"first_trade_accepted","loop":null,"first_claim_bonus_legacy_points":2,"max_winners_per_chapter":1}],"moments":[{"id":"pop_up_festival","name":"Pop-up Festival","choice_a":"Take 100 City Cash","choice_b":"Gain 1 Legacy Point"},{"id":"renovation_crew","name":"Renovation Crew","choice_a":"Apply 100 upgrade discount this turn","choice_b":"Receive 80 City Cash"},{"id":"community_award","name":"Community Award","choice_a":"If you own both loops, gain 1 Legacy Point; else 80 Cash","choice_b":"Take 100 Cash"},{"id":"river_cleanup","name":"River Cleanup","choice_a":"If you own Riverside property, gain 1 LP","choice_b":"Take 70 Cash"},{"id":"mountain_art_fair","name":"Mountain Art Fair","choice_a":"If you own Highland property, gain 1 LP","choice_b":"Take 70 Cash"},{"id":"builders_meet","name":"Builders Meet","choice_a":"Replace incomplete Chain with one of two choices","choice_b":"Receive 100 Cash"},{"id":"friendly_opening","name":"Friendly Opening","choice_a":"Next eligible property build discounted by 100","choice_b":"Receive 60 Cash"},{"id":"grand_preview","name":"Grand Preview","choice_a":"Reveal one City Headline deck card (no effect)","choice_b":"Receive 80 Cash"}]};
const TILES=Object.freeze(DATA.tiles.map(t=>Object.freeze(t))),BY=Object.freeze(Object.fromEntries(TILES.map(t=>[t.id,t])));
const GROUPS=Object.freeze(DATA.groups),CHAINS=Object.freeze(DATA.chains),HEADLINES=Object.freeze(DATA.headlines),MOMENTS=Object.freeze(DATA.moments);
const GROUP_NAMES=Object.freeze({red:'Millstone',green:'Lakeside',purple:'Riverfront',blue:'Pinecrest',orange:'Orchard',rust:'Summit'});
const GROUP_COLORS=Object.freeze({red:'#d63f51',green:'#2bb875',purple:'#8e5cdc',blue:'#2c7fd4',orange:'#f08a2a',rust:'#c4502a'});
const LOOP_NAMES=Object.freeze({west:'Riverside',east:'Highland'});
const STAGES=Object.freeze(['Plot','House 1','House 2','House 3','House 4','Landmark Residence']),MULT=Object.freeze([1,2,3.5,5,7,10]);
const R=Object.freeze({startCash:3000,salary:200,setBonus:.2,reserve:.25,openHouse:50,auctionOpen:.5,bidStep:20,utility:[0,10,18],
 claimLP:5,claimCash:200,skyLP:1,grant:180,bonusPay:100,voucher:100,express:75,survey:60,effVoucher:60,incomeCredit:50,
 tax:[200,250],fee:[150,200],sellBack:.5,mortgage:.5,redeem:1.1,groupLP:2,tallLP:1,worthPer:500});
const LENGTHS=Object.freeze({standard:{turns:15,per:5,experimental:false},quick:{turns:9,per:3,experimental:true}});
const OWNABLE=t=>t.type==='property'||t.type==='utility';
const clone=o=>JSON.parse(JSON.stringify(o));
function rng(s){let t=(s.rng=(s.rng+0x6D2B79F5)>>>0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
function shuffle(s,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const P=(s,pid)=>s.players[pid],active=s=>s.players.filter(p=>!p.out);
const fmt=n=>Math.round(n).toLocaleString('en-US')+' CC';
const who=p=>p.name;
function log(s,text,ev){s.log.push(text);if(s.log.length>60)s.log.shift();if(ev)ev.push({type:'log',text})}
function owned(s,pid){return TILES.filter(t=>s.own[t.id]&&s.own[t.id].owner===pid).map(t=>t.id)}
function fullGroup(s,g,pid){return GROUPS[g].every(id=>s.own[id]&&s.own[id].owner===pid)}
const loopOf=id=>BY[id].loop||null,other=l=>l==='west'?'east':'west';

// ---------- setup ----------
function newMatch(opts={}){
 const seed=(opts.seed>>>0)||((Date.now()^0x5bd1e995)>>>0),length=LENGTHS[opts.length]?opts.length:'standard',L=LENGTHS[length];
 const players=(opts.players&&opts.players.length?opts.players:[{name:'You'},{name:'Mia',ai:true},{name:'Noah',ai:true},{name:'Eva',ai:true}]).slice(0,4).map((p,id)=>({
  id,name:String(p.name||'Player '+(id+1)).slice(0,24),ai:!!p.ai,color:p.color||['#d63f51','#2c7fd4','#2bb875','#8e5cdc'][id],token:p.token||['car','boat','plane','train'][id],
  cash:R.startCash,pos:'START',out:false,turns:0,lp:0,route:null,chain:null,completed:[],voucher:null,reservation:null,metros:[],openHouses:{},chapterOpen:[],chapterUpgrades:0,lastInvestLoop:null,
  st:{buys:0,builds:0,rentPaid:0,rentIn:0,trades:0,hubs:0,claims:0}}));
 if(players.length<2)throw Error('Crossroads Capital needs 2–4 players');
 const s={ruleset:RULESET,version:VERSION,seed,rng:seed,cfg:{length,turns:L.turns,per:L.per},meta:opts.meta||null,players,own:{},
  chainDeck:[],momentDeck:[],headlineDeck:[],chapter:1,headline:null,headlineWinner:null,turn:{pid:0,phase:'roll',dice:null,claimed:false,expressUsed:false,salaryPaid:false},
  pending:null,queue:[],log:[],over:false,winner:null,results:null,landmarks:[]};
 s.chainDeck=shuffle(s,CHAINS.map((_,i)=>i));s.momentDeck=shuffle(s,MOMENTS.map((_,i)=>i));s.headlineDeck=shuffle(s,HEADLINES.map((_,i)=>i));
 let best=-1,first=0;for(const p of players){const r=2+Math.floor(rng(s)*6)+Math.floor(rng(s)*6);if(r>best){best=r;first=p.id}}
 s.turn.pid=first;s.first=first;
 drawHeadline(s,[]);
 // each player chooses one of two Landmark Chains; humans decide, computer players pick at once
 for(const p of players){const offer=drawChains(s,2);if(p.ai)setChain(s,p.id,aiPickChain(s,p.id,offer));else s.queue.push({kind:'chain',pid:p.id,offer,why:'start'})}
 log(s,players[first].name+' rolled highest and goes first.');
 nextQueued(s);return s}
function drawChains(s,n){const out=[];for(let k=0;k<n;k++){if(!s.chainDeck.length)s.chainDeck=shuffle(s,CHAINS.map((_,i)=>i));out.push(s.chainDeck.shift())}return out}
function setChain(s,pid,c){P(s,pid).chain={card:c,stage:0,ref:null}}
function drawHeadline(s,ev){if(!s.headlineDeck.length)s.headlineDeck=shuffle(s,HEADLINES.map((_,i)=>i));s.headline=s.headlineDeck.shift();s.headlineWinner=null;
 for(const p of s.players){p.metros=[];p.chapterOpen=[];p.chapterUpgrades=0}
 log(s,'Chapter '+s.chapter+' headline: '+HEADLINES[s.headline].name+'.',ev);ev.push&&ev.push({type:'headline',id:HEADLINES[s.headline].id})}
function nextQueued(s){if(!s.pending&&s.queue.length)s.pending=s.queue.shift()}

// ---------- rent and value ----------
function stageOf(s,id){return s.own[id]?s.own[id].stage||0:0}
function rent(s,id,dice){const o=s.own[id],t=BY[id];if(!o||o.mortgaged)return 0;
 if(t.type==='utility'){const n=['W07','E07'].filter(u=>s.own[u]&&s.own[u].owner===o.owner).length;const roll=dice?dice[0]+dice[1]:7;return roll*R.utility[n]}
 let r=t.rent*MULT[o.stage||0];if(fullGroup(s,t.group,o.owner))r*=1+R.setBonus;return Math.round(r)}
function canUpgrade(s,id,pid){const o=s.own[id],t=BY[id];if(!o||o.owner!==pid||t.type!=='property')return{ok:false,why:'Not your property'};if(o.mortgaged)return{ok:false,why:'Redeem it first'};
 if(o.stage>=5)return{ok:false,why:'Already a Landmark Residence'};if(o.stage===4&&!fullGroup(s,t.group,pid))return{ok:false,why:'Own the whole '+GROUP_NAMES[t.group]+' group for a Landmark Residence'};return{ok:true}}
function buildCost(s,id,pid){const p=P(s,pid),t=BY[id];const v=p.voucher?Math.min(p.voucher.amount,t.build):0;return{cost:t.build-v,voucher:v}}
function netWorth(s,pid){const p=P(s,pid);let v=p.cash;for(const id of owned(s,pid)){const o=s.own[id],t=BY[id];v+=t.price;v+=Math.round((o.spent||0)*.5);if(o.mortgaged)v-=Math.round(t.price*R.mortgage)}return v}
function score(s,pid){const p=P(s,pid);let groups=0,tall=0;for(const g in GROUPS)if(fullGroup(s,g,pid))groups++;for(const id of owned(s,pid))if(stageOf(s,id)>=3)tall++;
 const worth=netWorth(s,pid);return{lp:p.lp,groups:groups*R.groupLP,tall:tall*R.tallLP,worth:Math.floor(Math.max(0,worth)/R.worthPer),total:p.lp+groups*R.groupLP+tall*R.tallLP+Math.floor(Math.max(0,worth)/R.worthPer),netWorth:worth,chains:p.completed.length,cash:p.cash}}

// ---------- money ----------
function gain(s,pid,n,why,ev){n=Math.round(n);if(!n)return;P(s,pid).cash+=n;log(s,who(P(s,pid))+' received '+fmt(n)+(why?' ('+why+')':'')+'.',ev)}
function lp(s,pid,n,why,ev){P(s,pid).lp+=n;log(s,who(P(s,pid))+' earned '+n+' Legacy Point'+(n===1?'':'s')+(why?' ('+why+')':'')+'.',ev);ev.push({type:'lp',pid,n})}
function pay(s,pid,n,to,why,ev){n=Math.round(n);if(n<=0)return true;const p=P(s,pid);
 if(p.cash>=n){p.cash-=n;if(to!=null)P(s,to).cash+=n;log(s,who(p)+' paid '+fmt(n)+(to!=null?' to '+who(P(s,to)):'')+(why?' ('+why+')':'')+'.',ev);return true}
 s.pending={kind:'debt',pid,amount:n,to,reason:why||'',resume:s.pending};log(s,who(p)+' owes '+fmt(n)+' and must raise cash.',ev);return false}

// ---------- Landmark Chains ----------
function stageMet(s,pid,st,trig,ch){const p=P(s,pid),c=st.condition,loop=st.loop||null;
 const mine=owned(s,pid).filter(id=>BY[id].type==='property');
 switch(c){
  case'property_invest':return trig.kind==='invest'&&(!loop||loopOf(trig.tile)===loop);
  case'purchase_property':return trig.kind==='invest'&&trig.how==='buy'&&BY[trig.tile].type==='property'&&(!loop||loopOf(trig.tile)===loop);
  case'upgrade_any':return trig.kind==='invest'&&trig.how==='upgrade'&&(!loop||loopOf(trig.tile)===loop);
  case'upgrade_owned':return trig.kind==='invest'&&trig.how==='upgrade'&&(!ch.ref||trig.tile===ch.ref);
  case'upgrade_other_loop':return trig.kind==='invest'&&trig.how==='upgrade'&&ch.ref&&loopOf(trig.tile)===ch.ref;
  case'property_invest_other_loop':return trig.kind==='invest'&&trig.prevLoop&&loopOf(trig.tile)&&loopOf(trig.tile)!==trig.prevLoop;
  case'land_on':return trig.kind==='land'&&trig.tile===st.tile;
  case'land_on_type':{const types=st.types||[st.type];return trig.kind==='land'&&types.includes(BY[trig.tile].type)}
  case'pass_or_land':return(trig.kind==='salary')||(trig.kind==='land'&&trig.tile===st.tile);
  case'collect_salary':return trig.kind==='salary';
  case'resolve_event':return trig.kind==='event';
  case'own_property':return trig.kind==='state'&&mine.some(id=>!loop||loopOf(id)===loop);
  case'own_property_count':return trig.kind==='state'&&mine.filter(id=>!loop||loopOf(id)===loop).length>=st.count;
  case'own_property_other_loop':return trig.kind==='state'&&ch.ref&&mine.some(id=>loopOf(id)===ch.ref);
  case'own_both_loops':return trig.kind==='state'&&mine.some(id=>loopOf(id)==='west')&&mine.some(id=>loopOf(id)==='east');
  case'own_one_of':return trig.kind==='state'&&st.tiles.some(id=>s.own[id]&&s.own[id].owner===pid)}
 return false}
// One stamp per independent trigger; ordered stages only; never retroactive.
function progress(s,pid,trig,ev){const p=P(s,pid),ch=p.chain;if(!ch||ch.stage>=3||p.out)return false;const card=CHAINS[ch.card],st=card.stages[ch.stage];
 if(!stageMet(s,pid,st,trig,ch))return false;
 // remember the loop / tile later stages refer to
 if(st.condition==='land_on_type'&&BY[trig.tile].type==='metro')ch.ref=other(loopOf(trig.tile));
 if(st.condition==='own_property_other_loop'&&!ch.ref)ch.ref=null;
 if(st.condition==='purchase_property'&&card.stages[ch.stage+1]&&card.stages[ch.stage+1].condition==='upgrade_owned')ch.ref=trig.tile;
 ch.stage++;ev.push({type:'stamp',pid,stage:ch.stage,chain:card.id});log(s,who(p)+' stamped '+card.name+' ('+ch.stage+'/3).',ev);
 if(ch.stage>=3){log(s,who(p)+' completed '+card.name+' — ready for a Ribbon Cutting!',ev);ev.push({type:'chainComplete',pid})}
 return true}
function stateCheck(s,ev){for(const p of active(s))progress(s,p.id,{kind:'state'},ev)}
function claimable(s,pid){const p=P(s,pid);return!!(p.chain&&p.chain.stage>=3)&&!s.turn.claimed&&s.turn.pid===pid}
function claim(s,pid,ev,{sky=false}={}){const p=P(s,pid),card=CHAINS[p.chain.card];s.turn.claimed=true;p.st.claims++;
 p.completed.push(card.id);lp(s,pid,R.claimLP+(sky?R.skyLP:0),'Ribbon Cutting: '+card.landmark+(sky?' at the Skybridge':''),ev);gain(s,pid,R.claimCash,'landmark grant',ev);
 s.landmarks.push({pid,chain:card.id,landmark:card.landmark,n:p.completed.length});ev.push({type:'landmark',pid,landmark:card.landmark,chain:card.id});
 p.chain=null;headlineCheck(s,pid,{kind:'claim'},ev);
 const offer=drawChains(s,2);if(p.ai)setChain(s,pid,aiPickChain(s,pid,offer));else s.queue.push({kind:'chain',pid,offer,why:'claim'})}
function replaceOffer(s,pid,why){return{kind:'chain',pid,offer:drawChains(s,2),why,keep:true}}

// ---------- City Headlines ----------
function headlineCheck(s,pid,trig,ev){if(s.headlineWinner!=null||s.headline==null)return;const h=HEADLINES[s.headline],p=P(s,pid);let won=false;
 switch(h.condition){
  case'first_upgrade_loop':won=trig.kind==='invest'&&trig.how==='upgrade'&&loopOf(trig.tile)===h.loop;break;
  case'first_purchase_loop':won=trig.kind==='invest'&&trig.how==='buy'&&loopOf(trig.tile)===h.loop;break;
  case'visit_both_metros':won=p.metros.includes('W10')&&p.metros.includes('E10');break;
  case'first_contract_claim':won=trig.kind==='claim';break;
  case'two_distinct_open_houses':won=p.chapterOpen.length>=2;break;
  case'own_both_loops':{const m=owned(s,pid);won=m.some(id=>loopOf(id)==='west')&&m.some(id=>loopOf(id)==='east');break}
  case'first_two_upgrades_chapter':won=p.chapterUpgrades>=2;break;
  case'first_trade_accepted':won=trig.kind==='trade';break}
 if(!won)return;s.headlineWinner=pid;lp(s,pid,h.first_claim_bonus_legacy_points,'won '+h.name,ev);ev.push({type:'headlineWon',pid,id:h.id})}

// ---------- movement ----------
function pending(s){if(s.over)return{kind:'over'};if(s.pending)return s.pending;return{kind:s.turn.phase==='roll'?'roll':'action',pid:s.turn.pid}}
function walk(s,pid,steps,ev,{salary=true}={}){const p=P(s,pid),path=[];
 while(steps>0){const t=BY[p.pos];let nx;
  if(t.next.length>1){const r=p.route;if(!r){s.pending={kind:'route',pid,steps,salary};if(path.length)ev.push({type:'move',pid,path:path.slice()});return false}nx=r==='west'?'W00':'E00';p.route=null}
  else nx=t.next[0];
  p.pos=nx;path.push(nx);steps--;
  if(nx==='START'&&salary&&!s.turn.salaryPaid){s.turn.salaryPaid=true;gain(s,pid,R.salary,'Payday',ev);progress(s,pid,{kind:'salary'},ev)}}
 ev.push({type:'move',pid,path});return true}
function land(s,pid,ev,{express=false}={}){const p=P(s,pid),id=p.pos,t=BY[id];ev.push({type:'land',pid,tile:id});
 progress(s,pid,{kind:'land',tile:id},ev);
 if(t.type==='metro'&&!p.metros.includes(id)){p.metros.push(id);headlineCheck(s,pid,{kind:'land'},ev)}
 switch(t.type){
  case'start':s.pending={kind:'hub',pid,tile:id};p.st.hubs++;return;
  case'exchange':case'skybridge':s.pending={kind:'hub',pid,tile:id};p.st.hubs++;return;
  case'metro':s.pending={kind:'metro',pid,tile:id,express};return;
  case'event':{const cards=[];for(let k=0;k<2;k++){if(!s.momentDeck.length)s.momentDeck=shuffle(s,MOMENTS.map((_,i)=>i));cards.push(s.momentDeck.shift())}s.pending={kind:'event',pid,cards};return}
  case'tax':s.pending={kind:'tax',pid,tile:id};return;
  case'fee':s.pending={kind:'fee',pid,tile:id};return}
 if(OWNABLE(t)){const o=s.own[id];
  if(!o){const res=reservedBy(s,id);if(res!=null&&res!==pid){log(s,t.name+' is reserved by '+who(P(s,res))+'.',ev);return}s.pending={kind:'buy',pid,tile:id};return}
  if(o.owner===pid){if(t.type==='utility'){s.pending={kind:'ownUtil',pid,tile:id};return}s.pending={kind:'own',pid,tile:id};return}
  const due=rent(s,id,s.turn.dice);if(due>0){P(s,pid).st.rentPaid+=due;P(s,o.owner).st.rentIn+=due;ev.push({type:'rent',pid,to:o.owner,amount:due,tile:id});
   s.pending={kind:'rival',pid,tile:id,owner:o.owner};if(!pay(s,pid,due,o.owner,'rent on '+t.name,ev))return;return}
  s.pending={kind:'rival',pid,tile:id,owner:o.owner};return}}
function reservedBy(s,id){for(const p of s.players)if(p.reservation&&p.reservation.tile===id&&!p.out)return p.id;return null}

// ---------- auctions ----------
function startAuction(s,id,ev){const order=[];for(let k=0;k<s.players.length;k++){const q=(s.turn.pid+k)%s.players.length;if(!P(s,q).out)order.push(q)}
 const open=Math.round(BY[id].price*R.auctionOpen/10)*10;
 s.pending={kind:'auction',tile:id,high:open-R.bidStep,highPid:null,open,bidders:order,passed:[],pid:order[0],resume:s.pending&&s.pending.kind!=='auction'?s.pending:null};
 ev.push({type:'auction',tile:id});log(s,'Auction for '+BY[id].name+' opens at '+fmt(open)+'.',ev)}
function nextBidder(s,ev){const a=s.pending,live=a.bidders.filter(id=>!a.passed.includes(id));
 if(!live.length||(live.length===1&&a.highPid!=null&&live[0]===a.highPid)){finishAuction(s,ev);return}
 if(live.length===1&&a.highPid==null){a.pid=live[0];return}
 let k=a.bidders.indexOf(a.pid);for(let n=0;n<a.bidders.length;n++){k=(k+1)%a.bidders.length;const id=a.bidders[k];if(!a.passed.includes(id)&&id!==a.highPid){a.pid=id;return}}finishAuction(s,ev)}
function finishAuction(s,ev){const a=s.pending;s.pending=a.resume||null;
 if(a.highPid==null){log(s,'No bids — '+BY[a.tile].name+' stays with the bank.',ev);return}
 const w=P(s,a.highPid);w.cash-=a.high;s.own[a.tile]={owner:w.id,stage:0,mortgaged:false,spent:0};w.st.buys++;log(s,who(w)+' won '+BY[a.tile].name+' for '+fmt(a.high)+'.',ev);ev.push({type:'bought',pid:w.id,tile:a.tile});
 investTrig(s,w.id,a.tile,'buy',ev);stateCheck(s,ev)}
function investTrig(s,pid,id,how,ev){const p=P(s,pid),prev=p.lastInvestLoop;const trig={kind:'invest',tile:id,how,prevLoop:prev};
 if(how==='upgrade'){p.chapterUpgrades++}
 progress(s,pid,trig,ev);headlineCheck(s,pid,trig,ev);if(loopOf(id))p.lastInvestLoop=loopOf(id)}

// ---------- legal actions ----------
function legal(s,pid){if(s.over)return[];const pd=pending(s),p=P(s,pid),out=[];
 if(pd.kind==='debt'){if(pd.pid!==pid)return[];for(const id of owned(s,pid)){const o=s.own[id],t=BY[id];
   if(o.stage>0)out.push({type:'sell',tile:id,value:Math.round(t.build*R.sellBack)});
   if(!o.mortgaged&&!o.stage)out.push({type:'mortgage',tile:id,value:Math.round(t.price*R.mortgage)})}
  out.push({type:'bankrupt'});return out}
 if(pd.kind==='trade'){return pd.to===pid?[{type:'accept'},{type:'reject'}]:[]}
 if(pd.kind==='auction'){if(pd.pid!==pid)return[];for(const inc of[R.bidStep,3*R.bidStep,5*R.bidStep]){const b=pd.high+inc;if(b<=p.cash)out.push({type:'bid',amount:b})}out.push({type:'pass'});return out}
 if(pd.pid!==pid)return[];
 switch(pd.kind){
  case'roll':{const o=[{type:'roll'}];if(p.pos==='START')for(const r of['west','east'])o.push({type:'route',route:r});return o}
  case'route':return[{type:'route',route:'west'},{type:'route',route:'east'}];
  case'chain':return[...pd.offer.map(c=>({type:'pickChain',card:c})),...(pd.keep&&p.chain?[{type:'keepChain'}]:[])];
  case'buy':{const t=BY[pd.tile];if(p.cash>=t.price)out.push({type:'buy',cost:t.price});const dep=Math.round(t.price*R.reserve);if(t.type==='property'&&!p.reservation&&p.cash>=dep)out.push({type:'reserve',cost:dep});out.push({type:'auction'});return out}
  case'own':{const u=canUpgrade(s,pd.tile,pid),c=buildCost(s,pd.tile,pid);if(u.ok&&p.cash>=c.cost)out.push({type:'upgrade',cost:c.cost});const k=pd.tile+':'+s.chapter;if(!p.openHouses[k])out.push({type:'openHouse'});out.push({type:'skip'});return out}
  case'ownUtil':return[{type:'inspection'},{type:'credit'}];
  case'rival':return[{type:'scout'},{type:'deal'},{type:'skip'}];
  case'hub':{const t=BY[pd.tile].type;
   if(t==='start')return[{type:'choose',option:'bonus'},{type:'choose',option:'brief'},{type:'choose',option:'voucher'}];
   if(t==='skybridge')return[...(p.chain&&p.chain.stage>=3&&!s.turn.claimed?[{type:'choose',option:'ribbon'}]:[]),{type:'choose',option:'grant'},{type:'choose',option:'brief'}];
   return[...(p.chain&&p.chain.stage>=3&&!s.turn.claimed?[{type:'choose',option:'commission'}]:[]),{type:'choose',option:'design'},...(TILES.some(t=>OWNABLE(t)&&!s.own[t.id]&&reservedBy(s,t.id)==null)?[{type:'choose',option:'auction'}]:[]),{type:'choose',option:'skip'}]}
  case'pickAuction':return TILES.filter(t=>OWNABLE(t)&&!s.own[t.id]&&reservedBy(s,t.id)==null).map(t=>({type:'pickTile',tile:t.id}));
  case'routePref':return[{type:'route',route:'west'},{type:'route',route:'east'},{type:'route',route:null}];
  case'metro':return[...(!pd.express&&!s.turn.expressUsed&&p.cash>=R.express?[{type:'express'}]:[]),{type:'survey'}];
  case'event':return pd.cards.flatMap(c=>[{type:'moment',card:c,choice:'a'},{type:'moment',card:c,choice:'b'}]);
  case'tax':return[...(p.cash>=R.tax[0]||true?[{type:'pay'}]:[]),...(p.cash>=R.tax[1]?[{type:'contribute'}]:[])];
  case'fee':return[{type:'pay'},...(p.cash>=R.fee[1]?[{type:'contribute'}]:[])];
  case'renovate':return[...owned(s,pid).filter(id=>canUpgrade(s,id,pid).ok).map(id=>({type:'pickTile',tile:id})),{type:'skip'}];
  case'action':{for(const id of owned(s,pid)){const o=s.own[id];const u=canUpgrade(s,id,pid);if(u.ok){const c=buildCost(s,id,pid);if(p.cash>=c.cost)out.push({type:'build',tile:id,cost:c.cost})}
    if(o.mortgaged){const c=Math.round(BY[id].price*R.mortgage*R.redeem);if(p.cash>=c)out.push({type:'redeem',tile:id,cost:c})}}
   if(p.reservation){const t=BY[p.reservation.tile];const c=t.price-p.reservation.deposit;if(!s.own[t.id]&&p.cash>=c)out.push({type:'completeReservation',cost:c});out.push({type:'waiveReservation'})}
   if(claimable(s,pid))out.push({type:'claim'});
   out.push({type:'end'});return out}}
 return out}

// ---------- actions ----------
function act(s,pid,a){const ev=[];if(s.over)return{ok:false,error:'Match over',events:ev};const pd=pending(s),p=P(s,pid);
 const fail=e=>({ok:false,error:e,events:ev}),done=()=>{after(s,ev);return{ok:true,events:ev}};
 if(!a||typeof a.type!=='string')return fail('No action');
 if(pd.kind==='debt'){if(pd.pid!==pid)return fail('Not your decision');
  if(a.type==='sell'){const o=s.own[a.tile];if(!o||o.owner!==pid||!o.stage)return fail('Nothing to sell');const v=Math.round(BY[a.tile].build*R.sellBack);o.stage--;o.spent=Math.max(0,(o.spent||0)-BY[a.tile].build);p.cash+=v;log(s,who(p)+' sold a building on '+BY[a.tile].name+' for '+fmt(v)+'.',ev);ev.push({type:'built',tile:a.tile});settle(s,ev);return done()}
  if(a.type==='mortgage'){const o=s.own[a.tile];if(!o||o.owner!==pid||o.mortgaged||o.stage)return fail('Cannot mortgage');const v=Math.round(BY[a.tile].price*R.mortgage);o.mortgaged=true;p.cash+=v;log(s,who(p)+' mortgaged '+BY[a.tile].name+' for '+fmt(v)+'.',ev);settle(s,ev);return done()}
  if(a.type==='bankrupt'){bankrupt(s,pid,pd.to,ev);return done()}return fail('Raise cash or declare bankruptcy')}
 if(pd.kind==='trade'){if(pd.to!==pid)return fail('Waiting for the other player');s.pending=pd.resume||null;
  if(a.type==='accept'){if(!tradeOk(s,pd))return fail('Trade no longer possible');doTrade(s,pd,ev);return done()}log(s,who(P(s,pd.to))+' declined the deal.',ev);return done()}
 if(pd.kind==='auction'){if(pd.pid!==pid)return fail('Not your bid');
  if(a.type==='bid'){const b=Math.round(a.amount);if(!(b>pd.high)||b>p.cash||(b-pd.high)%R.bidStep)return fail('Invalid bid');pd.high=b;pd.highPid=pid;log(s,who(p)+' bid '+fmt(b)+'.',ev);nextBidder(s,ev);return done()}
  if(a.type==='pass'){pd.passed.push(pid);nextBidder(s,ev);return done()}return fail('Bid or pass')}
 if(pd.pid!==pid)return fail('Not your turn');
 const L=legal(s,pid),allowed=x=>L.some(l=>l.type===x.type&&(l.option==null||l.option===x.option)&&(l.tile==null||l.tile===x.tile)&&(l.card==null||l.card===x.card)&&(l.choice==null||l.choice===x.choice)&&(l.route===undefined||l.route===x.route));
 switch(pd.kind){
  case'roll':
   if(a.type==='route'){if(p.pos!=='START')return fail('Choose a loop at Start');p.route=a.route;log(s,who(p)+' will take the '+LOOP_NAMES[a.route]+' loop.',ev);return done()}
   if(a.type!=='roll')return fail('Roll the dice');{const d=[1+Math.floor(rng(s)*6),1+Math.floor(rng(s)*6)];s.turn.dice=d;s.turn.phase='action';s.turn.salaryPaid=false;ev.push({type:'dice',pid,dice:d});log(s,who(p)+' rolled '+d[0]+' + '+d[1]+'.',ev);
    if(walk(s,pid,d[0]+d[1],ev))land(s,pid,ev);return done()}
  case'route':{if(a.type!=='route'||!a.route)return fail('Choose West or East');p.route=a.route;s.pending=null;log(s,who(p)+' turned onto the '+LOOP_NAMES[a.route]+' loop.',ev);if(walk(s,pid,pd.steps,ev,{salary:pd.salary}))land(s,pid,ev);return done()}
  case'chain':{if(a.type==='keepChain'&&pd.keep){s.pending=null;for(const c of pd.offer)s.chainDeck.push(c);log(s,who(p)+' kept '+CHAINS[p.chain.card].name+'.',ev);return done()}
   if(a.type!=='pickChain'||!pd.offer.includes(a.card))return fail('Pick a Landmark Chain');setChain(s,pid,a.card);for(const c of pd.offer)if(c!==a.card)s.chainDeck.push(c);s.pending=null;log(s,who(p)+' chose '+CHAINS[a.card].name+'.',ev);ev.push({type:'chain',pid});stateCheck(s,ev);return done()}
  case'buy':{const t=BY[pd.tile];
   if(a.type==='buy'){if(p.cash<t.price)return fail('Not enough cash');p.cash-=t.price;s.own[t.id]={owner:pid,stage:0,mortgaged:false,spent:0};p.st.buys++;s.pending=null;log(s,who(p)+' bought '+t.name+' for '+fmt(t.price)+'.',ev);ev.push({type:'bought',pid,tile:t.id});investTrig(s,pid,t.id,'buy',ev);stateCheck(s,ev);return done()}
   if(a.type==='reserve'){if(!allowed(a))return fail('Cannot reserve');const dep=Math.round(t.price*R.reserve);p.cash-=dep;p.reservation={tile:t.id,deposit:dep,until:p.turns+1};s.pending=null;log(s,who(p)+' reserved '+t.name+' for a '+fmt(dep)+' deposit.',ev);ev.push({type:'reserved',pid,tile:t.id});return done()}
   if(a.type==='auction'){s.pending=null;startAuction(s,t.id,ev);return done()}return fail('Acquire, reserve or auction')}
  case'own':{const t=BY[pd.tile];
   if(a.type==='upgrade'){if(!allowed(a))return fail(canUpgrade(s,t.id,pid).why||'Cannot upgrade');s.pending=null;doBuild(s,pid,t.id,ev);return done()}
   if(a.type==='openHouse'){const k=t.id+':'+s.chapter;if(p.openHouses[k])return fail('Already held this chapter');p.openHouses[k]=1;if(!p.chapterOpen.includes(t.id))p.chapterOpen.push(t.id);s.pending=null;gain(s,pid,R.openHouse,'Open House at '+t.name,ev);headlineCheck(s,pid,{kind:'openHouse'},ev);return done()}
   if(a.type==='skip'){s.pending=null;return done()}return fail('Choose')}
  case'ownUtil':{s.pending=null;if(a.type==='inspection'){setVoucher(s,pid,R.effVoucher,'Efficiency Inspection',ev);return done()}gain(s,pid,R.incomeCredit,'Income Credit',ev);return done()}
  case'rival':{if(a.type==='scout'){s.pending=replaceOffer(s,pid,'scout');log(s,who(p)+' scouted two new briefs.',ev);return done()}
   if(a.type==='deal'){s.pending={kind:'dealDesk',pid,with:pd.owner};return done()}s.pending=null;return done()}
  case'dealDesk':{if(a.type==='cancel'){s.pending=null;return done()}
   if(a.type==='offer'){const o={kind:'trade',pid,from:pid,to:a.to,give:a.give||{},get:a.get||{},resume:null};if(!tradeOk(s,o))return fail('Invalid trade');s.pending=o;log(s,who(p)+' offered a deal to '+who(P(s,a.to))+'.',ev);return done()}return fail('Offer or cancel')}
  case'hub':{const t=BY[pd.tile];if(a.type!=='choose'||!allowed(a))return fail('Not available');const o=a.option;s.pending=null;ev.push({type:'hub',pid,tile:t.id,option:o});
   if(o==='bonus'){gain(s,pid,R.bonusPay,'Bonus Pay',ev)}
   else if(o==='voucher'){setVoucher(s,pid,R.voucher,"Builders' Voucher",ev)}
   else if(o==='brief'||o==='design'){s.pending=replaceOffer(s,pid,o)}
   else if(o==='grant'){gain(s,pid,R.grant,'City Grant',ev)}
   else if(o==='ribbon'){claim(s,pid,ev,{sky:true})}
   else if(o==='commission'){claim(s,pid,ev)}
   else if(o==='auction'){s.pending={kind:'pickAuction',pid}}
   if(t.type==='exchange'&&o!=='auction'&&!s.pending)s.pending={kind:'routePref',pid};
   else if(t.type==='exchange'&&s.pending&&s.pending.kind!=='pickAuction')s.queue.unshift({kind:'routePref',pid});
   return done()}
  case'pickAuction':{if(a.type!=='pickTile'||!allowed(a))return fail('Pick an unowned property');s.pending={kind:'routePref',pid};startAuction(s,a.tile,ev);return done()}
  case'routePref':{if(a.type!=='route')return fail('Choose a loop');p.route=a.route||null;s.pending=null;if(a.route)log(s,who(p)+' set the '+LOOP_NAMES[a.route]+' loop for the next lap.',ev);return done()}
  case'metro':{if(a.type==='express'){if(!allowed(a))return fail('Express not available');p.cash-=R.express;s.turn.expressUsed=true;const dest=pd.tile==='W10'?'E10':'W10';log(s,who(p)+' took the Express to '+BY[dest].name+' for '+fmt(R.express)+'.',ev);
    p.pos=dest;s.pending=null;ev.push({type:'move',pid,path:[dest],express:true});land(s,pid,ev,{express:true});return done()}
   if(a.type==='survey'){s.pending=null;gain(s,pid,R.survey,'Neighborhood Survey',ev);return done()}return fail('Choose')}
  case'event':{if(a.type!=='moment'||!pd.cards.includes(a.card))return fail('Pick a City Moment');s.pending=null;for(const c of pd.cards)s.momentDeck.push(c);resolveMoment(s,pid,a.card,a.choice==='b'?'b':'a',ev);progress(s,pid,{kind:'event'},ev);return done()}
  case'tax':{if(a.type==='contribute'){if(p.cash<R.tax[1])return fail('Not enough cash');s.pending=null;pay(s,pid,R.tax[1],null,'civic fund',ev);lp(s,pid,1,'civic fund',ev);return done()}s.pending=null;pay(s,pid,R.tax[0],null,'City Tax',ev);return done()}
  case'fee':{if(a.type==='contribute'){if(p.cash<R.fee[1])return fail('Not enough cash');s.pending=null;pay(s,pid,R.fee[1],null,'Development Fee',ev);lp(s,pid,1,'prestige',ev);return done()}s.pending=null;if(pay(s,pid,R.fee[0],null,'Development Fee',ev))setVoucher(s,pid,R.voucher,'Development voucher',ev);return done()}
  case'renovate':{s.pending=null;if(a.type==='pickTile'&&canUpgrade(s,a.tile,pid).ok){const t=BY[a.tile];const c=Math.max(0,t.build-100);if(p.cash<c)return fail('Not enough cash');p.cash-=c;s.own[t.id].stage++;s.own[t.id].spent=(s.own[t.id].spent||0)+c;p.st.builds++;log(s,who(p)+' renovated '+t.name+' to '+STAGES[s.own[t.id].stage]+' for '+fmt(c)+'.',ev);ev.push({type:'built',pid,tile:t.id});investTrig(s,pid,t.id,'upgrade',ev)}return done()}
  case'action':{
   if(a.type==='build'){if(!allowed(a))return fail(canUpgrade(s,a.tile,pid).why||'Cannot build');doBuild(s,pid,a.tile,ev);return done()}
   if(a.type==='redeem'){if(!allowed(a))return fail('Cannot redeem');const c=Math.round(BY[a.tile].price*R.mortgage*R.redeem);p.cash-=c;s.own[a.tile].mortgaged=false;log(s,who(p)+' redeemed '+BY[a.tile].name+'.',ev);return done()}
   if(a.type==='completeReservation'){if(!allowed(a))return fail('Cannot complete');const t=BY[p.reservation.tile],c=t.price-p.reservation.deposit;p.cash-=c;p.reservation=null;s.own[t.id]={owner:pid,stage:0,mortgaged:false,spent:0};p.st.buys++;log(s,who(p)+' completed the purchase of '+t.name+'.',ev);ev.push({type:'bought',pid,tile:t.id});investTrig(s,pid,t.id,'buy',ev);stateCheck(s,ev);return done()}
   if(a.type==='waiveReservation'){if(!p.reservation)return fail('No reservation');log(s,who(p)+' released the reservation on '+BY[p.reservation.tile].name+'.',ev);p.reservation=null;return done()}
   if(a.type==='claim'){if(!claimable(s,pid))return fail('Nothing to claim');claim(s,pid,ev);return done()}
   if(a.type==='offer'){const o={kind:'trade',pid,from:pid,to:a.to,give:a.give||{},get:a.get||{},resume:null};if(!tradeOk(s,o))return fail('Invalid trade');s.pending=o;log(s,who(p)+' offered a deal to '+who(P(s,a.to))+'.',ev);return done()}
   if(a.type==='end'){endTurn(s,ev);return done()}return fail('Unknown action')}}
 return fail('Unknown state')}
function doBuild(s,pid,id,ev){const p=P(s,pid),t=BY[id],c=buildCost(s,id,pid);p.cash-=c.cost;if(c.voucher){log(s,who(p)+' used a '+fmt(c.voucher)+' voucher.',ev);p.voucher=null}
 s.own[id].stage++;s.own[id].spent=(s.own[id].spent||0)+c.cost;p.st.builds++;ev.push({type:'built',pid,tile:id,stage:s.own[id].stage});log(s,who(p)+' built '+STAGES[s.own[id].stage]+' on '+t.name+' for '+fmt(c.cost)+'.',ev);investTrig(s,pid,id,'upgrade',ev)}
function setVoucher(s,pid,amount,label,ev){const p=P(s,pid);p.voucher={amount,label,until:p.turns+1};log(s,who(p)+' holds a '+fmt(amount)+' upgrade voucher ('+label+').',ev)}
function resolveMoment(s,pid,c,choice,ev){const m=MOMENTS[c],p=P(s,pid),mine=owned(s,pid).filter(id=>BY[id].type==='property');ev.push({type:'moment',pid,card:m.id,choice});log(s,who(p)+' chose '+m.name+'.',ev);
 const A=choice==='a';
 switch(m.id){
  case'pop_up_festival':A?gain(s,pid,100,m.name,ev):lp(s,pid,1,m.name,ev);break;
  case'renovation_crew':A?(s.pending={kind:'renovate',pid}):gain(s,pid,80,m.name,ev);break;
  case'community_award':{const both=mine.some(id=>loopOf(id)==='west')&&mine.some(id=>loopOf(id)==='east');if(A)both?lp(s,pid,1,m.name,ev):gain(s,pid,80,m.name,ev);else gain(s,pid,100,m.name,ev);break}
  case'river_cleanup':if(A){mine.some(id=>loopOf(id)==='west')?lp(s,pid,1,m.name,ev):log(s,'No Riverside property — no point awarded.',ev)}else gain(s,pid,70,m.name,ev);break;
  case'mountain_art_fair':if(A){mine.some(id=>loopOf(id)==='east')?lp(s,pid,1,m.name,ev):log(s,'No Highland property — no point awarded.',ev)}else gain(s,pid,70,m.name,ev);break;
  case'builders_meet':A?(s.pending=replaceOffer(s,pid,'event')):gain(s,pid,100,m.name,ev);break;
  case'friendly_opening':A?setVoucher(s,pid,100,m.name,ev):gain(s,pid,60,m.name,ev);break;
  case'grand_preview':if(A){if(!s.headlineDeck.length)s.headlineDeck=shuffle(s,HEADLINES.map((_,i)=>i));log(s,'Next headline preview: '+HEADLINES[s.headlineDeck[0]].name+'.',ev);ev.push({type:'preview',id:HEADLINES[s.headlineDeck[0]].id})}else gain(s,pid,80,m.name,ev);break}}
function momentText(c,choice){const m=MOMENTS[c];return choice==='a'?m.choice_a:m.choice_b}
function tradeOk(s,o){const from=P(s,o.from),to=P(s,o.to);if(!from||!to||to.out||from.id===to.id)return false;const g=o.give||{},r=o.get||{};
 const tiles=(x,pid)=>(x.tiles||[]).every(id=>s.own[id]&&s.own[id].owner===pid&&!s.own[id].stage&&!(BY[id].group&&GROUPS[BY[id].group].some(j=>s.own[j]&&s.own[j].stage)));
 const cg=Math.max(0,Math.round(g.cash||0)),cr=Math.max(0,Math.round(r.cash||0));return tiles(g,o.from)&&tiles(r,o.to)&&cg<=from.cash&&cr<=to.cash&&((g.tiles||[]).length+(r.tiles||[]).length+cg+cr)>0}
function doTrade(s,o,ev){const from=P(s,o.from),to=P(s,o.to),g=o.give||{},r=o.get||{};for(const id of g.tiles||[])s.own[id].owner=to.id;for(const id of r.tiles||[])s.own[id].owner=from.id;
 const cg=Math.round(g.cash||0),cr=Math.round(r.cash||0);from.cash+=cr-cg;to.cash+=cg-cr;from.st.trades++;to.st.trades++;log(s,who(from)+' and '+who(to)+' closed a deal.',ev);ev.push({type:'trade',from:from.id,to:to.id});
 headlineCheck(s,from.id,{kind:'trade'},ev);stateCheck(s,ev)}
function settle(s,ev){const d=s.pending;if(!d||d.kind!=='debt')return;const p=P(s,d.pid);if(p.cash>=d.amount){p.cash-=d.amount;if(d.to!=null)P(s,d.to).cash+=d.amount;log(s,who(p)+' paid '+fmt(d.amount)+(d.reason?' ('+d.reason+')':'')+'.',ev);s.pending=d.resume||null}}
function bankrupt(s,pid,to,ev){const p=P(s,pid);p.out=true;log(s,who(p)+' is bankrupt.',ev);ev.push({type:'bankrupt',pid});
 for(const id of owned(s,pid)){if(to!=null&&!P(s,to).out){s.own[id].owner=to;s.own[id].stage=0}else delete s.own[id]}
 if(to!=null)P(s,to).cash+=Math.max(0,p.cash);p.cash=0;p.reservation=null;s.pending=null;
 if(active(s).length<=1){finish(s,ev);return}if(s.turn.pid===pid)endTurn(s,ev)}
function endTurn(s,ev){const p=P(s,s.turn.pid);p.turns++;
 if(p.voucher&&p.turns>p.voucher.until){p.voucher=null}
 if(p.reservation&&p.turns>p.reservation.until){log(s,'The reservation on '+BY[p.reservation.tile].name+' expired.',ev);p.reservation=null}
 if(active(s).every(q=>q.turns>=s.cfg.turns)){finish(s,ev);return}
 // chapter change once every active player has played the chapter's turns
 if(active(s).every(q=>q.turns>=s.chapter*s.cfg.per)){
  for(const q of active(s))if(!q.completed.length&&!q.ai)s.queue.push(replaceOffer(s,q.id,'comeback'));else if(!q.completed.length&&q.ai&&q.chain&&q.chain.stage===0){const o=drawChains(s,2);setChain(s,q.id,aiPickChain(s,q.id,o))}
  s.chapter++;ev.push({type:'chapter',n:s.chapter});drawHeadline(s,ev)}
 let k=s.turn.pid;for(let n=0;n<s.players.length;n++){k=(k+1)%s.players.length;if(!P(s,k).out&&P(s,k).turns<s.cfg.turns)break}
 s.turn={pid:k,phase:'roll',dice:null,claimed:false,expressUsed:false,salaryPaid:false};ev.push({type:'turn',pid:k});log(s,P(s,k).name==='You'?'Your turn.':P(s,k).name+'’s turn.',ev);stateCheck(s,ev);nextQueued(s)}
function after(s,ev){if(s.over)return;if(s.pending&&s.pending.kind==='debt'){const d=s.pending;let liq=P(s,d.pid).cash;for(const id of owned(s,d.pid)){const o=s.own[id],t=BY[id];liq+=(o.stage||0)*Math.round((t.build||0)*R.sellBack);if(!o.mortgaged)liq+=Math.round(t.price*R.mortgage)}if(liq<d.amount)bankrupt(s,d.pid,d.to,ev)}nextQueued(s)}
function finish(s,ev){s.over=true;s.turn.phase='over';s.pending=null;s.queue=[];const res=s.players.map(p=>({pid:p.id,name:p.name,out:p.out,...score(s,p.id)}));
 res.sort((a,b)=>(a.out-b.out)||(b.total-a.total)||(b.chains-a.chains)||(b.netWorth-a.netWorth)||(b.cash-a.cash));s.results=res;s.winner=res[0].pid;log(s,P(s,s.winner).name+' wins with '+res[0].total+' Legacy Points!',ev);ev.push({type:'over',winner:s.winner})}

// ---------- computer players ----------
function aiPickChain(s,pid,offer){const easy=['grand_opening','new_landmarks','fresh_start','neighborhood_revival','bright_future','green_corridor'];return offer.slice().sort((a,b)=>(easy.includes(CHAINS[b].id)?1:0)-(easy.includes(CHAINS[a].id)?1:0))[0]}
function ai(s,pid){const L=legal(s,pid),pd=pending(s),p=P(s,pid);if(!L.length)return null;const has=t=>L.find(x=>x.type===t);const reserve=300+30*Math.max(0,s.cfg.turns-p.turns)/2;
 switch(pd.kind){
  case'debt':return L.find(x=>x.type==='sell')||L.find(x=>x.type==='mortgage')||{type:'bankrupt'};
  case'trade':{const me=pd.to,val=(t,o)=>(t||[]).reduce((n,id)=>n+BY[id].price*(BY[id].group&&GROUPS[BY[id].group].filter(j=>s.own[j]&&s.own[j].owner===o).length>=1?1.4:1),0);
   const gets=val(pd.give.tiles,me)+(pd.give.cash||0),gives=val(pd.get.tiles,me)*1.15+(pd.get.cash||0);return gets>=gives&&gets>0?{type:'accept'}:{type:'reject'}}
  case'auction':{const t=BY[pd.tile],cap=Math.min(t.price*(t.group&&GROUPS[t.group].some(j=>s.own[j]&&s.own[j].owner===pid)?1.3:.95),p.cash-150);const bid=L.filter(x=>x.type==='bid').sort((a,b)=>a.amount-b.amount)[0];return bid&&bid.amount<=cap?bid:{type:'pass'}}
  case'roll':return{type:'roll'};
  case'route':{const ch=p.chain&&p.chain.stage<3?CHAINS[p.chain.card].stages[p.chain.stage]:null;const want=ch&&ch.loop?ch.loop:owned(s,pid).filter(id=>loopOf(id)==='east').length>owned(s,pid).filter(id=>loopOf(id)==='west').length?'east':(rng(s)<.5?'west':'east');return{type:'route',route:want}}
  case'chain':return has('keepChain')&&p.chain&&p.chain.stage>0?{type:'keepChain'}:{type:'pickChain',card:aiPickChain(s,pid,pd.offer)};
  case'buy':{const b=has('buy');if(b&&p.cash-b.cost>=reserve*.5)return b;const r=has('reserve');if(r&&p.cash-r.cost>=reserve*.7)return r;return{type:'auction'}}
  case'own':{const u=has('upgrade');if(u&&p.cash-u.cost>=reserve)return u;return has('openHouse')||{type:'skip'}}
  case'ownUtil':return{type:p.voucher?'credit':'inspection'};
  case'rival':return p.chain&&p.chain.stage===0&&rng(s)<.35?{type:'scout'}:{type:'skip'};
  case'dealDesk':return{type:'cancel'};
  case'hub':{const o=L.map(x=>x.option);if(o.includes('ribbon'))return{type:'choose',option:'ribbon'};if(o.includes('commission'))return{type:'choose',option:'commission'};
   if(o.includes('grant'))return{type:'choose',option:'grant'};if(o.includes('bonus'))return{type:'choose',option:p.voucher?'bonus':'voucher'};
   if(p.chain&&p.chain.stage===0&&o.includes('design')&&rng(s)<.4)return{type:'choose',option:'design'};
   return{type:'choose',option:o.includes('auction')&&p.cash>900?'auction':'skip'}}
  case'pickAuction':return L.slice().sort((a,b)=>BY[a.tile].price-BY[b.tile].price)[0];
  case'routePref':return{type:'route',route:null};
  case'metro':return p.chain&&p.chain.stage<3&&CHAINS[p.chain.card].stages[p.chain.stage].condition==='land_on'&&CHAINS[p.chain.card].stages[p.chain.stage].tile==='E10'&&has('express')?{type:'express'}:{type:'survey'};
  case'event':{const pick=L.find(x=>x.choice==='b')||L[0];const lpCard=L.find(x=>x.choice==='a'&&['pop_up_festival'].includes(MOMENTS[x.card].id));return lpCard||pick}
  case'tax':return p.cash>1600&&has('contribute')?{type:'contribute'}:{type:'pay'};
  case'fee':return p.cash>1600&&has('contribute')?{type:'contribute'}:{type:'pay'};
  case'renovate':return L[0];
  case'action':{if(has('claim'))return{type:'claim'};const cr=has('completeReservation');if(cr&&p.cash-cr.cost>=reserve*.5)return cr;
   const b=L.filter(x=>x.type==='build'&&p.cash-x.cost>=reserve).sort((x,y)=>x.cost-y.cost)[0];if(b)return b;const r=L.find(x=>x.type==='redeem'&&p.cash-x.cost>=reserve*1.5);if(r)return r;return{type:'end'}}}
 return L[L.length-1]}

// ---------- read model, saves, Career ----------
function view(s){return{ruleset:s.ruleset,chapter:s.chapter,turns:s.cfg.turns,turn:s.turn,pending:pending(s),headline:s.headline!=null?HEADLINES[s.headline]:null,headlineWinner:s.headlineWinner,over:s.over,winner:s.winner,results:s.results,
 players:s.players.map(p=>({...p,score:score(s,p.id).total})),own:s.own,landmarks:s.landmarks}}
function serialize(s){return JSON.stringify(s)}
function restore(str){try{const s=typeof str==='string'?JSON.parse(str):clone(str);if(!s||s.ruleset!==RULESET||s.version!==VERSION||!Array.isArray(s.players))return{ok:false,error:'incompatible save'};return{ok:true,state:s}}catch(e){return{ok:false,error:'unreadable save'}}}
function careerFacts(s,{ownerSeat=0,endedAt=Date.now()}={}){const o=P(s,ownerSeat),m=s.meta||{},st=o.st;const rank=s.results?Math.max(0,s.results.findIndex(r=>r.pid===ownerSeat)):null;
 return{board:'crossroads',ruleset:RULESET,rank,length:s.cfg.length,matchId:m.matchId,startedAt:m.startedAt,endedAt,over:!!s.over,ownerHuman:!o.ai,
  rounds:Math.min(...s.players.filter(p=>!p.out||p.id===ownerSeat).map(p=>p.turns)),activity:st.buys+st.builds+st.trades+st.hubs+st.claims,
  won:s.winner===ownerSeat,score:score(s,ownerSeat).total,aiOpponents:s.players.filter(p=>p.ai).length,aiLevel:'normal',experimental:LENGTHS[s.cfg.length].experimental,
  challenges:o.completed.map((id,k)=>({id:'cc-landmark-'+id,tag:'landmark'}))}}
return Object.freeze({RULESET,VERSION,SAVE_KEY,TILES,BY,GROUPS,GROUP_NAMES,GROUP_COLORS,LOOP_NAMES,STAGES,CHAINS,HEADLINES,MOMENTS,RULES:R,LENGTHS,
 newMatch,pending,legal,act,ai,rent,canUpgrade,buildCost,score,netWorth,view,serialize,restore,careerFacts,owned,fullGroup,momentText,loopOf});
});
