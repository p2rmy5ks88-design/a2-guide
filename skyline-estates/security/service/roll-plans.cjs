// Internal durable reservation only. No HTTP route or live game imports this service.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier}=require('./admission.cjs');
const {sampleDice,SetupError,sourceHash}=require('./setup-kernel.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=(status,code)=>{throw new ServiceError(status,code)};
const error=(status,code)=>({status,error:code});
function fields(x,keys){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==keys.slice().sort().join(','))fail(400,'invalid-fields')}
function body(input,kind){
 const keys=['code','revision',...(kind==='reserve'?['requestId']:kind==='load'?['planId']:[])];fields(input,keys);
 if(typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code))fail(400,'invalid-code');
 if(!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'invalid-revision');
 if(kind==='reserve'&&(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId)))fail(400,'invalid-request-id');
 if(kind==='load'&&(typeof input.planId!=='string'||!/^[a-f0-9]{64}$/.test(input.planId)))fail(400,'invalid-plan-id');
 return Object.fromEntries(keys.map(k=>[k,input[k]]));
}
function eligible(root,uid,request){
 const room=root?.rooms?.[request.code];
 if(!room||room.meta?.status!=='playing'||room.members?.[uid]!==true)fail(403,'not-authorized');
 if(room.state?.revision!==request.revision)fail(409,'stale-revision');
 if(room.state.phase!=='pre')fail(409,'unsupported-roll-phase');
 let game;try{if(typeof room.state.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();game=JSON.parse(room.state.gameJson)}catch{fail(409,'invalid-game-state')}
 if(game?.code!==request.code)fail(409,'invalid-game-state');
 if(room.seats?.[uid]?.seat!==game.turn||game.players?.[game.turn]?.uid!==uid)fail(409,'not-your-turn');
 return{room,game,gameHash:hash(room.state.gameJson)};
}
const ack=plan=>({protocol:2,code:plan.code,revision:plan.revision,planId:plan.id});
function inspectRoll(root,uid,request){
  const {game,gameHash}=eligible(root,uid,request),lock=root.service?.rollLocks?.[request.code];
  if(!lock)fail(404,'roll-not-reserved');
  const plan=root.service?.rollPlans?.[lock.planId];
  if(request.planId&&request.planId!==lock.planId)fail(403,'not-authorized');
  if(!plan||plan.version!==1||plan.id!==lock.planId||plan.id!==hash(JSON.stringify([request.code,request.revision]))||plan.actorUid!==uid||plan.code!==request.code||lock.actorUid!==uid)fail(409,'invalid-roll-plan');
  if(plan.revision!==request.revision||lock.revision!==request.revision||plan.gameHash!==gameHash||lock.gameHash!==gameHash)fail(409,'roll-plan-stale');
  if(plan.consumedRevision!=null)fail(409,'roll-already-consumed');
  if(plan.sourceHash!==sourceHash)fail(409,'roll-plan-incompatible');
  // Recheck game legality with the existing sampler, using stored values rather than fresh entropy.
  let dice;try{dice=JSON.parse(plan.diceJson);fields(dice,['a','b','sv','face']);if(![dice.a,dice.b].every(n=>Number.isInteger(n)&&n>=1&&n<=6))throw Error();const turbo=!!(game.set.speedDie&&game.players[game.turn].lapped);if(turbo?!(Number.isInteger(dice.sv)&&dice.sv>=1&&dice.sv<=6):dice.sv!==0)throw Error();let i=0;const values=[dice.a-1,dice.b-1,dice.sv-1],expected=sampleDice(game,uid,{draw:()=>values[i++]});if(['a','b','sv','face'].some(k=>expected[k]!==dice[k]))throw Error()}catch{fail(409,'invalid-roll-plan')}
  return{...ack(plan),dice};
 }
function createRollPlanService({db,verifyIdToken,clock=Date.now,draw=crypto.randomInt,operationLimit=30,timeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function'||typeof draw!=='function')throw Error('A privileged store, verified authentication and trusted integer provider are required');
 const identity=identityVerifier(verifyIdToken);
 async function acknowledged(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))])}catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}}
 async function freshRoot(){const tx=await acknowledged(db.ref('skylineV2').transaction(value=>value,undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');return tx.snapshot.val()}
 function unwrap(outcome){if(!outcome||typeof outcome.status!=='number')fail(503,'temporarily-unavailable');if(outcome.error)fail(outcome.status,outcome.error);return outcome.data}
 async function reserveRoll(token,input){
  const uid=await identity(token),request=body(input,'reserve'),identityKey=hash(uid),operationKey=hash(request.requestId),digest=hash(JSON.stringify({action:'reserveRoll',body:request}));
  // Recover an acknowledged receipt before requiring entropy; cached reads cannot prove it.
  const probe=await freshRoot(),prior=probe?.service?.operations?.[identityKey]?.[operationKey];
  if(prior)return unwrap(prior.digest===digest?prior.result:error(409,'idempotency-conflict'));
  // This candidate is generated ONCE outside the retrying transaction, never from caller data.
  let candidate;try{candidate=Array.from({length:3},()=>draw(6));if(candidate.some(n=>!Number.isInteger(n)||n<0||n>=6))throw Error()}catch{fail(503,'entropy-unavailable')}
  const now=clock(),planId=hash(JSON.stringify([request.code,request.revision]));let outcome;
  const tx=await acknowledged(db.ref('skylineV2').transaction(root=>{
   root=root||{};root.service=root.service||{};const service=root.service;
   service.operations=service.operations||{};service.limits=service.limits||{};service.rollPlans=service.rollPlans||{};service.rollLocks=service.rollLocks||{};
   const operations=service.operations[identityKey]||(service.operations[identityKey]={}),previous=operations[operationKey];
   if(previous){outcome=previous.digest===digest?previous.result:error(409,'idempotency-conflict');return root}
   let limit=service.limits[identityKey];if(!limit||now-limit.start>=60000)limit={start:now,count:0};
   if(limit.count>=operationLimit){outcome=error(429,'rate-limited');return root}limit.count++;service.limits[identityKey]=limit;
   try{
    if(service.turns?.[request.code])fail(409,'turn-decision-pending');
    const {game,gameHash}=eligible(root,uid,request);
    if(service.rollLocks[request.code]||service.rollPlans[planId])fail(409,'roll-already-reserved');
    let index=0;const dice=sampleDice(game,uid,{draw:max=>{if(max!==6||index>=candidate.length)throw Error('Unaudited dice draw');return candidate[index++]}});
    const plan={version:1,id:planId,code:request.code,actorUid:uid,revision:request.revision,requestId:request.requestId,gameHash,sourceHash,diceJson:JSON.stringify(dice),createdAt:now};
    service.rollPlans[planId]=plan;service.rollLocks[request.code]={planId,actorUid:uid,revision:request.revision,gameHash};outcome={status:200,data:ack(plan)};
   }catch(e){if(e instanceof ServiceError)outcome=error(e.status,e.code);else if(e instanceof SetupError)outcome=error(409,e.code);else throw e}
   operations[operationKey]={digest,at:now,result:outcome};return root;
  },undefined,false));
  if(!tx.committed)fail(503,'temporarily-unavailable');return unwrap(outcome);
 }

 async function loadRoll(token,input){const uid=await identity(token),request=body(input,'load');return inspectRoll(await freshRoot(),uid,request)}
 async function recoverRoll(token,input){const uid=await identity(token),request=body(input,'recover'),loaded=inspectRoll(await freshRoot(),uid,request);const {dice,...publicAck}=loaded;return publicAck}
 return{reserveRoll,loadRoll,recoverRoll};
}
module.exports={createRollPlanService,inspectRoll};
