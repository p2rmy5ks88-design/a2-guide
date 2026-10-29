'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPurchaseDelivery}=require('../../lib/purchase-delivery.cjs');
const key='a'.repeat(64),transaction={store:'apple',id:'store-1',proof:{signedTransaction:'opaque'}};
function setup(overrides={}) {
 const calls=[];
 const api=createPurchaseDelivery({account:async()=>({uid:'player',token:'token'}),verify:async(token,proof)=>{calls.push('verify');assert.equal(token,'token');assert.deepEqual(proof,transaction.proof);return{transactionKey:key}},delivery:async(token,id)=>{calls.push('delivery');assert.equal(id,key);return{state:'delivered',finishAllowed:true}},finish:async()=>{calls.push('finish')},...overrides});
 return{api,calls};
}
 test('finish follows durable verification and delivery',async()=>{
 const {api,calls}=setup();assert.deepEqual(await api.deliver(transaction),{state:'delivered',finished:true});assert.deepEqual(calls,['verify','delivery','finish']);
});
test('concurrent duplicate callbacks share one delivery',async()=>{
 const {api,calls}=setup();await Promise.all(Array.from({length:30},()=>api.deliver(transaction)));assert.deepEqual(calls,['verify','delivery','finish']);
});
test('offline verification never finishes; replay recovers',async()=>{
 let attempts=0;const {api,calls}=setup({verify:async()=>{if(!attempts++)throw Error('offline');return{transactionKey:key}}});
 await assert.rejects(api.deliver(transaction),/offline/);assert.deepEqual(calls,[]);assert.equal((await api.deliver(transaction)).finished,true);
});
test('failed native finish can repeat server verification',async()=>{
 let attempts=0;const {api}=setup({finish:async()=>{if(!attempts++)throw Error('app interrupted')}});
 await assert.rejects(api.deliver(transaction),/interrupted/);assert.equal((await api.deliver(transaction)).finished,true);assert.equal(attempts,2);
});
for(const status of [{state:'pending',finishAllowed:true},{state:'attention',finishAllowed:false},{state:'delivered',finishAllowed:false},{state:'refunded',finishAllowed:true}])test('never finishes '+JSON.stringify(status),async()=>{
 const {api,calls}=setup({delivery:async()=>status});assert.equal((await api.deliver(transaction)).finished,false);assert.ok(!calls.includes('finish'));
});
test('Google completed delivery can finish',async()=>{
 const {api}=setup({delivery:async()=>({state:'done',finishAllowed:true})});assert.equal((await api.deliver({...transaction,store:'google'})).finished,true);
});
test('missing authenticated account prevents verification',async()=>{
 const {api,calls}=setup({account:async()=>null});await assert.rejects(api.deliver(transaction),{code:'purchase-sign-in-required'});assert.deepEqual(calls,[]);
});
for(const changeAt of [2,3])test('account switch at checkpoint '+changeAt+' prevents finish',async()=>{
 let reads=0;const {api,calls}=setup({account:async()=>({uid:++reads>=changeAt?'other':'player',token:'token'})});
 await assert.rejects(api.deliver(transaction),{code:'purchase-account-changed'});assert.ok(!calls.includes('finish'));
});
test('invalid server response never finishes',async()=>{
 const {api,calls}=setup({verify:async()=>({transactionKey:'untrusted'})});await assert.rejects(api.deliver(transaction),{code:'purchase-invalid-response'});assert.deepEqual(calls,[]);
});
test('recovery isolates failures and bounds batches',async()=>{
 const {api}=setup();const result=await api.recover([null,transaction]);assert.equal(result[0].status,'rejected');assert.equal(result[1].status,'fulfilled');await assert.rejects(api.recover(Array(101).fill(transaction)),{code:'purchase-invalid-recovery'});
});
