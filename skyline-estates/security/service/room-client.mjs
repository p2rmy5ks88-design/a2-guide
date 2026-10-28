// HTTPS admission transport. The durable journal never contains invitation capabilities.
const fail=code=>{throw Object.assign(Error(code),{code})},copy=x=>JSON.parse(JSON.stringify(x));
const codeOk=x=>typeof x==='string'&&/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(x),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function canonical(action,input,requestId){
 const keys={create:['name','settings'],join:['code','invite','name'],leave:['code'],invite:['code']}[action];
 if(!keys||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))fail('invalid-admission');
 const b={requestId};if(action!=='create'){if(!codeOk(input.code))fail('invalid-code');b.code=input.code}
 if(['create','join'].includes(action)){if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>12||/[<>\x00-\x1f\x7f]/.test(input.name))fail('invalid-name');b.name=input.name.trim()}
 if(action==='create'){
  const s=input.settings,booleans=['minigames','perks','ffa','events','speedDie','pot','goDouble','jailRent','auction','even','interest'],allowed=['mode','rounds','city','theme','cash','timer','ai','speed',...booleans];
  if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!allowed.includes(k))||!['classic','quick','timed'].includes(s.mode)||typeof s.city!=='string'||!/^[a-z][a-z0-9_]{1,23}$/.test(s.city)||s.mode==='timed'&&s.rounds==null||Object.hasOwn(s,'cash')&&![1200,1600,2000].includes(s.cash)||Object.hasOwn(s,'timer')&&![0,90].includes(s.timer)||Object.hasOwn(s,'rounds')&&![10,20,30,45].includes(s.rounds)||Object.hasOwn(s,'ai')&&!['easy','normal','hard'].includes(s.ai)||Object.hasOwn(s,'speed')&&!['normal','fast'].includes(s.speed)||Object.hasOwn(s,'theme')&&(typeof s.theme!=='string'||!/^[a-z][a-z0-9_]{1,23}$/.test(s.theme))||booleans.some(k=>Object.hasOwn(s,k)&&typeof s[k]!=='boolean'))fail('invalid-settings');
  b.settings=Object.fromEntries(Object.keys(s).sort().map(k=>[k,s[k]]));
 }
 if(action==='join'){if(!hex(input.invite))fail('invalid-invitation');b.invite=input.invite}return b;
}
export function createRoomClient({baseUrl,allowedOrigins,uid,getSession,storage,fetchImpl=globalThis.fetch,locks=globalThis.navigator?.locks,crypto=globalThis.crypto,timeoutMs=8000,allowLoopback=false}){
 const base=new URL(baseUrl),loopback=allowLoopback&&base.protocol==='http:'&&base.hostname==='127.0.0.1';
 if((base.protocol!=='https:'&&!loopback)||!Array.isArray(allowedOrigins)||!allowedOrigins.includes(base.origin)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)fail('untrusted-service-url');
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||['__proto__','constructor','prototype'].includes(uid)||typeof getSession!=='function'||typeof storage?.getItem!=='function'||typeof storage?.setItem!=='function'||typeof storage?.removeItem!=='function'||typeof fetchImpl!=='function'||typeof crypto?.randomUUID!=='function'||typeof crypto?.subtle?.digest!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail('invalid-client-configuration');
 const key='skyline-v2-admission:'+encodeURIComponent(base.origin)+':'+encodeURIComponent(uid);let closed=false,busy=false;
 const active=()=>{if(closed)fail('session-closed')};
 async function session(){active();const s=await getSession();active();if(s?.uid!==uid||typeof s.idToken!=='string'||!s.idToken)fail('session-changed');return s.idToken}
 function record(){const raw=storage.getItem(key);if(raw===null)return null;if(raw.length>5000)fail('invalid-admission-record');let s;try{s=JSON.parse(raw)}catch{fail('invalid-admission-record')}
  if(!s||Object.keys(s).some(k=>!['version','origin','uid','action','requestId','digest','code','status','resolution','receipt','rejection'].includes(k))||s.version!==1||s.uid!==uid||s.origin!==base.origin||!['create','join','leave','invite'].includes(s.action)||!(/^[A-Za-z0-9_-]{16,64}$/).test(s.requestId||'')||!hex(s.digest)||!['pending','acknowledged'].includes(s.status)||s.action!=='create'&&!codeOk(s.code)||s.action==='create'&&s.code!==undefined)fail('invalid-admission-record');
  if(s.receipt&&(Object.keys(s.receipt).sort().join(',')!=='code,protocol'||s.receipt.protocol!==2||!codeOk(s.receipt.code)))fail('invalid-admission-record');return s;
 }
 function exclusive(fn){active();if(typeof locks?.request!=='function')fail('cross-tab-lock-unavailable');return locks.request(key,{mode:'exclusive'},async()=>{active();if(busy)fail('operation-in-flight');busy=true;try{return await fn()}finally{busy=false}})}
 async function request(route,body,method='POST'){const token=await session(),encoded=body===undefined?undefined:JSON.stringify(body);if(encoded&&new TextEncoder().encode(encoded).length>8192)fail('request-too-large');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{const r=await fetchImpl(new URL('/v2/rooms/'+route,base),{method,redirect:'error',credentials:'omit',cache:'no-store',signal:abort.signal,headers:{Authorization:'Bearer '+token,...(encoded?{'Content-Type':'application/json'}:{})},...(encoded?{body:encoded}:{})});active();let data;try{data=await r.json()}catch{fail('invalid-service-response')}await session();if(!r.ok){const e=Object.assign(Error(typeof data?.error==='string'?data.error:'service-unavailable'),{code:typeof data?.error==='string'?data.error:'service-unavailable',status:r.status});throw e}return data}finally{clearTimeout(timer)}
 }
 function receipt(s,data){if(data?.protocol!==2||!codeOk(data.code)||s.code&&data.code!==s.code||Object.keys(data).some(k=>!['protocol','code','invite'].includes(k))||data.invite!==undefined&&(!['create','invite'].includes(s.action)||!hex(data.invite)))fail('invalid-service-response');return copy(data)}
 function acknowledge(s,result){const safe={...s,status:'acknowledged',resolution:result.resolution,...(result.receipt?{receipt:{protocol:2,code:result.receipt.code}}:{}),...(result.rejection?{rejection:result.rejection}:{})};storage.setItem(key,JSON.stringify(safe))}
 return{
  async mutate(action,input,{track=false}={}){return exclusive(async()=>{if(record())fail('operation-needs-recovery');const requestId=crypto.randomUUID();if(!(/^[A-Za-z0-9_-]{16,64}$/).test(requestId))fail('invalid-request-id');const body=canonical(action,input,requestId),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({action,body}))))).map(b=>b.toString(16).padStart(2,'0')).join('');active();
   const s={version:1,origin:base.origin,uid,action,requestId,digest,...(body.code?{code:body.code}:{}),status:'pending'};storage.setItem(key,JSON.stringify(s));const data=receipt(s,await request(action,body));acknowledge(s,{resolution:'committed',receipt:data});return track?{receipt:data,requestId}:data;
  })},
  async reconcile(expectedRequestId){return exclusive(async()=>{const s=record();if(!s)fail('no-pending-operation');if(expectedRequestId!==undefined&&s.requestId!==expectedRequestId)fail('operation-changed');const data=await request('settle',{action:s.action,requestId:s.requestId,digest:s.digest});if(data?.protocol!==2||data.action!==s.action||data.requestId!==s.requestId||!['committed','rejected','retired'].includes(data.resolution))fail('invalid-service-response');
   const result={resolution:data.resolution};if(data.resolution==='committed')result.receipt=receipt(s,data.receipt);else{const e=data.rejection;if(!Number.isInteger(e?.status)||e.status<400||e.status>599||typeof e.error!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(e.error)||data.resolution==='retired'&&(e.status!==409||e.error!=='operation-retired'))fail('invalid-service-response');result.rejection={status:e.status,error:e.error}}acknowledge(s,result);return copy({requestId:s.requestId,action:s.action,...result});
  })},
  async room(code){active();if(!codeOk(code))fail('invalid-code');const v=await request(code,undefined,'GET');if(v?.protocol!==2||v.code!==code||!Number.isSafeInteger(v.revision)||v.revision<0||!['lobby','playing','over'].includes(v.status)||!Array.isArray(v.seats)||v.seats.length<1||v.seats.length>6)fail('invalid-room-view');return copy(v)},
  pending(){active();return copy(record())},
  async complete(requestId){return exclusive(async()=>{const s=record();if(!s||s.requestId!==requestId||s.status!=='acknowledged')fail('operation-not-acknowledged');await session();storage.removeItem(key)})},
  close(){closed=true}
 };
}
