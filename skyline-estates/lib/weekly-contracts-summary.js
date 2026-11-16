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
 function mount(container,week,definitions,localize,navigate){
  if(!container||!container.ownerDocument||typeof navigate!=='function')throw Error('Weekly summary mount needs container and navigation');
  const data=summary(week,definitions,localize);
  if(!data.total)return null;
  const doc=container.ownerDocument;
  let style=doc.getElementById('sky-weekly-summary-css');
  if(!style){style=doc.createElement('style');style.id='sky-weekly-summary-css';style.textContent='.swc-home{display:flex;flex-direction:column;gap:4px;min-width:0;max-width:320px;width:100%;padding:9px 12px;border-radius:12px;border:1px solid #c9a75a88;background:#0c2436ee;color:#f6f1df;text-align:left;cursor:pointer;font:600 11px/1.25 system-ui,sans-serif}.swc-home:focus-visible{outline:3px solid #fff;outline-offset:2px}.swc-title{font-weight:800;font-size:12px;color:#f2cf78}.swc-count{font-size:11px}.swc-bars{display:flex;gap:4px}.swc-bars:empty{display:none}.swc-bars i{display:block;height:4px;max-width:100%;border-radius:4px;background:#f2c457;min-width:2px}.swc-hint{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d4e0ea}@media(max-height:500px) and (orientation:landscape){.swc-home{max-width:230px;padding:6px 9px}.swc-hint{display:none}}';doc.head.append(style);}
  const button=doc.createElement('button');button.type='button';button.className='swc-home';button.setAttribute('aria-label','Weekly contracts, '+data.completed+' of '+data.total+' complete. View contracts');
  button.innerHTML=markup(data);
  button.addEventListener('click',navigate);
  container.append(button);
  return button;
 }
 return Object.freeze({summary,markup,mount});
});
