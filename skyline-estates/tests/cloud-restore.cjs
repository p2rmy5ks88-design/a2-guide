// Restore is tested against the real glue functions and the real sync engine.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCloudProfile,norm}=require('../lib/cloud-profile.js');
const source=fs.readFileSync(process.env.SKYLINE_RESTORE_GLUE||path.join(__dirname,'../lib/cloud-glue.js'),'utf8');
const a=source.indexOf('function activateLocalPrefs('),b=source.indexOf('function exportSave()');
const restore=source.slice(source.lastIndexOf('async function restore(key){'),source.lastIndexOf('})();'));
function fixture({quota=false,bad=false}={}){
 const original={coins:1245,xp:123,cloudOwner:'alice',inv:{tok:{bus:1}},season:{sxp:70}},backup={...original,coins:1001245,xp:500123,localTestReward:'receipt',promos:{receipt:1},cloudOwner:'local-test-only:receipt'};
 const key='skylinePrefs.backup.100',data=new Map([['skylinePrefs',JSON.stringify(original)],[key,JSON.stringify({at:100,reason:'before-account',prefs:bad?null:backup})]]);let paused=false,reloads=0,afterReload;
 const c=vm.createContext({PREF:structuredClone(original),PKEY:'skylinePrefs',BACKUP:'skylinePrefs.backup.',Date,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(quota&&k==='skylinePrefs')throw Error('quota');data.set(k,v)}},engine:{status:()=>({localOnly:paused}),pause:()=>paused=true,resume:()=>paused=false},modal:async()=>true,toast:()=>{},location:{reload(){reloads++;/* iOS hides the old page, invoking the game's existing savePref handler. */data.set('skylinePrefs',JSON.stringify(c.PREF));afterReload=JSON.parse(data.get('skylinePrefs'))}}});
 vm.runInContext((a<0?'':source.slice(a,b))+restore,c);
 return{c,data,key,backup,original,paused:()=>paused,reloads:()=>reloads,after:()=>afterReload};
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS restore:',name)}
(async()=>{
 await test('restore survives the old page saving during restart; both backups are retained',async()=>{
  const f=fixture(),untouched=f.data.get(f.key);await f.c.restore(f.key);
  assert.equal(f.after().coins,1001245);assert.equal(f.after().xp,500123);assert.equal(f.after().promos.receipt,1);assert.equal(f.after().season.sxp,70);assert.equal(f.after().cloudLocalOnly,true);assert.equal(f.after().cloudOwner,'local-device-backup');assert.equal(f.after().cloudRestoredBackup,f.key);assert.equal(f.paused(),true);assert.equal(f.data.get(f.key),untouched);
  const kept=[...f.data].map(([k,v])=>k.startsWith('skylinePrefs.backup.')?JSON.parse(v):null).filter(Boolean);
  assert.ok(kept.some(x=>x.reason==='before-restore'&&x.prefs.coins===1245));
 });
 await test('corrupt backup cannot replace the current profile',async()=>{const f=fixture({bad:true});await f.c.restore(f.key);assert.equal(f.reloads(),0);assert.equal(JSON.parse(f.data.get('skylinePrefs')).coins,1245)});
 await test('empty backup cannot reset balances',async()=>{const f=fixture();f.data.set(f.key,JSON.stringify({prefs:{}}));await f.c.restore(f.key);assert.equal(f.reloads(),0);assert.equal(f.c.PREF.coins,1245)});
 await test('storage failure keeps original memory, disk and selected backup; sync unpauses',async()=>{const f=fixture({quota:true}),saved=f.data.get(f.key);await f.c.restore(f.key);assert.equal(f.reloads(),0);assert.equal(f.c.PREF.coins,1245);assert.equal(JSON.parse(f.data.get('skylinePrefs')).coins,1245);assert.equal(f.data.get(f.key),saved);assert.equal(f.paused(),false)});
 await test('paused local mode survives new engine startup without requests or capture',async()=>{
  let calls=0;const e=createCloudProfile({storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},http:{request:()=>{calls++}},account:async()=>{calls++;return{uid:'alice',token:'alice'}},adapter:{owner:()=>null,localOnly:()=>true}});
  assert.equal((await e.sync({refresh:true})).state,'local-only');assert.equal(e.capture(),null);assert.equal(calls,0);assert.equal(e.status().localOnly,true);
 });
 for(const kind of ['GET','POST'])await test('a late '+kind+' response cannot overwrite a restored profile',async()=>{
  let localOnly=false,owner='alice',coins=kind==='POST'?15:10,applies=0;const entered=deferred(),response=deferred(),data=new Map(),profile={coins:10,xp:1,inv:{},max:{},flags:{},eq:{}};
  data.set('skylineCloud.v1.alice',JSON.stringify({v:1,uid:'alice',migrated:true,profile,outbox:[],shadow:norm({coins:10,xp:1})}));
  const e=createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},account:async()=>({uid:'alice',token:'alice'}),adapter:{localOnly:()=>localOnly,owner:()=>owner,extract:()=>({coins,xp:1}),apply:t=>{applies++;coins=t.coins}},http:{request:async(method,_url,body)=>{assert.equal(method,kind);if(kind==='POST')assert.equal(body.changes.coins,5);entered.resolve();return response.promise}}});
  const running=e.sync({refresh:true});await entered.promise;e.pause();localOnly=true;owner='local-device-backup';coins=1001245;response.resolve(kind==='POST'?{profile:{...profile,coins:15}}:profile);assert.equal((await running).state,'local-only');assert.equal(coins,1001245);assert.equal(applies,0);assert.equal(e.capture(),null);
 });
 await test('restore during onboarding prevents migration and applying a cloud profile',async()=>{
  let localOnly=false,posts=0,applies=0;const entered=deferred(),response=deferred();
  const e=createCloudProfile({storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},account:async()=>({uid:'alice',token:'alice'}),adapter:{localOnly:()=>localOnly,owner:()=>null,extract:()=>({coins:1001245}),apply:()=>applies++},ask:async()=>'import',http:{request:async method=>{if(method==='POST')posts++;entered.resolve();return response.promise}}});
  const running=e.sync();await entered.promise;e.pause();localOnly=true;response.resolve({coins:1});assert.equal((await running).state,'local-only');assert.equal(posts,0);assert.equal(applies,0);
 });
 await test('explicit resume can discard stale onboarding while keeping the account outbox',()=>{
  const data=new Map([['skylineCloud.v1.pendingMigration','old'],['skylineCloud.v1.alice','keep']]);
  const e=createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},http:{},account:async()=>null,adapter:{owner:()=>null}});e.pause();e.resume({discardMigration:true});assert.equal(data.has('skylineCloud.v1.pendingMigration'),false);assert.equal(data.get('skylineCloud.v1.alice'),'keep');
 });
 await test('failed resume storage keeps the engine paused',()=>{
  const e=createCloudProfile({storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{throw Error('quota')}},http:{},account:async()=>null,adapter:{owner:()=>null}});e.pause();assert.throws(()=>e.resume({discardMigration:true}),/storage-unavailable/);assert.equal(e.status().localOnly,true);
 });
 await test('promos redeemed in paused local mode cannot be journaled to an account later',()=>{
  const data=new Map([['skylineCloud.v1.alice',JSON.stringify({v:1,uid:'alice',migrated:true,profile:{coins:10,xp:1},outbox:[],shadow:norm({coins:10,xp:1})})]]);
  const e=createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},http:{},account:async()=>null,adapter:{owner:()=>'alice',extract:()=>({coins:10,xp:1})}});
  e.pause();e.promo('LOCALREWARD');e.reason('Local play');e.resume();assert.equal(e.capture(),null);assert.equal(JSON.parse(data.get('skylineCloud.v1.alice')).outbox.length,0);
 });
 for(const kind of ['GET','POST'])await test('a fast '+kind+' reply preserves a local change before its capture timer',async()=>{
  let coins=kind==='POST'?15:10,calls=0;const entered=deferred(),response=deferred(),data=new Map(),profile={coins:10,xp:1,inv:{},max:{},flags:{},eq:{}};
  data.set('skylineCloud.v1.alice',JSON.stringify({v:1,uid:'alice',migrated:true,profile,outbox:[],shadow:norm({coins:10,xp:1})}));
  const e=createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},account:async()=>({uid:'alice',token:'alice'}),adapter:{owner:()=>'alice',extract:()=>({coins,xp:1}),apply:t=>coins=t.coins},http:{request:async(method,_url,body)=>{if(++calls===1){entered.resolve();return response.promise}assert.equal(method,'POST');assert.equal(body.changes.coins,7);return{profile:{...profile,coins:22}}}}});
  const running=e.sync({refresh:true});await entered.promise;coins+=7;response.resolve(kind==='POST'?{profile:{...profile,coins:15}}:profile);await running;
  assert.equal(coins,kind==='POST'?22:17);
  assert.equal(JSON.parse(data.get('skylineCloud.v1.alice')).outbox.reduce((sum,o)=>sum+(o.changes.coins||0),0),kind==='POST'?0:7);
 });
 console.log('RESTORE SUMMARY',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
