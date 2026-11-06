// Casual Living City online rooms through the composed competition HTTP service (in-memory store, fake ID tokens).
// Flag off by default, capability negotiation, membership, turn ownership, stale/duplicate rejection, full match.
'use strict';
const assert=require('node:assert/strict');
const {composeCompetition}=require('../competition/compose.cjs');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
function memoryDb(){const data={};const get=p=>p.split('/').reduce((o,k)=>o&&o[k],data);
  const set=(p,v)=>{const ks=p.split('/'),last=ks.pop();let o=data;for(const k of ks)o=o[k]=o[k]||{};if(v==null)delete o[last];else o[last]=v};
  return{data,set,ref(p){return{async transaction(fn){const cur=get(p);const next=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));set(p,next);return{committed:true,snapshot:{val:()=>next}}}}}}}
(async()=>{
  const db=memoryDb(),users={tA:'alice',tB:'bob',tC:'carol'};
  const svc=composeCompetition({db,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return{uid:users[t]}}});
  const call=async(path,token,body)=>{const req={method:'POST',url:path,headers:{'content-type':'application/json',authorization:'Bearer '+token,origin:'capacitor://localhost'},body};
    let status,out;const res={setHeader(){},writeHead(s){status=s;return{end:x=>{out=x}}}};await svc.handler(req,res);return{status,body:out?JSON.parse(out):null}};
  const cap=async()=>{let status,out;await svc.handler({method:'GET',url:'/v1/competition/capabilities',headers:{}},{setHeader(){},writeHead(s){status=s;return{end:x=>{out=x}}}});return JSON.parse(out)};
  const client={rules:[1,2],lc:1};
  assert.equal((await cap()).rulesets.livingCity.online,false);
  let r=await call('/v3/lc/create','tA',{name:'Alice',client});assert.deepEqual([r.status,r.body.error],[403,'living-city-online-disabled']);ok('flag off by default: capabilities say offline and room creation is refused');
  db.set('skylineV2/flags',{lcOnline:true});const svc2=composeCompetition({db,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return{uid:users[t]}}});Object.assign(svc,svc2);
  assert.equal((await cap()).rulesets.livingCity.online,true);
  r=await call('/v3/lc/create','tA',{name:'Alice'});assert.deepEqual([r.status,r.body.error],[426,'client-upgrade-required']);
  r=await call('/v3/lc/create','tA',{name:'Alice',client:{rules:[1]}});assert.equal(r.status,426);ok('older apps (no rules-2 capability) cannot create Living City rooms');
  r=await call('/v3/lc/create','tA',{name:'Alice',client});assert.equal(r.status,200);const code=r.body.code;
  r=await call('/v3/lc/join','tB',{code,name:'Bob',client:{rules:[1]}});assert.equal(r.status,426);
  r=await call('/v3/lc/join','tB',{code,name:'Bob',client});assert.equal(r.status,200);assert.equal(r.body.seats.length,2);
  r=await call('/v3/lc/start','tB',{code,ai:1});assert.deepEqual([r.status,r.body.error],[403,'host-only']);
  r=await call('/v3/lc/state','tC',{code});assert.deepEqual([r.status,r.body.error],[403,'not-a-member']);
  r=await call('/v3/lc/start','tA',{code,ai:1,mode:'timed',rounds:10});assert.equal(r.status,200);assert.equal(r.body.game.G.rv,2);ok('create, join (capable apps only), host-only start, non-members locked out');
  const tok={alice:'tA',bob:'tB'};let game=r.body.game,steps=0,checked=false,seen=new Set();
  const pick=b=>{const o=b.options||{};seen.add(b.type);if(b.type==='actions')return o.keys.includes('roll')?'roll':o.keys.includes('end')?'end':o.keys.includes('pay')?'pay':o.keys[0];if(b.type==='modal')return o.keys.includes('buy')?'buy':o.keys[0];if(b.type==='bid')return 0;if(b.type==='trade')return false;
    if(b.type==='lc:review')return o.can?'permit':'standard';if(b.type==='lc:landmark')return 'i'+o.opts[0];const c=(o.choices||[]).filter(x=>x.ok);return c[0].k};
  while(!game.over&&steps<2000){steps++;const pid=game.waitingFor,who=game.G.players[pid].uid;
    const view=(await call('/v3/lc/state',tok[who],{code})).body.game;assert.ok(view.decision,'decision visible to its owner');
    if(!checked){const otherTok=who==='alice'?'tB':'tA';r=await call('/v3/lc/act',otherTok,{code,revision:view.revision,answer:{value:pick(view.decision)}});assert.deepEqual([r.status,r.body.error],[403,'not-your-decision']);
      const good=await call('/v3/lc/act',tok[who],{code,revision:view.revision,answer:{value:pick(view.decision)}});assert.equal(good.status,200);
      r=await call('/v3/lc/act',tok[who],{code,revision:view.revision,answer:{value:pick(view.decision)}});assert.deepEqual([r.status,r.body.error],[409,'stale-revision']);checked=true;ok('wrong player rejected (403), duplicate resend rejected (409)');game=good.body.game;continue}
    r=await call('/v3/lc/act',tok[who],{code,revision:view.revision,answer:{value:pick(view.decision)}});assert.equal(r.status,200,JSON.stringify(r.body));game=r.body.game}
  assert.ok(game.over);ok(`complete casual Living City match through HTTP: ${game.G.round} rounds, ${steps} decisions (${[...seen].join(', ')})`);
  assert.equal(db.data.skylineV2.lc[code].status,'finished');assert.ok(!db.data.skylineV2.competition||!Object.keys(db.data.skylineV2.competition.receipts||{}).length);ok('room finished; no ranked/competition results written');
  console.log(`LC ONLINE SERVICE ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
