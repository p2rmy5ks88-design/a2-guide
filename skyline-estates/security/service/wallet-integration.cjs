const assert=require('node:assert/strict');
const {createWalletService,APP}=require('./wallet.cjs');
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
 const build=runtime=>createWalletService({db:runtime.db,verifyIdToken:runtime.auth.verifyIdToken.bind(runtime.auth),verifyPurchase:async event=>event,verifyNotification:async event=>event,environment:'sandbox'});
 const a=build(main),b=build(peer);
 await test('wallet rejects custom-token room identity without a supported linked provider',async()=>{await assert.rejects(()=>a.purchase(signed.idToken,proof),/persistent-account-required/)});
 await test('wallet atomic grant deduplicates concurrent delivery across two server instances',async()=>{await Promise.all(Array.from({length:12},(_,i)=>(i%2?a:b).purchase(player.idToken,proof)));assert.equal((await b.history(player.idToken)).coins,500);assert.equal((await b.history(player.idToken)).entries.length,1)});
 await test('wallet survives service recreation and a repeated lost-reply grant',async()=>{await build(peer).purchase(player.idToken,proof);assert.equal((await build(peer).history(player.idToken)).coins,500)});
 await test('wallet refund purchase race cannot resurrect refunded credit',async()=>{await Promise.all([a.notification({...proof,type:'refund'}),b.purchase(player.idToken,proof)]);const history=await a.history(player.idToken);assert.equal(history.coins,0);assert.equal(history.entries.length,2)});
 await test('wallet refund-before-delivery persists a replay tombstone',async()=>{const next={...proof,transactionId:'refund-first'};await b.notification({...next,type:'refund'});await a.purchase(player.idToken,next);assert.equal((await a.history(player.idToken)).coins,0)});
};
