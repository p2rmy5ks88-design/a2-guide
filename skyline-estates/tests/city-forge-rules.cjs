const assert=require('node:assert/strict'),F=require('../lib/city-forge-rules.js');
assert.equal(F.STOPS.length,24);assert.equal(F.DISTRICTS.length,8);assert.equal(F.PLOTS.length,24);
let s=F.create({seed:18,ai:2,length:'quick'});assert.equal(s.players.length,3);assert.equal(s.maxRounds,8);
const pristine=JSON.stringify(s);assert.equal(F.act(s,1,{type:'roll'}).ok,false);assert.equal(JSON.stringify(s),pristine);
assert.equal(F.act(s,0,{type:'roll'}).ok,true);if(s.phase==='event')F.act(s,0,F.legal(s,0)[0]);
assert.equal(s.actions,2);assert.equal(F.act(s,0,{type:'claim',plot:0}).ok,true);assert.equal(F.act(s,0,{type:'build',plot:0,kind:'housing'}).ok,true);assert.equal(s.plots[0].level,1);assert.ok(F.score(s,0).total>0);
let raw=F.serialize(s),loaded=F.restore(raw);assert.equal(loaded.ok,true);assert.equal(F.serialize(loaded.state),raw);assert.equal(F.restore('{bad').ok,false);
const broken=JSON.parse(raw);broken.players[0].mat[0]=-1;assert.equal(F.restore(JSON.stringify(broken)).ok,false);broken.players[0].mat[0]=1;broken.plots[0].owner=99;assert.equal(F.restore(JSON.stringify(broken)).ok,false);
// Accepted resource trades are exact, once-only transfers; rejected trades award nothing.
s=F.create({seed:6,ai:1});F.act(s,0,{type:'roll'});if(s.phase==='event')F.act(s,0,F.legal(s,0)[0]);
const give=[1,0,0,0],get=[0,1,0,0],tot=()=>s.players.reduce((a,p)=>a.map((x,i)=>x+p.mat[i]),[0,0,0,0]);const before=tot();
assert.ok(F.act(s,0,{type:'trade',to:1,give,get}).ok);const pending=F.serialize(s);assert.ok(F.restore(pending).ok);assert.ok(F.act(s,1,{type:'accept'}).ok);assert.deepEqual(tot(),before);const done=F.serialize(s);assert.equal(F.act(s,1,{type:'accept'}).ok,false);assert.equal(F.serialize(s),done);
const wins=[0,0,0,0];let count=0;
for(let seed=1;seed<=100;seed++){
 s=F.create({seed,ai:3,length:seed%2?'quick':'standard'});let n=0;
 while(s.phase!=='over'){
  const who=s.phase==='trade'?s.pending.to:s.turn,a=F.ai(s,who);assert.ok(a);const r=F.act(s,who,a);assert.ok(r.ok,r.error);assert.ok(++n<700,'match cannot stall');
  for(const p of s.players){assert.ok(Number.isSafeInteger(p.cash)&&p.cash>=0);assert.ok(p.mat.every(v=>Number.isInteger(v)&&v>=0&&v<=F.CAP));}
  if(n%17===0){const r=F.restore(F.serialize(s));assert.ok(r.ok);s=r.state;}
 }
 s.players.forEach(p=>assert.equal(p.turns,s.maxRounds));assert.equal(s.winner,F.ranking(s)[0].id);wins[s.winner]++;count+=n;
}
console.log('PASS City Forge: 100 complete AI matches, topology, actions, buildings, atomic trades, immutable rejection, validated saves, equal final turns. Actions:',count,'wins:',wins);
const a=F.create({seed:77,ai:2}),b=F.create({seed:77,ai:2});a.id=b.id='test';assert.deepEqual(a,b);
console.log('PASS seeded determinism');
