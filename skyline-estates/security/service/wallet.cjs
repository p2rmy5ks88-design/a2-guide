'use strict';
// Server-only foundation. No public route or production adapter is enabled here.
// Store verifiers MUST authenticate with Apple/Google and resolve ownership from
// appAccountToken / obfuscatedAccountId mappings, never client-supplied uid/coins.
const {createHash}=require('node:crypto');
const {identityVerifier}=require('./admission.cjs');
const APP='com.kenstylez.skylineestates';
const CATALOG=Object.freeze(Object.fromEntries([
 ['coins_500',500],['coins_1200',1200],['coins_3000',3000],['coins_7000',7000]
].map(([id,coins])=>[APP+'.'+id,coins])));
const hash=x=>createHash('sha256').update(x).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
function fail(code){throw Object.assign(new Error(code),{code})}
function normalize(event,environment){
 if(!event||!['apple','google'].includes(event.store)||event.environment!==environment||event.appId!==APP||
    !['purchase','refund'].includes(event.type)||typeof event.transactionId!=='string'||!event.transactionId||event.transactionId.length>4096||
    !/^[A-Za-z0-9_-]{1,128}$/.test(event.ownerUid||'')||!Object.hasOwn(CATALOG,event.productId)||
    event.quantity!==1||event.state!=='purchased')fail('invalid-verified-event');
 return {store:event.store,environment,transactionKey:hash(JSON.stringify([event.store,environment,event.transactionId])),
  ownerUid:event.ownerUid,productId:event.productId,type:event.type,coins:CATALOG[event.productId]};
}
// Pure reducer invoked inside ONE privileged database transaction. Retried by
// Firebase without additional external calls. The global key prevents account replay.
function applyEvent(input,event,now){
 const root=copy(input||{});root.transactions||={};root.accounts||={};
 const key=event.transactionKey,old=root.transactions[key];
 if(old&&(old.ownerUid!==event.ownerUid||old.productId!==event.productId))fail('purchase-owner-conflict');
 if(old?.refunded||old&&event.type==='purchase')return {root,result:{duplicate:true,refunded:!!old.refunded}};
 const userKey=hash(event.ownerUid),account=root.accounts[userKey]||{uid:event.ownerUid,coins:0,ledger:{}};
 let delta=0;
 if(event.type==='purchase')delta=event.coins;
 else if(old)delta=-old.coins;
 const next=account.coins+delta;if(!Number.isSafeInteger(next)||next<0)fail('wallet-balance-conflict');
 account.coins=next;
 account.ledger[key+'_'+event.type]={type:event.type,coins:delta,productId:event.productId,at:now};
 root.accounts[userKey]=account;
 root.transactions[key]={ownerUid:event.ownerUid,productId:event.productId,coins:event.coins,store:event.store,
   environment:event.environment,refunded:event.type==='refund',fulfilled:event.type==='purchase',at:now};
 return {root,result:{duplicate:false,refunded:event.type==='refund'}};
}
function createWalletService({db,verifyIdToken,verifyPurchase,verifyNotification,environment,clock=Date.now}){
 if(!db||typeof verifyIdToken!=='function'||typeof verifyPurchase!=='function'||typeof verifyNotification!=='function'||!['sandbox','production'].includes(environment))throw Error('Trusted wallet dependencies and an explicit environment are required');
 const authenticate=identityVerifier(verifyIdToken);
 async function identity(token){
  // Anonymous room identities cannot claim a persistent paid wallet.
  const uid=await authenticate(token),user=await verifyIdToken(token,true);
  if(user.uid!==uid||!['apple.com','google.com','password'].includes(user.firebase?.sign_in_provider)||user.firebase.sign_in_provider==='password'&&user.email_verified!==true)fail('persistent-account-required');
  return uid;
 }
 async function commit(event){
  let result;const at=clock();
  const tx=await db.ref('skylineWalletV1/'+environment).transaction(root=>{const applied=applyEvent(root,event,at);result=applied.result;return applied.root});
  if(!tx.committed)fail('wallet-unavailable');
  return result;
 }
 return {
  async purchase(token,proof){
   const uid=await identity(token),event=normalize(await verifyPurchase(proof),environment);
   if(event.type!=='purchase'||event.ownerUid!==uid)fail('purchase-owner-conflict');
   return commit(event);
  },
  async notification(signedPayload){
   const event=normalize(await verifyNotification(signedPayload),environment);
   if(event.type!=='refund')fail('unsupported-notification');
   return commit(event);
  },
  async history(token){
   const uid=await identity(token),snap=await db.ref('skylineWalletV1/'+environment+'/accounts/'+hash(uid)).get(),account=snap.val();
   return {coins:account?.coins||0,entries:Object.values(account?.ledger||{}).sort((a,b)=>b.at-a.at).slice(0,50)};
  }
 };
}
module.exports={createWalletService,applyEvent,normalize,CATALOG,APP};
