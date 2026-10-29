// Unified profile against the real Auth + Firestore emulators, two independent
// server connections and concurrent requests. Runs inside integration.test.cjs.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createProfileService}=require('./profile-service.cjs'),{createFirestoreWallet}=require('./firestore-wallet.cjs'),{APP}=require('./wallet.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
module.exports=async({main,peer,test})=>{
 if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('Loopback Firestore emulator required');
 async function account(){const uid='profile-'+crypto.randomUUID(),email=uid+'@example.test',password='Only-emulator-12345';await main.auth.createUser({uid,email,password,emailVerified:true});const r=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(r.status,200);return{uid,token:(await r.json()).idToken}}
 const make=(runtime,extra={})=>createProfileService({db:runtime.firestore,environment:'sandbox',verifyIdToken:runtime.auth.verifyIdToken.bind(runtime.auth),deleteAuthUser:uid=>runtime.auth.deleteUser(uid),...extra});
 const wallet=runtime=>createFirestoreWallet({db:runtime.firestore,environment:'sandbox',verifyIdToken:runtime.auth.verifyIdToken.bind(runtime.auth),verifyPurchase:async v=>v,verifyNotification:async v=>v});
 const a=make(main),b=make(peer),rid=()=>'req_'+crypto.randomUUID().replaceAll('-','');
 const owner=await account();
 await test('profile: concurrent syncs from two server connections all apply exactly once',async()=>{
  const inputs=Array.from({length:12},()=>({requestId:rid(),changes:{coins:10,items:{tok:['bus']}}}));
  await Promise.all(inputs.flatMap((input,i)=>[(i%2?a:b).sync(owner.token,input),(i%2?b:a).sync(owner.token,structuredClone(input))]));
  const p=await a.get(owner.token);assert.equal(p.coins,120);assert.equal(p.inv.tok.bus,true);assert.equal(p.today.coins,120);
 },30000);
 await test('profile: purchase and spend race on ONE balance without lost updates',async()=>{
  const proof={store:'apple',environment:'sandbox',appId:APP,type:'purchase',transactionId:'profile-'+crypto.randomUUID(),ownerUid:owner.uid,productId:APP+'.coins_600',quantity:1,state:'purchased'};
  await Promise.all([wallet(main).purchase(owner.token,proof),b.sync(owner.token,{requestId:rid(),changes:{coins:-100}}),wallet(peer).purchase(owner.token,proof)]);
  assert.equal((await b.get(owner.token)).coins,620);
 },30000);
 await test('profile: migration happens once even when two devices race',async()=>{
  const fresh=await account();
  const results=await Promise.all([a.migrate(fresh.token,{requestId:rid(),mode:'import',snapshot:{coins:700}}),b.migrate(fresh.token,{requestId:rid(),mode:'import',snapshot:{coins:900}})]);
  assert.deepEqual(results.map(r=>r.mode).sort(),['first','merge']);const p=await a.get(fresh.token);assert.ok(p.coins===700||p.coins===900);
 },30000);
 await test('profile: clients cannot read or write the profile documents directly',async()=>{
  const url=`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-skyline-phase1/databases/(default)/documents/skylineWallets/sandbox/accounts/${hash(owner.uid)}`;
  const r=await fetch(url,{headers:{Authorization:'Bearer '+owner.token}});assert.notEqual(r.status,200);
  const w=await fetch(url+'?updateMask.fieldPaths=coins',{method:'PATCH',headers:{Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},body:JSON.stringify({fields:{coins:{integerValue:'999999'}}})});assert.notEqual(w.status,200);
 });
 await test('profile: removal with a fresh sign-in deletes progress and the Auth user',async()=>{
  const gone=await account();await a.sync(gone.token,{requestId:rid(),changes:{coins:5,items:{dice:['gold']}}});
  assert.deepEqual(await b.remove(gone.token),{removed:true});
  await assert.rejects(()=>main.auth.getUser(gone.uid),e=>e.code==='auth/user-not-found');
  const doc=(await main.firestore.doc('skylineWallets/sandbox/accounts/'+hash(gone.uid)).get()).data();assert.deepEqual(Object.keys(doc).sort(),['deletedAt','status']);
  assert.equal((await main.firestore.collection('skylineWallets/sandbox/accounts/'+hash(gone.uid)+'/ops').get()).size,0);
 },30000);
};
