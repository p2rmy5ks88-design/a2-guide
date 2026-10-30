'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {createPlayerHandler,createRateLimiter}=require('./player-http.cjs');
const {createFakeFirestore}=require('./firestore-fake.cjs');
const {createProfileService}=require('./profile-service.cjs');
let count=0;
const verifyIdToken=async t=>{const [uid,provider='apple.com',at]=String(t).split('|');if(uid==='bad')throw Error('x');return{uid,auth_time:Number(at||0),firebase:{sign_in_provider:provider}}};
(async()=>{
 const db=createFakeFirestore(),profile=createProfileService({db,verifyIdToken,environment:'sandbox'});
 const calls=[],wallet={purchase:async(t,p)=>{calls.push(['purchase',p]);return{transactionKey:'a'.repeat(64)}},delivery:async(t,k)=>({state:'delivered',key:k}),history:async()=>({coins:0,entries:[]}),notification:async p=>{if(p==='bad')throw Object.assign(Error('invalid-apple-notification'),{code:'invalid-apple-notification',permanent:true});calls.push(['note',p])}};
 let paused=false;const handler=createPlayerHandler({profile,wallet,bindings:{forPlayer:async()=>({appAccountToken:'x'})},allowedOrigins:new Set(['https://p2rmy5ks88-design.github.io','capacitor://localhost']),limiter:createRateLimiter({perMinute:1000}),storePaused:async()=>paused});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const call=(method,path,{token='alice',body,origin='capacitor://localhost'}={})=>fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 async function test(name,fn){await fn();count++;console.log('ok - '+name)}
 try{
  await test('allowed origins get CORS headers; others are refused',async()=>{let r=await call('OPTIONS','/v1/profile');assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'capacitor://localhost');r=await call('GET','/v1/profile',{origin:'https://evil.example'});assert.equal(r.status,403)});
  await test('profile read, migrate and sync round trip with JSON bodies',async()=>{let r=await call('GET','/v1/profile');assert.equal(r.status,200);assert.equal((await r.json()).migrated,false);
   r=await call('POST','/v1/profile/migrate',{body:{requestId:'migrate_0000000001',mode:'import',snapshot:{coins:400,items:{tok:['bus']}}}});const m=await r.json();assert.equal(r.status,200);assert.equal(m.profile.coins,400);
   r=await call('POST','/v1/profile/sync',{body:{requestId:'sync_000000000001',changes:{coins:-100}}});assert.equal((await r.json()).profile.coins,300)});
  await test('errors are codes with fitting status; no stack traces',async()=>{let r=await call('GET','/v1/profile',{token:'bad'});assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'unauthenticated'});
   r=await call('POST','/v1/profile/sync',{body:{requestId:'x',changes:{}}});assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:'invalid-profile-request'});
   r=await call('GET','/v1/nothing');assert.equal(r.status,404);
   r=await call('DELETE','/v1/account',{token:'alice|apple.com|1'});assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'recent-sign-in-required'})});
  await test('oversized bodies are refused',async()=>{const r=await call('POST','/v1/profile/sync',{body:{requestId:'big_0000000000001',changes:{reasons:['x'.repeat(70000)]}}});assert.equal(r.status,413)});
  await test('store routes forward only the proof and a validated delivery key',async()=>{let r=await call('POST','/v1/store/purchase',{body:{proof:{signedTransaction:'jws'},coins:999999,ownerUid:'mallory'}});assert.equal(r.status,200);assert.deepEqual(calls.at(-1),['purchase',{signedTransaction:'jws'}]);
   r=await call('GET','/v1/store/delivery/'+'b'.repeat(64));assert.equal((await r.json()).key,'b'.repeat(64));r=await call('GET','/v1/store/delivery/zzz');assert.equal(r.status,404)});
  await test('Apple notifications need no CORS and permanent failures are acknowledged',async()=>{let r=await call('POST','/v1/store/apple-notifications',{token:null,origin:null,body:{signedPayload:'ok'}});assert.equal(r.status,200);r=await call('POST','/v1/store/apple-notifications',{token:null,origin:null,body:{signedPayload:'bad'}});assert.equal(r.status,200);assert.equal((await r.json()).ok,false)});
  await test('a store pause refuses new purchase bindings but keeps delivery working',async()=>{let r=await call('POST','/v1/store/binding',{body:{}});assert.equal(r.status,200);paused=true;
   r=await call('POST','/v1/store/binding',{body:{}});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'store-paused'});
   r=await call('POST','/v1/store/purchase',{body:{proof:{signedTransaction:'jws2'}}});assert.equal(r.status,200,'already-paid purchases still deliver');paused=false});
  await test('rate limiter refuses bursts per caller',async()=>{const lim=createRateLimiter({perMinute:2,clock:()=>0});lim('a');lim('a');assert.throws(()=>lim('a'),/rate-limited/);lim('b')});
 }finally{server.close()}
 console.log(count+' player HTTP checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
