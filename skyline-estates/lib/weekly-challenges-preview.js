/* Weekly Challenges preview panel — intentionally read-only.
 * Not installed in game.html until real, verified events and durable claims exist.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SkylineWeeklyPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function format(view){
    if(!view||!Array.isArray(view.objectives))throw Error('Missing weekly challenge view');
    return '<section class="sky-weekly" aria-label="Weekly challenges preview">'+
      '<header class="sky-weekly-head"><strong>Weekly Challenges</strong><span>Preview · rewards not active</span></header>'+
      '<div class="sky-weekly-list">'+view.objectives.map(o=>{
        const target=Math.max(1,Number(o.target)||1),progress=Math.max(0,Math.min(target,Number(o.progress)||0));
        const pct=Math.round(100*progress/target);
        return '<article class="sky-weekly-item"><div class="sky-weekly-line"><b>'+escapeHTML(o.title)+'</b><span>'+progress+'/'+target+'</span></div>'+
          '<div class="sky-weekly-track" role="progressbar" aria-label="'+escapeHTML(o.title)+'" aria-valuemin="0" aria-valuemax="'+target+'" aria-valuenow="'+progress+'"><i style="width:'+pct+'%"></i></div>'+
          '<small>'+(o.claimed?'Claimed (preview)':o.completed?'Completed (preview)':'Keep playing')+'</small></article>';
      }).join('')+'</div></section>';
  }
  const css='.sky-weekly{max-width:420px;padding:14px;border:1px solid #39516c;border-radius:16px;background:#101e35;color:#f5f7fc;font:14px system-ui,sans-serif}.sky-weekly-head,.sky-weekly-line{display:flex;justify-content:space-between;align-items:center;gap:12px}.sky-weekly-head span,.sky-weekly-item small{color:#bdcce0;font-size:11px}.sky-weekly-list{display:grid;gap:12px;margin-top:14px}.sky-weekly-item{display:grid;gap:6px}.sky-weekly-line span{font-variant-numeric:tabular-nums}.sky-weekly-track{height:7px;border-radius:9px;background:#30445d;overflow:hidden}.sky-weekly-track i{display:block;height:100%;background:#f2c457;border-radius:9px}';
  function mount(container,view){
    if(!container||typeof container.innerHTML!=='string')throw Error('Missing container');
    const doc=container.ownerDocument;
    if(!doc.getElementById('sky-weekly-preview-css')){const st=doc.createElement('style');st.id='sky-weekly-preview-css';st.textContent=css;doc.head.append(st);}
    container.innerHTML=format(view);
  }
  return Object.freeze({format,mount,preview:true});
});
