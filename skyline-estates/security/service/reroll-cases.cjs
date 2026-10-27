const {game,dice}=require('./turn-cases.cjs'),{stock}=require('./asset-cases.cjs'),{applyRoll}=require('./turn-kernel.cjs');
function cases(){const out=[],add=(name,replacement,change=()=>{},old=dice(3,4),choices=[])=>{const g=game();g.players[0].tl=2;change(g);stock(g);out.push({name,game:g,dice:old,replacement,choices})};
 const limits=[0,0,1,1,2,2,3];
 for(let tier=2;tier<=6;tier++)for(let used=0;used<limits[tier];used++)for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)add('tier '+tier+' used '+used+' replacement '+a+'/'+b,dice(a,b),g=>{g.players[0].tl=tier;g.players[0].rrUsed=used});
 for(let old=1;old<=6;old++)for(let next=1;next<=6;next++)add('turbo '+old+' replaced by '+next,dice(1,2,next),g=>{g.set.speedDie=true;g.players[0].lapped=true},dice(3,4,old));
 add('replacement purchase consent',dice(3,4),()=>{},undefined,['buy']);
 add('replacement decline preserves auction',dice(3,4),()=>{},undefined,['decline']);
 add('replacement doubles purchase preserves extra roll',dice(4,4),()=>{},undefined,['buy']);
 add('replacement third doubles go to jail',dice(2,2),g=>g.doubles=2);
 add('replacement third doubles use Lucky Pass',dice(2,2),g=>{g.doubles=2;g.players[0].tl=3});
 add('replacement rent retains shield',dice(3,4),g=>{g.players[0].tl=5;g.own[7].o=1});
 add('replacement debt retains saved dice',dice(3,4),g=>{g.players[0].cash=0;g.own[7].o=1});
 for(const city of ['stockholm','nyc','tokyo','london','paris'])add('localized replacement '+city,dice(3,4),g=>g.set.city=city);
 add('replacement star waits after purchase',dice(1,2,5),g=>{g.players[0].pos=38;g.players[0].lapped=true;g.set.speedDie=true;g.own[1].o=-1},dice(3,4,6),['buy']);
 add('replacement taxi needs two purchases',dice(1,2,6),g=>{g.players[0].pos=38;g.players[0].lapped=true;g.set.speedDie=true;g.own[1].o=-1},dice(3,4,5),['buy','buy']);
 return out}
const initial=c=>applyRoll(c.game,c.game.players[c.game.turn].uid,c.dice);
module.exports={cases,initial,game,dice};
