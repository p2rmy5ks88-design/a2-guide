// Living City test access: only listed, signed-in (verified-email) accounts may create/join while the global flag is
// off; the list is never exposed; access expires on its own; test rooms record answers and rejections for audit.
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {composeCompetition}=require('../competition/compose.cjs');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
function memoryDb(){const data={};const get=p=>p.split('/').reduce((o,k)=>o&&o[k],data);
  const set=(p,v)=>{const ks=p.split('/'),last=ks.pop();let o=data;for(const k of ks)o=o[k]=o[k]||{};if(v==null)delete o[last];else o[last]=v};
  return{data,set,ref(p){return{async transaction(fn){const cur=get(p);const next=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));set(p,next);return{committed:true,snapshot:{val:()=>next}}}}}}}
const H=e=>crypto.createHash('sha256').update(e).digest('hex');
(async()=>{
  const db=memoryDb();let now=Date.now();
  const users={tA:{uid:'a1',email:'Alice@Test.example',email_verified:true,firebase:{sign_in_provider:'apple.com'}},tB:{uid:'b1',email:'bob@test.example',email_verified:true,firebase:{sign_in_provider:'password'}},
    tX:{uid:'x1',email:'mallory@test.example',email_verified:true,firebase:{sign_in_provider:'google.com'}},tU:{uid:'u1',email:'bob@test.example',email_verified:false,firebase:{sign_in_provider:'password'}},tN:{uid:'n1',firebase:{sign_in_provider:'anonymous'}}};
  const mk=()=>composeCompetition({db,clock:()=>now,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return users[t]}});let svc=mk();
  const call=async(path,token,body)=>{let status,out;await svc.handler({method:'POST',url:path,headers:{'content-type':'application/json',authorization:'Bearer '+token},body},{setHeader(){},writeHead(s){status=s;return{end:x=>{out=x}}}});return{status,body:JSON.parse(out)}};
  const cap=async()=>{let out;await svc.handler({method:'GET',url:'/v1/competition/capabilities',headers:{}},{setHeader(){},writeHead(){return{end:x=>{out=x}}}});return JSON.parse(out).rulesets.livingCity};
  const client={rules:[1,2],lc:1};
  db.set('skylineV2/flags',{lcTest:{on:true,until:now+3*3600e3,testers:{[H('alice@test.example')]:true,[H('bob@test.example')]:true}}});svc=mk();
  const c=await cap();assert.deepEqual([c.online,c.test,c.ranked],[false,true,false]);assert.ok(!JSON.stringify(c).includes(H('bob@test.example')));ok('test access: capabilities say online:false, test:true; the list is not exposed');
  assert.equal((await call('/v3/lc/me','tA',{})).body.tester,true);assert.equal((await call('/v3/lc/me','tX',{})).body.tester,false);ok('/me tells a listed account it is a tester, others not');
  for(const t of ['tX','tU','tN'])assert.deepEqual([(await call('/v3/lc/create',t,{name:'Z',client})).status],[403]);ok('unlisted, unverified-email and anonymous accounts cannot create');
  let r=await call('/v3/lc/create','tA',{name:'Alice',client,test:true});assert.equal(r.status,200);assert.equal(r.body.test,true);const code=r.body.code;
  assert.equal((await call('/v3/lc/join','tX',{code,name:'M',client})).status,403);assert.equal((await call('/v3/lc/join','tB',{code,name:'Bob',client:{rules:[1]}})).status,426);
  assert.equal((await call('/v3/lc/join','tB',{code,name:'Bob',client})).status,200);ok('listed testers create and join a test room; others and old apps are refused');
  r=await call('/v3/lc/start','tA',{code,ai:1,mode:'timed',rounds:10,scenario:'lc-test'});assert.equal(r.status,200);const G=r.body.game.G;
  assert.ok(G.own.filter(o=>o.o===0).length>=2);assert.ok(G.players[1].cr);ok('test scenario: Alice holds a district, Bob opens under Civic Review');
  let game=r.body.game;const tok={a1:'tA',b1:'tB'};
  const v0=(await call('/v3/lc/state',tok[G.players[game.waitingFor].uid],{code})).body.game;const wrong=game.waitingFor===0?'tB':'tA';
  assert.equal((await call('/v3/lc/act',wrong,{code,revision:v0.revision,answer:{value:'roll'}})).status,403);
  assert.equal((await call('/v3/lc/act',tok[G.players[game.waitingFor].uid],{code,revision:v0.revision-1,answer:{value:'roll'}})).status,409);
  assert.equal((await call('/v3/lc/act',tok[G.players[game.waitingFor].uid],{code,revision:v0.revision,answer:{value:'cash+999999'}})).status,400);
  const a=(await call('/v3/lc/audit','tA',{code})).body;assert.deepEqual(a.audit.rejected,{'not-your-decision':1,'stale-revision':1,'invalid-answer':1});assert.equal((await call('/v3/lc/audit','tX',{code})).status,403);
  ok('rejections are refused and counted in the room audit; non-members cannot read it');
  now+=4*3600e3;svc=mk();assert.equal((await cap()).test,false);assert.equal((await call('/v3/lc/create','tA',{name:'Alice',client,test:true})).status,403);ok('test access expires on its own at "until"');
  db.set('skylineV2/flags',{lcTest:{on:true,until:now+30*3600e3,testers:{[H('alice@test.example')]:true}}});svc=mk();assert.equal((await cap()).test,false);ok('an "until" more than 24 h ahead is ignored (fails closed)');
  db.set('skylineV2/flags',{lcTest:{on:false}});svc=mk();assert.equal((await call('/v3/lc/create','tA',{name:'Alice',client,test:true})).status,403);ok('test access off: no new rooms');
  console.log(`LC TEST ACCESS ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
