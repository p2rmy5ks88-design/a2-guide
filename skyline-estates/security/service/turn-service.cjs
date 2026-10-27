// Internal only: commit an existing private roll, then checkpoint required choices.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier}=require('./admission.cjs');
const {inspectRoll}=require('./roll-plans.cjs');
const {applyRoll,chooseTurn,TurnError,sourceHash}=require('./turn-kernel.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=(status,code)=>{throw new ServiceError(status,code)};
function validate(input,action){const keys=['requestId','code','revision',...(action==='commit'?['planId']:['kind'])];if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))fail(400,'invalid-fields');if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId))fail(400,'invalid-request-id');if(typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code))fail(400,'invalid-code');if(!Number.isSafeInteger(input.revision)||input.revision<0||!Number.isSafeInteger(input.revision+1))fail(400,'invalid-revision');if(action==='commit'&&(typeof input.planId!=='string'||!/^[a-f0-9]{64}$/.test(input.planId)))fail(400,'invalid-plan-id');if(action==='choose'&&!['buy','decline','keep'].includes(input.kind))fail(501,'unsupported-turn-choice');return Object.fromEntries(keys.map(k=>[k,input[k]]))}
function current(root,uid,code,revision){const room=root?.rooms?.[code];if(!room||room.meta?.status!=='playing'||room.members?.[uid]!==true)fail(403,'not-authorized');if(room.state?.revision!==revision)fail(409,'stale-revision');let game;try{if(typeof room.state.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();game=JSON.parse(room.state.gameJson)}catch{fail(409,'invalid-game-state')}if(game?.code!==code)fail(409,'invalid-game-state');if(room.seats?.[uid]?.seat!==game.turn||game.players?.[game.turn]?.uid!==uid)fail(409,'not-your-turn');return{room,game}}
function checkpoint(root,uid,code,revision,room){const saved=root.service?.turns?.[code];if(!saved||saved.version!==1||saved.actorUid!==uid||saved.revision!==revision||saved.gameHash!==hash(room.state.gameJson)||saved.sourceHash!==sourceHash)fail(409,'invalid-turn-checkpoint');let pending;try{pending=JSON.parse(saved.checkpointJson);if(!pending.boundary||!pending.context)throw Error()}catch{fail(409,'invalid-turn-checkpoint')}return pending}
function createTurnService({db,verifyIdToken,clock=Date.now,operationLimit=30,timeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function')throw Error('A privileged store and verified authentication are required');const identity=identityVerifier(verifyIdToken);
 async function acknowledged(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))])}catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}}
 async function execute(token,action,input){const uid=await identity(token),body=validate(input,action),key=hash(uid),operationKey=hash(body.requestId),digest=hash(JSON.stringify({action:'turn-'+action,body})),now=clock();let outcome;
  const tx=await acknowledged(db.ref('skylineV2').transaction(root=>{root=root||{};root.service=root.service||{};const service=root.service;service.operations=service.operations||{};service.limits=service.limits||{};service.turns=service.turns||{};const operations=service.operations[key]||(service.operations[key]={}),prior=operations[operationKey];if(prior){outcome=prior.digest===digest?prior.result:{status:409,error:'idempotency-conflict'};return root}let limit=service.limits[key];if(!limit||now-limit.start>=60000)limit={start:now,count:0};if(limit.count>=operationLimit){outcome={status:429,error:'rate-limited'};return root}limit.count++;service.limits[key]=limit;
   try{
    const {room,game}=current(root,uid,body.code,body.revision);let result;
    if(action==='commit'){
     if(service.turns[body.code])fail(409,'turn-decision-pending');
     const reserved=inspectRoll(root,uid,{code:body.code,revision:body.revision,planId:body.planId});result=applyRoll(game,uid,reserved.dice);
    }else result=chooseTurn(game,uid,checkpoint(root,uid,body.code,body.revision,room),body.kind);
    const revision=body.revision+1,gameJson=JSON.stringify(result.game);if(Buffer.byteLength(gameJson)>262144)fail(409,'game-state-too-large');
    // Compute and validate the complete result before mutating the authoritative root.
    room.state={...room.state,revision,phase:result.game.phase,gameJson};
    if(action==='commit'){const plan=service.rollPlans[body.planId];plan.consumedRevision=revision;plan.consumedAt=now;plan.consumedRequestId=body.requestId;delete service.rollLocks[body.code]}
    if(result.boundary)service.turns[body.code]={version:1,actorUid:uid,revision,sourceHash,gameHash:hash(gameJson),checkpointJson:JSON.stringify({boundary:result.boundary,context:result.context}),at:now};else delete service.turns[body.code];
    outcome={status:200,data:{protocol:2,code:body.code,revision,stage:result.boundary?.kind||result.game.phase}};
   }catch(e){if(e instanceof ServiceError||e instanceof TurnError)outcome={status:e.status,error:e.code};else throw e}
   operations[operationKey]={digest,at:now,result:outcome};return root;
  },undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');if(outcome.error)fail(outcome.status,outcome.error);return outcome.data;
 }
 async function readDecision(token,input){const uid=await identity(token);if(!input||Object.keys(input).sort().join(',')!=='code,revision'||typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code)||!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'invalid-fields');const tx=await acknowledged(db.ref('skylineV2').transaction(v=>v,undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');const root=tx.snapshot.val(),{room}=current(root,uid,input.code,input.revision),pending=checkpoint(root,uid,input.code,input.revision,room);return{protocol:2,code:input.code,revision:input.revision,decision:pending.boundary}}
 return{commitRoll:(token,body)=>execute(token,'commit',body),choose:(token,body)=>execute(token,'choose',body),readDecision};
}
module.exports={createTurnService};
