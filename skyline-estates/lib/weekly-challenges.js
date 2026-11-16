/* Skyline Estates weekly challenge foundation.
 * Pure logic: no wallet mutations, network access, UI changes or game-rule hooks.
 * Integrators must award rewards through the existing trusted reward pathway.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SkylineWeeklyChallenges=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DAY=86400000, WEEK=7*DAY;
  const OBJECTIVES=Object.freeze([
    Object.freeze({id:'matches',title:'Finish 3 matches',event:'match_completed',target:3,reward:{type:'coins',amount:30}}),
    Object.freeze({id:'properties',title:'Purchase 5 properties',event:'property_purchased',target:5,reward:{type:'coins',amount:25}}),
    Object.freeze({id:'duel',title:'Complete 2 Harbour Ring duels',event:'harbour_ring_completed',target:2,reward:{type:'coins',amount:25}})
  ]);
  // UTC Monday boundary: same week for all users; no device-locale dependence.
  function weekStart(time){
    if(!Number.isFinite(time))throw Error('Invalid timestamp');
    const d=new Date(time),day=d.getUTCDay(),midnight=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
    return midnight-((day+6)%7)*DAY;
  }
  function fresh(time){return {version:1,week:weekStart(time),counts:{matches:0,properties:0,duel:0},claimed:[]};}
  function normalize(value,time){
    const base=fresh(time);
    if(!value||value.version!==1||value.week!==base.week)return base;
    for(const o of OBJECTIVES){
      const n=value.counts&&value.counts[o.id];
      if(Number.isSafeInteger(n)&&n>=0)base.counts[o.id]=Math.min(n,o.target);
    }
    if(Array.isArray(value.claimed))base.claimed=OBJECTIVES.filter(o=>value.claimed.includes(o.id)&&base.counts[o.id]===o.target).map(o=>o.id);
    return base;
  }
  function record(value,event,time){
    const state=normalize(value,time);
    if(!event||typeof event!=='object'||event.eligible!==true)return state;
    for(const o of OBJECTIVES)if(o.event===event.type&&state.counts[o.id]<o.target)state.counts[o.id]++;
    return state;
  }
  function claim(value,id,time){
    const state=normalize(value,time),objective=OBJECTIVES.find(o=>o.id===id);
    if(!objective||state.counts[id]!==objective.target||state.claimed.includes(id))return {state,reward:null};
    state.claimed.push(id);
    return {state,reward:{...objective.reward,objectiveId:id,week:state.week}};
  }
  function view(value,time){
    const state=normalize(value,time);
    return {week:state.week,endsAt:state.week+WEEK,objectives:OBJECTIVES.map(o=>({...o,progress:state.counts[o.id],completed:state.counts[o.id]===o.target,claimed:state.claimed.includes(o.id)}))};
  }
  return Object.freeze({OBJECTIVES,weekStart,fresh,normalize,record,claim,view});
});
