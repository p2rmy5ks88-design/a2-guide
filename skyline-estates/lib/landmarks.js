/* Collection › Landmarks (replaces Frames and the Rooftops panel).
   Every city has three landmarks earned by playing there — Bronze: 1 win · Silver: 3 wins ·
   Gold: City Champion (all City Awards) — read from the existing per-city stats, so players keep
   what they already earned. Country sets (every Bronze in a country) pay a one-time reward.
   Converted, never deleted: Champion frames = Gold landmarks; Gala/Prism/Crown frames = Wonders;
   Rooftops bought or won = display plinths for the showcase (buildings use the standard roof).
   Compact layout sized for iPhone landscape and upright. No prices: landmarks are never sold. */
(()=>{'use strict';
 if(window.SkylineLandmarks)return;
 const TIER={bronze:{c:'#c98a52',label:'Bronze',need:'1 win'},silver:{c:'#c9d4de',label:'Silver',need:'3 wins'},gold:{c:'#e2b13c',label:'Gold',need:'City Champion'}};
 const PLINTH={'':{name:'Stone plinth',c:'#8a97a3'},garden:{name:'Garden Plinth',c:'#4f9a5c'},solar:{name:'Solar Plinth',c:'#2f6fb0'},pool:{name:'Pool Plinth',c:'#2fb4c8'},crown:{name:'Crown Plinth',c:'#d9a845'}};
 // Rooftops become plinths: rename in place so Spotlight and every existing label follow.
 for(const r of ROOFS){const p=PLINTH[r.id];r.name=p?p.name:r.name.replace(/Rooftop |Roof\b/g,'').trim()+' Plinth';r.desc='A display plinth for your Landmarks showcase.';if(!p)PLINTH[r.id]={name:r.name,c:r.rc||'#c9a85a'}}
 roofOf=function(){return null}; // buildings in matches use the standard roof
 const wins=c=>(PREF.cstat&&PREF.cstat[c]&&PREF.cstat[c].wins)||0;
 const awards=c=>{try{return cityDone(c)}catch{return 0}};
 const kindOf=n=>/bridge/i.test(n)?'bridge':/mosque|cathedral|church|dome|temple|palace|hall/i.test(n)?'dome':/rock|hill|mount/i.test(n)?'rock':/road|way|street|junction|interchange|gate|avenue/i.test(n)?'gate':'plaza';
 function marks(c){const C=CITY_DATA[c];if(!C)return[];const top=(C.props[20]||C.props[C.props.length-1])[0];
  return[{city:c,tier:'bronze',name:C.free,kind:kindOf(C.free),have:wins(c)>=1,prog:`${Math.min(1,wins(c))}/1 win`},
   {city:c,tier:'silver',name:C.traffic,kind:kindOf(C.traffic)==='plaza'?'gate':kindOf(C.traffic),have:wins(c)>=3,prog:`${Math.min(3,wins(c))}/3 wins`},
   {city:c,tier:'gold',name:top,kind:'tower',have:!!(PREF.champ&&PREF.champ[c]),prog:`${awards(c)}/${CT.length} City Awards`}]}
 const WONDERS=[['gala','Gala Tower','Premium Season pass, tier 40'],['prism','Prism Spire','Champion of 5 cities'],['crown','Crown Pavilion','Champion of every city']]
  .map(([id,name,how])=>({city:'',tier:'gold',name,kind:'wonder',wonder:id,how}));
 const wonderHave=w=>{try{return !!frameDef(w.wonder).own}catch{return false}};
 const SETS_KEY='lmSets';
 function checkSets(){let won=null;PREF[SETS_KEY]=PREF[SETS_KEY]||{};
  for(const C of COUNTRIES){if(PREF[SETS_KEY][C.key])continue;if(C.cities.every(c=>wins(c)>=1)){PREF[SETS_KEY][C.key]=Date.now();
   if(!(PREF.inv.fin&&PREF.inv.fin.gold))grantItem('fin','gold');addCoins(500,`${C.name} landmark set`);won=C}}
  if(won){savePref();try{toast(`${won.flag||''} ${won.name} landmark set complete! +500 Coins`)}catch{}}}
 // Champion frame reveals become a short landmark toast.
 frameReveal=function(){if(!PREF.frameNew||!PREF.frameNew.length)return;const ids=PREF.frameNew.splice(0);savePref();
  const c=ids.map(i=>String(i)).find(i=>i.startsWith('c:'));try{toast(c?`New Gold landmark: ${marks(c.slice(2))[2].name}`:'New Wonder landmark unlocked')}catch{}};
 const SVG={plaza:'M6 28 L34 28 L30 22 L10 22 Z M18 22 L18 8 L20 3 L22 8 L22 22 Z',bridge:'M3 26 Q10 14 17 26 Q24 14 31 26 Q35 20 37 26 L37 28 L3 28 Z',
  gate:'M7 28 L7 9 L12 9 L12 28 Z M28 28 L28 9 L33 9 L33 28 Z M5 9 Q20 -1 35 9 L35 12 Q20 4 5 12 Z',tower:'M14 28 L14 10 L17 6 L17 2 L19 2 L19 6 L22 10 L22 28 Z M24 28 L24 16 L30 16 L30 28 Z M8 28 L8 18 L12 18 L12 28 Z',
  dome:'M8 28 L8 20 Q20 4 32 20 L32 28 Z M19 8 L21 8 L20 3 Z',rock:'M4 28 Q8 10 18 8 Q30 6 36 28 Z',wonder:'M16 28 L16 12 L20 2 L24 12 L24 28 Z M10 28 L10 18 L14 15 L14 28 Z M26 28 L26 15 L30 18 L30 28 Z'};
 const icon=(m,have,w=34,h=28)=>`<svg width="${w}" height="${h}" viewBox="0 0 40 33" aria-hidden="true"><path d="${SVG[m.kind]}" fill="${have?TIER[m.tier].c:'#1d3a4e'}" stroke="${have?'#ffffff88':'#3d6075'}" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="20" cy="30.5" rx="15" ry="2.4" fill="${have?plinth().c:'#24465a'}"/></svg>`;
 const plinthId=()=>{const r=PREF.eq&&PREF.eq.roof;return r&&roofOwned(r)?r:''};
 const plinth=()=>PLINTH[plinthId()]||PLINTH[''];
 const S={country:null,sel:null};
 function countryNow(){if(S.country)return S.country;const k=(setup&&setup.city)||'lagos';return (COUNTRIES.find(C=>C.cities.includes(k))||COUNTRIES[0]).key}
 // ---- 3D showcase (shared renderer; SVG fallback) ----
 const V={T:null,r:null,scene:null,cam:null,obj:null,raf:0,key:''};
 async function three(){if(V.T)return V.T;try{V.T=await import('./three.module.min.js')}catch{try{V.T=await import('./lib/three.module.min.js')}catch{V.T=null}}return V.T}
 function model(T,m,have){const g=new T.Group(),col=have?TIER[m.tier].c:'#29465c',mat=c=>new T.MeshStandardMaterial({color:c,roughness:.55,metalness:have&&m.tier!=='bronze'?.35:.1});
  const add=(geo,c,x,y,z,ry=0)=>{const o=new T.Mesh(geo,mat(c));o.position.set(x,y,z);o.rotation.y=ry;g.add(o);return o};
  add(new T.CylinderGeometry(1.25,1.4,.28,40),plinth().c,0,-.14,0);
  const b=(w,h,d,x,z,c=col)=>add(new T.BoxGeometry(w,h,d),c,x,h/2,z);
  if(m.kind==='plaza'){b(1.6,.08,1.6,0,0,'#d8d2c4');b(.18,1.1,.18,0,0);add(new T.ConeGeometry(.13,.25,4),col,0,1.22,0);[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]].forEach(([x,z])=>b(.1,.35,.1,x,z))}
  else if(m.kind==='bridge'){b(2.2,.08,.32,0,0,'#dfe9f5');[-.8,0,.8].forEach(x=>b(.1,.9,.1,x,0));for(const x of[-.8,0,.8])for(const s of[-1,1]){const c=add(new T.CylinderGeometry(.015,.015,.75,6),'#9cc0da',x+s*.28,.5,0);c.rotation.z=s*.75}}
  else if(m.kind==='gate'){b(.22,1,.3,-.55,0);b(.22,1,.3,.55,0);const a=add(new T.TorusGeometry(.55,.09,10,24,Math.PI),col,0,1,0)}
  else if(m.kind==='dome'){b(1.2,.5,1.2,0,0);add(new T.SphereGeometry(.48,24,12,0,Math.PI*2,0,Math.PI/2),col,0,.5,0);add(new T.ConeGeometry(.05,.3,8),col,0,1.1,0)}
  else if(m.kind==='rock'){const r=add(new T.DodecahedronGeometry(.75,1),have?'#a07a55':col,0,.5,0);r.scale.set(1.2,.85,1)}
  else{b(.4,1.5,.4,0,0);add(new T.ConeGeometry(.2,.4,8),col,0,1.7,0);b(.3,1,.3,-.42,.15);b(.3,.75,.3,.42,-.1);if(m.kind==='wonder')add(new T.TorusGeometry(.32,.04,8,32),'#f4d28b',0,1.3,0).rotation.x=Math.PI/2}
  return g}
 async function showcase(host,m,have){const T=await three(),cv=host.querySelector('canvas'),fb=host.querySelector('.lmk-fb');if(!T||!cv){if(fb)fb.hidden=false;return}
  try{if(!V.r){V.r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true});V.scene=new T.Scene();V.cam=new T.PerspectiveCamera(32,1,.1,50);V.cam.position.set(0,1.5,4.6);V.cam.lookAt(0,.6,0);
    V.scene.add(new T.HemisphereLight('#ffffff','#1a2c3a',1.6));const d=new T.DirectionalLight('#ffe7b0',1.4);d.position.set(2,4,3);V.scene.add(d)}
   else if(V.r.domElement!==cv){V.r.dispose();V.r=null;return showcase(host,m,have)}
   const w=cv.clientWidth||220,h=cv.clientHeight||130;V.r.setPixelRatio(Math.min(2,devicePixelRatio||1));V.r.setSize(w,h,false);V.cam.aspect=w/h;V.cam.updateProjectionMatrix();
   if(V.obj)V.scene.remove(V.obj);V.obj=model(T,m,have);V.scene.add(V.obj);
   const still=matchMedia('(prefers-reduced-motion: reduce)').matches;cancelAnimationFrame(V.raf);
   const tick=()=>{if(!cv.isConnected){cancelAnimationFrame(V.raf);return}if(!document.hidden){if(!still)V.obj.rotation.y+=.012;V.r.render(V.scene,V.cam)}V.raf=requestAnimationFrame(tick)};
   V.obj.rotation.y=-.5;tick();if(fb)fb.hidden=true}catch{if(fb)fb.hidden=false}}
 // ---- pane ----
 function playIn(c){if(!cityUnlocked(c)){toast(`Unlock ${CITY_DATA[c].name} first in Change City`);return}setup.city=c;PREF.city=c;savePref();try{applyTheme(c)}catch{}homeTab('play');toast(`${CITY_DATA[c].name} selected. Tap Play Solo`)}
 function pane(T){try{clearPreview();peekOver(null)}catch{}checkSets();
  const ck=countryNow(),C=COUNTRIES.find(x=>x.key===ck)||COUNTRIES[0],cities=C.cities.filter(c=>CITY_DATA[c]);
  const rows=cities.map(c=>({c,ms:marks(c)})),bronze=rows.filter(r=>r.ms[0].have).length,setDone=!!(PREF[SETS_KEY]&&PREF[SETS_KEY][C.key]);
  const wonders=WONDERS.map(w=>({...w,have:wonderHave(w),prog:w.how}));
  const all=[...rows.flatMap(r=>r.ms),...wonders];
  if(!S.sel||!all.some(m=>m.name===S.sel.name&&m.city===S.sel.city))S.sel=rows.flatMap(r=>r.ms).find(m=>!m.have)||all[0];
  const sel=all.find(m=>m.name===S.sel.name&&m.city===S.sel.city)||all[0];
  const tile=m=>`<button class="lmk-tile${m.have?' have':''}${m===sel?' on':''}" data-lm="${esc(m.city)}|${esc(m.name)}" aria-pressed="${m===sel}" aria-label="${esc(m.name)}, ${TIER[m.tier].label}, ${m.have?'earned':'needs '+esc(m.prog)}">${icon(m,m.have)}<span><b>${esc(m.name)}</b><small>${m.have?TIER[m.tier].label+' ✓':esc(m.city?TIER[m.tier].need:m.prog)}</small></span></button>`;
  const owned=Object.keys((PREF.inv&&PREF.inv.roof)||{}).filter(id=>PLINTH[id]);
  const city=sel.city?CITY_DATA[sel.city].name:'Wonder';
  const next=sel.city?marks(sel.city).find(m=>!m.have):null;
  T.innerHTML=`<div class="lmk">
   <section class="lmk-show" aria-label="Landmark showcase">
    <div class="lmk-top"><b>${esc(city)} · ${TIER[sel.tier].label}</b><small>${sel.have?'Earned':'Locked'}</small></div>
    <div class="lmk-stage"><canvas aria-hidden="true"></canvas><div class="lmk-fb" hidden>${icon(sel,sel.have,150,124)}</div></div>
    <h3>${esc(sel.name)}</h3>
    <p>${sel.have?(sel.city?`Earned in ${esc(city)}`:esc(sel.how)):`Needs ${esc(sel.city?TIER[sel.tier].need:sel.how)} · ${esc(sel.prog)}`}</p>
    ${next&&next.name!==sel.name?`<p class="lmk-next">Next: <b>${esc(next.name)}</b> · ${esc(next.prog)}</p>`:''}
    <div class="lmk-acts">${sel.city?`<button class="lmk-play" data-lm-play="${esc(sel.city)}">Play in ${esc(city)}</button>`:''}
     <label class="lmk-plinth">Plinth <select aria-label="Showcase plinth"><option value="">Stone</option>${owned.map(id=>`<option value="${id}"${plinthId()===id?' selected':''}>${esc(PLINTH[id].name.replace(' Plinth',''))}</option>`).join('')}</select></label></div>
   </section>
   <section class="lmk-list" aria-label="Landmarks by city">
    <div class="lmk-head"><label class="lmk-country">Country <select aria-label="Country">${COUNTRIES.map(x=>`<option value="${x.key}"${x.key===C.key?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
     <div class="lmk-set" title="Earn every Bronze landmark in ${esc(C.name)}"><span class="lmk-bar"><i style="width:${Math.round(bronze/cities.length*100)}%"></i></span><small>${setDone?'Set complete ✓':`${bronze}/${cities.length} → +500 Coins`}</small></div></div>
    ${rows.map(r=>`<div class="lmk-city"><div class="lmk-cn"><b>${esc(CITY_DATA[r.c].name)}</b><small>${wins(r.c)} win${wins(r.c)===1?'':'s'}</small></div><div class="lmk-tiles">${r.ms.map(tile).join('')}</div></div>`).join('')}
    <div class="lmk-city"><div class="lmk-cn"><b>Wonders</b><small>special</small></div><div class="lmk-tiles">${wonders.map(tile).join('')}</div></div>
   </section></div>`;
  T.querySelectorAll('[data-lm]').forEach(b=>b.onclick=()=>{const[c,n]=b.dataset.lm.split('|');S.sel={city:c,name:n};const y=T.querySelector('.lmk-list').scrollTop;pane(T);T.querySelector('.lmk-list').scrollTop=y;T.querySelector('.lmk-tile.on')?.focus({preventScroll:true})});
  T.querySelector('.lmk-country select').onchange=e=>{S.country=e.target.value;S.sel=null;pane(T)};
  T.querySelector('.lmk-plinth select').onchange=e=>{PREF.eq.roof=e.target.value||null;savePref();pane(T)};
  T.querySelector('[data-lm-play]')?.addEventListener('click',e=>playIn(e.currentTarget.dataset.lmPlay));
  clearNav(T);showcase(T.querySelector('.lmk-stage'),sel,sel.have)}
 // Landscape Collection floats its tab bar over the left column: start the list below it.
 function clearNav(T){const l=T.querySelector('.lmk-list'),n=document.querySelector('#pane>.subtabs');if(!l)return;l.style.marginTop='';if(!n)return;const a=n.getBoundingClientRect(),b=l.getBoundingClientRect();
  if(a.height&&a.right>b.left+4&&a.left<b.right-4&&a.bottom>b.top)l.style.marginTop=Math.ceil(a.bottom-b.top+6)+'px'}
 addEventListener('resize',()=>{const T=document.querySelector('.lmk')?.parentElement;if(T)requestAnimationFrame(()=>clearNav(T))});
 paneFrames=pane;
 // Buildings tab: drop the old Rooftops panel.
 const pb=paneBuildings;paneBuildings=function(T){const r=pb.apply(this,arguments);T.querySelectorAll('.rf-roofs-panel,.roofs').forEach(n=>n.remove());return r};
 // Tab label: Frames → Landmarks.
 const relabel=()=>{const b=document.querySelector('#pane>.subtabs [data-s="frames"]');if(b&&!/Landmarks/.test(b.textContent)){const s=b.querySelector('span');if(s)s.textContent='Landmarks';else b.textContent='Landmarks';b.setAttribute('aria-label','Landmarks')}};
 const ht=homeTab;homeTab=function(){const r=ht.apply(this,arguments);try{relabel()}catch{}return r};
 const st=document.createElement('style');st.textContent=`
.lmk{display:grid;grid-template-columns:minmax(0,1fr) 232px;grid-template-areas:"list show";gap:8px;height:100%;min-height:0;box-sizing:border-box;padding-bottom:calc(58px + env(safe-area-inset-bottom,0px));font-family:inherit}
.lmk-show{grid-area:show;display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:14px;background:radial-gradient(120% 80% at 50% 30%,#173d57,#0a1f2e);border:1px solid #c9a85a;color:#f2f5f7;min-height:0;overflow:auto}
.lmk-top{display:flex;justify-content:space-between;font-size:10px;letter-spacing:.06em;text-transform:uppercase}.lmk-top b{color:#f4d28b}.lmk-top small{color:#a9c1cc}
.lmk-stage{position:relative;height:118px;flex:none}.lmk-stage canvas{width:100%;height:100%;display:block}.lmk-fb{position:absolute;inset:0;display:grid;place-items:center}
.lmk-show h3{margin:0;font-size:15px;line-height:1.2;color:#fff}.lmk-show p{margin:0;font-size:11px;line-height:1.3;color:#cfe0e7}.lmk-show .lmk-next{color:#ffd59a}
.lmk-acts{display:flex;gap:6px;margin-top:auto;padding-top:4px;align-items:center}
.lmk-play{flex:1 1 auto;min-height:40px;border-radius:11px;border:1px solid #f6dc95;background:linear-gradient(180deg,#f3d27e,#d9a845);color:#1a1406;font:800 12.5px Manrope,system-ui;cursor:pointer}
.lmk-plinth,.lmk-country{display:flex;align-items:center;gap:4px;font-size:10.5px;color:#a9c1cc}.lmk-plinth select{max-width:96px}.lmk-plinth select,.lmk-country select{min-height:40px;border-radius:10px;border:1px solid #3d6075;background:#0b2131;color:#f2f5f7;font:700 12px Manrope,system-ui;padding:0 6px;max-width:130px}
.lmk-list{grid-area:list;display:flex;flex-direction:column;gap:5px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:0;padding-right:2px}
.lmk-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:1;background:#0b1f2e;padding-bottom:4px}
.lmk-set{flex:1 1 120px;display:flex;align-items:center;gap:6px;min-width:0}.lmk-set small{font-size:10.5px;color:#f4d28b;white-space:nowrap}
.lmk-bar{flex:1;height:7px;border-radius:4px;background:#24465a;overflow:hidden}.lmk-bar i{display:block;height:100%;background:linear-gradient(90deg,#e2b13c,#f4d28b)}
.lmk-city{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:11px;background:#0b2131;border:1px solid #2f5166}
.lmk-cn{width:74px;flex:none;display:grid}.lmk-cn b{font-size:12.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lmk-cn small{font-size:10px;color:#a9c1cc}
.lmk-tiles{flex:1;min-width:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.lmk-tile{display:flex;align-items:center;gap:3px;min-width:0;min-height:42px;padding:2px 4px;border-radius:9px;border:1px dashed #3d6075;background:#08192699;color:#f2f5f7;text-align:left;cursor:pointer;font:inherit}
.lmk-tile.have{border:1px solid #4d6f85;background:#123049}.lmk-tile.on{box-shadow:0 0 0 2px #f4d28b}
.lmk-tile span{display:grid;min-width:0}.lmk-tile b{font-size:10px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lmk-tile small{font-size:9.5px;color:#a9c1cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lmk-tile.have small{color:#9fe0b4}
.lmk-tile svg{flex:none}
@media (max-width:600px){.lmk{grid-template-columns:minmax(0,1fr);grid-template-areas:"show" "list";grid-template-rows:auto minmax(0,1fr)}.lmk-show{max-height:250px}.lmk-stage{height:104px}.lmk-tile{flex-direction:column;align-items:center;text-align:center;min-height:62px;gap:1px}.lmk-tile span{justify-items:center}.lmk-tile b{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:9.5px}.lmk-tile{min-height:72px}.lmk-cn{width:62px}}
@media (max-height:400px){.lmk-stage{height:76px}.lmk-show .lmk-next{display:none}.lmk-show h3{font-size:13.5px}.lmk-plinth{font-size:0;gap:0}}
html.light .lmk-show{background:radial-gradient(120% 80% at 50% 30%,#ffffff,#eef3f8);color:#13284a;border-color:#c9a85a}html.light .lmk-show h3{color:#13284a}html.light .lmk-show p{color:#304a60}html.light .lmk-show .lmk-next{color:#9a5a00}
html.light .lmk-city,html.light .lmk-tile.have{background:#fff;border-color:#d3dbe4}html.light .lmk-tile{background:#f4f7fa;color:#13284a;border-color:#c8d3de}html.light .lmk-cn b{color:#13284a}html.light .lmk-head{background:transparent}
html.light .lmk-plinth select,html.light .lmk-country select{background:#fff;color:#13284a;border-color:#cfd8e2}`;
 document.head.append(st);
 addEventListener('DOMContentLoaded',()=>{try{checkSets()}catch{}});
 window.SkylineLandmarks=Object.freeze({marks,checkSets,PLINTH});
})();
