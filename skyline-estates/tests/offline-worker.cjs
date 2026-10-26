const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'sw.js'),'utf8');let count=0;
const scope='https://example.test/a2-guide/skyline-estates/',prefix='skyline-estates-offline:'+scope+':';
function fixture({failInstall=false,failStorage=false}={}){
  const handlers={},stores=new Map(),deleted=[],requested=[];let claimed=0,skipped=0,network=0;
  const key=x=>typeof x==='string'?x:x.url;
  function bucket(name){if(!stores.has(name))stores.set(name,new Map());return stores.get(name)}
  const cache=name=>({addAll:async requests=>{requested.push(...requests);if(failInstall)throw Error('download failed');for(const req of requests)bucket(name).set(key(req),new Response('cached'))},match:async req=>bucket(name).get(key(req))?.clone(),put:async(req,response)=>bucket(name).set(key(req),response)});
  const self={location:{href:scope+'sw.js'},SKYLINE_OFFLINE:{version:'v1',files:['./index.html','./art/coin.png']},clients:{claim:async()=>claimed++},skipWaiting:()=>skipped++,addEventListener:(name,fn)=>handlers[name]=fn};
  const ctx={self,URL,Request,Response,console:{warn(){}},importScripts(){},caches:{open:async name=>{if(failStorage)throw Error('storage denied');bucket(name);return cache(name)},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name)}},fetch:async()=>{network++;return new Response('network')}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  async function event(name){let pending;handlers[name]({waitUntil:p=>pending=p});await pending}
  async function fetchEvent(url,{method='GET',mode='cors'}={}){let pending;handlers.fetch({request:{url,method,mode},respondWith:p=>pending=p});return pending===undefined?null:await pending}
  return{ctx,self,stores,bucket,deleted,requested,event,fetchEvent,stats:()=>({claimed,skipped,network})};
}
async function test(name,fn){await fn();count++;console.log('PASS',name)}
(async()=>{
  await test('install caches only the declared local assets with revalidation',async()=>{const f=fixture();await f.event('install');assert.equal(f.requested.length,2);assert.ok(f.requested.every(r=>r.url.startsWith(scope)&&r.cache==='reload'));assert.equal(f.stats().skipped,0)});
  await test('failed candidate install cannot remove the current cache',async()=>{const f=fixture({failInstall:true});f.bucket(prefix+'v0').set(scope+'index.html',new Response('old'));await assert.rejects(f.event('install'));assert.ok(f.stores.has(prefix+'v0'));assert.deepEqual(f.deleted,[prefix+'v1'])});
  await test('activation deletes obsolete caches for this app only',async()=>{const f=fixture();f.bucket(prefix+'v0');f.bucket(prefix+'v1');f.bucket('other-app');f.bucket('skyline-estates-offline:https://example.test/other/:v0');await f.event('activate');assert.deepEqual(f.deleted,[prefix+'v0']);assert.equal(f.stats().claimed,1);assert.ok(f.stores.has('other-app'))});
  await test('root navigation uses the cached game shell without network',async()=>{const f=fixture();await f.event('install');const r=await f.fetchEvent(scope,{mode:'navigate'});assert.equal(await r.text(),'cached');assert.equal(f.stats().network,0)});
  await test('index and query navigation use the same cached shell',async()=>{const f=fixture();await f.event('install');for(const url of [scope+'index.html',scope+'?test=1'])assert.equal(await(await f.fetchEvent(url,{mode:'navigate'})).text(),'cached');assert.equal(f.stats().network,0)});
  await test('declared art assets are served from the offline cache',async()=>{const f=fixture();await f.event('install');assert.equal(await(await f.fetchEvent(scope+'art/coin.png')).text(),'cached')});
  await test('writes are never intercepted',async()=>{const f=fixture();assert.equal(await f.fetchEvent(scope+'index.html',{method:'POST'}),null)});
  await test('API, query assets and unknown URLs are never cached',async()=>{const f=fixture();for(const url of [scope+'room-state.json',scope+'art/coin.png?token=test',scope+'missing.html'])assert.equal(await f.fetchEvent(url),null)});
  await test('neighbouring apps and external services are untouched',async()=>{const f=fixture();for(const url of ['https://example.test/a2-guide/other/index.html','https://api.example.test/rooms'])assert.equal(await f.fetchEvent(url,{mode:'navigate'}),null)});
  await test('online fetch still works if cache storage is unavailable',async()=>{const f=fixture({failStorage:true});assert.equal(await(await f.fetchEvent(scope,{mode:'navigate'})).text(),'network')});
  await test('a missing declared resource is fetched and retained',async()=>{const f=fixture();assert.equal(await(await f.fetchEvent(scope+'art/coin.png')).text(),'network');assert.equal(await(await f.fetchEvent(scope+'art/coin.png')).text(),'network');assert.equal(f.stats().network,1)});
  const game=fs.readFileSync(path.join(root,'game.html'),'utf8'),a=game.indexOf('function registerOffline(){'),b=game.indexOf('/* ================= BOOT',a),client=game.slice(a,b);
  function registration({native=false,desktop=false,secure=true}={}){const calls=[],ctx={IS_APP:native,window:{SKYLINE_DESKTOP:desktop,isSecureContext:secure},navigator:{serviceWorker:{register:(url,opts)=>{calls.push({url,opts});return Promise.resolve()}}},document:{readyState:'complete'},console:{warn(){}},addEventListener(){}};vm.createContext(ctx);vm.runInContext(client,ctx);return calls}
  await test('native wrappers and insecure pages skip web-worker registration',()=>{for(const opts of [{native:true},{desktop:true},{secure:false}])assert.equal(registration(opts).length,0)});
  await test('web registration is scoped locally and checks imported updates',()=>{const calls=registration();assert.equal(calls.length,1);assert.equal(calls[0].url,'./sw.js');assert.equal(calls[0].opts.scope,'./');assert.equal(calls[0].opts.updateViaCache,'none')});
  console.log(`${count} offline worker checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
