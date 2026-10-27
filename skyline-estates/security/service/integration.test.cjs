const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createEmulatorRuntime}=require('./emulator-runtime.cjs'),{createAdmissionService}=require('./admission.cjs'),{createHttpHandler}=require('./http.cjs');
const report={projectId:'demo-skyline-phase1',checks:[],failure:null},servers=[],runtimes=[];let clientModule;
const id=()=>crypto.randomUUID(),settings={mode:'classic',city:'lagos',cash:1600,ffa:true,even:false,auction:true};
async function test(name,fn){let timer;try{await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Case timeout: '+name)),15000))]);report.checks.push({name,passed:true});console.log('PASS service',name)}finally{clearTimeout(timer)}}
const denied=(fn,status,code)=>assert.rejects(fn,e=>e.status===status&&(!code||e.code===code));
async function account(){const r=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});assert.equal(r.status,200,'local auth signup');const b=await r.json();return{uid:b.localId,token:b.idToken}}
async function serve(runtime,options={}){const allowedOrigins=new Set(['http://127.0.0.1:7777']),service=createAdmissionService({db:runtime.db,verifyIdToken:runtime.auth.verifyIdToken.bind(runtime.auth),...options}),server=http.createServer(createHttpHandler(service,{allowedOrigins}));server.requestTimeout=5000;server.headersTimeout=3000;await new Promise(r=>server.listen(0,'127.0.0.1',r));servers.push(server);const baseUrl=`http://127.0.0.1:${server.address().port}/`;return{service,baseUrl,client:user=>clientModule.createAdmissionClient({baseUrl,getIdToken:async()=>user.token})}}
(async()=>{
 const main=createEmulatorRuntime();runtimes.push(main);clientModule=await import('./client.mjs');await main.db.ref('skylineV2').remove();
 const peer=createEmulatorRuntime('admission-prototype-peer');runtimes.push(peer);
 const api=await serve(main),apiPeer=await serve(peer),host=await account(),guest=await account(),outsider=await account(),hostClient=api.client(host),guestClient=api.client(guest),outsideClient=api.client(outsider);
 let created;const createId=id();
 await test('verified user creates a server-owned lobby and private invitation',async()=>{created=await hostClient.createRoom({requestId:createId,name:'Host',settings});assert.match(created.code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);assert.match(created.invite,/^[a-f0-9]{64}$/);assert.equal((await hostClient.room(created.code)).hostUid,host.uid)});
 await test('create replay returns the same room and invitation',async()=>{assert.deepEqual(await hostClient.createRoom({requestId:createId,name:'Host',settings}),created);assert.equal(Object.keys((await main.db.ref('skylineV2/rooms').once('value')).val()).length,1)});
 await test('operation id rejects different content',()=>denied(()=>hostClient.createRoom({requestId:createId,name:'Other',settings}),409,'idempotency-conflict'));
 await test('body cannot spoof authenticated uid',()=>denied(()=>hostClient.createRoom({requestId:id(),name:'Host',settings,uid:outsider.uid}),400,'invalid-fields'));
 await test('unauthenticated calls are rejected',async()=>{const r=await fetch(api.baseUrl+'v2/rooms/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:id(),name:'Bad',settings})});assert.equal(r.status,401)});
 await test('malformed bearer token is rejected',()=>denied(()=>api.client({token:'not-a-token'}).room(created.code),401,'unauthenticated'));
 await test('outsider cannot read by guessing short code',()=>denied(()=>outsideClient.room(created.code),403,'not-authorized'));
 await test('short code alone does not grant membership',()=>denied(()=>outsideClient.joinRoom({requestId:id(),code:created.code,name:'Other'}),403,'not-authorized'));
 await test('wrong invitation does not grant membership',()=>denied(()=>outsideClient.joinRoom({requestId:id(),code:created.code,name:'Other',invite:'0'.repeat(64)}),403,'not-authorized'));
 const joinId=id();
 await test('invited guest joins with custom settings preserved',async()=>{await guestClient.joinRoom({requestId:joinId,code:created.code,invite:created.invite,name:'Guest'});const r=await guestClient.room(created.code);assert.equal(r.seats.length,2);assert.deepEqual(r.settings,settings);assert.equal(r.revision,1);assert.equal(r.protocol,2)});
 await test('join retries do not duplicate seats or revision',async()=>{await guestClient.joinRoom({requestId:joinId,code:created.code,invite:created.invite,name:'Guest'});await guestClient.joinRoom({requestId:id(),code:created.code,invite:created.invite,name:'Guest'});const r=await guestClient.room(created.code);assert.equal(r.seats.length,2);assert.equal(r.revision,1)});
 await test('room view does not expose secrets or receipts',async()=>{const r=await guestClient.room(created.code);assert.equal(JSON.stringify(r).includes(created.invite),false);assert.equal('service' in r,false);assert.equal('invite' in r,false)});
 await test('client cannot read private service receipts directly',async()=>{const r=await fetch(`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/skylineV2/service.json?ns=demo-skyline-phase1&auth=${encodeURIComponent(guest.token)}`);assert.equal(r.status,401)});
 await test('client cannot directly grant authoritative membership',async()=>{const r=await fetch(`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/skylineV2/rooms/${created.code}/members/${outsider.uid}.json?ns=demo-skyline-phase1&auth=${encodeURIComponent(outsider.token)}`,{method:'PUT',body:'true'});assert.equal(r.status,401)});
 await test('start fails closed without the authoritative game engine',()=>denied(()=>hostClient.startGame({requestId:id(),code:created.code}),501,'game-engine-not-enabled'));
 await test('unsupported starting cash is rejected',()=>denied(()=>hostClient.createRoom({requestId:id(),name:'Host',settings:{...settings,cash:999999}}),400,'invalid-settings'));
 await test('null optional rule cannot bypass settings validation',()=>denied(()=>hostClient.createRoom({requestId:id(),name:'Host',settings:{...settings,auction:null}}),400,'invalid-settings'));
 await test('operation id cannot inject database paths',()=>denied(()=>hostClient.leaveRoom({requestId:'../unsafe',code:created.code}),400,'invalid-request-id'));
 await test('foreign browser origin is denied',async()=>{const r=await fetch(api.baseUrl+'v2/rooms/'+created.code,{headers:{Origin:'https://untrusted.invalid',Authorization:'Bearer '+host.token}});assert.equal(r.status,403)});
 await test('configured browser origin preflights without cookies',async()=>{const r=await fetch(api.baseUrl+'v2/rooms/create',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:7777','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'http://127.0.0.1:7777');assert.equal(r.headers.get('access-control-allow-credentials'),null)});
 await test('oversized request body is denied',async()=>{const r=await fetch(api.baseUrl+'v2/rooms/create',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+host.token},body:JSON.stringify({payload:'x'.repeat(9000)})});assert.equal(r.status,413)});
 await test('adapter rejects remote endpoints before requesting credentials',()=>{let calls=0;assert.throws(()=>clientModule.createAdmissionClient({baseUrl:'https://example.com/',getIdToken:()=>calls++}));assert.equal(calls,0)});
 await test('adapter obtains current authentication for every call',async()=>{let calls=0;const c=clientModule.createAdmissionClient({baseUrl:api.baseUrl,getIdToken:async()=>{calls++;return guest.token}});await c.room(created.code);await c.room(created.code);assert.equal(calls,2)});
 const leaveId=id();
 await test('host leave transfers lobby ownership atomically',async()=>{await apiPeer.client(host).leaveRoom({requestId:leaveId,code:created.code});const r=await guestClient.room(created.code);assert.equal(r.hostUid,guest.uid);assert.equal(r.seats.length,1);assert.equal(r.revision,2)});
 await test('removed member immediately loses service read access',()=>denied(()=>hostClient.room(created.code),403,'not-authorized'));
 await test('leave replay remains idempotent after removal',async()=>{await hostClient.leaveRoom({requestId:leaveId,code:created.code});assert.equal((await guestClient.room(created.code)).revision,2)});
 await test('last leave closes room and invalidates invitation',async()=>{await guestClient.leaveRoom({requestId:id(),code:created.code});assert.equal((await main.db.ref('skylineV2/rooms/'+created.code+'/meta/status').once('value')).val(),'closed');await denied(()=>outsideClient.joinRoom({requestId:id(),code:created.code,invite:created.invite,name:'Other'}),403)});
 const raceHost=await account(),race=await api.client(raceHost).createRoom({requestId:id(),name:'Race',settings}),racers=await Promise.all(Array.from({length:7},()=>account()));
 await test('two service instances enforce six-seat capacity under contention',async()=>{const outcomes=await Promise.allSettled(racers.map((u,i)=>(i%2?apiPeer:api).client(u).joinRoom({requestId:id(),code:race.code,invite:race.invite,name:'Guest'})));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,5);assert.equal(outcomes.filter(r=>r.status==='rejected'&&r.reason.code==='room-full').length,2);const r=await api.client(raceHost).room(race.code);assert.equal(r.seats.length,6);assert.equal(new Set(r.seats.map(s=>s.seat)).size,6);assert.equal(new Set(r.seats.map(s=>s.name)).size,6);assert.equal(r.revision,5)});
 const collisionUser=await account(),collisionApi=await serve(main,{generateCode:()=>race.code});
 await test('collision exhaustion leaves existing lobby intact',async()=>{const before=(await main.db.ref('skylineV2/rooms/'+race.code).once('value')).val();await denied(()=>collisionApi.client(collisionUser).createRoom({requestId:id(),name:'Clash',settings}),409,'room-code-collision');assert.deepEqual((await main.db.ref('skylineV2/rooms/'+race.code).once('value')).val(),before)});
 const limited=await account();let now=Date.now();const limitedApi=await serve(main,{operationLimit:2,clock:()=>now}),limitedClient=limitedApi.client(limited),firstId=id();let first;
 await test('server budget applies and retries do not charge twice',async()=>{first=await limitedClient.createRoom({requestId:firstId,name:'Limit',settings});assert.deepEqual(await limitedClient.createRoom({requestId:firstId,name:'Limit',settings}),first);await limitedClient.createRoom({requestId:id(),name:'Limit',settings});await denied(()=>limitedClient.createRoom({requestId:id(),name:'Limit',settings}),429,'rate-limited')});
 await test('server budget renews after its time window',async()=>{now+=60001;assert.ok((await limitedClient.createRoom({requestId:id(),name:'Limit',settings})).code)});
 const disabled=await account(),disabledClient=api.client(disabled),d=await disabledClient.createRoom({requestId:id(),name:'Disabled',settings});
 await test('disabled account cannot reuse an old token',async()=>{await main.auth.updateUser(disabled.uid,{disabled:true});await denied(()=>disabledClient.room(d.code),401,'unauthenticated')});

 const offlineUser=await account(),offlineApi=await serve(main,{readTimeoutMs:500}),offlineClient=offlineApi.client(offlineUser),offlineRoom=await offlineClient.createRoom({requestId:id(),name:'Offline',settings});
 await offlineClient.room(offlineRoom.code);
 await test('disconnected cached room cannot bypass a peer membership revocation',async()=>{
  main.db.goOffline();
  try{await apiPeer.client(offlineUser).leaveRoom({requestId:id(),code:offlineRoom.code});await denied(()=>offlineClient.room(offlineRoom.code),503,'temporarily-unavailable')}finally{main.db.goOnline()}
  await denied(()=>offlineClient.room(offlineRoom.code),403,'not-authorized');
 });

 await require('./asset-integration.cjs')({main,api,apiPeer,account,id,test,denied});
 await require('./roll-integration.cjs')({main,peer,api,apiPeer,account,id,test,denied,runtimes,createEmulatorRuntime});
 await require('./turn-integration.cjs')({main,peer,api,apiPeer,account,id,test,denied,runtimes,createEmulatorRuntime});
 await require('./end-integration.cjs')({main,peer,api,apiPeer,account,id,test,denied,runtimes,createEmulatorRuntime});
 console.log('ADMISSION SUMMARY',JSON.stringify({checks:report.checks.length,projectId:'demo-skyline-phase1',instances:2,liveDeployment:false}));
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{try{for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r))}for(const r of runtimes)await r.close()}finally{fs.writeFileSync(path.join(__dirname,'../service-results.json'),JSON.stringify(report,null,2)+'\n')}});
