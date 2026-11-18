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
 endNow(s);endNow(s);assert.equal(s.over,false);assert.deepEqual(s.clock,{pid:0,round:1,since:1});
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

check('effects and the view never change the match: same hash and winner with fx on, view called every step',()=>{
 for(const seed of [11,12,13]){const ps=[{ai:'route'},{ai:'random'},{ai:'route'},{ai:'route'}];
  const a=SC.playOut(SC.newMatch({seed,players:ps}));
  const b=SC.newMatch({seed,players:ps,fx:true});let events=0;
  while(!b.over){const before=JSON.stringify(b);SC.view(b);assert.equal(JSON.stringify(b),before,'view mutated state');const pd=SC.pending(b);SC.act(b,pd.player,SC.ai(b,pd.player));events+=SC.drain(b).length}
  assert.equal(SC.hash(a),SC.hash(b));assert.equal(a.winner,b.winner);assert.ok(events>100)}});

check('effect stream: steps follow legal edges, connector steps match LINKS, every roll ends in exactly one landing',()=>{
 const s=SC.newMatch({seed:21,players:[{ai:'route'},{ai:'random'},{ai:'route'}],fx:true});const all=[];
 while(!s.over){const pd=SC.pending(s);SC.act(s,pd.player,SC.ai(s,pd.player));all.push(...SC.drain(s))}
 let open=null,lastVia=null;for(const e of all){
  if(e.t==='roll'){assert.equal(open,null);open={steps:e.dice[0]+e.dice[1],n:0};lastVia=null}
  if(e.t==='step'){open.n++;if(e.via==='connector'){assert.equal(SC.LINKS[e.from],e.to);assert.notEqual(lastVia,'connector','re-cross')}else assert.equal(SC.next(e.from),e.to);lastVia=e.via}
  if(e.t==='land'){assert.equal(open.n,open.steps);open=null}}
 assert.ok(all.some(e=>e.t==='round'&&e.tally.length));assert.equal(all.filter(e=>e.t==='over').length,1)});

check('view: 32 nodes with owner/stage, build reasons, route preview probabilities sum to 1',()=>{
 const s=SC.newMatch({seed:4,players:[{name:'You'},{level:'normal'}],length:'standard'});const v=SC.view(s);
 assert.equal(v.nodes.length,32);assert.equal(v.target,300);assert.equal(v.rounds,40);assert.equal(v.players[1].ai,'route');assert.equal(v.players[0].ai,null);
 for(const via of ['stay','cross'])assert.ok(Math.abs(v.preview[via].landing.reduce((n,x)=>n+x.p,0)-1)<1e-3);
 assert.deepEqual(v.preview.firstJunction,{node:'O0',stepsAway:0,crossTo:'I0'});
 give(s,0,['O1','O4']);s.own.O4.h=1;s.phase='build';const b=SC.view(s).build;
 assert.deepEqual(b.map(x=>[x.node,x.reason]),[['O1',null],['O4','needs-network-2']])});

check('lengths: Quick is marked experimental; Standard 300/40 and Extended 480/60',()=>{
 assert.deepEqual([SC.LENGTHS.quick.target,SC.LENGTHS.standard.target,SC.LENGTHS.extended.target],[200,300,480]);
 assert.equal(SC.LENGTHS.quick.experimental,true);assert.equal(SC.LENGTHS.standard.experimental,false);
 assert.throws(()=>SC.newMatch({length:'blitz'}),/unknown length/)});

check('saves: own slot, exact resume, fx not saved, newer version and other rulesets refused untouched',()=>{
 const s=SC.newMatch({seed:31,players:[{ai:'route'},{ai:'route'},{ai:'random'}],fx:true});
 for(let i=0;i<120&&!s.over;i++){const pd=SC.pending(s);SC.act(s,pd.player,SC.ai(s,pd.player))}assert.equal(s.over,false);
 const text=SC.serialize(s);const o=JSON.parse(text);assert.equal(o.key,'skylineCircuitSave');assert.deepEqual(o.state.fx,[]);
 assert.notEqual(SC.SAVE_KEY,'skylineSave');assert.notEqual(SC.SAVE_KEY,'skylineRingSave');
 const r=SC.restore(text);assert.ok(r.ok);SC.playOut(r.state);SC.playOut(s);assert.equal(SC.hash(r.state),SC.hash(s));
 const newer=JSON.stringify({...o,v:SC.VERSION+1});assert.deepEqual(SC.restore(newer),{ok:false,reason:'newer-version'});
 assert.equal(SC.restore(JSON.stringify({...o,ruleset:'harbour-ring'})).reason,'wrong-ruleset');
 assert.equal(SC.restore('{oops').reason,'invalid');
 const bad=JSON.parse(text);bad.state.own.O1.h=9;assert.equal(SC.restore(bad).reason,'invalid');
 const bad2=JSON.parse(text);bad2.state.players[0].pos='X9';assert.equal(SC.restore(bad2).reason,'invalid')});

check('career facts: shape for SkylineCareerCore.record, weakest opponent decides the AI level, no wall clock in the rules',()=>{
 const s=SC.newMatch({seed:41,length:'standard',players:[{name:'You'},{level:'hard'},{level:'normal'}],meta:{matchId:'circuit:abc',startedAt:1000}});
 while(!s.over){const pd=SC.pending(s);const me=pd.player===0;const a=me?(pd.type==='roll'?{type:'roll',via:'stay'}:pd.type==='buy'?{type:'buy'}:pd.type==='route'?{type:'route',via:'stay'}:{type:'end'}):SC.ai(s,pd.player);
  if(me&&pd.type==='buy'&&s.players[0].cash<pd.price)a.type='pass';SC.act(s,pd.player,a)}
 const f=SC.careerFacts(s,{ownerSeat:0,endedAt:999999});
 for(const k of ['board','matchId','startedAt','endedAt','sim','fast','online','assisted','over','ownerHuman','rounds','activity','won','score','aiOpponents','aiLevel'])assert.ok(k in f,k);
 assert.equal(f.board,'circuit');assert.equal(f.matchId,'circuit:abc');assert.equal(f.ownerHuman,true);assert.equal(f.aiOpponents,2);assert.equal(f.aiLevel,'normal');
 assert.equal(f.experimental,false);assert.equal(f.won,s.winner===0);
 const q=SC.newMatch({seed:1,length:'quick',players:[{name:'You'},{level:'easy'}]});assert.equal(SC.careerFacts(q).experimental,true);assert.equal(SC.careerFacts(q).aiLevel,'easy')});

check('layout check: reference layout passes; wrong direction, missing nodes, crowding and connectors over tiles fail',()=>{
 const ok=SC.validateLayout(SC.referenceLayout());assert.ok(ok.ok,ok.errors.join());assert.equal(ok.stats.connectors.length,4);
 const flip=SC.referenceLayout();for(const k of Object.keys(flip.nodes))if(k[0]==='O')flip.nodes[k].x*=-1;assert.ok(SC.validateLayout(flip).errors.includes('outer-ring-not-clockwise'));
 const miss=SC.referenceLayout();delete miss.nodes.I5;assert.ok(SC.validateLayout(miss).errors.includes('missing-or-bad:I5'));
 const extra=SC.referenceLayout();extra.nodes.O20={x:0,y:0};assert.ok(SC.validateLayout(extra).errors.includes('unknown-node:O20'));
 assert.equal(SC.validateLayout(SC.referenceLayout(120,70)).ok,false); // too small for 44 pt spacing
 const over=SC.referenceLayout();over.nodes.I2={x:over.nodes.O5.x*.8,y:over.nodes.O5.y*.8};assert.ok(SC.validateLayout(over,{minSpacing:20}).errors.some(e=>e.startsWith('connector-O5-I3-passes')))});

check('pacing knobs: Quick forbids an influence win before round 12; hold:2 needs one more round; defaults unchanged',()=>{
 const q=SC.newMatch({seed:2,length:'quick',players:[{},{}]});assert.equal(q.cfg.minWinRound,12);assert.equal(q.cfg.target,200);
 q.players[0].inf=500;for(let r=1;r<=11;r++){endNow(q);endNow(q)}assert.equal(q.over,false);assert.equal(q.round,12);
 assert.equal(SC.view(q).clock.winsAtEndOfRound,12);endNow(q);endNow(q);assert.equal(q.over,true);assert.equal(q.endReason,'influence');assert.equal(q.round,12);
 const h=SC.newMatch({seed:2,target:50,players:[{},{}],rules:{hold:2}});h.players[0].inf=60;
 endNow(h);endNow(h);endNow(h);endNow(h);assert.equal(h.over,false);endNow(h);endNow(h);assert.equal(h.over,true);assert.equal(h.round,3);
 const d=SC.newMatch({seed:2,length:'standard',players:[{},{}]});assert.deepEqual([d.cfg.minWinRound,d.cfg.hold,d.cfg.payday,d.cfg.buildFactor],[0,1,200,.5])});

console.log(`circuit-rules: ${n} checks passed`);
