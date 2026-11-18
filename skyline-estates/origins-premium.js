/* Skyline Origins — premium art-direction exploration on the real Classic 40-space board.
   Runs ONLY in origins-premium-lab.html's same-origin iframe. No storage writes,
   rules mutations, save-key changes or Career activation.
   Scene changes are visual-only Node objects in the existing renderer. */
(function(){
 'use strict';
 if(window.SkylineOriginsPremiumLab)return;
 let ready=false,observer=null,refreshQueued=false,premiumCameraSet=false,premiumDprConfigured=false;
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
 function deepenActualScene(){
  if(!isReady())return false;
  // Skyline's existing Surround system can override theme colours after
  // applyTheme(). Correct the real Node materials AFTER that cascade.
  // This avoids the pale peach giant island seen in the first Retina render.
  S3.islandMat.c=hex('#183e52');S3.rimMat.c=hex('#775535');
  S3.slabMat.c=hex('#503a2b');S3.trimMat.c=hex('#2b211c');
  S3.waterMat.c=hex('#0c5076');S3.waterMat.spec=.52;
  // The original oversized decagonal island obscures the waterfront. Origins
  // is an elegant square game-board *over* water, not a dark polygon island.
  // Hide only these two review-only plinth meshes; the actual 40-space
  // board slab, physical trim, token interactions and collisions are intact.
  for(const n of ROOT.kids){
   if(n.mat===S3.islandMat||n.mat===S3.rimMat)n.visible=false;
  }
  if(S3.groundNear&&S3.groundNear.visible)S3.groundNear.mat.c=hex('#2c5263');
  if(S3.groundFar&&S3.groundFar.visible)S3.groundFar.mat.c=hex('#193949');
  return true;
 }
 function paintPremiumCityGround(){
  if(!isReady()||!S3.boardCanvas)return false;
  // Board textures are rebuilt when Skyline updates city/theme. Repaint this
  // centre after each game roster refresh so the approved generic Origins
  // plaza doesn't revert to the large country-specific logo mid-session.
  const ctx=S3.boardCanvas.getContext('2d'),scale=ctx.canvas.width/1100;
  ctx.save();ctx.setTransform(scale,0,0,scale,0,0);
  // All textures remain inside the validated 40-space perimeter (252–848).
  const turf=ctx.createLinearGradient(250,250,840,850);
  turf.addColorStop(0,'#327c59');turf.addColorStop(.55,'#397f4d');turf.addColorStop(1,'#235e43');
  ctx.fillStyle=turf;ctx.fillRect(254,254,592,592);
  // A fine gold / limestone waterfront city street network, under the
  // existing real 3D buildings. No heavy title painted across the plaza.
  ctx.fillStyle='#9b9b89';ctx.fillRect(520,254,54,592);
  ctx.fillRect(254,508,592,45);
  ctx.fillStyle='#d9bd83';ctx.fillRect(516,254,5,592);ctx.fillRect(573,254,5,592);
  ctx.fillRect(254,503,592,5);ctx.fillRect(254,553,592,5);
  ctx.strokeStyle='#fff2d580';ctx.lineWidth=2;ctx.setLineDash([13,16]);
  ctx.beginPath();ctx.moveTo(548,260);ctx.lineTo(548,841);
  ctx.moveTo(260,530);ctx.lineTo(842,530);ctx.stroke();ctx.setLineDash([]);
  // Civic garden and lagoon terrace: deep teal water and warm-metal edging.
  ctx.fillStyle='#d6b574';ctx.beginPath();ctx.ellipse(550,565,164,126,0,0,Math.PI*2);ctx.fill();
  const water=ctx.createLinearGradient(445,470,640,650);
  water.addColorStop(0,'#249db0');water.addColorStop(1,'#0c5275');
  ctx.fillStyle=water;ctx.beginPath();ctx.ellipse(550,565,146,108,0,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=4;ctx.strokeStyle='#ffdf9d';ctx.stroke();
  ctx.strokeStyle='#b7ece9c2';ctx.lineWidth=2;
  for(let k=0;k<9;k++){
   const y=490+k*16;ctx.beginPath();ctx.moveTo(467+k*2,y);
   ctx.quadraticCurveTo(538,y-8,626-k,y);ctx.stroke();
  }
  // Pavement stones and pocket landscaping, from a deterministic pattern.
  for(let i=0;i<70;i++){
   const x=273+(i*151%565),y=274+(i*223%560);
   if(Math.abs(x-550)<83||Math.abs(y-530)<68)continue;
   ctx.fillStyle=i%3?'#4ca0655c':'#e7c88d47';
   ctx.beginPath();ctx.arc(x,y,2.5+(i%5),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();texUpdate(S3.boardTex);S3.originsPremiumGroundPainted=true;
  return true;
 }
 function decorateWaterfront(){
  if(!isReady()||!S3.centers?.beach)return false;
  const group=S3.centers.beach;
  if(group.originsHarbourAdded)return true;
  const g=S3.geo,quayMat=mat('#8d7562',{spec:.27}),pier=mat('#d0ac6b',{spec:.4}),
   deep=mat('#224f70',{spec:.75,em:.12}),sand=mat('#bba588'),
   nav=mat('#f1e4ca',{spec:.7}),windowLight=mat('#f8d391',{em:.65,unlit:1}),
   leaf=mat('#2d6c55'),lamp=mat('#edc174',{em:.6,unlit:1});
  // Keep the upper harbour inside the landscape frame: the previous taller
  // waterfront towers clipped above the actual iPhone viewport. The adjusted
  // lower, near-shore silhouette leaves clear water between the two districts.
  // Keep the mobile Safari mesh budget small.
  let count=0;
  // One continuous shoreline connects the miniature city blocks. A detached
  // row of three hovering rectangles looked like a UI diorama, not the
  // waterfront metropolis in the approved visual reference.
  const shore=new Node().at(0,-.90,-9.55);
  shore.add(N(g.box,quayMat,0,.05,0).sc(21.2,.12,2.4));
  shore.add(N(g.box,pier,0,.145,1.13).sc(21.2,.07,.18));
  shore.add(N(g.box,deep,0,.11,-1.12).sc(21.2,.08,.11));
  for(let k=0;k<11;k++){
   const x=-9.65+k*1.93;
   shore.add(N(g.cyl8,quayMat,x,.33,1.05).sc(.045,.36,.045));
   shore.add(N(g.sph,lamp,x,.61,1.05).sc(.075));
  }
  group.add(shore);
  for(const [k,x,z] of [[0,-8.2,-9.30],[1,0,-10.0],[2,8.2,-9.30]]){
   const q=new Node().at(x,-.90,z).sc(.55);
   q.add(N(g.box,quayMat,0,.14,0).sc(4.55,.23,3.4));
   q.add(N(g.box,pier,0,.27,1.44).sc(4.5,.085,.35));
   q.add(N(g.box,sand,0,.27,-1.42).sc(4.5,.08,.35));
   for(let j=0;j<5;j++){
    const xx=-1.78+j*.89,height=1.45+((j*7+k*5)%4)*.48,width=.57+((j+k)%2)*.1;
    const tower=new Node().at(xx,.28,-.35);
    tower.add(N(g.box,j%3===0?nav:deep,0,height/2,0).sc(width,height,.72));
    // Golden windows on two real façades.
    for(let fl=1;fl<=Math.max(3,Math.floor(height/.55));fl++){
     const yy=fl*height/(Math.max(3,Math.floor(height/.55))+1);
     tower.add(N(g.box,windowLight,0,yy,.365).sc(width*.55,.10,.018));
     tower.add(N(g.box,pier,width/2+.01,yy,0).sc(.025,.035,.68));
    }
    tower.add(N(g.box,pier,0,height+.08,0).sc(width*1.1,.13,.83));
    q.add(tower);count++;
   }
   // Real waterfront path lamps and groups of evergreen trees.
   for(const xx of [-1.82,1.82]){
    q.add(N(g.cyl8,quayMat,xx,.69,1.1).sc(.045,.78,.045));
    q.add(N(g.sph,lamp,xx,1.11,1.1).sc(.11));
    q.add(N(g.cyl8,quayMat,xx,.53,-1.05).sc(.055,.38,.055));
    q.add(N(g.sph,leaf,xx,.94,-1.05).sc(.32,.49,.34));
   }
   group.add(q);
  }
  // A few anchored miniature white boats add waterfront life; they are
  // presentation-only and do not impersonate player tokens.
  for(const [x,z,ang] of [[-4.9,-8.4,.4],[5.5,-8.2,-.5],[0,-8.0,-.2]]){
   const boat=new Node().at(x,-.74,z).rot(0,ang,0).sc(.7);
   boat.add(N(g.box,nav,0,.15,0).sc(.92,.22,.36));
   boat.add(N(g.box,deep,-.08,.29,0).sc(.44,.16,.28));
   boat.add(N(g.box,pier,.43,.18,0).sc(.12,.09,.42));
   group.add(boat);
  }
  group.originsHarbourAdded=true;group.originsHarbourCount=count;
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
  // Baked 512px facade maps: actual textured 3D towers, detailed at 2.5×
  // iPhone WebGL resolution without hundreds of additional draw calls.
  // Each window has mullions, reflected blue sky, warm apartment lights and
  // small limestone/gold lintels rather than cartoon solid-colour walls.
  const facadeMap=(mode)=>{
   const C=cnv(512,512,(ctx,w,h)=>{
    const stone=mode==='stone',brick=mode==='brick';
    const grad=ctx.createLinearGradient(0,0,512,512);
    grad.addColorStop(0,stone?'#eed4a1':brick?'#c88d71':'#19476c');
    grad.addColorStop(.52,stone?'#be9e74':brick?'#955b54':'#246f93');
    grad.addColorStop(1,stone?'#a98860':brick?'#794747':'#123557');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    const cols=stone||brick?4:6,rows=stone?8:10;
    for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
     const x=22+k*(w-44)/cols,y=15+j*(h-30)/rows,
       ww=(w-44)/cols*.72,hh=(h-30)/rows*.71,lit=(k*19+j*7+mode.length)%8<3;
     ctx.fillStyle=stone?'#b88750':brick?'#68403d':'#0b2d4a';
     ctx.fillRect(x-5,y-5,ww+10,hh+10);
     const win=ctx.createLinearGradient(x,y,x+ww,y+hh);
     win.addColorStop(0,lit?'#f4dfad':'#6ebcd3');
     win.addColorStop(.48,lit?'#b8926c':'#2b779a');
     win.addColorStop(1,lit?'#8d643b':'#123f63');
     ctx.fillStyle=win;ctx.fillRect(x,y,ww,hh);
     ctx.fillStyle=lit?'#ffebb37a':'#b9f7f270';
     ctx.fillRect(x+ww*.10,y+hh*.08,ww*.09,hh*.77);
     ctx.fillStyle='#14294488';ctx.fillRect(x+ww*.49,y,2,hh);
     ctx.fillStyle=stone?'#f1d3a1':brick?'#db9a75':'#8dd1dc';
     ctx.fillRect(x-5,y+hh+2,ww+10,3);
    }
    // Crisp repeating floor rails complement the actual physical crowns.
    for(let j=0;j<rows;j++){
     const y=13+j*(h-30)/rows;
     ctx.fillStyle=stone?'#f2d4a47d':brick?'#e0a98488':'#7dbadf65';
     ctx.fillRect(0,y,512,3);
    }
   });
   return mat('#ffffff',{tex:texFrom(C),spec:mode==='glass'?.85:.38,em:mode==='glass'?.085:.04});
  };
  const facadeGlass=facadeMap('glass'),facadeStone=facadeMap('stone'),
   facadeBrick=facadeMap('brick');
  const loci=[
   [-2.92,-2.72,1.42,.46],[-2.20,-2.6,1.86,.51],[-1.38,-2.52,2.55,.54],
   [-.32,-2.91,1.55,.43],[.82,-2.72,2.34,.5],[2.06,-2.59,1.95,.53],
   [3.05,-1.62,1.48,.39],[2.92,-.42,2.61,.48],[3.10,1.24,1.58,.45],
   [2.50,2.54,1.82,.53],[1.23,2.66,2.52,.49],[-.14,2.86,1.58,.44],
   [-1.54,2.59,2.05,.52],[-2.70,2.24,1.74,.47],[-3.06,.72,2.18,.39]
  ];
  // 3D facade system: varied silhouettes, blue glass, warm limestone and
  // intricate window rhythm. Every piece is actual geometry under the camera,
  // not a screenshot pasted into the board.
  const glassDeep=mat('#185879',{spec:.92,em:.09}),
    glassLight=mat('#2c88af',{spec:.87,em:.11}),
    ivory=mat('#d9c8ad',{spec:.37}),
    warmBrick=mat('#bf8060',{spec:.30}),
    roof=mat('#344f66',{spec:.5}),dusk=mat('#5bb6cf',{spec:.8,em:.14});
  for(let i=0;i<loci.length;i++){
   const [x,z,h,w]=loci[i],b=new Node().at(x,0,z),kind=i%5;
   const main=kind===0?facadeStone:kind===2?facadeBrick:facadeGlass;
   const high=h*(kind===2?.85:1);
   const ww=w*(kind===0?1.05:1),dd=w*(kind===3?.79:1);
   // Gold-footed parcel with steps, so towers sit in a designed city block.
   b.add(N(geo.box,stone,0,.055,0).sc(ww*1.48,.11,dd*1.5));
   b.add(N(geo.box,bronze,0,.128,0).sc(ww*1.3,.05,dd*1.31));
   b.add(N(geo.box,gold,0,.18,0).sc(ww*1.21,.055,dd*1.21));
   b.add(N(geo.box,main,0,.21+high/2,0).sc(ww,high,dd));
   // Façade pilasters and slim illuminated windows break up the former
   // bare yellow blocks; horizontal floor lines read at iPhone distance.
   const glassPanel=kind===0?glassDeep:kind===2?glassLight:dusk;
   for(const k of [-1,1]){
    b.add(N(geo.box,kind===2?ivory:gold,k*ww*.44,.21+high/2,dd/2+.021).sc(ww*.055,high*.95,.035));
    b.add(N(geo.box,kind===2?ivory:gold,ww/2+.021,.21+high/2,k*dd*.43).sc(.035,high*.95,dd*.055));
   }
   for(let k=0;k<4;k++){
    const dx=(k-1.5)*ww*.205,dz=(k-1.5)*dd*.205;
    b.add(N(geo.box,glassPanel,dx,.22+high*.51,dd/2+.025).sc(ww*.15,high*.72,.023));
    b.add(N(geo.box,glassPanel,ww/2+.025,.22+high*.51,dz).sc(.023,high*.72,dd*.15));
   }
   const floors=Math.max(3,Math.round(high/.42));
   for(let j=1;j<=floors;j++){
    const yy=.23+j*high/(floors+1),trim=kind===2?ivory:bronze;
    b.add(N(geo.box,trim,0,yy,dd/2+.044).sc(ww*.98,.019,.055));
    b.add(N(geo.box,trim,ww/2+.044,yy,0).sc(.055,.019,dd*.98));
    if(j%2===0){
     for(const dx of [-ww*.20,ww*.20]){
      b.add(N(geo.box,warm,dx,yy+.095,dd/2+.063).sc(ww*.095,.115,.024));
     }
    }
   }
   b.add(N(geo.box,gold,0,.24+high,0).sc(ww*1.11,.10,dd*1.11));
   if(kind===1||kind===4){
    // Two-step Art Deco crown, with delicate rooftop antenna.
    b.add(N(geo.box,ivory,0,.32+high,0).sc(ww*.78,.16,dd*.75));
    b.add(N(geo.box,gold,0,.45+high,0).sc(ww*.37,.08,dd*.34));
    b.add(N(geo.cyl8,bronze,0,.56+high,0).sc(.026,.16,.026));
    b.add(N(geo.sph,warm,0,.73+high,0).sc(.058));
   }else if(kind===0){
    b.add(N(geo.box,ivory,0,.36+high,0).sc(ww*.78,.18,dd*.82));
    b.add(N(geo.box,roof,0,.48+high,0).sc(ww*.6,.065,dd*.64));
   }else if(kind===2){
    // Classic low-rise with an angled copper-coloured rooftop.
    b.add(N(geo.cone4,roof,0,.38+high,0).sc(ww*.76,.30,dd*.76).rot(0,Math.PI/4,0));
    b.add(N(geo.box,gold,0,.22+high,0).sc(ww*1.08,.065,dd*1.08));
   }else{
    b.add(N(geo.box,glassLight,0,.36+high,0).sc(ww*.70,.15,dd*.64));
    b.add(N(geo.box,gold,0,.48+high,0).sc(ww*.40,.06,dd*.42));
   }
   // Warm street-level frontage and lamps for dense-city atmosphere.
   b.add(N(geo.box,warm,0,.26,dd/2+.045).sc(ww*.41,.14,.022));
   b.add(N(geo.sph,warm,ww*.65,.21,dd*.65).sc(.065));
   group.add(b);
   if(typeof S3.shadow==='function')S3.shadow(x,z,Math.max(ww*.95,.52),group);
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

 // Unique physical markers follow the REAL moving tokens, including across
 // moves and board rebuilds. This is visual-only and never changes inventory.
 function markPhysicalTokens(){
  if(!isReady()||typeof G==='undefined'||!G?.players||
     typeof tok3==='undefined'||!Array.isArray(tok3))return 0;
  const geo=S3.geo;let marked=0;
  for(const player of G.players){
   const token=tok3[player.id];if(!token)continue;
   if(!token.originsPremiumIdentity){
    const ink=mat('#101f36',{spec:.38}),enamel=mat(player.col||'#f2c457',{spec:.82,em:.46}),
     ivory=mat('#fff3d2',{spec:.72,em:.20}),identity=new Node();
    identity.add(N(geo.cyl8,ink,0,-.008,0).sc(.38,.018,.38));
    identity.add(N(geo.torus,enamel,0,.045,0).sc(.37,.37,.065).rot(Math.PI/2,0,0));
    identity.add(N(geo.torus,ivory,0,.055,0).sc(.28,.28,.038).rot(Math.PI/2,0,0));
    // Four distinct raised silhouettes: round / square / triangle / octagon.
    const flag=new Node().at(.27,0,-.20);
    flag.add(N(geo.cyl8,ink,0,.19,0).sc(.055,.38,.055));
    flag.add(N(geo.cyl8,ivory,0,.38,0).sc(.145,.045,.145));
    const shape=[geo.sph,geo.box,geo.cone4,geo.cyl8][player.id%4];
    flag.add(N(shape,enamel,0,.48,0).sc(.145,.17,.145));
    identity.add(flag);token.add(identity);token.originsPremiumIdentity=identity;
   }
   marked++;
  }
  return marked;
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
  const coins=typeof fmt==='function'?fmt(you.cash||0):'SC '+Math.round(you.cash||0).toLocaleString('en');
  const round=Math.max(1,Math.round(G.round||1));
  const title='<div class="orgStatsTitle">✦ MY PORTFOLIO</div>';
  el.innerHTML=title+
   '<div class="orgStatsRow"><span>Properties</span><strong>'+plots+' / 40</strong></div>'+
   '<div class="orgStatsRow"><span>Developments</span><strong>'+dev+'</strong></div>'+
   '<div class="orgStatsRow"><span>Skyline Cash</span><strong>'+coins+'</strong></div>'+
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
    camMode='board';camGoal([0,0,0],0,19.1,.78,16);
    premiumCameraSet=true;
   }
  }
  // A real game should select its own edition as before. This showcase only
  // recolours the established Lagos beach edition, not other editions.
  // Retina-first review quality: 2.5× native WebGL backbuffer on 3×
  // iPhones, while preserving Skyline's existing automatic performance
  // downgrade. Never re-force quality after a thermal/frame-time downgrade.
  if(!premiumDprConfigured){
   premiumDprConfigured=true;
   if(typeof BOARD_RES!=='undefined'&&typeof COARSE!=='undefined'&&COARSE&&window.devicePixelRatio>=2.5){
    BOARD_RES.level=2.5;BOARD_RES.ceiling=2.5;
   }
  }
  deepenActualScene();paintPremiumCityGround();decorateWaterfront();
  const b=addArchitecture(),tokens=markPhysicalTokens();stats();return{ready:true,buildings:b,tokens,waterfront:!!S3.centers?.beach?.originsHarbourAdded,boardCount:40};
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
