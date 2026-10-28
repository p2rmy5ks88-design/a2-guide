'use strict';
const assert=require('node:assert/strict');
const {createWalletService,normalize,APP}=require('./wallet.cjs');
let count=0;
const proof={store:'apple',environment:'sandbox',appId:APP,type:'purchase',transactionId:'store-transaction-1',ownerUid:'alice',productId:APP+'.coins_500',quantity:1,state:'purchased'};
function fixture(){
 let root=null;const refs=[];
 const db={ref(path){refs.push(path);return{async transaction(fn){root=fn(structuredClone(root));return{committed:true}},async get(){const key=path.split('/').at(-1);return{val:()=>structuredClone(root?.accounts?.[key]||null)}}}}};
 const verifyIdToken=async(t,revoked)=>{assert.equal(revoked,true);if(t==='bad')throw Error('invalid');return{uid:t==='bob'?'bob':'alice',firebase:{sign_in_provider:t==='guest'?'anonymous':t==='email'||t==='unverified'?'password':t==='google'?'google.com':'apple.com'},email_verified:t!=='unverified'}};
 const verifyPurchase=async p=>{if(p?.signed!==true)throw Error('invalid-store-proof');return p.event};
 const dependencies={db,verifyIdToken,verifyPurchase,verifyNotification:verifyPurchase,environment:'sandbox',clock:()=>1000,sealProof:async()=>"fixture-sealed-proof"};
 return{service:createWalletService(dependencies),dependencies,root:()=>structuredClone(root),refs};
}
const signed=event=>({signed:true,event});
async function test(name,fn){await fn();count++;console.log('PASS wallet',name)}
(async()=>{
 await test('all trusted dependencies and an explicit environment are mandatory',()=>{const f=fixture();for(const key of ['db','verifyIdToken','verifyPurchase','verifyNotification','environment'])assert.throws(()=>createWalletService({...f.dependencies,[key]:null}));assert.throws(()=>createWalletService({...f.dependencies,environment:'test'}))});
 await test('Apple Google and verified email share the same UID wallet',async()=>{const f=fixture();await f.service.purchase('alice',signed(proof));for(const token of ['alice','google','email'])assert.equal((await f.service.history(token)).coins,500)});
 await test('anonymous unverified email and invalid tokens cannot access paid wallets',async()=>{const f=fixture();for(const token of ['guest','unverified','bad']){await assert.rejects(()=>f.service.purchase(token,signed(proof)));await assert.rejects(()=>f.service.history(token))}assert.equal(f.root(),null)});
 await test('unsigned client amounts do not reach the database',async()=>{const f=fixture();await assert.rejects(()=>f.service.purchase('alice',{...proof,coins:500000,verified:true}),/invalid-store-proof/);assert.equal(f.root(),null)});
 await test('duplicate delivery and cross-device retries grant once',async()=>{const f=fixture();await Promise.all(Array.from({length:20},()=>f.service.purchase('alice',signed(proof))));const h=await f.service.history('alice');assert.equal(h.coins,500);assert.equal(h.entries.length,1);assert.equal(h.entries[0].coins,500)});
 await test('verified ownership must match the authenticated user',async()=>{const f=fixture();await assert.rejects(()=>f.service.purchase('bob',signed(proof)),/purchase-owner-conflict/);assert.equal(f.root(),null)});
 await test('same transaction cannot be reassigned to a second account',async()=>{const f=fixture();await f.service.purchase('alice',signed(proof));await assert.rejects(()=>f.service.purchase('bob',signed({...proof,ownerUid:'bob'})),/purchase-owner-conflict/);assert.equal((await f.service.history('bob')).coins,0)});
 await test('server catalog supplies quantity and credit amount',async()=>{const f=fixture();await f.service.purchase('alice',signed({...proof,coins:9999999}));assert.equal((await f.service.history('alice')).coins,500);for(const event of [{...proof,quantity:2},{...proof,productId:APP+'.unknown'}])assert.throws(()=>normalize(event,'sandbox'),/invalid-verified-event/)});
 await test('wrong app environment pending state and malformed store are rejected',()=>{for(const patch of [{appId:'other.app'},{environment:'production'},{state:'pending'},{store:'browser'},{transactionId:''},{ownerUid:'../alice'},{quantity:0}])assert.throws(()=>normalize({...proof,...patch},'sandbox'),/invalid-verified-event/)});
 await test('refund reverses once and duplicate purchase cannot credit again',async()=>{const f=fixture();await f.service.purchase('alice',signed(proof));await f.service.notification(signed({...proof,type:'refund'}));await f.service.notification(signed({...proof,type:'refund'}));await f.service.purchase('alice',signed(proof));const h=await f.service.history('alice');assert.equal(h.coins,0);assert.equal(h.entries.length,2);assert.equal(h.entries.reduce((s,e)=>s+e.coins,0),0)});
 await test('refund arriving before purchase creates a no-credit tombstone',async()=>{const f=fixture();await f.service.notification(signed({...proof,type:'refund'}));await f.service.purchase('alice',signed(proof));assert.equal((await f.service.history('alice')).coins,0);assert.equal((await f.service.history('alice')).entries.length,1)});
 await test('unverified notifications and purchase notifications cannot refund',async()=>{const f=fixture();await assert.rejects(()=>f.service.notification({event:proof}),/invalid-store-proof/);await assert.rejects(()=>f.service.notification(signed(proof)),/unsupported-notification/);assert.equal(f.root(),null)});
 await test('history is owner scoped and exposes no raw purchase token',async()=>{const f=fixture();await f.service.purchase('alice',signed(proof));assert.deepEqual(await f.service.history('bob'),{coins:0,debt:0,entries:[]});assert.ok(!JSON.stringify(await f.service.history('alice')).includes(proof.transactionId));assert.ok(!JSON.stringify(f.root()).includes(proof.transactionId));assert.ok(f.refs.every(x=>x.startsWith('skylineWalletV1/sandbox')))});
 await test('Google purchase token identity is separate from Apple transaction IDs',async()=>{const f=fixture();await f.service.purchase('alice',signed(proof));await f.service.purchase('alice',signed({...proof,store:'google'}));assert.equal((await f.service.history('alice')).coins,1000)});
 console.log(count+' wallet foundation checks passed (fixture verifiers; no live stores)');
})().catch(e=>{console.error(e);process.exitCode=1});
