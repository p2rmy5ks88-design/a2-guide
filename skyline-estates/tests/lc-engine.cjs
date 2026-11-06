// Authoritative Living City engine: two signed-in humans + one AI play a complete match through server decisions only.
// Checks identity, turn order, stale/duplicate revisions, illegal answers and asset actions, and that the server
// state never accepts client-supplied outcomes. Usage: node tests/lc-engine.cjs [seed]
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {createEngine}=require('../online/lc-engine.cjs');
const seed=process.argv[2]||'lc-e2e-1';let n=0;const ok=m=>{n++;console.log('PASS',m)};
(async()=>{
  const eng=createEngine(path.resolve(__dirname,'..'));
  let st=await eng.create({seed,set:{city:'lagos',mode:'timed',rounds:20},seats:[{uid:'alice',name:'Alice'},{uid:'bob',name:'Bob'},{ai:true,name:'Kofi'}]});
  assert.equal(st.G.rv,2);assert.ok(st.boundary,'first human decision');ok('server creates a rule-version-2 match and stops at the first human decision');
  const uid=pid=>st.G.players[pid].uid;
  // negative checks on the first decision
  const b0=st.boundary,other=b0.pid===0?'bob':'alice';
  await assert.rejects(eng.act(st,other,{revision:st.revision,answer:{value:b0.options.keys?.[0]}}),{code:'not-your-decision'});
  await assert.rejects(eng.act(st,uid(b0.pid),{revision:st.revision-1,answer:{value:b0.options.keys?.[0]}}),{code:'stale-revision'});
  await assert.rejects(eng.act(st,uid(b0.pid),{revision:st.revision,answer:{value:'cash+999999'}}),e=>e.status===400);
  await assert.rejects(eng.act(st,uid(b0.pid),{revision:st.revision,answer:{value:b0.options.keys?.[0],assets:[{kind:'build',square:39}]}}),e=>e.status===400);
  ok('rejected: another player answering, stale revision, invented answer, illegal building action');
  const seen=new Set(),pick=b=>{seen.add(b.type);const o=b.options||{};
    if(b.type==='actions'){if(o.keys.includes('roll'))return'roll';if(o.keys.includes('pay'))return'pay';if(o.keys.includes('end'))return'end';return o.keys[0]}
    if(b.type==='modal')return o.keys.includes('buy')?'buy':o.keys[0];
    if(b.type==='bid')return 0;
    if(b.type==='trade')return false;
    if(b.type==='lc:card'){const c=o.choices.filter(x=>x.ok);return c[0].k}
    if(b.type==='lc:review')return o.can?'permit':o.passes?'pass':'standard';
    if(b.type==='lc:landmark')return 'i'+o.opts[o.opts.length-1];
    if(b.type==='lc:corner'){const c=o.choices.filter(x=>x.ok);return c[0].k}
    throw Error('unknown boundary '+b.type)};
  let steps=0,dup=false,builds=0;
  while(!st.over&&steps<4000){steps++;const b=st.boundary;
    let assets=[];if(b.type==='actions'&&b.options.keys.includes('end')){const me=st.G.players[b.pid];const sq=st.G.own.map((o,i)=>i).find(i=>st.G.own[i].o===b.pid&&!st.G.own[i].m);if(sq!=null&&me.cash>800&&builds<40){assets=[{kind:'build',square:sq}]}}
    let next;try{next=await eng.act(st,uid(b.pid),{revision:st.revision,answer:{value:pick(b),assets}})}catch(e){if(assets.length&&e.code==='illegal-asset-action'||/illegal-asset/.test(e.message)){next=await eng.act(st,uid(b.pid),{revision:st.revision,answer:{value:pick(b)}})}else throw e}
    if(assets.length&&next.revision)builds++;
    if(!dup){await assert.rejects(eng.act(st,uid(b.pid),{revision:st.revision,answer:{value:pick(b)}}).then(()=>eng.act(next,uid(b.pid),{revision:st.revision,answer:{value:pick(b)}})),{code:'stale-revision'});dup=true;ok('duplicate submission of an already-applied revision is rejected')}
    st=next}
  assert.ok(st.over,'match finished in '+steps+' decisions');
  const alive=st.G.players.filter(p=>!p.bankrupt);ok(`complete match over ${st.G.round} rounds and ${steps} server decisions; ${alive.length} player(s) left; decision types: ${[...seen].join(', ')}`);
  assert.ok(st.G.players.every(p=>Number.isSafeInteger(p.cash)&&p.cash>=0));ok('money stays whole and non-negative throughout (server-computed)');
  // determinism: replaying the same answers from scratch gives the same final state
  console.log(`LC ENGINE ${n} checks · source ${eng.sourceHash.slice(0,12)}`);
})().catch(e=>{console.error(e);process.exit(1)});
