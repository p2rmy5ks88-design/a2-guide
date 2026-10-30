'use strict';
const assert=require('node:assert/strict');
const {createFakeFirestore}=require('./firestore-fake.cjs');
const {createProfileService}=require('./profile-service.cjs');
const {createFirestoreWallet}=require('./firestore-wallet.cjs');
const {APP}=require('./wallet.cjs');
const P=require('./profile.cjs');
let count=0;
const DAY=Date.UTC(2026,9,30,12);
// Tokens: "<uid>|<provider>|<authTimeSeconds>"
const verifyIdToken=async(t,revoked)=>{assert.equal(revoked,true);const [uid,provider='apple.com',at='0']=String(t).split('|');if(uid==='bad')throw Error('invalid');return{uid,auth_time:Number(at),email_verified:true,firebase:{sign_in_provider:provider}}};
let seq=0;const rid=()=>'req_'+String(++seq).padStart(16,'0');
function fixture(now=DAY,promos=P.PROMOS){
 const db=createFakeFirestore(),clock={now},deleted=[];
 const svc=createProfileService({db,verifyIdToken,environment:'sandbox',clock:()=>clock.now,promos,deleteAuthUser:async uid=>deleted.push(uid)});
 const wallet=createFirestoreWallet({db,environment:'sandbox',verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v,clock:()=>clock.now,spendCatalog:{gold:{coins:400}}});
 return{db,svc,wallet,clock,deleted};
}
const buy=(uid,id='tx-1',product='coins_600')=>({store:'apple',environment:'sandbox',appId:APP,type:'purchase',transactionId:id,ownerUid:uid,productId:APP+'.'+product,quantity:1,state:'purchased'});
async function test(name,fn){await fn();count++;console.log('ok - '+name)}
(async()=>{
 await test('input validation rejects unknown fields, kinds, prototype keys and unsafe numbers',async()=>{
  for(const bad of [{coins:1.5},{coins:2e9},{xp:-1},{items:{gems:['a']}},{items:{tok:['__proto__']}},{items:{tok:['a b']}},{max:{tokLv:{constructor:3}}},{max:{secret:{a:1}}},{flags:{admin:['x']}},{eq:{tok:'bus'}},{eq:{weapon:'x'},eqRev:1},{extra:1},[]])
   assert.throws(()=>P.validateChanges(bad),/invalid|too-large/,JSON.stringify(bad));
  assert.throws(()=>P.validateRequest({requestId:'short',changes:{}}),/invalid-profile-request/);
  assert.throws(()=>P.validateRequest({requestId:rid(),changes:{},uid:'mallory'}),/invalid-profile-request/);
  assert.throws(()=>P.validateRequest({requestId:rid(),mode:'steal',snapshot:{}},{migration:true}),/invalid-profile-request/);
 });
 await test('guest and unverified identities cannot use the profile',async()=>{const f=fixture();
  await assert.rejects(()=>f.svc.get('alice|anonymous'),/persistent-account-required/);
  await assert.rejects(()=>f.svc.get('bad'),/unauthenticated/);
 });
 await test('first device migration imports capped coins and the whole collection once',async()=>{const f=fixture();
  const r=await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:1200000,xp:4000,items:{tok:['bus','eagle'],dice:['gold']},max:{tokLv:{bus:3}},flags:{sf:['2.1']},eq:{tok:'bus'},eqRev:1}});
  assert.equal(r.mode,'first');assert.equal(r.coins,P.POLICY.migrateCoins);assert.ok(r.notes.includes('device-coins-above-limit-kept-locally'));
  assert.equal(r.profile.coins,1000000);assert.equal(r.profile.xp,4000);assert.deepEqual(r.profile.inv,{tok:{bus:true,eagle:true},dice:{gold:true}});assert.equal(r.profile.max.tokLv.bus,3);assert.equal(r.profile.eq.tok,'bus');assert.equal(r.profile.migrated,true);
 });
 await test('a later device adds items and higher values but never adds coins again',async()=>{const f=fixture();
  await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:900,xp:100,items:{tok:['bus']},max:{tokLv:{bus:2}}}});
  const r=await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:5000,xp:50,items:{tok:['drum']},max:{tokLv:{bus:4,drum:1}}}});
  assert.equal(r.mode,'merge');assert.equal(r.coins,0);assert.ok(r.notes.includes('device-coins-kept-locally'));
  assert.equal(r.profile.coins,900);assert.equal(r.profile.xp,100);assert.deepEqual(Object.keys(r.profile.inv.tok).sort(),['bus','drum']);assert.equal(r.profile.max.tokLv.bus,4);
 });
 await test('cloud-only choice records migration without importing anything',async()=>{const f=fixture();
  const r=await f.svc.migrate('alice',{requestId:rid(),mode:'cloud-only'});assert.equal(r.mode,'cloud-only');assert.equal(r.profile.coins,0);assert.equal(r.profile.migrated,true);
  const again=await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:999}});assert.equal(again.mode,'merge');assert.equal(again.profile.coins,0);
 });
 await test('earned coins and XP are capped per server UTC day and reset the next day',async()=>{const f=fixture();
  let r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:30000,xp:1000,reasons:['Season tier 5']}});assert.equal(r.coins,30000);
  r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:30000}});assert.equal(r.coins,20000);assert.ok(r.notes.includes('daily-coin-limit'));assert.equal(r.profile.coins,50000);
  r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:5}});assert.equal(r.coins,0);
  f.clock.now=DAY+864e5;r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:5}});assert.equal(r.coins,5);assert.equal(r.profile.today.coins,5);
 });
 await test('device clock cannot reopen the cap: only the server day counts',async()=>{const f=fixture();
  await f.svc.sync('alice',{requestId:rid(),changes:{coins:50000}});const r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:100,reasons:['2030-01-01']}});assert.equal(r.coins,0);
 });
 await test('spending only lowers the balance, never below zero',async()=>{const f=fixture();
  await f.svc.sync('alice',{requestId:rid(),changes:{coins:300}});
  let r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:-200,items:{fin:['ruby']}}});assert.equal(r.profile.coins,100);assert.equal(r.profile.inv.fin.ruby,true);
  r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:-500}});assert.equal(r.coins,-100);assert.equal(r.profile.coins,0);assert.ok(r.notes.includes('insufficient-coins'));
 });
 await test('repeated request IDs apply once; changed content under the same ID is refused',async()=>{const f=fixture();
  const input={requestId:rid(),changes:{coins:250,items:{tok:['bus']}}};
  const a=await f.svc.sync('alice',input),b=await f.svc.sync('alice',structuredClone(input));
  assert.equal(a.duplicate,false);assert.equal(b.duplicate,true);assert.equal(b.profile.coins,250);
  await assert.rejects(()=>f.svc.sync('alice',{...input,changes:{coins:9999}}),/idempotency-conflict/);
 });
 await test('request IDs are scoped to the signed-in account',async()=>{const f=fixture();const id=rid();
  await f.svc.sync('alice',{requestId:id,changes:{coins:10}});const r=await f.svc.sync('bob',{requestId:id,changes:{coins:20}});assert.equal(r.duplicate,false);assert.equal(r.profile.coins,20);
 });
 await test('promo codes are checked on the server: once per account, expiry, and outside the daily cap',async()=>{const code='not-the-real-code',f=fixture(Date.UTC(2026,10,1),{[P.promoHash(code)]:{coins:100000,xp:5000,until:Date.UTC(2026,10,2)}});
  {
   let r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:100000,xp:5000,promos:[code]}});assert.equal(r.coins,100000);assert.equal(r.xp,5000);assert.equal(r.profile.today.coins,0);
   r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:100000,promos:[code]}});assert.ok(r.notes.includes('promo-used'));assert.equal(r.coins,P.POLICY.dayCoins);
   r=await f.svc.sync('bob',{requestId:rid(),changes:{promos:['wrong']}});assert.ok(r.notes.includes('promo-invalid'));
   f.clock.now=Date.UTC(2026,10,3);r=await f.svc.sync('carol',{requestId:rid(),changes:{coins:100000,promos:[code]}});assert.ok(r.notes.includes('promo-expired'));assert.equal(r.coins,P.POLICY.dayCoins);
  }
 });
 await test('equipped items use the newest revision',async()=>{const f=fixture();
  await f.svc.sync('alice',{requestId:rid(),changes:{eq:{tok:'bus'},eqRev:5}});
  const r=await f.svc.sync('alice',{requestId:rid(),changes:{eq:{tok:'drum'},eqRev:3}});assert.equal(r.profile.eq.tok,'bus');
  const s=await f.svc.sync('alice',{requestId:rid(),changes:{eq:{tok:'drum',roof:'golden-garden'},eqRev:6}});assert.deepEqual(s.profile.eq,{tok:'drum',roof:'golden-garden'});
 });
 await test('purchased and earned coins share ONE balance and revision',async()=>{const f=fixture();
  await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:1000}});
  await f.wallet.purchase('alice',buy('alice'));
  let p=await f.svc.get('alice');assert.equal(p.coins,1600);const rev=p.rev;
  const r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:-1500}});assert.equal(r.profile.coins,100);assert.ok(r.profile.rev>rev);
  // Duplicate store callback does not re-credit.
  await f.wallet.purchase('alice',buy('alice'));p=await f.svc.get('alice');assert.equal(p.coins,100);
 });
 await test('refund after spending creates debt that blocks further spending until earned back',async()=>{const f=fixture();
  await f.wallet.purchase('alice',buy('alice'));await f.svc.sync('alice',{requestId:rid(),changes:{coins:-600}});
  await f.wallet.notification({...buy('alice'),type:'refund'});let p=await f.svc.get('alice');assert.equal(p.coins,0);assert.equal(p.debt,600);
  const r=await f.svc.sync('alice',{requestId:rid(),changes:{coins:-10}});assert.equal(r.coins,0);assert.ok(r.notes.includes('refund-deficit'));
  // Earned coins pay the debt first, like the wallet reducer.
  const e=await f.svc.sync('alice',{requestId:rid(),changes:{coins:100}});assert.equal(e.profile.coins,0);assert.equal(e.profile.debt,500);
 });
 await test('account removal needs a fresh sign-in, removes progress and bindings, keeps only hashed purchase records',async()=>{const f=fixture();
  const now=Math.floor(DAY/1000);
  await f.svc.migrate('alice',{requestId:rid(),mode:'import',snapshot:{coins:50,items:{tok:['bus']}}});await f.wallet.purchase('alice',buy('alice'));
  await f.db.doc('skylineAccounts/sandbox/bindings/'+P.hash('alice')).set({uid:'alice',apple:'0f0e0d0c-0000-4000-8000-000000000001',google:'ab'.repeat(32),status:'active'});
  await f.db.doc('skylineAccounts/sandbox/appleBindings/0f0e0d0c-0000-4000-8000-000000000001').set({uid:'alice'});
  await assert.rejects(()=>f.svc.remove('alice|apple.com|'+(now-3600)),/recent-sign-in-required/);
  assert.deepEqual(await f.svc.remove('alice|apple.com|'+(now-10)),{removed:true});assert.deepEqual(f.deleted,['alice']);
  const dump=f.db.dump(),keys=Object.keys(dump);
  assert.deepEqual(dump['skylineWallets/sandbox/accounts/'+P.hash('alice')].status,'deleted');
  assert.equal(keys.some(k=>k.includes(P.hash('alice')+'/ledger')||k.includes(P.hash('alice')+'/ops')),false);
  assert.equal(keys.some(k=>k.includes('appleBindings')),false);
  assert.equal(JSON.stringify(dump).includes('"alice"'),false,'no plain uid remains');
  await assert.rejects(()=>f.svc.get('alice'),/account-removed/);
  await assert.rejects(()=>f.svc.sync('alice',{requestId:rid(),changes:{coins:1}}),/account-removed/);
  await assert.rejects(()=>f.wallet.purchase('alice',buy('alice','tx-2')),/account-removed/);
  // The same store transaction can never be credited to another account.
  await assert.rejects(()=>f.wallet.purchase('bob',buy('bob')),/purchase-owner-conflict/);
 });
 await test('removal fails safely when the deletion service is not configured',async()=>{const db=createFakeFirestore(),svc=createProfileService({db,verifyIdToken,environment:'sandbox',clock:()=>DAY});
  await assert.rejects(()=>svc.remove('alice|apple.com|'+Math.floor(DAY/1000)),/deletion-not-configured/);assert.deepEqual(db.dump(),{});
 });
 await test('item, flag and progress limits are enforced without failing the sync',async()=>{const f=fixture();
  const many=Array.from({length:2001},(_,i)=>'t'+i),r=await f.svc.sync('alice',{requestId:rid(),changes:{items:{tok:many.slice(0,1999)}}});assert.equal(Object.keys(r.profile.inv.tok).length,1999);
  const s=await f.svc.sync('alice',{requestId:rid(),changes:{items:{dice:['a','b','c']}}});assert.ok(s.notes.includes('item-limit'));assert.equal(Object.keys(s.profile.inv.dice).length,1);
 });
 await test('production accepts Apple Sandbox purchases (App Review/TestFlight) only for listed tester accounts',async()=>{
  const db=createFakeFirestore(),mk=envs=>createFirestoreWallet({db,environment:'production',storeEnvironments:envs,verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v,clock:()=>DAY});
  await assert.rejects(()=>mk(undefined).purchase('alice',buy('alice','sb-1')),/invalid-verified-event/);
  // Not a listed tester: sandbox coins can never reach a real production balance.
  await assert.rejects(()=>mk(['production','sandbox']).purchase('alice',buy('alice','sb-1')),/sandbox-purchase-not-allowed/);
  await db.doc('skylineAccounts/production/testers/'+P.hash('alice')).set({active:false});
  await assert.rejects(()=>mk(['production','sandbox']).purchase('alice',buy('alice','sb-1')),/sandbox-purchase-not-allowed/);
  await db.doc('skylineAccounts/production/testers/'+P.hash('alice')).set({active:true});
  await mk(['production','sandbox']).purchase('alice',buy('alice','sb-1'));
  assert.equal(db.dump()['skylineWallets/production/accounts/'+P.hash('alice')].tester,true);
  const prof=createProfileService({db,verifyIdToken,environment:'production',clock:()=>DAY});assert.equal((await prof.get('alice')).coins,600);
  const key=Object.keys(db.dump()).find(k=>k.startsWith('skylineWallets/production/purchases/'));assert.equal(db.dump()[key].environment,'sandbox');
  assert.throws(()=>createFirestoreWallet({db,environment:'sandbox',storeEnvironments:['sandbox','production'],verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v}),/store environment/);
 });
 await test('verified notifications that need no wallet change are acknowledged and change nothing',async()=>{const db=createFakeFirestore();
  const w=createFirestoreWallet({db,environment:'sandbox',verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v,clock:()=>DAY});
  await w.purchase('alice',buy('alice','n-1'));const before=JSON.stringify(db.dump());
  for(const t of ['TEST','CONSUMPTION_REQUEST','REFUND_DECLINED']){const r=await w.notification({type:'ignored',notificationType:t});assert.deepEqual(r,{ok:true,ignored:t,walletChanged:false})}
  assert.equal(JSON.stringify(db.dump()),before);
 });
 await test('refund reversal restores coins once; a second refund removes them again',async()=>{const f=fixture();
  await f.wallet.purchase('alice',buy('alice','rv-1'));await f.wallet.notification({...buy('alice','rv-1'),type:'refund'});assert.equal((await f.svc.get('alice')).coins,0);
  const r=await f.wallet.notification({...buy('alice','rv-1'),type:'refund-reversed'});assert.equal(r.reversed,true);assert.equal((await f.svc.get('alice')).coins,600);
  await f.wallet.notification({...buy('alice','rv-1'),type:'refund-reversed'});assert.equal((await f.svc.get('alice')).coins,600,'duplicate reversal is a no-op');
  await f.wallet.purchase('alice',buy('alice','rv-1'));assert.equal((await f.svc.get('alice')).coins,600,'replayed purchase never credits');
  await f.wallet.notification({...buy('alice','rv-1'),type:'refund'});assert.equal((await f.svc.get('alice')).coins,0);
 });
 await test('a reversed refund-before-delivery tombstone lets the verified delivery credit exactly once',async()=>{const f=fixture();
  await f.wallet.notification({...buy('alice','tb-1'),type:'refund'});await f.wallet.purchase('alice',buy('alice','tb-1'));assert.equal((await f.svc.get('alice')).coins,0);
  const r=await f.wallet.notification({...buy('alice','tb-1'),type:'refund-reversed'});assert.equal(r.credited,false);assert.equal((await f.svc.get('alice')).coins,0);
  await f.wallet.purchase('alice',buy('alice','tb-1'));await f.wallet.purchase('alice',buy('alice','tb-1'));assert.equal((await f.svc.get('alice')).coins,600);
 });
 await test('refund for a removed account is acknowledged without recreating it',async()=>{const f=fixture();
  await f.wallet.purchase('alice',buy('alice','del-1'));await f.svc.remove('alice|apple.com|'+Math.floor(DAY/1000));
  const r=await f.wallet.notification({...buy('alice','del-1'),ownerUid:'alice',type:'refund'}).catch(e=>({code:e.code,permanent:e.permanent}));
  assert.equal(f.db.dump()['skylineWallets/sandbox/accounts/'+P.hash('alice')].status,'deleted');assert.equal(r.ignored,'account-removed');assert.equal(r.finishAllowed,false);
 });
 await test('deterministic notification rejections are marked permanent so Apple stops retrying',async()=>{const f=fixture();
  await f.wallet.purchase('alice',buy('alice','own-1'));const e=await f.wallet.notification({...buy('bob','own-1'),type:'refund'}).catch(x=>x);assert.equal(e.code,'purchase-owner-conflict');assert.equal(e.permanent,true);
 });
 await test('tester accounts: sandbox-only, locked when retired, wiped to a normal account on reset',async()=>{const db=createFakeFirestore(),now=DAY;
  const prof=createProfileService({db,verifyIdToken,environment:'production',clock:()=>now});
  const w=createFirestoreWallet({db,environment:'production',storeEnvironments:['production','sandbox'],verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v,clock:()=>now});
  const real=(uid,id)=>({...buy(uid,id),environment:'production'});
  // reviewer account: listed, receives free sandbox coins, flagged permanently
  await prof.markTester('rev','App Review demo');await w.purchase('rev',buy('rev','sb-r1'));let p=await prof.get('rev');assert.equal(p.coins,600);assert.equal(p.tester,true);
  await prof.sync('rev',{requestId:rid(),changes:{coins:-100,items:{roof:['pool']}}});
  // real money never mixes into a test account
  await assert.rejects(()=>w.purchase('rev',real('rev','pr-r1')),/test-account-real-purchase-blocked/);
  // retiring locks it: no reads, syncs, spending or purchases with the free coins
  await prof.retireTester('rev');
  await assert.rejects(()=>prof.get('rev'),/test-account-retired/);
  await assert.rejects(()=>prof.sync('rev',{requestId:rid(),changes:{coins:-1}}),/test-account-retired/);
  await assert.rejects(()=>w.purchase('rev',buy('rev','sb-r2')),/sandbox-purchase-not-allowed/);
  // un-listing (instead of retiring) behaves the same: the flag on the account stays
  await db.doc('skylineAccounts/production/testers/'+P.hash('rev')).delete();await assert.rejects(()=>prof.get('rev'),/test-account-retired/);
  // recovery: owner reset wipes coins and items, clears the flag and leaves an empty normal account
  await prof.resetTester('rev');p=await prof.get('rev');assert.equal(p.coins,0);assert.equal(p.xp,0);assert.deepEqual(p.inv,{});assert.equal(p.tester,false);
  await prof.sync('rev',{requestId:rid(),changes:{coins:10}});
  // the old sandbox transaction can never be credited again, and new sandbox purchases are refused
  await assert.rejects(()=>w.purchase('rev',buy('rev','sb-r1')),/sandbox-purchase-not-allowed/);assert.equal((await prof.get('rev')).coins,10);
  await assert.rejects(()=>w.purchase('rev',buy('rev','sb-r3')),/sandbox-purchase-not-allowed/);
  await w.purchase('rev',real('rev','pr-r2'));assert.equal((await prof.get('rev')).coins,610);
  // a normal player is unaffected by any of this
  await w.purchase('pat',real('pat','pr-p1'));await assert.rejects(()=>w.purchase('pat',buy('pat','sb-p1')),/sandbox-purchase-not-allowed/);assert.equal((await prof.get('pat')).coins,600);
  await assert.rejects(()=>prof.resetTester('pat'),/not-a-tester/);
 });
 await test('ledger rows carry the Skyline-specific TTL field; balances and purchase records do not',async()=>{const f=fixture();
  await f.wallet.purchase('alice',buy('alice','ttl-1'));await f.svc.sync('alice',{requestId:rid(),changes:{coins:5}});const d=f.db.dump();
  const ledger=Object.entries(d).filter(([k])=>k.includes('/ledger/')),others=Object.entries(d).filter(([k])=>!k.includes('/ledger/'));
  assert.ok(ledger.length>=2&&ledger.every(([,v])=>v.skylineLedgerExpireAt instanceof Date&&!('expireAt' in v)));
  assert.ok(others.every(([,v])=>!('skylineLedgerExpireAt' in v)&&!('expireAt' in v)),'accounts, purchases and ops never expire');
 });
 console.log(count+' unified profile checks passed (in-memory Firestore; emulator suite runs in CI)');
})().catch(e=>{console.error(e);process.exitCode=1});
