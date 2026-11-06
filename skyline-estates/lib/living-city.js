/* Skyline Estates · Living City V2 (rule version 2).
   New OFFLINE matches only. A match is V2 when G.rv===2; saves without rv, online/ranked matches and the
   authoritative backend copy keep the classic rules. game.html stays byte-unchanged: everything here wraps
   existing functions, and every hook checks lc() first. Wallet, Coins, Shop and purchases are untouched. */
'use strict';
const LC_RV=2;
const lc=(g=G)=>!!(g&&g.rv===LC_RV&&!g.online);
const lcOptIn=()=>PREF.lc!==false;               // Living City rules for new offline matches (default on)
const LC_ICON=(id,size=24)=>`<img class="lc-ic" src="living/icons/${size>32?128:64}/${id}.png" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async">`;

/* ---------- Task 01 · Strategic City Events on by default ---------- */
// One event system per match: Strategic Events (events2) unless the player explicitly opted into the classic
// City Events or explicitly switched Strategic Events off. Cadence is unchanged (round 3, then every 3 rounds).
let lcNext=false;
{const _sfs=startFromSetup;startFromSetup=function(...a){lcNext=lcOptIn();try{return _sfs.apply(this,a)}finally{lcNext=false}}}
{const _ng=newGame;newGame=function(cfg){
  const v2=(lcNext||!!(cfg&&cfg.lc===true))&&!!(cfg&&cfg.set);lcNext=false; // startFromSetup is the offline-only entry point
  if(v2){cfg={...cfg,set:{...cfg.set}};if(cfg.set.events2!==false&&!cfg.set.events){cfg.set.events2=true;cfg.set.events=false}}
  _ng(cfg);
  if(v2){G.rv=LC_RV;G.lcv=1}}}
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
const LC_RULES=[['district_growth','Living City rules','This match uses Skyline Estates’ Living City rules. Saved classic matches and online games keep the classic rules.'],
  ['festival','Strategic city events','From round 3, every 3 rounds, a named city event changes one district: festival rent, cheaper building or a development boom. One event at a time; tap the event chip to see the streets and the end round.']];
function lcRulesModal(){return modal({cls:'wide lc-rules',html:`<div class="mh">${LC_ICON('district_growth',28)} Living City rules</div><div class="lc-rl">${LC_RULES.map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,32)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`,btns:[{k:'x',label:'Got it',primary:true}]})}
// Rules page: add the V2 section when this match uses it.
{const _m=modal;modal=function(o){if(o&&typeof o.html==='string'&&lc()&&o.html.includes('How to play')&&!o.html.includes('lc-rl'))o={...o,html:o.html+`<h4>Living City rules (this match)</h4><div class="lc-rl">${LC_RULES.slice(1).map(([i,t,d])=>`<div class="lc-r">${LC_ICON(i,28)}<div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`};return _m.call(this,o)}}
// Custom setup › Rules: one switch for the whole V2 ruleset (stored separately from the classic house rules).
{const _pc=paneCustom;paneCustom=function(T){const r=_pc.apply(this,arguments);try{if(typeof SE!=='undefined'&&SE.step===1){const P2=T.querySelector('.se-panel');if(P2&&!P2.querySelector('[data-lc]')){
  const row=el('div','se-rule lc-setup',`<div><b>${LC_ICON('district_growth',20)} Living City rules</b><small>New offline matches: strategic city events and Skyline Estates’ own city rules. Turn off for classic rules. Online games always use classic rules.</small></div><button class="se-switch" data-lc="1" aria-label="Living City rules" aria-pressed="${lcOptIn()}"></button>`);
  P2.prepend(row);row.querySelector('[data-lc]').onclick=()=>{PREF.lc=!lcOptIn();savePref();sfx('tap');paneCustom(T)}}}}catch(e){}return r}}
// Saves: rule version is explicit and validated; V2 state is checked by each feature's validator.
const LC_VALID=[];
{const _vs=validateSave;validateSave=function(g){if(!_vs(g))return false;try{if(g.rv==null)return true;if(g.rv!==LC_RV||g.lcv!==1||g.online)return false;return LC_VALID.every(f=>f(g))}catch(e){return false}}}
{const st=document.createElement('style');st.textContent=`
.lc-ic{display:inline-block;vertical-align:-4px;margin-right:6px;object-fit:contain}
#ev2chip .lc-ic{width:20px;height:20px}.ev2ban .lc-ic{width:32px;height:32px;vertical-align:-8px}
html.lc-on.flat #ev2chip{max-width:clamp(96px,calc(50vw - 50vh - 72px),200px)!important;padding:5px 10px!important}html.lc-on.flat #ev2chip b{font-size:11.5px!important}html.lc-on.flat #ev2chip span{font-size:11px!important;-webkit-line-clamp:2!important}
.mc.lc-ev{box-shadow:inset 0 0 0 3px #f4d28b,0 0 10px #f4d28b88!important}
.lc-rl{display:grid;gap:8px;margin-top:6px}.lc-r{display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:start}.lc-r small{display:block;opacity:.85;font-size:12px;line-height:1.35}
.lc-setup b .lc-ic{vertical-align:-5px}`;document.head.append(st)}
window.SkylineLivingCity={lc,LC_RV,optIn:lcOptIn,rulesModal:()=>lcRulesModal()};
