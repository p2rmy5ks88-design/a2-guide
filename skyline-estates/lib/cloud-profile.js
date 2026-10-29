/* Unified cloud profile sync engine (client). The game keeps playing from its
   local save; this engine measures differences against the last state the server
   is known to hold, queues them as idempotent operations in a per-account outbox,
   and shows "server value + unsent local changes". It never uploads a balance as
   truth and never merges device progress without the player's choice.
   Game-specific mapping lives in an adapter (see cloud-glue.js). */
(function(scope){
'use strict';
const VERSION=1,MAX_OUTBOX=200,KEY='skylineCloud.v1.',MIGRATE_KEY='skylineCloud.v1.pendingMigration';
const RETRYABLE=new Set(['unauthenticated','rate-limited','unavailable','network','deletion-not-configured']);
function emptyState(){return{coins:0,xp:0,items:{},max:{},flags:{},eq:{}}}
function norm(s){
 const o=emptyState();if(!s)return o;
 o.coins=Number.isSafeInteger(s.coins)?s.coins:0;o.xp=Number.isSafeInteger(s.xp)?s.xp:0;
 for(const [k,ids] of Object.entries(s.items||{}))o.items[k]=[...new Set(ids)].sort();
 for(const [f,vals] of Object.entries(s.max||{})){o.max[f]={};for(const [k,v] of Object.entries(vals||{}))if(Number.isSafeInteger(v)&&v>=0)o.max[f][k]=v}
 for(const [ns,keys] of Object.entries(s.flags||{}))o.flags[ns]=[...new Set(keys)].sort();
 for(const [slot,id] of Object.entries(s.eq||{}))o.eq[slot]=id??null;
 return o;
}
function fromProfile(p){const s=emptyState();if(!p)return s;s.coins=p.coins|0;s.xp=p.xp|0;
 for(const [k,bag] of Object.entries(p.inv||{}))s.items[k]=Object.keys(bag).sort();
 for(const [f,bag] of Object.entries(p.max||{}))s.max[f]={...bag};
 for(const [ns,bag] of Object.entries(p.flags||{}))s.flags[ns]=Object.keys(bag).sort();
 s.eq={...(p.eq||{})};return s}
// Local changes since `before` (both normalized). Returns null when nothing changed.
function diff(now,before){
 const c={};let any=false;
 const dc=now.coins-before.coins;if(dc){c.coins=dc;any=true}
 const dx=now.xp-before.xp;if(dx>0){c.xp=dx;any=true}
 for(const [k,ids] of Object.entries(now.items)){const had=new Set(before.items[k]||[]),add=ids.filter(id=>!had.has(id));if(add.length){(c.items||={})[k]=add;any=true}}
 for(const [f,vals] of Object.entries(now.max)){for(const [k,v] of Object.entries(vals)){if(v>((before.max[f]||{})[k]??-1)){((c.max||={})[f]||={})[k]=v;any=true}}}
 for(const [ns,keys] of Object.entries(now.flags)){const had=new Set(before.flags[ns]||[]),add=keys.filter(k=>!had.has(k));if(add.length){(c.flags||={})[ns]=add;any=true}}
 for(const [slot,id] of Object.entries(now.eq))if((before.eq[slot]??null)!==(id??null)){(c.eq||={})[slot]=id??null;any=true}
 return any?c:null;
}
function mergeChanges(a,b){
 const c=structuredClone(a);
 if(b.coins)c.coins=(c.coins||0)+b.coins;if(b.xp)c.xp=(c.xp||0)+b.xp;
 for(const [k,ids] of Object.entries(b.items||{}))((c.items||={})[k]=[...new Set([...(c.items?.[k]||[]),...ids])]);
 for(const [f,vals] of Object.entries(b.max||{})){const t=((c.max||={})[f]||={});for(const [k,v] of Object.entries(vals))t[k]=Math.max(t[k]??0,v)}
 for(const [ns,keys] of Object.entries(b.flags||{}))((c.flags||={})[ns]=[...new Set([...(c.flags?.[ns]||[]),...keys])]);
 if(b.eq){c.eq={...(c.eq||{}),...b.eq};c.eqRev=b.eqRev}
 c.reasons=[...(c.reasons||[]),...(b.reasons||[])].slice(-20);c.promos=[...new Set([...(c.promos||[]),...(b.promos||[])])].slice(0,5);
 if(!c.reasons.length)delete c.reasons;if(!c.promos.length)delete c.promos;if(c.coins===0)delete c.coins;
 return c;
}
// Server value + still-unsent local operations.
function target(profile,outbox){
 const t=fromProfile(profile);let eqRev=profile?.eqRev||0;
 for(const op of outbox){const c=op.changes;t.coins+=c.coins||0;t.xp+=c.xp||0;
  for(const [k,ids] of Object.entries(c.items||{}))t.items[k]=[...new Set([...(t.items[k]||[]),...ids])].sort();
  for(const [f,vals] of Object.entries(c.max||{})){const bag=t.max[f]||={};for(const [k,v] of Object.entries(vals))bag[k]=Math.max(bag[k]??0,v)}
  for(const [ns,keys] of Object.entries(c.flags||{}))t.flags[ns]=[...new Set([...(t.flags[ns]||[]),...keys])].sort();
  if(c.eq&&c.eqRev>eqRev){t.eq={...t.eq,...c.eq};eqRev=c.eqRev}}
 t.coins=Math.max(0,t.coins);return t;
}
function createCloudProfile({storage,http,account,adapter,ask=async()=>null,notify=()=>{},clock=Date.now,randomId,setTimer=null}){
 if(!storage||!http||typeof account!=='function'||!adapter)throw Error('Cloud profile dependencies required');
 const rid=randomId||(()=>{const b=new Uint8Array(18);(scope.crypto||require('node:crypto').webcrypto).getRandomValues(b);return 'c'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')});
 const read=k=>{try{const v=storage.getItem(k);return v?JSON.parse(v):null}catch{return null}};
 const write=(k,v)=>{try{if(v==null)storage.removeItem(k);else storage.setItem(k,JSON.stringify(v));return true}catch{return false}};
 let running=null,declined=new Set(),journal={reasons:[],promos:[]},lastFetch=0;
 const stateOf=uid=>uid?read(KEY+uid):null;
 const saveState=st=>write(KEY+st.uid,st);
 // Record local differences into the owner's outbox. Works while signed out/offline.
 function capture(){
  const owner=adapter.owner();if(!owner)return null;const st=stateOf(owner);if(!st?.migrated||!st.shadow)return null;
  const now=norm(adapter.extract()),c=diff(now,norm(st.shadow));
  if(!c&&!journal.promos.length)return null;
  const changes=c||{};if(journal.reasons.length)changes.reasons=journal.reasons.slice(-20);if(journal.promos.length)changes.promos=journal.promos.slice(0,5);
  if(changes.eq)changes.eqRev=Math.max(clock(),(st.profile?.eqRev||0)+1);
  journal={reasons:[],promos:[]};
  const last=st.outbox.at(-1);
  if(st.outbox.length>=MAX_OUTBOX&&last&&!last.sent)last.changes=mergeChanges(last.changes,changes);
  else st.outbox.push({requestId:rid(),changes,tries:0,nextAt:0,sent:false});
  st.shadow=now;saveState(st);return changes;
 }
 function reconcile(st){
  if(!st.profile)return;const t=target(st.profile,st.outbox);
  adapter.apply(t,{debt:st.profile.debt||0});st.shadow=norm(adapter.extract());saveState(st);
 }
 function failure(e){return e?.code||(e?.status>=500?'unavailable':'network')}
 // Local changes may be captured while a request is in flight (capture runs on every save), so
 // the stored state is re-read after every await and never overwritten from a stale copy.
 async function flush(acct,_st,{refresh=false}={}){
  const uid=acct.uid,fresh=()=>stateOf(uid);let changed=false;const done=new Set();
  for(;;){
   const st=fresh();if(!st)return;const op=st.outbox.find(o=>!done.has(o.requestId));if(!op||op.nextAt>clock())break;
   done.add(op.requestId);op.sent=true;saveState(st);
   try{const r=await http.request('POST','/v1/profile/sync',{requestId:op.requestId,changes:op.changes},acct.token);
    const now=fresh();if(!now)return;now.outbox=now.outbox.filter(o=>o.requestId!==op.requestId);now.profile=r.profile;saveState(now);changed=true;
    for(const n of r.notes||[])notify('note',n);
   }catch(e){const code=failure(e),now=fresh();if(!now)return;
    if(code==='account-removed'){detach(now);notify('account-removed');return}
    const o=now.outbox.find(x=>x.requestId===op.requestId);
    if(RETRYABLE.has(code)||e?.status>=500||!e?.status){if(o){o.tries++;o.nextAt=clock()+Math.min(300000,2000*2**Math.min(o.tries,8))}saveState(now);notify('offline',code);break}
    now.outbox=now.outbox.filter(x=>x.requestId!==op.requestId);saveState(now);notify('dropped',code);changed=true}
  }
  if(!changed&&(refresh||clock()-lastFetch>300000)&&!(fresh()?.outbox.length)){
   try{const p=await http.request('GET','/v1/profile',null,acct.token),now=fresh();if(!now)return;
    // A capture during the read means the profile may be older than local changes; reconcile adds them back from the outbox.
    now.profile=p;saveState(now);lastFetch=clock();changed=true}
   catch(e){const code=failure(e);if(code==='account-removed'){const now=fresh();if(now)detach(now);notify('account-removed');return}notify('offline',code)}
  }
  if(changed){const now=fresh();if(now)reconcile(now)}
 }
 function detach(st){write(KEY+st.uid,null);if(adapter.owner()===st.uid)adapter.setOwner(null)}
 async function onboard(acct){
  if(declined.has(acct.uid))return;
  let pending=read(MIGRATE_KEY);if(pending&&pending.uid!==acct.uid){pending=null;write(MIGRATE_KEY,null)}
  if(!pending){
   const profile=await http.request('GET','/v1/profile',null,acct.token),owner=adapter.owner();
   const kind=owner&&owner!==acct.uid?'switch':profile.migrated?'merge':'first';
   const choice=await ask(kind,profile);
   if(!['import','cloud-only'].includes(choice)||kind==='switch'&&choice!=='cloud-only'){declined.add(acct.uid);return}
   const snap=norm(adapter.extract());
   pending={uid:acct.uid,requestId:rid(),mode:choice,snapshot:choice==='import'?{coins:Math.max(0,snap.coins),xp:Math.max(0,snap.xp),items:snap.items,max:snap.max,flags:snap.flags,eq:snap.eq,eqRev:Math.max(1,clock())}:undefined};
   if(!write(MIGRATE_KEY,pending))throw Object.assign(Error('storage-unavailable'),{code:'storage-unavailable'});
  }
  const body={requestId:pending.requestId,mode:pending.mode};if(pending.snapshot)body.snapshot=pending.snapshot;
  const r=await http.request('POST','/v1/profile/migrate',body,acct.token);
  // Keep the whole device save before it is replaced by the account's state.
  adapter.backup(pending.mode==='import'&&r.mode==='first'?'moved-to-account':'before-account');
  const st={v:VERSION,uid:acct.uid,migrated:true,profile:r.profile,outbox:[],shadow:null};
  adapter.setOwner(acct.uid);saveState(st);write(MIGRATE_KEY,null);
  reconcile(st);notify('migrated',{mode:r.mode,coins:r.coins,notes:r.notes||[]});
 }
 // A call made while a sync is running waits for it and then runs again, so changes made
 // after the running sync captured its state are never reported as synced too early.
 async function sync(options={}){
  if(running)return running.then(()=>sync(options));
  running=(async()=>{
   const acct=await account();if(!acct?.uid||!acct?.token)return{state:'signed-out'};
   if(adapter.owner()!==acct.uid||!stateOf(acct.uid)?.migrated){await onboard(acct);if(adapter.owner()!==acct.uid)return{state:'local'}}
   capture();const st=stateOf(acct.uid);await flush(acct,st,options);return{state:'synced',pending:stateOf(acct.uid)?.outbox.length||0};
  })().catch(e=>{notify('error',failure(e));return{state:'error',code:failure(e)}}).finally(()=>{running=null});
  return running;
 }
 return{
  capture,sync,
  reason(why){if(typeof why==='string'&&why)journal.reasons.push(why.slice(0,60))},
  promo(code){if(typeof code==='string'&&code)journal.promos.push(code.slice(0,40));return capture()},
  forgetDecline(uid){declined.delete(uid)},
  status(){const owner=adapter.owner(),st=stateOf(owner);return{owner,migrated:!!st?.migrated,pending:st?.outbox?.length||0,profile:st?.profile||null}},
  // Called after the server has removed the account.
  detach(uid){const st=stateOf(uid);if(st)detach(st);else if(adapter.owner()===uid)adapter.setOwner(null)}
 };
}
const api={createCloudProfile,diff,norm,target,mergeChanges,fromProfile};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.SkylineCloudEngine=api;
})(typeof window!=='undefined'?window:globalThis);
