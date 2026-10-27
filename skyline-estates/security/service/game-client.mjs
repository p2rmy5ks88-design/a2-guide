// Browser transport for the trusted service. Not enabled in the shipped game yet.
const routes={
 startGame:'start',selectSeat:'seat',
 assetAction:'asset',purchaseAsset:'purchase-assets',
 reserveRoll:'roll/reserve',commitRoll:'roll/commit',reserveJailRoll:'jail-roll/reserve',commitJailRoll:'jail-roll/commit',
 reserveReroll:'reroll/reserve',commitReroll:'reroll/commit',choose:'choice',auctionBid:'auction-bid',debtAction:'debt',endTurn:'end',
 proposeTrade:'trade/propose',replyTrade:'trade/reply'
};
const reads={readLobby:'lobby',readGame:'read',readDecision:'decision',readResult:'result',loadRoll:'roll/load',recoverRoll:'roll/recover',
 loadJailRoll:'jail-roll/load',recoverJailRoll:'jail-roll/recover',loadReroll:'reroll/load',recoverReroll:'reroll/recover'};
const error=code=>Object.assign(Error(code),{code});
export function createGameClient({baseUrl,allowedOrigins,uid,getSession,storage,fetchImpl=globalThis.fetch,randomId=()=>globalThis.crypto.randomUUID(),timeoutMs=8000,allowLoopback=false,locks=globalThis.navigator?.locks}){
 const base=new URL(baseUrl),loopback=allowLoopback&&base.protocol==='http:'&&base.hostname==='127.0.0.1';
 if((base.protocol!=='https:'&&!loopback)||!Array.isArray(allowedOrigins)||!allowedOrigins.includes(base.origin)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw error('untrusted-service-url');
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||typeof getSession!=='function'||typeof storage?.getItem!=='function'||typeof storage?.setItem!=='function'||typeof storage?.removeItem!=='function'||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw error('invalid-client-configuration');
 const key='skyline-v2-operation:'+encodeURIComponent(base.origin)+':'+encodeURIComponent(uid);let closed=false,inFlight=false;
 function active(){if(closed)throw error('session-closed')}
 function record(){const raw=storage.getItem(key);if(raw===null)return null;if(raw.length>20000)throw error('invalid-operation-record');let saved;try{saved=JSON.parse(raw)}catch{throw error('invalid-operation-record')}
  if(saved?.version!==1||saved.uid!==uid||saved.origin!==base.origin||!Object.hasOwn(routes,saved.action)||!saved.body||typeof saved.body!=='object'||Array.isArray(saved.body)||!/^[A-Za-z0-9_-]{16,64}$/.test(saved.body.requestId||'')||!['pending','acknowledged'].includes(saved.status))throw error('invalid-operation-record');return saved;
 }
 const copy=value=>JSON.parse(JSON.stringify(value));
 function exclusive(fn){active();if(typeof locks?.request!=='function')throw error('cross-tab-lock-unavailable');return locks.request(key,{mode:'exclusive'},()=>{active();return fn()})}
 async function session(){active();const current=await getSession();active();if(current?.uid!==uid||typeof current?.idToken!=='string'||!current.idToken)throw error('session-changed');return current.idToken}
 async function request(route,body){
  const encoded=JSON.stringify(body);if(typeof encoded!=='string'||new TextEncoder().encode(encoded).length>8192)throw error('request-too-large');
  const token=await session(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(new URL('/v2/game/'+route,base),{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:encoded});
   active();let data;try{data=await response.json()}catch{throw error('invalid-service-response')}active();
   if(!response.ok){const e=error(typeof data?.error==='string'?data.error:'service-unavailable');e.status=response.status;throw e}
   if(data?.protocol!==2||data.code!==body.code||!Number.isSafeInteger(data.revision)||data.revision<0)throw error('invalid-service-response');
   await session();return data;
  }finally{clearTimeout(timer)}
 }
 function checkedReceipt(saved,data){const reservation=saved.action.startsWith('reserve');if(data?.protocol!==2||data.code!==saved.body.code||data.revision!==saved.body.revision+(reservation?0:1)||reservation&&(typeof data.planId!=='string'||!/^[a-f0-9]{64}$/.test(data.planId)))throw error('invalid-service-response');return Object.fromEntries(['protocol','code','revision','planId','stage','offerHash'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]))}
 async function send(saved){
  if(inFlight)throw error('operation-in-flight');inFlight=true;
  try{
   const data=await request(routes[saved.action],saved.body);

   // Only a receipt is durable. Never cache private dice, decks or game state here.
   const receipt=checkedReceipt(saved,data);
   storage.setItem(key,JSON.stringify({...saved,status:'acknowledged',receipt}));return copy(receipt);
  }finally{inFlight=false}
 }
 return{
  async read(action,body){active();if(!Object.hasOwn(reads,action))throw error('unsupported-read');return request(reads[action],copy(body))},
  async mutate(action,body,{track=false}={}){
   active();if(inFlight)throw error('operation-in-flight');return exclusive(async()=>{
   active();if(!Object.hasOwn(routes,action)||!body||typeof body!=='object'||Array.isArray(body)||Object.hasOwn(body,'requestId')||typeof body.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(body.code||'')||!Number.isSafeInteger(body.revision)||body.revision<0||!Number.isSafeInteger(body.revision+1))throw error('invalid-operation');
   if(inFlight)throw error('operation-in-flight');if(record())throw error('operation-needs-recovery');
   const requestId=randomId();if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(requestId))throw error('invalid-request-id');
   const saved={version:1,origin:base.origin,uid,action,body:copy({...body,requestId}),status:'pending'};
   // Persistence is required before any authentication or network attempt.
   const serialized=JSON.stringify(saved);if(serialized.length>20000||new TextEncoder().encode(JSON.stringify(saved.body)).length>8192)throw error('request-too-large');
   storage.setItem(key,serialized);const receipt=await send(saved);return track?{receipt,requestId}:receipt;
   });
  },
  async retry(){active();if(inFlight)throw error('operation-in-flight');return exclusive(async()=>{const saved=record();if(!saved)throw error('no-pending-operation');
   // Reauthenticate/replay even if an earlier receipt is saved; it is not current authority.
   return send(saved);});
  },
  async reconcile(expectedRequestId){active();if(inFlight)throw error('operation-in-flight');return exclusive(async()=>{
   const saved=record();if(!saved)throw error('no-pending-operation');if(expectedRequestId!==undefined&&saved.body.requestId!==expectedRequestId)throw error('operation-changed');inFlight=true;
   try{const data=await request('operation/settle',{code:saved.body.code,action:saved.action,body:saved.body});
    if(data.requestId!==saved.body.requestId||data.action!==saved.action||!['committed','rejected','retired'].includes(data.resolution))throw error('invalid-service-response');
    let receipt,rejection;if(data.resolution==='committed')receipt=checkedReceipt(saved,data.receipt);else{const e=data.rejection;if(!Number.isInteger(e?.status)||e.status<400||e.status>599||typeof e.error!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(e.error)||data.resolution==='retired'&&(e.status!==409||e.error!=='operation-retired'))throw error('invalid-service-response');rejection={status:e.status,error:e.error}}
    const resolution={resolution:data.resolution,...(receipt?{receipt}:{}),...(rejection?{rejection}:{})};storage.setItem(key,JSON.stringify({...saved,status:'acknowledged',...resolution}));return copy({requestId:saved.body.requestId,action:saved.action,code:saved.body.code,...resolution});
   }finally{inFlight=false}
  })},
  pending(){active();const saved=record();return saved?copy({action:saved.action,body:saved.body,status:saved.status,receipt:saved.receipt,resolution:saved.resolution,rejection:saved.rejection}):null},
  async complete(requestId){active();if(inFlight)throw error('operation-in-flight');return exclusive(()=>{const saved=record();if(!saved||saved.body.requestId!==requestId||saved.status!=='acknowledged')throw error('operation-not-acknowledged');storage.removeItem(key)})},
  close(){closed=true}
 };
}
