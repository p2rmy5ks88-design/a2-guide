// Career Board 2 ↔ Career (owner decision 20 Nov 2026: City Ventures — The Living Market replaces Skyline Circuit,
// keeping the Career id 'circuit' so existing records carry over). Standard (18 turns) wins against Normal computer
// players qualify; Quick (10 turns) is experimental (mastery XP only). Board 2 only counts once it is unlocked.
// Owning a whole district at the end of a match is a district challenge (feeds the Dominion unlock).
'use strict';
const assert=require('node:assert/strict'),C=require('../lib/career.js'),CV=require('../lib/city-ventures-rules.js');
let n=0;const check=(m,f)=>{f();n++;console.log('ok',m)};
const ON={alphaBoards:['circuit','dominion','empire']};
function match({seed=1,length='standard',won=null,id}={}){
 const s=CV.newMatch({seed,length,players:[{name:'You'},{name:'A',ai:true},{name:'B',ai:true}],meta:{matchId:id||'city-ventures-'+seed+'-'+length,startedAt:1e6+seed}});
 let guard=0;while(!s.over){const pd=CV.pending(s),pid=pd.kind==='trade'?pd.to:pd.pid;CV.act(s,pid,CV.ai(s,pid));if(++guard>20000)throw Error('stuck')}
 const f=CV.careerFacts(s,{ownerSeat:0,endedAt:1e6+seed+900000});if(won!=null)f.won=won;return f}
const unlocked=()=>{const s=C.fresh();s.unlocked.circuit=1;return s};
check('Board 2 is City Ventures with Standard and Quick lengths',()=>{const b=C.BOARDS.find(x=>x.id==='circuit');assert.equal(b.name,'City Ventures');assert.equal(b.alpha.ruleset,'city-ventures-v1');assert.deepEqual(b.alpha.lengths,['standard','quick'])});
check('City Ventures does not count while Board 2 is still locked',()=>{const r=C.record(C.fresh(),match({seed:2}),ON);assert.equal(r.reason,'board-locked')});
check('a Standard win against Normal computer players qualifies and earns mastery XP',()=>{const s=unlocked();const r=C.record(s,match({seed:3,won:true}),ON);assert.ok(r.ok,JSON.stringify(r));assert.equal(r.qualifiedWin,true);assert.ok(s.boards.circuit.xp>0)});
check('Quick is experimental: a win earns mastery XP but never a qualifying win',()=>{const s=unlocked();const r=C.record(s,match({seed:4,length:'quick',won:true}),ON);assert.ok(r.ok);assert.equal(r.qualifiedWin,false);assert.equal(s.boards.circuit.qualifiedWins,0);assert.ok(s.boards.circuit.xp>0)});
check('old Circuit results (wrong rules version) and duplicates are refused',()=>{const s=unlocked();const f=match({seed:5,won:true});assert.equal(C.record(s,{...f,ruleset:'circuit-v0',matchId:'old-1'},ON).reason,'wrong-ruleset');assert.ok(C.record(s,f,ON).ok);assert.equal(C.record(s,f,ON).reason,'duplicate')});
check('two qualifying wins plus three district challenges unlock Dominion (sequential rules unchanged)',()=>{const s=unlocked();
 C.record(s,match({seed:50,won:true}),ON);C.record(s,match({seed:51,won:true}),ON);assert.equal(s.unlocked.dominion,undefined);
 for(const d of ['green','blue','pink'])C.completeChallenge(s,'circuit','cv-district-'+d,'district',ON);assert.ok(s.unlocked.dominion!=null)});
check('owning a whole district at the end is reported as a district challenge',()=>{const s=CV.newMatch({seed:9,players:[{name:'You'},{name:'A',ai:true}],meta:{matchId:'m-1',startedAt:1}});
 for(const i of CV.DISTRICTS.green)s.own[i]={owner:0,stage:0,mortgaged:false};const f=CV.careerFacts(s,{ownerSeat:0});assert.deepEqual(f.challenges,[{id:'cv-district-green',tag:'district'}])});
console.log('city-ventures-career: '+n+' checks passed (City Ventures as Career Board 2)');
