// Headless Skyline runtime: the shipped game core (index.html inline script, i.e. game.html + reviewed hotfixes) plus
// the gameplay rule libraries, in a Node VM with a universal DOM stub. Same code as the iOS/Android/web app, no UI.
// Used by the authoritative Living City engine (lc-engine.cjs) and by tests/living-city-parity.cjs.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const RULE_LIBS=['lib/market-pulse.js','lib/ai-styles.js','lib/living-city-rules.js'];
function readSources(root){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const core=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!/src=/.test(m[1]))[0][2];
  return{core,libs:RULE_LIBS.map(l=>[l,fs.readFileSync(path.join(root,l),'utf8')])}}
function sourceHash(src){const h=crypto.createHash('sha256').update(src.core);for(const [l,s] of src.libs)h.update(l).update(s);return h.digest('hex')}
function createRuntime(src,{beforeLibs='',afterLibs=''}={}){
  const handler={get(t,k){if(k===Symbol.toPrimitive)return()=>'';if(k==='then')return undefined;if(k in t)return t[k];return stub()},apply(){return stub()},construct(){return stub()},set(t,k,v){t[k]=v;return true}};
  function stub(){return new Proxy(function(){},handler)}
  const store=new Map(),ctx={console:{log(){},warn(){},error(){},info(){}},Math:Object.create(Math),JSON,Date,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,performance:{now:()=>0},
    localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:()=>null,length:0},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    crypto:crypto.webcrypto,navigator:{userAgent:'skyline-rules-server',language:'en',languages:['en']},location:{search:'',hash:'',href:'https://server/',protocol:'https:',hostname:'server'},
    document:stub(),Image:function(){return stub()},Audio:function(){return stub()},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),getComputedStyle:()=>stub(),
    innerWidth:844,innerHeight:390,devicePixelRatio:1,fetch:()=>new Promise(()=>{}),MutationObserver:function(){return{observe(){},disconnect(){}}},ResizeObserver:function(){return{observe(){},disconnect(){}}},
    addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},URL,URLSearchParams,TextEncoder,TextDecoder,structuredClone,queueMicrotask,Promise};
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  vm.runInContext(src.core,ctx,{filename:'game-core.js'});
  if(beforeLibs)vm.runInContext(beforeLibs,ctx,{filename:'adapter-core.js'});
  for(const [l,s] of src.libs)vm.runInContext(s,ctx,{filename:l});
  if(afterLibs)vm.runInContext(afterLibs,ctx,{filename:'adapter-rules.js'});
  return{ctx,run:(code)=>vm.runInContext(code,ctx)}}
module.exports={RULE_LIBS,readSources,sourceHash,createRuntime};
