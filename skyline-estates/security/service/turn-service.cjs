// Internal only: commit an existing private roll, then checkpoint required choices.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier}=require('./admission.cjs');
const {inspectRoll,inspectJailRoll}=require('./roll-plans.cjs');
const {applyRoll,chooseTurn,applyJailChoice,applyJailRoll,jailView,TurnError,sourceHash}=require('./turn-kernel.cjs');
const {endTurn,EndError}=require('./end-kernel.cjs');
const {entropyWords,boundedTape,EntropyError}=require('./entropy-tape.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=(status,code)=>{throw new ServiceError(status,code)};
function validate(input,action){const keys=['requestId','code','revision',...((action==='commit'||action==='jailCommit')?['planId']:action==='choose'?['kind']:[])];if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))fail(400,'invalid-fields');if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId))fail(400,'invalid-request-id');if(typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code))fail(400,'invalid-code');if(!Number.isSafeInteger(input.revision)||input.revision<0||!Number.isSafeInteger(input.revision+1))fail(400,'invalid-revision');if((action==='commit'||action==='jailCommit')&&(typeof input.planId!=='string'||!/^[a-f0-9]{64}$/.test(input.planId)))fail(400,'invalid-plan-id');if(action==='choose'&&!['buy','decline','keep','payBail','useBailPass','drawCard'].includes(input.kind))fail(501,'unsupported-turn-choice');return Object.fromEntries(keys.map(k=>[k,input[k]]))}
function current(root,uid,code,revision){const room=root?.rooms?.[code];if(!room||room.meta?.status!=='playing'||room.members?.[uid]!==true)fail(403,'not-authorized');if(room.state?.revision!==revision)fail(409,'stale-revision');let game;try{if(typeof room.state.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();game=JSON.parse(room.state.gameJson)}catch{fail(409,'invalid-game-state')}if(game?.code!==code)fail(409,'invalid-game-state');if(room.seats?.[uid]?.seat!==game.turn||game.players?.[game.turn]?.uid!==uid)fail(409,'not-your-turn');return{room,game}}
function checkpoint(root,uid,code,revision,room){const saved=root.service?.turns?.[code];if(!saved||saved.version!==1||saved.actorUid!==uid||saved.revision!==revision||saved.gameHash!==hash(room.state.gameJson)||saved.sourceHash!==sourceHash)fail(409,'invalid-turn-checkpoint');let pending;try{pending=JSON.parse(saved.checkpointJson);if(!pending.boundary||!pending.context)throw Error()}catch{fail(409,'invalid-turn-checkpoint')}return pending}
function createTurnService({db,verifyIdToken,clock=Date.now,operationLimit=30,timeoutMs=3000,randomBytes=crypto.randomBytes}){
 if(!db||typeof verifyIdToken!=='function')throw Error('A privileged store and verified authentication are required');const identity=identityVerifier(verifyIdToken);
 async function acknowledged(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))])}catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}}
 async function execute(token,action,input){const uid=await identity(token),body=validate(input,action),key=hash(uid),operationKey=hash(body.requestId),digest=hash(JSON.stringify({action:'turn-'+action,body})),now=clock();let outcome,words=[];
  if(action==='end'){
   const probe=await acknowledged(db.ref('skylineV2').transaction(v=>v,undefined,false));if(!probe.committed)fail(503,'temporarily-unavailable');const root=probe.snapshot.val(),prior=root?.service?.operations?.[key]?.[operationKey];
   if(prior){if(prior.digest!==digest)fail(409,'idempotency-conflict');if(prior.result.error)fail(prior.result.status,prior.result.error);return prior.result.data}
   // Preview only determines whether entropy is required; it never commits or exposes an outcome.
   let needed=false;try{const {game}=current(root,uid,body.code,body.revision);if(!root.service?.turns?.[body.code])endTurn(game,uid,{draw:()=>{needed=true;return 0}})}catch(e){if(!(e instanceof ServiceError||e instanceof EndError))throw e}
   if(needed){try{words=entropyWords(randomBytes)}catch(e){if(e instanceof EntropyError)fail(e.status,e.code);throw e}}
  }
  const tx=await acknowledged(db.ref('skylineV2').transaction(root=>{root=root||{};root.service=root.service||{};const service=root.service;service.operations=service.operations||{};service.limits=service.limits||{};service.turns=service.turns||{};service.endTurns=service.endTurns||{};service.results=service.results||{};const operations=service.operations[key]||(service.operations[key]={}),prior=operations[operationKey];if(prior){outcome=prior.digest===digest?prior.result:{status:409,error:'idempotency-conflict'};return root}let limit=service.limits[key];if(!limit||now-limit.start>=60000)limit={start:now,count:0};if(limit.count>=operationLimit){outcome={status:429,error:'rate-limited'};return root}limit.count++;service.limits[key]=limit;
   try{
    const {room,game}=current(root,uid,body.code,body.revision);let result;
    if(action==='commit'){
     if(service.turns[body.code])fail(409,'turn-decision-pending');
     const reserved=inspectRoll(root,uid,{code:body.code,revision:body.revision,planId:body.planId});result=applyRoll(game,uid,reserved.dice);
    }else if(action==='jailCommit'){
     const pending=checkpoint(root,uid,body.code,body.revision,room);if(pending.boundary.kind!=='jail')fail(409,'invalid-jail-checkpoint');const reserved=inspectJailRoll(root,uid,{code:body.code,revision:body.revision,planId:body.planId});result=applyJailRoll(game,uid,reserved.dice);
    }else if(action==='choose'){
     const pending=checkpoint(root,uid,body.code,body.revision,room);
     if(pending.boundary.kind==='jail'){const slot=hash(JSON.stringify([body.code,body.revision]));if(service.rollLocks?.[body.code]||service.rollPlans?.[slot])fail(409,'jail-roll-pending');result=applyJailChoice(game,uid,body.kind)}else result=chooseTurn(game,uid,pending,body.kind);
    }
    else{
     const slot=hash(JSON.stringify([body.code,body.revision]));if(service.endTurns[slot])fail(409,'turn-already-ended');if(service.turns[body.code])fail(409,'turn-decision-pending');if(service.rollLocks?.[body.code]||service.rollPlans?.[slot])fail(409,'roll-pending');
     result=endTurn(game,uid,{draw:boundedTape(words)});
    }
    const revision=body.revision+1,gameJson=JSON.stringify(result.game);if(Buffer.byteLength(gameJson)>262144)fail(409,'game-state-too-large');
    // Compute and validate the complete result before mutating the authoritative root.
    const beforeHash=hash(room.state.gameJson),afterHash=hash(gameJson);
    room.state={...room.state,revision,phase:result.game.phase,gameJson};
    if(action==='commit'||action==='jailCommit'){const plan=service.rollPlans[body.planId];plan.consumedRevision=revision;plan.consumedAt=now;plan.consumedRequestId=body.requestId;delete service.rollLocks[body.code]}
    if(action==='end'){service.endTurns[hash(JSON.stringify([body.code,body.revision]))]={version:1,code:body.code,actorUid:uid,fromRevision:body.revision,toRevision:revision,requestId:body.requestId,sourceHash,beforeHash,afterHash,drawsJson:JSON.stringify(result.draws),at:now};if(result.result){room.meta.status='over';service.results[body.code]={version:1,revision,sourceHash,gameHash:afterHash,summaryJson:JSON.stringify(result.result),at:now}}}
    if(result.boundary)service.turns[body.code]={version:1,actorUid:result.game.players[result.game.turn].uid||'',revision,sourceHash,gameHash:hash(gameJson),checkpointJson:JSON.stringify({boundary:result.boundary,context:result.context}),at:now};else delete service.turns[body.code];
    outcome={status:200,data:{protocol:2,code:body.code,revision,stage:result.result?'over':result.boundary?.kind||result.game.phase}};
   }catch(e){if(e instanceof ServiceError||e instanceof TurnError||e instanceof EndError)outcome={status:e.status,error:e.code};else throw e}
   operations[operationKey]={digest,at:now,result:outcome};return root;
  },undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');if(outcome.error)fail(outcome.status,outcome.error);return outcome.data;
 }
 async function readDecision(token,input){const uid=await identity(token);if(!input||Object.keys(input).sort().join(',')!=='code,revision'||typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code)||!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'invalid-fields');const tx=await acknowledged(db.ref('skylineV2').transaction(v=>v,undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');const root=tx.snapshot.val(),{room,game}=current(root,uid,input.code,input.revision),pending=checkpoint(root,uid,input.code,input.revision,room);return{protocol:2,code:input.code,revision:input.revision,decision:pending.boundary.kind==='jail'?jailView(game,uid):pending.boundary}}
 async function readResult(token,input){const uid=await identity(token);if(!input||Object.keys(input).sort().join(',')!=='code,revision'||typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code)||!Number.isSafeInteger(input.revision))fail(400,'invalid-fields');const tx=await acknowledged(db.ref('skylineV2').transaction(v=>v,undefined,false));if(!tx.committed)fail(503,'temporarily-unavailable');const root=tx.snapshot.val(),room=root?.rooms?.[input.code];if(room?.members?.[uid]!==true)fail(403,'not-authorized');if(room.meta?.status!=='over'||room.state?.revision!==input.revision)fail(409,'result-not-ready');const saved=root.service?.results?.[input.code];if(!saved||saved.version!==1||saved.revision!==input.revision||saved.sourceHash!==sourceHash||saved.gameHash!==hash(room.state.gameJson))fail(409,'invalid-result');let result;try{result=JSON.parse(saved.summaryJson);if(!Array.isArray(result.standings))throw Error()}catch{fail(409,'invalid-result')}return{protocol:2,code:input.code,revision:input.revision,result}}
 return{commitJailRoll:(token,body)=>execute(token,'jailCommit',body),endTurn:(token,body)=>execute(token,'end',body),readResult,commitRoll:(token,body)=>execute(token,'commit',body),choose:(token,body)=>execute(token,'choose',body),readDecision};
}
module.exports={createTurnService};
