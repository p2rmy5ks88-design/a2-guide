// Coordinates the acknowledged service state. Never executes local game rules.
const fail=code=>{throw Object.assign(Error(code),{code})};
const copy=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v)}return x}
function valid(view,code){
 if(view?.protocol!==2||view.code!==code||!Number.isSafeInteger(view.revision)||view.revision<0||!['playing','over'].includes(view.status))fail('invalid-game-view');
 const g=view.game,n=g?.players?.length;
 if(g?.v!==1||g.tokenPowerVersion!=null&&![2,3].includes(g.tokenPowerVersion)||g.code!==code||g.online!==true||!Number.isInteger(n)||n<2||n>6||!Number.isInteger(view.seat)||view.seat<0||view.seat>=n||!Number.isInteger(view.actorSeat)||view.actorSeat<0||view.actorSeat>=n||!Number.isInteger(g.turn)||g.turn<0||g.turn>=n||typeof view.stage!=='string'||typeof g.over!=='boolean'||!Array.isArray(g.own)||g.own.length!==40||g.players.some((p,i)=>p.id!==i||!Number.isSafeInteger(p.cash)||p.cash<0||!Number.isInteger(p.pos)||p.pos<0||p.pos>39||typeof p.name!=='string')||view.decision&&view.actorSeat!==view.seat)fail('invalid-game-view');
 let houses=g.houses,hotels=g.hotels;if(!Number.isInteger(houses)||houses<0||!Number.isInteger(hotels)||hotels<0)fail('invalid-game-view');
 for(const o of g.own){if(!Number.isInteger(o.o)||o.o< -1||o.o>=n||!Number.isInteger(o.h)||o.h<0||o.h>5||typeof o.m!=='boolean')fail('invalid-game-view');if(o.h===5)hotels++;else houses+=o.h}
 if(houses!==36||hotels!==12)fail('invalid-game-view');return freeze(copy(view));
}
export function createGameController({client,code,onView=()=>{},onState=()=>{}}){
 if(typeof code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(code||'')||typeof client?.read!=='function'||typeof client?.mutate!=='function'||typeof onView!=='function'||typeof onState!=='function')fail('invalid-controller');
 let view=null,closed=false,busy=false,epoch=0,applyQueue=Promise.resolve();
 function active(){if(closed)fail('session-closed')}
 function state(){return{busy,needsRecovery:!!client.pending(),view}}
 function notify(){active();onState(state())}
 async function refresh(){
  active();const captured=epoch,loaded=valid(await client.read('readGame',{code}),code);
  const next=applyQueue.catch(()=>{}).then(async()=>{active();if(captured!==epoch)fail('session-closed');
   if(view&&loaded.revision<view.revision)return view;
   if(view&&loaded.revision===view.revision){if(JSON.stringify(loaded)!==JSON.stringify(view))fail('inconsistent-game-view');return view}
   await onView(loaded);active();if(captured!==epoch)fail('session-closed');view=loaded;return view;
  });applyQueue=next;const result=await next;notify();return result;
 }
 async function task(fn){active();if(busy)fail('operation-in-flight');busy=true;notify();try{return await fn()}finally{busy=false;if(!closed)notify()}}
 function actor(){if(!view)fail('game-not-loaded');if(view.status!=='playing'||view.game.over)fail('game-already-ended');if(view.actorSeat!==view.seat||view.game.players[view.seat].ai||view.game.players[view.seat].bankrupt)fail('not-your-turn');if(client.pending())fail('operation-needs-recovery')}
 async function commit(action,fields,revision){const sent=await client.mutate(action,{code,revision,...fields},{track:true});active();await refresh();active();await client.complete(sent.requestId);return sent.receipt}
 const methods={roll:['reserveRoll','recoverRoll','commitRoll','pre'],jail:['reserveJailRoll','recoverJailRoll','commitJailRoll','jail'],reroll:['reserveReroll','recoverReroll','commitReroll','reroll']};
 return{
  refresh,snapshot:()=>view,status:()=>state(),
  act:(action,fields={},expectedRevision=view?.revision)=>task(async()=>{
   actor();if(expectedRevision!==view.revision)fail('stale-control');if(!fields||typeof fields!=='object'||Array.isArray(fields)||['code','revision','requestId'].some(k=>Object.hasOwn(fields,k)))fail('invalid-control');
   if(!['assetAction','purchaseAsset','choose','auctionBid','debtAction','endTurn','proposeTrade','replyTrade'].includes(action))fail('unsupported-control');
   return commit(action,fields,view.revision);
  }),
  roll:(kind='roll',expectedRevision=view?.revision)=>task(async()=>{
   actor();const m=methods[kind];if(!m||expectedRevision!==view.revision||view.stage!==m[3])fail('stale-control');
   const revision=view.revision;let plan;
   try{plan=await client.read(m[1],{code,revision})}catch(e){if(e.status!==404||e.code!=='roll-not-reserved')throw e}
   active();
   if(!plan){const sent=await client.mutate(m[0],{code,revision},{track:true});plan=sent.receipt;active();await client.complete(sent.requestId)}
   if(plan?.code!==code||plan.revision!==revision||typeof plan.planId!=='string'||!/^[a-f0-9]{64}$/.test(plan.planId))fail('invalid-service-response');
   // Recovery finds an existing reserved plan; it never asks for replacement dice.
   return commit(m[2],{planId:plan.planId},revision);
  }),
  recover:()=>task(async()=>{
   const pending=client.pending();if(!pending)return refresh();if(pending.body.code!==code)fail('another-room-operation-pending');
   const result=await client.reconcile(pending.body.requestId);active();await refresh();active();await client.complete(pending.body.requestId);return result;
  }),
  close(){if(closed)return;closed=true;epoch++;client.close()}
 };
}
