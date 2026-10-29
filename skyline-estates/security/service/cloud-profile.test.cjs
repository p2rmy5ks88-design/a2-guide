'use strict';
// End-to-end client engine <-> real profile service (in-memory Firestore).
const assert=require('node:assert/strict');
const {createCloudProfile,diff,norm}=require('../../lib/cloud-profile.js');
const {createFakeFirestore}=require('./firestore-fake.cjs');
const {createProfileService}=require('./profile-service.cjs');
const {createFirestoreWallet}=require('./firestore-wallet.cjs');
const {APP}=require('./wallet.cjs');
let count=0,ids=0;
const verifyIdToken=async t=>({uid:t,auth_time:0,firebase:{sign_in_provider:'apple.com'}});
function server(){const db=createFakeFirestore(),clock={now:Date.UTC(2026,9,30,10)};return{db,clock,svc:createProfileService({db,verifyIdToken,environment:'sandbox',clock:()=>clock.now}),wallet:createFirestoreWallet({db,environment:'sandbox',verifyIdToken,verifyPurchase:async v=>v,verifyNotification:async v=>v,clock:()=>clock.now})}}
function device(srv,{uid='alice',coins=0,xp=0,toks=[],answer='import'}={}){
 const storage=new Map(),prefs={coins,xp,inv:{tok:Object.fromEntries(toks.map(t=>[t,1]))},tokLv:{},owner:null},backups=[],notes=[];
 const net={down:false,loseResponse:false,signedIn:uid};
 const http={async request(method,path,body,token){if(net.down)throw Object.assign(Error('offline'),{});
  let r;try{r=method==='GET'?await srv.svc.get(token):path.endsWith('/migrate')?await srv.svc.migrate(token,structuredClone(body)):await srv.svc.sync(token,structuredClone(body))}catch(e){throw Object.assign(Error(e.code),{code:e.code,status:e.status||400})}
  if(net.loseResponse){net.loseResponse=false;throw Error('connection reset')}return structuredClone(r)}};
 const adapter={
  extract:()=>({coins:prefs.coins,xp:prefs.xp,items:{tok:Object.keys(prefs.inv.tok)},max:{tokLv:{...prefs.tokLv}},flags:{},eq:{}}),
  apply(t){prefs.coins=t.coins;prefs.xp=t.xp;prefs.inv.tok=Object.fromEntries((t.items.tok||[]).map(id=>[id,prefs.inv.tok[id]||2]));prefs.tokLv={...prefs.tokLv,...(t.max.tokLv||{})}},
  backup(reason){backups.push({reason,prefs:structuredClone(prefs)})},
  owner:()=>prefs.owner,setOwner(v){prefs.owner=v}};
 const cloud=createCloudProfile({storage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},http,adapter,
  account:async()=>net.signedIn?{uid:net.signedIn,token:net.signedIn}:null,ask:async kind=>{notes.push('ask:'+kind);return typeof answer==='function'?answer(kind):answer},notify:(k,v)=>notes.push(k+':'+(typeof v==='string'?v:JSON.stringify(v))),clock:()=>srv.clock.now,randomId:()=>'r'+String(++ids).padStart(20,'0')});
 return{prefs,cloud,net,notes,backups,storage};
}
async function test(name,fn){await fn();count++;console.log('ok - '+name)}
(async()=>{
 await test('diff reports only increases for items, maxima and flags; coins in both directions',()=>{
  const a=norm({coins:100,xp:5,items:{tok:['bus']},max:{tokLv:{bus:2}},flags:{ach:['x']},eq:{tok:'bus'}});
  const b=norm({coins:40,xp:9,items:{tok:['bus','drum']},max:{tokLv:{bus:1,drum:3}},flags:{ach:['x','y']},eq:{tok:'drum'}});
  assert.deepEqual(diff(b,a),{coins:-60,xp:4,items:{tok:['drum']},max:{tokLv:{drum:3}},flags:{ach:['y']},eq:{tok:'drum'}});assert.equal(diff(a,a),null);
 });
 await test('nothing is uploaded until the player chooses; "not now" keeps the device save local',async()=>{const s=server(),d=device(s,{coins:500,answer:null});
  const r=await d.cloud.sync();assert.equal(r.state,'local');assert.equal(d.prefs.coins,500);assert.equal(d.prefs.owner,null);assert.equal((await s.svc.get('alice')).migrated,false);
 });
 await test('first device moves its progress once and keeps a full backup',async()=>{const s=server(),d=device(s,{coins:800,xp:30,toks:['bus']});
  await d.cloud.sync();assert.equal(d.prefs.owner,'alice');assert.equal(d.backups[0].reason,'moved-to-account');assert.equal(d.backups[0].prefs.coins,800);
  const p=await s.svc.get('alice');assert.equal(p.coins,800);assert.equal(p.inv.tok.bus,true);assert.ok(d.notes.includes('ask:first'));
 });
 await test('earning and spending sync; a second device sees ONE balance and keeps its own coins only as a backup',async()=>{const s=server(),a=device(s,{coins:800,toks:['bus']});await a.cloud.sync();
  a.prefs.coins+=150;a.prefs.inv.tok.drum=1;a.cloud.reason('Lucky Spin');await a.cloud.sync();
  a.prefs.coins-=300;await a.cloud.sync();assert.equal((await s.svc.get('alice')).coins,650);
  const b=device(s,{coins:9999,toks:['eagle']});await b.cloud.sync();
  assert.ok(b.notes.includes('ask:merge'));assert.equal(b.prefs.coins,650);assert.deepEqual(Object.keys(b.prefs.inv.tok).sort(),['bus','drum','eagle']);assert.equal(b.backups[0].prefs.coins,9999);
  await a.cloud.sync({refresh:true});assert.deepEqual(Object.keys(a.prefs.inv.tok).sort(),['bus','drum','eagle']);
 });
 await test('offline changes queue, survive restart and apply exactly once after a lost response',async()=>{const s=server(),d=device(s,{coins:100});await d.cloud.sync();
  d.net.down=true;d.prefs.coins+=40;d.cloud.capture();d.prefs.coins+=60;d.cloud.capture();await d.cloud.sync();
  assert.equal(d.prefs.coins,200);assert.equal(d.cloud.status().pending,2);
  // "Restart": a new engine on the same storage.
  const again=createCloudProfile({storage:{getItem:k=>d.storage.has(k)?d.storage.get(k):null,setItem:(k,v)=>d.storage.set(k,v),removeItem:k=>d.storage.delete(k)},http:{request:async(m,p,b,t)=>{d.net.down=false;return m==='GET'?s.svc.get(t):s.svc.sync(t,structuredClone(b))}},adapter:{extract:()=>({coins:d.prefs.coins,xp:d.prefs.xp,items:{tok:Object.keys(d.prefs.inv.tok)},max:{},flags:{},eq:{}}),apply:t=>{d.prefs.coins=t.coins},backup(){},owner:()=>d.prefs.owner,setOwner(){}},account:async()=>({uid:'alice',token:'alice'}),clock:()=>s.clock.now+600000});
  await again.sync();assert.equal((await s.svc.get('alice')).coins,200);
  d.net.loseResponse=true;d.prefs.coins+=5;await d.cloud.sync();assert.equal((await s.svc.get('alice')).coins,205);
  s.clock.now+=600000;await d.cloud.sync();assert.equal((await s.svc.get('alice')).coins,205,'retry with the same request ID is not credited twice');assert.equal(d.prefs.coins,205);
 });
 await test('a daily-limit clamp is reflected locally and reported',async()=>{const s=server(),d=device(s);await d.cloud.sync();
  d.prefs.coins+=70000;await d.cloud.sync();assert.equal(d.prefs.coins,50000);assert.ok(d.notes.includes('note:daily-coin-limit'));
 });
 await test('purchases credited by the server appear on the device without double counting local changes',async()=>{const s=server(),d=device(s,{coins:100});await d.cloud.sync();
  await s.wallet.purchase('alice',{store:'apple',environment:'sandbox',appId:APP,type:'purchase',transactionId:'t-9',ownerUid:'alice',productId:APP+'.coins_1500',quantity:1,state:'purchased'});
  d.prefs.coins-=20;await d.cloud.sync();assert.equal(d.prefs.coins,1580);await d.cloud.sync({refresh:true});assert.equal(d.prefs.coins,1580);
 });
 await test('signing into a different account never moves the first account\'s progress',async()=>{const s=server(),d=device(s,{coins:700,toks:['bus'],answer:k=>k==='switch'?'cloud-only':'import'});await d.cloud.sync();
  d.net.signedIn='bob';await d.cloud.sync();assert.ok(d.notes.includes('ask:switch'));
  const bob=await s.svc.get('bob');assert.equal(bob.coins,0);assert.equal(d.prefs.owner,'bob');assert.equal(d.prefs.coins,0);assert.deepEqual(d.prefs.inv.tok,{});
  assert.equal(d.backups.at(-1).prefs.coins,700);assert.equal((await s.svc.get('alice')).coins,700);
 });
 await test('a refused switch keeps everything local and unchanged',async()=>{const s=server(),d=device(s,{coins:700,answer:k=>k==='first'?'import':null});await d.cloud.sync();
  d.net.signedIn='bob';await d.cloud.sync();assert.equal(d.prefs.owner,'alice');assert.equal(d.prefs.coins,700);assert.equal((await s.svc.get('bob')).migrated,false);
 });
 await test('signed-out play is captured for the owning account and synced on the next sign-in',async()=>{const s=server(),d=device(s,{coins:10});await d.cloud.sync();
  d.net.signedIn=null;d.prefs.coins+=90;d.cloud.capture();assert.equal((await d.cloud.sync()).state,'signed-out');
  d.net.signedIn='alice';await d.cloud.sync();assert.equal((await s.svc.get('alice')).coins,100);
 });
 await test('validation failures are dropped once, not retried forever',async()=>{const s=server(),d=device(s);await d.cloud.sync();
  d.prefs.inv.tok['bad id!']=1;d.cloud.capture();await d.cloud.sync();assert.equal(d.cloud.status().pending,0);assert.ok(d.notes.some(n=>n.startsWith('dropped:invalid-profile-item')));
 });
 await test('a removed account detaches the device save and stops syncing',async()=>{const s=server(),d=device(s,{coins:30});await d.cloud.sync();
  await s.db.doc('skylineWallets/sandbox/accounts/'+require('./profile.cjs').hash('alice')).set({status:'deleted'});
  d.prefs.coins+=1;await d.cloud.sync();assert.equal(d.prefs.owner,null);assert.ok(d.notes.includes('account-removed:undefined'));assert.equal(d.prefs.coins,31);
 });
 await test('promo codes travel with the change and are checked by the server',async()=>{const s=server(),d=device(s);await d.cloud.sync();
  d.prefs.coins+=500000;d.prefs.xp+=100000;d.cloud.promo('WRONGCODE');await d.cloud.sync();assert.ok(d.notes.includes('note:promo-invalid'));assert.equal(d.prefs.coins,50000);
 });
 await test('a change captured while a request is in flight is never lost',async()=>{const s=server(),d=device(s,{coins:100});await d.cloud.sync();
  // Slow the next server call and save a new change while it is pending.
  const orig=s.svc.sync;let release;s.svc.sync=async(...a)=>{await new Promise(r=>release=r);return orig(...a)};
  d.prefs.coins+=10;const pending=d.cloud.sync();for(let i=0;i<200&&!release;i++)await new Promise(r=>setTimeout(r,5));assert.ok(release,'request reached the server');
  d.prefs.coins+=5;d.cloud.capture();assert.equal(d.cloud.status().pending,2,'second change queued while the first is in flight');s.svc.sync=orig;release();await pending;await d.cloud.sync();assert.equal(d.cloud.status().pending,0);
  assert.equal((await s.svc.get('alice')).coins,115);assert.equal(d.prefs.coins,115);
 });
 console.log(count+' cloud sync engine checks passed (client engine against the real profile reducer)');
})().catch(e=>{console.error(e);process.exitCode=1});
