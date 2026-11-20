/* Career Board 1 presentation adapter (origins-career.html); rules and storage remain in game.html. */
(async function(){
 'use strict';
 if(window.SkylineOriginsProduction)return;
 const [mod,art]=await Promise.all([import('./origins-production-renderer.js'),import('./presentation/origins-footer-art.js')]);
 const ui=document.querySelector('#ui'),canvas=document.createElement('canvas');canvas.id='originsProductionCanvas';canvas.setAttribute('aria-label','Skyline Origins real 3D board — tap a property to inspect');document.body.insertBefore(canvas,document.body.firstChild);
 const hud=document.createElement('div');hud.id='originsProductionHud';hud.innerHTML=`
  <div id="orgAssetStatus" role="status">Loading local 3D assets…</div>
  <aside id="orgCareer"><div class="orgBrand"><span aria-hidden="true">▂▅▇▆▃</span><b>SKYLINE<br>ESTATES</b><small>Career Mode</small></div><button id="orgBoardOne"><em>1</em><span>Skyline Origins<small>Live match · 40 spaces</small></span></button><div class="orgOtherBoards"><span>2 <b>City Ventures</b></span><span>3 <b>Crossroads Capital</b></span><span>4 <b>Skyline Dominion</b></span><span>5 <b>Skyline Empire</b></span></div></aside>
  <header id="orgHeading"><h1>Skyline Origins</h1><p>The Property Development Classic</p><span id="orgRound"></span></header>
  <aside id="orgPortfolio" aria-label="Live match portfolio"></aside>
  <section id="orgFootnotes"><div><b>Board Overview</b><span>40 perimeter spaces · Buy, develop and trade · Highest net worth wins</span></div><div id="orgGroups"><b>Property Groups</b></div><div id="orgStages"><b>Development Progression</b><span>Lot → Mid-rise (1–2) → High-rise (3–4) → Skyscraper (5)</span></div></section>
  <nav id="orgDock" aria-label="Match actions"><div id="orgTrade"></div><button id="orgBuild">♜ <span>Build</span></button><div id="orgActs"></div><div id="orgManage"></div><button id="orgView">Detail view</button></nav>`;ui.append(hud);
 document.querySelector('#orgFootnotes').innerHTML=`<div id="orgOverview"><b>Board Overview</b><div class="orgOverviewBody"><div id="orgOverviewArt"></div><ul><li>40 spaces around the perimeter</li><li>Buy, develop and trade</li><li>Highest net worth wins</li></ul></div></div><div id="orgGroups"><b>Property Groups</b><div class="orgDistrictCards"></div></div><div id="orgStages"><b>Development Progression</b><div class="orgStageTrack">${['Lot','Mid-Rise','High-Rise','Skyscraper'].map((name,i)=>`<div class="orgStage">${art.buildingArt(i)}<strong>${name}</strong><small>${['Buy','Levels 1–2','Levels 3–4','Level 5'][i]}</small></div>`).join('')}</div></div>`;
 // On/off switch (20 Nov 2026): the board is applied only while a match it serves is running, and the classic
 // game's own buttons are moved back afterwards. Scope 'career' (set by Career) limits it to Career Origins matches;
 // the review lab keeps the default scope 'all'.
 const SCOPE=window.SkylineOriginsProductionScope==='career'?'career':'all';
 const roster=document.querySelector('#roster'),moved=['bTrade','bAssets','acts'].map(id=>{const el=document.getElementById(id);return{el,parent:el.parentNode,next:el.nextSibling};});
 let on=false;
 const wanted=()=>typeof G!=='undefined'&&!!G&&document.querySelector('#title').hidden&&(SCOPE==='all'||!!(G.set&&G.set.career==='origins'));
 function attach(){if(on)return;on=true;document.documentElement.classList.add('origins-production');hud.hidden=false;roster.classList.add('orgLivePlayers');
  document.querySelector('#orgTrade').append(document.querySelector('#bTrade'));document.querySelector('#orgManage').append(document.querySelector('#bAssets'));document.querySelector('#orgActs').append(document.querySelector('#acts'));
  for(const [id,label]of[['bTrade','Trade'],['bAssets','Manage']]){const b=document.getElementById(id);if(!b.querySelector('[data-org-label]')){const text=document.createElement('span');text.dataset.orgLabel='1';text.textContent=label;b.append(text);}}
  viewport=null;renderer?.resize();}
 function detach(){if(!on)return;on=false;document.documentElement.classList.remove('origins-production','origins-production-active');hud.hidden=true;canvas.hidden=true;roster.classList.remove('orgLivePlayers');
  for(const m of moved){m.el.querySelectorAll('[data-org-label]').forEach(x=>x.remove());if(m.next&&m.next.parentNode===m.parent)m.parent.insertBefore(m.el,m.next);else m.parent.append(m.el);}
  const rb=document.querySelector('#acts [aria-label="Roll dice"]');if(rb?.lastChild?.nodeType===3&&rb.lastChild.textContent==='ROLL DICE')rb.lastChild.textContent='ROLL';}
 hud.hidden=true;canvas.hidden=true;
 document.querySelector('#orgBuild').onclick=()=>document.querySelector('#bAssets').click();
 const formatRoll=()=>{if(!on)return;const b=document.querySelector('#acts [aria-label="Roll dice"]');if(b?.lastChild?.nodeType===3&&b.lastChild.textContent==='ROLL')b.lastChild.textContent='ROLL DICE';};new MutationObserver(formatRoll).observe(document.querySelector('#acts'),{childList:true});formatRoll();
 document.querySelector('#orgBoardOne').onclick=()=>modal({html:'<div class="mh">Skyline Origins</div><div class="mtxt">The current match uses the original 40-space perimeter and its existing rules. Other Career boards are available through the Career menu.</div>',btns:[{k:'x',label:'Close',primary:true}]});
 let detail=false;document.querySelector('#orgView').onclick=()=>{detail=!detail;renderer.mode(detail?'detail':'board');document.querySelector('#orgView').textContent=detail?'Full board':'Detail view';};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let lastHud='',lastGroups='',renderer,lastLayout=0,viewport=null;
 function viewportInsets(){
  if(viewport&&performance.now()-lastLayout<400)return viewport;
  const career=document.querySelector('#orgCareer').getBoundingClientRect(),portfolio=document.querySelector('#orgPortfolio').getBoundingClientRect(),heading=document.querySelector('#orgHeading').getBoundingClientRect(),dock=document.querySelector('#orgDock').getBoundingClientRect();
  viewport={left:career.right+8,right:innerWidth-portfolio.left+8,top:heading.bottom+8,bottom:innerHeight-dock.top+8};lastLayout=performance.now();return viewport;
 }
 addEventListener('resize',()=>{viewport=null;renderer?.resize();});
 visualViewport?.addEventListener('resize',()=>{viewport=null;renderer?.resize();});
 function read(){
  if(!on||typeof G==='undefined'||!G||document.querySelector('#title')?.hidden!==true)return{active:false};
  // Between matches (or while one is being set up) the classic scene and tokens may not exist yet.
  if(typeof S3==='undefined'||!S3||!S3.dice||G.players.some(p=>!tok3[p.id]))return{active:false};
  const you=G.players.find(p=>!p.ai)||G.players[0];let developed=0,owned=0;
  for(const o of G.own)if(o.o===you.id){owned++;developed+=o.h||0;}
  const hudKey=[G.set.ai,G.set.mode,G.turn,G.round,G.phase,owned,developed,you.cash,netWorth(you),G.over].join('|');
  document.querySelector('#orgBuild').disabled=document.querySelector('#bAssets').disabled;
  if(hudKey!==lastHud){lastHud=hudKey;document.querySelector('#orgBoardOne small').textContent='Easy · 40 spaces';document.querySelector('#orgPortfolio').innerHTML='<h2>♙ My Portfolio</h2>'+[['Properties',owned+' / 40'],['Developments',developed],['Complete Sets',Object.keys(GROUPS).filter(g=>ownsAll(you.id,g)).length],['Net Worth',fmt(netWorth(you))]].map(([k,v])=>'<p><span>'+esc(k)+'</span><b>'+esc(v)+'</b></p>').join('');document.querySelector('#orgRound').textContent='Career Board 1 of 5 · Round '+G.round+(G.set.rounds?' / '+G.set.rounds:'');}
  const groupKey=JSON.stringify([G.set.city,GC,G.own.map(o=>o.o)]);if(groupKey!==lastGroups){lastGroups=groupKey;
   document.querySelector('#orgOverviewArt').innerHTML=art.boardOverviewArt(SQ.map(s=>({color:GC[s.g]||'#c8d8df'})));
   document.querySelector('#orgGroups .orgDistrictCards').innerHTML=Object.keys(GROUPS).map((g,i)=>{const ids=GROUPS[g],count=ids.filter(j=>G.own[j].o===you.id).length,label=CITY_DATA[G.set.city||'lagos']?.gname?.[g]||g;return `<button class="orgDistrictCard" data-square="${ids[0]}" style="--district:${GC[g]}" aria-label="${esc(label)}: ${count} of ${ids.length} owned. View property"><strong>${esc(label)}</strong>${art.districtArt(GC[g],i)}<small>${count} / ${ids.length} owned</small></button>`;}).join('');
   document.querySelectorAll('.orgDistrictCard').forEach(b=>b.onclick=()=>showSquare(Number(b.dataset.square)));
  }
  return{active:true,viewport:viewportInsets(),
   squares:SQ.map((s,i)=>({name:s.n,type:s.t,color:GC[s.g]||({go:'#77bca3',jail:'#b5c7de',free:'#9fcbd1',gojail:'#a6c8df',chance:'#a6d1de',esusu:'#d3c1dc',tax:'#dae0e2',rail:'#b6cbd8',util:'#c8d9e3'}[s.t]||'#c6d2d8'),price:s.p?fmt(s.p):'',rect:rect(i)})),
   ownership:G.own.map(o=>({owner:o.o,stage:o.h,mortgaged:o.m})),
   players:G.players.map(p=>({id:p.id,color:p.col,out:p.bankrupt,node:tok3[p.id],textureURL:'./items/board/tok-'+TOK_SLUG[p.tok]+'.webp',world:tok3[p.id]?.p?.slice()||[wx(tokenXY(p)[0]),0,wz(tokenXY(p)[1])]})),
   dice:G.lastDice||null,diceSkin:diceSkin().id,follow:typeof camMode==='undefined'||camMode==='follow',nativeDice:S3&&S3.dice?[...S3.dice,S3.sdie].filter(Boolean):[],cosmeticKey:JSON.stringify(PREF.eq)};
 }
 try{renderer=mod.createOriginsRenderer(canvas,{read,onSquare:i=>{if(!document.querySelector('#modals').children.length)showSquare(i);}});}catch(e){canvas.remove();document.documentElement.classList.remove('origins-production');throw e;}
 const originalDrawScene=drawScene;drawScene=function(time){if(!on)return originalDrawScene(time);};
 const loading=document.querySelector('#orgAssetStatus');const monitor=setInterval(()=>{const pack=renderer.stats().pack;if(pack?.error){loading.hidden=false;loading.textContent='Local asset loading failed: '+pack.error;clearInterval(monitor);}else if(pack?.kind==='supplied-v5'||pack?.loading===false){loading.hidden=true;clearInterval(monitor);}},500);
 window.SkylineOriginsProduction=Object.freeze({renderer,active:()=>on,sync:()=>sync(),refresh:()=>{viewport=null;read();renderer.resize();},snapshot:()=>{const {nativeDice,...v}=read();return{...v,players:v.players?.map(({node,...p})=>p)};},stats:()=>renderer.stats(),visualOnly:true});
 const sync=()=>{const want=wanted();if(want)attach();else detach();document.documentElement.classList.toggle('origins-production-active',want);};
 new MutationObserver(sync).observe(document.querySelector('#title'),{attributes:true,attributeFilter:['hidden']});setInterval(sync,400);sync();
})().catch(e=>{console.error('Origins local reconstruction failed:',e);const status=document.createElement('div');status.setAttribute('role','alert');status.textContent='The local reconstruction could not load. Reload with ?legacy=1 for the preserved draft.';Object.assign(status.style,{position:'fixed',top:'50%',left:'15%',right:'15%',zIndex:1000,background:'#142338',color:'#ffe4a3',padding:'20px'});document.body.append(status);});
