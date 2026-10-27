const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyAssetAction,sourceHash}=require('./asset-kernel.cjs'),{fixture}=require('./asset-fixture.cjs'),{cases}=require('./asset-cases.cjs');
const report={sourceHash,checks:[],failure:null};function test(name,fn){fn();report.checks.push({name,passed:true});console.log('PASS assets',name)}
try{
 for(const c of cases())test(c.name,()=>{const before=JSON.stringify(c.game);if(!c.legal)assert.throws(()=>applyAssetAction(c.game,'host-uid',c.command),e=>e.code==='illegal-property-action');else{const out=applyAssetAction(c.game,'host-uid',c.command),o=out.own[c.command.square],expected=c.expected;for(const k of ['h','m'])if(k in expected)assert.equal(o[k],expected[k]);for(const k of ['houses','hotels'])if(k in expected)assert.equal(out[k],expected[k]);if('cash'in expected)assert.equal(out.players[0].cash,expected.cash);if(expected.stat)assert.equal(out.players[0].st[expected.stat],1);assert.equal(out.houses+out.own.reduce((s,x)=>s+(x.h===5?0:x.h),0),36);assert.equal(out.hotels+out.own.filter(x=>x.h===5).length,12);assert.ok(out.players.every(p=>Number.isSafeInteger(p.cash)&&p.cash>=0))}assert.equal(JSON.stringify(c.game),before,'caller snapshot remains immutable')});
 for(const [name,mutate,actor,command,code]of [
  ['outsider',()=>{},'unknown',{kind:'build',square:1},'not-your-turn'],
  ['wrong turn',()=>{},'guest-uid',{kind:'build',square:1},'not-your-turn'],
  ['bankrupt actor',g=>g.players[0].bankrupt=true,'host-uid',{kind:'build',square:1},'not-your-turn'],
  ['human without identity',g=>g.players[1].uid=null,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['reserved identity',g=>g.players[1].uid='constructor','host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['duplicate identity',g=>g.players[1].uid='host-uid','host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['corrupt cash',g=>g.players[0].cash=-1,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['corrupt house bank',g=>g.houses=35,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['corrupt hotel bank',g=>g.hotels=11,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['client price injection',()=>{},'host-uid',{kind:'build',square:1,price:0},'invalid-property-command'],
  ['unsupported roll',()=>{},'host-uid',{kind:'roll',square:1},'invalid-property-command'],
  ['negative index',()=>{},'host-uid',{kind:'build',square:-1},'invalid-property-command'],
  ['fractional index',()=>{},'host-uid',{kind:'build',square:1.5},'invalid-property-command'],
  ['oversized index',()=>{},'host-uid',{kind:'build',square:40},'invalid-property-command'],
  ['offline game',g=>g.online=false,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['simulation game',g=>g.sim=true,'host-uid',{kind:'build',square:1},'invalid-game-state'],
  ['debt remains disabled until full debt engine',g=>g.phase='debt','host-uid',{kind:'sell',square:1},'unsupported-game-phase'],
  ['busy game',g=>g.phase='busy','host-uid',{kind:'build',square:1},'unsupported-game-phase'],
  ['ended game',g=>g.over=true,'host-uid',{kind:'build',square:1},'invalid-game-state']
 ])test(name,()=>{const g=fixture();mutate(g);const before=JSON.stringify(g);assert.throws(()=>applyAssetAction(g,actor,command),e=>e.code===code);assert.equal(JSON.stringify(g),before)});
 test('repeat execution is deterministic and isolated',()=>{const g=fixture();g.event={id:'boom',round:1};assert.deepEqual(applyAssetAction(g,'host-uid',{kind:'build',square:1}),applyAssetAction(g,'host-uid',{kind:'build',square:1}));assert.equal(applyAssetAction(fixture(),'host-uid',{kind:'build',square:1}).players[0].cash,1560)});
 console.log('ASSET SUMMARY',JSON.stringify({checks:report.checks.length,sourceHash}));
}catch(e){report.failure=String(e.stack||e);console.error(e);process.exitCode=1}finally{fs.writeFileSync(path.join(__dirname,'../asset-results.json'),JSON.stringify(report,null,2)+'\n')}
