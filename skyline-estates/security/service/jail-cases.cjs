const {game:base,dice}=require('./turn-cases.cjs');
function game(){const g=base();g.phase='jail';g.doubles=0;Object.assign(g.players[0],{inJail:true,pos:10,jailTurns:0});return g}
function hold(g,deck,idx){g[deck]=g[deck].filter(i=>i!==idx);g.players[0].goojf.push({deck,idx})}
function cases(){const out=[],add=(name,kind,change=()=>{},roll=null,choices=[])=>{const g=game();change(g);out.push({name,game:g,kind,dice:roll,choices})};
 add('pay fixed bail','payBail');add('pay bail into jackpot','payBail',g=>g.set.pot=true);add('pay exact available bail','payBail',g=>g.players[0].cash=60);
 add('pay after two failed attempts resets attempts','payBail',g=>g.players[0].jailTurns=2);
 add('chance Bail Pass returns to its deck','useBailPass',g=>hold(g,'chance',9));add('City Hall Bail Pass returns to its deck','useBailPass',g=>hold(g,'esusu',6));
 add('two passes use the last held card','useBailPass',g=>{hold(g,'chance',9);hold(g,'esusu',6)});
 for(const city of ['lagos','stockholm','nyc','tokyo','london','paris'])add('localized bail '+city,'payBail',g=>g.set.city=city);
 for(let tier=1;tier<=6;tier++)add('bail ignores unrelated upgrade perks '+tier,'payBail',g=>g.players[0].tl=tier);
 for(let attempts=0;attempts<=2;attempts++)for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)add('attempt '+(attempts+1)+' dice '+a+'/'+b,'roll',g=>g.players[0].jailTurns=attempts,dice(a,b));
 add('third failed roll preserves an unpaid bail obligation','roll',g=>{g.players[0].jailTurns=2;g.players[0].cash=0},dice(2,3));
 add('third failed roll cannot overdraw fifty-nine cash','roll',g=>{g.players[0].jailTurns=2;g.players[0].cash=59},dice(2,3));
 add('third doubles escape free with no cash','roll',g=>{g.players[0].jailTurns=2;g.players[0].cash=0},dice(2,2));
 add('release purchase can be completed','roll',()=>{},dice(2,2),['buy']);
 add('third paid release purchase can be completed','roll',g=>g.players[0].jailTurns=2,dice(2,3),['buy']);
 add('release decline without auction ends management','roll',g=>g.set.auction=false,dice(2,2),['decline']);
 add('release decline preserves mandatory auction','roll',()=>{},dice(2,2),['decline']);
 add('jail doubles give no bonus roll after purchase','roll',g=>g.players[0].tl=2,dice(2,2),['buy']);
 for(let sv=1;sv<=6;sv++)add('existing jail release ignores turbo movement '+sv,'roll',g=>{g.players[0].jailTurns=2;g.players[0].lapped=true;g.set.speedDie=true},dice(2,3,sv),['buy']);
 add('rent after escape applies shield without reroll prompt','roll',g=>{g.players[0].jailTurns=2;g.players[0].tl=5;g.own[15].o=1},dice(2,3));
 add('rent debt after bail is distinct from bail debt','roll',g=>{g.players[0].jailTurns=2;g.players[0].cash=60;g.players[0].tl=5;g.own[15].o=1},dice(2,3));
 add('third failed bail enters and returns from jackpot','roll',g=>{g.players[0].jailTurns=2;g.set.pot=true;g.pot=300},dice(4,6));
 add('jail card boundary does not consume a card','roll',()=>{},dice(1,1));
 add('freeing doubles do not spend a held Bail Pass','roll',g=>hold(g,'chance',9),dice(2,2));
 return out;
}
module.exports={game,hold,cases,dice};
