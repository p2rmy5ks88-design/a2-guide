'use strict';
// Server-only foundation. No public route or production adapter is enabled here.
// Store verifiers MUST authenticate with Apple/Google and resolve ownership from
// appAccountToken / obfuscatedAccountId mappings, never client-supplied uid/coins.
const {createHash}=require('node:crypto');
const {createWalletIdentity}=require('./wallet-auth.cjs');
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
function balance(account,delta){
 account.debt||=0;
 if(!Number.isSafeInteger(account.coins)||account.coins<0||!Number.isSafeInteger(account.debt)||account.debt<0||account.coins&&account.debt)fail('wallet-balance-conflict');
 const net=account.coins-account.debt+delta;if(!Number.isSafeInteger(net))fail('wallet-balance-conflict');
 account.coins=Math.max(0,net);account.debt=Math.max(0,-net);
}
function applyEvent(input,event,now){
 const root=copy(input||{});root.transactions||={};root.accounts||={};
 const key=event.transactionKey,old=root.transactions[key];
 if(old&&(old.ownerUid!==event.ownerUid||old.productId!==event.productId))fail('purchase-owner-conflict');
 if(old?.refunded)return {root,result:{duplicate:true,refunded:true}};
 if(old&&event.type==='purchase'){
  if(event.store==='google'&&!root.outbox?.[key]){if(!event.sealedProof)fail('delivery-proof-required');root.outbox||={};root.outbox[key]={store:'google',state:'pending',sealedProof:event.sealedProof,attempts:0,nextAt:now,createdAt:now}}
  return {root,result:{duplicate:true,refunded:false}};
 }
 if(event.type==='purchase'&&event.alreadyConsumed)fail('consumed-purchase-not-recorded');
 const userKey=hash(event.ownerUid),account=root.accounts[userKey]||{uid:event.ownerUid,coins:0,ledger:{}};
 let delta=0;
 if(event.type==='purchase')delta=event.coins;
 else if(old)delta=-old.coins;
 balance(account,delta);
 account.ledger[key+'_'+event.type]={type:event.type,coins:delta,balance:account.coins,debt:account.debt,productId:event.productId,at:now};
 root.accounts[userKey]=account;
 root.transactions[key]={ownerUid:event.ownerUid,productId:event.productId,coins:event.coins,store:event.store,
   environment:event.environment,refunded:event.type==='refund',fulfilled:event.type==='purchase',at:now};
 root.outbox||={};
 if(event.type==='refund'&&root.outbox[key]){const job=root.outbox[key];root.outbox[key]={store:job.store,state:'cancelled',attempts:job.attempts,nextAt:Number.MAX_SAFE_INTEGER}}
 if(event.type==='purchase'&&event.store==='google'){
  if(typeof event.sealedProof!=='string'||!event.sealedProof)fail('delivery-proof-required');
  root.outbox[key]={store:'google',state:'pending',sealedProof:event.sealedProof,attempts:0,nextAt:now,createdAt:now};
 }
 return {root,result:{duplicate:false,refunded:event.type==='refund'}};
}
function validateSpend(input,catalog){
 if(!catalog)fail('wallet-spending-not-configured');
 if(!input||Object.keys(input).some(k=>!['requestId','item'].includes(k))||!/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId||'')||!Object.hasOwn(catalog,input.item))fail('invalid-spend-request');
 const offer={...catalog[input.item]};if(!Number.isSafeInteger(offer.coins)||offer.coins<=0||!Number.isSafeInteger(offer.wins??0)||(offer.wins??0)<0)fail('invalid-server-catalog');
 return{requestId:input.requestId,item:input.item,offer};
}
function applySpend(value,{uid,requestId,item,offer},now){
 const root=copy(value||{}),key=hash(uid),op=hash(requestId),itemKey=hash(item),account=root.accounts?.[key];if(!account)fail('insufficient-coins');
 account.operations||={};const prior=account.operations[op];if(prior){if(prior.item!==item)fail('idempotency-conflict');return{root,result:prior.result}}
 account.owned||={};const owned=account.owned[itemKey]===true;
 if(!owned){if(account.debt>0)fail('refund-deficit');if(account.coins<offer.coins)fail('insufficient-coins');if((account.wins||0)<(offer.wins||0))fail('wins-required');balance(account,-offer.coins);account.owned[itemKey]=true;account.ledger['spend_'+op]={type:'spend',coins:-offer.coins,balance:account.coins,debt:account.debt,item,at:now}}
 const result={owned:true,item,alreadyOwned:owned};account.operations[op]={item,result};return{root,result};
}
function createWalletService({db,verifyIdToken,verifyPurchase,verifyNotification,environment,clock=Date.now,sealProof=null,spendCatalog=null}){
 if(environment==='production')throw Error('The shared-root wallet is a legacy sandbox prototype; use the scoped Firestore wallet');
 if(!db||typeof verifyIdToken!=='function'||typeof verifyPurchase!=='function'||typeof verifyNotification!=='function'||!['sandbox','production'].includes(environment))throw Error('Trusted wallet dependencies and an explicit environment are required');
 const identity=createWalletIdentity(verifyIdToken);
 async function commit(event){
  let result,rejection;const at=clock();
  const tx=await db.ref('skylineWalletV1/'+environment).transaction(root=>{
   result=null;rejection=null;
   try{const applied=applyEvent(root,event,at);result=applied.result;return applied.root}
   catch(error){if(!error.code)throw error;rejection=error;return root}
  });
  if(!tx.committed)fail('wallet-unavailable');if(rejection)throw rejection;
  return {...result,transactionKey:event.transactionKey,finishAllowed:!result.refunded&&event.type==='purchase'&&event.store==='apple'};
 }
 return {
  async purchase(token,proof){
   const uid=await identity(token),verified=await verifyPurchase(proof),event=normalize(verified,environment);
   if(verified.alreadyConsumed===true)event.alreadyConsumed=true;
   if(event.store==='google'){
    if(typeof sealProof!=='function')fail('delivery-not-configured');
    event.sealedProof=await sealProof({purchaseToken:verified.transactionId,appId:APP,productId:verified.productId,ownerUid:verified.ownerUid,environment});
   }
   if(event.type!=='purchase'||event.ownerUid!==uid)fail('purchase-owner-conflict');
   return commit(event);
  },
  async notification(signedPayload){
   const event=normalize(await verifyNotification(signedPayload),environment);
   if(event.type!=='refund')fail('unsupported-notification');
   return commit(event);
  },
  async delivery(token,key){
   const uid=await identity(token);if(!/^[a-f0-9]{64}$/.test(key||''))fail('invalid-delivery-reference');
   const purchase=(await db.ref('skylineWalletV1/'+environment+'/transactions/'+key).get()).val();
   if(!purchase||purchase.ownerUid!==uid)fail('purchase-not-found');
   if(purchase.refunded)return{state:'refunded',finishAllowed:false};
   if(purchase.store==='apple')return{state:'delivered',finishAllowed:true};
   const job=(await db.ref('skylineWalletV1/'+environment+'/outbox/'+key).get()).val();
   return{state:job?.state||'attention',finishAllowed:job?.state==='done'};
  },
  async spend(token,input){
   const uid=await identity(token),command={uid,...validateSpend(input,spendCatalog)},at=clock();let outcome,rejection;
   const tx=await db.ref('skylineWalletV1/'+environment).transaction(value=>{
    outcome=null;rejection=null;
    try{const applied=applySpend(value,command,at);outcome=applied.result;return applied.root}
    catch(error){if(!error.code)throw error;rejection=error;return value}
   });if(!tx.committed)fail('wallet-unavailable');if(rejection)throw rejection;return outcome;
  },
  async history(token){
   const uid=await identity(token),snap=await db.ref('skylineWalletV1/'+environment+'/accounts/'+hash(uid)).get(),account=snap.val();
   return {coins:account?.coins||0,debt:account?.debt||0,entries:Object.values(account?.ledger||{}).sort((a,b)=>b.at-a.at).slice(0,50)};
  }
 };
}
module.exports={createWalletService,applyEvent,applySpend,validateSpend,normalize,CATALOG,APP};
