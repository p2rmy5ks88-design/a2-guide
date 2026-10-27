const {fixture}=require('./asset-fixture.cjs'),{stock}=require('./asset-cases.cjs');
const dice=(a,b,sv=0)=>({a,b,sv,face:sv?(sv<=4?sv:sv===5?'star':'taxi'):null});
function game(){const g=fixture();Object.assign(g,{code:'ABCDE',seq:1});g.players[0].tok='🚌';g.players[1].tok='🛺';g.players.forEach(p=>p.tl=1);return g}
function cases(){const out=[],add=(name,roll,change=()=>{},choices=[])=>{const g=game();change(g);stock(g);out.push({name,game:g,dice:roll,choices})};
 add('owned street completes ordinary roll',dice(1,3));
 add('unowned purchase buy',dice(3,4),()=>{},['buy']);
 add('decline enters required auction',dice(3,4),()=>{},['decline']);
 add('decline without auctions',dice(3,4),g=>g.set.auction=false,['decline']);
 add('unaffordable purchase remains a choice',dice(3,4),g=>g.players[0].cash=50);
 add('unaffordable purchase declined without auctions',dice(3,4),g=>{g.players[0].cash=50;g.set.auction=false},['decline']);
 add('card landing pauses before drawing',dice(1,2));
 add('city hall pauses before drawing',dice(6,6));
 add('first doubles preserve bonus roll',dice(1,1));
 add('second doubles preserve consecutive count',dice(1,1),g=>g.doubles=1);
 add('third doubles go to jail without moving',dice(1,1),g=>{g.doubles=2;g.players[0].pos=39});
 add('third doubles Lucky Pass still ends rolling',dice(1,1),g=>{g.doubles=2;g.players[0].tl=3});
 add('exhausted Lucky Pass sends player to jail',dice(1,1),g=>{g.doubles=2;g.players[0].tl=3;g.players[0].passUsed=1});
 add('perks disabled ignores Lucky Pass',dice(1,1),g=>{g.doubles=2;g.players[0].tl=3;g.set.perks=false});
 add('reroll offer stops before movement',dice(3,4),g=>{g.players[0].tl=2;g.players[0].tok='🛶'},['keep','buy']);
 add('exhausted reroll proceeds',dice(3,4),g=>{g.players[0].tl=2;g.players[0].rrUsed=1;g.players[0].tok='🛶'},['buy']);
 add('automatic turn does not offer reroll',dice(3,4),g=>{g.players[0].tl=2;g.players[0].auto=true;g.players[0].tok='🛶'},['buy']);
 add('disabled perks do not offer reroll',dice(3,4),g=>{g.players[0].tl=6;g.set.perks=false},['buy']);
 for(let tl=1;tl<=6;tl++)for(const goDouble of [false,true])add('Start payday tier '+tl+' double='+goDouble,dice(1,1),g=>{g.players[0].pos=38;g.players[0].tok='🚕';g.players[0].tl=tl;g.set.goDouble=goDouble});
 add('holiday and surge stack with exact Start payday',dice(1,1),g=>{g.players[0].pos=38;g.players[0].tok='🚀';g.players[0].tl=6;g.set.goDouble=true;g.event={id:'holiday',round:1}});
 add('used surge does not pay twice',dice(1,1),g=>{g.players[0].pos=38;g.players[0].tok='🚀';g.players[0].tl=6;g.players[0].surgeUsed=1});
 add('expired holiday has no bonus',dice(1,1),g=>{g.players[0].pos=38;g.event={id:'holiday',round:0}});
 for(const city of ['lagos','stockholm','nyc','tokyo','london','paris'])add('localized passing Start '+city,dice(1,2),g=>{g.set.city=city;g.players[0].pos=38});
 for(let sv=1;sv<=4;sv++)add('numeric turbo '+sv,dice(1,2,sv),g=>{g.set.speedDie=true;g.players[0].lapped=true},sv===4?['buy']:[]);
 add('turbo star pauses after base purchase',dice(1,3,5),g=>{g.set.speedDie=true;g.players[0].lapped=true;g.own[4].o=-1},['buy']);
 add('turbo taxi requires separate consent for each property',dice(1,2,6),g=>{g.set.speedDie=true;g.players[0].lapped=true;g.players[0].pos=38;g.own[1].o=-1},['buy','buy']);
 add('turbo taxi decline is not reused at next purchase',dice(1,2,6),g=>{g.set.speedDie=true;g.players[0].lapped=true;g.players[0].pos=38;g.own[1].o=-1;g.set.auction=false},['decline','decline']);
 add('turbo taxi stops when base landing sends player to jail',dice(1,2,6),g=>{g.set.speedDie=true;g.players[0].lapped=true;g.players[0].pos=27});
 for(const [label,change]of [
  ['ordinary rent',g=>g.own[7].o=1],['full set rent',g=>[7,8,9].forEach(i=>g.own[i].o=1)],['developed rent',g=>g.own[7]={o:1,h:3,m:false}],['hotel rent',g=>g.own[7]={o:1,h:5,m:false}],['mortgaged rent waived',g=>g.own[7]={o:1,h:0,m:true}],['jail rent waived',g=>{g.own[7].o=1;g.players[1].inJail=true;g.set.jailRent=true}],['jail rent rule disabled',g=>{g.own[7].o=1;g.players[1].inJail=true;g.set.jailRent=false}],['party rent modifier',g=>{g.own[7].o=1;g.event={id:'party',round:1}}],['storm rent modifier',g=>{g.own[7].o=1;g.event={id:'storm',round:1}}],['rent shield and counters',g=>{g.own[7].o=1;g.players[0].tl=5;g.players[0].rrUsed=2}],['rent debt pauses before liquidation',g=>{g.own[7].o=1;g.players[0].cash=0}],['shielded debt preserves effective bill',g=>{g.own[7].o=1;g.players[0].cash=0;g.players[0].tl=5;g.players[0].rrUsed=2}]
 ])add(label,dice(3,4),change);
 add('utility rent uses two dice total',dice(3,4),g=>{g.players[0].pos=7;g.own[14].o=1});
 add('outage utility rent zero',dice(3,4),g=>{g.players[0].pos=7;g.own[14].o=1;g.event={id:'outage',round:1}});
 add('transport rent modifier',dice(1,4),g=>{g.own[5].o=1;g.event={id:'fuel',round:1}});
 add('tax pays into pot',dice(3,3),g=>g.set.pot=true);
 add('tax holiday waives tax',dice(3,3),g=>g.event={id:'taxfree',round:1});
 add('tax debt pauses',dice(3,3),g=>g.players[0].cash=0);
 add('rest stop jackpot and counters',dice(3,4),g=>{g.players[0].pos=13;g.set.pot=true;g.pot=300});
 add('police sends player to jail',dice(3,4),g=>g.players[0].pos=23);
 add('police Lucky Pass retains doubles',dice(3,3),g=>{g.players[0].pos=24;g.players[0].tl=3});
 return out;
}
module.exports={game,dice,cases};
