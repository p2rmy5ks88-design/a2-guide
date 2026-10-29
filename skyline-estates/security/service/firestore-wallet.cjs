'use strict';
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {applyEvent,applySpend,validateSpend,normalize,APP}=require('./wallet.cjs');
const {createWalletIdentity}=require('./wallet-auth.cjs');
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code})};
const copy=x=>x==null?null:structuredClone(x);
const clean=account=>{const value={...account};delete value.ledger;delete value.operations;return value};
function createFirestoreWallet({db,verifyIdToken,verifyPurchase,verifyNotification,sealProof,environment,spendCatalog=null,clock=Date.now,storeEnvironments=[environment]}){
 if(!db||typeof db.runTransaction!=='function'||typeof verifyPurchase!=='function'||typeof verifyNotification!=='function'||!['sandbox','production'].includes(environment))throw Error('Trusted Firestore wallet dependencies required');
 const identity=createWalletIdentity(verifyIdToken),base='skylineWallets/'+environment;
 // App Review and TestFlight buy in Apple's Sandbox even against the production
 // service. A production deployment may explicitly accept those; the store
 // environment stays part of the transaction key and the ledger.
 if(!Array.isArray(storeEnvironments)||!storeEnvironments.includes(environment)||storeEnvironments.some(e=>!['sandbox','production'].includes(e))||environment==='sandbox'&&storeEnvironments.includes('production'))throw Error('Invalid store environment policy');
 const storeEnv=v=>storeEnvironments.includes(v?.environment)?v.environment:environment;
 const accountRef=uid=>db.doc(base+'/accounts/'+hash(uid));
 function ledger(tx,ref,entries){for(const [key,value] of Object.entries(entries||{}))tx.create(ref.collection('ledger').doc(key),{...value,expireAt:new Date((value.at||clock())+730*864e5)})}
 async function commit(event){
  const ref=accountRef(event.ownerUid),p=db.doc(base+'/purchases/'+event.transactionKey),j=db.doc(base+'/deliveries/'+event.transactionKey),at=clock();
  return db.runTransaction(async tx=>{
   const [ps,as,js]=await tx.getAll(p,ref,j),account=as.exists?{...as.data(),ledger:{},operations:{}}:null;
   if(account?.status==='deleted'&&event.type==='purchase')fail('account-removed');
   const value={transactions:ps.exists?{[event.transactionKey]:ps.data()}:{},accounts:account?{[hash(event.ownerUid)]:account}:{},outbox:js.exists?{[event.transactionKey]:js.data()}:{}};
   const applied=applyEvent(value,event,at),next=applied.root.accounts[hash(event.ownerUid)],purchase=applied.root.transactions[event.transactionKey],job=applied.root.outbox?.[event.transactionKey];
   if(next&&(!as.exists||!isDeepStrictEqual(clean(next),as.data())))tx.set(ref,{...clean(next),rev:(as.data()?.rev||0)+1,updatedAt:at});
   ledger(tx,ref,next?.ledger);
   if(purchase&&(!ps.exists||!isDeepStrictEqual(purchase,ps.data())))tx.set(p,purchase);
   if(job&&(!js.exists||!isDeepStrictEqual(job,js.data())))tx.set(j,job);
   return{...applied.result,transactionKey:event.transactionKey,finishAllowed:!applied.result.refunded&&event.type==='purchase'&&event.store==='apple'};
  });
 }
 return{
  async purchase(token,proof){const uid=await identity(token),verified=await verifyPurchase(proof),event=normalize(verified,storeEnv(verified));if(event.type!=='purchase'||event.ownerUid!==uid)fail('purchase-owner-conflict');if(verified.alreadyConsumed===true)event.alreadyConsumed=true;if(event.store==='google'){if(typeof sealProof!=='function')fail('delivery-not-configured');event.sealedProof=await sealProof({purchaseToken:verified.transactionId,appId:APP,productId:event.productId,ownerUid:uid,environment})}return commit(event)},
  async notification(payload){const verified=await verifyNotification(payload),event=normalize(verified,storeEnv(verified));if(event.type!=='refund')fail('unsupported-notification');return commit(event)},
  async spend(token,input){const uid=await identity(token),command={uid,...validateSpend(input,spendCatalog)},ref=accountRef(uid),op=ref.collection('operations').doc(hash(command.requestId)),at=clock();
   return db.runTransaction(async tx=>{const [as,os]=await tx.getAll(ref,op);if(as.data()?.status==='deleted')fail('account-removed');const account=as.exists?{...as.data(),ledger:{},operations:os.exists?{[hash(command.requestId)]:os.data()}:{}}:null;
    const applied=applySpend({accounts:account?{[hash(uid)]:account}:{}},command,at),next=applied.root.accounts[hash(uid)];
    if(!os.exists){tx.set(ref,{...clean(next),rev:(as.data()?.rev||0)+1,updatedAt:at});tx.create(op,next.operations[hash(command.requestId)]);ledger(tx,ref,next.ledger)}return applied.result;
   });
  },
  async history(token,{cursor=null,limit=50}={}){const uid=await identity(token);if(!Number.isSafeInteger(limit)||limit<1||limit>50)fail('invalid-history-limit');const ref=accountRef(uid),account=(await ref.get()).data();if(account?.status==='deleted')fail('account-removed');let query=ref.collection('ledger').orderBy('at','desc').orderBy('__name__','desc').limit(limit+1);
   if(cursor){if(typeof cursor!=='string'||cursor.length>300)fail('invalid-history-cursor');let value;try{value=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'))}catch{fail('invalid-history-cursor')}if(!Number.isSafeInteger(value.at)||typeof value.id!=='string'||!/^[a-z0-9_]{1,140}$/.test(value.id))fail('invalid-history-cursor');query=query.startAfter(value.at,value.id)}
   const rows=(await query.get()).docs,shown=rows.slice(0,limit),last=shown.at(-1);return{coins:account?.coins||0,debt:account?.debt||0,entries:shown.map(d=>{const{expireAt,...row}=d.data();return{id:d.id,...row}}),cursor:rows.length>limit&&last?Buffer.from(JSON.stringify({at:last.data().at,id:last.id})).toString('base64url'):null};
  },
  async delivery(token,key){const uid=await identity(token);if(!/^[a-f0-9]{64}$/.test(key||''))fail('invalid-delivery-reference');const p=(await db.doc(base+'/purchases/'+key).get()).data();if(!p||p.ownerUid!==uid)fail('purchase-not-found');if(p.refunded)return{state:'refunded',finishAllowed:false};if(p.store==='apple')return{state:'delivered',finishAllowed:true};const j=(await db.doc(base+'/deliveries/'+key).get()).data();return{state:j?.state||'attention',finishAllowed:j?.state==='done'}}
 };
}
// Narrow adapter lets the same leased worker transact individual delivery docs.
function firestoreDeliveryStore(db,environment){
 if(!['sandbox','production'].includes(environment))throw Error('Explicit delivery environment required');
 const prefix='skylineWalletV1/'+environment+'/outbox',base='skylineWallets/'+environment+'/deliveries';
 return{ref(path){if(!path.startsWith(prefix)||path!==prefix&&!new RegExp('^'+prefix+'/[a-f0-9]{64}$').test(path))throw Error('Unsupported delivery path');const key=path.slice(prefix.length+1);
  if(key){const ref=db.doc(base+'/'+key);return{async transaction(update){return db.runTransaction(async tx=>{const snap=await tx.get(ref),next=update(snap.exists?copy(snap.data()):null);if(next===undefined)return{committed:false};if(next===null)tx.delete(ref);else if(!snap.exists||!isDeepStrictEqual(next,snap.data()))tx.set(ref,next);return{committed:true,snapshot:{val:()=>copy(next)}}})}}}
  let field,end,limit;const query={orderByChild(value){if(value!=='nextAt')throw Error('Unsupported delivery index');field=value;return query},endAt(value){end=value;return query},limitToFirst(value){limit=value;return query},async get(){if(field!=='nextAt'||!Number.isSafeInteger(end)||!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('Bounded delivery query required');const rows=await db.collection(base).where(field,'<=',end).orderBy(field).limit(limit).get();return{val:()=>Object.fromEntries(rows.docs.map(d=>[d.id,d.data()]))}}};return query;
 }};
}
module.exports={createFirestoreWallet,firestoreDeliveryStore};
