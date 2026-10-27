const {game:base,dice}=require('./turn-cases.cjs'),{stock}=require('./asset-cases.cjs'),{applyRoll,applyJailRoll,chooseTurn}=require('./turn-kernel.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
function game(n=2){const g=base();for(let id=2;id<n;id++)g.players.push({...copy(g.players[1]),id,uid:'guest-'+id,goojf:[],declined:{}});g.players.forEach(p=>p.rrUsed=6);return g}
function cases(){const out=[],add=(name,change=()=>{},commands=[{kind:'bankrupt'}],roll=dice(3,4),route=[])=>{const g=game();change(g);stock(g);out.push({name,game:g,dice:roll,route,commands})};
 const rent=g=>{g.players[0].cash=0;g.own[7].o=1};
 add('rent bankruptcy ends two-seat match',rent);
 add('rent funded by mortgage',rent,[{kind:'mortgage',square:1},{kind:'pay'}]);
 add('rent shield is not applied twice',g=>{rent(g);g.players[0].tl=5},[{kind:'mortgage',square:1},{kind:'pay'}]);
 add('rent paid after surplus mortgage',rent,[{kind:'mortgage',square:1},{kind:'pay'}]);
 add('tax bankruptcy returns assets to bank',g=>g.players[0].cash=0,undefined,dice(3,3));
 add('tax funded by three mortgages',g=>{g.players[0].cash=0;g.own[5].o=0;g.own[14].o=0},[{kind:'mortgage',square:5},{kind:'mortgage',square:14},{kind:'mortgage',square:1},{kind:'pay'}],dice(3,3));
 add('creditor gets houses, cash and held passes',g=>{Object.assign(g,game(3));rent(g);g.players[0].cash=2;for(const i of [1,2,4])g.own[i].h=2;g.chance=g.chance.filter(i=>i!==9);g.players[0].goojf.push({deck:'chance',idx:9});g.own[2].m=false});
 add('creditor receives hotel liquidation',g=>{Object.assign(g,game(3));rent(g);g.own[1].h=5});
 add('bank receives held passes once',g=>{g.players[0].cash=0;g.chance=g.chance.filter(i=>i!==9);g.esusu=g.esusu.filter(i=>i!==6);g.players[0].goojf=[{deck:'chance',idx:9},{deck:'esusu',idx:6}];g.own[1].h=2},undefined,dice(3,3));
 add('bankruptcy after first card transfer',g=>{Object.assign(g,game(4));g.players[0].cash=30;g.chance=[12,...g.chance.filter(i=>i!==12)]},[{kind:'bankrupt'}],dice(1,2),['drawCard']);
 add('pay-each resumes through two debts',g=>{Object.assign(g,game(4));g.players[0].cash=30;g.chance=[12,...g.chance.filter(i=>i!==12)]},[{kind:'mortgage',square:1},{kind:'pay'},{kind:'mortgage',square:2},{kind:'pay'}],dice(1,2),['drawCard']);
 add('collect-each changes debtor after first payment',g=>{Object.assign(g,game(4));g.chance=[11,...g.chance.filter(i=>i!==11)];g.players[1].cash=0;g.players[2].cash=0;g.own[7].o=1;g.own[8].o=2},[{kind:'mortgage',square:7},{kind:'pay'},{kind:'mortgage',square:8},{kind:'pay'}],dice(1,2),['drawCard']);
 add('other player bankruptcy continues collection',g=>{Object.assign(g,game(4));g.chance=[11,...g.chance.filter(i=>i!==11)];g.players[1].cash=0},[{kind:'bankrupt'}],dice(1,2),['drawCard']);
 add('other player bankruptcy finishes game',g=>{g.chance=[11,...g.chance.filter(i=>i!==11)];g.players[1].cash=0},[{kind:'bankrupt'}],dice(1,2),['drawCard']);
 add('repairs bill does not shrink after selling',g=>{g.players[0].cash=0;g.own[1].h=1;g.chance=[15,...g.chance.filter(i=>i!==15)]},[{kind:'sell',square:1},{kind:'pay'}],dice(1,2),['drawCard']);
 add('City Hall fee goes to jackpot once',g=>{g.players[0].cash=50;g.set.pot=true;g.esusu=[4,...g.esusu.filter(i=>i!==4)]},[{kind:'mortgage',square:1},{kind:'pay'}],dice(6,6),['drawCard']);
 add('card rail rent retains double multiplier',g=>{rent(g);g.own[5].o=1;g.chance=[2,...g.chance.filter(i=>i!==2)]},[{kind:'mortgage',square:1},{kind:'mortgage',square:2},{kind:'pay'}],dice(1,2),['drawCard']);
 add('card utility rent retains original dice',g=>{g.players[0].cash=0;g.own[14].o=1;g.chance=[10,...g.chance.filter(i=>i!==10)]},[{kind:'mortgage',square:1},{kind:'pay'}],dice(1,2),['drawCard']);
 add('jail third bail can be funded then moves once',g=>{g.phase='jail';Object.assign(g.players[0],{inJail:true,pos:10,jailTurns:2,cash:0})},[{kind:'mortgage',square:1},{kind:'mortgage',square:2},{kind:'mortgage',square:4},{kind:'pay'}],dice(2,3));out.at(-1).jail=true;
 add('jail bail bankruptcy does not move',g=>{Object.assign(g,game(3));g.phase='jail';Object.assign(g.players[0],{inJail:true,pos:10,jailTurns:2,cash:0})},[{kind:'bankrupt'}],dice(2,3));out.at(-1).jail=true;
 add('rent after mandatory bail is not charged bail twice',g=>{g.phase='jail';Object.assign(g.players[0],{inJail:true,pos:10,jailTurns:2,cash:60});g.own[15].o=1},[{kind:'mortgage',square:1},{kind:'pay'}],dice(2,3));out.at(-1).jail=true;
 for(const city of ['stockholm','nyc','tokyo','london','paris'])add('localized rent debt '+city,g=>{rent(g);g.set.city=city},[{kind:'mortgage',square:1},{kind:'pay'}]);
 for(let n=3;n<=6;n++)add('current debtor bankruptcy with '+n+' players',g=>{Object.assign(g,game(n));rent(g)});
 add('hotel sale returns four houses before paying rent',g=>{rent(g);g.set.even=false;g.own[1].h=5},[{kind:'sell',square:1},{kind:'pay'}]);
 add('house sale then mortgage before bank bankruptcy',g=>{g.players[0].cash=0;g.own[1].h=1},[{kind:'sell',square:1},{kind:'mortgage',square:1},{kind:'bankrupt'}],dice(3,3));
 add('hotel bankruptcy when house bank is empty',g=>{Object.assign(g,game(3));rent(g);g.set.even=false;g.own[1].h=5;for(const i of [7,8,9,11,13,15,17,18,21])g.own[i]={o:1,h:4,m:false}});
 return out}
function initial(c){const actor=c.game.players[c.game.turn].uid;let r=(c.jail?applyJailRoll:applyRoll)(c.game,actor,c.dice);for(const kind of c.route)r=chooseTurn(r.game,actor,r,kind);return r}
module.exports={cases,initial,game,dice};
