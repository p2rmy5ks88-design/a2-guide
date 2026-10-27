const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyRoll,applyJailRoll,chooseTurn,sourceHash}=require('./turn-kernel.cjs'),{cases}=require('./card-cases.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),report={sourceHash,checks:[],failure:null};
function invariants(g){assert.ok(g.players.every(p=>Number.isSafeInteger(p.cash)&&p.cash>=0));assert.equal(g.houses+g.own.reduce((n,o)=>n+(o.h===5?0:o.h),0),36);assert.equal(g.hotels+g.own.filter(o=>o.h===5).length,12);for(const deck of ['chance','esusu'])assert.deepEqual([...g[deck],...g.players.flatMap(p=>p.goojf.filter(c=>c.deck===deck).map(c=>c.idx))].sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i))}
function test(name,fn){try{fn();report.checks.push({name,passed:true})}catch(e){console.error('FAILED',name);throw e}}
const initial=c=>(c.jail?applyJailRoll:applyRoll)(c.game,'host-uid',c.dice),draw=c=>{const r=initial(c);assert.equal(r.boundary.kind,'card');return chooseTurn(r.game,'host-uid',r,'drawCard')};
try{
 for(const c of cases())test(c.name,()=>{const before=copy(c.game);let r=initial(c);invariants(r.game);assert.equal(r.boundary.kind,'card');let n=0;while(['card','purchase'].includes(r.boundary?.kind)){const old=copy(r),kind=r.boundary.kind==='card'?'drawCard':c.decline?'decline':'buy';if(kind==='buy'&&!r.boundary.canBuy)break;const previous=r;r=chooseTurn(r.game,'host-uid',r,kind);assert.deepEqual(previous,old);invariants(r.game);assert.equal(r.game.lastDice.n,1);assert.ok(++n<12,'bounded card chain')}assert.deepEqual(c.game,before)});
 const find=name=>cases().find(c=>c.name===name);
 test('fixed payout rotates one card and pays once',()=>{const c=find('chance card 0'),r=draw(c);assert.equal(r.game.players[0].cash,1630);assert.equal(r.game.chance.at(-1),0);assert.equal(r.game.chance[0],1)});
 test('Bail Pass leaves deck and enters hand once',()=>{const r=draw(find('chance card 9'));assert.deepEqual(r.game.players[0].goojf,[{deck:'chance',idx:9}]);assert.equal(r.game.chance.includes(9),false)});
 test('rail rent doubles original two-dice rent',()=>{const r=draw(find('nearest rail double rent'));assert.equal(r.game.players[0].cash,1560);assert.equal(r.game.players[1].cash,1640)});
 test('utility rent uses eight times the original dice',()=>{const r=draw(find('nearest utility eight times dice'));assert.equal(r.game.players[0].cash,1576);assert.equal(r.game.players[1].cash,1624)});
 test('card debt retains consumed index, payer and partial transfers',()=>{const r=draw(find('pay each debt after first transfer'));assert.equal(r.boundary.kind,'debt');assert.equal(r.boundary.payer,0);assert.equal(r.game.players[0].cash,5);assert.equal(r.game.players[1].cash,1625);assert.equal(r.context.cardEffect.idx,12);assert.equal(r.context.cardEffect.payments,2);assert.equal(r.game.chance.at(-1),12)});
 test('recipient debt identifies the other payer',()=>{const r=draw(find('collect each stops at second debtor'));assert.equal(r.boundary.payer,2);assert.equal(r.game.players[0].cash,1615);assert.equal(r.game.players[1].cash,1585)});
 for(const kind of ['buy','keep','payBail','useBailPass','endTurn'])test('wrong card choice '+kind,()=>{const r=initial(find('chance card 0')),before=copy(r);assert.throws(()=>chooseTurn(r.game,'host-uid',r,kind));assert.deepEqual(r,before)});
 test('wrong actor cannot draw',()=>{const r=initial(find('chance card 0'));assert.throws(()=>chooseTurn(r.game,'guest-uid',r,'drawCard'))});
 test('changed deck descriptor fails closed',()=>{const r=initial(find('chance card 0'));r.context.cardDeck='esusu';assert.throws(()=>chooseTurn(r.game,'host-uid',r,'drawCard'))});
 console.log('CARD KERNEL SUMMARY',JSON.stringify({checks:report.checks.length,scenarios:cases().length,sourceHash}));
}catch(e){report.failure=String(e.stack||e);console.error(e);process.exitCode=1}finally{fs.writeFileSync(path.join(__dirname,'../card-results.json'),JSON.stringify(report,null,2)+'\n')}
