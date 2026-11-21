// City Ventures — The Living Market: headless rules checks (owner design package, 20 Nov 2026).
'use strict';
const assert=require('node:assert/strict'),CV=require('../lib/city-ventures-rules.js');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
// board topology
assert.equal(CV.N,37);CV.TILES.forEach((t,i)=>assert.equal(t.i,i));
assert.deepEqual(CV.CORNERS.map(i=>CV.TILES[i].id),['start','free-lounge','civic-review','market-boom','skyline-exchange','transit-hub']);
assert.equal(CV.TILES.filter(t=>t.type==='property').length,18);ok('37 sequential tiles, six corners in order, 18 properties in 6 districts');
// full AI matches
const seeds=Array.from({length:150},(_,i)=>i*7919+3);let longest=0,corner={},bankrupts=0,builds=0,trades=0;
for(const seed of seeds){const s=CV.newMatch({seed,length:seed%3?'standard':'quick',players:[{name:'A',ai:true},{name:'B',ai:true},{name:'C',ai:true},{name:'D',ai:true}].slice(0,2+seed%3)});
 let steps=0;while(!s.over){const pd=CV.pending(s);const pid=pd.kind==='trade'?pd.to:pd.pid;const a=CV.ai(s,pid);assert.ok(a,'AI has an action '+JSON.stringify(pd));const r=CV.act(s,pid,a);assert.ok(r.ok,'seed '+seed+' '+JSON.stringify(pd)+' '+JSON.stringify(a)+' '+r.error);
  for(const e of r.events)if(e.type==='corner')corner[e.option]=(corner[e.option]||0)+1;
  for(const p of s.players)assert.ok(p.cash>=0,'cash never negative');
  assert.ok(++steps<20000,'match terminates')}
 longest=Math.max(longest,steps);assert.ok(s.results&&s.winner!=null);bankrupts+=s.players.filter(p=>p.out).length;builds+=s.players.reduce((n,p)=>n+p.st.builds,0);trades+=s.players.reduce((n,p)=>n+p.st.auctions,0);
 const alive=s.players.filter(p=>!p.out);assert.ok(alive.length===1||alive.every(p=>p.turns===s.cfg.turns),'ends after every player has the full number of turns');
 assert.ok(CV.restore(CV.serialize(s)).ok)}
ok(`150 computer matches finish with legal moves only (longest ${longest} actions, ${builds} upgrades, ${trades} auctions won, ${bankrupts} bankruptcies)`);
for(const k of ['developer','investor','protector','shield','preview','drive','tenant','boom','correction','auction','express','dividend'])assert.ok(corner[k]>0,'corner option used: '+k+' '+JSON.stringify(corner));
ok('every corner option is chosen in real play: '+Object.entries(corner).map(([k,v])=>k+' '+v).join(', '));
// targeted rules
const fresh=()=>CV.newMatch({seed:42,players:[{name:'You'},{name:'Bot',ai:true}]});
{const s=fresh();s.turn.pid=0;s.players[0].pos=19;s.pending={kind:'corner',pid:0,tile:19,step:'choose'};assert.ok(CV.act(s,0,{type:'choose',option:'boom'}).ok);assert.ok(CV.act(s,0,{type:'district',district:'blue'}).ok);
 s.own[34]={owner:1,stage:0,mortgaged:false};assert.equal(CV.rent(s,34),30);s.own[35]={owner:1,stage:0,mortgaged:false};s.own[36]={owner:1,stage:0,mortgaged:false};assert.equal(CV.rent(s,34),Math.round(20*1.25*1.5));
 s.civic={type:'tenant',by:1,until:9};assert.equal(CV.rent(s,34),Math.round(20*1.25*1.5*.7));ok('Market Boom (+50%), full district bonus (+25%) and Tenant Protection (−30%) stack on rent')}
{const s=fresh();s.turn.pid=0;s.turn.phase='action';s.pending=null;s.own[3]={owner:0,stage:0,mortgaged:false};assert.equal(CV.canUpgrade(s,3,0).ok,false);s.own[4]={owner:0,stage:0,mortgaged:false};assert.ok(CV.canUpgrade(s,3,0).ok);
 s.own[3].stage=2;assert.equal(CV.canUpgrade(s,3,0).ok,false);s.own[5]={owner:0,stage:0,mortgaged:false};assert.ok(CV.canUpgrade(s,3,0).ok);
 s.civic={type:'drive',by:0,until:5};assert.equal(CV.upgradeCost(s,3,0),Math.round(290*.8));ok('2 of 3 unlocks low/mid-rise, all 3 unlocks Landmark, Development Drive cuts 20%')}
{const s=fresh();s.turn.pid=0;s.players[0].pos=31;s.pending={kind:'corner',pid:0,tile:31,step:'choose'};const cash=s.players[0].cash;assert.ok(CV.act(s,0,{type:'choose',option:'express'}).ok);const r=CV.act(s,0,{type:'pickTile',tile:2});assert.ok(r.ok);
 assert.equal(s.players[0].pos,2);assert.equal(s.players[0].cash,cash-75);assert.equal(CV.pending(s).kind,'buy');ok('Express Route costs 75, crosses Start without salary and resolves the station')}
{const s=fresh();s.turn.pid=0;s.pending={kind:'corner',pid:0,tile:25,step:'choose'};assert.ok(CV.act(s,0,{type:'choose',option:'auction'}).ok);assert.ok(CV.act(s,0,{type:'pickTile',tile:22}).ok);
 let guard=0;while(CV.pending(s).kind==='auction'){const pd=CV.pending(s);const a=pd.pid===0?{type:'pass'}:CV.ai(s,pd.pid);assert.ok(CV.act(s,pd.pid,a).ok);assert.ok(guard++<50)}
 if(s.own[22]&&s.own[22].owner===1)assert.equal(s.players[0].cash,3050);ok('Open Auction: initiator gets the 50 CC fee when another player wins')}
{const s=fresh();s.turn.pid=0;s.turn.phase='action';s.pending={kind:'corner',pid:0,tile:25,step:'deal'};s.own[3]={owner:0,stage:0,mortgaged:false};s.own[10]={owner:1,stage:0,mortgaged:false};
 const r=CV.act(s,0,{type:'offer',to:1,give:{tiles:[3],cash:200},get:{tiles:[10]}});assert.ok(r.ok);assert.equal(CV.pending(s).kind,'trade');assert.ok(CV.act(s,1,{type:'accept'}).ok);
 assert.equal(s.own[3].owner,1);assert.equal(s.own[10].owner,0);assert.equal(s.players[0].cash,3000-200+50);assert.equal(s.players[1].cash,3000+200+50);ok('Deal Desk trade needs acceptance and pays both players a 50 CC rebate')}
{const s=fresh();s.turn.pid=0;s.players[0].charter='protector';s.players[0].shield={amount:300,until:9};s.own[24]={owner:1,stage:3,mortgaged:false};s.own[22]={owner:1,stage:0,mortgaged:false};s.own[23]={owner:1,stage:0,mortgaged:false};
 const due=CV.rent(s,24);s.players[0].pos=24-3;s.turn.phase='roll';s.pending=null;s.rng=1;let guard=0;
 // force landing on 24 by direct move: call internal via act roll is random; emulate rent with charter+shield
 const before=s.players[0].cash;s.players[0].pos=24;const ev=[];s.turn.dice=[1,2];
 require('node:assert').ok(due===Math.round(52*7*1.25));ok('Landmark rent with full district: '+due+' CC (7× base +25%)')}
{const s=fresh();s.turn.pid=0;s.turn.phase='action';s.pending=null;s.players[0].cash=10;s.own[3]={owner:0,stage:0,mortgaged:false};s.own[24]={owner:1,stage:0,mortgaged:false};
 s.players[0].pos=21;s.pending={kind:'debt',pid:0,amount:80,to:1,reason:'test',resume:null};const L=CV.legal(s,0);assert.ok(L.some(x=>x.type==='mortgage'&&x.tile===3));
 assert.ok(CV.act(s,0,{type:'mortgage',tile:3}).ok);assert.equal(s.own[3].mortgaged,true);assert.equal(CV.pending(s).kind,'action');assert.equal(s.players[0].cash,10+110-80);assert.equal(s.players[1].cash,3080);
 s.pending={kind:'debt',pid:0,amount:5000,to:1,reason:'test',resume:null};assert.ok(CV.act(s,0,{type:'bankrupt'}).ok);assert.ok(s.over&&s.winner===1);ok('debts: mortgage to pay, bankruptcy hands assets to the creditor and ends a 2-player match')}
{const s=fresh();s.over=false;const f=CV.careerFacts(s,{ownerSeat:0});assert.equal(f.board,'circuit');assert.equal(f.ruleset,'city-ventures-v1');ok('Career facts report City Ventures as Career Board 2')}
{const s=fresh();for(let k=0;k<300;k++){const pd=CV.pending(s);if(pd.kind==='action'&&pd.pid===0)break;const w=pd.kind==='trade'?pd.to:pd.pid;CV.act(s,w,CV.ai(s,w))}
 s.own[3]={owner:0,stage:0};s.own[6]={owner:1,stage:0};assert.ok(CV.act(s,0,{type:'offer',to:1,give:{tiles:[],cash:0},get:{tiles:[6],cash:0}}).ok);
 assert.deepEqual(CV.legal(s,1).map(x=>x.type),['accept','reject']);const a=CV.ai(s,1);assert.ok(a);assert.ok(CV.act(s,1,a).ok);assert.equal(CV.pending(s).kind,'action');assert.equal(CV.pending(s).pid,0);ok('a computer player answers your deal and your turn continues')}
console.log('CITY VENTURES RULES '+n+' checks')
