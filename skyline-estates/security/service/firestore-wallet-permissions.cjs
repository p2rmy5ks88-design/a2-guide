const fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
module.exports=async({main,test})=>{
 const match=/^127\.0\.0\.1:(\d+)$/.exec(process.env.FIRESTORE_EMULATOR_HOST||'');if(!match||main.projectId!=='demo-skyline-phase1')throw Error('Loopback demo Firestore only');
 const env=await initializeTestEnvironment({projectId:main.projectId,firestore:{host:'127.0.0.1',port:Number(match[1]),rules:fs.readFileSync(path.join(__dirname,'../firestore.wallet.rules'),'utf8')}});
 const own=env.authenticatedContext('permission-owner').firestore(),other=env.authenticatedContext('permission-other').firestore(),anon=env.unauthenticatedContext().firestore(),account='skylineWallets/sandbox/accounts/permission-owner',job='skylineWallets/sandbox/deliveries/'+('a'.repeat(64));
 await main.firestore.doc(job).set({state:'attention',sealedProof:'fixture-encrypted-proof',nextAt:Number.MAX_SAFE_INTEGER});
 try{
  await test('Firestore wallet rejects direct client balance writes',()=>assertFails(setDoc(doc(own,account),{coins:500000})));
  await test('Firestore wallet requires the authenticated API even for owner reads',()=>assertFails(getDoc(doc(own,account))));
  await test('Firestore wallet rejects other-player balance reads',()=>assertFails(getDoc(doc(other,account))));
  await test('Firestore delivery proofs cannot be read directly by a player',()=>assertFails(getDoc(doc(own,job))));
  await test('Firestore wallet rejects client-forged ledger entries',()=>assertFails(setDoc(doc(own,account+'/ledger/forged'),{coins:500000,at:Date.now()})));
  await test('Firestore wallet rejects anonymous receipt reads',()=>assertFails(getDoc(doc(anon,'skylineWallets/sandbox/purchases/'+('b'.repeat(64))))));
 }finally{await main.firestore.doc(job).delete();await env.cleanup()}
};
