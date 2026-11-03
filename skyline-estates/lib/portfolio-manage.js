/* In-match Portfolio: one full-width property-management list (no picture/detail preview panel).
   Views: All · Can build · Mortgaged · Missing sets. Every action reuses the game's own
   canBuild/build, canSell/sell, canMortgage/mortgage and canUnmort/unmortgage rules and is
   rechecked on tap; match cash (in-match SC) is the only money used here. Debt repayment keeps
   the existing dedicated layout. Shared by the web game and the iOS bundle. */
(()=>{'use strict';
 if(window.SkylinePortfolio)return;
 const previous=openAssets;
 const css=document.createElement('link');css.rel='stylesheet';css.href='./lib/portfolio-manage.css';document.head.append(css);
 const groupColour=i=>SQ[i].g?GC[SQ[i].g]:SQ[i].t==='rail'?'#7f8a96':'#9aa3ad';
 const groupName=i=>SQ[i].g?GNAME[SQ[i].g]:SQ[i].t==='rail'?'Transit hubs':'Utilities';
 const level=o=>o.h===5?'Skyline Tower':o.h?o.h+' house'+(o.h>1?'s':''):'No buildings';
 function reasons(p,i,ro){
  const s=SQ[i],o=G.own[i],isP=s.t==='prop',out={};
  if(ro){out.all=G.over?'Match finished: property changes are closed.':'View only: actions open on your own turn.';return out}
  if(isP&&!o.m&&o.h<5&&!canBuild(p.id,i))out.build=whyNoBuild(p,i,0)||'Building is not available right now.';
  if(isP&&o.h&&!canSell(p.id,i))out.sell=o.h===5&&G.houses<4?'The bank has too few houses to break up this tower.':'Sell evenly: start with the most developed street in the district.';
  if(!o.m&&!canMortgage(p.id,i))out.mort='Sell this district’s buildings before mortgaging.';
  if(o.m&&!canUnmort(p.id,i))out.redeem=`Needs ${fmt(unmCost(i)-p.cash)} more match cash (you have ${fmt(p.cash)}).`;
  return out;
 }
 openAssets=function(p,opts={}){
  if(opts.debt)return previous.apply(this,arguments);
  const ro=!!opts.readonly||!!G?.over;let filter=opts.filter||'all';
  return modal({cls:'pf2 pfm',tdef:ro?undefined:'done',html:'<div class="pfm-top"><h2></h2><button class="pfm-x" aria-label="Close">✕</button></div><div class="pfm-stats"></div><div class="pfm-tabs" role="tablist"></div><div class="pfm-list" role="tabpanel"></div>',onMount:(pn,close)=>{
   pn.closest('.ov')?.classList.add('pf2ov','pfmov');
   pn.querySelector('.pfm-x').onclick=()=>close('done');
   const act=(fn,i)=>{fn();sfx('buy');renderRoster();try{updateTools()}catch{}save();draw();const row=pn.querySelector(`[data-square="${i}"]`);row?.classList.add('pfm-flash')};
   function draw(){
    const list=propsOf(p.id),mort=list.filter(i=>G.own[i].m),can=ro?[]:list.filter(i=>canBuild(p.id,i));
    const sets=Object.keys(GROUPS).map(g=>({g,all:GROUPS[g],mine:GROUPS[g].filter(i=>G.own[i].o===p.id)}));
    const incomplete=sets.filter(x=>x.mine.length&&x.mine.length<x.all.length);
    pn.querySelector('h2').textContent=ro&&p.id!==G.players.find(q=>!q.ai&&(!G.online||q.uid===NET.me))?.id?`${p.name}’s portfolio`:'Your portfolio';
    pn.querySelector('.pfm-stats').innerHTML=`<span><small>Match cash</small><b data-pfm-cash>${fmt(p.cash)}</b></span><span><small>Properties</small><b>${list.length}</b></span><span><small>Complete sets</small><b>${sets.filter(x=>x.mine.length===x.all.length).length}</b></span><span><small>Net worth</small><b>${fmt(netWorth(p))}</b></span>${ro?`<span class="pfm-ro"><small>Status</small><b>${G.over?'Match finished':'View only'}</b></span>`:''}`;
    const tabs=[['all','All properties',list.length],['build','Can build',can.length],['mort','Mortgaged',mort.length],['missing','Missing sets',incomplete.length]].filter(([k])=>!(ro&&k==='build'));
    if(!tabs.some(([k])=>k===filter))filter='all';
    const T=pn.querySelector('.pfm-tabs');T.innerHTML=tabs.map(([k,l,n])=>`<button role="tab" data-f="${k}" aria-selected="${filter===k}" class="${filter===k?'on':''}" title="${l}: ${n}">${l}<em aria-hidden="true">${n}</em></button>`).join('');
    T.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;draw();pn.querySelector('.pfm-list').scrollTop=0});
    const L=pn.querySelector('.pfm-list');L.innerHTML='';
    if(filter==='missing'){drawMissing(L,incomplete);return}
    const rows=filter==='build'?can:filter==='mort'?mort:list;
    if(!rows.length){L.innerHTML=`<p class="pfm-empty">${filter==='build'?'Nothing can be built right now. Complete a district, redeem its mortgages and keep enough match cash.':filter==='mort'?'No mortgaged properties.':'No properties yet. Land on an unowned street and buy it, or win it at auction.'}</p>`;return}
    let last=null;
    rows.slice().sort((a,b)=>(SQ[a].g?Object.keys(GROUPS).indexOf(SQ[a].g):99)-(SQ[b].g?Object.keys(GROUPS).indexOf(SQ[b].g):99)||a-b).forEach(i=>{
     const s=SQ[i],o=G.own[i],key=s.g||s.t;
     if(key!==last&&filter!=='mort'){last=key;const all=s.g?GROUPS[s.g]:s.t==='rail'?RAILS:UTILS,mine=all.filter(j=>G.own[j].o===p.id).length;
      const h=el('div','pfm-group');h.innerHTML=`<i style="background:${groupColour(i)}"></i><b>${esc(groupName(i))}</b><span>${mine} / ${all.length}${s.g&&mine===all.length?' · Complete set':''}</span>`;L.append(h)}
     L.append(filter==='mort'?mortRow(i):propRow(i));
    });
   }
   function propRow(i){
    const s=SQ[i],o=G.own[i],isP=s.t==='prop',why=reasons(p,i,ro),r=el('div','pfm-row'+(o.m?' is-mort':''));r.dataset.square=String(i);r.style.setProperty('--pc',groupColour(i));
    const rent=o.m?'No rent while mortgaged':isP?`Rent ${fmt(rentFor(i,7))}`:s.t==='rail'?`Rent ${fmt(rentFor(i,7))}`:'Rent 4–10× dice';
    r.innerHTML=`<span class="pfm-info"><b>${esc(s.n)}</b><small>${esc(groupName(i))} · ${o.m?'<em class="bad">Mortgaged</em>':isP?level(o):'Owned'} · ${rent}</small>${isP?`<span class="pfm-pips" aria-label="${level(o)}">${[1,2,3,4].map(k=>`<i class="${o.h===5||o.h>=k?'on':''}"></i>`).join('')}<i class="tower ${o.h===5?'on':''}"></i></span>`:''}</span><span class="pfm-acts"></span><small class="pfm-why"></small>`;
    const A=r.querySelector('.pfm-acts'),W=r.querySelector('.pfm-why'),notes=[];
    const btn=(label,cls,ok,fn,note,tag)=>{const b=el('button','pfm-btn '+cls,label);b.disabled=!ok;if(tag&&ok)b.dataset[tag]=String(i);b.onclick=()=>{if(!b.disabled)act(fn,i)};A.append(b);if(!ok&&note)notes.push(note)};
    if(!ro){
     if(isP&&!o.m&&o.h<5){const c=devCost(p.id,i);btn(`${o.h===4?'Build tower':'Build house'}<small>${fmt(c)} · rent → ${fmt(s.r[o.h+1])}</small>`,'gold',canBuild(p.id,i),()=>build(p.id,i),why.build,'quickBuild')}
     if(isP&&o.h)btn(`Sell <small>+${fmt(s.h/2)}</small>`,'dark',canSell(p.id,i),()=>sell(p.id,i),why.sell);
     if(o.m)btn(`Redeem <small>${fmt(unmCost(i))}</small>`,'gold',canUnmort(p.id,i),()=>unmortgage(p.id,i),why.redeem);
     else btn(`Mortgage<small>+${fmt(s.p/2)}</small>`,'dark',canMortgage(p.id,i),()=>mortgage(p.id,i),why.mort);
    }else notes.push(why.all);
    const loc=el('button','pfm-btn ghost','Locate');loc.setAttribute('aria-label','Locate '+s.n+' on the board');loc.onclick=()=>{close('done');setTimeout(()=>{try{camFocus(i)}catch{}highlight(i)},250)};A.append(loc);
    W.textContent=notes.join(' ');if(!notes.length)W.remove();
    return r;
   }
   function mortRow(i){
    const s=SQ[i],cost=unmCost(i),ok=!ro&&canUnmort(p.id,i),r=el('div','pfm-row pfm-mort');r.dataset.square=String(i);r.style.setProperty('--pc',groupColour(i));
    r.innerHTML=`<span class="pfm-info"><b>${esc(s.n)}</b><small>${esc(groupName(i))}</small><em class="bad">Mortgaged · no rent</em></span><span class="pfm-cost"><small>Redemption cost</small><b>${fmt(cost)}</b><small>Match cash ${fmt(p.cash)}</small></span><span class="pfm-acts"></span><small class="pfm-why"></small>`;
    const b=el('button','pfm-btn gold big','Redeem');b.dataset.redeem=String(i);b.disabled=!ok;b.setAttribute('aria-label',`Redeem ${s.n} for ${fmt(cost)}`);
    b.onclick=()=>{if(!canUnmort(p.id,i)){toast(reasons(p,i,ro).redeem||'Redemption is not available.');draw();return}act(()=>unmortgage(p.id,i),i)};
    r.querySelector('.pfm-acts').append(b);
    const why=ro?reasons(p,i,true).all:reasons(p,i,false).redeem;const W=r.querySelector('.pfm-why');if(why)W.textContent=why;else W.remove();
    return r;
   }
   function drawMissing(L,incomplete){
    if(!incomplete.length){L.innerHTML='<p class="pfm-empty">No partly owned districts. Buy a street to start a set.</p>';return}
    incomplete.sort((a,b)=>(a.all.length-a.mine.length)-(b.all.length-b.mine.length)).forEach(x=>{
     const h=el('div','pfm-group');h.innerHTML=`<i style="background:${GC[x.g]}"></i><b>${esc(GNAME[x.g])}</b><span>${x.mine.length} / ${x.all.length} owned · ${x.all.length-x.mine.length} missing</span>`;L.append(h);
     x.all.filter(i=>G.own[i].o!==p.id).forEach(i=>{const o=G.own[i],r=el('div','pfm-row pfm-missing');r.dataset.square=String(i);r.style.setProperty('--pc',GC[x.g]);
      r.innerHTML=`<span class="pfm-info"><b>${esc(SQ[i].n)}</b><small>${o.o>=0?'Owned by '+esc(P(o.o).name)+(o.m?' · mortgaged':''):'Unowned · price '+fmt(SQ[i].p)}</small></span><span class="pfm-acts"></span>`;
      const A=r.querySelector('.pfm-acts');
      if(!ro&&o.o>=0&&!P(o.o).bankrupt&&typeof openTrade==='function'){const t=el('button','pfm-btn dark','Offer trade');t.onclick=()=>{close('done');setTimeout(()=>{try{openTrade(p)}catch{toast('Trading isn’t available right now')}},250)};A.append(t)}
      const loc=el('button','pfm-btn ghost','Locate');loc.onclick=()=>{close('done');setTimeout(()=>{try{camFocus(i)}catch{}highlight(i)},250)};A.append(loc);
      L.append(r)})});
   }
   draw();
  }});
 };
 window.SkylinePortfolio=Object.freeze({version:'portfolio-manage-1',reasons});
})();
