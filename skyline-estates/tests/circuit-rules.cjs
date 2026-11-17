// Skyline Circuit rules prototype — unit checks (node tests/circuit-rules.cjs).
'use strict';
const assert=require('node:assert/strict'),SC=require('../lib/circuit-rules.js');
let n=0;const check=(name,fn)=>{fn();n++;console.log('ok',name)};
const two=(o={})=>SC.newMatch({seed:7,players:[{name:'A',ai:'route'},{name:'B',ai:'route'}],...o});
const give=(s,pid,ids,h=0)=>{for(const id of ids)s.own[id]={o:pid,h}};
// Drive the current player to the end of their turn without moving (scoring and turn-order checks).
const endNow=s=>{s.phase='build';s.move=null;SC.act(s,s.turn,{type:'end'})};

check('topology: 32 nodes, 20 properties, 4 events, 8 junctions, symmetric connectors, 5-property districts',()=>{
 const t=k=>SC.NODES.filter(x=>x.type===k).map(x=>x.id);
 assert.equal(SC.NODES.length,32);assert.equal(SC.PROPS.length,20);
 assert.deepEqual(t('event'),['O3','O8','O13','O18']);
 assert.deepEqual(t('junction'),['O0','O5','O10','O15','I0','I3','I6','I9']);
 for(const [a,b] of Object.entries(SC.LINKS))assert.equal(SC.LINKS[b],a);
 assert.deepEqual(SC.DISTRICTS.map(d=>d.length),[5,5,5,5]);
 assert.deepEqual(SC.DISTRICTS[1],['O6','O7','O9','I4','I5']);
 assert.equal(SC.next('O19'),'O0');assert.equal(SC.next('I11'),'I0')});

check('same seed gives the same match; different seeds differ',()=>{
 const h=seed=>SC.hash(SC.playOut(SC.newMatch({seed,players:[{ai:'route'},{ai:'random'},{ai:'route'}]})));
 assert.equal(h(42),h(42));assert.notEqual(h(42),h(43))});

check('state is plain JSON: a save taken mid-match resumes to the identical result',()=>{
 const a=SC.newMatch({seed:99,players:[{ai:'route'},{ai:'route'},{ai:'random'},{ai:'route'}]});
 for(let i=0;i<400&&!a.over;i++){const pd=SC.pending(a);SC.act(a,pd.player,SC.ai(a,pd.player))}
 const b=JSON.parse(JSON.stringify(a));assert.deepEqual(b,a);
 SC.playOut(a);SC.playOut(b);assert.equal(SC.hash(a),SC.hash(b));assert.equal(a.winner,b.winner)});

check('only the player whose decision it is may act; before-roll requires a declared route',()=>{
 const s=two();assert.equal(SC.pending(s).player,0);
 assert.throws(()=>SC.act(s,1,{type:'roll',via:'stay'}),/not this player/);
 assert.throws(()=>SC.act(s,0,{type:'roll'}),/declare stay or cross/);
 assert.deepEqual(SC.pending(s).options.map(o=>o.via),['stay','cross'])});

check('crossing uses one step and the next step follows the new ring (no immediate re-cross)',()=>{
 const s=two({rules:{routeTiming:'after-roll'}});const p=s.players[0];p.pos='O5';s.move={steps:3,at:'O5',noChoice:false};s.phase='route';
 SC.act(s,0,{type:'route',via:'cross'});assert.equal(p.pos,'I5');
 const t=two({rules:{routeTiming:'after-roll'}});const q=t.players[0];q.pos='O5';t.move={steps:3,at:'O5',noChoice:false};t.phase='route';
 SC.act(t,0,{type:'route',via:'stay'});assert.equal(q.pos,'O8')});

check('before-roll plan applies at the first junction reached; later junctions stay on the ring',()=>{
 for(let seed=1;seed<=60;seed++){const s=two({seed});const p=s.players[0],via=seed%2?'cross':'stay';
  const roll=(()=>{const c=JSON.parse(JSON.stringify(s));SC.act(c,0,{type:'roll',via});return c.log[0].match(/rolls (\d+)/)[1]*1})();
  const exp=SC.planPath(s,0,via,roll);SC.act(s,0,{type:'roll',via});assert.equal(p.pos,exp.at,`seed ${seed}`);
  if(via==='cross')assert.equal(SC.NODES.find(x=>x.id===p.pos).ring,'I')}});

check('Payday is paid when entering O0, never on the inner ring',()=>{
 const at=(pos,steps,via)=>{const s=two({rules:{routeTiming:'after-roll'}});const p=s.players[0];p.pos=pos;s.move={steps,at:pos,noChoice:false};s.phase='route';const c=p.cash;SC.act(s,0,{type:'route',via});return{s,p,gain:p.cash-c}};
 const o=at('O15',5,'stay');assert.equal(o.p.pos,'O0');assert.equal(o.gain,SC.CFG.payday); // landing on O0
 const q=at('O15',7,'stay');assert.equal(q.s.move.at,'O0');assert.equal(q.gain,SC.CFG.payday); // passing: route choice on Payday Junction
 const i=at('I9',3,'stay');assert.equal(i.p.pos,'I0');assert.equal(i.gain,0);
 const x=at('I9',3,'cross');assert.equal(x.p.pos,'O17');assert.equal(x.gain,0)});

check('networks: junctions bridge (also through connectors), event spaces break a chain',()=>{
 const s=two();give(s,0,['O2','O4']);assert.deepEqual(SC.networks(s,0).map(x=>x.size),[1,1]);
 give(s,0,['O6']);assert.deepEqual(SC.networks(s,0).map(x=>x.size).sort(),[1,2]);
 give(s,0,['I4']);const big=SC.networks(s,0).find(x=>x.size===3);assert.ok(big);assert.equal(big.rings,2);
 assert.deepEqual([...big.props].sort(),['I4','O4','O6'])});

check('building: Low-rise on any owned plot; Mid needs 2, High 3, Skyscraper 3 on both rings; reasons given',()=>{
 const s=two();give(s,0,['O1']);
 assert.equal(SC.canBuild(s,0,'O1'),true);assert.equal(SC.whyNot(s,1,'O1'),'not-owned');
 s.own.O1.h=1;assert.equal(SC.whyNot(s,0,'O1'),'needs-network-2');
 give(s,0,['O2']);assert.equal(SC.whyNot(s,0,'O1'),null);
 s.own.O1.h=2;assert.equal(SC.whyNot(s,0,'O1'),'needs-network-3');
 give(s,0,['O4']);assert.equal(SC.whyNot(s,0,'O1'),'needs-network-3'); // O3 is an event: O4 is not linked
 give(s,0,['O19']);assert.equal(SC.whyNot(s,0,'O1'),null);             // O19-O0-O1-O2 through Payday Junction
 s.own.O1.h=3;assert.equal(SC.whyNot(s,0,'O1'),'needs-network-3-both-rings');
 give(s,0,['I1']);assert.equal(SC.whyNot(s,0,'O1'),null);              // O0 connects to I0, beside I1
 s.own.O1.h=4;assert.equal(SC.whyNot(s,0,'O1'),'max-stage')});

check('one stage per property per turn, and no building on a plot bought this turn',()=>{
 const s=two();const p=s.players[0];give(s,0,['O1','O2']);s.phase='build';
 SC.act(s,0,{type:'build',node:'O1'});assert.equal(s.own.O1.h,1);
 assert.equal(SC.whyNot(s,0,'O1'),'one-stage-per-turn');assert.throws(()=>SC.act(s,0,{type:'build',node:'O1'}),/one-stage-per-turn/);
 s.bought.O2=true;assert.equal(SC.whyNot(s,0,'O2'),'bought-this-turn');assert.ok(p.cash<SC.CFG.startCash)});

check('rent and influence follow the published formulas',()=>{
 const s=two();give(s,0,['O1','O2'],2);give(s,0,['O6','O7','O9']);
 const price=SC.NODES.find(x=>x.id==='O1').price;
 assert.equal(SC.rent(s,'O1'),Math.round(price*.12*6*1.1));
 // O1,O2 Mid-rise (3 each) + O6,O7,O9 plots (1 each); networks {O1,O2} and {O6,O7} and {O9}; district 1 owns 3 of 5.
 assert.equal(SC.influenceOf(s,0),3+3+1+1+1+2*1+2*1+4)});

check('bankruptcy sells buildings at half cost, then returns properties; last solvent player wins',()=>{
 const s=two({rules:{routeTiming:'after-roll'}});const a=s.players[0];give(s,0,['O1'],2);give(s,1,['I1'],4);a.cash=10;
 a.pos='O0';s.move={steps:2,at:'O0',noChoice:false};s.phase='route';
 SC.act(s,0,{type:'route',via:'cross'}); // O0 -> I0 -> I1 (B's Skyscraper)
 assert.equal(a.pos,'I1');assert.equal(a.out,true);assert.deepEqual(s.own.O1,{o:-1,h:0});
 assert.equal(s.over,true);assert.equal(s.endReason,'last-solvent');assert.equal(s.winner,1);
 const t=two({rules:{routeTiming:'after-roll'}});const c=t.players[0];give(t,0,['O1'],2);give(t,1,['I1'],1);
 const r=SC.rent(t,'I1');c.cash=r-1;c.pos='O0';t.move={steps:2,at:'O0',noChoice:false};t.phase='route';SC.act(t,0,{type:'route',via:'cross'});
 assert.equal(c.out,false);assert.equal(t.own.O1.h,1);assert.equal(c.cash,r-1+Math.floor(SC.stageCost('O1')/2)-r)});

check('influence victory needs the target and a clear lead at two consecutive round ends; a tie resets the clock',()=>{
 const s=two({target:50});const [a,b]=s.players;a.inf=60;
 endNow(s);endNow(s);assert.equal(s.over,false);assert.deepEqual(s.clock,{pid:0,round:1});
 b.inf=60;endNow(s);endNow(s);assert.equal(s.clock,null);assert.equal(s.over,false);
 a.inf=70;endNow(s);endNow(s);assert.equal(s.over,false);endNow(s);endNow(s);
 assert.equal(s.over,true);assert.equal(s.endReason,'influence');assert.equal(s.winner,0);assert.equal(s.round,4)});

check('snake turn order reverses every round; round limit ends with the highest influence',()=>{
 const s=SC.newMatch({seed:3,players:[{},{},{}],rounds:3});const seq=[];
 while(!s.over){seq.push(s.turn);if(s.round===3&&s.turn===2)s.players[1].inf=999;endNow(s)}
 assert.deepEqual(seq,[0,1,2,2,1,0,0,1,2]);assert.equal(s.endReason,'round-limit');assert.equal(s.winner,1);
 const f=SC.newMatch({seed:3,players:[{},{},{}],rounds:2,rules:{order:'fixed'}});const sq=[];while(!f.over){sq.push(f.turn);endNow(f)}
 assert.deepEqual(sq,[0,1,2,0,1,2])});

check('bankrupt players are skipped in turn order',()=>{
 const s=SC.newMatch({seed:5,players:[{},{},{}]});s.players[1].out=true;const seq=[];
 for(let i=0;i<4;i++){seq.push(s.turn);endNow(s)}assert.deepEqual(seq,[0,2,2,0])});

check('300 complete AI matches across 2-4 players: no errors, no negative cash, every match ends',()=>{
 for(let k=0;k<300;k++){const np=2+k%3;const s=SC.newMatch({seed:5000+k,players:[...Array(np)].map((_,i)=>({ai:(k+i)%2?'random':'route'}))});
  while(!s.over){const pd=SC.pending(s);SC.act(s,pd.player,SC.ai(s,pd.player));for(const p of s.players)assert.ok(p.cash>=0,'cash '+k)}
  assert.ok(['influence','last-solvent','round-limit'].includes(s.endReason));assert.ok(s.round<=s.cfg.rounds)}});

console.log(`circuit-rules: ${n} checks passed`);
