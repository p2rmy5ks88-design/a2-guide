/* Skyline Circuit — screen geometry and design validation (alpha). DOM-free; shared by the alpha presentation layer
   (lib/circuit-ui.js) and the validation tests, so a check can never pass for geometry the renderer does not draw.

   Inputs the visual design will replace: a layout (node coordinates, top view, from ChatGPT), a camera (pitch,
   distance) and a HUD plan (screen rectangles). Nothing here changes the rules or the match state.

   Coordinates: board plane x right, y toward the viewer (screen-down in a top view), z up. Units are layout units;
   the fit maps them to CSS points. */
(function(root,factory){const SC=typeof module==='object'&&module.exports?require('./circuit-rules.js'):root.SkylineCircuit;const m=factory(SC);
 if(typeof module==='object'&&module.exports)module.exports=m;else root.SkylineCircuitScreen=m})(typeof self!=='undefined'?self:this,function(SC){'use strict';
// Supported iPhone landscape viewports (CSS points) and landscape safe-area insets.
// verified: published Apple device metrics (useyourloaf.com iPhone 16/17 screen sizes). Others: from Apple device metrics
// as commonly documented, to be confirmed on device via env(safe-area-inset-*) before release.
const VIEWPORTS=Object.freeze([
 {id:'se1',name:'iPhone SE (1st gen)',w:568,h:320,inset:{l:0,r:0,t:0,b:0},note:'iOS 15 floor of the app; below the Circuit minimum',verified:false,floor:true},
 {id:'se',name:'iPhone SE (2nd/3rd gen), 8',w:667,h:375,inset:{l:0,r:0,t:0,b:0},verified:false,min:true},
 {id:'mini',name:'iPhone 12/13 mini',w:812,h:375,inset:{l:50,r:50,t:0,b:21},verified:false},
 {id:'x',name:'iPhone X/XS/11 Pro',w:812,h:375,inset:{l:44,r:44,t:0,b:21},verified:false},
 {id:'xr',name:'iPhone XR/11',w:896,h:414,inset:{l:48,r:48,t:0,b:21},verified:false},
 {id:'i12',name:'iPhone 12/13/14, 16e',w:844,h:390,inset:{l:47,r:47,t:0,b:21},verified:false},
 {id:'i14p',name:'iPhone 14 Pro, 15, 15 Pro, 16',w:852,h:393,inset:{l:59,r:59,t:0,b:21},verified:true},
 {id:'i14pl',name:'iPhone 14 Plus, 13 Pro Max',w:926,h:428,inset:{l:47,r:47,t:0,b:21},verified:false},
 {id:'i16pl',name:'iPhone 15 Pro Max, 16 Plus',w:932,h:430,inset:{l:59,r:59,t:0,b:21},verified:true},
 {id:'i16p',name:'iPhone 16 Pro',w:874,h:402,inset:{l:62,r:62,t:0,b:21},verified:true},
 {id:'i17',name:'iPhone 17, 17 Pro',w:874,h:402,inset:{l:62,r:62,t:20,b:20},verified:true},
 {id:'air',name:'iPhone Air',w:912,h:420,inset:{l:68,r:68,t:20,b:29},verified:true},
 {id:'i16pm',name:'iPhone 16 Pro Max, 17 Pro Max',w:956,h:440,inset:{l:62,r:62,t:20,b:21},verified:true},
 // Safari with toolbars (web version) — the board must still work, though the app is the primary target.
 {id:'safari-se',name:'Safari, iPhone SE (toolbars)',w:667,h:320,inset:{l:0,r:0,t:0,b:0},verified:false,web:true},
 {id:'safari-12',name:'Safari, iPhone 12–16 (toolbars)',w:844,h:320,inset:{l:47,r:47,t:0,b:0},verified:false,web:true}]);
const MIN_TOUCH=44; // pt: Apple HIG minimum hit target
// Camera presets for the alpha renderer. The final camera is ChatGPT's; these exist to measure the trade-offs.
const CAMERAS=Object.freeze({top:{pitch:0,dist:6},tilt25:{pitch:25,dist:5},tilt40:{pitch:40,dist:4.5},tilt55:{pitch:55,dist:4}});
// Functional HUD plan (alpha): left column for players, right column for actions, measured inside the safe area.
// Widths shrink on narrow screens. The real HUD composition is ChatGPT's; the browser test measures the DOM instead.
function hudPlan(vp){// narrow matches the page's CSS breakpoint (max-width:760px)
 const W=vp.w-vp.inset.l-vp.inset.r,narrow=vp.w<=760;const L=narrow?132:156,R=narrow?156:184;
 const x0=vp.inset.l,y0=vp.inset.t,H=vp.h-vp.inset.t-vp.inset.b;
 return{rects:[{id:'players',x:x0,y:y0,w:L,h:H},{id:'actions',x:x0+W-R,y:y0,w:R,h:H}],board:{x:x0+L,y:y0,w:W-L-R,h:H}}}

// ---------- geometry from a layout ----------
function geometry(layout){const N=layout.nodes,ids=SC.NODES.map(n=>n.id);let minAdj=Infinity;
 for(const id of ids){const a=N[id],b=N[SC.next(id)];minAdj=Math.min(minAdj,Math.hypot(a.x-b.x,a.y-b.y))}
 const tile=+(layout.tile||minAdj*.86).toFixed(3);
 const nodes={};for(const n of SC.NODES){const p=N[n.id],q=N[SC.next(n.id)],o=N[prevOf(n.id)];const ang=Math.atan2(q.y-o.y,q.x-o.x);nodes[n.id]={id:n.id,type:n.type,ring:n.ring,x:p.x,y:p.y,ang}}
 return{tile,nodes,stageHeight:[0,.35,.7,1.1,1.6].map(k=>k*tile),buildingSide:.62*tile,tokenR:.15*tile,tokenH:.3*tile,
  tokenSlots:[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]].map(([u,v])=>[u*tile,v*tile])}}
const prevOf=id=>{const n=SC.NODES.find(x=>x.id===id);return n.ring==='O'?'O'+((n.idx+19)%20):'I'+((n.idx+11)%12)};
const rot=(ang,u,v)=>[u*Math.cos(ang)-v*Math.sin(ang),u*Math.sin(ang)+v*Math.cos(ang)];
function tileCorners(G,id,k=.5){const n=G.nodes[id],t=G.tile*k;return[[-t,-t],[t,-t],[t,t],[-t,t]].map(([u,v])=>{const [a,b]=rot(n.ang,u,v);return{x:n.x+a,y:n.y+b,z:0}})}
function buildingBox(G,id,stage){const n=G.nodes[id],h=G.stageHeight[stage],t=G.buildingSide/2;const base=[[-t,-t],[t,-t],[t,t],[-t,t]].map(([u,v])=>{const [a,b]=rot(n.ang,u,v);return{x:n.x+a,y:n.y+b}});
 return[...base.map(p=>({...p,z:0})),...base.map(p=>({...p,z:h}))]}
function tokenPoint(G,id,slot){const n=G.nodes[id],[u,v]=G.tokenSlots[slot];const [a,b]=rot(0,u,v);return{x:n.x+a,y:n.y+b,z:G.tokenH}}

// ---------- camera ----------
// Pinhole camera above the board centre, tilted toward the viewer by `pitch`. dist is in board radii.
function camera(G,cam,rect){const pts=Object.values(G.nodes);const R=Math.max(...pts.map(p=>Math.hypot(p.x,p.y)))+G.tile;const p=cam.pitch*Math.PI/180,D=cam.dist*R;
 const raw=q=>{const d=D-q.y*Math.sin(p)-q.z*Math.cos(p);return{x:q.x/d,y:(q.y*Math.cos(p)-q.z*Math.sin(p))/d,d}};
 // Fit: every tile corner and the top of a Skyscraper on every property must be inside the board rectangle.
 const fitPts=[];for(const id of Object.keys(G.nodes)){fitPts.push(...tileCorners(G,id));if(G.nodes[id].type==='property')fitPts.push(...buildingBox(G,id,4).slice(4))}
 const pr=fitPts.map(raw),minX=Math.min(...pr.map(q=>q.x)),maxX=Math.max(...pr.map(q=>q.x)),minY=Math.min(...pr.map(q=>q.y)),maxY=Math.max(...pr.map(q=>q.y));
 const pad=4,s=Math.min((rect.w-2*pad)/(maxX-minX),(rect.h-2*pad)/(maxY-minY));const ox=rect.x+rect.w/2-s*(minX+maxX)/2,oy=rect.y+rect.h/2-s*(minY+maxY)/2;
 const project=q=>{const r=raw(q);return{x:ox+s*r.x,y:oy+s*r.y,d:r.d}};
 // Screen points per board unit at a node (for converting the 44 pt rule).
 const ppu=(q)=>{const a=project(q),b=project({...q,x:q.x+1});return Math.hypot(b.x-a.x,b.y-a.y)};
 return{project,ppu,scale:s,pitch:cam.pitch,dist:cam.dist,rect}}
// Convex hull (monotone chain) of projected points.
function hull(pts){const P=[...pts].sort((a,b)=>a.x-b.x||a.y-b.y);if(P.length<3)return P;const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);const lo=[],up=[];
 for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
 for(const p of P.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}up.pop();lo.pop();return lo.concat(up)}
function inPoly(pt,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x)c=!c}return c}
const circleRect=(c,r,R)=>{const cx=Math.max(R.x,Math.min(c.x,R.x+R.w)),cy=Math.max(R.y,Math.min(c.y,R.y+R.h));return Math.hypot(c.x-cx,c.y-cy)<r};
const insideRect=(p,R,m=0)=>p.x>=R.x+m&&p.x<=R.x+R.w-m&&p.y>=R.y+m&&p.y<=R.y+R.h-m;

// ---------- checks ----------
// 1/2. Projection: every node centre and tile inside the safe area and board rectangle; reports screen positions.
function projection(G,C,vp,rects){const safe={x:vp.inset.l,y:vp.inset.t,w:vp.w-vp.inset.l-vp.inset.r,h:vp.h-vp.inset.t-vp.inset.b};const out=[],errors=[];
 for(const id of Object.keys(G.nodes)){const c=C.project({...G.nodes[id],z:0});const corners=tileCorners(G,id).map(C.project);
  const ok=corners.every(p=>insideRect(p,safe))&&insideRect(c,C.rect);if(!ok)errors.push('off-board:'+id);
  for(const r of rects)if(corners.some(p=>insideRect(p,r)))errors.push(`under-hud:${id}:${r.id}`);
  out.push({id,x:+c.x.toFixed(1),y:+c.y.toFixed(1),depth:+c.d.toFixed(3)})}
 return{ok:errors.length===0,errors,nodes:out}}
// 3. Touch targets: a 44 pt circle on every node must not overlap another node's circle, and must fit on the board.
function touch(G,C,{min=MIN_TOUCH}={}){const ids=Object.keys(G.nodes),P=ids.map(id=>C.project({...G.nodes[id],z:0}));let worst={d:Infinity};const errors=[];
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const d=Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);if(d<worst.d)worst={d,a:ids[i],b:ids[j]};if(d<min)errors.push(`targets-overlap:${ids[i]}-${ids[j]}:${d.toFixed(1)}`)}
 // Visible tile size (shortest projected edge) — information for the designer.
 let minEdge=Infinity,minEdgeAt=null;for(const id of ids){const c=tileCorners(G,id).map(C.project);for(let k=0;k<4;k++){const a=c[k],b=c[(k+1)%4],e=Math.hypot(a.x-b.x,a.y-b.y);if(e<minEdge){minEdge=e;minEdgeAt=id}}}
 return{ok:errors.length===0,errors,minCentreDistance:+worst.d.toFixed(1),closest:[worst.a,worst.b],minVisibleTileEdge:+minEdge.toFixed(1),smallestTile:minEdgeAt}}
// Occlusion: is a 3D point hidden behind another building (nearer the camera) from this camera?
function buildings(G,C,stages){return Object.entries(stages).filter(([,h])=>h>0).map(([id,h])=>{const box=buildingBox(G,id,h).map(C.project);return{id,poly:hull(box),near:Math.min(...box.map(p=>p.d))}})}
function hidden(C,B,q,self){const p=C.project(q);return B.find(b=>b.id!==self&&b.near<p.d&&inPoly(p,b.poly))||null}
// 4. Visibility with every property at Skyscraper: each tile (5 sample points) and each roof must be visible.
function skyline(G,C,{stage=4,minVisible=.6,hudRects=[]}={}){const stages={};for(const id of SC.PROPS)stages[id]=stage;const B=buildings(G,C,stages);const errors=[],rows=[];
 for(const id of Object.keys(G.nodes)){const n=G.nodes[id],k=.3*G.tile;const samples=[[0,0],[-k,-k],[k,-k],[k,k],[-k,k]].map(([u,v])=>{const [a,b]=rot(n.ang,u,v);return{x:n.x+a,y:n.y+b,z:n.type==='property'?G.stageHeight[stage]:0}});
  const vis=samples.filter(q=>!hidden(C,B,q,id)&&!hudRects.some(r=>insideRect(C.project(q),r))).length/samples.length;rows.push({id,visible:vis});
  if(vis<minVisible)errors.push(`hidden:${id}:${Math.round(vis*100)}%`+(()=>{const h=hidden(C,B,samples[0],id);return h?`:behind-${h.id}`:''})())}
 return{ok:errors.length===0,errors,worst:rows.sort((a,b)=>a.visible-b.visible).slice(0,5)}}
// 5. Four tokens on one node: slots must not overlap on screen, stay on the tile, and not be hidden by buildings.
function tokens(G,C,{node='O0',stages={},count=4}={}){const B=buildings(G,C,stages),errors=[];const P=[...Array(count)].map((_,i)=>tokenPoint(G,node,i)),S=P.map(C.project);
 const rPx=G.tokenR*C.ppu({...G.nodes[node],z:0});const tile=hull(tileCorners(G,node).map(C.project));
 for(let i=0;i<count;i++){if(!inPoly(C.project({...P[i],z:0}),tile))errors.push('token-off-tile:'+i);const h=hidden(C,B,P[i],node);if(h)errors.push(`token-hidden:${i}:behind-${h.id}`);
  for(let j=i+1;j<count;j++){const d=Math.hypot(S[i].x-S[j].x,S[i].y-S[j].y);if(d<2*rPx)errors.push(`tokens-overlap:${i}-${j}`)}}
 return{ok:errors.length===0,errors,tokenDiameterPt:+(2*rPx).toFixed(1),slots:S.map(p=>({x:+p.x.toFixed(1),y:+p.y.toFixed(1)}))}}
// Route preview paths: the nodes each plan passes through for every roll (2–12), first junction applying the plan.
function routePaths(pos){const out={};for(const via of ['stay','cross']){const seq=[];let at=pos,no=false,first=true;
  for(let k=0;k<12;k++){let nx;if(SC.NODES.find(n=>n.id===at).type==='junction'&&!no){const c=first?via:'stay';first=false;if(c==='cross'){nx=SC.LINKS[at];no=true}else{nx=SC.next(at);no=false}}else{nx=SC.next(at);no=false}seq.push({from:at,to:nx,connector:SC.LINKS[at]===nx});at=nx}
  out[via]=seq}return out}
// 6. Both route previews visible together from a position: every node on both paths visible (not hidden, not under HUD).
function routePreview(G,C,{pos='O0',stages={},hudRects=[]}={}){const paths=routePaths(pos),B=buildings(G,C,stages),errors=[];
 for(const via of ['stay','cross'])for(const seg of paths[via].slice(0,12)){const q={...G.nodes[seg.to],z:0},p=C.project(q);
  if(hudRects.some(r=>insideRect(p,r)))errors.push(`${via}:${seg.to}:under-hud`);const h=hidden(C,B,q,seg.to);if(h)errors.push(`${via}:${seg.to}:behind-${h.id}`)}
 const diverge=paths.stay.findIndex((s,i)=>s.to!==paths.cross[i].to);
 return{ok:errors.length===0,errors,paths:{stay:paths.stay.map(s=>s.to),cross:paths.cross.map(s=>s.to)},divergeAtStep:diverge}}
// 7. HUD occlusion: no node target circle, tile corner, token slot or Skyscraper roof may fall under a HUD rectangle.
function hud(G,C,hudRects,{min=MIN_TOUCH}={}){const errors=[];for(const id of Object.keys(G.nodes)){const n=G.nodes[id],c=C.project({...n,z:0});
  for(const r of hudRects){if(circleRect(c,min/2,r))errors.push(`target-under-hud:${id}:${r.id}`);
   if(n.type==='property'){const roof=buildingBox(G,id,4).slice(4).map(C.project);if(roof.some(p=>insideRect(p,r)))errors.push(`roof-under-hud:${id}:${r.id}`)}
   for(let i=0;i<4;i++)if(insideRect(C.project(tokenPoint(G,id,i)),r)){errors.push(`token-under-hud:${id}:${r.id}`);break}}}
 return{ok:errors.length===0,errors:[...new Set(errors)]}}
// Run every check for one viewport + camera + layout.
function validate({layout=SC.referenceLayout(),cam=CAMERAS.top,vp=VIEWPORTS[1],hudRects=null,board=null}={}){const G=geometry(layout),plan=hudPlan(vp);const rects=hudRects||plan.rects,rect=board||plan.board;
 const C=camera(G,cam,rect),allSky={};for(const id of SC.PROPS)allSky[id]=4;
 const r={viewport:vp.id,camera:cam,board:rect,scalePtPerUnit:+C.scale.toFixed(4),
  projection:projection(G,C,vp,rects),touch:touch(G,C),skyline:skyline(G,C,{hudRects:rects}),tokens:tokens(G,C,{stages:allSky}),
  route:{O0:routePreview(G,C,{pos:'O0',stages:allSky,hudRects:rects}),O1:routePreview(G,C,{pos:'O1',stages:allSky,hudRects:rects}),I1:routePreview(G,C,{pos:'I1',stages:allSky,hudRects:rects})},hud:hud(G,C,rects)};
 r.ok=['projection','touch','skyline','tokens','hud'].every(k=>r[k].ok)&&Object.values(r.route).every(x=>x.ok);return r}
// Smallest board rectangle (square) for which a layout keeps 44 pt between all node centres from this camera.
function minBoardSide(layout=SC.referenceLayout(),cam=CAMERAS.top){const G=geometry(layout);let lo=100,hi=2000;
 for(let i=0;i<30;i++){const m=(lo+hi)/2;const C=camera(G,cam,{x:0,y:0,w:m,h:m});if(touch(G,C).ok)hi=m;else lo=m}return Math.ceil(hi)}
return Object.freeze({VIEWPORTS,CAMERAS,MIN_TOUCH,hudPlan,geometry,camera,tileCorners,buildingBox,tokenPoint,hull,inPoly,routePaths,
 projection,touch,skyline,tokens,routePreview,hud,validate,minBoardSide});
});
