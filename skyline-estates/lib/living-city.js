/* Skyline Estates · Living City V2 presentation: dialogs, board badges, stage art, 3D markers, corner tiles and
   Daylight/Dark styling. Game rules live in lib/living-city-rules.js (shared with the authoritative server). */
'use strict';
const LC_ICON=(id,size=24)=>`<img class="lc-ic" src="living/icons/${size>32?128:64}/${id}.png" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async">`;
const EV2_ICON={boom:'building_boom',fest:'festival',film:'festival',infra:'power_grid',slussen:'power_grid',pulseRise:'market_pulse',pulseBuild:'grant',pulseSoft:'market_pulse'};
const lcEvIcon=e=>EV2_ICON[e&&e.id]||'district_growth';
const stripEmoji=s=>String(s).replace(/^[^\p{L}\p{N}]+/u,'');
{const _c=ev2Chip;ev2Chip=function(){_c();if(!lc()||FAST)return;const c=$('#ev2chip');if(!c)return;const b=c.querySelector('b');if(!b||b.querySelector('.lc-ic'))return;
  const e=G.ev2,live=e&&ev2State(e)!=='ended';b.innerHTML=LC_ICON(live?lcEvIcon(e):'district_growth',20)+esc(live?stripEmoji(b.textContent):'City events');c.setAttribute('aria-label',(live?'City event: ':'City events: ')+c.textContent)}}
{const _b=ev2Banner;ev2Banner=function(e){_b(e);if(!lc())return;const n=[...document.querySelectorAll('.ev2ban')].pop();const b=n&&n.querySelector('b');if(b)b.innerHTML=LC_ICON(lcEvIcon(e),32)+esc(stripEmoji(b.textContent))}}
// Board: outline the streets an active or upcoming event affects (2D board and city map; live HTML class, no new art).
const lcEvTargets=()=>{if(!lc()||!G.set.events2)return null;const e=G.ev2;return e&&ev2State(e)!=='ended'?e.targets:null};
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a),t=lcEvTargets();return t&&t.includes(i)?h.replace('<div class="mc','<div class="mc lc-ev'):h}}
{const _fd=flatDraw;document.documentElement.classList.toggle('lc-on',false);let last='';flatDraw=function(){document.documentElement.classList.toggle('lc-on',lc());const t=lcEvTargets(),k=t?G.ev2.id+G.ev2.from+ev2State(G.ev2):'';if(k!==last){last=k;const H=$('#flatbd');if(H)H.dataset.sig=''}return _fd.apply(this,arguments)}}
function lcRulesModal(){return modal({cls:'wide lc-rules',html:`<div class="mh">${LC_ICON('district_growth',28)} Living City rules</div><div class="lc-rl">${LC_RULES.map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,32)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`,btns:[{k:'x',label:'Got it',primary:true}]})}
// Rules page: add the V2 section when this match uses it.
{const _m=modal;modal=function(o){if(o&&typeof o.html==='string'&&lc()&&o.html.includes('How to play')&&!o.html.includes('lc-rl'))o={...o,html:o.html+`<h4>Living City rules (this match)</h4><div class="lc-rl">${LC_RULES.slice(1).map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,28)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`};return _m.call(this,o)}}
// Custom setup › Rules: one switch for the whole V2 ruleset (stored separately from the classic house rules).
{const _pc=paneCustom;paneCustom=function(T){const r=_pc.apply(this,arguments);try{if(typeof SE!=='undefined'&&SE.step===1){const P2=T.querySelector('.se-panel');if(P2&&!P2.querySelector('[data-lc]')){
  const row=el('div','se-rule lc-setup',`<div><b>${LC_ICON('district_growth',20)} Living City rules</b><small>New offline matches: strategic city events and Skyline Estates’ own city rules. Turn off for classic rules. Online games always use classic rules.</small></div><button class="se-switch" data-lc="1" aria-label="Living City rules" aria-pressed="${lcOptIn()}"></button>`);
  P2.prepend(row);row.querySelector('[data-lc]').onclick=()=>{PREF.lc=!lcOptIn();savePref();sfx('tap');paneCustom(T)}}}}catch(e){}return r}}
function lcCardHTML(deck,c,p,choices){const art=c.art?`<img class="lc-art" src="living/cards/${c.art}.webp" width="160" height="160" alt="" aria-hidden="true" decoding="async">`:'';
  return `<div class="lc-card ${deck}">${art}<div class="lc-cbody"><small>${deck==='chance'?'LUCKY BREAK':'CITY HALL'}</small><b>${c.icon?LC_ICON(c.icon,22):''}${esc(lcVal(c.title)||'')}</b><p>${esc(loc(lcVal(c.t)))}</p>
   ${choices?`<ul class="lc-ch">${choices.map(x=>`<li class="${x.ok===false?'off':''}"><b>${esc(x.label)}</b>${x.info?`<span>${esc(x.info)}</span>`:''}</li>`).join('')}</ul>`:''}${p.ai&&choices?`<em>${esc(p.name)} is deciding…</em>`:''}</div></div>`}
async function _cardShow(p,deck,c,ch,aiPick){
  if(!ch||p.ai)return modal({cls:'lc-cardm',html:lcCardHTML(deck,c.classic?{title:deck==='chance'?'Lucky Break':'City Hall',t:c.t}:c,p,ch),btns:[{k:'ok',label:p.ai?(aiPick?`${esc(p.name)}: ${esc(ch.find(x=>x.k===aiPick).label)}`:`${esc(p.name)} reads the card…`):'OK',primary:!p.ai,disabled:p.ai}],auto:p.ai?2600:0,tdef:p.ai?undefined:'ok'});
  const ok=ch.filter(x=>x.ok!==false);
  return modal({cls:'lc-cardm',html:lcCardHTML(deck,c,p,ch),btns:ch.map((x,j)=>({k:x.k,label:esc(x.label),primary:j===0&&x.ok!==false,disabled:x.ok===false})),tdef:ok[ok.length-1].k})}
{const st=document.createElement('style');st.textContent=`
.lc-ic{display:inline-block;vertical-align:-4px;margin-right:6px;object-fit:contain}
#ev2chip .lc-ic{width:20px;height:20px}.ev2ban .lc-ic{width:32px;height:32px;vertical-align:-8px}
html.lc-on.flat #ev2chip{max-width:clamp(96px,calc(50vw - 50vh - 72px),200px)!important;padding:5px 10px!important}html.lc-on.flat #ev2chip b{font-size:11.5px!important}html.lc-on.flat #ev2chip span{font-size:11px!important;-webkit-line-clamp:2!important}
.mc.lc-ev{box-shadow:inset 0 0 0 3px #f4d28b,0 0 10px #f4d28b88!important}
.lc-rl{display:grid;gap:8px;margin-top:6px}.lc-r{display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:start}.lc-r small{display:block;opacity:.85;font-size:12px;line-height:1.35}
.lc-setup b .lc-ic{vertical-align:-5px}
.lc-cardm .mp{max-width:min(620px,94vw)}
.lc-card{display:grid;grid-template-columns:clamp(84px,22vh,150px) minmax(0,1fr);gap:12px;align-items:start}
.lc-card .lc-art{width:100%;height:auto;aspect-ratio:1;border-radius:14px;background:#0b2131;object-fit:cover}
.lc-cbody small{display:block;font-size:10px;letter-spacing:.12em;opacity:.7;font-weight:800}.lc-cbody>b{display:block;font-size:17px;margin:2px 0 4px}
.lc-cbody p{margin:0 0 6px;font-size:13px;line-height:1.35}.lc-ch li{display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:baseline}.lc-ch li b::after{content:' ·'}.lc-cbody em{font-size:12px;opacity:.8}
.lc-ch{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:12px}.lc-ch li b{display:block}.lc-ch li span{opacity:.8}.lc-ch li.off{opacity:.5}
.lc-cardm .mbar{flex-wrap:wrap}.lc-cardm .mbar .btn{min-height:44px;flex:1 1 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2}
.lc-cardm .mbar .btn small{display:block;font-size:10.5px;font-weight:600;opacity:.85;margin-top:2px;white-space:normal}
.lc-crtag{background:#e2b13c!important;color:#10283b!important}.lc-cr{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:start}.lc-crm .mbar{flex-wrap:wrap}.lc-crm .mbar .btn{min-height:44px;flex:1 1 150px}
@media (max-height:420px){.lc-cr{grid-template-columns:40px 1fr}.lc-cr .lc-ic{width:40px;height:40px}.lc-crm .lc-ch{font-size:11px}}
.lc-dev{width:100%;border-collapse:collapse;font-size:12px}.lc-dev th{text-align:left;font-size:10.5px;opacity:.7}.lc-dev td{padding:2px 3px;white-space:nowrap;font-size:11px}html.lc-on .pfm-pips i:nth-child(4){display:none}.lc-dev .lc-stg{width:24px;height:24px;vertical-align:middle;margin-right:5px;border-radius:5px}
.lc-dev tr.lc-now td{background:#e2b13c22;font-weight:800}.lc-dev small{opacity:.7;font-size:10px}.lc-devnote{font-size:10.5px;opacity:.75;margin-top:4px}
.lc-sky .lc-stg{width:1.2em;height:1.2em;vertical-align:middle}html.lc-on .pfm-row{grid-template-columns:minmax(150px,1fr) auto}html.lc-on .pfm-acts [data-quick-build],html.lc-on .pfm-acts [data-lc-build]{max-width:200px}html.lc-on .pfm-acts [data-quick-build] small,html.lc-on .pfm-acts [data-lc-build] small{white-space:normal}[data-quick-build] .lc-stg{width:22px;height:22px;vertical-align:-6px;margin-right:4px;border-radius:4px}
.mc.lc-lm{box-shadow:inset 0 0 0 2px #e2b13c}.mc .lc-lmb{position:absolute;right:1px;top:1px;width:14px;height:14px;pointer-events:none}.lc-lmline{font-size:11px;margin:4px 0;display:flex;align-items:center;gap:2px}.lc-lmline .lc-ic{width:18px;height:18px}
.mc .lc-cic{width:1.9em;height:1.9em;max-width:80%;object-fit:contain}.lc-lmm .mbar{flex-wrap:wrap}.lc-lmm .mbar .btn{min-height:44px;flex:1 1 160px}
html.light .mc.lc-ev{box-shadow:inset 0 0 0 3px #b45309,0 0 8px #b4530966!important}
html.light .mc.lc-lm{box-shadow:inset 0 0 0 2px #8a6100}
html.light .lc-dev tr.lc-now td{background:#f5e3b0}
html.light .lc-crtag{background:#8a6100!important;color:#fff!important}
html.light .lc-ch li span,html.light .lc-cbody p{color:#1d3046}
html.light .lc-card .lc-art{background:#e9eef5}
html.light .lc-lmline.muted{color:#3c4f63}
@media (max-height:420px){.lc-card{grid-template-columns:84px minmax(0,1fr)}.lc-cbody p{font-size:12px;margin-bottom:4px}.lc-cbody>b{font-size:15px}.lc-ch{font-size:11px;gap:2px}}`;document.head.append(st)}
{const _rr=renderRoster;renderRoster=function(){const r=_rr.apply(this,arguments);try{if(lc()&&!FAST)for(const p of G.players){const pn=document.querySelector('#pc'+p.id+' .pn');if(!pn)continue;let t=pn.querySelector('.lc-crtag');
   if(lcUnder(p)&&!t){t=el('span','tag lc-crtag','Review');t.title='Civic Review: no rent until resolved';pn.append(t)}else if(!lcUnder(p)&&t)t.remove()}}catch(e){}return r}}
const lcStageImg=(h,size=40)=>`<img class="lc-stg" src="living/buildings/${size>48?256:128}/${LC_STAGES[h].k}.${size>48?'webp':'png'}" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async">`;
{const _dh=deedHTML;deedHTML=function(i){const h=_dh(i);if(!lc()||SQ[i].t!=='prop')return h;const s=SQ[i],cur=G&&G.own[i]?G.own[i].h:0;
  const rows=[0,1,2,3,5].map(k=>`<tr class="${k===cur?'lc-now':''}"><td>${lcStageImg(k,28)}${LC_STAGES[k].n}${k===5?' <small>Landmark only</small>':''}</td><td>${k?fmt(lcCostAt(i,k)):'—'}</td><td>${fmt(k?lcStageRent(i,k):s.r[0])}</td></tr>`).join('');
  return h.replace(/(Owned by [^<]*?·\s*)(\d houses?|tower|Skyline Tower)/,(m,a)=>a+(LC_STAGES[cur]?LC_STAGES[cur].n:'')).replace(/<table[\s\S]*?<\/table>/,`<table class="lc-dev"><tr><th>Stage</th><th>Build</th><th>Rent</th></tr>${rows}</table><div class="lc-devnote">High-rise and Skyscraper ignore falling-rent events. Selling refunds half the stage price.</div>`)}}
// 2D board / map: stage pips (1–3) and a skyscraper marker
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);if(!lc()||SQ[i].t!=='prop'||G.own[i].h!==5)return h;return h.replace(/<span class="hs ht">[^<]*<\/span>/,`<span class="hs ht lc-sky">${lcStageImg(5,14)}</span>`)}}
// Portfolio: build buttons and level labels show stages and the real V2 cost/rent.
function lcPortfolioFix(root){document.documentElement.classList.toggle('lc-on',lc());if(!lc())return;
  root.querySelectorAll('.pfm-row[data-square] .pfm-acts button').forEach(b=>{if(b.dataset.quickBuild==null&&/^Build (house|tower)/.test(b.textContent))b.dataset.lcBuild=b.closest('.pfm-row').dataset.square});
  root.querySelectorAll('[data-quick-build],[data-lc-build]').forEach(b=>{const i=+(b.dataset.quickBuild??b.dataset.lcBuild),o=G.own[i];if(!o||o.h>=5)return;const nh=lcNextH(o.h),lbl=`Build ${LC_STAGES[nh].n}`;
   const html=`${lcStageImg(nh,22)}${lbl}<small>${fmt(devCost(G.turn,i))} · rent → ${fmt(lcStageRent(i,nh))}${nh===5&&!lcCanSky(i)?' · Landmark only':''}</small>`;if(b.dataset.lcl!==html){b.dataset.lcl=html;b.innerHTML=html;b.setAttribute('aria-label',lbl);b.title=lbl}});
  root.querySelectorAll('.pfm-row[data-square]').forEach(r=>{const i=+r.dataset.square,o=G.own[i];if(!o||SQ[i].t!=='prop')return;if(o.h){const sb=[...r.querySelectorAll('.pfm-acts button')].find(b=>/^Sell/.test(b.textContent)),sm2=sb&&sb.querySelector('small'),v='+'+fmt(Math.round(lcCostAt(i,o.h)/2));if(sm2&&sm2.textContent!==v)sm2.textContent=v}const sm=r.querySelector('.pfm-info small');if(sm&&!sm.dataset.lc){sm.innerHTML=sm.innerHTML.replace(/Skyline Tower|\d houses?|No buildings/,LC_STAGES[o.h]?LC_STAGES[o.h].n:'');sm.dataset.lc=1}})}
new MutationObserver(()=>{if(G&&lc()){const m=$('#modals');if(m)lcPortfolioFix(m)}}).observe(document.getElementById('modals')||document.body,{childList:true,subtree:true});
// presentation: badge on the board cell and the property card
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);return lcLandmarkAt(i)?h.replace('<div class="mc','<div class="mc lc-lm').replace(/<\/div>$/,`<img class="lc-lmb" src="living/icons/64/landmark.png" alt="Landmark" width="14" height="14"></div>`):h}}
{const _dh=deedHTML;deedHTML=function(i){const h=_dh(i);if(!lc()||SQ[i].t!=='prop')return h;const g=SQ[i].g,L=G.lm&&G.lm[g];
  const line=lcLandmarkAt(i)?`<div class="lc-lmline">${LC_ICON('landmark',18)}Landmark of ${esc(GNAME[g])}: +20% rent, Skyscraper allowed</div>`:L?`<div class="lc-lmline muted">${esc(SQ[L.i].n)} is this district’s Landmark</div>`:`<div class="lc-lmline muted">${LC_ICON('district_growth',18)}District Growth: own 2+ streets here for +15% rent</div>`;
  return h.replace('<div class="own">',line+'<div class="own">')}}
{const _fd=flatDraw;let last='';flatDraw=function(){const k=lc()?JSON.stringify(G.lm||{}):'';if(k!==last){last=k;const H=$('#flatbd');if(H)H.dataset.sig=''}return _fd.apply(this,arguments)}}
const LC_SQ0={0:SQ[0].n,30:SQ[30].n};
{const _bb=buildBoard;buildBoard=function(...a){if(lc())for(const k in LC_CORNER)SQ[k].n=LC_CORNER[k][0];else{SQ[0].n=LC_SQ0[0];SQ[30].n=LC_SQ0[30];if(CITY){if(CITY.jail)SQ[10].n=CITY.jail;if(CITY.free)SQ[20].n=CITY.free}}return _bb.apply(this,a)}}
{const _mc=mapCellHTML;mapCellHTML=function(i,...a){const h=_mc(i,...a);if(!lc()||!LC_CORNER[i])return h;return h.replace(/<span class="ic">[^<]*<\/span>/,`<span class="ic"><img class="lc-cic" src="living/icons/64/${LC_CORNER[i][1]}.png" alt="" width="24" height="24"></span>`)}}
// 3D board texture: V2 corner tiles (original art; kit icons + live labels). Classic matches keep their tiles.
const LC_CIMG={};for(const k in LC_CORNER){const im=new Image();im.decoding='async';im.src=`living/icons/128/${LC_CORNER[k][1]}.png`;LC_CIMG[k]=im}
{const _at=applyTheme;applyTheme=function(...a){try{if(typeof S3!=='undefined'&&S3){const key=lc()?'v2':'classic';if(S3.lcKey!==key){S3.boardDrawnFor=null;S3.lcKey=key}}}catch(e){}return _at.apply(this,a)}}
const LC_CSUB={0:()=>'PAYDAY +'+fmt(PAYDAY),10:()=>'PRE-APPROVAL DESK',20:()=>'RIDE TO ANY HUB',30:()=>'BUY ANY STREET'};
{const _dc=drawCorner;drawCorner=function(ctx,i,r){if(!lc()||!LC_CORNER[i])return _dc.apply(this,arguments);
  const cx=r.x+r.w/2,cy=r.y+r.h/2,dark=!!(typeof BP!=='undefined'&&BP.glow),g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
  g.addColorStop(0,dark?'#0f2a3d':'#fff6dc');g.addColorStop(1,dark?'#1d4560':'#f1d58c');ctx.fillStyle=g;ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle='#c9a227';ctx.lineWidth=4;ctx.strokeRect(r.x+6,r.y+6,r.w-12,r.h-12);
  const rot={0:-Math.PI/4,10:Math.PI/4,20:Math.PI*.75,30:-Math.PI*.75}[i];ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.textAlign='center';ctx.textBaseline='middle';
  const im=LC_CIMG[i];if(im&&im.complete&&im.naturalWidth)try{ctx.drawImage(im,-26,-50,52,52)}catch(e){}
  const name=LC_CORNER[i][0].toUpperCase();let fs=17;ctx.font=`800 ${fs}px ${typeof FD!=='undefined'?FD:'sans-serif'}`;while(ctx.measureText(name).width>124&&fs>9){fs--;ctx.font=`800 ${fs}px ${typeof FD!=='undefined'?FD:'sans-serif'}`}
  ctx.fillStyle=dark?'#f4d28b':'#5a3d00';ctx.fillText(name,0,16);ctx.font=`800 9.5px ${typeof FB!=='undefined'?FB:'sans-serif'}`;ctx.fillStyle=dark?'#e8eef4':'#1d3046';ctx.fillText(LC_CSUB[i](),0,34);ctx.restore()}}
/* ---------- V2.1 · 3D board parity (crown, event outlines, corner markers) and Daylight/Dark ---------- */
// The 3D board already maps stages to geometry through FAM[o.h] (1 Low-rise, 2 Mid-rise, 3 High-rise, 5 Skyscraper),
// so 3D and 2D read the same o.h. V2.1 adds: a gold crown above a Landmark, a gold outline on streets affected by
// an active/upcoming city event; the four V2 corner tiles are drawn into the 3D board texture (Task 06 section). All read G only; no state is written.
const lcLight=()=>document.documentElement.classList.contains('light');
function lc3DPlot(i){if(FAST||typeof S3==='undefined'||!S3||!S3.plots)return;const pl=S3.plots[i];if(!pl||!pl.node)return;
  if(pl.lcCrown){pl.node.remove(pl.lcCrown);pl.lcCrown=null}if(pl.lcRing){pl.node.remove(pl.lcRing);pl.lcRing=null}
  if(!lc()||!G||SQ[i].t!=='prop')return;
  if(lcLandmarkAt(i)){const c=new Node(),y=(pl.top||.2)+.1,gold=S3.M.gold;c.add(N(S3.geo.cyl8,gold,0,y,0).sc(.12,.045,.12));
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;c.add(N(S3.geo.cone4,gold,Math.cos(a)*.095,y+.08,Math.sin(a)*.095).sc(.035,.1,.035))}
    c.add(N(S3.geo.sph,mat('#fff3c4',{spec:.6}),0,y+.05,0).sc(.04,.04,.04));pl.node.add(c);pl.lcCrown=c}
  const t=lcEvTargets();if(t&&t.includes(i)){const r=new Node(),m=mat(lcLight()?'#b45309':'#f4d28b',{spec:.2}),s=.3,w=.05,h=.045;
    r.add(N(S3.geo.box,m,0,h,s).sc(s*2,h,w),N(S3.geo.box,m,0,h,-s).sc(s*2,h,w),N(S3.geo.box,m,s,h,0).sc(w,h,s*2),N(S3.geo.box,m,-s,h,0).sc(w,h,s*2));pl.node.add(r);pl.lcRing=r}}
function lc3DAll(){if(FAST||typeof S3==='undefined'||!S3||!S3.plots)return;for(let i=0;i<40;i++)if(SQ[i].t==='prop')lc3DPlot(i)}
{const _uc=updateCell;updateCell=function(i){const r=_uc.apply(this,arguments);try{lc3DPlot(i)}catch(e){}return r}}
{const _a=advanceTurn;advanceTurn=function(){_a();try{lc3DAll()}catch(e){}}}
{const _sw=startWith;startWith=function(...a){const r=_sw.apply(this,a);try{lc3DAll()}catch(e){}return r}}
{const _sy=lcSyncLandmarks;lcSyncLandmarks=function(){const before=JSON.stringify(G&&G.lm||{});_sy();if(JSON.stringify(G&&G.lm||{})!==before)try{lc3DAll()}catch(e){}}}
// Theme switches only change CSS and 3D materials; refresh markers so outlines keep their contrast.
{const _ui=applyUI;applyUI=function(){const r=_ui.apply(this,arguments);try{if(G&&lc())lc3DAll()}catch(e){}return r}}
window.SkylineLivingCity3D={plot:i=>lc3DPlot(i),all:()=>lc3DAll()};
/* ---------- Dialog adapter for the rules core (LCUI.decide) ---------- */
LCUI.decide=async function(kind,p,s){
  if(kind==='card')return _cardShow(p,s.deck,s.c,s.ch,s.aiPick);
  if(kind==='info')return modal({html:`<div class="mh">${LC_ICON(s.icon,28)} ${esc(s.title)}</div><div class="mtxt">${esc(s.text)}</div>`,btns:[{k:'x',label:'OK',primary:true}]});
  if(kind==='review'){const can=s.can;return modal({cls:'lc-crm',html:`<div class="lc-cr">${LC_ICON('civic_review',48)}<div><div class="mh">Civic Review</div><p class="mtxt">${esc(p.name)}, your file is under review since round ${p.cr.from}. While it is open you collect <b>no rent</b>. Choose one:</p>
     <ul class="lc-ch"><li><b>Fast-Track Permit · ${fmt(LC_PERMIT)}</b><span>Pay now, review closes, play this turn normally.${can?'':' (Not enough cash.)'}</span></li><li><b>Bail Pass</b><span>${p.goojf.length?'Use 1 of your '+p.goojf.length+' Bail Pass'+(p.goojf.length>1?'es':'')+'. Review closes, play normally.':'You hold no Bail Pass.'}</span></li><li><b>Standard Review</b><span>Skip this whole turn (no roll, no building or trades). The review closes at the end of it.</span></li></ul></div></div>`,
     btns:[{k:'permit',label:`Fast-Track · ${fmt(LC_PERMIT)}`,primary:can,disabled:!can},{k:'pass',label:'Use Bail Pass',disabled:!p.goojf.length},{k:'standard',label:'Standard Review',primary:!can}],tdef:'standard'})}
  if(kind==='landmark'){const g=s.g;return modal({cls:'lc-lmm',html:`<div class="lc-cr">${LC_ICON('landmark',48)}<div><div class="mh">Choose a Landmark · ${esc(GNAME[g])}</div><p class="mtxt">You own the whole district. One street can become its Landmark: double rent while unbuilt, +20% rent at every stage, and the only street here that can rise to Skyscraper. Other streets keep District Growth (+15%). Fee: 25% of the street’s price.</p></div></div>`,
    btns:[...s.opts.map(i=>({k:'i'+i,label:`${esc(SQ[i].n)} · ${fmt(lcLmFee(i))}`,disabled:p.cash<lcLmFee(i)})),{k:'later',label:'Later',primary:false}],tdef:'later'})}
  if(kind==='corner'){const ok=s.choices.filter(c=>c.ok!==false);return modal({cls:'lc-crm',html:`<div class="lc-cr">${LC_ICON(s.icon,48)}<div><div class="mh">${esc(s.title)}</div><p class="mtxt">${esc(s.text)}</p><ul class="lc-ch">${s.choices.map(c=>`<li class="${c.ok===false?'off':''}"><b>${esc(c.label)}</b><span>${esc(c.info||'')}</span></li>`).join('')}</ul></div></div>`,
   btns:s.choices.map((c,j)=>({k:c.k,label:esc(c.label),primary:j===0&&c.ok!==false,disabled:c.ok===false})),tdef:ok[ok.length-1].k})}
  throw Error('Unknown Living City decision '+kind)};
window.SkylineLivingCity={lc,LC_RV,optIn:lcOptIn,rulesModal:()=>lcRulesModal()};
