'use strict';
// Casual Living City online rooms (rule version 2), server-authoritative via online/lc-engine.cjs.
// Feature flag: skylineV2/flags/lcOnline (default OFF) — turning it off immediately stops new rooms; rooms in progress
// keep their pinned rules. Clients must declare rules capability 2 (capability negotiation); older apps never send it
// and cannot create or join these rooms. No ranked/competition scoring, wallet, SC ledger, Coins or purchases here.
const crypto=require('node:crypto'),path=require('node:path');
const {ServiceError,identityVerifier}=require('../security/service/admission.cjs');
const {createEngine,EngineError}=require('../online/lc-engine.cjs');
const fail=(s,c)=>{throw new ServiceError(s,c)};
const CODE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,LC_CLIENT_MIN=1,MAX_SEATS=4;
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
function cleanName(v){if(typeof v!=='string')fail(400,'invalid-name');const s=v.trim();if(!s||s.length>12||/[<>\x00-\x1f\x7f]/.test(s))fail(400,'invalid-name');return s}
function requireClient(c){if(!plain(c)||!Array.isArray(c.rules)||!c.rules.includes(2)||!Number.isInteger(c.lc)||c.lc<LC_CLIENT_MIN)fail(426,'client-upgrade-required')}
function createLivingCityService({db,verifyIdToken,root=path.resolve(__dirname,'..'),clock=Date.now,randomBytes=crypto.randomBytes,flagTtlMs=15000}){
  if(!db||typeof verifyIdToken!=='function')throw Error('Privileged store and verified auth required');
  const identity=identityVerifier(verifyIdToken);let engine=null;const eng=()=>engine||(engine=createEngine(root));
  let flagCache={at:-1e12,on:false};
  async function read(p){let v=null;await db.ref(p).transaction(cur=>{v=cur;return cur});return v}
  async function flag(){if(clock()-flagCache.at<flagTtlMs)return flagCache.on;let on=false;try{const f=await read('skylineV2/flags');on=!!(f&&f.lcOnline===true)}catch{on=false}flagCache={at:clock(),on};return on}
  const roomPath=code=>'skylineV2/lc/'+code;
  async function commit(code,expectRevision,next){let ok=false;await db.ref(roomPath(code)).transaction(cur=>{if(expectRevision===null?cur!=null:!cur||cur.revision!==expectRevision)return cur;ok=true;return next});if(!ok)fail(409,expectRevision===null?'code-collision':'stale-revision');return next}
  const code5=()=>Array.from(randomBytes(5),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
  const lobbyView=(r,uid)=>({code:r.code,status:r.status,host:r.host===uid,seats:r.seats.map(s=>({name:s.name,you:s.uid===uid,ai:!!s.ai})),revision:r.revision,rules:2});
  async function member(code,uid){if(typeof code!=='string'||!CODE.test(code))fail(400,'invalid-code');const r=await read(roomPath(code));if(!r)fail(404,'room-not-found');if(!r.seats.some(s=>s.uid===uid))fail(403,'not-a-member');return r}
  return{
    async capabilities(){return{livingCity:{version:2,online:await flag(),minClient:LC_CLIENT_MIN,ranked:false}}},
    async create(token,b){const uid=await identity(token);requireClient(b&&b.client);if(!await flag())fail(403,'living-city-online-disabled');
      const name=cleanName(b.name),city=typeof b.city==='string'&&/^[a-z][a-z0-9_]{1,23}$/.test(b.city)?b.city:'lagos';
      for(let i=0;i<6;i++){const code=code5();try{const r=await commit(code,null,{v:1,rules:2,code,host:uid,city,status:'lobby',seats:[{uid,name}],created:clock(),revision:1});return lobbyView(r,uid)}catch(e){if(e.code!=='code-collision')throw e}}
      fail(503,'temporarily-unavailable')},
    async join(token,b){const uid=await identity(token);requireClient(b&&b.client);const name=cleanName(b.name);if(typeof b.code!=='string'||!CODE.test(b.code))fail(400,'invalid-code');
      const r=await read(roomPath(b.code));if(!r)fail(404,'room-not-found');if(r.seats.some(s=>s.uid===uid))return lobbyView(r,uid);
      if(r.status!=='lobby')fail(409,'already-started');if(r.seats.length>=MAX_SEATS)fail(409,'room-full');
      const next={...r,seats:r.seats.concat({uid,name}),revision:r.revision+1};await commit(r.code,r.revision,next);return lobbyView(next,uid)},
    async start(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);if(r.host!==uid)fail(403,'host-only');if(r.status!=='lobby')fail(409,'already-started');
      const ai=Number.isInteger(b.ai)?b.ai:0;if(ai<0||r.seats.length+ai>MAX_SEATS||r.seats.length+ai<2)fail(400,'invalid-seat-count');
      const seats=r.seats.map(s=>({uid:s.uid,name:s.name})).concat([...Array(ai)].map((_,k)=>({ai:true,name:['Kofi','Mei','Lucas'][k]})));
      let st;try{const timed=b.mode==='timed'&&[10,20,30].includes(b.rounds)?{mode:'timed',rounds:b.rounds}:{mode:'classic'};
      st=await eng().create({seats,set:{city:r.city,...timed},seed:crypto.randomBytes(12).toString('hex')})}catch(e){if(e instanceof EngineError)fail(e.status,e.code);throw e}
      const next={...r,status:'playing',match:JSON.stringify(st),revision:r.revision+1};await commit(r.code,r.revision,next);return{...lobbyView(next,uid),game:eng().view(st,uid)}},
    async act(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);if(r.status!=='playing')fail(409,'not-playing');
      if(!plain(b.answer)||!Number.isSafeInteger(b.revision))fail(400,'invalid-action');let st;
      try{st=await eng().act(JSON.parse(r.match),uid,{revision:b.revision,answer:b.answer})}catch(e){if(e instanceof EngineError)fail(e.status,e.code);throw e}
      const next={...r,match:JSON.stringify(st),status:st.over?'finished':'playing',revision:r.revision+1};await commit(r.code,r.revision,next);return{game:eng().view(st,uid)}},
    async state(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);return{...lobbyView(r,uid),game:r.match?eng().view(JSON.parse(r.match),uid):null}}}}
module.exports={createLivingCityService,LC_CLIENT_MIN};
