'use strict';
const {randomUUID}=require('node:crypto');
// Google consumption runs only AFTER the atomic wallet grant. Apple StoreKit
// finish is device-side after a durable receipt; there is no Apple consume API.
function createDeliveryWorker({db,environment,openProof,consume,clock=Date.now,leaseMs=60000,maxAttempts=20}){
 if(!db||!['sandbox','production'].includes(environment)||typeof openProof!=='function'||typeof consume!=='function'||!Number.isSafeInteger(leaseMs)||leaseMs<1000||!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>100)throw Error('Trusted delivery dependencies required');
 const base='skylineWalletV1/'+environment+'/outbox/';
 async function deliver(key){
  if(!/^[a-f0-9]{64}$/.test(key||''))throw Error('Invalid delivery key');
  const ref=db.ref(base+key),lease=randomUUID(),now=clock();let claimed;
  const tx=await ref.transaction(job=>{
   claimed=null;if(!job||!['pending','running'].includes(job.state)||job.nextAt>now)return;
   if(job.attempts>=maxAttempts)return {...job,state:'attention',nextAt:Number.MAX_SAFE_INTEGER};
   claimed={...job,state:'running',attempts:job.attempts+1,lease,nextAt:now+leaseMs};return claimed;
  });
  if(!tx.committed||!claimed)return{state:'not-claimed'};
  let state='done',category=null;
  try{let proof;try{proof=await openProof(claimed.sealedProof)}catch{throw Object.assign(Error('Sealed proof could not be opened'),{permanent:true})};if(proof.environment!==environment||proof.appId!=='com.kenstylez.skylineestates')throw Object.assign(Error('Wrong proof binding'),{permanent:true});const result=await consume(proof);if(result?.completed!==true)throw Error('Unconfirmed store consumption')}
  catch(error){state=error?.permanent||claimed.attempts>=maxAttempts?'attention':'pending';category=error?.permanent?'verification':'retryable'}
  const nextAt=state==='pending'?clock()+Math.min(3600000,1000*2**Math.min(12,claimed.attempts)):Number.MAX_SAFE_INTEGER;
  const settled=await ref.transaction(job=>{
   if(!job||job.lease!==lease||job.state!=='running')return;
   const next={store:'google',state,attempts:job.attempts,nextAt,createdAt:job.createdAt};
   if(state!=='done')next.sealedProof=job.sealedProof;
   if(category)next.lastError=category;return next;
  });
  return{state:settled.committed?state:'superseded'};
 }
 async function run(limit=10){if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('Invalid batch size');const snap=await db.ref(base.slice(0,-1)).orderByChild('nextAt').endAt(clock()).limitToFirst(limit).get();const keys=Object.keys(snap.val()||{});const results=[];for(const key of keys)results.push(await deliver(key));return results}
 return{deliver,run};
}
module.exports={createDeliveryWorker};
