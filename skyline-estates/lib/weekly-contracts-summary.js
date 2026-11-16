/* Read-only summary of EXISTING Skyline Estates weekly contracts.
 * This module neither stores progress nor awards coins/XP.
 * Host supplies weekly(), WEEKLY and loc() values from the existing game.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SkylineWeeklySummary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function summary(week,definitions,localize){
  if(!week||!Array.isArray(week.list)||!Array.isArray(definitions))throw Error('Existing weekly state required');
  const label=typeof localize==='function'?localize:x=>x;
  const entries=week.list.map(id=>{
   const d=definitions.find(x=>x.id===id);
   if(!d)return null;
   const goal=Number.isFinite(d.g)&&d.g>0?d.g:1;
   const raw=Number(week.prog&&week.prog[id]);
   const progress=Math.min(goal,Math.max(0,Number.isFinite(raw)?raw:0));
   const done=!!(week.done&&week.done[id]);
   return {id,title:String(label(d.n)),goal,progress:done?goal:progress,done};
  }).filter(Boolean);
  return {entries,completed:entries.filter(e=>e.done).length,total:entries.length};
 }
 function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function markup(data){
  if(!data||!Array.isArray(data.entries))throw Error('Weekly summary required');
  return '<span class="swc-title">Weekly contracts</span><span class="swc-count">'+data.completed+' / '+data.total+' complete</span>'+
   '<span class="swc-bars" aria-hidden="true">'+data.entries.map(e=>'<i style="width:'+Math.round(100*e.progress/e.goal)+'%"></i>').join('')+'</span>'+
   '<span class="swc-hint">'+(data.entries.find(e=>!e.done)?escapeHTML(data.entries.find(e=>!e.done).title):'All weekly contracts complete')+'</span>';
 }
 return Object.freeze({summary,markup});
});
