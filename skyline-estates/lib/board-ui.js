/* Shared HUD pieces for the Career board pages (owner request 24 Nov 2026): one implementation instead of a copy
   per board, so a fix lands everywhere at once. Used by City Ventures and Crossroads Capital.

   SkylineBoardUI.init({
     key:'cv',                       // remembers the side-panel choice per board
     sideWidth:'min(232px,30vw)',    // CSS width of the page's #side panel
     groups:()=>[{name,sub,color,items:[{id,name,price,stage,rent,mortgaged,owner:null|{you,name,color}}]}],
     onTile:id=>{}                   // tap on a street in the panel or portfolio
   }) → {refresh()}

   It provides: the "Your streets" panel (#holdings), the Portfolio sheet (menu item #mPortfolio and the panel
   button), the hide/show side-panel tab, and the classic menu options (#mSpeed, #mCam, #mRadio). */
(function(){'use strict';
if(window.SkylineBoardUI)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>(Math.round(n)||0).toLocaleString('en-US')+' CC';
const css=`
#holdings{padding:6px 8px 7px;font-size:11px}#holdings .hh{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
#holdings .hh b{font-size:10.5px;letter-spacing:.08em;color:#f6d47c;text-transform:uppercase}#holdings .hh button{min-height:44px;padding:2px 10px;font-size:11.5px;border-radius:9px}
#holdings .g{display:flex;align-items:center;gap:5px;min-height:20px;cursor:pointer}#holdings .g .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e9f0f8;font-weight:700}
#holdings .pips{display:flex;gap:3px}#holdings .pip{width:11px;height:11px;border-radius:3px;border:1.5px solid #ffffff55;background:transparent;box-sizing:border-box}
#holdings .pip.me{border-color:transparent}#holdings .cnt{font-weight:800;color:#f6d47c;min-width:24px;text-align:right}
#holdings .list{max-height:min(150px,calc(100vh - 300px));overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.mlist{display:grid;grid-template-columns:1fr 1fr;gap:7px;width:100%}.mlist #mResume{grid-column:1/-1}.mlist .btn{width:100%;justify-content:flex-start;min-height:44px}
#menu .card{width:min(620px,88vw);box-sizing:border-box}#menu .card h1{margin-bottom:2px}
#portfolio .pf{width:min(820px,92vw);max-height:calc(100dvh - 30px);overflow:auto}#portfolio .pfh{display:flex;align-items:center;justify-content:space-between;gap:10px}#portfolio .pfh h1{margin:0}
.pfg{margin-top:8px;border-radius:12px;background:#ffffff0d;padding:6px 8px}.pfg h4{margin:0 0 4px;display:flex;align-items:center;gap:6px;font-size:13px}
.pfg h4 i{width:12px;height:12px;border-radius:3px;display:inline-block}.pfg h4 span{margin-left:auto;font-size:11.5px;color:#9fb3c8;font-weight:700}
.pft{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr .8fr;gap:2px 8px;font-size:12px;align-items:center}.pft .hd{color:#9fb3c8;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}
.pft .own{display:flex;align-items:center;gap:5px}.pft .own i{width:9px;height:9px;border-radius:50%;display:inline-block}.pft .sale{color:#9fb3c8}.pft .nm{cursor:pointer}
#sideToggle{position:fixed;top:calc(var(--st,0px) + 62px);right:calc(var(--sr,0px) + var(--sideW) + 12px);z-index:5;width:44px;height:44px;border-radius:12px;border:1.5px solid #e2b25a;background:linear-gradient(#17517f,#0b2342);color:#fff;font-size:16px;font-weight:900;transition:right .25s,opacity .25s}
body.sideoff #sideToggle{right:calc(var(--sr,0px) + 8px)}body.sideoff #side{opacity:0;pointer-events:none;transform:translateX(calc(100% + 20px))}
body.deciding #sideToggle,body.moving #sideToggle{opacity:0;pointer-events:none}body.deciding #side{opacity:0;pointer-events:none;transform:translateX(calc(100% + 20px))}`;

function init(o){
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 document.documentElement.style.setProperty('--sideW',o.sideWidth||'min(232px,30vw)');
 const groups=()=>{try{return o.groups()||[]}catch(e){return []}};
 const tap=id=>{try{o.onTile&&o.onTile(id)}catch(e){}};

 // ---- portfolio sheet ----
 let pf=$('portfolio');
 if(!pf){pf=document.createElement('div');pf.id='portfolio';pf.className='screen';pf.hidden=true;
  pf.innerHTML='<div class="card panel pf"><div class="pfh"><h1>🏘 Portfolio</h1><button class="btn small" id="pfClose">Close</button></div><div id="pfBody"></div></div>';document.body.append(pf)}
 function openPortfolio(){const gs=groups();
  $('pfBody').innerHTML=gs.map(g=>{const mine=g.items.filter(t=>t.owner&&t.owner.you).length;
   return `<div class="pfg"><h4><i style="background:${g.color}"></i>${esc(g.name)}${g.sub?' · '+esc(g.sub):''}<span>You own ${mine} of ${g.items.length}</span></h4><div class="pft"><span class="hd">Street</span><span class="hd">Owner</span><span class="hd">Stage</span><span class="hd">Rent now</span><span class="hd">Price</span>${g.items.map(t=>
    `<span class="nm" data-id="${esc(t.id)}">${esc(t.name)}</span><span class="own">${t.owner?`<i style="background:${t.owner.color}"></i>${esc(t.owner.you?'You':t.owner.name)}${t.mortgaged?' (mortgaged)':''}`:'<span class="sale">For sale</span>'}</span><span>${t.owner&&t.stage!=null?esc(t.stage):'—'}</span><span>${t.owner&&t.rent!=null?fmt(t.rent):'—'}</span><span>${t.price?fmt(t.price):'—'}</span>`).join('')}</div></div>`}).join('');
  $('pfBody').querySelectorAll('[data-id]').forEach(n=>n.onclick=()=>{pf.hidden=true;tap(n.dataset.id)});
  if($('menu'))$('menu').hidden=true;pf.hidden=false}
 $('pfClose').onclick=()=>{pf.hidden=true};
 if($('mPortfolio'))$('mPortfolio').onclick=openPortfolio;

 // ---- your streets panel ----
 function refresh(){const el=$('holdings');if(!el)return;const gs=groups();
  const rows=gs.map((g,k)=>{const mine=g.items.filter(t=>t.owner&&t.owner.you).length;
   return `<div class="g" data-g="${k}" title="${esc(g.name)}"><span class="pips">${g.items.map(t=>`<i class="pip${t.owner&&t.owner.you?' me':''}" style="${t.owner?(t.owner.you?'background:'+g.color:'border-color:'+t.owner.color):'border-color:'+g.color+'88'}"></i>`).join('')}</span><span class="nm">${esc(g.name)}</span><span class="cnt">${mine}/${g.items.length}</span></div>`}).join('');
  const html=`<div class="hh"><b>Your streets</b><button class="btn small" id="pfOpen">Portfolio</button></div><div class="list">${rows}</div>`;
  if(el.dataset.h===html)return;el.dataset.h=html;el.innerHTML=html;$('pfOpen').onclick=openPortfolio;
  el.querySelectorAll('[data-g]').forEach(n=>n.onclick=()=>{const g=gs[+n.dataset.g];const t=g&&(g.items.find(i=>i.owner&&i.owner.you)||g.items.find(i=>!i.owner)||g.items[0]);if(t)tap(t.id)})}

 // ---- hide / show the side panel ----
 const KEY='skylineBoardSideOff:'+(o.key||'board');
 let tg=$('sideToggle');if(!tg&&$('side')){tg=document.createElement('button');tg.id='sideToggle';tg.type='button';$('side').before(tg)}
 function setSide(off){document.body.classList.toggle('sideoff',off);if(tg){tg.textContent=off?'‹':'›';tg.setAttribute('aria-expanded',String(!off));tg.setAttribute('aria-label',off?'Show the side panel':'Hide the side panel')}try{localStorage.setItem(KEY,off?'1':'0')}catch(e){}}
 if(tg){tg.onclick=()=>setSide(!document.body.classList.contains('sideoff'));try{setSide(localStorage.getItem(KEY)==='1')}catch(e){setSide(false)}}
 const dec=$('decision');if(dec)new MutationObserver(()=>document.body.classList.toggle('deciding',!dec.hidden)).observe(dec,{attributes:true,attributeFilter:['hidden']});

 // ---- classic menu options: speed, camera, radio ----
 const fast=()=>{try{return localStorage.getItem('skylineBoardFast')==='1'}catch(e){return false}};
 function label(){if($('mSpeed'))$('mSpeed').textContent='⏩ Speed: '+(fast()?'fast':'normal');
  if($('mCam')){const ov=($('viewBtn')&&$('viewBtn').getAttribute('aria-label')||'').startsWith('Return');$('mCam').textContent=ov?'🎯 Camera: follow token':'🗺 Camera: whole board'}
  if($('mRadio')){const on=window.SkylineBoardRadio&&SkylineBoardRadio.state().on;$('mRadio').textContent='📻 Radio: '+(on?'on':'off')}}
 if($('mSpeed'))$('mSpeed').onclick=()=>{const f=!fast();try{localStorage.setItem('skylineBoardFast',f?'1':'0')}catch(e){}if(window.__boardSetSpeed)window.__boardSetSpeed(f);label()};
 if($('mCam'))$('mCam').onclick=()=>{$('viewBtn')&&$('viewBtn').click();if($('menu'))$('menu').hidden=true;label()};
 if($('mRadio'))$('mRadio').onclick=()=>{window.SkylineBoardRadio&&SkylineBoardRadio.toggle();setTimeout(label,50)};
 if($('menuBtn'))$('menuBtn').addEventListener('click',()=>setTimeout(label,0));label();
 return{refresh,openPortfolio,setSide};
}
window.SkylineBoardUI=Object.freeze({init});
})();
