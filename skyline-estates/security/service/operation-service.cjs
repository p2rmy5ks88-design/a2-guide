// Resolve a journaled request atomically with its existing command ledger.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier,validateAdmissionRequest}=require('./admission.cjs');
const {validateStartRequest}=require('./start-service.cjs');
const {validateTurnCommand}=require('./turn-service.cjs');
const {validateRollPlanRequest}=require('./roll-plans.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=(status,code)=>{throw new ServiceError(status,code)};
const turns={purchaseAsset:'purchaseAsset',commitRoll:'commit',commitJailRoll:'jailCommit',commitReroll:'rerollCommit',choose:'choose',auctionBid:'bid',debtAction:'debt',endTurn:'end',proposeTrade:'tradePropose',replyTrade:'tradeReply'};
const lobbyActions=new Set(['startGame','selectSeat']);
const reserves=new Set(['reserveRoll','reserveJailRoll','reserveReroll']);
function request(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='action,body,code'||!lobbyActions.has(input.action)&&input.action!=='assetAction'&&!reserves.has(input.action)&&!Object.hasOwn(turns,input.action))fail(400,'invalid-fields');
 const b=input.body;
 if(!b||typeof b!=='object'||Array.isArray(b)||typeof input.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code||'')||b.code!==input.code||typeof b.requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(b.requestId)||!Number.isSafeInteger(b.revision)||b.revision<0||!Number.isSafeInteger(b.revision+1)||Buffer.byteLength(JSON.stringify(input))>8192)fail(400,'invalid-fields');
 let digest,invalid=false;
 try{const body=lobbyActions.has(input.action)?validateStartRequest(input.action,b):input.action==='assetAction'?validateAdmissionRequest('action',b):reserves.has(input.action)?validateRollPlanRequest(b,'reserve'):validateTurnCommand(b,turns[input.action]);digest=hash(JSON.stringify({action:lobbyActions.has(input.action)?'lobby-'+input.action:input.action==='assetAction'?'action':reserves.has(input.action)?input.action:'turn-'+turns[input.action],body}))}
 catch(e){if(!(e instanceof ServiceError)||![400,409,501].includes(e.status))throw e;invalid=true;digest=hash(JSON.stringify({retiredInvalid:input.action,body:b}))}
 return{...input,digest,invalid};
}
function createOperationService({db,verifyIdToken,clock=Date.now,operationLimit=30,timeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function')throw Error('A privileged store and verified authentication are required');
 const identity=identityVerifier(verifyIdToken);
 async function settle(token,input){
  const uid=await identity(token),r=request(input),key=hash(uid),opKey=hash(r.body.requestId),now=clock();let result,timer,tx;
  try{tx=await Promise.race([db.ref('skylineV2').transaction(root=>{
   // Check authority on every retry, including recovery of an earlier acknowledgement.
   const room=root?.rooms?.[r.code];
   if(room?.members?.[uid]!==true||!(lobbyActions.has(r.action)?['lobby','playing','over']:['playing','over']).includes(room.meta?.status)){result={error:'not-authorized',status:403};return root}
   if(room.meta.status==='lobby'){if(!lobbyActions.has(r.action)||room.seats?.[uid]?.uid!==uid||!Number.isInteger(room.seats[uid].seat)||!Number.isSafeInteger(room.state?.revision)){result={error:'not-authorized',status:403};return root}}else{
   let game;try{if(typeof room.state?.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();game=JSON.parse(room.state.gameJson)}catch{result={error:'invalid-game-state',status:409};return root}
   const seat=room.seats?.[uid]?.seat;
   if(!Number.isInteger(seat)||game.players?.[seat]?.uid!==uid||game.players[seat].ai||game.code!==r.code||!Number.isSafeInteger(room.state.revision)||room.state.revision<0){result={error:'not-authorized',status:403};return root}
   }
   const service=root.service||(root.service={}),operations=service.operations||(service.operations={}),ledger=operations[key]||(operations[key]={}),prior=ledger[opKey];
   const ack={protocol:2,code:r.code,revision:room.state.revision,action:r.action,requestId:r.body.requestId};
   if(prior){
    if(prior.digest!==r.digest){result={error:'idempotency-conflict',status:409};return root}
    if(prior.retired?.version===1){result={...ack,resolution:'retired',rejection:{status:409,error:'operation-retired'}};return root}
    const receipt=prior.result;
    if(receipt?.status===200&&receipt.data?.protocol===2&&receipt.data.code===r.code){result={...ack,resolution:'committed',receipt:Object.fromEntries(['protocol','code','revision','planId','stage','offerHash'].filter(k=>Object.hasOwn(receipt.data,k)).map(k=>[k,receipt.data[k]]))};return root}
    if(Number.isInteger(receipt?.status)&&receipt.status>=400&&receipt.status<=599&&typeof receipt.error==='string'){result={...ack,resolution:'rejected',rejection:{status:receipt.status,error:receipt.error}};return root}
    result={error:'invalid-operation-receipt',status:409};return root;
   }
   service.limits=service.limits||{};let budget=service.limits[key];
   if(!budget||now-budget.start>=60000)budget={start:now,count:0};
   if(budget.count>=operationLimit){result={error:'rate-limited',status:429};return root}
   service.limits[key]={...budget,count:budget.count+1};
   // Absence alone is not proof: this retained ledger tombstone fences a delayed original.
   ledger[opKey]={digest:r.digest,at:now,result:{status:409,error:'operation-retired'},retired:{version:1,action:r.action,code:r.code,invalid:r.invalid}};
   result={...ack,resolution:'retired',rejection:{status:409,error:'operation-retired'}};return root;
  },undefined,false),new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))])}
  catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}
  if(!tx.committed||!result)fail(503,'temporarily-unavailable');if(result.error)fail(result.status,result.error);return result;
 }
 return{settle};
}
module.exports={createOperationService};
