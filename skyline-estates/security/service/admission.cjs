const crypto=require('node:crypto');
const {applyAssetAction,validateCommand,AssetError}=require('./asset-kernel.cjs');
class ServiceError extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
const fail=(status,code)=>{throw new ServiceError(status,code)};
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const codePattern=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;
function fields(value,keys){if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k)))fail(400,'invalid-fields')}
function name(value){if(typeof value!=='string'||!value.trim()||value.trim().length>12||/[<>\x00-\x1f\x7f]/.test(value))fail(400,'invalid-name');return value.trim()}
function settings(value){
 const booleans=['minigames','perks','ffa','events','speedDie','pot','goDouble','jailRent','auction','even','interest'];
 fields(value,['mode','rounds','city','theme','cash','timer','ai','speed',...booleans]);
 if(!['classic','quick','timed'].includes(value.mode)||typeof value.city!=='string'||!/^[a-z][a-z0-9_]{1,23}$/.test(value.city))fail(400,'invalid-settings');
 if(Object.hasOwn(value,'cash')&&![1200,1600,2000].includes(value.cash)||Object.hasOwn(value,'timer')&&![0,90].includes(value.timer)||Object.hasOwn(value,'rounds')&&![10,20,30,45].includes(value.rounds)||value.mode==='timed'&&value.rounds==null)fail(400,'invalid-settings');
 if(Object.hasOwn(value,'ai')&&!['easy','normal','hard'].includes(value.ai)||Object.hasOwn(value,'speed')&&!['normal','fast'].includes(value.speed)||Object.hasOwn(value,'theme')&&(typeof value.theme!=='string'||!/^[a-z][a-z0-9_]{1,23}$/.test(value.theme))||booleans.some(k=>Object.hasOwn(value,k)&&typeof value[k]!=='boolean'))fail(400,'invalid-settings');
 return Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]]));
}
function randomCode(){return Array.from(crypto.randomBytes(5),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('')}
function identityVerifier(verifyIdToken){return async function identity(token){if(typeof token!=='string'||!token||token.length>8192)fail(401,'unauthenticated');let user;try{user=await verifyIdToken(token,true)}catch{fail(401,'unauthenticated')}if(!/^[A-Za-z0-9_-]{1,128}$/.test(user?.uid||'')||['__proto__','prototype','constructor'].includes(user.uid))fail(403,'unsupported-identity');return user.uid}}
function validateAdmissionRequest(action,body){
  const keys={create:['requestId','name','settings'],join:['requestId','name','code','invite'],leave:['requestId','code'],action:['requestId','code','revision','command']}[action];if(!keys)fail(501,'game-engine-not-enabled');fields(body,keys);
  if(typeof body.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(body.requestId))fail(400,'invalid-request-id');
  const result={requestId:body.requestId};if(action!=='create'){if(typeof body.code!=='string'||!codePattern.test(body.code||''))fail(400,'invalid-code');result.code=body.code}
  if(['create','join'].includes(action))result.name=name(body.name);if(action==='create')result.settings=settings(body.settings);
  if(action==='join'){if(typeof body.invite!=='string'||!/^[a-f0-9]{64}$/.test(body.invite))fail(403,'not-authorized');result.invite=body.invite}
  if(action==='action'){if(!Number.isSafeInteger(body.revision)||body.revision<0)fail(400,'invalid-revision');result.revision=body.revision;try{result.command=validateCommand(body.command)}catch(e){if(e instanceof AssetError)fail(e.status,e.code);throw e}}
  return result;
 }

function createAdmissionService({db,verifyIdToken,clock=Date.now,generateCode=randomCode,operationLimit=30,readTimeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function')throw Error('Verified authentication and a privileged store are required');
 const identity=identityVerifier(verifyIdToken);
 function view(room){return{protocol:2,code:room.meta.code,status:room.meta.status,hostUid:room.meta.hostUid,revision:room.state.revision,settings:room.meta.settings,seats:Object.values(room.seats||{}).sort((a,b)=>a.seat-b.seat)}}
 async function execute(token,action,input){
  const uid=await identity(token),identityKey=hash(uid),body=validateAdmissionRequest(action,input),digest=hash(JSON.stringify({action,body})),now=clock(),candidates=action==='create'?Array.from({length:8},generateCode):[],invite=action==='create'?crypto.randomBytes(32).toString('hex'):null;
  if(candidates.some(c=>!codePattern.test(c)))throw Error('Invalid generated room code');let outcome;
  const tx=await db.ref('skylineV2').transaction(root=>{
   root=root||{};root.rooms=root.rooms||{};root.service=root.service||{};root.service.operations=root.service.operations||{};root.service.limits=root.service.limits||{};root.service.invites=root.service.invites||{};
   const operations=root.service.operations[identityKey]||(root.service.operations[identityKey]={}),prior=operations[hash(body.requestId)];
   if(prior){outcome=prior.digest===digest?prior.result:{status:409,error:'idempotency-conflict'};return root}
   let limit=root.service.limits[identityKey];if(!limit||now-limit.start>=60000)limit={start:now,count:0};
   if(limit.count>=operationLimit){outcome={status:429,error:'rate-limited'};return root}limit.count++;root.service.limits[identityKey]=limit;
   const error=(status,code)=>({status,error:code});
   if(action==='create'){
    const code=candidates.find(c=>!root.rooms[c]);if(!code)outcome=error(409,'room-code-collision');else{
     root.rooms[code]={meta:{protocol:2,code,status:'lobby',hostUid:uid,createdAt:now,settings:body.settings},members:{[uid]:true},seats:{[uid]:{uid,name:body.name,seat:0}},state:{revision:0,phase:'lobby'}};
     root.service.invites[code]=hash(invite);outcome={status:200,data:{protocol:2,code,invite}};
    }
   }else{
    const room=root.rooms[body.code];
    if(action==='action'){
     if(!room||room.meta.status!=='playing'||room.members?.[uid]!==true)outcome=error(403,'not-authorized');
     else if(room.state?.revision!==body.revision)outcome=error(409,'stale-revision');
     else if(root.service.endTurns?.[hash(JSON.stringify([body.code,body.revision]))])outcome=error(409,'turn-already-ended');
     else if(root.service.turns?.[body.code])outcome=error(409,'turn-decision-pending');
     else if(root.service.rollLocks?.[body.code]||root.service.rollPlans?.[hash(JSON.stringify([body.code,body.revision]))])outcome=error(409,'roll-pending');
     else if(!Number.isSafeInteger(room.state.revision+1))outcome=error(409,'invalid-revision');
     else{try{
      let stored;try{if(typeof room.state.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();stored=JSON.parse(room.state.gameJson)}catch{throw new AssetError('invalid-game-state')}
      if(room.seats?.[uid]?.seat!==stored?.turn||stored?.players?.[stored.turn]?.uid!==uid)throw new AssetError('not-your-turn');
      const game=applyAssetAction(stored,uid,body.command);room.state={...room.state,gameJson:JSON.stringify(game),revision:room.state.revision+1};outcome={status:200,data:{protocol:2,code:body.code,revision:room.state.revision}}
     }catch(e){if(!(e instanceof AssetError))throw e;outcome=error(e.status,e.code)}}
    }else if(!room||room.meta.status!=='lobby')outcome=error(403,'not-authorized');
    else if(action==='join'){
     const expected=root.service.invites[body.code],actual=hash(body.invite);
     if(!expected||!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex')))outcome=error(403,'not-authorized');
     else if(room.members?.[uid]===true)outcome={status:200,data:{protocol:2,code:body.code}};
     else if(Object.keys(room.members||{}).length>=6)outcome=error(409,'room-full');
     else{const seats=Object.values(room.seats||{}),used=new Set(seats.map(s=>s.seat));let seat=0;while(used.has(seat))seat++;let selected=body.name,k=2;while(seats.some(s=>s.name===selected))selected=body.name.slice(0,10)+' '+k++;
      room.members={...room.members,[uid]:true};room.seats={...room.seats,[uid]:{uid,name:selected,seat}};room.state.revision++;outcome={status:200,data:{protocol:2,code:body.code}}}
    }else if(room.members?.[uid]!==true)outcome=error(403,'not-authorized');
    else{delete room.members[uid];delete room.seats[uid];delete room.presence?.[uid];room.state.revision++;const remaining=Object.values(room.seats||{}).sort((a,b)=>a.seat-b.seat);
     if(!remaining.length){room.meta.status='closed';room.state.phase='closed';room.meta.hostUid=null;delete root.service.invites[body.code]}else if(room.meta.hostUid===uid)room.meta.hostUid=remaining[0].uid;
     outcome={status:200,data:{protocol:2,code:body.code}}}
   }
   operations[hash(body.requestId)]={digest,at:now,result:outcome};return root;
  },undefined,false);
  if(!tx.committed)fail(503,'temporarily-unavailable');if(outcome.error)fail(outcome.status,outcome.error);return outcome.data;
 }

 async function readRoom(token,code){
  const uid=await identity(token);if(!codePattern.test(code||''))fail(400,'invalid-code');let timer,tx;
  // A no-op transaction requires a server acknowledgement; cached observers are not authorization.
  try{tx=await Promise.race([db.ref('skylineV2/rooms/'+code).transaction(value=>value,undefined,false),new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),readTimeoutMs))])}finally{clearTimeout(timer)}
  if(!tx.committed)fail(503,'temporarily-unavailable');const room=tx.snapshot.val();if(room?.members?.[uid]!==true)fail(403,'not-authorized');return view(room);
 }
 return{execute,readRoom,assetAction:(token,body)=>execute(token,'action',body)};
}
module.exports={createAdmissionService,ServiceError,identityVerifier,validateAdmissionRequest};
