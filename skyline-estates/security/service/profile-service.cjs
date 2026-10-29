'use strict';
// Firestore adapter for the unified profile. Shares the scoped wallet account
// document with firestore-wallet.cjs so purchases and profile changes update ONE
// balance inside Firestore transactions.
const {createWalletIdentity}=require('./wallet-auth.cjs');
const P=require('./profile.cjs');
const {hash}=P;
const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status})};
const RECENT_AUTH_SECONDS=300,LEDGER_DAYS=730; // ledger rows expire via a Firestore TTL policy on skylineLedgerExpireAt (unique name, so no other app's documents are affected)
function createProfileService({db,verifyIdToken,environment,deleteAuthUser=null,clock=Date.now,promos=P.PROMOS}){
 if(!db||typeof db.runTransaction!=='function'||typeof verifyIdToken!=='function'||!['sandbox','production'].includes(environment))throw Error('Trusted profile dependencies and an explicit environment are required');
 const identity=createWalletIdentity(verifyIdToken),base='skylineWallets/'+environment;
 const accountRef=uid=>db.doc(base+'/accounts/'+hash(uid));
 async function mutate(token,input,migration){
  const uid=await identity(token),cmd=P.validateRequest(input,{migration}),ref=accountRef(uid),opKey=hash(cmd.requestId),op=ref.collection('ops').doc(opKey),digest=P.digest(migration?{m:cmd.mode,s:cmd.snapshot}:cmd.changes),now=clock();
  return db.runTransaction(async tx=>{
   const [as,os]=await tx.getAll(ref,op),stored=as.exists?as.data():null;
   if(stored?.status==='deleted')fail('account-removed',410);
   if(os.exists){const prior=os.data();if(prior.digest!==digest)fail('idempotency-conflict',409);return{...prior.result,duplicate:true,profile:P.publicProfile(stored)}}
   const account=stored?structuredClone(stored):P.fresh(uid,now),ledger=[];
   const result=migration?P.applyMigration(account,cmd,now,ledger):P.applyChanges(account,cmd.changes,now,ledger,promos);
   account.rev=(account.rev||0)+1;account.updatedAt=now;
   tx.set(ref,account);
   tx.create(op,{digest,kind:migration?'migrate':'sync',result,at:now});
   ledger.forEach((entry,i)=>tx.create(ref.collection('ledger').doc('p_'+opKey.slice(0,40)+'_'+i),{...entry,skylineLedgerExpireAt:new Date(now+LEDGER_DAYS*864e5)}));
   return{...result,duplicate:false,profile:P.publicProfile(account)};
  });
 }
 return{
  async get(token){const uid=await identity(token),snap=await accountRef(uid).get(),a=snap.exists?snap.data():null;if(a?.status==='deleted')fail('account-removed',410);return P.publicProfile(a)},
  migrate:(token,input)=>mutate(token,input,true),
  sync:(token,input)=>mutate(token,input,false),
  // Permanent removal. Requires a fresh sign-in. Financial anti-replay records are
  // kept with the owner replaced by a one-way hash; everything else is removed.
  async remove(token){
   const uid=await identity(token);let decoded;try{decoded=await verifyIdToken(token,true)}catch{fail('unauthenticated',401)}
   if(!Number.isSafeInteger(decoded?.auth_time)||clock()/1000-decoded.auth_time>RECENT_AUTH_SECONDS)fail('recent-sign-in-required',401);
   if(typeof deleteAuthUser!=='function')fail('deletion-not-configured',503);
   const ref=accountRef(uid),now=clock(),gone='deleted:'+hash('skyline-deleted:'+uid);
   await db.runTransaction(async tx=>{const snap=await tx.get(ref);tx.set(ref,{status:'deleted',deletedAt:snap.data()?.deletedAt||now})});
   for(const sub of ['ledger','ops','operations']){const docs=(await ref.collection(sub).limit(500).get()).docs;let batch=docs;while(batch.length){await Promise.all(batch.map(d=>d.ref.delete()));batch=(await ref.collection(sub).limit(500).get()).docs}}
   const bindings=db.doc('skylineAccounts/'+environment+'/bindings/'+hash(uid)),b=(await bindings.get()).data();
   if(b){if(b.apple)await db.doc('skylineAccounts/'+environment+'/appleBindings/'+b.apple).delete();if(b.google)await db.doc('skylineAccounts/'+environment+'/googleBindings/'+b.google).delete();await bindings.set({status:'deleted',deletedAt:now})}
   await db.doc('skylineAccounts/'+environment+'/testers/'+hash(uid)).delete();
   const owned=await db.collection(base+'/purchases').where('ownerUid','==',uid).limit(500).get();
   await Promise.all(owned.docs.map(d=>d.ref.update({ownerUid:gone})));
   await deleteAuthUser(uid);
   return{removed:true};
  }
 };
}
module.exports={createProfileService,RECENT_AUTH_SECONDS};
