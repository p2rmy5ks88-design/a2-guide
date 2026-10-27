const {game,dice}=require('./turn-cases.cjs'),{stock}=require('./asset-cases.cjs');
function top(g,deck,idx){g[deck]=[idx,...g[deck].filter(x=>x!==idx)]}
function cases(){const out=[],add=(name,deck,idx,change=()=>{},opts={})=>{const g=game();stock(g);g.set.minigames=false;change(g);g.players[0].rrUsed=6;top(g,deck,idx);out.push({name,game:g,dice:deck==='chance'?dice(1,2):dice(6,6),deck,idx,...opts})};
 for(const deck of ['chance','esusu'])for(let idx=0;idx<16;idx++)add(deck+' card '+idx,deck,idx);
 for(const city of ['stockholm','nyc','tokyo','london','paris'])for(const deck of ['chance','esusu'])for(const idx of [0,7,10,15])add(city+' '+deck+' '+idx,deck,idx,g=>g.set.city=city);
 add('fee to jackpot','chance',13,g=>g.set.pot=true);
 add('unaffordable fee retains card debt','chance',13,g=>g.players[0].cash=0);
 add('repair houses and hotel','chance',15,g=>{g.own[1]={o:0,h:2,m:false};g.own[7]={o:0,h:5,m:false};g.houses-=2;g.hotels--});
 add('City Hall repairs debt','esusu',3,g=>{g.players[0].cash=0;g.own[1]={o:0,h:2,m:false};g.houses-=2});
 add('street grant excludes rail and utility','chance',14,g=>{g.own[5].o=0;g.own[14].o=0});
 add('pay each with three recipients','chance',12,g=>{for(let id=2;id<4;id++)g.players.push({...g.players[1],id,uid:'guest-'+id,goojf:[],declined:{}})});
 add('collect each stops at second debtor','chance',11,g=>{g.players.push({...g.players[1],id:2,uid:'guest-2',goojf:[],declined:{},cash:0})});
 add('pay each debt after first transfer','chance',12,g=>{g.players[0].cash=30;g.players.push({...g.players[1],id:2,uid:'guest-2',goojf:[],declined:{}})});
 add('nearest rail double rent','chance',2,g=>g.own[5].o=1);
 add('nearest utility eight times dice','chance',10,g=>g.own[14].o=1);
 add('rail purchase decline goes to auction','chance',2,()=>{},{decline:true});
 add('rail purchase decline without auction','chance',2,g=>g.set.auction=false,{decline:true});
 add('jail card exhausted Lucky Pass','chance',8,g=>{g.players[0].tl=3;g.players[0].passUsed=1});
 add('jail card free Lucky Pass','chance',8,g=>g.players[0].tl=3);
 add('rent shield after rail card','chance',2,g=>{g.own[5].o=1;g.players[0].tl=5});
 add('rail card rent debt','chance',2,g=>{g.own[5].o=1;g.players[0].cash=0});
 add('utility card rent debt','chance',10,g=>{g.own[14].o=1;g.players[0].cash=0});
 add('grant skips bankrupt players','esusu',2,g=>{g.players[1].bankrupt=true;g.players.push({...g.players[0],id:2,uid:'guest-2',goojf:[],declined:{}})});
 add('held pass deck conservation','chance',9,g=>{g.esusu=g.esusu.filter(x=>x!==6);g.players[1].goojf.push({deck:'esusu',idx:6})});
 // Turbo star after a card landing: first card and follow-up star are separate acknowledgements.
 for(const idx of [0,2,8,9]){const g=game();stock(g);g.players[0].lapped=true;g.set.speedDie=true;g.set.minigames=false;top(g,'chance',idx);out.push({name:'turbo star card '+idx,game:g,dice:dice(1,2,5),deck:'chance',idx})}
 for(const target of [19,32])for(let idx=0;idx<16;idx++)add('chance '+target+' card '+idx,'chance',idx,g=>g.players[0].pos=target-3);
 for(const target of [25,37])for(let idx=0;idx<16;idx++)add('City Hall '+target+' card '+idx,'esusu',idx,g=>g.players[0].pos=target-12);
 for(const idx of [0,2,8,9]){const g=game();stock(g);g.players[0].lapped=true;g.set.speedDie=true;g.set.minigames=false;top(g,'chance',idx);out.push({name:'turbo taxi card '+idx,game:g,dice:dice(1,2,6),deck:'chance',idx})}
 return out}
module.exports={cases,top};
