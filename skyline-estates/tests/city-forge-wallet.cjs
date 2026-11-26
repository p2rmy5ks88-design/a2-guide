const assert=require('node:assert/strict'),F=require('../lib/city-forge-rules.js'),W=require('../lib/city-forge-wallet.js');
const q=F.quote('standard');assert.equal(q.reserve,21600);assert.equal(F.quote('quick').reserve,14400);assert.equal(q.winnerBonus,43200);
let profile={coins:21599,xp:42,cloudOwner:'account-a'},writes=0;const wallet=W.create(F,{read:()=>structuredClone(profile),write:p=>{profile=structuredClone(p);writes++}});
assert.equal(wallet.enter({id:'test-1',seed:42,length:'standard'}).ok,false);assert.equal(writes,0);
profile.coins=50000;const e=wallet.enter({id:'test-1',seed:42,length:'standard',ai:1});assert.ok(e.ok);assert.equal(profile.coins,28400);assert.equal(e.state.players[0].cash,216);assert.equal(wallet.enter({id:'other',seed:4}).ok,false);
let s=e.state;while(s.phase!=='over'){const pid=s.phase==='trade'?s.pending.to:s.turn;assert.ok(F.act(s,pid,F.ai(s,pid)).ok)}
assert.ok(F.verify(s));const expected=s.players[0].cash*100+(s.winner===0?q.winnerBonus:0);const r=wallet.settle(F.serialize(s));assert.ok(r.ok);assert.equal(profile.coins,28400+expected);assert.equal(wallet.settle(F.serialize(s)).ok,false);assert.equal(profile.xp,42);
assert.ok(wallet.enter({id:'test-2',seed:7,length:'quick',ai:1}).ok);profile.cloudOwner='account-b';const before=profile.coins;assert.equal(wallet.settle(null,{abandon:true}).ok,false);assert.equal(profile.coins,before);profile.cloudOwner='account-a';const a=wallet.settle(null,{abandon:true});assert.ok(a.ok);assert.equal(a.refund,14400);assert.equal(a.bonus,0);
const e3=wallet.enter({id:'test-3',seed:9,length:'quick',ai:1});s=e3.state;F.act(s,0,{type:'roll'});if(s.phase==='event')F.act(s,0,F.legal(s,0)[0]);s.players[0].cash+=500;assert.equal(F.verify(s),false);assert.equal(wallet.settle(F.serialize(s),{abandon:true}).ok,false);
console.log('PASS entry quotes, insufficient balance, atomic reserve, once-only settlement, original owner binding, abandonment, tampered-state rejection');
