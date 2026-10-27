const {game:base}=require('./turn-cases.cjs'),{line}=require('./audited-rules.cjs');
function game(n=2){const g=base();g.phase='post';g.first=0;g.doubles=2;for(let i=2;i<n;i++)g.players.push({...JSON.parse(JSON.stringify(g.players[1])),id:i,uid:'seat-'+i,name:'Player '+i,tok:'🏍️',col:'#41c8ff'});return g}
function cases(){const out=[],add=(name,change=()=>{},drawSpec=[])=>{const g=game();change(g);out.push({name,game:g,drawSpec})};
 add('ordinary turn handoff');add('round wrap',g=>g.turn=1);add('doubles count resets',g=>g.doubles=3);
 add('nonzero opening seat wraps correctly',g=>{g.first=1;g.turn=0});
 add('bankrupt opening seat still counts a round',g=>{const x=game(3);Object.assign(g,x);g.first=1;g.players[1].bankrupt=true;g.players[1].cash=0});
 add('multiple bankrupt seats are skipped',g=>{Object.assign(g,game(4));g.turn=3;g.first=2;for(const i of [0,1]){g.players[i].bankrupt=true;g.players[i].cash=0}g.own.forEach(o=>{if(o.o===0)o.o=-1})});
 add('next human enters jail decision',g=>{g.players[1].inJail=true;g.players[1].pos=10;g.players[1].jailTurns=1});
 add('next UID-less AI waits for trusted worker',g=>{g.players[1].ai=true;g.players[1].uid=null});
 add('AI stand-in waits for trusted worker',g=>g.players[1].ai=true);
 add('events disabled consume no randomness',g=>{g.turn=1;g.set.events=false});
 add('odd round consumes no randomness',g=>{g.turn=1;g.round=2;g.set.events=true;g.event={id:'party',round:2}});
 add('same round consumes no randomness',g=>{g.set.events=true;g.event={id:'boom',round:1}});
 add('expired event remains historical when events are off',g=>{g.turn=1;g.set.events=false;g.event={id:'boom',round:1}});
 const cities=Object.keys(JSON.parse(line('const CITY_RAW=').slice(15).replace(/;\s*$/,'')));
 for(const city of cities){add('local festival '+city,g=>{g.set.city=city;g.set.events=true;g.turn=1},[0]);add('local storm '+city,g=>{g.set.city=city;g.set.events=true;g.turn=1},[1,9])}
 for(let i=0;i<12;i++)add('Lagos event pool index '+i,g=>{g.turn=1;g.set.events=true},i===5?[1,i,1]:[1,i]);
 for(const city of ['london','paris','berlin','accra','johannesburg'])add('local pool extra '+city,g=>{g.set.city=city;g.set.events=true;g.turn=1},[1,10]);
 add('festival excludes bankrupt seats',g=>{Object.assign(g,game(3));g.turn=2;g.players[1].bankrupt=true;g.players[1].cash=0;g.set.events=true},[0]);
 add('grant excludes bankrupt seats and keeps tie order',g=>{Object.assign(g,game(3));g.turn=2;g.players[1].bankrupt=true;g.players[1].cash=0;g.set.events=true},[1,4]);
 add('lottery chooses among living players',g=>{Object.assign(g,game(3));g.turn=2;g.players[1].bankrupt=true;g.players[1].cash=0;g.set.events=true},[1,5,1]);
 add('timed final round ends before another roll',g=>{g.set.mode='timed';g.set.rounds=10;g.round=10;g.turn=1});
 add('timed nonfinal seat stays in same round',g=>{g.set.mode='timed';g.set.rounds=10;g.round=10});
 add('resumed expired timed game ends without advancement',g=>{g.set.mode='timed';g.set.rounds=10;g.round=11;g.phase='pre'});
 add('45-round boundary retains event-before-ranking order',g=>{g.set.mode='timed';g.set.rounds=45;g.round=45;g.turn=1;g.set.events=true;g.players[0].cash=1500;g.players[1].cash=1700},[1,4]);
 add('quick first bankruptcy produces standings',g=>{Object.assign(g,game(3));g.set.mode='quick';g.players[2].bankrupt=true;g.players[2].cash=0});
 add('classic last living player ends immediately',g=>{g.players[1].bankrupt=true;g.players[1].cash=0});
 add('timed net worth counts developed assets',g=>{g.set.mode='timed';g.set.rounds=10;g.round=11;g.own[1].h=1;g.houses--;g.players[1].cash=1700});
 add('forced winner retains existing standings order',g=>{g.set.mode='timed';g.set.rounds=10;g.round=11;g.forceWin=1});
 return out;
}
function provider(spec){let i=0;const calls=[];return{calls,draw:max=>{if(i>=spec.length)throw Error('Unexpected entropy request');const value=spec[i++];calls.push({max,value});return value}}}
module.exports={game,cases,provider};
