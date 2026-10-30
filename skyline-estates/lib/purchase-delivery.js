'use strict';
// Native bridges must replay unfinished transactions at launch. No receipt is
// stored in localStorage and no device coins are awarded from store callbacks.
function createPurchaseDelivery({account,verify,delivery,finish}) {
 for(const fn of [account,verify,delivery,finish])if(typeof fn!=='function')throw Error('Purchase delivery dependencies required');
 const running=new Map();
 const fail=code=>{throw Object.assign(Error(code),{code})};
 async function process(transaction) {
  const owner=await account();
  if(!owner?.uid||!owner?.token)fail('purchase-sign-in-required');
  const sameOwner=async()=>{
   const current=await account();
   if(current?.uid!==owner.uid||!current?.token)fail('purchase-account-changed');
   return current.token;
  };
  // The service authenticates the token and resolves store ownership using its
  // own appAccountToken/obfuscatedAccountId mapping; never trust client IDs.
  const result=await verify(owner.token,transaction.proof);
  if(!/^[a-f0-9]{64}$/.test(result?.transactionKey||''))fail('purchase-invalid-response');
  const token=await sameOwner();
  const status=await delivery(token,result.transactionKey);
  await sameOwner();
  if(status?.state==='refunded')return {state:'refunded',finished:false};
  if(status?.state!=='delivered'&&status?.state!=='done')return {state:'pending',finished:false};
  if(status.finishAllowed!==true)return {state:'pending',finished:false};
  await finish(transaction);
  return {state:'delivered',finished:true};
 }
 function deliver(transaction) {
  if(!transaction||!['apple','google'].includes(transaction.store)||typeof transaction.id!=='string'||!transaction.id||transaction.id.length>512||!transaction.proof)return Promise.reject(Object.assign(Error('purchase-invalid-transaction'),{code:'purchase-invalid-transaction'}));
  const key=transaction.store+':'+transaction.id;
  if(running.has(key))return running.get(key);
  const task=process(transaction).finally(()=>running.delete(key));
  running.set(key,task);return task;
 }
 return {deliver,async recover(transactions) {
  if(!Array.isArray(transactions)||transactions.length>100)fail('purchase-invalid-recovery');
  return Promise.allSettled(transactions.map(deliver));
 }};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createPurchaseDelivery};
else globalThis.createSkylinePurchaseDelivery=createPurchaseDelivery;
