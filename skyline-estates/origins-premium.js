/* Skyline Origins — premium art-direction exploration on the real Classic 40-space board.
   Runs ONLY in origins-premium-lab.html's same-origin iframe. No storage writes,
   rules mutations, save-key changes or Career activation.
   Scene changes are visual-only Node objects in the existing renderer. */
(function(){
 'use strict';
 if(window.SkylineOriginsPremiumLab)return;
 let ready=false,observer=null,refreshQueued=false,premiumCameraSet=false;
 const skin={
   sky:'linear-gradient(180deg,#0e2339 0%,#24617b 48%,#102a42 100%)',
   fogC:'#718a89',fog:[26,65],skyL:'#b1c6d6',gnd:'#78563a',
   sun:['#ffd18b',.72],L:[-.52,.7,.33],
   water:'#0c5578',wave:1,island:'#244456',rim:'#c49a5d',
   cloud:'#f4cb96',cloudEm:.19,night:0,palms:1,mount:0,fx:''
 };
 const board={
   cell:'#fff0d6',line:'#76502b',text:'#1c2741',frame:'#c89b55',
   slab:'#84522e',trim:'#382316',pave:'#d7c6a7',plot:'#d2bf9b',
   road:'#425a62',lane:'#fff0d0',gold:'#e8b459',
   logo:['#ffd268','#152c48'],ribbon:['#174e70','#ffe7ac'],
   tag:'SKYLINE ORIGINS • GOLDEN HOUR'
 };
 const isReady=()=>typeof S3!=='undefined'&&!!S3;
 function applyPalette(){
  if(typeof THEMES!=='object'||typeof BOARDS!=='object')return false;
  Object.assign(THEMES.beach,skin);
  // Existing original painter remains authoritative. Only its materials and
  // typography palette change; all 40 labels/rects remain game-drawn.
  Object.assign(BOARDS.beach,board);
  if(isReady()&&typeof applyTheme==='function'){
   S3.boardDrawnFor=null;
   applyTheme('beach');
  }
  return true;
 }
 function addArchitecture(){
  if(!isReady()||!S3.centers||!S3.centers.beach)return 0;
  const group=S3.centers.beach;if(group.originsPremiumAdded)return group.originsPremiumCount||0;
  const geo=S3.geo;
  const gold=mat('#e7b364',{spec:.88,em:.13}),bronze=mat('#704529',{spec:.45}),
        glass=mat('#225b83',{spec:.91,em:.08}),azure=mat('#347fa8',{spec:.83,em:.09}),
        warm=mat('#ffd68c',{em:.85,unlit:1}),
        white=mat('#dac7a6',{spec:.44}),stone=mat('#ad9374',{spec:.24});
  const loci=[
   [-2.92,-2.72,1.42,.46],[-2.20,-2.6,1.86,.51],[-1.38,-2.52,2.55,.54],
   [-.32,-2.91,1.55,.43],[.82,-2.72,2.34,.5],[2.06,-2.59,1.95,.53],
   [3.05,-1.62,1.48,.39],[2.92,-.42,2.61,.48],[3.10,1.24,1.58,.45],
   [2.50,2.54,1.82,.53],[1.23,2.66,2.52,.49],[-.14,2.86,1.58,.44],
   [-1.54,2.59,2.05,.52],[-2.70,2.24,1.74,.47],[-3.06,.72,2.18,.39]
  ];
  for(let i=0;i<loci.length;i++){
   const [x,z,h,w]=loci[i],b=new Node().at(x,0,z);
   // A raised stone parcel with gold footprint and deep-glazed upper stories.
   b.add(N(geo.box,stone,0,.055,0).sc(w*1.65,.11,w*1.65));
   b.add(N(geo.box,bronze,0,.13,0).sc(w*1.35,.08,w*1.35));
   b.add(N(geo.box,i%4===0?white:i%3===0?azure:glass,0,h/2+.16,0).sc(w,h,w));
   b.add(N(geo.box,gold,0,h+.2,0).sc(w*1.1,.10,w*1.1));
   b.add(N(geo.box,white,0,h+.31,0).sc(w*.65,.16,w*.65));
   // Reflective glass accent: from high camera angle it reads as a skyscraper,
   // not a painted cuboid. Gold-lit vertical windows give scale at 3×.
   const nx=2+(i%3),height=h*.72;
   for(let k=0;k<nx;k++){
    const off=(k-(nx-1)/2)*w/(nx+1)*1.4;
    b.add(N(geo.box,warm,off,.27+height/2,w/2+.008).sc(w*.11,height,.018));
    b.add(N(geo.box,warm,w/2+.008,.27+height/2,off).sc(.018,height,w*.11));
   }
   if(i%4===1){
    b.add(N(geo.cyl8,gold,0,h+.46,0).sc(w*.13,.25,w*.13));
    b.add(N(geo.sph,warm,0,h+.63,0).sc(w*.12));
   }
   group.add(b);
   if(typeof S3.shadow==='function')S3.shadow(x,z,Math.max(w*.92,.58),group);
  }
  // A golden central civic fountain and promenades, legible from default
  // camera and intentionally clear of the legal board's perimeter spaces.
  const plaza=new Node().at(.13,0,.25);
  plaza.add(N(geo.cyl8,stone,0,.045,0).sc(.95,.09,.95));
  plaza.add(N(geo.cyl8,gold,0,.112,0).sc(.84,.05,.84));
  plaza.add(N(geo.cyl8,mat('#168cad',{spec:.74}),0,.153,0).sc(.72,.035,.72));
  plaza.add(N(geo.cyl8,white,0,.31,0).sc(.16,.3,.16));
  plaza.add(N(geo.sph,mat('#7cdaeb',{spec:.75,em:.35}),0,.51,0).sc(.22,.17,.22));
  for(let k=0;k<8;k++){
   const a=k*Math.PI/4;plaza.add(N(geo.sph,warm,Math.cos(a)*.62,.20,Math.sin(a)*.62).sc(.055));
  }
  group.add(plaza);
  // Landscape framed by pocket-lit trees. Use a small constant node budget;
  // these are drawn once and never affect token positions or game rules.
  const trunk=mat('#795233'),crown=mat('#1e7c52',{spec:.15});
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2+.14,r=3.28;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const t=new Node().at(x,0,z);
    t.add(N(geo.cyl8,trunk,0,.25,0).sc(.055,.49,.055));
    t.add(N(geo.sph,crown,0,.59,0).sc(.28,.37,.28));
    t.add(N(geo.sph,mat('#359d65'),.11,.76,-.06).sc(.15,.2,.17));
    group.add(t);
  }
  group.originsPremiumAdded=true;group.originsPremiumCount=loci.length;
  return loci.length;
 }
 function ensureHud(){
  document.documentElement.classList.add('origins-premium-v1');
  if(!document.querySelector('#originsPremiumMark')){
   const mark=document.createElement('div');mark.id='originsPremiumMark';
   mark.setAttribute('aria-hidden','true');
   mark.innerHTML='✦ SKYLINE ESTATES <small>ORIGINS · CAREER BOARD 1</small>';
   document.body.append(mark);
  }
  if(!document.querySelector('#originsPremiumStats')){
   const box=document.createElement('aside');box.id='originsPremiumStats';
   box.setAttribute('aria-label','Origins match portfolio overview');
   box.hidden=true;document.body.append(box);
  }
  if(!document.querySelector('#originsPremiumProgress')){
   const bar=document.createElement('div');bar.id='originsPremiumProgress';
   bar.setAttribute('aria-hidden','true');bar.textContent='40 SPACES  ·  REAL PROPERTY  ·  LIVING CITY';
   document.body.append(bar);
  }
 }
 function stats(){
  const el=document.querySelector('#originsPremiumStats');
  if(!el||typeof G==='undefined'||!G||!G.players||document.querySelector('#ui')?.hidden){if(el)el.hidden=true;return}
  const you=G.players.find(p=>!p.ai)||G.players[0];
  if(!you){el.hidden=true;return}
  let plots=0,dev=0;
  for(const o of G.own||[]){if(o&&o.o===you.id){plots++;dev+=o.h||0}}
  const coins=Math.max(0,Math.round(you.cash||0));
  const round=Math.max(1,Math.round(G.round||1));
  const title='<div class="orgStatsTitle">✦ MY PORTFOLIO</div>';
  el.innerHTML=title+
   '<div class="orgStatsRow"><span>Properties</span><strong>'+plots+' / 40</strong></div>'+
   '<div class="orgStatsRow"><span>Developments</span><strong>'+dev+'</strong></div>'+
   '<div class="orgStatsRow"><span>Skyline Cash</span><strong>SC '+coins.toLocaleString('en')+'</strong></div>'+
   '<div class="orgStatsRow"><span>Round</span><strong>'+round+'</strong></div>';
  el.hidden=false;
 }
 function refresh(){
  ensureHud();
  if(!isReady())return{ready:false,buildings:0};
  if(!premiumCameraSet&&typeof G!=='undefined'&&G&&!document.querySelector('#ui')?.hidden){
   // Board 1 reference: full 40-square perimeter in frame, gently isometric
   // rather than a dramatic near-horizontal board filling the whole screen.
   // One-time lab camera only; user-driven orbit/zoom is not overwritten.
   if(typeof camGoal==='function'){
    camMode='board';camGoal([0,0,0],0,19.4,1.16,16);
    premiumCameraSet=true;
   }
  }
  // A real game should select its own edition as before. This showcase only
  // recolours the established Lagos beach edition, not other editions.
  const b=addArchitecture();stats();return{ready:true,buildings:b,boardCount:40};
 }
 function queueRefresh(){
  if(refreshQueued)return;refreshQueued=true;
  requestAnimationFrame(()=>{refreshQueued=false;refresh()});
 }
 function apply(){
  if(ready)return refresh();
  ready=true;applyPalette();ensureHud();
  const ui=document.querySelector('#ui'),roster=document.querySelector('#roster');
  if(ui){observer=new MutationObserver(queueRefresh);observer.observe(ui,{attributes:true,attributeFilter:['hidden']});}
  if(roster){const o=new MutationObserver(queueRefresh);o.observe(roster,{childList:true,subtree:true});}
  return refresh();
 }
 window.SkylineOriginsPremiumLab=Object.freeze({apply,refresh,sceneCount:()=>isReady()&&S3.centers?.beach?.originsPremiumCount||0});
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply,{once:true}):apply();
})();
