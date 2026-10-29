'use strict';
const {APP,CATALOG}=require('./wallet.cjs');
const fail=code=>{throw Object.assign(new Error(code),{code,permanent:true})};
const validOwner=uid=>typeof uid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(uid);
function createAppleStoreAdapter({verifier,getTransactionInfo,resolveAccountToken,environment}){
 if(!verifier||typeof verifier.verifyAndDecodeTransaction!=='function'||typeof verifier.verifyAndDecodeNotification!=='function'||typeof getTransactionInfo!=='function'||typeof resolveAccountToken!=='function'||!['sandbox','production'].includes(environment))throw Error('Apple signed-data verifier and server ownership map are required');
 const expected=environment==='sandbox'?'Sandbox':'Production';
 async function decode(signed,type){
  if(typeof signed!=='string'||signed.length<20||signed.length>40000)fail('invalid-apple-proof');
  const t=await verifier.verifyAndDecodeTransaction(signed);
  if(t.bundleId!==APP||t.environment!==expected||!Object.hasOwn(CATALOG,t.productId)||t.quantity!==1||typeof t.transactionId!=='string'||!t.transactionId||typeof t.appAccountToken!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t.appAccountToken)||t.type!=='Consumable')fail('invalid-apple-transaction');
  if(type==='purchase'&&t.revocationDate!=null||type==='refund'&&t.revocationDate==null)fail('invalid-apple-purchase-state');
  const ownerUid=await resolveAccountToken(t.appAccountToken);if(!validOwner(ownerUid))fail('unbound-apple-account');
  return{store:'apple',environment,appId:APP,type,transactionId:t.transactionId,productId:t.productId,quantity:1,state:'purchased',ownerUid};
 }
 return{
  verifyPurchase:async proof=>{if(!proof||Object.keys(proof).some(k=>k!=='signedTransaction'))fail('invalid-apple-proof');const original=await decode(proof.signedTransaction,'purchase');
   // A previously valid JWS may predate a refund; query current Apple status.
   const info=await getTransactionInfo(original.transactionId),current=await decode(info?.signedTransactionInfo,'purchase');
   if(current.transactionId!==original.transactionId||current.productId!==original.productId||current.ownerUid!==original.ownerUid)fail('apple-current-transaction-mismatch');
   return current},
  async verifyNotification(signed){
   if(typeof signed!=='string'||signed.length>80000)fail('invalid-apple-notification');
   const n=await verifier.verifyAndDecodeNotification(signed);
   if(n.notificationType!=='REFUND'||n.data?.bundleId!==APP||n.data.environment!==expected)fail('unsupported-apple-notification');
   return decode(n.data.signedTransactionInfo,'refund');
  }
 };
}
function createGooglePlayAdapter({client,resolveAccountId,environment,clock=Date.now}){
 if(typeof client?.request!=='function'||typeof resolveAccountId!=='function'||!['sandbox','production'].includes(environment))throw Error('Authenticated Google API client and ownership map are required');
 const base='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+APP+'/purchases/';
 function input(value){if(!value||!Object.hasOwn(CATALOG,value.productId)||typeof value.purchaseToken!=='string'||!value.purchaseToken||value.purchaseToken.length>4096)fail('invalid-google-proof');return{productId:value.productId,purchaseToken:value.purchaseToken}}
 const endpoint=p=>base+'products/'+encodeURIComponent(p.productId)+'/tokens/'+encodeURIComponent(p.purchaseToken);
 async function state(proof){const p=input(proof);let r;try{r=await client.request({url:endpoint(p),method:'GET'})}catch(error){const status=error?.response?.status;throw Object.assign(Error('google-verification-unavailable'),{permanent:[400,401,403,404,410].includes(status)})}const d=r.data;
  if(!d||d.productId&&d.productId!==p.productId||d.purchaseToken&&d.purchaseToken!==p.purchaseToken||!['0','1'].includes(String(d.consumptionState))||(d.quantity??1)!==1||!Number.isSafeInteger(Number(d.purchaseTimeMillis))||Number(d.purchaseTimeMillis)<=0||Number(d.purchaseTimeMillis)>clock()+300000)fail('invalid-google-purchase');
  if(typeof d.obfuscatedExternalAccountId!=='string'||!/^[A-Za-z0-9_-]{16,64}$/.test(d.obfuscatedExternalAccountId))fail('unbound-google-account');
  if((d.purchaseType===0?'sandbox':'production')!==environment)fail('google-environment-mismatch');
  const ownerUid=await resolveAccountId(d.obfuscatedExternalAccountId);if(!validOwner(ownerUid))fail('unbound-google-account');
  return{p,d,ownerUid};
 }
 function event(s,type){return{store:'google',environment,appId:APP,type,transactionId:s.p.purchaseToken,productId:s.p.productId,ownerUid:s.ownerUid,quantity:1,state:'purchased',purchaseTime:Number(s.d.purchaseTimeMillis),alreadyConsumed:s.d.consumptionState===1}}
 return{
  async verifyPurchase(proof){if(!proof||Object.keys(proof).some(k=>!['productId','purchaseToken'].includes(k)))fail('invalid-google-proof');const s=await state(proof);if(s.d.purchaseState!==0)fail('google-purchase-not-complete');return event(s,'purchase')},
  async verifyCancellation(proof){const s=await state(proof);if(s.d.purchaseState!==1)fail('google-purchase-not-cancelled');return event(s,'refund')},
  async consume(proof){let s=await state(proof);if(s.ownerUid!==proof.ownerUid||proof.environment!==environment||proof.appId!==APP)fail('google-consume-owner-mismatch');if(s.d.purchaseState!==0)fail('google-purchase-not-complete');if(s.d.consumptionState===1)return{completed:true};try{await client.request({url:endpoint(s.p)+':consume',method:'POST',data:{}});return{completed:true}}catch{try{s=await state(proof);if(s.ownerUid===proof.ownerUid&&s.d.purchaseState===0&&s.d.consumptionState===1)return{completed:true}}catch{}throw Error('google-consumption-unconfirmed')}},
  async voidedPage({startTime,pageToken}={}){if(!Number.isSafeInteger(startTime)||startTime<0||startTime>clock())fail('invalid-voided-window');const url=new URL(base+'voidedpurchases');url.searchParams.set('startTime',String(startTime));url.searchParams.set('maxResults','1000');url.searchParams.set('type','0');if(pageToken)url.searchParams.set('token',pageToken);const r=await client.request({url:url.href,method:'GET'});return{purchases:r.data.voidedPurchases||[],nextPageToken:r.data.tokenPagination?.nextPageToken||null}}
 };
}
// Construction is explicit and fails closed; never use a JWS decoder as a verifier.
function createAppleSignedVerifier({library,roots,environment,appAppleId}){
 if(!Array.isArray(roots)||!roots.length||roots.some(x=>!Buffer.isBuffer(x)||!x.length)||!['sandbox','production'].includes(environment)||environment==='production'&&(!Number.isSafeInteger(appAppleId)||appAppleId<=0))throw Error('Apple trust roots, environment and production app ID are required');
 return new library.SignedDataVerifier(roots,true,environment==='sandbox'?library.Environment.SANDBOX:library.Environment.PRODUCTION,APP,appAppleId);
}
module.exports={createAppleStoreAdapter,createGooglePlayAdapter,createAppleSignedVerifier};
