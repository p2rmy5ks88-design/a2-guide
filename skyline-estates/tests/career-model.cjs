// Skyline Career core (lib/career.js): data model, qualification, sequential unlocks, mastery, normalisation and
// the property-manifest validator. Pure Node; no browser, no game state.
'use strict';
const assert=require('node:assert/strict');
const C=require('../lib/career.js');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
const T0=1_800_000_000_000;
const match=(id,o={})=>Object.assign({board:'origins',matchId:id,sim:false,fast:false,online:false,assisted:false,over:true,ownerHuman:true,
 startedAt:T0,endedAt:T0+300000,rounds:30,activity:12,won:false,score:1000,aiOpponents:3,aiLevel:'normal'},o);

// Fresh state
let s=C.fresh();let v=C.view(s);
assert.deepEqual(v.map(b=>b.id),['origins','circuit','dominion','empire']);
assert.deepEqual(v.map(b=>b.status),['playable','locked','locked-hidden','locked-hidden']);
assert.ok(v[0].playable&&!v[1].playable&&v[1].requirements.length===2);ok('fresh career: Origins playable, later boards locked in order');
assert.deepEqual(C.BOARDS[0].lengths,['quick','standard','extended','unlimited']);assert.equal(C.BOARDS[0].defaultLength,'standard');
assert.deepEqual(C.LENGTHS.standard,{mode:'timed',rounds:30});assert.deepEqual(C.LENGTHS.unlimited,{mode:'classic'});ok('Origins lengths 20/30/40/Unlimited, Standard default');

// Qualification rejections
for(const [why,o] of [['simulated',{sim:true}],['simulated',{fast:true}],['online',{online:true}],['assisted',{assisted:true}],['unfinished',{over:false}],
 ['no-match-id',{matchId:''}],['no-profile-owner',{ownerHuman:false}],['too-short',{endedAt:T0+60000}],['too-few-rounds',{rounds:4}],['too-little-activity',{activity:2}],['not-career',{board:'harbour'}]]){
 const q=C.qualify(match('q-'+why,o));assert.ok(!q.counts&&q.reasons.includes(why),why+' '+JSON.stringify(q));
 const before=JSON.stringify(s);assert.equal(C.record(s,match('q-'+why,o)).ok,false);assert.equal(JSON.stringify(s),before,why+' changes nothing')}
ok('simulated, online, assisted, unfinished, short and inactive matches never count');

// Participation, wins and qualifying wins
let r=C.record(s,match('m1'),{},T0);assert.ok(r.ok&&!r.won&&!r.qualifiedWin);
r=C.record(s,match('m1',{won:true}),{},T0);assert.equal(r.reason,'duplicate');ok('a match is recorded once (duplicate match id rejected)');
r=C.record(s,match('m2',{won:true,aiLevel:'easy'}),{},T0);assert.ok(r.ok&&r.won&&!r.qualifiedWin);
r=C.record(s,match('m3',{won:true,aiOpponents:0,aiLevel:'normal'}),{},T0);assert.ok(r.ok&&r.won&&!r.qualifiedWin);
ok('wins against Easy-only or all-human tables count for mastery but not for unlocks');
let st=C.view(s)[0].mastery;assert.equal(st.matches,3);assert.equal(st.wins,2);assert.equal(st.qualifiedWins,0);
assert.equal(st.xp,3*(C.MASTERY.matchXp+C.MASTERY.qualifiedXp)+2*C.MASTERY.winXp);ok('participation and wins earn board mastery XP');

// Sequential unlock: tutorial + 2 qualifying wins
r=C.record(s,match('m4',{won:true}),{},T0);assert.ok(r.qualifiedWin&&!r.unlocked.length);
r=C.record(s,match('m5',{won:true,aiLevel:'hard'}),{},T0);assert.ok(r.qualifiedWin);assert.deepEqual(r.unlocked,[],'no tutorial yet, no unlock');
assert.equal(C.view(s)[1].status,'locked');
assert.deepEqual(C.completeTutorial(s,'origins',{},T0+1),['circuit']);ok('Circuit unlocks after the Origins tutorial and two qualifying wins');
v=C.view(s);assert.equal(v[1].status,'unlocked-preview');assert.ok(v[1].unlocked&&!v[1].playable);assert.equal(v[2].status,'locked');ok('an unlocked board without gameplay is preview-only, not playable');
const s2=C.fresh();C.record(s2,match('a',{won:true}),{},T0);C.record(s2,match('b',{won:true}),{originsTutorialDone:true},T0);
assert.ok(s2.unlocked.circuit!=null);ok('the existing How to play tour counts as the Origins tutorial');

// Later boards stay sequential and use board challenges
const s3=C.fresh();for(let i=0;i<3;i++)assert.ok(C.completeChallenge(s3,'circuit','d'+i,'district').ok);
s3.boards.circuit={xp:0,matches:2,qualified:2,wins:2,qualifiedWins:2,bestScore:0,lastAt:0};
assert.deepEqual(C.evaluate(s3),[],'Dominion cannot unlock before Circuit');assert.equal(s3.unlocked.dominion,undefined);
C.completeTutorial(s3,'origins');s3.boards.origins={xp:0,matches:2,qualified:2,wins:2,qualifiedWins:2,bestScore:0,lastAt:0};
assert.deepEqual(C.evaluate(s3),['circuit','dominion']);assert.equal(C.completeChallenge(s3,'circuit','d0','district').reason,'duplicate');
ok('Dominion needs Circuit first, two Circuit wins and three district challenges');

// Persistence, normalisation, permanence, newer versions
const round=C.normalize(JSON.parse(JSON.stringify(s)));assert.deepEqual(round,s);ok('state survives a JSON save/load round trip unchanged');
const perm=C.normalize({v:1,unlocked:{origins:1,circuit:5},boards:{}});assert.equal(C.view(perm)[1].status,'unlocked-preview');ok('unlocked boards stay unlocked even if stats are missing');
const bad=C.normalize({v:1,unlocked:{origins:'x',nope:1},boards:{origins:{xp:-5,matches:2.5,wins:1,qualifiedWins:3},bogus:{}},receipts:['ok',5,'ok','bad id!']});
assert.equal(bad.boards.origins.xp,0);assert.equal(bad.boards.origins.matches,0);assert.equal(bad.boards.origins.wins,3);assert.equal(bad.boards.bogus,undefined);assert.deepEqual(bad.receipts,[['ok',0]]);
assert.deepEqual(C.normalize(null),C.fresh());assert.deepEqual(C.normalize('junk'),C.fresh());ok('corrupt or tampered fields are repaired to safe values');
const big=C.fresh();for(let i=0;i<450;i++)assert.ok(C.record(big,match('r'+i,{startedAt:T0+i*1000,endedAt:T0+i*1000+300000}),{},T0).ok);
assert.equal(big.receipts.length,C.QUALIFY.maxReceipts);assert.equal(big.floor,T0+49*1000);ok('receipt history is capped at 400 and remembers the latest evicted start time');
const before=JSON.stringify(big);
for(const i of [0,25,49]){const r=C.record(big,match('r'+i,{startedAt:T0+i*1000,endedAt:T0+i*1000+300000}),{},T0);assert.equal(r.reason,'older-than-history','evicted r'+i)}
assert.equal(C.record(big,match('r60',{startedAt:T0+60*1000,endedAt:T0+60*1000+300000}),{},T0).reason,'duplicate');
assert.equal(C.record(big,match('replay-old',{startedAt:T0,endedAt:T0+999999}),{},T0).reason,'older-than-history');assert.equal(JSON.stringify(big),before);
assert.ok(C.record(big,match('r-new',{startedAt:T0+10_000_000,endedAt:T0+10_300_000}),{},T0).ok);
const reload=C.normalize(JSON.parse(before));assert.equal(C.record(reload,match('r10',{startedAt:T0+10*1000,endedAt:T0+10*1000+300000}),{},T0).reason,'older-than-history');
ok('an evicted or older match can never be counted again, before or after a save/load');
const legacy=C.normalize({v:1,unlocked:{origins:0},receipts:['a','b','a']});assert.deepEqual(legacy.receipts,[['a',0],['b',0]]);ok('older receipt format (plain ids) loads safely');
const newer=C.normalize({v:2,unlocked:{origins:1},future:true});assert.ok(newer.readOnly&&newer.future);assert.equal(C.record(newer,match('z')).reason,'newer-version');assert.deepEqual(C.evaluate(newer),[]);
ok('a record from a newer version is left untouched');

// Property manifest (prepared for Phase B)
const m={v:1,seed:42,ruleset:'classic-lc',slots:[{slot:1,name:'Allen Avenue',city:'lagos',country:'ng',category:'market-streets',tier:2},{slot:3,name:'Brick Lane',city:'london',country:'gb',category:'cultural-streets',tier:2}]};
assert.deepEqual(C.validateManifest(m),[]);
assert.ok(C.validateManifest({...m,slots:[...m.slots,{...m.slots[0],slot:5}]}).includes('duplicate-or-empty-name'));
assert.ok(C.validateManifest({...m,slots:[{...m.slots[0],category:'nope'}]}).includes('category'));assert.ok(C.validateManifest({...m,seed:-1}).includes('seed'));
const a=C.rng(7),b=C.rng(7),c=C.rng(8);const sa=[a(),a(),a()],sb=[b(),b(),b()];assert.deepEqual(sa,sb);assert.notDeepEqual(sa,[c(),c(),c()]);assert.ok(sa.every(x=>x>=0&&x<1));
ok('manifest validator rejects duplicates, bad categories and seeds; seeded generator is deterministic');
console.log(`CAREER MODEL ${n} checks`);
