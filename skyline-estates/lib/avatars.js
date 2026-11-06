/* Skyline Estates profile avatars: 25 portraits (avatars/avatars.json) replace the legacy character art.
   Avatars are visual only: no powers, prices or unlocks. Stable IDs avatar_01…avatar_25 are stored in the
   existing PREF.eq.char slot (the cloud profile already accepts any short ID), so profile sync, online
   seats and leaderboard rows carry them unchanged. Legacy character IDs are migrated once (the old ID is
   kept in PREF.charLegacy) and still resolve through aliases for older saves and other players.
   96 px PNGs are used for small badges and grid tiles; 256 px WebP for previews and high-DPR sizes. */
(()=>{'use strict';
 if(window.SkylineAvatars)return;
 const N=25,AV=Array.from({length:N},(_,i)=>{const n=String(i+1).padStart(2,'0');return{id:'avatar_'+n,name:'Avatar '+n,full:'avatars/full/skyline_avatar_'+n+'.webp',small:'avatars/small/skyline_avatar_'+n+'_96.png'}});
 const IDS=new Set(AV.map(a=>a.id));
 // Legacy character → closest new portrait (migration alias; never removed so old saves stay loadable).
 const LEGACY=Object.freeze({ava:'avatar_02',kofi:'avatar_10',mei:'avatar_09',diego:'avatar_08',amara:'avatar_04',nils:'avatar_05',ruby:'avatar_11',sofia:'avatar_15',yuki:'avatar_17',zara:'avatar_19',bolt:'avatar_13',omar:'avatar_16',rosa:'avatar_22',nova:'avatar_14'});
 const hash=s=>[...String(s)].reduce((a,c)=>(a*31+c.codePointAt(0))>>>0,7);
 const resolve=id=>IDS.has(id)?id:LEGACY[id]||(id?AV[hash(id)%N].id:'avatar_01');
 const byId=id=>AV.find(a=>a.id===resolve(id));
 // 3D riders still use the legacy rider models: map each avatar back to one.
 const RIDER={};Object.entries(LEGACY).forEach(([c,a])=>{RIDER[a]=RIDER[a]||c});
 const riderOf=id=>{if(!IDS.has(id))return id;if(RIDER[id])return RIDER[id];const ks=Object.keys(LEGACY);return ks[(parseInt(id.slice(7),10)-1)%ks.length]};
 const img=(a,size,cls='')=>`<img class="csvg av-img${cls}" src="${size*(window.devicePixelRatio||1)<=96?a.small:a.full}" srcset="${a.small} 96w, ${a.full} 256w" sizes="${size}px" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async" draggable="false">`;
 // ---- render + unlock hooks ----
 const unlocked0=charUnlocked;charUnlocked=function(id){return IDS.has(id)||unlocked0.apply(this,arguments)};
 charSVG=function(id,size=56){return img(byId(id),size)};
 if(typeof charModel==='function'){const cm=charModel;charModel=function(id,...r){return cm.call(this,riderOf(id),...r)}}
 // ---- legacy 3D character riders removed (models deleted): keep tokens unridden ----
 try{attachRider=function(){}}catch{}
 const hideRiderChips=()=>document.querySelectorAll('#sChips .rchip').forEach(c=>{const t=c.querySelector('b')?.textContent||'';if(t==='Riders on tokens'||t==='Realistic riders')c.remove()});
 // ---- migration ----
 let migrated=null;
 function migrate(){if(!PREF||!PREF.eq)return false;let ch=false;if(PREF.riders!==false||PREF.rig){PREF.riders=false;PREF.rig=false;ch=true}const c=PREF.eq.char;if(c&&IDS.has(c))return ch;
  const to=resolve(c||'ava');if(c)PREF.charLegacy=PREF.charLegacy||c;PREF.eq.char=to;migrated={from:c||null,to};return true}
 const sp=savePref;savePref=function(){try{migrate()}catch{}return sp.apply(this,arguments)};
 try{if(migrate())sp()}catch{}
 // ---- board player cards: small avatar badge on human players' token circle (token stays the identifier) ----
 const rr=renderRoster;renderRoster=function(){const r=rr.apply(this,arguments);try{if(!G||FAST)return r;
   for(const p of G.players){if(p.ai||!p.ch)continue;const t=document.querySelector('#pc'+p.id+' .pt');if(t&&!t.querySelector('.pav-badge')){const b=document.createElement('span');b.className='pav-badge';b.innerHTML=img(byId(p.ch),22);t.append(b)}}}catch{}return r};
 // ---- picker (Profile menu › Avatar & name) ----
 let pickerOpen=false;
 async function openPicker(){if(pickerOpen||document.querySelector('#modals .avpm'))return;pickerOpen=true;try{return await showPicker()}finally{pickerOpen=false}}
 async function showPicker(){let sel=resolve(myChar()),nm=myName()||'';
  const grid=AV.map(a=>`<button type="button" class="avp-t${a.id===sel?' on':''}" data-av="${a.id}" aria-pressed="${a.id===sel}" aria-label="${a.name}">${img(a,44)}</button>`).join('');
  await modal({cls:'avpm',html:`<div class="avp"><div class="avp-side"><div class="avp-prev">${img(byId(sel),72,' big')}</div><b class="avp-name">${byId(sel).name}</b>
   <label class="avp-lab">Name<input class="uname" maxlength="12" value="${esc(nm)}" autocomplete="off"></label><button type="button" class="avp-save">Save name</button></div>
   <div class="avp-main"><div class="mh">Choose your avatar</div><div class="avp-grid" role="group" aria-label="25 avatars">${grid}</div><small class="avp-note">Avatars are free and change only your look. Tokens and their powers are unchanged.</small></div></div>`,
   btns:[{k:'x',label:'Done',primary:true}],
   onMount:pn=>{const pick=id=>{sel=id;PREF.eq.char=id;savePref();try{railProfile()}catch{}pn.querySelectorAll('.avp-t').forEach(b=>{const on=b.dataset.av===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});pn.querySelector('.avp-prev').innerHTML=img(byId(id),72,' big');pn.querySelector('.avp-name').textContent=byId(id).name;try{sfx('tap')}catch{}};
    pn.querySelectorAll('.avp-t').forEach(b=>b.onclick=()=>pick(b.dataset.av));
    pn.querySelector('.avp-save').onclick=()=>{const v=pn.querySelector('.avp-lab input').value;if(setUsername(v)){try{railProfile()}catch{}toast('Name saved')}else toast('Use 2–12 letters or numbers')}}});
 }
 // Profile menu item (was "Characters & profile") opens the picker; the Characters tab stays removed.
 document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-profile-page="cast"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();try{document.querySelector('#rf-profile-menu')?.setAttribute('hidden','')}catch{}openPicker()},true);
 const relabel=()=>{hideRiderChips();document.querySelectorAll('[data-profile-page="cast"]').forEach(b=>{if(b.textContent!=='Avatar & name')b.textContent='Avatar & name'})};
 new MutationObserver(relabel).observe(document.documentElement,{childList:true,subtree:true});
 const ht=homeTab;homeTab=function(k){if(k==='cast'){openPicker();return}return ht.apply(this,arguments)};
 // Welcome step 1: offer the new portraits instead of the legacy characters (same buttons and handler).
 const md=modal;modal=function(o){if(o&&o.cls==='wlm'&&typeof o.html==='string'&&o.html.includes('class="wlchars"')){const cur=resolve(myChar());
   o={...o,html:o.html.replace(/<div class="wlchars">[\s\S]*?<\/div><\/div>$/,`<div class="wlchars avw">${AV.map(a=>`<button class="wlc${a.id===cur?' on':''}" data-c="${a.id}" aria-label="${a.name}">${img(a,40)}</button>`).join('')}</div></div>`)}}
  return md.apply(this,[o])};
 const st=document.createElement('style');st.textContent=`
#roster .pt{position:relative}#roster .pav-badge{position:absolute;right:-5px;bottom:-5px;width:22px;height:22px;border-radius:50%;overflow:hidden;border:2px solid #0e2638;box-shadow:0 1px 3px #0008;background:#0b2131}#roster .pav-badge img{width:100%;height:100%}
img.av-img{object-fit:cover;display:block;border-radius:inherit;image-rendering:auto;background:#0b2131}
.avpm .mp{max-width:min(560px,94vw)}
.avp{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;align-items:start}
.avp-side{display:grid;justify-items:center;gap:6px}.avp-prev{width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid #e2b13c;box-shadow:0 0 0 4px #e2b13c33}
.avp-name{font-size:12px}.avp-lab{display:grid;gap:3px;font-size:11px;width:100%}.avp-lab input{min-height:40px;width:100%;box-sizing:border-box}
.avp-save{min-height:40px;width:100%;border-radius:10px;border:1px solid #3d6075;background:#123049;color:#f2f5f7;font-weight:800;cursor:pointer}
.avp-grid{display:grid;grid-template-columns:repeat(auto-fill,44px);justify-content:start;gap:6px;max-height:min(46vh,240px);overflow-y:auto;padding:3px;-webkit-overflow-scrolling:touch}
.avp-t{width:44px;height:44px;padding:0;border-radius:50%;overflow:hidden;border:2px solid transparent;background:#0b2131;cursor:pointer}
.avp-t img{width:100%;height:100%}.avp-t.on{border-color:#f4d28b;box-shadow:0 0 0 2px #f4d28b66}
.avp-note{display:block;margin-top:6px;font-size:11px;opacity:.8}
@media (max-height:420px){.avp-grid{max-height:calc(100dvh - 150px)}.avp-prev{width:60px;height:60px}.avp-note{display:none}}
@media (max-width:560px){.avp{grid-template-columns:1fr}.avp-side{grid-template-columns:64px 1fr;justify-items:start;align-items:center}.avp-prev{width:60px;height:60px;grid-row:span 3}}
.wlchars.avw{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:8px;padding:4px 2px;justify-content:flex-start;max-width:100%}
.wlchars.avw .wlc{flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:0!important;min-height:0!important;aspect-ratio:1;padding:0;border-radius:50%;overflow:hidden}.wlchars.avw .wlc img{width:100%;height:100%}
html.light .avp-save{background:#fff;color:#13284a;border-color:#cfd8e2}`;document.head.append(st);
 window.SkylineAvatars=Object.freeze({AV,resolve,openPicker,LEGACY,migrated:()=>migrated});
})();
