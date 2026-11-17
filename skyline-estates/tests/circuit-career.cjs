// Circuit alpha ↔ Career (owner decisions 17 Nov 2026): Quick is experimental (mastery XP only, never unlocks);
// Standard and Extended qualify under the established rules; a mixed table counts as its weakest computer player;
// Circuit only counts when the alpha is on and Circuit is unlocked. Uses the real rules engine for the facts.
'use strict';
const assert=require('node:assert/strict'),C=require('../lib/career.js'),SC=require('../lib/circuit-rules.js');
let n=0;const check=(m,f)=>{f();n++;console.log('ok',m)};
const ON={alphaBoards:['circuit']};
// A finished Circuit match through the real engine; the human plays a fixed simple policy.
function match({seed=1,length='standard',levels=['normal','normal'],won=null,id}={}){
 const s=SC.newMatch({seed,length,players:[{name:'You'},...levels.map(level=>({level}))],meta:{matchId:id||'circuit-'+seed+'-'+length,startedAt:1e6+seed}});
 while(!s.over){const pd=SC.pending(s),me=pd.player===0;let a=me?(pd.type==='roll'?{type:'roll',via:'stay'}:pd.type==='buy'?{type:'buy'}:{type:'end'}):SC.ai(s,pd.player);SC.act(s,pd.player,a)}
 const f=SC.careerFacts(s,{ownerSeat:0,endedAt:1e6+seed+600000});if(won!=null)f.won=won;return f}
const unlocked=()=>{const s=C.fresh();s.unlocked.circuit=1;return s};
check('Circuit does not count without the alpha flag, even when unlocked',()=>{const s=unlocked();const r=C.record(s,match({seed:1}),{});assert.equal(r.ok,false);assert.equal(r.reason,'not-career')});
check('Circuit does not count while Circuit is still locked',()=>{const r=C.record(C.fresh(),match({seed:2}),ON);assert.equal(r.reason,'board-locked')});
check('Standard and Extended wins against Normal/Hard qualify; mastery XP is earned',()=>{for(const length of ['standard','extended']){const s=unlocked();
  const r=C.record(s,match({seed:3,length,won:true,levels:['normal','hard']}),ON);assert.ok(r.ok);assert.equal(r.qualifiedWin,true);assert.equal(r.experimental,false);
  assert.equal(s.boards.circuit.qualifiedWins,1);assert.equal(s.boards.circuit.xp,200)}});
check('Quick is experimental: a win earns mastery XP but never a qualifying win, so it never unlocks',()=>{const s=unlocked();
 for(let k=0;k<5;k++){const r=C.record(s,match({seed:10+k,length:'quick',won:true}),ON);assert.ok(r.ok);assert.equal(r.experimental,true);assert.equal(r.qualifiedWin,false);assert.deepEqual(r.unlocked,[])}
 assert.equal(s.boards.circuit.qualifiedWins,0);assert.equal(s.boards.circuit.wins,5);assert.equal(s.boards.circuit.xp,5*200);assert.equal(s.unlocked.dominion,undefined);
 // Facts cannot talk their way out of it: the board definition marks Quick experimental.
 const f=match({seed:20,length:'quick',won:true});f.experimental=false;assert.equal(C.qualify(f,ON).winCounts,false)});
check('mixed tables use the weakest computer player: one Easy seat makes a win non-qualifying',()=>{const f=match({seed:30,levels:['hard','easy','normal'],won:true});
 assert.equal(f.aiLevel,'easy');const s=unlocked();const r=C.record(s,f,ON);assert.ok(r.ok);assert.equal(r.qualifiedWin,false);assert.equal(s.boards.circuit.xp,200)});
check('wrong rules version or unknown length is refused; duplicates are refused',()=>{const s=unlocked();
 const a=match({seed:40});assert.equal(C.qualify({...a,ruleset:'circuit-v9'},ON).reasons.includes('wrong-ruleset'),true);
 assert.equal(C.qualify({...a,length:'blitz'},ON).reasons.includes('unknown-length'),true);
 assert.ok(C.record(s,a,ON).ok);assert.equal(C.record(s,a,ON).reason,'duplicate')});
check('view: Circuit is playable only with the alpha on, with Quick listed as experimental',()=>{const s=unlocked();
 const off=C.view(s,{}).find(b=>b.id==='circuit'),on=C.view(s,ON).find(b=>b.id==='circuit');
 assert.equal(off.status,'unlocked-preview');assert.equal(off.playable,false);assert.equal(on.status,'playable');assert.equal(on.alpha,true);
 assert.deepEqual(on.lengths,['standard','extended','quick']);assert.deepEqual(on.experimentalLengths,['quick'])});
check('two qualifying Circuit wins plus three district challenges unlock Dominion as a preview (sequential rules unchanged)',()=>{const s=unlocked();
 C.record(s,match({seed:50,won:true}),ON);C.record(s,match({seed:51,won:true}),ON);assert.equal(s.unlocked.dominion,undefined);
 for(const k of [1,2,3])C.completeChallenge(s,'circuit','d'+k,'district',ON);assert.ok(s.unlocked.dominion!=null);
 assert.equal(C.view(s,ON).find(b=>b.id==='dominion').status,'unlocked-preview')});
check('Origins behaviour is unchanged by the alpha context',()=>{const s=C.fresh();const f={board:'origins',matchId:'o-1',startedAt:1,endedAt:200001,over:true,ownerHuman:true,rounds:12,activity:5,won:true,aiOpponents:3,aiLevel:'normal'};
 const a=C.record(s,f,ON),b=C.record(C.fresh(),f,{});assert.deepEqual({...a,unlocked:a.unlocked},{...b,unlocked:b.unlocked})});
console.log(`circuit-career: ${n} checks passed`);
