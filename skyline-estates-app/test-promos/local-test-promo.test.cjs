const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'local-test-promo.js'),'utf8'),hash=script.match(/HASH='([^']+)'/)[1],until=Number(script.match(/UNTIL=(\d+)/)[1]);
function fixture({flag=true,platform='ios',signed=false,owner=null,quota=false,now=until-1}={}){
 let stored=JSON.stringify({coins:17,xp:29,tokWins:{bus:4},tokenMastery:{tokens:{bus:{xp:9}}},keep:'saved',cloudOwner:owner}),writes=0,delegated=0,options,tail=Promise.resolve();
 const c=vm.createContext({window:null,PREF:JSON.parse(stored),PKEY:'profile',SKYLINE_LOCAL_TEST_BUILD:flag,Capacitor:{isNativePlatform:()=>true,getPlatform:()=>platform},SkylineAccounts:{player:()=>signed?{uid:'tester'}:null},SkylineCloudEngine:{createCloudProfile:o=>(options=o,{})},Date:{now:()=>now},navigator:{locks:{request:(_k,fn)=>{const r=tail.then(fn);tail=r.catch(()=>{});return r}}},localStorage:{getItem:()=>stored,setItem:(_k,v)=>{if(quota)throw Error('quota');stored=v;writes++}},sha256hex:s=>s==='skyline:TESTLOCAL'?hash:crypto.createHash('sha256').update(s).digest('hex'),redeemPromo:async()=>{delegated++;return{ok:false}},refreshCoins:()=>{},xpFloat:()=>{},sfx:()=>{},toast:()=>{}});
 c.window=c;vm.runInContext(script,c);c.SkylineLocalTestRewards?.install();
 return{c,stored:()=>JSON.parse(stored),writes:()=>writes,delegated:()=>delegated,options:()=>options};
}
(async()=>{
 let checks=0;async function test(name,fn){await fn();console.log('PASS local reward:',name);checks++}
 await test('public/web/Android never install reward',()=>{for(const opts of [{flag:false},{platform:'web'},{platform:'android'}])assert.equal(fixture(opts).c.SkylineLocalTestRewards,undefined)});
 await test('exact rewards saved once atomically, preserves token progress and unrelated data',async()=>{const f=fixture();assert.equal((await f.c.redeemPromo('test-local')).ok,true);assert.equal(f.writes(),1);assert.equal(f.stored().coins,1000017);assert.equal(f.stored().xp,500029);assert.equal(f.stored().tokWins.bus,4);assert.equal(f.stored().tokenMastery.tokens.bus.xp,9);assert.equal(f.stored().keep,'saved');assert.equal(f.delegated(),0);assert.match(f.stored().cloudOwner,/^local-test-only:/)});
 await test('concurrent redemptions cannot duplicate grant',async()=>{const f=fixture(),r=await Promise.all([f.c.redeemPromo('TESTLOCAL'),f.c.redeemPromo('TESTLOCAL')]);assert.equal(r.filter(x=>x.ok).length,1);assert.equal(f.writes(),1)});
 await test('signed-in or account-owned saves rejected',async()=>{for(const opts of [{signed:true},{owner:'real-account'}]){const f=fixture(opts);assert.equal((await f.c.redeemPromo('TESTLOCAL')).ok,false);assert.equal(f.writes(),0)}});
 await test('expired at exact boundary',async()=>{const f=fixture({now:until});assert.equal((await f.c.redeemPromo('TESTLOCAL')).ok,false);assert.equal(f.writes(),0)});
 await test('storage failure does not change in-memory balances or receipt',async()=>{const f=fixture({quota:true});assert.equal((await f.c.redeemPromo('TESTLOCAL')).ok,false);assert.equal(f.c.PREF.coins,17);assert.equal(f.c.PREF.localTestReward,undefined)});
 await test('other codes retain original handler',async()=>{const f=fixture();await f.c.redeemPromo('OTHER');assert.equal(f.delegated(),1);assert.equal(f.writes(),0)});
 await test('cloud-owner protection persists after restore removes owner',async()=>{const f=fixture();await f.c.redeemPromo('TESTLOCAL');delete f.c.PREF.cloudOwner;f.c.SkylineCloudEngine.createCloudProfile({adapter:{owner:()=>null}});assert.equal(f.options().adapter.owner(),'local-test-only');f.c.PREF.cloudOwner='real-cloud-account';f.c.SkylineCloudEngine.createCloudProfile({adapter:{owner:()=>f.c.PREF.cloudOwner}});assert.equal(f.options().adapter.owner(),'real-cloud-account')});
 await test('real sync engine refuses import for foreign local-test owner',async()=>{
  const engine=require('../../skyline-estates/lib/cloud-profile.js');
  let owner='local-test-only',posted=false;const data=new Map();
  const e=engine.createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},account:()=>({uid:'real',token:'token'}),adapter:{owner:()=>owner,extract:()=>({coins:1000000,xp:500000}),apply:()=>{},backup:()=>{},setOwner:v=>owner=v},ask:async kind=>{assert.equal(kind,'switch');return'import'},http:{request:async method=>{if(method==='POST')posted=true;return{migrated:false,coins:0,xp:0}}},notify:()=>{}});
  await e.sync();assert.equal(posted,false);assert.equal(owner,'local-test-only');
 });
 await test('cloud-only switch never posts the local reward snapshot',async()=>{
  const engine=require('../../skyline-estates/lib/cloud-profile.js');let owner='local-test-only',migration;const data=new Map();
  const profile={coins:7,xp:9,items:{},max:{},flags:{},eq:{}};
  const e=engine.createCloudProfile({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},account:()=>({uid:'real',token:'token'}),adapter:{owner:()=>owner,extract:()=>({coins:1000000,xp:500000}),apply:()=>{},backup:()=>{},setOwner:v=>owner=v},ask:async()=>'cloud-only',http:{request:async(method,url,body)=>{if(url==='/v1/profile/migrate'){migration=body;return{profile,coins:7,mode:'cloud-only'}}return profile}},notify:()=>{}});
  await e.sync();assert.equal(migration.mode,'cloud-only');assert.equal(migration.snapshot,undefined);assert.equal(owner,'real');
 });
 console.log('LOCAL REWARD SUMMARY',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
