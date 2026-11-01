/* Browser-only, additive presentation hooks. Never mutate G, PREF, prices or reward logic. */
(()=>{
'use strict';
if(window.Capacitor?.isNativePlatform?.()||window.SKYLINE_DESKTOP||window.SkylineWebPresentation)return;
const html=document.documentElement;html.classList.add('web-refined');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const state={version:'web-correction-2',focusUntil:0,target:[0,0,0],yaw:0,scene:null,faded:new Map(),textureScene:null,textures:new Map(),frames:0,frameMs:[],lastFrame:0,viewportQueued:false};
const originals={updateCell,buildBoard,camOverview,camFollow,camUpdate,hopTo,homeTab,drawScene};
// Remove only the obsolete painted street pads: the new models sit on their own tile-edge plots.
const originalBoard=drawBoard;drawBoard=function(ctx){
 const pads=SQ.map((q,i)=>q.t==='prop'?plotPt(i):null).filter(Boolean),fill=ctx.fillRect,stroke=ctx.strokeRect;
 const obsolete=(x,y,w,h)=>w===72&&h===72&&pads.some(([px,py])=>Math.abs(x-(px-36))<.01&&Math.abs(y-(py-36))<.01);
 ctx.fillRect=function(x,y,w,h){if(!obsolete(x,y,w,h))return fill.apply(this,arguments)};
 ctx.strokeRect=function(x,y,w,h){if(!obsolete(x,y,w,h))return stroke.apply(this,arguments)};
 try{return originalBoard.apply(this,arguments)}finally{ctx.fillRect=fill;ctx.strokeRect=stroke}
};
if(S3?.boardCanvas){drawBoard(S3.boardCanvas.getContext('2d'));texUpdate(S3.boardTex)}

function viewport(){
 if(state.viewportQueued)return;state.viewportQueued=true;
 requestAnimationFrame(()=>{state.viewportQueued=false;const v=window.visualViewport;
  if(!v||v.scale===1)html.style.setProperty('--web-vh',Math.round(v?.height||innerHeight)+'px');
 });
}
viewport();addEventListener('resize',viewport,{passive:true});addEventListener('orientationchange',viewport,{passive:true});
window.visualViewport?.addEventListener('resize',viewport,{passive:true});

/* Reuse the existing six architectural stages and meshes; only their plot transforms change. */
function diagonal(i){const k=i%10,nearCorner=k===1||k===9,middle=SQ[i-1]?.t==='prop'&&SQ[i+1]?.t==='prop';
 return nearCorner||middle?(sideOf(i)%2?'\\':'/'):null;
}
function plotMaterial(i){
 if(state.textureScene!==S3){state.textureScene=S3;state.textures.clear()}
 const split=diagonal(i),key=SQ[i].g+':'+(split||'plain');if(state.textures.has(key))return state.textures.get(key);
 const color=GC[SQ[i].g],canvas=cnv(128,128,c=>{
  c.fillStyle='#263b42';c.fillRect(0,0,128,128);
  if(split){c.beginPath();c.moveTo(split==='/'?128:0,0);c.lineTo(128,128);c.lineTo(0,128);c.closePath();c.fillStyle=color;c.globalAlpha=.85;c.fill();c.globalAlpha=1;
   c.beginPath();c.moveTo(split==='/'?128:0,0);c.lineTo(split==='/'?0:128,128);c.strokeStyle='#e9d8a7';c.lineWidth=2;c.stroke();
  }else{c.fillStyle=color;c.fillRect(4,110,120,12)}
  c.strokeStyle=color;c.lineWidth=5;c.strokeRect(3,3,122,122);c.strokeStyle='#e5c67c';c.lineWidth=1;c.strokeRect(7,7,114,114);
 });
 const material=mat('#ffffff',{tex:texFrom(canvas),spec:.15});state.textures.set(key,material);return material;
}
function presentPlot(i){
 if(!S3?.plots||!G||SQ[i]?.t!=='prop')return;const p=S3.plots[i];if(!p)return;
 const side=sideOf(i),r=rect(i),inset=side===2?80:28;
 const point=[[r.x+r.w/2,r.y-inset],[r.x+r.w+inset,r.y+r.h/2],[r.x+r.w/2,r.y+r.h+inset],[r.x-inset,r.y+r.h/2]][side];
 p.node.at(wx(point[0]),.006,wz(point[1])).sc(.74,.52,.74);
 // Every district has a discrete, low plot. Diagonal surfaces are limited to crowded positions.
 if(!p.webPlot){p.webPlot=N(S3.geo.plane,plotMaterial(i),0,.014,0).sc(.98,1,.64);p.node.add(p.webPlot)}
 p.webPlot.mat=plotMaterial(i);p.webDiagonal=diagonal(i);p.webPlot.visible=true;
 for(const model of p.floors||[])model.r[1]=-OUTYAW(side)+.12;
 // The existing family already depicts the real development level; omit redundant street miniatures.
 if(S3.houses?.[i])S3.houses[i].visible=false;
 p.webTop=(p.top||.2)*.52;
}
function presentAll(){if(!S3?.plots||!G)return;for(let i=0;i<40;i++)presentPlot(i)}
updateCell=function(i,anim){const result=originals.updateCell.apply(this,arguments);if(!FAST)presentPlot(i);return result};
buildBoard=function(){restoreOcclusion();state.focusUntil=0;state.target=[0,0,0];state.yaw=0;state.scene=null;
 const result=originals.buildBoard.apply(this,arguments);if(!FAST)presentAll();return result};

/* Fit the actual gold frame into the usable viewport, rather than fixing a device-independent distance. */
const FRAME=6.32;
const corners=[[-FRAME,0,-FRAME],[FRAME,0,-FRAME],[FRAME,0,FRAME],[-FRAME,0,FRAME]];
let frameCache=null,frameStamp=0,inspection=false;
function projected(points,L,look,pitch,w,h){
 const eye=[look[0],Math.sin(pitch)*L,look[2]+Math.cos(pitch)*L],vp=M4.mul(M4.persp(CAMV.fov*Math.PI/180,w/h,.1,200),M4.lookAt(eye,look,[0,1,0]));
 return points.map(([x,y,z])=>{const d=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];return[(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/d*w/2+w/2,h/2-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/d*h/2]});
}
function bounds(points){return{left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))}}
function intersects(poly,r){
 const q=[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]],axes=[[1,0],[0,1]];
 for(let i=0;i<4;i++){const a=poly[i],b=poly[(i+1)%4];axes.push([a[1]-b[1],b[0]-a[0]])}
 return axes.every(([x,y])=>{const a=poly.map(p=>p[0]*x+p[1]*y),b=q.map(p=>p[0]*x+p[1]*y);return Math.max(...a)>Math.min(...b)+.01&&Math.max(...b)>Math.min(...a)+.01});
}
function fitsFrame(points,f){const b=bounds(points),a=f.area;return b.left>=a.left-.1&&b.right<=a.right+.1&&b.top>=a.top-.1&&b.bottom<=a.bottom+.1&&!f.obstacles.some(r=>intersects(points,r))}
function framing(){
 const cv=document.getElementById('gl'),w=cv.clientWidth||innerWidth,h=cv.clientHeight||innerHeight,key=w+':'+h,pitch=h<=360?.59:.64;
 if(frameCache&&frameCache.key===key&&performance.now()-frameStamp<1000)return frameCache;
 const css=getComputedStyle(html),num=k=>parseFloat(css.getPropertyValue(k))||0,sl=num('--web-safe-left'),sr=num('--web-safe-right'),sb=num('--web-safe-bottom'),st=num('--web-safe-top');
 const roster=document.getElementById('roster').getBoundingClientRect(),tools=document.getElementById('tools').getBoundingClientRect();
 const signature=JSON.stringify([key,sl,sr,sb,st,roster.right,roster.bottom,tools.left,tools.bottom,document.getElementById('acts').getBoundingClientRect().height]);if(frameCache?.signature===signature){frameStamp=performance.now();return frameCache}
 const actions=document.getElementById('acts').getBoundingClientRect(),footer=h<=520?64:92;
 const area={left:sl+8,right:w-sr-8,top:Math.max(st+8,52),bottom:Math.min(h-sb-footer,actions.height>0?actions.top-8:h)};
 const pad=r=>({left:r.left-6,right:r.right+6,top:r.top-6,bottom:r.bottom+6});
 const obstacles=[pad(roster),pad(tools)].filter(r=>r.right>r.left&&r.bottom>r.top);
 const context={area,obstacles},preferred=(Math.max(sl+138,roster.right)+w-sr-60)/2;
 const pose=(L,cx)=>{const focal=h/(2*Math.tan(CAMV.fov*Math.PI/360)),dy=area.bottom-h/2,dz=dy*L/(focal*Math.sin(pitch)+dy*Math.cos(pitch)),depth=L-Math.cos(pitch)*dz,look=[-(cx-w/2)*depth/focal,0,FRAME-dz];const points=projected(corners,L,look,pitch,w,h);return{L,look,points,box:bounds(points)}};
 const fit=L=>{for(const shift of [0,-12,12,-24,24,-36,36,-48,48,-60,60,-72,72,-84,84]){const p=pose(L,preferred+shift);if(fitsFrame(p.points,context))return p}return null};
 let lo=9,hi=45;for(let i=0;i<18;i++){const m=(lo+hi)/2;if(fit(m))hi=m;else lo=m}
 const oldL=Math.max(18,7.65/(Math.tan(19*Math.PI/180)*(w/h))*1.02),old=bounds(projected(corners,oldL,[0,0,0],.94,w,h)),wanted=(old.right-old.left)*1.15;
 let a=hi,b=45;for(let i=0;i<18;i++){const m=(a+b)/2,q=pose(m,preferred);if(q.box.right-q.box.left>wanted)a=m;else b=m}
 const f=fit(Math.max(hi+.002,b))||fit(hi+.02)||pose(hi+.1,preferred);frameCache={...f,...context,key,signature,pitch:pitch,oldWidth:old.right-old.left,width:f.box.right-f.box.left};frameStamp=performance.now();return frameCache;
}
function overview(rate=4){const f=framing();inspection=false;BZ=null;state.target=[0,0,0];state.focusUntil=0;camGoal(f.look.slice(),0,f.L,f.pitch,reduced.matches?60:rate);userCam=0}
camOverview=function(){if(!GL||!G)return originals.camOverview.apply(this,arguments);overview(arguments[1]===0?8:4)};
function project(point){const m=CAMM.vp;if(!m)return null;const[x,y,z]=point,w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w]}
camFollow=function(i){
 if(!GL||!G)return originals.camFollow.apply(this,arguments);
 if(userCam||camMode!=='follow'||reduced.matches)return;
 const f=framing(),r=rect(i),point=[wx(r.x+r.w/2),.45,wz(r.y+r.h/2)],screen=project(point);
 const useful=!screen||Math.abs(screen[0])>.82||Math.abs(screen[1])>.82;
 state.target=useful?[clamp(point[0]*.025,-.12,.12),0,clamp(point[2]*.025,-.12,.12)]:[0,0,0];state.focusUntil=performance.now()+650;
};
// Locate/player focus stays contextual. Only an intentional double-tap enters bounded inspection.
camFocus=function(i){inspection=false;userCam=0;camFollow(i);highlight(i)};
zoomPlot=function(i){if(inspection&&BZ===i){overview();return}const p=S3?.plots?.[i];if(!p)return;const f=framing();inspection=true;BZ=i;userCam=1;camGoal([p.node.p[0],Math.min(.3,p.webTop*.35),p.node.p[2]],0,f.L/1.65,f.pitch,4)};
hopTo=async function(p){if(!FAST&&userCam){overview(6);const f=framing();camS.L=Math.max(camS.L,f.L/1.15);camS.look=f.look.slice();camS.pitch=f.pitch;camS.yaw=0;}const result=await originals.hopTo.apply(this,arguments);if(!FAST&&!userCam)state.focusUntil=performance.now()+350;return result};
camUpdate=function(dt){
 if(GL&&G&&document.querySelector('#title').hidden){
  const f=framing();
  if(state.scene!==G){state.scene=G;overview(6);camS.look=f.look.slice();camS.L=f.L;camS.pitch=f.pitch;camS.yaw=0}
  if(!userCam){
   if(performance.now()>state.focusUntil||reduced.matches)state.target=[0,0,0];
   let look=f.look.map((v,i)=>v+state.target[i]);const points=projected(corners,f.L,look,f.pitch,document.getElementById('gl').clientWidth,document.getElementById('gl').clientHeight);
   if(!fitsFrame(points,f)){state.target=[0,0,0];look=f.look.slice()}
   camT.look=look;camT.yaw=nearAng(camS.yaw,0);camT.L=f.L;camT.pitch=f.pitch;camT.rate=reduced.matches?60:4.5;
  }else camT.L=Math.max(f.L/1.8,camT.L);
 }
 return originals.camUpdate.call(this,dt);
};

/* Only obstructing property models fade; never token materials or the whole city. */
function restoreModel(p){const originals=state.faded.get(p);if(originals){for(const[n,m]of originals)n.mat=m;state.faded.delete(p)}}
function restoreOcclusion(){for(const p of [...state.faded.keys()])restoreModel(p)}
function fadeModel(p){
 const roots=p.floors||[],previous=state.faded.get(p);if(previous&&previous.roots?.every((x,i)=>x===roots[i])&&previous.roots.length===roots.length)return;
 restoreModel(p);const saved=[];saved.roots=roots.slice();
 const walk=n=>{if(n.geo&&n.mat){saved.push([n,n.mat]);n.mat=Object.assign({},n.mat,{a:Math.min(n.mat.a,.23),blend:1})}for(const k of n.kids)walk(k)};
 roots.forEach(walk);state.faded.set(p,saved);
}
function occlusion(){
 if(!G||G.over||!S3?.plots||!document.querySelector('#title').hidden){restoreOcclusion();return}
 const token=tok3[G.turn];if(!token?.visible){restoreOcclusion();return}
 const c=CAMV.pos,t=[token.p[0],token.p[1]+.38,token.p[2]],dx=t[0]-c[0],dz=t[2]-c[2],len=dx*dx+dz*dz;
 if(len<.01){restoreOcclusion();return}
 const hits=[];
 S3.plots.forEach((p,i)=>{if(!p||SQ[i].t!=='prop'||!G.own[i]||G.own[i].o<0||!p.floors?.length)return;
  const x=p.node.p[0],z=p.node.p[2],u=((x-c[0])*dx+(z-c[2])*dz)/len;
  if(u<=0||u>=1)return;const distance=Math.hypot(c[0]+u*dx-x,c[2]+u*dz-z),rayY=c[1]+u*(t[1]-c[1]);
  if(distance<.43&&rayY<(p.webTop||p.top||.3)+.12)hits.push({p,u});
 });
 const blocked=new Set(hits.sort((a,b)=>b.u-a.u).slice(0,2).map(x=>x.p));
 for(const p of [...state.faded.keys()])if(!blocked.has(p))restoreModel(p);
 blocked.forEach(fadeModel);
}
/* The approved Lagos palette is presentation-only. Keep Daylight and equipped worlds intact. */
let tone=null;
function restoreTone(){if(!tone)return;for(const [material,color] of tone.colors)material.c=color;tone=null}
function boardTone(){
 const on=!!(G&&S3&&CUR_THEME==='lagos'&&document.querySelector('#title').hidden&&!html.classList.contains('light')&&!equippedSurround());
 if(tone&&(!on||tone.scene!==S3))restoreTone();
 if(!on||tone)return;
 const colors=[];for(const [key,color] of [['waterMat','#12334e'],['islandMat','#22394c'],['rimMat','#29465a'],['slabMat','#b18b42'],['trimMat','#e3bd5c']]){
  const material=S3[key];if(material){colors.push([material,material.c]);material.c=hex(color)}
 }
 tone={scene:S3,colors};
}
const originalTheme=applyTheme;applyTheme=function(){restoreTone();return originalTheme.apply(this,arguments)};
drawScene=function(time){
 const start=performance.now();boardTone();occlusion();const result=originals.drawScene.apply(this,arguments);
 state.frames++;if(state.frames%10===0){state.frameMs.push(performance.now()-start);if(state.frameMs.length>180)state.frameMs.shift()}
 return result;
};

function decorateMenus(){
 const section=SEC_OF[setup.tab]||setup.tab;
 html.classList.toggle('web-shop',section==='shop');html.classList.toggle('web-season',setup.tab==='season');html.classList.toggle('web-progress',section==='progress'||setup.tab==='season');
 const track=document.querySelector('#track');if(!track)return;
 const S=season(),tier=seasonTierNow(),bar=document.querySelector('.sbar');
 if(bar){bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Season XP toward next tier');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(TIER_XP));bar.setAttribute('aria-valuenow',String(tier>=TIERS?TIER_XP:Math.max(0,S.sxp-tier*TIER_XP)))}
 if(!document.querySelector('.web-season-total')){const total=document.createElement('span');total.className='web-season-total';total.textContent='Total season XP: '+nfmt(S.sxp);document.querySelector('.sbp')?.append(total)}
 track.tabIndex=0;track.setAttribute('aria-label','Free and premium season rewards. Swipe or use arrow keys to browse tiers.');
 track.onkeydown=e=>{if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();track.scrollBy({left:e.key==='ArrowRight'?110:-110,behavior:'auto'})};
 [...track.children].forEach((node,i)=>{if(i<3)return;const n=Math.floor((i-3)/3)+1;node.dataset.tier=String(n);
  if(node.classList.contains('scell')){node.classList.toggle('web-current-tier',n===Math.max(1,tier));node.dataset.rewardState=node.classList.contains('done')?'claimed':node.classList.contains('can')?'claimable':'locked'}
 });
}
homeTab=function(){const result=originals.homeTab.apply(this,arguments);decorateMenus();return result};
const clicks=new WeakMap();document.addEventListener('click',event=>{const button=event.target.closest?.('.ibuy,#sAll,#sPrem,.scell.can');if(!button)return;
 const now=performance.now(),last=clicks.get(button);if(last!==undefined&&now-last<350){event.preventDefault();event.stopImmediatePropagation();return}clicks.set(button,now);
},true);

if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration('./').then(reg=>{
 if(!reg)return;const note=()=>{if(!reg.waiting||document.getElementById('web-cache-note'))return;const n=document.createElement('aside');n.id='web-cache-note';n.role='status';n.textContent='A web update is ready. Save your match, close all Skyline tabs, then reopen. Your saved progress is kept.';document.body.append(n)};
 note();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',note));reg.update().catch(()=>{});
}).catch(()=>{});

// Read-only diagnostics for performance/visual tests; never serialize private account data.
window.SkylineWebPresentation=Object.freeze({version:state.version,diagnostics:()=>({version:state.version,framing:frameCache?{area:frameCache.area,points:frameCache.points,obstacles:frameCache.obstacles,box:frameCache.box,width:frameCache.width,oldWidth:frameCache.oldWidth,L:frameCache.L,look:frameCache.look.slice(),pitch:frameCache.pitch,inspection}:null,frames:state.frames,drawMs:state.frameMs.slice(),fadedPlots:state.faded.size,target:state.target.slice(),cameraDistance:camT.L,reducedMotion:reduced.matches,textures:state.textures.size,plots:S3?.plots?.map((p,i)=>p&&SQ[i].t==='prop'?{i,side:sideOf(i),position:p.node.p.slice(),scale:p.node.s.slice(),diagonal:p.webDiagonal,level:G?.own[i]?.h,modelCount:p.floors.length}:null).filter(Boolean)||[]})});
presentAll();decorateMenus();
})();
