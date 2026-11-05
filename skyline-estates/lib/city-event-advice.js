/* Task 09: city Strategic Events and Market Pulse say what the event means for the local player:
   streets owned there, streets they can build on, rivals' exposure and unowned streets. Text only:
   no rule, price, AI or protocol change. */
(()=>{'use strict';
 if(window.SkylineEventAdvice)return;
 function me(){if(!G||!G.players)return null;const humans=G.players.filter(p=>!p.ai&&!p.bankrupt&&(!G.online||p.uid===NET.me));
  const cur=G.players[G.turn];return humans.includes(cur)?cur:humans[0]||null}
 function advice(e,p=me()){
  if(!e||!p||!Array.isArray(e.targets))return '';
  const props=e.targets.filter(i=>SQ[i]&&SQ[i].t==='prop'),n=props.length,all=e.group==null;
  const mine=props.filter(i=>G.own[i].o===p.id),rivals=props.filter(i=>G.own[i].o>=0&&G.own[i].o!==p.id),free=props.filter(i=>G.own[i].o<0);
  const build=props.filter(i=>{try{return canBuild(p.id,i)}catch{return false}}).length,where=all?'':' here';
  const bits=[];
  if(e.kind==='rent'&&e.pct>0){
   if(mine.length)bits.push(`you own ${mine.length} of ${n}${where}: rent you collect +${e.pct}%`);
   if(rivals.length)bits.push(`landing on rivals' ${rivals.length===1?'street':'streets'}${where} costs ${e.pct}% more`);
   if(free.length)bits.push(`${free.length} unowned: buy one to share the boost`);
  }else if(e.kind==='rent'){
   if(mine.length)bits.push(`you own ${mine.length} of ${n}${where}: rent you collect ${e.pct}%`);
   if(rivals.length)bits.push(`cheaper to land on rivals' streets${where}`);
  }else{
   if(build)bits.push(`you can build on ${build} ${build===1?'street':'streets'}${where} at ${e.pct}% off now`);
   else if(mine.length)bits.push(`you own ${mine.length} of ${n}${where}: complete the district to use the discount`);
   if(rivals.length&&!build)bits.push('rivals here build cheaper; watch their towers');
   if(!mine.length&&!rivals.length&&free.length)bits.push('no owners yet; the discount needs a complete district');
  }
  if(!bits.length)bits.push(`no streets${where} affect you yet`);
  const t=bits.join(' · ');return 'For '+(p.name||'you')+': '+t[0].toLowerCase()+t.slice(1);
 }
 const active=()=>{try{return ev2Active()}catch{return null}};
 // Banner: one extra line under the effect, for the few seconds it shows.
 const banner=ev2Banner;ev2Banner=function(e){banner.apply(this,arguments);const b=[...document.querySelectorAll('.ev2ban')].pop(),a=advice(e);
  if(b&&a&&!b.querySelector('.ev2you')){const s=document.createElement('small');s.className='ev2you';s.textContent=a;b.append(s)}};
 // Chip: full advice on hover / long-press and for screen readers; the visible chip stays compact.
 const chip=ev2Chip;ev2Chip=function(){chip.apply(this,arguments);const c=document.querySelector('#ev2chip'),e=active();
  if(!c)return;const a=e?advice(e):'';if(a){c.title=a;c.setAttribute('aria-label',c.textContent.trim()+'. '+a)}else{c.removeAttribute('title');c.removeAttribute('aria-label')}};
 // Info dialog (Strategic Events and Market Pulse): personal line at the top.
 const modalBefore=modal;modal=function(o){const e=active();
  if(e&&o&&typeof o.html==='string'&&/\bev2modal\b/.test(o.cls||'')&&o.html.includes('<div class="mtxt">')&&!o.html.includes('mp-verdict')){
   const a=advice(e);if(a)o={...o,html:o.html.replace('<div class="mtxt">',`<div class="mtxt"><p class="ev2you">${esc(a)}</p>`)}}
  return modalBefore.apply(this,[o])};
 const st=document.createElement('style');st.textContent='.ev2ban .ev2you{display:block;margin-top:3px;font-size:12px;color:#ffe2a3;line-height:1.3}.ev2modal .ev2you,.mpmodal .mp-verdict{padding:8px 10px;border-radius:10px;background:#123049;border:1px solid #c9a85a;color:#f4e3b5}html.light .ev2modal .ev2you,html.light .mpmodal .mp-verdict{background:#fff7e3;color:#5a4108;border-color:#d9b25a}.mpmodal .mp-rules{font-size:12px;opacity:.8}';document.head.append(st);
 window.SkylineEventAdvice=Object.freeze({advice});
})();
