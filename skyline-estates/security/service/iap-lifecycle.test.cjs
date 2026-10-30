'use strict';
// End-to-end coin-pack lifecycle: real Firestore wallet (in-memory Firestore), real Apple store
// adapter (fixture signature verifier), real device delivery coordinator. No network, no stores.
const assert=require('node:assert/strict');
const {createFakeFirestore}=require('./firestore-fake.cjs');
const {createFirestoreWallet}=require('./firestore-wallet.cjs');
const {createAppleStoreAdapter}=require('./store-adapters.cjs');
const {APP}=require('./wallet.cjs');
const {createPurchaseDelivery}=require('../../lib/purchase-delivery.js');
let count=0;const test=async(name,fn)=>{await fn();count++;console.log('PASS iap lifecycle',name)};
const TOKEN='11111111-2222-4333-8444-555555555555';
const verifyIdToken=async t=>{const [uid]=String(t).split('|');return{uid,auth_time:0,email_verified:true,firebase:{sign_in_provider:'apple.com'}}};

function fixture(){
 const db=createFakeFirestore(),apple=new Map(),notes=new Map();let now=Date.UTC(2026,9,31);
 // Signed transactions are opaque ids into this map; `apple` holds Apple's CURRENT view.
 const tx=(id,patch={})=>{const value={bundleId:APP,environment:'Sandbox',productId:APP+'.coins_600',type:'Consumable',quantity:1,transactionId:id,appAccountToken:TOKEN,...patch};apple.set(id,value);return 'signed-transaction-jws:'+id};
 const verifier={verifyAndDecodeTransaction:async s=>{const id=String(s).replace(/^signed-transaction-jws:|^current-transaction-jws:/,'');if(!apple.has(id))throw Error('signature rejected');return{...apple.get(id)}},verifyAndDecodeNotification:async s=>{if(!notes.has(s))throw Error('signature rejected');return notes.get(s)}};
 const adapter=createAppleStoreAdapter({environment:'sandbox',verifier,getTransactionInfo:async id=>({signedTransactionInfo:'current-transaction-jws:'+id}),resolveAccountToken:async t=>t===TOKEN?'alice':null});
 const wallet=createFirestoreWallet({db,environment:'sandbox',verifyIdToken,verifyPurchase:p=>adapter.verifyPurchase(p),verifyNotification:p=>adapter.verifyNotification(p),clock:()=>now++});
 const finished=[];let failFinish=0;
 const device=createPurchaseDelivery({account:async()=>({uid:'alice',token:'alice'}),verify:(t,p)=>wallet.purchase(t,p),delivery:(t,k)=>wallet.delivery(t,k),finish:async x=>{if(failFinish>0){failFinish--;throw Error('app killed before finish')}finished.push(x.id)}});
 const notify=(type,id)=>{const key='note:'+type+':'+id+':'+notes.size;notes.set(key,{notificationType:type,data:{bundleId:APP,environment:'Sandbox',signedTransactionInfo:'current-transaction-jws:'+id}});return wallet.notification(key)};
 const acct=db.doc('skylineWallets/sandbox/accounts/'+require('node:crypto').createHash('sha256').update('alice').digest('hex'));
 // Spendable balance = coins minus any refund debt, read straight from the server wallet document.
 const coins=async()=>{const a=(await acct.get()).data()||{};return(a.coins||0)-(a.debt||0)};
 const revoke=id=>{apple.get(id).revocationDate=now};
 const restore=id=>{delete apple.get(id).revocationDate};
 return{device,tx,notify,coins,revoke,restore,finished,setFailFinish:n=>{failFinish=n},wallet};
}
const t=(f,id,patch)=>({store:'apple',id,proof:{signedTransaction:f.tx(id,patch)}});

(async()=>{
 await test('successful delivery credits once and finishes',async()=>{const f=fixture();const r=await f.device.deliver(t(f,'1'));assert.deepEqual(r,{state:'delivered',finished:true});assert.equal(await f.coins(),600);assert.deepEqual(f.finished,['1'])});
 await test('duplicate transaction replays never credit twice',async()=>{const f=fixture(),x=t(f,'2');await f.device.deliver(x);await f.device.deliver(x);await f.device.recover([x,x]);assert.equal(await f.coins(),600);assert.equal(f.finished.length,3,'concurrent replays of one transaction share a single delivery')});
 await test('interrupted delivery (app killed before finish) is recovered at next launch without double credit',async()=>{const f=fixture(),x=t(f,'3');f.setFailFinish(1);await assert.rejects(f.device.deliver(x),/killed/);assert.equal(await f.coins(),600);assert.deepEqual(f.finished,[]);const [r]=await f.device.recover([x]);assert.equal(r.status,'fulfilled');assert.equal(r.value.finished,true);assert.equal(await f.coins(),600)});
 await test('refund after delivery removes the coins once, duplicate refund ignored',async()=>{const f=fixture();await f.device.deliver(t(f,'4'));f.revoke('4');await f.notify('REFUND','4');await f.notify('REFUND','4');assert.equal(await f.coins(),0)});
 await test('refund reversal restores the coins once',async()=>{const f=fixture();await f.device.deliver(t(f,'5'));f.revoke('5');await f.notify('REFUND','5');f.restore('5');await f.notify('REFUND_REVERSED','5');await f.notify('REFUND_REVERSED','5');assert.equal(await f.coins(),600)});
 await test('refund of one of two packs removes only that pack, reversal restores it',async()=>{const f=fixture();await f.device.deliver(t(f,'6'));f.revoke('6');await f.device.deliver(t(f,'7'));await f.notify('REFUND','6');assert.equal(await f.coins(),600);f.restore('6');await f.notify('REFUND_REVERSED','6');assert.equal(await f.coins(),1200)});
 await test('transaction refunded before delivery: no credit, device finishes it so it stops replaying',async()=>{const f=fixture(),x=t(f,'8');f.revoke('8');const r=await f.device.deliver(x);assert.deepEqual(r,{state:'refunded',finished:true});assert.equal(await f.coins(),0);assert.deepEqual(f.finished,['8']);const again=await f.device.deliver(x);assert.equal(again.state,'refunded');assert.equal(await f.coins(),0)});
 await test('refund notification before delivery, then reversal: delivery credits once',async()=>{const f=fixture(),x=t(f,'9');f.revoke('9');await f.notify('REFUND','9');f.restore('9');await f.notify('REFUND_REVERSED','9');const r=await f.device.deliver(x);assert.equal(r.state,'delivered');assert.equal(await f.coins(),600);await f.device.deliver(x);assert.equal(await f.coins(),600)});
 await test('a transaction bound to another account cannot be delivered',async()=>{const f=fixture();await assert.rejects(f.device.deliver(t(f,'10',{appAccountToken:'99999999-2222-4333-8444-555555555555'})),/unbound-apple-account/);assert.equal(await f.coins(),0);assert.deepEqual(f.finished,[])});
 console.log(count+' IAP lifecycle checks passed (real wallet, adapter and delivery client; fixture Apple data)');
})().catch(e=>{console.error(e);process.exit(1)});
