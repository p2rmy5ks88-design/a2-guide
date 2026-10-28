const assert=require('node:assert/strict');
const {createWalletService,APP}=require('./wallet.cjs');
const {createPurchaseVault}=require('./purchase-vault.cjs'),{createDeliveryWorker}=require('./delivery-worker.cjs'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
module.exports=async function({main,peer,test}){
 await main.db.ref('skylineWalletV1').remove();
 const uid='wallet-owner',token=await main.auth.createCustomToken(uid);
 const response=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,returnSecureToken:true})});
 assert.equal(response.status,200);const signed=await response.json();
 // Real Auth verification with an emulator-created email/password account.
 const email='wallet-'+Date.now()+'@example.test';
 const signup=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'EmulatorOnly-12345',returnSecureToken:true})});
 assert.equal(signup.status,200);const account=await signup.json();await main.auth.updateUser(account.localId,{emailVerified:true});
 const login=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'EmulatorOnly-12345',returnSecureToken:true})});
 assert.equal(login.status,200);const player=await login.json();
 const proof={store:'apple',environment:'sandbox',appId:APP,type:'purchase',transactionId:'emulator-store-tx',ownerUid:player.localId,productId:APP+'.coins_500',quantity:1,state:'purchased'};
 // Fixture STORE verification only. Auth, atomic transactions and persistence are real emulators.
 const vault=createPurchaseVault(crypto.randomBytes(32),'sandbox');
 const build=runtime=>createWalletService({db:runtime.db,verifyIdToken:runtime.auth.verifyIdToken.bind(runtime.auth),verifyPurchase:async event=>event,verifyNotification:async event=>event,environment:'sandbox',sealProof:value=>vault.seal(value),spendCatalog:{gold:{coins:400}}});
 const a=build(main),b=build(peer);
 await test('wallet rejects custom-token room identity without a supported linked provider',async()=>{await assert.rejects(()=>a.purchase(signed.idToken,proof),/persistent-account-required/)});
 await test('wallet atomic grant deduplicates concurrent delivery across two server instances',async()=>{await Promise.all(Array.from({length:12},(_,i)=>(i%2?a:b).purchase(player.idToken,proof)));assert.equal((await b.history(player.idToken)).coins,500);assert.equal((await b.history(player.idToken)).entries.length,1)});
 await test('wallet survives service recreation and a repeated lost-reply grant',async()=>{await build(peer).purchase(player.idToken,proof);assert.equal((await build(peer).history(player.idToken)).coins,500)});
 await test('wallet refund purchase race cannot resurrect refunded credit',async()=>{await Promise.all([a.notification({...proof,type:'refund'}),b.purchase(player.idToken,proof)]);const history=await a.history(player.idToken);assert.equal(history.coins,0);assert.equal(history.entries.length,2)});
 await test('wallet refund-before-delivery persists a replay tombstone',async()=>{const next={...proof,transactionId:'refund-first'};await b.notification({...next,type:'refund'});await a.purchase(player.idToken,next);assert.equal((await a.history(player.idToken)).coins,0)});
 await test('wallet spent refund creates a deficit and keeps the owned item',async()=>{const next={...proof,transactionId:'spent-refund'};await a.purchase(player.idToken,next);await a.spend(player.idToken,{requestId:'real_spend_request_01',item:'gold'});await b.notification({...next,type:'refund'});const h=await a.history(player.idToken);assert.equal(h.coins,0);assert.equal(h.debt,400)});
 const consumed=new Set(),makeWorker=runtime=>createDeliveryWorker({db:runtime.db,environment:'sandbox',openProof:value=>vault.open(value),consume:async value=>{consumed.add(value.purchaseToken);return{completed:true}}});
 await test('wallet Google grant persists encrypted delivery and survives worker recreation',async()=>{const r=await a.purchase(player.idToken,{...proof,store:'google',transactionId:'real-emulator-delivery'});assert.equal((await b.delivery(player.idToken,r.transactionKey)).finishAllowed,false);assert.equal((await makeWorker(peer).deliver(r.transactionKey)).state,'done');assert.equal((await a.delivery(player.idToken,r.transactionKey)).finishAllowed,true);const h=await a.history(player.idToken);assert.equal(h.coins,100);assert.equal(h.debt,0)});
 const samples=[],before=await a.history(player.idToken),started=Date.now();
 for(let batch=0;batch<4;batch++)await test('wallet load batch '+(batch+1)+' commits 25 purchases and repeated deliveries across servers',async()=>{
  let cursor=0;const events=Array.from({length:50},(_,i)=>({...proof,store:'google',transactionId:'load-'+(batch*25+i%25)}));
  await Promise.all(Array.from({length:4},async()=>{while(cursor<events.length){const i=cursor++,at=performance.now();await(i%2?a:b).purchase(player.idToken,events[i]);samples.push(performance.now()-at)}}));
  const h=await a.history(player.idToken);assert.equal(h.coins-h.debt,before.coins-before.debt+(batch+1)*25*500);
 });
 await test('wallet bounded delivery batches settle 100 load purchases with no lost grants',async()=>{for(let i=0;i<4;i++)assert.equal((await makeWorker(i%2?main:peer).run(25)).length,25);assert.equal((await makeWorker(main).run(25)).length,0);assert.equal(consumed.size,101);const h=await a.history(player.idToken);assert.equal(h.coins-h.debt,before.coins-before.debt+50000);assert.equal(h.entries.length,50)});
 const sorted=samples.sort((x,y)=>x-y),report={environment:'loopback Auth/Database emulators',storeVerification:'fixture',purchaseCount:100,duplicateRequests:100,concurrency:4,serverInstances:2,durationMs:Date.now()-started,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],invariants:'single grant, conserved net coins, bounded history, all delivery jobs settled',productionLoadAcceptance:false};
 fs.writeFileSync(path.join(__dirname,'../wallet-load-results.json'),JSON.stringify(report,null,2)+'\n');console.log('WALLET LOAD SUMMARY',JSON.stringify(report));

};
