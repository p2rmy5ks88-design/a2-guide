'use strict';
// Casual Living City online rooms (rule version 2), server-authoritative via online/lc-engine.cjs.
// Feature flag: skylineV2/flags/lcOnline (default OFF) — turning it off immediately stops new rooms; rooms in progress
// keep their pinned rules. Clients must declare rules capability 2 (capability negotiation); older apps never send it
// and cannot create or join these rooms. No ranked/competition scoring, wallet, SC ledger, Coins or purchases here.
const crypto=require('node:crypto'),path=require('node:path');
const {ServiceError,identityVerifier}=require('../security/service/admission.cjs');
// Test access (flag skylineV2/flags/lcTest = {on:true,until:<ms>,testers:{<sha256 of lower-case email>:true}}): only
// listed signed-in accounts (verified email, not anonymous) may create or join, rooms are marked test, and access
// expires by itself at 'until' (max 24 h after it is set). The list is never exposed; capabilities say only test:true.
const {createEngine,EngineError}=require('../online/lc-engine.cjs');
const fail=(s,c)=>{throw new ServiceError(s,c)};
const CODE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,LC_CLIENT_MIN=1,MAX_SEATS=4;
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
function cleanName(v){if(typeof v!=='string')fail(400,'invalid-name');const s=v.trim();if(!s||s.length>12||/[<>\x00-\x1f\x7f]/.test(s))fail(400,'invalid-name');return s}
function requireClient(c){if(!plain(c)||!Array.isArray(c.rules)||!c.rules.includes(2)||!Number.isInteger(c.lc)||c.lc<LC_CLIENT_MIN)fail(426,'client-upgrade-required')}
const DUEL_TURN_MS=25000;
function createLivingCityService({db,verifyIdToken,root=path.resolve(__dirname,'..'),clock=Date.now,randomBytes=crypto.randomBytes,flagTtlMs=15000}){
  if(!db||typeof verifyIdToken!=='function')throw Error('Privileged store and verified auth required');
  const identity=identityVerifier(verifyIdToken);
  async function claims(token){const uid=await identity(token);let c={};try{c=await verifyIdToken(token,true)||{}}catch{}return{uid,c}}
  const emailHash=c=>{const prov=c.firebase&&c.firebase.sign_in_provider;if(!c.email||prov==='anonymous'||prov==='custom')return null;if(prov==='password'&&c.email_verified!==true)return null;return crypto.createHash('sha256').update(String(c.email).trim().toLowerCase()).digest('hex')};let engine=null;const eng=()=>engine||(engine=createEngine(root));
  let flagCache={at:-1e12,on:false,test:null};
  async function read(p){let v=null;await db.ref(p).transaction(cur=>{v=cur;return cur});return v}
  async function flags(){if(clock()-flagCache.at<flagTtlMs)return flagCache;let on=false,test=null;try{const f=await read('skylineV2/flags');on=!!(f&&f.lcOnline===true);const t=f&&f.lcTest;
      if(plain(t)&&t.on===true&&Number.isSafeInteger(t.until)&&t.until>clock()&&t.until-clock()<=864e5&&plain(t.testers))test={until:t.until,testers:Object.keys(t.testers).filter(k=>t.testers[k]===true&&/^[0-9a-f]{64}$/.test(k))}}catch{on=false;test=null}
    flagCache={at:clock(),on,test};return flagCache}
  async function flag(){return(await flags()).on}
  async function admit(token,roomTest){const f=await flags();if(f.on&&!roomTest)return{uid:await identity(token),test:false};
    if(!f.test)fail(403,'living-city-online-disabled');const {uid,c}=await claims(token);const h=emailHash(c);if(!h||!f.test.testers.includes(h))fail(403,'living-city-online-disabled');return{uid,test:true}}
  const roomPath=code=>'skylineV2/lc/'+code;
  async function commit(code,expectRevision,next){let ok=false;await db.ref(roomPath(code)).transaction(cur=>{if(expectRevision===null?cur!=null:!cur||cur.revision!==expectRevision)return cur;ok=true;return next});if(!ok)fail(409,expectRevision===null?'code-collision':'stale-revision');return next}
  const code5=()=>Array.from(randomBytes(5),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
  const lobbyView=(r,uid)=>({code:r.code,status:r.status,test:!!r.test,host:r.host===uid,seats:r.seats.map(s=>({name:s.name,you:s.uid===uid,ai:!!s.ai})),revision:r.revision,rules:2});
  function tally(a,kind,key,assets){a=JSON.parse(JSON.stringify(a||{}));const k=String(key||'none').replace(/[^a-z0-9_-]/gi,'_').slice(0,40);a[kind]=a[kind]||{};a[kind][k]=(a[kind][k]||0)+1;
    if(Array.isArray(assets))for(const o of assets){const ak='asset_'+String(o&&o.kind).replace(/[^a-z]/g,'').slice(0,10);a[kind][ak]=(a[kind][ak]||0)+1}return a}
  async function bump(code,kind,key){try{await db.ref(roomPath(code)).transaction(cur=>{if(!cur)return cur;return{...cur,audit:tally(cur.audit,kind,key)}})}catch{}}
  async function member(code,uid){if(typeof code!=='string'||!CODE.test(code))fail(400,'invalid-code');const r=await read(roomPath(code));if(!r)fail(404,'room-not-found');if(!r.seats.some(s=>s.uid===uid))fail(403,'not-a-member');return r}
  return{
    async capabilities(){const f=await flags();return{livingCity:{version:2,online:f.on,test:!!f.test,minClient:LC_CLIENT_MIN,ranked:false}}},
    async me(token){const f=await flags();if(!f.test)return{tester:false,on:f.on};const {c}=await claims(token);const h=emailHash(c);return{tester:!!(h&&f.test.testers.includes(h)),on:f.on}},
    async audit(token,b){const {uid}=await claims(token);const r=await member(b&&b.code,uid);if(!r.test)fail(403,'not-a-test-room');const m=r.match?JSON.parse(r.match):null,G=m&&m.G;
      return{code:r.code,test:true,status:r.status,revision:r.revision,audit:r.audit||{},match:G?{round:G.round,over:!!m.over,rv:G.rv,seats:G.players.map(p=>({human:!p.ai,bankrupt:!!p.bankrupt,cash:p.cash,underReview:!!p.cr})),
        landmarks:Object.keys(G.lm||{}).length,built:G.own.filter(o=>o.o>=0&&o.h>0).length,event:G.ev2?{id:G.ev2.id,from:G.ev2.from}:null,lcStats:G.lcStats||{},waitingFor:m.boundary?m.boundary.type:null}:null}},
    async create(token,b){requireClient(b&&b.client);const {uid,test}=await admit(token,!!(b&&b.test));
      const name=cleanName(b.name),city=typeof b.city==='string'&&/^[a-z][a-z0-9_]{1,23}$/.test(b.city)?b.city:'lagos';
      for(let i=0;i<6;i++){const code=code5();try{const r=await commit(code,null,{v:1,rules:2,code,host:uid,city,status:'lobby',seats:[{uid,name}],created:clock(),revision:1,...(test?{test:true}:{})});return lobbyView(r,uid)}catch(e){if(e.code!=='code-collision')throw e}}
      fail(503,'temporarily-unavailable')},
    async join(token,b){requireClient(b&&b.client);const name=cleanName(b.name);if(typeof b.code!=='string'||!CODE.test(b.code))fail(400,'invalid-code');
      const r0=await read(roomPath(b.code));const {uid}=await admit(token,!!(r0&&r0.test));const r=r0;if(!r)fail(404,'room-not-found');if(r.seats.some(s=>s.uid===uid))return lobbyView(r,uid);
      if(r.status!=='lobby')fail(409,'already-started');if(r.seats.length>=MAX_SEATS)fail(409,'room-full');
      const next={...r,seats:r.seats.concat({uid,name}),revision:r.revision+1};await commit(r.code,r.revision,next);return lobbyView(next,uid)},
    async start(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);if(r.host!==uid)fail(403,'host-only');if(r.status!=='lobby')fail(409,'already-started');
      const ai=Number.isInteger(b.ai)?b.ai:0;if(ai<0||r.seats.length+ai>MAX_SEATS||r.seats.length+ai<2)fail(400,'invalid-seat-count');
      const seats=r.seats.map(s=>({uid:s.uid,name:s.name})).concat([...Array(ai)].map((_,k)=>({ai:true,name:['Kofi','Mei','Lucas'][k]})));
      const duel=b.mode==='duel';if(duel&&(r.seats.length!==2||ai!==0))fail(400,'duel-needs-two-players');
      let st;try{const timed=duel?{mode:'timed',rounds:15,duel:1}:b.mode==='timed'&&[10,20,30].includes(b.rounds)?{mode:'timed',rounds:b.rounds}:{mode:'classic'};
      st=await eng().create({seats,set:{city:r.city,...timed},seed:crypto.randomBytes(12).toString('hex'),scenario:r.test&&b.scenario==='lc-test'?'lc-test':null})}catch(e){if(e instanceof EngineError)fail(e.status,e.code);throw e}
      const next={...r,status:'playing',match:JSON.stringify(st),revision:r.revision+1,...(duel?{duel:true,deadline:clock()+DUEL_TURN_MS}:{})};await commit(r.code,r.revision,next);return{...lobbyView(next,uid),game:eng().view(st,uid)}},
    async act(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);if(r.status!=='playing')fail(409,'not-playing');
      if(!plain(b.answer)||!Number.isSafeInteger(b.revision))fail(400,'invalid-action');let st;
      const prev=JSON.parse(r.match);
      try{st=await eng().act(prev,uid,{revision:b.revision,answer:b.answer})}catch(e){if(e instanceof EngineError){if(r.test)await bump(r.code,'rejected',e.code);fail(e.status,e.code)}throw e}
      const audit=r.test?tally(r.audit,'answered',prev.boundary&&prev.boundary.type,b.answer.assets):r.audit;
      const next={...r,match:JSON.stringify(st),status:st.over?'finished':'playing',revision:r.revision+1,...(audit?{audit}:{}),...(r.duel?{deadline:clock()+DUEL_TURN_MS}:{})};await commit(r.code,r.revision,next);return{game:eng().view(st,uid)}},
    // Skyline Duel turn timer: once the deadline has passed, either player may ask the server to let the AI play the idle
    // player's turn; the third timeout in a row forfeits. The server's clock decides, never the caller's.
    async timeout(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);if(!r.duel)fail(400,'not-a-duel');if(r.status!=='playing')fail(409,'not-playing');
      if(!Number.isSafeInteger(b.revision))fail(400,'invalid-action');const prev=JSON.parse(r.match);if(b.revision!==prev.revision)fail(409,'stale-revision');
      if(clock()<r.deadline)fail(409,'not-yet');let st;try{st=await eng().timeout(prev)}catch(e){if(e instanceof EngineError)fail(e.status,e.code);throw e}
      const next={...r,match:JSON.stringify(st),status:st.over?'finished':'playing',revision:r.revision+1,deadline:clock()+DUEL_TURN_MS};await commit(r.code,r.revision,next);return{game:eng().view(st,uid),forfeit:st.forfeit??null}},
    async state(token,b){const uid=await identity(token);const r=await member(b&&b.code,uid);return{...lobbyView(r,uid),game:r.match?eng().view(JSON.parse(r.match),uid):null}}}}
module.exports={createLivingCityService,LC_CLIENT_MIN,DUEL_TURN_MS};
