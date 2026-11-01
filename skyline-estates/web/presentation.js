/* Browser-only, additive presentation hooks. Never mutate G, PREF, prices or reward logic. */
(()=>{
'use strict';
if(window.Capacitor?.isNativePlatform?.()||window.SKYLINE_DESKTOP||window.SkylineWebPresentation)return;
const html=document.documentElement;html.classList.add('web-refined');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const state={version:'web-final-1',focusUntil:0,target:[0,0,0],yaw:0,scene:null,faded:new Map(),textureScene:null,textures:new Map(),frames:0,frameMs:[],lastFrame:0,viewportQueued:false};
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
 const side=sideOf(i),r=rect(i),inset=10;
 const point=[[r.x+r.w/2,r.y+inset],[r.x+r.w-inset,r.y+r.h/2],[r.x+r.w/2,r.y+r.h-inset],[r.x+inset,r.y+r.h/2]][side];
 p.node.at(wx(point[0]),.006,wz(point[1])).sc(.85,.72,.68);
 // Every district has a discrete, low plot. Diagonal surfaces are limited to crowded positions.
 if(!p.webPlot){p.webPlot=N(S3.geo.plane,plotMaterial(i),0,.014,0).sc(.98,1,.64);p.node.add(p.webPlot)}
 p.webPlot.mat=plotMaterial(i);p.webDiagonal=diagonal(i);p.webPlot.visible=true;
 for(const model of p.floors||[])model.r[1]=-OUTYAW(side)+.12;
 // The existing family already depicts the real development level; omit redundant street miniatures.
 if(S3.houses?.[i])S3.houses[i].visible=false;
 p.webTop=(p.top||.2)*.72;
}
function presentAll(){if(!S3?.plots||!G)return;for(let i=0;i<40;i++)presentPlot(i)}
updateCell=function(i,anim){const result=originals.updateCell.apply(this,arguments);if(!FAST)presentPlot(i);return result};
buildBoard=function(){restoreOcclusion();state.focusUntil=0;state.target=[0,0,0];state.yaw=0;state.scene=null;
 const result=originals.buildBoard.apply(this,arguments);if(!FAST)presentAll();return result};

/* Whole-board framing by default. Follow assists only near an obscured/unsafe edge, never rotates per tile. */
function overviewDistance(){const a=aspect();return Math.max(18,7.65/(Math.tan(19*Math.PI/180)*a)*1.02)}
function overview(rate=4){state.target=[0,0,0];state.focusUntil=0;camGoal([0,0,0],state.yaw,overviewDistance(),.94,reduced.matches?60:rate);userCam=0}
camOverview=function(){if(!GL||!G)return originals.camOverview.apply(this,arguments);overview(arguments[1]===0?8:4)};
function project(point){const m=CAMM.vp;if(!m)return null;const[x,y,z]=point,w=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(w<=0)return null;return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w];
}
camFollow=function(i){
 if(!GL||!G)return originals.camFollow.apply(this,arguments);
 if(userCam||camMode!=='follow'||reduced.matches)return;
 const r=rect(i),point=[wx(r.x+r.w/2),.45,wz(r.y+r.h/2)],screen=project(point);
 const useful=!screen||Math.abs(screen[0])>.61||Math.abs(screen[1])>.66;
 state.target=useful?[clamp(point[0]*.12,-.62,.62),0,clamp(point[2]*.12,-.62,.62)]:[0,0,0];
 state.focusUntil=performance.now()+850;
 camGoal(state.target.slice(),state.yaw,overviewDistance(),.94,4.5);
};
hopTo=async function(p){const result=await originals.hopTo.apply(this,arguments);if(!FAST&&!userCam)state.focusUntil=performance.now()+500;return result};
camUpdate=function(dt){
 if(GL&&G&&document.querySelector('#title').hidden&&!userCam){
  if(state.scene!==G){state.scene=G;overview(6)}
  if(performance.now()>state.focusUntil||reduced.matches)state.target=[0,0,0];
  camT.look=state.target.slice();camT.yaw=nearAng(camS.yaw,state.yaw);camT.L=overviewDistance();camT.pitch=.94;camT.rate=reduced.matches?60:4.5;
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
 html.classList.toggle('web-shop',section==='shop');html.classList.toggle('web-progress',section==='progress'||setup.tab==='season');
 const track=document.querySelector('#track');if(!track)return;
 const S=season(),tier=seasonTierNow(),bar=document.querySelector('.sbar');
 if(bar){bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Season XP toward next tier');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(TIER_XP));bar.setAttribute('aria-valuenow',String(tier>=TIERS?TIER_XP:Math.max(0,S.sxp-tier*TIER_XP)))}
 if(!document.querySelector('.web-season-total')){const total=document.createElement('span');total.className='web-season-total';total.textContent='Total season XP: '+nfmt(S.sxp);document.querySelector('.sbt')?.append(total)}
 track.tabIndex=0;track.setAttribute('aria-label','Free and premium season rewards. Swipe or use arrow keys to browse tiers.');
 track.onkeydown=e=>{if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();track.scrollBy({left:e.key==='ArrowRight'?110:-110,behavior:reduced.matches?'auto':'smooth'})};
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
window.SkylineWebPresentation=Object.freeze({version:state.version,diagnostics:()=>({version:state.version,frames:state.frames,drawMs:state.frameMs.slice(),fadedPlots:state.faded.size,target:state.target.slice(),cameraDistance:camT.L,reducedMotion:reduced.matches,textures:state.textures.size,plots:S3?.plots?.map((p,i)=>p&&SQ[i].t==='prop'?{i,side:sideOf(i),position:p.node.p.slice(),scale:p.node.s.slice(),diagonal:p.webDiagonal,level:G?.own[i]?.h,modelCount:p.floors.length}:null).filter(Boolean)||[]})});
presentAll();decorateMenus();
})();
