const {game:base,dice}=require('./turn-cases.cjs'),{stock}=require('./asset-cases.cjs'),{applyRoll,chooseTurn,startAuction,bidAuction}=require('./turn-kernel.cjs');
function cases(){const out=[],add=(name,ai='normal',cash=1600,draw=0,square=7,opening=10,change=()=>{})=>{const g=base();g.own.forEach(o=>Object.assign(o,{o:-1,h:0,m:false}));g.players[0].rrUsed=6;Object.assign(g.players[1],{ai:true,uid:null,cash});g.players[0].pos=(square-7+40)%40;g.set.ai=ai;change(g);stock(g);out.push({name,game:g,dice:dice(3,4),opening,draw})};
 for(const ai of ['easy','normal','hard'])for(const cash of [20,30,60,110,200,1600])for(let draw=0;draw<5;draw++)for(const square of [7,5,14,39])add(ai+' cash '+cash+' index '+draw+' square '+square,ai,cash,draw,square);
 for(const ai of ['easy','normal','hard'])for(let draw=0;draw<5;draw++)add(ai+' wins after human drops '+draw,ai,1600,draw,7,0);
 for(let draw=0;draw<5;draw++){add('group completion value '+draw,'hard',1600,draw,7,10,g=>{g.own[8].o=1;g.own[9].o=1});add('rail network value '+draw,'normal',1600,draw,5,10,g=>{g.own[16].o=1;g.own[26].o=1});add('second utility value '+draw,'normal',1600,draw,14,10,g=>g.own[23].o=1);add('threat raises reserve '+draw,'normal',150,draw,7,10,g=>{g.own[39]={o:0,h:5,m:false}})}
 for(const city of ['stockholm','nyc','tokyo','london','paris'])add('localized AI '+city,'normal',1600,2,7,10,g=>g.set.city=city);
 add('next AI gets a separate checkpoint','normal',1600,2,7,10,g=>g.players.push({...g.players[1],id:2,name:'AI 2',goojf:[],declined:{}}));
 return out}
function initial(c){let r=applyRoll(c.game,c.game.players[0].uid,c.dice);r=chooseTurn(r.game,c.game.players[0].uid,r,'decline');r=startAuction(r.game,c.game.players[0].uid,r);r=bidAuction(r.game,c.game.players[0].uid,r,c.opening);return r}
module.exports={cases,initial};
