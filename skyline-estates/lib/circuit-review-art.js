/* Skyline Circuit — V2 premium design REVIEW renderer (Canvas 2D). Purpose: review screenshots of ChatGPT's Premium
   Design Package V2 on the validated V1 geometry, before the final 3D renderer is built. It is NOT the final renderer:
   it approximates the 3D art direction (materials, golden-hour light, stage silhouettes) in 2D so the layout,
   readability and conflicts can be judged at real iPhone size.

   Geometry, camera and collision envelopes come from lib/circuit-screen.js, so everything drawn here sits inside the
   envelopes the validators check: stage art is drawn inside the alpha building box, never taller or wider.
   Visual randomness (trees, water glints) uses its own fixed generator, never the match RNG. */
(function(root){'use strict';
const SC=root.SkylineCircuit,SS=root.SkylineCircuitScreen;
const SYM=['wave','sun','leaf','spark'];
// Player colours are not in the V2 package; proposed set (see CIRCUIT-V2-REVIEW.md), chosen to differ from the four
// district accents and the two route colours, with a distinct token shape per seat so colour is never the only cue.
const PLAYERS=[{c:'#FF7A59',shape:'circle'},{c:'#4C7DFF',shape:'square'},{c:'#F8F6EF',shape:'triangle'},{c:'#E055C8',shape:'hex'}];
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const rot=(a,u,v)=>[u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)];
function hex(c,a=1){const n=parseInt(c.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function shade(c,k){const n=parseInt(c.slice(1),16);const f=x=>Math.max(0,Math.min(255,Math.round(x*k)));return`rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`}
function poly(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
// Symbols drawn as vectors (no emoji) so they read at small sizes.
function symbol(ctx,kind,x,y,r,color){ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(1.2,r*.28);ctx.lineCap='round';ctx.lineJoin='round';
 if(kind==='wave'){ctx.beginPath();for(let k=-1;k<=1;k+=2){ctx.moveTo(-r,k*r*.35);ctx.bezierCurveTo(-r*.5,k*r*.35-r*.55,-r*.1,k*r*.35+r*.55,r*.35,k*r*.35);ctx.quadraticCurveTo(r*.7,k*r*.35-r*.35,r,k*r*.35)}ctx.stroke()}
 else if(kind==='sun'){ctx.beginPath();ctx.arc(0,0,r*.42,0,7);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.65,Math.sin(a)*r*.65);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke()}}
 else if(kind==='leaf'){ctx.beginPath();ctx.moveTo(-r*.8,r*.8);ctx.quadraticCurveTo(-r*.9,-r*.6,r*.8,-r*.8);ctx.quadraticCurveTo(r*.6,r*.9,-r*.8,r*.8);ctx.fill();ctx.strokeStyle='#0B1633';ctx.lineWidth=Math.max(1,r*.15);ctx.beginPath();ctx.moveTo(-r*.6,r*.6);ctx.lineTo(r*.5,-r*.5);ctx.stroke()}
 else if(kind==='spark'){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.32:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
 else if(kind==='event'){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.42:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
 else if(kind==='bridge'){ctx.beginPath();ctx.moveTo(-r,r*.35);ctx.quadraticCurveTo(0,-r*.9,r,r*.35);ctx.stroke();ctx.beginPath();ctx.moveTo(-r,r*.5);ctx.lineTo(r,r*.5);ctx.stroke()}
 ctx.restore()}
function token(ctx,shape,x,y,r,color,seat){ctx.save();ctx.translate(x,y);ctx.beginPath();
 if(shape==='circle')ctx.arc(0,0,r,0,7);else if(shape==='square')ctx.rect(-r*.88,-r*.88,r*1.76,r*1.76);
 else if(shape==='triangle'){ctx.moveTo(0,-r*1.1);ctx.lineTo(r*1.05,r*.8);ctx.lineTo(-r*1.05,r*.8);ctx.closePath()}
 else{for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath()}
 ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=3;ctx.shadowOffsetY=1;ctx.fillStyle=color;ctx.fill();ctx.shadowColor='transparent';ctx.lineWidth=2;ctx.strokeStyle='#0B1633';ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#FFFFFF';ctx.stroke();ctx.restore()}

function create(D,quality='high'){
 const P=D.visual.palette,DIST=D.visual.districts,routeCol={stay:D.visual.routePreview.stay.color,cross:D.visual.routePreview.cross.color};
 let G=null,C=null,cam=D.camera.default,cameraPos=null;
 function setup(rect,camera){cam=camera||D.camera.default;G=SS.geometry(D.layout,D.geometry);C=SS.camera(G,cam,rect);
  const R=Math.max(...Object.values(G.nodes).map(p=>Math.hypot(p.x,p.y)))+G.tile,Dd=cam.dist*R,p=cam.pitch*Math.PI/180;cameraPos={x:0,y:Dd*Math.sin(p),z:Dd*Math.cos(p)};return{G,C}}
 const L=(()=>{const v=[-.78,-.22,.58],n=Math.hypot(...v);return v.map(x=>x/n)})(); // low warm sun from the west
 const box=(id,side,z0,z1)=>{const n=G.nodes[id],t=side/2;const b=[[-t,-t],[t,-t],[t,t],[-t,t]].map(([u,v])=>{const [a,c]=rot(n.ang,u,v);return{x:n.x+a,y:n.y+c}});return{b:b.map(q=>({...q,z:z0})),t:b.map(q=>({...q,z:z1}))}};
 function drawBox(ctx,bx,base,{roof=null,crown=false,windows=true,glass=false}={}){const pb=bx.b.map(C.project),pt=bx.t.map(C.project);
  const cx=bx.b.reduce((a,q)=>a+q.x,0)/4,cy=bx.b.reduce((a,q)=>a+q.y,0)/4;
  for(let i=0;i<4;i++){const a=bx.b[i],b=bx.b[(i+1)%4];const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const nx=mx-cx,ny=my-cy,nl=Math.hypot(nx,ny);const N=[nx/nl,ny/nl,0];
   const zMid=(bx.b[0].z+bx.t[0].z)/2;if(N[0]*(cameraPos.x-mx)+N[1]*(cameraPos.y-my)+N[2]*(cameraPos.z-zMid)<=0)continue;
   const lit=.42+.75*Math.max(0,N[0]*L[0]+N[1]*L[1]);const face=[pb[i],pb[(i+1)%4],pt[(i+1)%4],pt[i]];poly(ctx,face);ctx.fillStyle=shade(base,lit*(glass?.9:1));ctx.fill();
   if(windows){const floors=Math.max(1,Math.round((bx.t[0].z-bx.b[0].z)/(G.tile*.12)));ctx.strokeStyle=glass?hex('#9FD3FF',.35):hex('#0B1633',.55);ctx.lineWidth=.7;
    for(let f=1;f<floors;f++){const k=f/floors,l=pb[i],r=pb[(i+1)%4],lt=pt[i],rt=pt[(i+1)%4];ctx.beginPath();ctx.moveTo(l.x+(lt.x-l.x)*k,l.y+(lt.y-l.y)*k);ctx.lineTo(r.x+(rt.x-r.x)*k,r.y+(rt.y-r.y)*k);ctx.stroke()}
    if(lit<.8){ctx.fillStyle=hex('#FFD48A',.55);for(let f=1;f<floors;f+=2){const k=(f+.5)/floors,l=pb[i],r=pb[(i+1)%4],lt=pt[i],rt=pt[(i+1)%4];for(const s of [.3,.7]){const x0=l.x+(lt.x-l.x)*k,y0=l.y+(lt.y-l.y)*k,x1=r.x+(rt.x-r.x)*k,y1=r.y+(rt.y-r.y)*k;ctx.fillRect(x0+(x1-x0)*s-.6,y0+(y1-y0)*s-.6,1.2,1.2)}}}}}
  poly(ctx,pt);ctx.fillStyle=roof||shade(base,1.05);ctx.fill();if(crown){ctx.lineWidth=1.6;ctx.strokeStyle=P.gold;ctx.shadowColor=hex(P.gold,.8);ctx.shadowBlur=quality==='low'?0:4;ctx.stroke();ctx.shadowBlur=0}
  else{ctx.lineWidth=.6;ctx.strokeStyle=hex('#0B1633',.6);ctx.stroke()}}
 // Stage art inside the alpha collision envelope (side = buildingSide, height = stageHeight[stage]).
 function building(ctx,id,stage,ownerCol){const S=G.buildingSide,H=G.stageHeight[stage];
  if(stage===1){drawBox(ctx,box(id,S,0,H),P.ivory,{roof:'#d8cdb9'})}
  else if(stage===2){drawBox(ctx,box(id,S,0,H*.55),P.stone);drawBox(ctx,box(id,S*.74,H*.55,H),'#8fb4c9',{glass:true,roof:'#b9d3e2'})}
  else if(stage===3){drawBox(ctx,box(id,S,0,H*.3),P.stone);drawBox(ctx,box(id,S*.82,H*.3,H*.75),'#6f9fbd',{glass:true});drawBox(ctx,box(id,S*.62,H*.75,H),'#87b6d1',{glass:true,roof:'#c9dde8'})}
  else if(stage===4){drawBox(ctx,box(id,S,0,H*.12),P.stone);drawBox(ctx,box(id,S*.86,H*.12,H),'#5f8fb3',{glass:true,crown:true,roof:'#2c4a66'});
   const top=box(id,S*.5,H,H).t.map(C.project);poly(ctx,top);ctx.fillStyle=hex(P.gold,.85);ctx.fill()}
  // Owner shown on the base, not only in windows.
  if(ownerCol){const base=box(id,S*1.06,0,0).b.map(C.project);poly(ctx,base);ctx.lineWidth=2;ctx.strokeStyle=ownerCol;ctx.stroke()}}
 function shadow(ctx,id,stage){const H=G.stageHeight[stage],S=G.buildingSide;const off={x:-L[0]/L[2]*H,y:-L[1]/L[2]*H};const b=box(id,S,0,0).b;
  const pts=SS.hull([...b,...b.map(q=>({x:q.x+off.x,y:q.y+off.y,z:0}))].map(C.project));poly(ctx,pts);ctx.fillStyle='rgba(4,10,24,.28)';ctx.fill()}
 function environment(ctx,rect){const c=C.project({x:0,y:0,z:0}),u=C.ppu({x:0,y:0,z:0});const R=(Math.max(...Object.values(G.nodes).map(p=>Math.hypot(p.x,p.y)))+G.tile*.75)*u;
  // water
  let g=ctx.createRadialGradient(c.x,c.y,R*.6,c.x,c.y,R*2.2);g.addColorStop(0,P.deepWater);g.addColorStop(1,P.navy);ctx.fillStyle=g;ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  const r=rng(7);ctx.strokeStyle=hex(P.waterHighlight,.35);ctx.lineWidth=1;for(let i=0;i<(quality==='low'?20:70);i++){const a=r()*7,d=R*(1.05+r()*1.1),x=c.x+Math.cos(a)*d,y=c.y+Math.sin(a)*d*.95,w=3+r()*7;ctx.beginPath();ctx.moveTo(x-w,y);ctx.quadraticCurveTo(x,y-1.5,x+w,y);ctx.stroke()}
  // island platform with golden-hour light from the west
  ctx.beginPath();ctx.arc(c.x,c.y,R,0,7);g=ctx.createLinearGradient(c.x-R,c.y,c.x+R,c.y);g.addColorStop(0,'#2a3550');g.addColorStop(.5,'#1a2540');g.addColorStop(1,'#121b30');ctx.fillStyle=g;ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle=hex(P.gold,.35);ctx.stroke();
  // radial street pattern
  ctx.strokeStyle=hex(P.stone,.08);ctx.lineWidth=1;for(let i=0;i<24;i++){const a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(c.x+Math.cos(a)*R*.2,c.y+Math.sin(a)*R*.2);ctx.lineTo(c.x+Math.cos(a)*R*.98,c.y+Math.sin(a)*R*.98);ctx.stroke()}
  // ring roads (boulevard and inner plaza) through node centres
  for(const [ring,col,w] of [['O','#283552',G.tile*u*.95],['I','#2b3a58',G.tile*u*.95]]){const ids=SC.NODES.filter(n=>n.ring===ring).map(n=>n.id);ctx.beginPath();ids.forEach((id,i)=>{const p=C.project({...G.nodes[id],z:0});i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.lineWidth=w;ctx.strokeStyle=col;ctx.lineJoin='round';ctx.stroke();
   ctx.lineWidth=1;ctx.setLineDash([2,5]);ctx.strokeStyle=hex(P.stone,.3);ctx.stroke();ctx.setLineDash([])}
  // trees along the outer boulevard edge, gardens in the centre (decorative only)
  if(quality!=='low'){const tr=rng(11);for(let i=0;i<90;i++){const a=tr()*7,d=R*(.93+tr()*.05),x=c.x+Math.cos(a)*d,y=c.y+Math.sin(a)*d;ctx.beginPath();ctx.arc(x,y,1.6+tr()*1.4,0,7);ctx.fillStyle=hex('#3f8f62',.85);ctx.fill()}}
  const inner=Math.min(...SC.NODES.filter(n=>n.ring==='I').map(n=>Math.hypot(G.nodes[n.id].x,G.nodes[n.id].y)))*u-G.tile*u*.75;
  g=ctx.createRadialGradient(c.x-inner*.3,c.y-inner*.3,2,c.x,c.y,inner);g.addColorStop(0,'#2f6b4f');g.addColorStop(1,'#1c3f35');ctx.beginPath();ctx.arc(c.x,c.y,inner,0,7);ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.arc(c.x,c.y,inner*.32,0,7);ctx.fillStyle=hex(P.waterHighlight,.8);ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=hex(P.gold,.6);ctx.stroke();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;ctx.beginPath();ctx.moveTo(c.x+Math.cos(a)*inner*.36,c.y+Math.sin(a)*inner*.36);ctx.lineTo(c.x+Math.cos(a)*inner*.95,c.y+Math.sin(a)*inner*.95);ctx.lineWidth=3;ctx.strokeStyle=hex(P.ivory,.25);ctx.stroke()}
  if(quality!=='low'){const tr=rng(13);for(let i=0;i<26;i++){const a=tr()*7,d=inner*(.45+tr()*.45);ctx.beginPath();ctx.arc(c.x+Math.cos(a)*d,c.y+Math.sin(a)*d,1.8+tr()*1.6,0,7);ctx.fillStyle=hex('#4fa877',.9);ctx.fill()}}
  // bridges: illuminated roads, one hop, no stopping tile
  for(const [a,b] of D.visual.bridges){const p=C.project({...G.nodes[a],z:0}),q=C.project({...G.nodes[b],z:0});ctx.lineCap='butt';ctx.lineWidth=G.tile*u*.42;ctx.strokeStyle='#3a4a68';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
   ctx.lineWidth=1.4;ctx.strokeStyle=hex(P.ivory,.85);ctx.shadowColor=hex('#FFE7B0',.9);ctx.shadowBlur=quality==='low'?0:5;for(const s of [-1,1]){const dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy),ox=-dy/l*s*G.tile*u*.21,oy=dx/l*s*G.tile*u*.21;ctx.beginPath();ctx.moveTo(p.x+ox,p.y+oy);ctx.lineTo(q.x+ox,q.y+oy);ctx.stroke()}ctx.shadowBlur=0}}
 function tiles(ctx,view){const labels=[];
  for(const n of view.nodes){const cs=SS.tileCorners(G,n.id,.46).map(C.project),c=C.project({...G.nodes[n.id],z:0}),u=C.ppu({...G.nodes[n.id],z:0}),t=G.tile*u;
   poly(ctx,cs);if(n.type==='property'){const d=DIST[n.quadrant];ctx.fillStyle='#24324d';ctx.fill();
     const inner=SS.tileCorners(G,n.id,.38).map(C.project);poly(ctx,inner);ctx.fillStyle=hex(d.accent,.22);ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle=hex(d.accent,.9);ctx.stroke();
     if(n.owner>=0){poly(ctx,cs);ctx.lineWidth=3;ctx.strokeStyle=PLAYERS[n.owner].c;ctx.stroke()}
     else{poly(ctx,cs);ctx.lineWidth=1;ctx.strokeStyle=hex(P.stone,.35);ctx.stroke()}
     if(n.stage===0)symbol(ctx,SYM[n.quadrant],c.x,c.y-t*.12,t*.17,d.accent);
     labels.push({id:n.id,x:c.x,y:c.y,t,price:n.price,stage:n.stage,owner:n.owner})}
   else if(n.type==='event'){ctx.fillStyle='#3a2a1a';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=P.warning;ctx.stroke();symbol(ctx,'event',c.x,c.y-t*.05,t*.22,P.warning);labels.push({id:n.id,x:c.x,y:c.y,t,ev:true})}
   else{ctx.fillStyle='#1a2742';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=hex(P.ivory,.7);ctx.stroke();symbol(ctx,'bridge',c.x,c.y-t*.08,t*.2,P.ivory);labels.push({id:n.id,x:c.x,y:c.y,t,junction:true})}}
  return labels}
 function network(ctx,view,pid){const vp=view.players[pid];if(!vp)return;ctx.lineWidth=2;ctx.strokeStyle=hex(PLAYERS[pid].c,.95);ctx.shadowColor=hex(PLAYERS[pid].c,.8);ctx.shadowBlur=quality==='low'?0:4;
  for(const net of vp.networks){if(net.size<2)continue;const set=new Set(net.props);for(const j of SC.NODES.filter(n=>n.type==='junction').map(n=>n.id)){const near=[SC.next(j),...SC.NODES.filter(n=>SC.next(n.id)===j).map(n=>n.id),...(SC.LINKS[j]?[SC.next(SC.LINKS[j]),...SC.NODES.filter(n=>SC.next(n.id)===SC.LINKS[j]).map(n=>n.id)]:[])];if(near.filter(x=>set.has(x)).length>=2)set.add(j)}
   for(const a of set)for(const b of [SC.next(a),SC.LINKS[a]].filter(Boolean))if(set.has(b)){const p=C.project({...G.nodes[a],z:0}),q=C.project({...G.nodes[b],z:0});ctx.beginPath();ctx.moveTo(p.x,p.y+G.tile*C.ppu(G.nodes[a])*.36);ctx.lineTo(q.x,q.y+G.tile*C.ppu(G.nodes[b])*.36);ctx.stroke()}}ctx.shadowBlur=0}
 function routes(ctx,view,pid){const pos=view.players[pid].pos,paths=SS.routePaths(pos),pv=view.preview;
  for(const via of ['stay','cross']){const seq=paths[via],col=routeCol[via];ctx.lineWidth=3;ctx.setLineDash(via==='cross'?[7,5]:[]);ctx.strokeStyle=hex(col,via==='cross'?.95:.92);ctx.lineJoin='round';ctx.lineCap='round';
   const path=()=>{ctx.beginPath();const o=C.project({...G.nodes[pos],z:0});ctx.moveTo(o.x,o.y);for(const s of seq){const p=C.project({...G.nodes[s.to],z:0});ctx.lineTo(p.x,p.y)}};
   // dark casing keeps both routes readable over any district or owner colour
   const dash=via==='cross'?[7,5]:[];ctx.setLineDash(dash);ctx.lineWidth=5.5;ctx.strokeStyle='rgba(11,22,51,.9)';path();ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=hex(col,via==='cross'?.95:.92);path();ctx.stroke();ctx.setLineDash([]);
   if(pv)for(const l of pv[via].landing){const p=C.project({...G.nodes[l.node],z:0}),rr=3+16*l.p;const gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr);gg.addColorStop(0,hex(col,.75));gg.addColorStop(1,hex(col,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(p.x,p.y,rr,0,7);ctx.fill()}}}
 function labelsDraw(ctx,labels,mode){const out=[];ctx.font='600 12px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const l of labels){if(mode==='none')break;const lines=l.price!=null?[l.id,String(l.price)]:[l.id];if(mode==='plots'&&l.stage>0)continue;
   const w=Math.max(...lines.map(s=>ctx.measureText(s).width))+4,h=lines.length*12+2,y=l.y+l.t*.18;const r={id:l.id,x:l.x-w/2,y:y-h/2,w,h};
   ctx.fillStyle='rgba(11,22,51,.72)';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.fillStyle=P.text;lines.forEach((s,i)=>ctx.fillText(s,l.x,r.y+7+i*12));out.push(r)}return out}
 function draw(ctx,rect,view,{scene='clean',pid=0,labels='all',tokensAt=null}={}){ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();environment(ctx,rect);
  const lab=tiles(ctx,view);if(scene!=='clean')for(let i=0;i<view.players.length;i++)network(ctx,view,i);
  if(scene==='route')routes(ctx,view,pid);
  const items=[];for(const n of view.nodes)if(n.type==='property'&&n.stage>0){const d=Math.min(...SS.buildingBox(G,n.id,n.stage).map(C.project).map(p=>p.d));items.push({d,draw:()=>building(ctx,n.id,n.stage,n.owner>=0?PLAYERS[n.owner].c:null)});}
  for(const n of view.nodes)if(n.type==='property'&&n.stage>0)shadow(ctx,n.id,n.stage);
  const counts={};const tokRects=[];for(const p of view.players){if(p.out)continue;const node=tokensAt||p.pos;const slot=counts[node]=(counts[node]??-1)+1;const q=SS.tokenPoint(G,node,slot%4),xy=C.project(q),r=G.tokenR*C.ppu({...G.nodes[node],z:0});
   items.push({tok:true,d:xy.d-1e-6,draw:()=>{token(ctx,PLAYERS[p.id].shape,xy.x,xy.y,r,PLAYERS[p.id].c,p.id);tokRects.push({pid:p.id,x:xy.x,y:xy.y,r})}})}
  const tokItems=items.filter(i=>i.tok),rest=items.filter(i=>!i.tok);rest.sort((a,b)=>b.d-a.d).forEach(i=>i.draw());
  const labelRects=labelsDraw(ctx,lab,labels);tokItems.sort((a,b)=>b.d-a.d).forEach(i=>i.draw());ctx.restore();
  // Measurements for the review: label plates over tokens, over developed buildings, and over each other.
  const hitTok=labelRects.filter(r=>tokRects.some(t=>t.x+t.r>r.x&&t.x-t.r<r.x+r.w&&t.y+t.r>r.y&&t.y-t.r<r.y+r.h)).map(r=>r.id);
  const overBuilding=labelRects.filter(r=>{const n=view.nodes.find(x=>x.id===r.id);return n.type==='property'&&n.stage>0}).map(r=>r.id);
  const overlapPairs=[];for(let i=0;i<labelRects.length;i++)for(let j=i+1;j<labelRects.length;j++){const a=labelRects[i],b=labelRects[j];if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)overlapPairs.push(a.id+'-'+b.id)}
  return{labelRects,tokens:tokRects,labelsOverTokens:hitTok,labelsOverBuildings:overBuilding,labelOverlaps:overlapPairs}}
 return{setup,draw,PLAYERS,get G(){return G},get C(){return C}}}
root.SkylineCircuitReviewArt={create,PLAYERS,SYM};
})(typeof self!=='undefined'?self:this);
