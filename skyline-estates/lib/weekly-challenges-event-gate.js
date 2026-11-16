/* Weekly event gate: explicit source contract for preview progress.
 * This is NOT authoritative anti-cheat validation or a reward grant.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SkylineWeeklyEventGate=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ALLOWED=Object.freeze({
   match_completed:['classic_offline','living_city_offline'],
   property_purchased:['classic_offline','living_city_offline'],
   harbour_ring_completed:['harbour_ring_cpu']
 });
 const SAFE_ID=/^[a-zA-Z0-9:_-]{1,128}$/;
 function validate(input){
   if(!input||typeof input!=='object'||Array.isArray(input))return null;
   const {type,source,id,completed,practice,playerIsHuman}=input;
   if(!Object.prototype.hasOwnProperty.call(ALLOWED,type)||!ALLOWED[type].includes(source))return null;
   if(typeof id!=='string'||!SAFE_ID.test(id)||completed!==true||practice===true||playerIsHuman!==true)return null;
   return Object.freeze({id:type+':'+source+':'+id,type,eligible:true});
 }
 function accept(adapter,input){
   const event=validate(input);
   if(!event)return {accepted:false,reason:'ineligible'};
   if(!adapter||typeof adapter.record!=='function')throw Error('Weekly progress adapter required');
   const result=adapter.record(event);
   return {accepted:result.changed===true&&result.persisted===true,reason:result.persisted===false?'storage_unavailable':result.changed===false?'duplicate_or_capped':'recorded',result};
 }
 return Object.freeze({ALLOWED,validate,accept});
});
