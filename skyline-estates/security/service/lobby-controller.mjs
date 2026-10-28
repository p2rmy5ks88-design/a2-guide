// Opt-in acknowledged waiting room. Does not create rooms or run local game rules.
const fail=code=>{throw Object.assign(Error(code),{code})},copy=x=>JSON.parse(JSON.stringify(x));
const safeUid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze)}return x}
function valid(v,code,uid){
 if(v?.protocol!==2||v.code!==code||!Number.isSafeInteger(v.revision)||v.revision<0||!['lobby','playing','over'].includes(v.status)||typeof v.startSupported!=='boolean'||!safeUid(v.hostUid)||!v.settings||typeof v.settings!=='object'||Array.isArray(v.settings)||!Array.isArray(v.seats)||v.seats.length<1||v.seats.length>6)fail('invalid-lobby-view');
 const ids=new Set(),positions=new Set();
 for(const s of v.seats){if(!safeUid(s.uid)||ids.has(s.uid)||!Number.isInteger(s.seat)||s.seat<0||s.seat>5||positions.has(s.seat)||typeof s.name!=='string'||s.name.length>80||typeof s.tok!=='string'||s.tok.length>16||!Number.isInteger(s.tl)||s.tl<1||s.tl>6||s.fin!=null&&(typeof s.fin!=='string'||s.fin.length>40)||s.ch!=null&&(typeof s.ch!=='string'||s.ch.length>40))fail('invalid-lobby-view');ids.add(s.uid);positions.add(s.seat)}
 if(!ids.has(uid)||!ids.has(v.hostUid))fail('invalid-lobby-view');return freeze(copy(v));
}
export function createLobbyController({client,code,uid,onView=()=>{},onState=()=>{}}){
 if(!safeUid(uid)||typeof code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(code)||typeof client?.read!=='function'||typeof client?.mutate!=='function'||typeof client?.pending!=='function'||typeof onView!=='function'||typeof onState!=='function')fail('invalid-lobby-controller');
 let view=null,closed=false,busy=false,fresh=false,epoch=0,queue=Promise.resolve();
 const active=()=>{if(closed)fail('session-closed')};
 function state(){const p=client.pending();return{view,busy,fresh,needsRecovery:!!p&&p.body.code===code&&['startGame','selectSeat'].includes(p.action),otherRoomOperation:!!p&&p.body.code!==code}}
 const notify=()=>{active();onState(state())};
 async function refresh(){active();const captured=epoch;try{const loaded=valid(await client.read('readLobby',{code}),code,uid);
  const task=queue.catch(()=>{}).then(async()=>{active();if(captured!==epoch)fail('session-closed');if(view&&loaded.revision<view.revision)return view;
   if(view&&loaded.revision===view.revision){if(JSON.stringify(loaded)!==JSON.stringify(view))fail('inconsistent-lobby-view');fresh=true;return view}
   await onView(loaded);active();if(captured!==epoch)fail('session-closed');view=loaded;fresh=true;return view;
  });queue=task;const result=await task;notify();return result;
 }catch(e){fresh=false;if(!closed)notify();throw e}}
 async function task(fn){active();if(busy)fail('operation-in-flight');busy=true;notify();try{return await fn()}finally{busy=false;if(!closed)notify()}}
 function editable(revision){if(!view||!fresh)fail('lobby-not-loaded');if(view.status!=='lobby')fail('lobby-not-open');if(revision!==view.revision)fail('stale-control');if(client.pending())fail('operation-needs-recovery')}
 async function commit(action,fields){const sent=await client.mutate(action,{code,revision:view.revision,...fields},{track:true});active();await refresh();active();await client.complete(sent.requestId);return sent.receipt}
 return{refresh,snapshot:()=>view,status:()=>state(),
  select:(selection,revision=view?.revision)=>task(async()=>{editable(revision);if(!selection||Object.keys(selection).sort().join(',')!=='ch,fin,tok'||typeof selection.tok!=='string'||selection.tok.length>16||selection.fin!==null&&(typeof selection.fin!=='string'||selection.fin.length>40)||selection.ch!==null&&(typeof selection.ch!=='string'||selection.ch.length>40))fail('invalid-selection');return commit('selectSeat',{selection:copy(selection)})}),
  start:(revision=view?.revision)=>task(async()=>{editable(revision);if(view.hostUid!==uid)fail('host-required');if(!view.startSupported)fail('setup-not-enabled');if(view.seats.length<2)fail('two-players-required');return commit('startGame',{})}),
  recover:()=>task(async()=>{const p=client.pending();if(!p)return refresh();if(p.body.code!==code)fail('another-room-operation-pending');if(!['startGame','selectSeat'].includes(p.action))fail('game-operation-needs-recovery');const result=await client.reconcile(p.body.requestId);active();await refresh();active();await client.complete(p.body.requestId);return result}),
  close({closeClient=true}={}){if(closed)return;closed=true;epoch++;if(closeClient)client.close()}
 };
}
