const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const game=read('game.html'),cvHtml=read('city-ventures.html'),app=read('lib/approved-board-app.js');
const CV=require('../lib/city-ventures-rules.js');
// Execute the real classic renderer: every classic entry mode shares this controller.
const main={FAST:false,G:null,NET:{me:'me'},PREF:{xp:0},tok3:[],SQ:[],GROUPS:{},GC:{},cards:[],champ:false,innerWidth:844,
 propsOf:()=>[],isLocalHuman:()=>false,hasLvl:()=>false,esc:String,fmt:String,lvlOf:()=>1,evDef:()=>null,forSale:()=>0,pushState(){},achScan(){},badgeTap(){},
 skylineChampionshipActive(){return this.champ},skylineChampionshipScore:p=>({total:p.score}),netWorth:p=>p.cash,
 el:()=>({style:{setProperty(){}},innerHTML:'',onclick:null})};
main.P=i=>main.G.players[i];main.skylineChampionshipActive=()=>main.champ;
main.$=id=>id==='#roster'?{set innerHTML(v){main.cards=[]},append(d){main.cards.push(d)}}:{style:{setProperty(){}},textContent:''};
vm.createContext(main);vm.runInContext(game.match(/^function standings\(\).*$/m)[0]+'\n'+game.slice(game.indexOf('function renderRoster(){'),game.indexOf('function setPrompt(')),main);
for(const mode of ['solo','pass-and-play','custom','online','origins','championship','duel']){
 main.champ=['championship','duel'].includes(mode);main.G={players:[{id:0,name:'You',cash:500,score:10,col:'red'},{id:1,name:'Mia',cash:900,score:30,col:'blue',ai:true},{id:2,name:'Noah',cash:700,score:20,col:'green',ai:true}],turn:0,round:1,set:{mode:'classic'},own:{}};
 main.G.players.forEach(p=>p.bankrupt=false);
 const before=JSON.stringify(main.G);main.renderRoster();assert.deepEqual(main.cards.map(x=>x.id),['pc1','pc2','pc0'],mode+' leader first');assert.equal(JSON.stringify(main.G),before);
 if(main.champ){main.G.players[0].score=40;main.renderRoster();assert.equal(main.cards[0].id,'pc0','Championship/Duel score outranks a rival with more cash');assert.equal(main.G.players[0].cash,500);}
 main.G.players[0].cash=1500;main.G.players[0].score=40;main.renderRoster();assert.equal(main.cards[0].id,'pc0');
 main.G.players[0].bankrupt=true;main.renderRoster();assert.equal(main.cards.at(-1).id,'pc0');assert.equal(main.G.turn,0);console.log('PASS',mode,'live leaders, eliminated last, seat/turn/save unchanged');
}
const cvSource=cvHtml.match(/function rankedPlayers\(state\)\{[\s\S]*?\n\}/);assert.ok(cvSource,'City Ventures must rank the HUD');
const ctx={CV};vm.createContext(ctx);vm.runInContext(cvSource[0],ctx);
const s=CV.newMatch({seed:8,players:[{name:'You'},{name:'Mia',ai:true},{name:'Noah',ai:true}]});s.players[2].cash+=1000;const before=CV.serialize(s);assert.equal(ctx.rankedPlayers(s)[0].id,2);assert.equal(CV.serialize(s),before);
s.players[1].cash+=2000;assert.equal(ctx.rankedPlayers(s)[0].id,1);s.players[1].out=true;const expected=Array.from(ctx.rankedPlayers(s),p=>p.id);CV.closeMatch(s);assert.deepEqual(expected,s.results.map(p=>p.pid));assert.ok(cvHtml.includes('rankedPlayers(s).map(p=>'));console.log('PASS City Ventures live City Value/final ranking parity');
// Load the actual ESM rules as an isolated module, avoiding the WebGL renderer.
(async()=>{const R=await import('data:text/javascript;base64,'+Buffer.from(read('lib/approved-board-rules.js')).toString('base64'));
 const source=app.match(/function rankedSeats\(\)\{[^\n]+\}/);assert.ok(source,'Dominion/Empire HUD must use actual score ordering');
 for(const board of ['dominion','empire']){const spaces=Array.from({length:board==='dominion'?48:32},(_,id)=>({id,kind:'property',price_sc:100000,upgrade_sc:10000}));
  const s={board,players:[{id:0,name:'You',cash:500000},{id:1,name:'Mia',cash:700000},{id:2,name:'Noah',cash:600000}],properties:{},turn:0};
  s.players.forEach(p=>p.bankrupt=false);
  const c={R,s,spaces};vm.createContext(c);vm.runInContext(source[0],c);const saved=JSON.stringify(s);assert.deepEqual(Array.from(c.rankedSeats(),p=>p.id),[1,2,0]);assert.equal(JSON.stringify(s),saved);
  s.properties[0]={owner:0,stage:5};s.players[0].cash=900000;assert.equal(c.rankedSeats()[0].id,0);s.players[0].bankrupt=true;assert.equal(c.rankedSeats().at(-1).id,0);assert.equal(s.turn,0);console.log('PASS',board,'live worth, eliminated last, immutable seats');
 }
 assert.ok(app.includes('const players=rankedSeats()'),'both roster and compact panel use ranked seats');
})().catch(e=>{console.error(e);process.exitCode=1});
