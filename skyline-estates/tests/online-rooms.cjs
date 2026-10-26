// Exercises extracted production online code with a deterministic in-memory REST endpoint.
// No Firebase project, credentials, live rooms or network access are used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),source=process.env.SOURCE_REF?cp.execFileSync('git',['show',process.env.SOURCE_REF+':skyline-estates/game.html'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'skyline-estates/game.html'),'utf8');
function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i);return source.slice(i,j)}
const production=section('const FIRE=(()=>','const SHARE_URL=')+section('function genCode(){','function pushState(){')+section('async function createOnline(){','/* games the player removed');
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function fixture(){
 const records=new Map(),calls=[],opened=[],messages=[],storage=new Map();let forced=[],randomByte=0,unauthorized=false,denied=false,offline=false;
 const crypto={getRandomValues(a){for(let i=0;i<a.length;i++)a[i]=(randomByte++)&255;return a}},math=Object.create(Math);math.random=()=>{throw Error('Math.random must not generate room codes')};
 const ctx={console,Map,Set,Uint8Array,Math:math,Date,JSON,Promise,encodeURIComponent,setTimeout,clearTimeout,crypto,window:{EKO_FIREBASE:{apiKey:'test-key',databaseURL:'https://isolated.invalid'}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setup:{slots:[{tok:'car'}]},PREF:{nick:'Host'},TOKENS:['car'],SEATCOL:['gold'],NET:{me:'host',backend:'firebase'},myName:()=> 'Host',cleanName:s=>s,seatExtras:()=>({}),cfgSet:()=>({mode:'classic'}),lobby:(code,ref)=>opened.push(code),toast:s=>messages.push(s)};
 ctx.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET',body=options.body===undefined?undefined:options.headers?.['Content-Type']==='application/x-www-form-urlencoded'?options.body:JSON.parse(options.body);calls.push({url:u.href,method,headers:options.headers||{},body});
  if(offline)throw Error('network unavailable');
  if(u.pathname.endsWith('/accounts:signUp'))return response(200,{idToken:'token',refreshToken:'refresh',localId:'host',expiresIn:'3600'});
  if(u.pathname.endsWith('/token'))return response(200,{id_token:'renewed',refresh_token:'refresh',user_id:'host',expires_in:'3600'});
  const key=decodeURIComponent(u.pathname.slice(1,-5));
  if(denied)return response(403,{error:'denied'});if(unauthorized){unauthorized=false;return response(401,{error:'expired'})}
  const current=records.get(key);
  if(method==='PUT'){
   if(options.headers?.['if-match']==='null_etag'&&current!=null)return response(412,current);
   records.set(key,clone(body));return response(200,body);
  }
  if(method==='GET')return response(200,current||null);throw Error('unexpected request '+method);
 };
 function response(status,value){return{status,ok:status>=200&&status<300,headers:{get:()=>null},json:async()=>clone(value),text:async()=>JSON.stringify(value)}}
 vm.createContext(ctx);vm.runInContext(production+'\nNET.db=FIRE.db;globalThis.api=FIRE;',ctx);
 const generate=ctx.genCode;ctx.genCode=()=>forced.length?forced.shift():generate();
 return{ctx,records,calls,opened,messages,force:codes=>forced.push(...codes),deny:()=>denied=true,offline:()=>offline=true,expire:()=>unauthorized=true,create:async()=>{await ctx.createOnline();await new Promise(setImmediate)}};
}
const checks=[];async function test(name,fn){await fn();checks.push(name);console.log('PASS',name)}
(async()=>{
 await test('existing room survives a forced code collision',async()=>{const f=fixture(),old={host:'other',status:'playing',s:'do not overwrite'};f.records.set('games/AAAAA',old);f.force(['AAAAA','BBBBB']);await f.create();assert.deepEqual(f.records.get('games/AAAAA'),old);assert.deepEqual(f.opened,['BBBBB'])});
 await test('creation uses a conditional PUT and indexes only the winning code',async()=>{const f=fixture();f.records.set('games/AAAAA',{host:'other'});f.force(['AAAAA','BBBBB']);await f.create();const puts=f.calls.filter(x=>new URL(x.url).pathname.startsWith('/games/')&&x.method==='PUT');assert.equal(puts.length,2);assert.ok(puts.every(x=>x.headers['if-match']==='null_etag'));assert.equal(f.records.has('usr/host/AAAAA'),false);assert.equal(f.records.has('usr/host/BBBBB'),true)});
 await test('two concurrent creators cannot replace each other',async()=>{const f=fixture();f.force(['AAAAA','AAAAA','BBBBB']);await Promise.all([f.create(),f.create()]);assert.deepEqual(f.opened.slice().sort(),['AAAAA','BBBBB']);assert.equal(f.records.get('games/AAAAA').code,'AAAAA');assert.equal(f.records.get('games/BBBBB').code,'BBBBB')});
 await test('collision exhaustion is bounded and opens no lobby',async()=>{const f=fixture();f.records.set('games/AAAAA',{host:'other'});f.force(Array(8).fill('AAAAA'));await f.create();assert.equal(f.calls.filter(x=>x.method==='PUT'&&new URL(x.url).pathname.startsWith('/games/')).length,8);assert.equal(f.records.get('games/AAAAA').host,'other');assert.equal(f.opened.length,0);assert.ok(f.messages.length)});
 await test('permission denial is surfaced without unsafe retry',async()=>{const f=fixture();f.deny();await f.create();assert.equal(f.records.size,0);assert.equal(f.opened.length,0);assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);assert.ok(f.messages.length)});
 await test('network failure does not open a phantom room',async()=>{const f=fixture();f.offline();await f.create();assert.equal(f.records.size,0);assert.equal(f.opened.length,0);assert.ok(f.messages.length)});
 await test('expired authentication retains conditional protection on retry',async()=>{const f=fixture();await f.ctx.api.token();f.expire();f.force(['AAAAA']);await f.create();const puts=f.calls.filter(x=>new URL(x.url).pathname==='/games/AAAAA.json');assert.equal(puts.length,2);assert.ok(puts.every(x=>x.headers['if-match']==='null_etag'));assert.deepEqual(f.opened,['AAAAA'])});
 await test('room codes use secure bytes and retain the approved five-character alphabet',async()=>{const f=fixture(),counts={};for(let i=0;i<256;i++){const s=f.ctx.genCode();assert.match(s,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);for(const c of s)counts[c]=(counts[c]||0)+1}assert.equal(Object.keys(counts).length,32);assert.ok(Object.values(counts).every(n=>n===40))});
 await test('missing secure randomness fails without an insecure fallback',async()=>{const f=fixture();f.ctx.crypto=undefined;await f.create();assert.equal(f.records.size,0);assert.equal(f.opened.length,0);assert.ok(f.messages.length)});
 await test('successful room preserves lobby metadata, rules and host seat',async()=>{const f=fixture();f.force(['ABCDE']);await f.create();const d=f.records.get('games/ABCDE');assert.equal(d.ed,'sk');assert.equal(d.status,'lobby-sk');assert.equal(d.host,'host');assert.deepEqual(d.seatIds,['host']);assert.equal(d.seats[0].uid,'host');assert.equal(d.set.mode,'classic');assert.equal(d.seq,0)});
 await test('conditional create returns false for occupied paths',async()=>{const f=fixture();f.records.set('games/ABCDE',{host:'other'});assert.equal(await f.ctx.api.db.doc('games/ABCDE').create({host:'host'}),false);assert.equal(f.records.get('games/ABCDE').host,'other')});
 await test('alternate online backend retains its existing create behavior',async()=>{const f=fixture();f.ctx.NET.backend='claude';f.ctx.NET.db={doc:code=>({set:async d=>f.records.set(code,clone(d))})};f.force(['ABCDE']);await f.create();assert.deepEqual(f.opened,['ABCDE']);assert.equal(f.records.get('games/ABCDE').host,'host')});
 if(!process.env.SOURCE_REF){const page=fs.readFileSync(path.join(root,'skyline-estates/index.html'),'utf8').replace(/\r\n/g,'\n');assert.ok(page.includes(production.slice(0,production.indexOf('function genCode')) .replace(/\r\n/g,'\n')))}
 console.log(`${checks.length} online room regression checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
