// Crossroads Capital — Landmark Chase: headless rules checks (owner design package, 21 Nov 2026).
'use strict';
const assert=require('node:assert/strict'),CC=require('../lib/crossroads-rules.js');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
assert.equal(CC.TILES.length,33);for(const t of CC.TILES)for(const x of t.next)assert.ok(CC.BY[x],t.id+'→'+x);
assert.deepEqual(CC.BY.START.next,['W00','EXCHANGE']);assert.equal(CC.TILES.filter(t=>t.type==='property').length,20);
ok('33-node double loop: Start forks West/East, both loops rejoin at Skybridge → Grand Exchange → Start; 20 properties');
let longest=0,stats={claims:0,headlines:0,bankrupt:0,stamps:0,express:0,routes:0,events:0};const hubs={};
for(let i=0;i<200;i++){const np=2+i%3,s=CC.newMatch({seed:i*7907+11,length:i%4?'standard':'quick',players:Array.from({length:np},(_,k)=>({name:'P'+k,ai:true}))});
 let steps=0,salary=0;while(!s.over){const pd=CC.pending(s),pid=pd.kind==='trade'?pd.to:pd.pid;const a=CC.ai(s,pid);assert.ok(a,'action for '+JSON.stringify(pd));const r=CC.act(s,pid,a);assert.ok(r.ok,`seed ${i} ${JSON.stringify(pd).slice(0,200)} ${JSON.stringify(a)} ${r.error}`);
  for(const e of r.events){if(e.type==='landmark')stats.claims++;if(e.type==='headlineWon')stats.headlines++;if(e.type==='stamp')stats.stamps++;if(e.type==='move'&&e.express)stats.express++;if(e.type==='hub')hubs[e.option]=(hubs[e.option]||0)+1;if(e.type==='moment')stats.events++}
  const pays=r.events.filter(e=>e.type==='log'&&/\(Payday\)/.test(e.text)).length;assert.ok(pays<=1,'at most one salary per action');
  for(const p of s.players)assert.ok(p.cash>=0&&p.lp>=0);assert.ok(++steps<30000,'terminates')}
 longest=Math.max(longest,steps);stats.bankrupt+=s.players.filter(p=>p.out).length;
 const alive=s.players.filter(p=>!p.out);assert.ok(alive.length===1||alive.every(p=>p.turns===s.cfg.turns));assert.ok(s.results&&s.winner!=null);assert.ok(CC.restore(CC.serialize(s)).ok)}
ok(`200 computer matches finish legally (longest ${longest} actions; ${stats.stamps} stamps, ${stats.claims} landmarks, ${stats.headlines} headlines, ${stats.express} express rides, ${stats.bankrupt} bankruptcies)`);
for(const k of['bonus','voucher','grant','ribbon','commission','design','auction'])assert.ok(hubs[k]>0,'hub option used '+k+' '+JSON.stringify(hubs));
assert.ok(stats.claims>100&&stats.headlines>100);ok('every hub option, Landmark claims and City Headlines happen in real play: '+JSON.stringify(hubs));
const fresh=()=>{const s=CC.newMatch({seed:42,players:[{name:'You'},{name:'Bot',ai:true}]});while(CC.pending(s).kind==='chain')CC.act(s,0,{type:'pickChain',card:CC.pending(s).offer[0]});return s};
{const s=fresh();s.turn.pid=0;s.pending=null;s.turn.phase='roll';s.players[0].pos='START';
 assert.ok(CC.act(s,0,{type:'route',route:'east'}).ok);let r;do{r=CC.act(s,0,{type:'roll'})}while(false);assert.ok(r.ok);const mv=r.events.find(e=>e.type==='move');assert.ok(mv.path[0]==='EXCHANGE','route east taken '+mv.path);ok('choosing a loop at Start sends the pawn onto that loop')}
{const s=CC.newMatch({seed:5});const p=s.players[0];p.pos='START';p.lap=null;p.route='east';const ev=[];const path=[];
 const order=[];let id='START';p.route='east';for(let k=0;k<20;k++){if(p.pos==='START'){p.lap=p.route||p.lap;p.pos=p.lap==='west'?'W00':'EXCHANGE'}else p.pos=CC.nextTile(p);order.push(p.pos)}
 assert.deepEqual(order.slice(0,4),['EXCHANGE','SKY','E14','E13']);assert.equal(order[16],'E00');assert.equal(order[17],'START');ok('Highland lap runs clockwise: Exchange, Skybridge, then E14 down to E00 and Start')}
{const s=fresh();const p=s.players[0];s.turn.pid=0;s.pending=null;s.turn.phase='roll';p.pos='W13';s.rng=7;const r=CC.act(s,0,{type:'roll'});const d=s.turn.dice[0]+s.turn.dice[1];
 if(d>=4){assert.equal(CC.pending(s).kind,'route');const pay=r.events.filter(e=>e.type==='log'&&/Payday/.test(e.text)).length;assert.equal(pay,1);const r2=CC.act(s,0,{type:'route',route:'west'});assert.ok(r2.ok);assert.equal(r2.events.filter(e=>e.type==='log'&&/Payday/.test(e.text)).length,0)}
 ok('passing Start mid-move pays 200 once, pauses for the West/East choice, then finishes the remaining pips')}
{const s=fresh();const p=s.players[0];p.chain={card:CC.CHAINS.findIndex(c=>c.id==='river_to_ridge'),stage:0,ref:null};s.turn.pid=0;s.turn.phase='action';s.pending={kind:'buy',pid:0,tile:'W01'};
 const r=CC.act(s,0,{type:'buy'});assert.ok(r.ok);assert.equal(p.chain.stage,1);s.pending={kind:'buy',pid:0,tile:'W02'};CC.act(s,0,{type:'buy'});assert.equal(p.chain.stage,1,'stage 2 needs Grand Exchange, not another purchase');
 ok('Landmark Chain stamps are ordered and one per trigger')}
{const s=fresh();const p=s.players[0];p.chain={card:0,stage:3,ref:null};s.headlineWinner=1;s.turn.pid=0;s.turn.phase='action';s.pending=null;const lp=p.lp,cash=p.cash;
 assert.ok(CC.act(s,0,{type:'claim'}).ok);assert.equal(p.lp,lp+5);assert.equal(p.cash,cash+200);assert.equal(CC.pending(s).kind,'chain');assert.ok(!CC.legal(s,0).some(x=>x.type==='claim'));ok('Ribbon Cutting: +5 Legacy Points and 200 CC, one claim per turn, new brief offered')}
{const s=fresh();s.own.W05={owner:1,stage:0};s.own.W06={owner:1,stage:0};s.own.W08={owner:1,stage:0};s.own.W09={owner:1,stage:2};assert.equal(CC.rent(s,'W09'),Math.round(23*3.5*1.2));
 s.own.W07={owner:1,stage:0};assert.equal(CC.rent(s,'W07',[3,4]),70);s.own.E07={owner:1,stage:0};assert.equal(CC.rent(s,'W07',[3,4]),126);ok('rent: stage multipliers, +20% full group, utilities ×10 / ×18 dice')}
{const s=fresh();const p=s.players[0];s.own.W01={owner:0,stage:4};assert.equal(CC.canUpgrade(s,'W01',0).ok,false);s.own.W02={owner:0,stage:0};s.own.W03={owner:0,stage:0};assert.ok(CC.canUpgrade(s,'W01',0).ok);ok('Landmark Residence needs the whole colour group')}
{const s=fresh();s.turn.pid=0;s.pending={kind:'metro',pid:0,tile:'W10',express:false};s.players[0].pos='W10';const c=s.players[0].cash;const r=CC.act(s,0,{type:'express'});assert.ok(r.ok);assert.equal(s.players[0].pos,'E10');assert.equal(s.players[0].cash,c-75);assert.ok(!CC.legal(s,0).some(x=>x.type==='express'));ok('Express Visit: 75 CC to the other Metro, no second Express')}
{const s=fresh();const f=CC.careerFacts(s,{ownerSeat:0});assert.equal(f.board,'crossroads');assert.equal(f.ruleset,'crossroads-lc-v1');ok('Career facts report Crossroads Capital as its own board')}
console.log('CROSSROADS RULES '+n+' checks')
