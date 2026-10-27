// Explicitly composed human-game start. Production must supply a trusted roster policy.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier}=require('./admission.cjs');
const {initializeGame,normalizeSetupConfig,SetupError,sourceHash}=require('./setup-kernel.cjs');
const {boundedTape,EntropyError}=require('./entropy-tape.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const fail=(status,code)=>{throw new ServiceError(status,code)};
function validateStartRequest(action,input){
 const keys=action==='startGame'?['requestId','code','revision']:action==='selectSeat'?['requestId','code','revision','selection']:null;
 if(!keys||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))fail(400,'invalid-fields');
 if(typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code)||typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId)||!Number.isSafeInteger(input.revision)||input.revision<0||!Number.isSafeInteger(input.revision+1))fail(400,'invalid-fields');
 const out={requestId:input.requestId,code:input.code,revision:input.revision};
 if(action==='selectSeat'){
  const s=input.selection;if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join(',')!=='ch,fin,tok'||typeof s.tok!=='string'||s.tok.length>16||s.fin!==null&&(typeof s.fin!=='string'||s.fin.length>40)||s.ch!==null&&(typeof s.ch!=='string'||s.ch.length>40))fail(400,'invalid-selection');
  out.selection={tok:s.tok,fin:s.fin,ch:s.ch};
 }
 return out;
}
function member(root,uid,code){const room=root?.rooms?.[code];if(room?.members?.[uid]!==true||room.meta?.code!==code||!Number.isInteger(room.seats?.[uid]?.seat)||room.seats[uid].uid!==uid)fail(403,'not-authorized');return room}
function lobby(root,uid,b,{host=false}={}){
 const room=member(root,uid,b.code);if(room.meta.status!=='lobby'||room.state?.phase!=='lobby')fail(409,'lobby-not-open');
 if(room.state.revision!==b.revision)fail(409,'stale-revision');if(host&&room.meta.hostUid!==uid)fail(403,'host-required');
 if(root.service?.starts?.[b.code])fail(409,'game-already-started');
 const seats=Object.values(room.seats||{}).sort((a,b)=>a.seat-b.seat),uids=seats.map(s=>s.uid);
 if(seats.length<1||seats.length>6||new Set(uids).size!==uids.length||new Set(seats.map(s=>s.seat)).size!==seats.length||seats.some(s=>!Number.isInteger(s.seat)||s.seat<0||s.seat>5||typeof s.uid!=='string'||room.members[s.uid]!==true)||Object.keys(room.members).length!==seats.length)fail(409,'invalid-lobby-roster');
 return{room,seats};
}
function createStartService({db,verifyIdToken,resolveRoster,clock=Date.now,randomBytes=crypto.randomBytes,operationLimit=30,timeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function'||typeof resolveRoster!=='function')throw Error('Verified authentication, privileged store and explicit trusted roster resolver are required');
 const identity=identityVerifier(verifyIdToken);
 async function ack(promise){let timer;try{const tx=await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))]);if(!tx.committed)fail(503,'temporarily-unavailable');return tx.snapshot.val()}catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}}
 function roster(root,room,seats){
  let players;try{players=resolveRoster(copy(root),copy(room));if(players?.then||!Array.isArray(players))throw Error()}catch(e){if(e instanceof ServiceError)throw e;fail(503,'roster-policy-unavailable')}
  if(players.length!==seats.length||players.some((p,i)=>!p||p.uid!==seats[i].uid||p.name!==seats[i].name||p.ai!==false))fail(409,'invalid-trusted-roster');
  // The policy must authorize selections, city/theme and ownership; no caller tiers are accepted.
  let config;try{config=normalizeSetupConfig({code:room.meta.code,settings:room.meta.settings,players},{minPlayers:1})}catch(e){if(e instanceof SetupError)fail(409,e.code);throw e}
  return config;
 }
 const digest=(action,b)=>hash(JSON.stringify({action:'lobby-'+action,body:b}));
 function prior(root,uid,b,d){const p=root?.service?.operations?.[hash(uid)]?.[hash(b.requestId)];if(!p)return null;if(p.digest!==d)fail(409,'idempotency-conflict');if(p.result.error)fail(p.result.status,p.result.error);return p.result.data}
 async function execute(token,action,input){
  const uid=await identity(token),b=validateStartRequest(action,input),d=digest(action,b),now=clock();let candidate=null,configJson=null;
  if(action==='startGame'){
   const root=await ack(db.ref('skylineV2').transaction(v=>v,undefined,false));member(root,uid,b.code);const old=prior(root,uid,b,d);if(old)return old;
   const {room,seats}=lobby(root,uid,b,{host:true});if(seats.length<2)fail(409,'two-players-required');
   const limit=root.service?.limits?.[hash(uid)];if(limit&&now-limit.start<60000&&limit.count>=operationLimit)fail(429,'rate-limited');
   const config=roster(root,room,seats);if(config.set.minigames||config.set.timer!==0)fail(501,'setup-not-enabled');configJson=JSON.stringify(config);
   let bytes;try{bytes=randomBytes(1024);if(!Buffer.isBuffer(bytes)||bytes.length!==1024)throw Error()}catch{fail(503,'entropy-unavailable')}
   try{candidate=initializeGame({code:b.code,settings:config.set,players:config.players},{draw:boundedTape(Array.from({length:256},(_,i)=>bytes.readUInt32BE(i*4)))})}catch(e){if(e instanceof EntropyError)fail(e.status,e.code);if(e instanceof SetupError)fail(409,e.code);fail(503,'setup-unavailable')}
   // Source initialization preserves keys, bonus, shuffles and Quick Deal; next is the first roll.
   candidate.phase='pre';
  }
  let outcome;
  await ack(db.ref('skylineV2').transaction(root=>{
   try{member(root,uid,b.code);const old=prior(root,uid,b,d);if(old){outcome={status:200,data:old};return root}}
   catch(e){if(e instanceof ServiceError){outcome={status:e.status,error:e.code};return root}throw e}
   root.service=root.service||{};const service=root.service;service.operations=service.operations||{};service.limits=service.limits||{};service.starts=service.starts||{};
   const ledger=service.operations[hash(uid)]||(service.operations[hash(uid)]={});let budget=service.limits[hash(uid)];
   if(!budget||now-budget.start>=60000)budget={start:now,count:0};if(budget.count>=operationLimit){outcome={status:429,error:'rate-limited'};return root}service.limits[hash(uid)]={...budget,count:budget.count+1};
   try{
    const {room,seats}=lobby(root,uid,b,{host:action==='startGame'}),revision=b.revision+1;
    if(action==='selectSeat'){
     const next=copy(room);next.seats[uid].selection=copy(b.selection);roster(root,next,seats);
     room.seats[uid].selection=copy(b.selection);room.state.revision=revision;outcome={status:200,data:{protocol:2,code:b.code,revision,stage:'lobby'}};
    }else{
     if(seats.length<2||JSON.stringify(roster(root,room,seats))!==configJson)fail(409,'roster-changed');
     const json=JSON.stringify(candidate);if(Buffer.byteLength(json)>262144)fail(409,'game-state-too-large');
     const opening={keys:candidate.keys.slice(),first:candidate.first,lateBonus:candidate.lateBonus,bonus:candidate.players[candidate.lateBonus].cash-candidate.set.cash};
     service.starts[b.code]={version:1,code:b.code,sourceHash,fromRevision:b.revision,toRevision:revision,actorUid:uid,requestId:b.requestId,configHash:hash(configJson),gameHash:hash(json),openingJson:JSON.stringify(opening),at:now};
     room.seats=Object.fromEntries(candidate.players.map((p,i)=>[p.uid,{uid:p.uid,name:p.name,seat:i,tok:p.tok,col:p.col,tl:p.tl,fin:p.fin,ch:p.ch}]));
     room.meta.status='playing';room.state={revision,phase:'pre',gameJson:json};
     outcome={status:200,data:{protocol:2,code:b.code,revision,stage:'pre'}};
    }
   }catch(e){if(e instanceof ServiceError)outcome={status:e.status,error:e.code};else throw e}
   ledger[hash(b.requestId)]={digest:d,at:now,result:outcome};return root;
  },undefined,false));
  if(!outcome)fail(503,'temporarily-unavailable');if(outcome.error)fail(outcome.status,outcome.error);return outcome.data;
 }
 async function readLobby(token,input){
  const uid=await identity(token);if(!input||Object.keys(input).join(',')!=='code'||typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code))fail(400,'invalid-fields');
  const root=await ack(db.ref('skylineV2').transaction(v=>v,undefined,false)),room=member(root,uid,input.code);
  if(!['lobby','playing','over'].includes(room.meta.status)||!Number.isSafeInteger(room.state?.revision))fail(409,'lobby-not-open');
  const seats=Object.values(room.seats).sort((a,b)=>a.seat-b.seat);let visible=seats,supported=true;
  if(room.meta.status==='lobby'){const rows=roster(root,room,seats);visible=seats.map((s,i)=>({...s,...rows.players[i]}));supported=!rows.set.minigames&&rows.set.timer===0}
  return{protocol:2,code:input.code,status:room.meta.status,hostUid:room.meta.hostUid,revision:room.state.revision,startSupported:supported,settings:copy(room.meta.settings),seats:visible.map((s,i)=>Object.fromEntries(['uid','name','tok','col','tl','fin','ch'].filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]]).concat([['seat',s.seat??i]])))};
 }
 return{startGame:(token,body)=>execute(token,'startGame',body),selectSeat:(token,body)=>execute(token,'selectSeat',body),readLobby};
}
module.exports={createStartService,validateStartRequest};
