const {game:base}=require('./turn-cases.cjs'),{stock}=require('./asset-cases.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),terms=(to,extra={})=>({to,give:[1],get:[7],gc:50,rc:10,gcard:0,rcard:0,...extra});
function game(n=2,turn=0,phase='post'){const g=base();g.players=Array.from({length:n},(_,id)=>({...copy(g.players[id?1:0]),id,uid:id?'guest-'+id:'host-uid',name:'Player '+id,goojf:[],declined:{}}));g.own.forEach(o=>Object.assign(o,{o:-1,h:0,m:false}));g.turn=turn;g.phase=phase;for(const i of [1,2,4])g.own[i].o=turn;for(const i of [7,8,9])g.own[i].o=(turn+1)%n;return g}
function hold(g,pid,deck,idx){g[deck]=g[deck].filter(i=>i!==idx);g.players[pid].goojf.push({deck,idx})}
function counter(t,extra={}){return{to:t.from,give:t.get.slice(),get:t.give.slice(),gc:t.rc,rc:t.gc,gcard:t.rcard,rcard:t.gcard,...extra}}
function cases(){const out=[],add=(name,g,offer,responses)=>{stock(g);out.push({name,game:g,offer,responses})};
 for(let n=2;n<=6;n++)for(let turn=0;turn<n;turn++)for(const phase of ['pre','post'])for(const decision of ['accept','decline'])add(n+' seats turn '+turn+' '+phase+' '+decision,game(n,turn,phase),terms((turn+1)%n),[{decision}]);
 for(const last of ['accept','decline']){const g=game(),offer=terms(1),c=counter({from:0,...offer},{gc:100});add('counter then '+last,g,offer,[{decision:'counter',offer:c},{decision:last}])}
 {const g=game(),offer=terms(1),responses=[];let t={from:0,...offer};for(let d=0;d<3;d++){const c=counter(t,{gc:(d+1)*20});responses.push({decision:'counter',offer:c});t={from:t.to,...c}}responses.push({decision:'accept'});add('three counters require fresh consent each time',g,offer,responses)}
 add('mortgaged property retains mortgage',game(),terms(1),[{decision:'accept'}]);out.at(-1).game.own[1].m=true;
 add('cash only',game(),terms(1,{give:[],get:[],gc:1600,rc:0}),[{decision:'accept'}]);
 add('property only',game(),terms(1,{gc:0,rc:0}),[{decision:'accept'}]);
 add('gift from turn owner',game(),terms(1,{get:[],gc:0,rc:0}),[{decision:'accept'}]);
 add('requested gift from recipient',game(),terms(1,{give:[],gc:0,rc:0}),[{decision:'accept'}]);
 {const g=game();hold(g,0,'chance',9);add('one Bail Pass from proposer',g,terms(1,{gcard:1}),[{decision:'accept'}])}
 {const g=game();hold(g,1,'esusu',6);add('one Bail Pass from recipient',g,terms(1,{rcard:1}),[{decision:'accept'}])}
 {const g=game();hold(g,0,'chance',9);hold(g,1,'esusu',6);add('both Bail Pass flags preserve source order',g,terms(1,{gcard:1,rcard:1}),[{decision:'accept'}])}
 {const g=game();Object.assign(g.players[1],{inJail:true,pos:10,jailTurns:1});add('jailed recipient may consent',g,terms(1),[{decision:'accept'}])}
 for(const city of ['stockholm','nyc','tokyo','london','paris']){const g=game();g.set.city=city;add('localized trade '+city,g,terms(1),[{decision:'accept'}])}
 return out}
module.exports={cases,game,terms,counter,hold};
