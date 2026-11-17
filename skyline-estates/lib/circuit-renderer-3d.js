/* Skyline Circuit — 3D board renderer (three.js r160, ES module). Draft for visual review and device QA.

   Contract (CIRCUIT-RENDERER.md): reads a rules snapshot (SC.view) plus animated token positions; never changes match
   state and never uses the match RNG (decorative randomness uses its own fixed generator).

   Geometry is the approved V1 baseline: node positions, building/token envelopes and the camera come from
   lib/circuit-screen.js, and the camera uses the *same* projection as the validators (custom projection matrix built
   from SS.camera), so screen-space checks measure exactly what is drawn. Stage art always stays inside the validated
   building envelope (footprint buildingSide, height stageHeight[stage]).

   Coordinates: board (x right, y toward viewer, z up) → three (X = x, Y = z, Z = y). */
import * as THREE from './three.module.min.js';
import {mergeGeometries} from './BufferGeometryUtils.js';
const SC=window.SkylineCircuit,SS=window.SkylineCircuitScreen;
export const DECISIONS={routes:{stay:'#F2C457',cross:'#70F0C2',casing:'#0B1633'},
 players:[{c:'#FF7A59',shape:'circle'},{c:'#4C7DFF',shape:'square'},{c:'#F8F6EF',shape:'triangle'},{c:'#E055C8',shape:'hex'}],
 districts:[{name:'Harbour Quarter',accent:'#58B9CF',symbol:'wave'},{name:'Civic Heights',accent:'#E6B45B',symbol:'sun'},{name:'Verdant Mile',accent:'#70C79A',symbol:'leaf'},{name:'Neon Exchange',accent:'#B89BF0',symbol:'spark'}],
 palette:{navy:'#0B1633',deepWater:'#388EAA',waterHighlight:'#77CFDF',gold:'#F2C457',ivory:'#FFF0D0',stone:'#E6D4B4',warning:'#F3B45C'}};
// Quality tiers (CIRCUIT-V2-REVIEW.md §4). Changes are visual only.
export const TIERS={low:{shadows:0,trees:0,glow:false,water:false,maxScale:1.5,antialias:false},
 medium:{shadows:1024,trees:90,glow:false,water:false,maxScale:2.5,antialias:true},
 high:{shadows:2048,trees:160,glow:true,water:true,maxScale:3,antialias:true}};
export function pickTier(){try{const q=new URLSearchParams(location.search).get('quality');if(TIERS[q])return q;
 const n=navigator,cores=n.hardwareConcurrency||4,mem=n.deviceMemory||4,small=Math.min(screen.width,screen.height)<=320;
 if(small||cores<=2||mem<=2||(n.connection&&n.connection.saveData))return 'low';
 if((window.devicePixelRatio||1)>=3&&cores>=6)return 'high';return 'medium'}catch(e){return 'medium'}}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const V=(x,y,z=0)=>new THREE.Vector3(x,z,y); // board → three
const col=c=>new THREE.Color(c);
// ---------- procedural textures (canvas) ----------
function canvasTex(w,h,draw,{repeat=null,srgb=true}={}){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat)}return t}
function symbolPath(ctx,kind,r){ctx.lineCap='round';ctx.lineJoin='round';
 if(kind==='wave'){ctx.beginPath();for(const k of [-1,1]){ctx.moveTo(-r,k*r*.35);ctx.bezierCurveTo(-r*.5,k*r*.35-r*.55,-r*.1,k*r*.35+r*.55,r*.35,k*r*.35);ctx.quadraticCurveTo(r*.7,k*r*.35-r*.35,r,k*r*.35)}ctx.stroke()}
 else if(kind==='sun'){ctx.beginPath();ctx.arc(0,0,r*.42,0,7);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.65,Math.sin(a)*r*.65);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke()}}
 else if(kind==='leaf'){ctx.beginPath();ctx.moveTo(-r*.8,r*.8);ctx.quadraticCurveTo(-r*.9,-r*.6,r*.8,-r*.8);ctx.quadraticCurveTo(r*.6,r*.9,-r*.8,r*.8);ctx.fill();ctx.save();ctx.strokeStyle='rgba(11,22,51,.85)';ctx.beginPath();ctx.moveTo(-r*.6,r*.6);ctx.lineTo(r*.5,-r*.5);ctx.stroke();ctx.restore()}
 else if(kind==='spark'){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.32:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
 else if(kind==='event'){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.42:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
 else if(kind==='bridge'){ctx.beginPath();ctx.moveTo(-r,r*.35);ctx.quadraticCurveTo(0,-r*.9,r,r*.35);ctx.stroke();ctx.beginPath();ctx.moveTo(-r,r*.55);ctx.lineTo(r,r*.55);ctx.stroke()}
 else if(kind==='circle'){ctx.beginPath();ctx.arc(0,0,r*.8,0,7);ctx.fill();ctx.stroke()}
 else if(kind==='square'){ctx.beginPath();ctx.rect(-r*.72,-r*.72,r*1.44,r*1.44);ctx.fill();ctx.stroke()}
 else if(kind==='triangle'){ctx.beginPath();ctx.moveTo(0,-r*.9);ctx.lineTo(r*.85,r*.65);ctx.lineTo(-r*.85,r*.65);ctx.closePath();ctx.fill();ctx.stroke()}
 else if(kind==='hex'){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*r*.85,Math.sin(a)*r*.85)}ctx.closePath();ctx.fill();ctx.stroke()}}
const decalCache=new Map();
function decal(kind,color,{bg=null,outline=null}={}){const key=kind+color+bg+outline;if(decalCache.has(key))return decalCache.get(key);
 const t=canvasTex(128,128,(ctx,w)=>{ctx.translate(w/2,w/2);if(bg){ctx.beginPath();ctx.arc(0,0,w*.46,0,7);ctx.fillStyle=bg;ctx.fill()}ctx.fillStyle=color;ctx.strokeStyle=outline||color;ctx.lineWidth=w*.075;symbolPath(ctx,kind,w*.34)});
 const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false});decalCache.set(key,m);return m}
function facade(kind){return canvasTex(256,512,(ctx,w,h)=>{ctx.scale(2,2);w/=2;h/=2;
 if(kind==='masonry'){ctx.fillStyle='#FFF0D6';ctx.fillRect(0,0,w,h);ctx.fillStyle='#315A70';for(let y=26;y<h-10;y+=46)for(let x=14;x<w-10;x+=36)ctx.fillRect(x,y,20,26);ctx.fillStyle='#E4C89F';ctx.fillRect(0,h-14,w,14)}
 else if(kind==='stone'){ctx.fillStyle='#F2DAB6';ctx.fillRect(0,0,w,h);ctx.fillStyle='#78A8B4';for(let y=20;y<h;y+=40)ctx.fillRect(0,y,w,16);ctx.strokeStyle='#D4B990';for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}}
 else{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#E1F6F1');g.addColorStop(1,'#66A9BF');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(42,89,108,.54)';ctx.lineWidth=2;
  for(let y=0;y<h;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let x=0;x<w;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  const r=rng(kind==='glass'?3:5);ctx.fillStyle='rgba(255,227,158,.90)';for(let i=0;i<40;i++)ctx.fillRect(Math.floor(r()*8)*16+3,Math.floor(r()*14)*18+4,10,10);
  // Thin architectural mullions and alternating glass reflections stay crisp at oblique angles.
  ctx.fillStyle='rgba(215,236,248,.30)';for(let x=1;x<w;x+=16)ctx.fillRect(x,0,1,h);
  ctx.fillStyle='rgba(20,69,87,.30)';for(let x=13;x<w;x+=16)ctx.fillRect(x,0,2,h);
  ctx.fillStyle='rgba(245,199,120,.15)';for(let y=6;y<h;y+=54)ctx.fillRect(0,y,w,3);
  ctx.fillStyle='rgba(241,248,255,.24)';for(let y=3;y<h;y+=36)for(let x=4;x<w;x+=32)ctx.fillRect(x,y,5,1)
 }},{repeat:[1,1]})}

// ---------- draw-call economy: merge meshes per material (display); originals stay as hidden pick/envelope proxies ----------
function piecesOf(mesh){mesh.updateWorldMatrix(true,false);const g0=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g0.applyMatrix4(mesh.matrixWorld);
 const norm=g=>{const out=new THREE.BufferGeometry();out.setAttribute('position',g.getAttribute('position'));if(!g.getAttribute('normal'))g.computeVertexNormals();out.setAttribute('normal',g.getAttribute('normal'));
  out.setAttribute('uv',g.getAttribute('uv')||new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));return out};
 if(!Array.isArray(mesh.material))return[[mesh.material,norm(g0)]];
 return g0.groups.map(gr=>{const sub=new THREE.BufferGeometry();for(const k of ['position','normal','uv']){const a=g0.getAttribute(k);if(a)sub.setAttribute(k,new THREE.BufferAttribute(a.array.slice(gr.start*a.itemSize,(gr.start+gr.count)*a.itemSize),a.itemSize))}return[mesh.material[gr.materialIndex],norm(sub)]})}
function mergeByMaterial(meshes,{shadows=false,order=0}={}){const by=new Map();for(const m of meshes)for(const [mat,g] of piecesOf(m)){if(!by.has(mat))by.set(mat,[]);by.get(mat).push(g)}
 const grp=new THREE.Group();for(const [mat,list] of by){const g=mergeGeometries(list,false);for(const x of list)x.dispose();if(!g)continue;const mesh=new THREE.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=shadows;mesh.renderOrder=order;grp.add(mesh)}return grp}
function disposeGroup(g){if(!g)return;g.traverse(o=>{if(o.isMesh)o.geometry.dispose()});g.parent&&g.parent.remove(g)}

export function create(canvas,{layout,spec,camera:cam0,tier:tierName=pickTier(),onTierChange=null}={}){
 const P=DECISIONS.palette;let tier=TIERS[tierName];
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:tier.antialias,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:new URLSearchParams(location.search).get('test')==='1'})}catch(e){return null}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.shadowMap.enabled=!!tier.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#73BAD0');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.updateProjectionMatrix=()=>{};// projection is set explicitly
 const G=SS.geometry(layout,spec),T=G.tile;let C=null,rect=null,camNow={...cam0};
 const nodeIds=Object.keys(G.nodes),idx=Object.fromEntries(nodeIds.map((id,i)=>[id,i]));
 const R=Math.max(...nodeIds.map(id=>Math.hypot(G.nodes[id].x,G.nodes[id].y)));
 // ---------- golden-hour sky as an environment map (reflections for glass; Medium/High only) ----------
 if(tier.shadows){const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();const sky=canvasTex(16,256,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#74B7D3');g.addColorStop(.45,'#B7D9E2');g.addColorStop(.52,'#FFE2AE');g.addColorStop(.68,'#E3AF82');g.addColorStop(1,'#8CB7C8');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100,32,16),new THREE.MeshBasicMaterial({map:sky,side:THREE.BackSide})));scene.environment=pm.fromScene(es,.02).texture;scene.environmentIntensity=.65;pm.dispose()}
 // ---------- lights ----------
 const hemi=new THREE.HemisphereLight('#E6F5FF','#A88564',.95);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#FFE3A7',2.45);sun.position.copy(V(-420,-150,380));sun.target.position.set(0,0,0);scene.add(sun,sun.target);
 if(tier.shadows){sun.castShadow=true;sun.shadow.mapSize.set(tier.shadows,tier.shadows);const sc=sun.shadow.camera;sc.left=-R*1.3;sc.right=R*1.3;sc.top=R*1.3;sc.bottom=-R*1.3;sc.near=10;sc.far=1400;sun.shadow.bias=-.0008;sun.shadow.normalBias=.6}
 // ---------- environment ----------
 const env=new THREE.Group();scene.add(env);
 const waterTex=canvasTex(256,256,(ctx,w,h)=>{ctx.fillStyle=P.deepWater;ctx.fillRect(0,0,w,h);const r=rng(7);ctx.strokeStyle='rgba(222,248,250,.32)';ctx.lineWidth=1.4;for(let i=0;i<70;i++){const x=r()*w,y=r()*h,l=6+r()*16;ctx.beginPath();ctx.moveTo(x-l,y);ctx.quadraticCurveTo(x,y-3,x+l,y);ctx.stroke()}},{repeat:[14,14]});
 const water=new THREE.Mesh(new THREE.PlaneGeometry(R*12,R*12),new THREE.MeshStandardMaterial({map:waterTex,color:'#FFFFFF',roughness:.27,metalness:.04}));water.rotation.x=-Math.PI/2;water.position.y=-7;water.receiveShadow=!!tier.shadows;env.add(water);
 const platR=R+T*.95;
 const platTop=canvasTex(1024,1024,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,w*.1,w/2,h/2,w/2);g.addColorStop(0,'#FFF0D3');g.addColorStop(1,'#DAB994');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(127,96,67,.16)';ctx.lineWidth=2;for(let i=0;i<48;i++){const a=i*Math.PI/24;ctx.beginPath();ctx.moveTo(w/2+Math.cos(a)*w*.08,h/2+Math.sin(a)*w*.08);ctx.lineTo(w/2+Math.cos(a)*w*.5,h/2+Math.sin(a)*w*.5);ctx.stroke()}
  for(const k of [.2,.32,.45]){ctx.beginPath();ctx.arc(w/2,h/2,w*k,0,7);ctx.stroke()}});
 const platform=new THREE.Mesh(new THREE.CylinderGeometry(platR,platR+3,8,128),[new THREE.MeshStandardMaterial({color:'#E0C49E',roughness:.85}),new THREE.MeshStandardMaterial({map:platTop,roughness:.9}),new THREE.MeshStandardMaterial({color:'#A77B57'})]);
 platform.position.y=-4;platform.receiveShadow=!!tier.shadows;env.add(platform);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(platR+.5,1.2,8,160),new THREE.MeshStandardMaterial({color:P.ivory,roughness:.4,metalness:.4,emissive:'#3a3424',emissiveIntensity:.3}));rim.rotation.x=Math.PI/2;env.add(rim);
 // ring roads through node centres (closed strips), ivory edge markings
 function strip(points,width,y,mat,closed=true){const pos=[],ind=[];const n=points.length;for(let i=0;i<n;i++){const a=closed?points[(i-1+n)%n]:points[Math.max(0,i-1)],b=points[i],c=closed?points[(i+1)%n]:points[Math.min(n-1,i+1)];let tx=c.x-a.x,ty=c.y-a.y;const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
   const nx=-ty,ny=tx;pos.push(b.x+nx*width/2,y,b.y+ny*width/2,b.x-nx*width/2,y,b.y-ny*width/2)}
  for(let i=0;i<(closed?n:n-1);i++){const j=(i+1)%n;ind.push(2*i,2*j,2*i+1,2*i+1,2*j,2*j+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();return new THREE.Mesh(g,mat)}
 const ringPts=r=>SC.NODES.filter(n=>n.ring===r).sort((a,b)=>a.idx-b.idx).map(n=>G.nodes[n.id]);
 // smooth the ring through node centres (Catmull-Rom) so roads read as boulevards
 const smooth=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x,0,p.y)),true,'centripetal').getSpacedPoints(pts.length*8).slice(0,-1).map(v=>({x:v.x,y:v.z}));
 const roadMat=new THREE.MeshStandardMaterial({color:'#536C73',roughness:.95,side:THREE.DoubleSide});
 const markMat=new THREE.MeshBasicMaterial({color:P.ivory,transparent:true,opacity:.85,side:THREE.DoubleSide});
 for(const r of ['O','I']){const pts=smooth(ringPts(r));const road=strip(pts,T*1.1,.15,roadMat);road.receiveShadow=!!tier.shadows;env.add(road);
  for(const s of [-1,1]){const off=pts.map((p,i)=>{const a=pts[(i-1+pts.length)%pts.length],c=pts[(i+1)%pts.length];let tx=c.x-a.x,ty=c.y-a.y;const l=Math.hypot(tx,ty);return{x:p.x-ty/l*s*T*.6,y:p.y+tx/l*s*T*.6}});env.add(strip(off,1.1,.3,markMat))}}
 const ringGapIn0=()=>Math.min(...SC.NODES.filter(n=>n.ring==='I').map(n=>Math.hypot(G.nodes[n.id].x,G.nodes[n.id].y)))+T*.62,ringGapOut0=()=>R-T*.62;
 // central civic garden (decorative)
 const innerR=Math.min(...SC.NODES.filter(n=>n.ring==='I').map(n=>Math.hypot(G.nodes[n.id].x,G.nodes[n.id].y)))-T*.72;
 const plaza=new THREE.Mesh(new THREE.RingGeometry(ringGapIn0(),ringGapOut0(),128),new THREE.MeshStandardMaterial({color:'#E4BD97',roughness:.9}));plaza.rotation.x=-Math.PI/2;plaza.position.y=.08;plaza.receiveShadow=!!tier.shadows;env.add(plaza);
 const garden=new THREE.Mesh(new THREE.CylinderGeometry(innerR,innerR,2,96),new THREE.MeshStandardMaterial({color:'#75B96E',roughness:.95}));garden.position.y=0;garden.receiveShadow=!!tier.shadows;env.add(garden);
 const pool=new THREE.Mesh(new THREE.CylinderGeometry(innerR*.3,innerR*.3,2.2,64),new THREE.MeshStandardMaterial({color:P.waterHighlight,roughness:.2,metalness:.2}));pool.position.y=.3;env.add(pool);
 const poolRim=new THREE.Mesh(new THREE.TorusGeometry(innerR*.3,.9,8,64),new THREE.MeshStandardMaterial({color:P.ivory,roughness:.5}));poolRim.rotation.x=Math.PI/2;poolRim.position.y=1.5;env.add(poolRim);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,len=innerR*.62;const path=new THREE.Mesh(new THREE.BoxGeometry(len,.6,3.2),new THREE.MeshStandardMaterial({color:'#FFF0CF',roughness:.9}));path.position.set(Math.cos(a)*(innerR*.33+len/2),1.2,Math.sin(a)*(innerR*.33+len/2));path.rotation.y=-a;env.add(path)}
 // trees: instanced, decorative RNG
 if(tier.trees){const r=rng(11),n=tier.trees,foliage=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#53A864',roughness:.85,flatShading:true}),n),trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.32,1,6),new THREE.MeshStandardMaterial({color:'#856343'}),n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3();let k=0;const put=(x,y,h)=>{m.compose(new THREE.Vector3(x,h*.9+1,y),q,s.set(h*.55,h*.6,h*.55));foliage.setMatrixAt(k,m);m.compose(new THREE.Vector3(x,h*.45,y),q,s.set(h*.5,h*.9,h*.5));trunk.setMatrixAt(k,m);k++};
  for(let i=0;i<Math.round(n*.7);i++){const a=r()*Math.PI*2;put(Math.cos(a)*(platR-3.5),Math.sin(a)*(platR-3.5),2.4+r()*1.4)}
  while(k<n){const a=r()*Math.PI*2,d=innerR*(.42+r()*.48);put(Math.cos(a)*d,Math.sin(a)*d,2.2+r()*1.6)}
  foliage.count=trunk.count=k;foliage.castShadow=trunk.castShadow=!!tier.shadows;foliage.userData.pick={kind:4,i:0};env.add(foliage,trunk)}
 // ---------- city depth (decorative; low, off the tiles; registered as occluders for the visibility pass) ----------
 function inst(geo,mat,list,{shadows=false,pick=true}={}){if(!list.length)return null;const m=new THREE.InstancedMesh(geo,mat,list.length),M=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  list.forEach((t,i)=>{q.setFromEuler(e.set(0,t.ry||0,0));M.compose(new THREE.Vector3(t.x,t.y,t.z),q,new THREE.Vector3(t.sx,t.sy,t.sz));m.setMatrixAt(i,M)});m.castShadow=shadows;m.receiveShadow=!!tier.shadows;if(pick)m.userData.pick={kind:4,i:0};env.add(m);return m}
 const junctionAngles=SC.NODES.filter(n=>n.type==='junction'&&n.ring==='O').map(n=>Math.atan2(G.nodes[n.id].y,G.nodes[n.id].x));
 const nearJunction=(a,deg)=>junctionAngles.some(j=>Math.abs(Math.atan2(Math.sin(a-j),Math.cos(a-j)))<deg*Math.PI/180);
 const outerEdge=R+T*.62,innerR2=Math.min(...SC.NODES.filter(n=>n.ring==='I').map(n=>Math.hypot(G.nodes[n.id].x,G.nodes[n.id].y)));
 const ringGapIn=innerR2+T*.62,ringGapOut=R-T*.62;
 {const r=rng(21),blocks=[],roofs=[],lamps=[];const blockMat=new THREE.MeshStandardMaterial({color:'#F2D7B4',roughness:.85}),roofMat=new THREE.MeshStandardMaterial({color:'#C78664',roughness:.8});
  // outer promenade: low shops and townhouses between the boulevard and the waterfront
  for(let i=0;i<120;i++){const a=i/120*Math.PI*2+r()*.02,d=outerEdge+3+r()*(platR-outerEdge-9);const w=3.2+r()*2.6,h=2.2+r()*3.2;blocks.push({x:Math.cos(a)*d,y:h/2,z:Math.sin(a)*d,sx:w,sy:h,sz:w*.8,ry:-a})}
  // between the rings: low civic blocks and pocket parks, kept clear of the bridges
  for(let i=0;i<70;i++){const a=i/70*Math.PI*2+r()*.03;if(nearJunction(a,9))continue;const d=ringGapIn+2.5+r()*(ringGapOut-ringGapIn-5);const w=2.6+r()*2.2,h=1.4+r()*2.2;blocks.push({x:Math.cos(a)*d,y:h/2,z:Math.sin(a)*d,sx:w,sy:h,sz:w,ry:-a})}
  inst(new THREE.BoxGeometry(1,1,1),blockMat,blocks,{shadows:!!tier.shadows});
  for(const b of blocks)roofs.push({...b,y:b.sy+.15,sy:.3,sx:b.sx*.9,sz:b.sz*.9});inst(new THREE.BoxGeometry(1,1,1),roofMat,roofs);
  // street lamps along both boulevards (warm points)
  if(tier.trees){for(const rr of [outerEdge+1.2,ringGapIn-1.2,ringGapOut+1.2])for(let i=0;i<64;i++){const a=i/64*Math.PI*2;if(nearJunction(a,3))continue;lamps.push({x:Math.cos(a)*rr,y:2.2,z:Math.sin(a)*rr,sx:.55,sy:.55,sz:.55})}
   inst(new THREE.SphereGeometry(1,6,4),new THREE.MeshStandardMaterial({color:'#FFE2A8',emissive:'#FFD08A',emissiveIntensity:1.4}),lamps,{pick:false})}}
 // waterfront: quay wall with railing lights, a marina and small boats (outside the platform)
 {const quay=new THREE.Mesh(new THREE.CylinderGeometry(platR+1.5,platR+2.5,5,128,1,true),new THREE.MeshStandardMaterial({color:'#D8B896',roughness:.8,side:THREE.DoubleSide}));quay.position.y=-2.5;env.add(quay);
  const prom=new THREE.Mesh(new THREE.RingGeometry(platR-4,platR+1.4,128),new THREE.MeshStandardMaterial({color:'#F5E0BD',roughness:.9}));prom.rotation.x=-Math.PI/2;prom.position.y=.12;prom.receiveShadow=!!tier.shadows;env.add(prom);
  if(tier.trees){const r=rng(31),rail=[],hulls=[],sails=[];for(let i=0;i<90;i++){const a=i/90*Math.PI*2;rail.push({x:Math.cos(a)*(platR+.8),y:1.2,z:Math.sin(a)*(platR+.8),sx:.45,sy:.45,sz:.45})}
   inst(new THREE.SphereGeometry(1,6,4),new THREE.MeshStandardMaterial({color:P.ivory,emissive:'#FFE7B0',emissiveIntensity:1.2}),rail,{pick:false});
   // two marinas: a pier running out from the quay with boats moored in rows on both sides
   const piers=[];for(const a of [Math.PI*1.25,Math.PI*.25]){const ux=Math.cos(a),uz=Math.sin(a),px=-uz,pz=ux,len=34;piers.push({x:ux*(platR+len/2),y:-5.6,z:uz*(platR+len/2),sx:len,sy:1.2,sz:3,ry:-a});
    for(let k=0;k<6;k++)for(const sd of [-1,1]){const d=platR+6+k*5.2,l=4.2+r()*1.4;hulls.push({x:ux*d+px*sd*4.2,y:-6.2,z:uz*d+pz*sd*4.2,sx:1.7,sy:1.1,sz:l,ry:-a+Math.PI/2})}}
   inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#B98961',roughness:.9}),piers,{pick:false});
   inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#FDF7EA',roughness:.55}),hulls,{pick:false})}}
 // garden: hedge ring, lamp posts and fountain jets
 {const r=rng(41),hedges=[],jets=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(i%12===1||i%12===2)continue;hedges.push({x:Math.cos(a)*(innerR-2),y:1.6,z:Math.sin(a)*(innerR-2),sx:5.5,sy:1.6,sz:1.6,ry:-a+Math.PI/2})}
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#3D8D58',roughness:.95}),hedges);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;jets.push({x:Math.cos(a)*innerR*.18,y:3,z:Math.sin(a)*innerR*.18,sx:.5,sy:5,sz:.5})}jets.push({x:0,y:4.5,z:0,sx:1.2,sy:8,sz:1.2});
  inst(new THREE.CylinderGeometry(1,1,1,6),new THREE.MeshStandardMaterial({color:'#dff3ff',emissive:'#9fd8ff',emissiveIntensity:.6,transparent:true,opacity:.85}),jets);
  const statue=new THREE.Mesh(new THREE.CylinderGeometry(innerR*.06,innerR*.09,3,8),new THREE.MeshStandardMaterial({color:P.ivory,roughness:.4}));statue.position.y=1.6;env.add(statue)}
 // Sunlit civic park: a low walking circuit, colourful planting beds and timber benches.
 // Everything is decorative and below the adjacent street and building sightlines.
 {const walk=new THREE.Mesh(new THREE.RingGeometry(innerR*.68,innerR*.72,96),
    new THREE.MeshStandardMaterial({color:'#FFF0CC',roughness:.98,side:THREE.DoubleSide}));
  walk.rotation.x=-Math.PI/2;walk.position.y=1.18;env.add(walk);
  const flowers=[[],[],[]],benches=[],seats=[];
  for(let i=0;i<36;i++){const a=(i+.23)*Math.PI/18,d=innerR*(i%2?.79:.58);
   flowers[i%3].push({x:Math.cos(a)*d,y:1.85,z:Math.sin(a)*d,sx:1.55,sy:.55,sz:1.55})}
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,d=innerR*.77;
   benches.push({x:Math.cos(a)*d,y:1.85,z:Math.sin(a)*d,sx:4.2,sy:.65,sz:1.1,ry:-a});
   seats.push({x:Math.cos(a)*d,y:2.1,z:Math.sin(a)*d,sx:4.3,sy:1.35,sz:.32,ry:-a})}
  for(let k=0;k<flowers.length;k++)inst(new THREE.IcosahedronGeometry(1,1),
   new THREE.MeshStandardMaterial({color:['#E77E76','#F3D27A','#B99EDC'][k],roughness:1}),
   flowers[k],{pick:false});
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#B88E68',roughness:.87}),benches,{pick:false});
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#F8E0BA',roughness:.82}),seats,{pick:false})}
 // bridges: one hop, no stopping tile; ivory light strips
 const bridgeTruss=new THREE.MeshStandardMaterial({color:P.ivory,roughness:.45,metalness:.2}),bridgeMat=new THREE.MeshStandardMaterial({color:'#607F82',roughness:.7}),lightMat=new THREE.MeshStandardMaterial({color:P.ivory,emissive:'#FFE7B0',emissiveIntensity:tier.glow?1.6:.9});
 for(const [a,b] of Object.entries(SC.LINKS))if(a[0]==='O'){const p=G.nodes[a],q=G.nodes[b],len=Math.hypot(q.x-p.x,q.y-p.y),ang=Math.atan2(q.y-p.y,q.x-p.x),mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
  const deck=new THREE.Mesh(new THREE.BoxGeometry(len,1.6,T*.42),bridgeMat);deck.position.set(mx,1,my);deck.rotation.y=-ang;deck.receiveShadow=deck.castShadow=!!tier.shadows;env.add(deck);
  for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(len*.98,.8,.7),lightMat);l.position.set(mx-Math.sin(ang)*s*T*.2,2.1,my+Math.cos(ang)*s*T*.2);l.rotation.y=-ang;env.add(l);
   // low arched truss beside the deck (below token height, outside the tiles)
   const arch=new THREE.Mesh(new THREE.TorusGeometry(len*.36,.45,6,16,Math.PI),bridgeTruss);arch.scale.set(1,.16,1);arch.position.set(mx-Math.sin(ang)*s*T*.23,1.4,my+Math.cos(ang)*s*T*.23);arch.rotation.y=-ang;arch.userData.pick={kind:4,i:0};env.add(arch)}}
 // static environment meshes → merged by material (instanced meshes stay instanced; occluder proxies kept for the ID pass)
 scene.updateMatrixWorld(true);{const plain=env.children.filter(o=>o.isMesh&&!o.isInstancedMesh&&o!==water);const merged=mergeByMaterial(plain,{shadows:!!tier.shadows});merged.traverse(o=>{if(o.isMesh){o.receiveShadow=!!tier.shadows}});env.add(merged);
  for(const o of plain){if(o.userData.pick){o.visible=false;o.userData.pickOnly=true}else env.remove(o)}}
 // ---------- tiles ----------
 const tilesGroup=new THREE.Group();scene.add(tilesGroup);
 function rounded(w,r){const s=new THREE.Shape(),h=w/2;s.moveTo(-h+r,-h);s.lineTo(h-r,-h);s.quadraticCurveTo(h,-h,h,-h+r);s.lineTo(h,h-r);s.quadraticCurveTo(h,h,h-r,h);s.lineTo(-h+r,h);s.quadraticCurveTo(-h,h,-h,h-r);s.lineTo(-h,-h+r);s.quadraticCurveTo(-h,-h,-h+r,-h);return s}
 const tileGeo=new THREE.ExtrudeGeometry(rounded(T*.92,T*.12),{depth:3,bevelEnabled:true,bevelSize:.6,bevelThickness:.6,bevelSegments:1,curveSegments:4});tileGeo.rotateX(-Math.PI/2);
 const rimShape=rounded(T*1.0,T*.15);rimShape.holes.push(rounded(T*.86,T*.1));const rimGeo=new THREE.ExtrudeGeometry(rimShape,{depth:3.6,bevelEnabled:false,curveSegments:4});rimGeo.rotateX(-Math.PI/2);
 const inlayGeo=new THREE.PlaneGeometry(T*.7,T*.7);inlayGeo.rotateX(-Math.PI/2);
 const tileMat={property:new THREE.MeshStandardMaterial({color:'#F1E3C8',roughness:.82}),junction:new THREE.MeshStandardMaterial({color:'#32697C',roughness:.7}),event:new THREE.MeshStandardMaterial({color:'#B96839',roughness:.7})};
 const junctionRim=new THREE.MeshStandardMaterial({color:P.ivory,roughness:.4,emissive:'#4a4230',emissiveIntensity:.25}),eventRim=new THREE.MeshStandardMaterial({color:P.warning,roughness:.4,emissive:'#5a3a10',emissiveIntensity:.4});
 const ownerRimMat=DECISIONS.players.map(p=>new THREE.MeshStandardMaterial({color:p.c,roughness:.45,emissive:p.c,emissiveIntensity:.18}));
 const tile={};
 for(const n of SC.NODES){const g=G.nodes[n.id],grp=new THREE.Group();grp.position.set(g.x,0,g.y);grp.rotation.y=-g.ang;tilesGroup.add(grp);
  const base=new THREE.Mesh(tileGeo,tileMat[n.type]);base.receiveShadow=base.castShadow=!!tier.shadows;base.userData.pick={kind:1,i:idx[n.id]};grp.add(base);
  const rec={grp,base,decals:{}};tile[n.id]=rec;
  if(n.type==='property'){const d=DECISIONS.districts[n.quadrant];const inlay=new THREE.Mesh(inlayGeo,new THREE.MeshStandardMaterial({color:d.accent,transparent:true,opacity:.34,roughness:.7}));inlay.position.y=4.25;grp.add(inlay);
   const ownerRim=new THREE.Mesh(rimGeo,ownerRimMat[0]);ownerRim.visible=false;ownerRim.userData.dynamic=true;grp.add(ownerRim);rec.ownerRim=ownerRim;
   const sym=new THREE.Mesh(new THREE.PlaneGeometry(T*.42,T*.42).rotateX(-Math.PI/2),decal(d.symbol,d.accent));sym.position.y=4.4;sym.userData.dynamic=true;grp.add(sym);rec.plotSymbol=sym;
   // district symbol on the building base (corner), shown once developed
   const baseSym=new THREE.Mesh(new THREE.PlaneGeometry(T*.24,T*.24).rotateX(-Math.PI/2),decal(d.symbol,d.accent,{bg:'#0B1633'}));baseSym.position.set(-T*.33,4.45,T*.33);baseSym.visible=false;baseSym.userData.dynamic=true;grp.add(baseSym);rec.baseSymbol=baseSym;
   rec.seatBadge=null}
  else if(n.type==='junction'){const r=new THREE.Mesh(rimGeo,junctionRim);grp.add(r);const sym=new THREE.Mesh(new THREE.PlaneGeometry(T*.42,T*.42).rotateX(-Math.PI/2),decal('bridge',P.ivory));sym.position.y=4.4;grp.add(sym)}
  else{const r=new THREE.Mesh(rimGeo,eventRim);grp.add(r);const sym=new THREE.Mesh(new THREE.PlaneGeometry(T*.5,T*.5).rotateX(-Math.PI/2),decal('event',P.warning));sym.position.y=4.4;grp.add(sym)}}
 // static tile parts → merged once; bases stay as hidden pick proxies
 scene.updateMatrixWorld(true);{const statics=[];tilesGroup.traverse(o=>{if(o.isMesh&&!o.userData.dynamic)statics.push(o)});const merged=mergeByMaterial(statics,{shadows:!!tier.shadows});scene.add(merged);
  for(const o of statics){if(o.userData.pick){o.visible=false;o.userData.pickOnly=true}else o.parent.remove(o)}}
 // ---------- buildings: five stages inside the envelope ----------
 const mats={masonry:new THREE.MeshStandardMaterial({map:facade('masonry'),roughness:.85}),stone:new THREE.MeshStandardMaterial({map:facade('stone'),roughness:.75}),
  glass:new THREE.MeshStandardMaterial({map:facade('glass'),roughness:.2,metalness:tier.shadows?.3:0,emissive:'#3a2a10',emissiveIntensity:.12}),
  glass2:new THREE.MeshStandardMaterial({map:facade('glass2'),roughness:.18,metalness:tier.shadows?.35:0,emissive:'#3a2a10',emissiveIntensity:.15}),
  roof:new THREE.MeshStandardMaterial({color:'#F8E7CB',roughness:.8}),slate:new THREE.MeshStandardMaterial({color:'#C9B3A2',roughness:.65,flatShading:true}),metal:new THREE.MeshStandardMaterial({color:'#C6A15F',roughness:.35,metalness:tier.shadows?.7:.1}),roofDark:new THREE.MeshStandardMaterial({color:'#48859B',roughness:.35,metalness:tier.shadows?.35:0}),roofMid:new THREE.MeshStandardMaterial({color:'#74B5C3',roughness:.6,metalness:.2}),roofHigh:new THREE.MeshStandardMaterial({color:'#C3E6E8',roughness:.5,metalness:.25}),terrace:new THREE.MeshStandardMaterial({color:'#70B983',roughness:.9}),
  crown:new THREE.MeshStandardMaterial({color:P.gold,emissive:P.gold,emissiveIntensity:tier.glow?.6:.35,metalness:.6,roughness:.3})};
 const S=G.buildingSide,H=G.stageHeight;
 // Four district architecture palettes share the validated stage envelopes.
 // Material and silhouette variation is purely visual: no new lots, streets or gameplay rules.
 const districtGlass=['#FFFFFF','#FFE8D3','#DEF9E3','#E0EDFF'].map(color=>new THREE.MeshStandardMaterial({
  map:mats.glass.map,color,roughness:.23,metalness:.17,emissive:'#6F715D',emissiveIntensity:.045}));
 const districtRoof=['#DAAC7D','#E3C5AB','#89BFA4','#93BDD1'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.56,metalness:.12}));
 const districtTrim=['#D6AF63','#C98D64','#76BBA2','#90AACA'].map(color=>new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.39}));
 // A box with side walls from `mat` and a roof from `roof` (BoxGeometry face order: +x,-x,+y(top),-y,+z,-z).
 const box=(w,h,mat,roof=mats.roof)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),[mat,mat,roof,mat,mat,mat]);m.castShadow=m.receiveShadow=!!tier.shadows;return m};
 // Five stages, each with its own top-down silhouette, all inside the validated envelope (footprint S, height H[stage]).
 const oct=(r,h,mat,{open=false}={})=>{const g=new THREE.CylinderGeometry(r,r,h,8,1,open);g.rotateY(Math.PI/8);const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=!!tier.shadows;return m};
 const hip=(w,h,mat)=>{const g=new THREE.ConeGeometry(w/Math.SQRT2,h,4,1);g.rotateY(Math.PI/4);const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=!!tier.shadows;return m};
 const slab=(w,h,d,mat,roof=mats.roof)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mat,mat,roof,mat,mat,mat]);m.castShadow=m.receiveShadow=!!tier.shadows;return m};
 function stageModel(stage,variant=0){const g=new THREE.Group(),add=(m,y,x=0,z=0)=>{m.position.set(x,y,z);g.add(m);return m};const Z=4.2,h=H[stage]-Z; // building height above the tile
  const vGlass=districtGlass[variant],vRoof=districtRoof[variant],vTrim=districtTrim[variant];
  if(stage===1){// Low-rise: cream masonry house, hipped slate roof (ridge "X" reads from above), chimney
   const wall=h*.58;add(box(S*.86,wall,mats.masonry),Z+wall/2);add(hip(S*.94,h-wall,vRoof),Z+wall+(h-wall)/2);add(slab(S*.08,(h-wall)*.7,S*.08,mats.stone,mats.stone),Z+wall+(h-wall)*.35,S*.24,-S*.2)}
  else if(stage===2){// Mid-rise: stone podium with roof garden, L-shaped glass upper block
   const pod=h*.42,up=h-pod;add(box(S*.94,pod,mats.stone,mats.terrace),Z+pod/2);
   add(slab(S*.86,up,S*.42,vGlass,vRoof),Z+pod+up/2,0,-S*.21);add(slab(S*.42,up,S*.86,vGlass,vRoof),Z+pod+up/2,-S*.21,0);
   add(slab(S*.34,.5,S*.34,mats.terrace,mats.terrace),Z+pod+.3,S*.24,S*.24);
   // Slim exterior corner mullions make the L-shaped facade read from the City View camera.
   for(const [x,z] of [[-S*.4,-S*.4],[S*.4,-S*.4],[-S*.4,S*.4]])add(slab(S*.025,up*.88,S*.025,vTrim,vTrim),Z+pod+up*.44,x,z)}
  else if(stage===3){// High-rise: terraced podium, cross-shaped tower with a glass crown
   const pod=h*.18,tw=h-pod,top=tw*.16;add(box(S*.94,pod,mats.stone,mats.terrace),Z+pod/2);
   add(slab(S*.86,tw-top,S*.36,vGlass,vRoof),Z+pod+(tw-top)/2);add(slab(S*.36,tw-top,S*.86,vGlass,vRoof),Z+pod+(tw-top)/2);
   add(slab(S*.5,top,S*.5,vGlass,vTrim),Z+pod+tw-top/2);
   // Recessed crown rim and four vertical corner accents, inside the existing height envelope.
   add(slab(S*.56,Math.min(.75,top*.12),S*.56,vTrim,vTrim),Z+pod+tw-Math.min(.75,top*.12)/2);
   for(const [x,z] of [[-S*.17,-S*.17],[S*.17,-S*.17],[-S*.17,S*.17],[S*.17,S*.17]])add(slab(S*.022,(tw-top)*.78,S*.022,vTrim,vTrim),Z+pod+(tw-top)*.48,x,z)}
  else if(stage===4){// Skyscrapers: four distinct district silhouettes, shared base and validated 3D envelope.
   // Landmark silhouette is still readable from the 30-degree inspection camera and 0-degree strategy view.
   const base=h*.09,crown=h*.06,body=h-base-crown,R=S*.5;
   add(box(S*.94,base,mats.stone,mats.terrace),Z+base/2);
   if(variant===0){// Harbour Quarter: octagonal stepped maritime tower with golden observation crown.
    const d1=body*.5,d2=body*.3,d3=body-d1-d2;
    add(oct(R*.98,d1,vGlass),Z+base+d1/2);add(oct(R*.86,d2,vGlass),Z+base+d1+d2/2);add(oct(R*.72,d3,vGlass),Z+base+d1+d2+d3/2);
    for(const [y,r] of [[Z+base+d1,R*.98],[Z+base+d1+d2,R*.86]])add(oct(r,.5,vTrim),y);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,fr=R*.85;const fin=slab(.48,d1+d2*.85,.85,vTrim,vTrim);fin.rotation.y=-a;add(fin,Z+base+(d1+d2*.85)/2,Math.cos(a)*fr,Math.sin(a)*fr)}
    add(oct(R*.75,crown,mats.crown),Z+base+body+crown/2);
   }else if(variant===1){// Civic Heights: elegant rectangular terraces and a broad illuminated crown.
    const lower=body*.74,upper=body-lower;
    add(slab(S*.74,lower,S*.71,vGlass,vRoof),Z+base+lower/2);
    add(slab(S*.57,upper,S*.57,vGlass,vRoof),Z+base+lower+upper/2);
    for(const x of [-S*.34,S*.34])add(slab(S*.028,lower*.94,S*.03,vTrim,vTrim),Z+base+lower*.48,x,-S*.34);
    add(slab(S*.61,crown,S*.61,mats.crown,mats.crown),Z+base+body+crown/2);
   }else if(variant===2){// Verdant Mile: terraced circular sky gardens around a glazed residential tower.
    const d1=body*.48,d2=body*.30,d3=body-d1-d2;
    add(oct(R*.88,d1,vGlass),Z+base+d1/2);
    add(oct(R*.74,d2,vGlass),Z+base+d1+d2/2);
    add(oct(R*.59,d3,vGlass),Z+base+d1+d2+d3/2);
    add(oct(R*.96,.62,mats.terrace),Z+base+d1);
    add(oct(R*.81,.62,mats.terrace),Z+base+d1+d2);
    add(oct(R*.63,crown,vRoof),Z+base+body+crown/2);
   }else{// Neon Exchange: two glass wings linked by a luminous skybridge and a central roof pavilion.
    add(slab(S*.35,body,S*.44,vGlass,vRoof),Z+base+body/2);
    for(const x of [-S*.27,S*.27])add(slab(S*.27,body*.82,S*.68,vGlass,vRoof),Z+base+body*.41,x,0);
    add(slab(S*.82,body*.055,S*.26,vTrim,vTrim),Z+base+body*.70);
    add(slab(S*.46,crown,S*.49,mats.crown,mats.crown),Z+base+body+crown/2);
   }
  }
  g.traverse(o=>{if(o.isMesh)o.userData.envelope=true});return g}
 const stageCache=Array.from({length:4},(_,variant)=>[null,1,2,3,4].map(s=>s?stageModel(s,variant):null));
 const ownerBandGeo=(()=>{const s=rounded(S,S*.08);s.holes.push(rounded(S*.9,S*.06));const g=new THREE.ExtrudeGeometry(s,{depth:1.4,bevelEnabled:false,curveSegments:4});g.rotateX(-Math.PI/2);return g})();
 const buildings={};
 function setBuilding(id,stage,owner){const rec=tile[id];if(rec.stage===stage&&rec.owner===owner)return;rec.stage=stage;rec.owner=owner;
  if(rec.building){rec.grp.remove(rec.building);rec.building=null}
  if(rec.ownerRim){rec.ownerRim.visible=owner>=0;if(owner>=0)rec.ownerRim.material=ownerRimMat[owner]}
  if(rec.seatBadge){rec.grp.remove(rec.seatBadge);rec.seatBadge=null}
  if(owner>=0){const p=DECISIONS.players[owner];const b=new THREE.Mesh(new THREE.PlaneGeometry(T*.24,T*.24).rotateX(-Math.PI/2),decal(p.shape,p.c,{bg:'#0B1633',outline:'#0B1633'}));b.position.set(T*.33,4.45,T*.33);b.userData.dynamic=true;rec.grp.add(b);rec.seatBadge=b}
  rec.plotSymbol.visible=stage===0;rec.baseSymbol.visible=stage>0;
  if(stage>0){const variant=SC.NODES.find(n=>n.id===id)?.quadrant??0;const g=stageCache[variant][stage].clone();g.traverse(o=>{if(o.isMesh)o.userData.pick={kind:2,i:idx[id]}});
   if(owner>=0){const band=new THREE.Mesh(ownerBandGeo,ownerRimMat[owner]);band.position.y=4.1;band.userData.envelope=true;band.userData.pick={kind:2,i:idx[id]};g.add(band)}
   rec.grp.add(g);rec.building=g}}
 // ---------- tokens ----------
 const tokenGeo={circle:new THREE.CylinderGeometry(G.tokenR,G.tokenR,G.tokenH,32),square:new THREE.BoxGeometry(G.tokenR*1.7,G.tokenH,G.tokenR*1.7),triangle:new THREE.CylinderGeometry(G.tokenR*1.18,G.tokenR*1.18,G.tokenH,3),hex:new THREE.CylinderGeometry(G.tokenR*1.02,G.tokenR*1.02,G.tokenH,6)};
 const tokens=DECISIONS.players.map((p,i)=>{const g=new THREE.Group();const m=new THREE.Mesh(tokenGeo[p.shape],new THREE.MeshStandardMaterial({color:p.c,roughness:.35,metalness:.1,emissive:p.c,emissiveIntensity:.15}));
  const o=new THREE.Mesh(tokenGeo[p.shape],new THREE.MeshBasicMaterial({color:'#0B1633',side:THREE.BackSide}));o.scale.setScalar(1.22);g.add(o,m);m.castShadow=!!tier.shadows;g.traverse(x=>{if(x.isMesh)x.userData.pick={kind:3,i}});g.visible=false;scene.add(g);return g});
 // ---------- route previews and networks (ribbons above the tiles) ----------
 const overlay=new THREE.Group();scene.add(overlay);
 function ribbon(pts,width,y,color,{dash=null,opacity=1,order=5}={}){const grp=new THREE.Group();const segs=[];if(dash){let acc=0,on=true,cur=[pts[0]];for(let i=1;i<pts.length;i++){let a=pts[i-1];const b=pts[i];let l=Math.hypot(b.x-a.x,b.y-a.y);
    while(l>0){const step=Math.min(l,(on?dash[0]:dash[1])-acc);const t=step/Math.hypot(b.x-a.x,b.y-a.y);const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(on)cur.push(p);acc+=step;l-=step;a=p;if(acc>=(on?dash[0]:dash[1])-1e-6){if(on){segs.push(cur)}on=!on;acc=0;cur=[p]}}if(on)cur.push(b)}if(on&&cur.length>1)segs.push(cur)}else segs.push(pts);
  // Opaque ribbons ordered explicitly: casing (5) under colour (6); dots and glow are transparent and come after.
  const mat=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const parts=[];for(const s of segs)if(s.length>1&&Math.hypot(s[s.length-1].x-s[0].x,s[s.length-1].y-s[0].y)>.5)parts.push(strip(s,width,y,mat,false));
  const merged=mergeByMaterial(parts,{order});for(const p of parts)p.geometry.dispose();return merged}
 const netMat=DECISIONS.players.map(p=>new THREE.MeshBasicMaterial({color:p.c,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 const dotMat={stay:null,cross:null};
 const routePath=(pos,via)=>{const seq=SS.routePaths(pos)[via];return[{x:G.nodes[pos].x,y:G.nodes[pos].y},...seq.map(s=>({x:G.nodes[s.to].x,y:G.nodes[s.to].y}))]};
 const dotTex=canvasTex(64,64,(ctx,w)=>{const g=ctx.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,w)});
 function networkEdges(view,pid){const out=[];const vp=view.players[pid];if(!vp)return out;for(const net of vp.networks){if(net.size<2)continue;const set=new Set(net.props);
   for(const j of SC.NODES.filter(n=>n.type==='junction').map(n=>n.id)){const near=x=>[SC.next(x),...SC.NODES.filter(n=>SC.next(n.id)===x).map(n=>n.id)];const around=[...near(j),...(SC.LINKS[j]?near(SC.LINKS[j]):[])];if(around.filter(x=>set.has(x)).length>=2){set.add(j);if(SC.LINKS[j])set.add(SC.LINKS[j])}}
   for(const a of set)for(const b of [SC.next(a),SC.LINKS[a]].filter(Boolean))if(set.has(b))out.push([a,b])}return out}
 // ---------- labels (DOM, crisp 12 pt; approved rules) ----------
 const labelLayer=document.createElement('div');labelLayer.className='c3-labels';labelLayer.setAttribute('aria-hidden','true');canvas.parentElement.appendChild(labelLayer);
 // ---------- camera + sizing ----------
 let W=1,Hh=1,scale=1;
 // Zoom (320 pt fallback): a uniform 2D magnification of the validated projection about `focus` (overview screen
 // coordinates), exactly SS.zoomed(); folded into the projection matrix so drawing, labels and taps agree.
 let zoom=null,Cview=null;
 function setZoom(z){zoom=z?{factor:z.factor,focus:{x:z.focus.x,y:z.focus.y}}:null;setCamera(camNow);if(lastModel)update(lastModel);dirty=true}
 function setCamera(c){camNow={pitch:c.pitch,dist:c.dist};C=SS.camera(G,camNow,rect);const p=camNow.pitch*Math.PI/180;
  camera.position.set(0,C.D*Math.cos(p),C.D*Math.sin(p));camera.up.set(0,Math.sin(p),-Math.cos(p));camera.lookAt(0,0,0);camera.updateMatrixWorld();
  let sc=C.scale,ox=C.ox,oy=C.oy;
  if(zoom){const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2,Z=SS.zoomed(C,zoom.factor,zoom.focus);sc=C.scale*zoom.factor;ox=cx+zoom.factor*(C.ox-zoom.focus.x);oy=cy+zoom.factor*(C.oy-zoom.focus.y);
   Cview={...C,project:Z.project,ppu:q=>C.ppu(q)*zoom.factor,scale:sc,ox,oy,zoom:{...zoom}}}else Cview=C;
  const A=2*sc/W,Ay=2*sc/Hh,Bx=2*(ox-rect.x)/W-1,By=1-2*(oy-rect.y)/Hh,n=C.D*.15,f=C.D*4;
  camera.projectionMatrix.set(A,0,-Bx,0, 0,Ay,-By,0, 0,0,-(f+n)/(f-n),-2*f*n/(f-n), 0,0,-1,0);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()}
 function resize(r){rect=r;W=Math.max(1,r.w);Hh=Math.max(1,r.h);const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,tier.maxScale*scaleK,Math.sqrt(4200000/(W*Hh))));renderer.setPixelRatio(dpr);renderer.setSize(W,Hh,false);setCamera(camNow);
  labelLayer.style.cssText=`position:fixed;left:${r.x}px;top:${r.y}px;width:${W}px;height:${Hh}px;pointer-events:none;overflow:hidden`}
 let scaleK=1;
 // ---------- frame model ----------
 let lastModel=null,glowSprites=[],dynMerged=null;
 function update(model){lastModel=model;const {view}=model,stages=model.stages||{};
  let changed=false;for(const n of view.nodes)if(n.type==='property'){const st=stages[n.id]??n.stage;if(tile[n.id].stage!==st||tile[n.id].owner!==n.owner){setBuilding(n.id,st,n.owner);changed=true}}
  if(changed||!dynMerged){disposeGroup(dynMerged);scene.updateMatrixWorld(true);const parts=[];
   for(const id of SC.PROPS){const rec=tile[id];for(const o of [rec.ownerRim,rec.plotSymbol,rec.baseSymbol,rec.seatBadge])if(o&&o.visible!==false&&(o!==rec.ownerRim||rec.owner>=0)&&(o!==rec.plotSymbol||rec.stage===0)&&(o!==rec.baseSymbol||rec.stage>0))parts.push(o);
    if(rec.building)rec.building.traverse(o=>{if(o.isMesh)parts.push(o)})}
   for(const o of parts)o.visible=true;dynMerged=mergeByMaterial(parts,{shadows:!!tier.shadows});scene.add(dynMerged);
   for(const o of parts){o.visible=false;if(o.userData.pick)o.userData.pickOnly=true}}
  // tokens (2×2 slots; hop arc while moving)
  const counts={};for(const t of tokens)t.visible=false;
  for(const tk of model.tokens){const slot=counts[tk.node]=(counts[tk.node]??-1)+1;const a=SS.tokenPoint(G,tk.node,slot%4);let x=a.x,y=a.y,z=G.tokenH/2+4.2;
   if(tk.to!=null){const b=SS.tokenPoint(G,tk.to,0);x=a.x+(b.x-a.x)*tk.k;y=a.y+(b.y-a.y)*tk.k;z+=Math.sin(Math.PI*tk.k)*T*.35}
   const g=tokens[tk.pid];g.position.set(x,z,y);g.visible=true}
  // overlays
  for(const c of [...overlay.children])disposeGroup(c);
  for(const pid of model.networkFor||[]){const c=DECISIONS.players[pid].c,mat=netMat[pid],parts=[];for(const [a,b] of networkEdges(view,pid)){const pa=G.nodes[a],pb=G.nodes[b];const off=(pid-1.5)*.9;parts.push(strip([{x:pa.x,y:pa.y+off},{x:pb.x,y:pb.y+off}],1.6,5.2,mat,false))}if(parts.length){overlay.add(mergeByMaterial(parts,{order:4}));for(const p of parts)p.geometry.dispose()}}
  if(model.route){const {pos,plan,preview}=model.route;for(const via of ['stay','cross']){const pts=routePath(pos,via),c=DECISIONS.routes[via];
    overlay.add(ribbon(pts,via===plan?6:5.2,5.6,DECISIONS.routes.casing,{dash:via==='cross'?[9,6]:null,order:5}));overlay.add(ribbon(pts,via===plan?3.4:2.8,5.8,c,{dash:via==='cross'?[9,6]:null,order:6}));
    if(preview){dotMat[via]=dotMat[via]||new THREE.MeshBasicMaterial({map:dotTex,color:c,transparent:true,opacity:.8,depthWrite:false});const parts=[];for(const l of preview[via].landing){const r=4+28*l.p,g=G.nodes[l.node];const m=new THREE.Mesh(new THREE.PlaneGeometry(r,r).rotateX(-Math.PI/2),dotMat[via]);m.position.set(g.x+(via==='cross'?3:-3),6,g.y+T*.18);parts.push(m)}overlay.add(mergeByMaterial(parts,{order:7}));for(const p of parts)p.geometry.dispose()}}}
  // glow on crowns and bridge lights (high tier)
  for(const s of glowSprites)scene.remove(s);glowSprites=[];
  // labels: undeveloped plots ID+price, junctions/events ID, developed none, hidden under tokens, only at the decision camera
  const occupied=new Set(model.tokens.map(t=>t.to==null?t.node:null).filter(Boolean));let html='';const lab=[];
  if(camNow.pitch===0&&!model.hideLabels)for(const n of view.nodes){const st=stages[n.id]??n.stage;if(occupied.has(n.id))continue;if(n.type==='property'&&st>0)continue;
   const p=Cview.project({...G.nodes[n.id],z:0}),t=T*Cview.ppu({...G.nodes[n.id],z:0}),text=n.type==='property'?`${n.id}<br>${n.price}`:n.id;
   const y=p.y-rect.y+t*.2;html+=`<span class="c3-l" data-id="${n.id}" style="left:${(p.x-rect.x).toFixed(1)}px;top:${y.toFixed(1)}px">${text}</span>`;lab.push(n.id)}
  labelLayer.innerHTML=html;labelLayer.dataset.labels=lab.join(',');dirty=true}
 // ---------- render ----------
 let dirty=true,t0=0;const frames=[];
 function render(now=performance.now()){if(tier.water){waterTex.offset.x=(now/60000)%1;waterTex.offset.y=(now/90000)%1;dirty=true}
  if(!dirty)return false;const a=performance.now();renderer.render(scene,camera);dirty=false;frames.push(performance.now()-a);if(frames.length>240)frames.shift();return true}
 // ---------- adaptive quality ----------
 // Evaluated on time, not frame count, so a very slow device still adapts quickly: every 2 s window (≥ 3 frames; gaps over 5 s, e.g. a hidden tab, are ignored) with
 // p95 frame interval over 20 ms counts as over budget; two in a row drop one tier (then render scale on Low).
 const frameIntervals=[];let lastTick=0,overBudget=0,windowStart=0;
 function tick(now){if(lastTick&&now-lastTick<5000)frameIntervals.push(now-lastTick);lastTick=now;if(!windowStart)windowStart=now;
  if(now-windowStart>=2000&&frameIntervals.length>=3){const s=[...frameIntervals].sort((a,b)=>a-b),p95=s[Math.floor(s.length*.95)];if(p95>20){overBudget++;if(overBudget>=2)downgrade()}else overBudget=0;frameIntervals.length=0;windowStart=now}}
 function downgrade(){const order=['high','medium','low'],i=order.indexOf(tierName);overBudget=0;if(i<0||i>=2){if(scaleK>.75){scaleK-=.25;resize(rect)}return}
  tierName=order[i+1];tier=TIERS[tierName];renderer.shadowMap.enabled=!!tier.shadows;sun.castShadow=!!tier.shadows;scene.traverse(o=>{if(o.isInstancedMesh)o.visible=!!tier.trees;if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true});
  for(const s of glowSprites)s.visible=tier.glow;resize(rect);if(lastModel)update(lastModel);onTierChange&&onTierChange(tierName)}
 // ---------- measurement hooks (tests): identical projection, envelope containment, ID-pass visibility ----------
 function projectNode(id,z=0){const v=V(G.nodes[id].x,G.nodes[id].y,z).project(camera);return{x:rect.x+(v.x+1)/2*W,y:rect.y+(1-v.y)/2*Hh}}
 function envelopeReport(){const out=[];for(const id of SC.PROPS){const rec=tile[id];if(!rec.building)continue;const bb=new THREE.Box3().setFromObject(rec.building);
   // compare in the tile's local frame: transform the building's local bounds
   const loc=new THREE.Box3();rec.building.updateMatrixWorld(true);rec.building.traverse(o=>{if(o.isMesh&&o.userData.envelope){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(rec.grp.matrixWorld).invert(),o.matrixWorld));loc.union(b)}});
   out.push({id,stage:rec.stage,halfX:+Math.max(-loc.min.x,loc.max.x).toFixed(3),halfZ:+Math.max(-loc.min.z,loc.max.z).toFixed(3),top:+loc.max.y.toFixed(3),maxHalf:+(S/2).toFixed(3),maxTop:+H[rec.stage].toFixed(3)})}return out}
 function isLive(o){let p=o;while(p){if(p===scene)return true;p=p.parent}return false}
 function idPass(points){const rt=new THREE.WebGLRenderTarget(W,Hh);const saved=[],hidden=[],reHide=[];
  scene.traverse(o=>{if(o.isMesh||o.isSprite||o.isInstancedMesh){const p=o.userData.pick;const proxy=o.userData.pickOnly&&isLive(o);if(p&&(o.visible||proxy)){if(proxy){o.visible=true;reHide.push(o)}saved.push([o,o.material]);o.material=new THREE.MeshBasicMaterial({color:new THREE.Color(p.kind/255,(p.i+1)/255,0)})}else if(o.visible){hidden.push(o);o.visible=false}}});
  const pr=renderer.getPixelRatio(),tm=renderer.toneMapping,cs=renderer.outputColorSpace,cc=renderer.getClearColor(new THREE.Color());renderer.setPixelRatio(1);renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.setClearColor(0x000000);
  renderer.setRenderTarget(rt);renderer.render(scene,camera);const px=new Uint8Array(4);const res=points.map(pt=>{const x=Math.round(pt.x-rect.x),y=Math.round(Hh-(pt.y-rect.y));if(x<0||y<0||x>=W||y>=Hh)return null;renderer.readRenderTargetPixels(rt,x,y,1,1,px);return{kind:px[0],i:px[1]-1}});
  renderer.setRenderTarget(null);for(const [o,m] of saved){o.material.dispose();o.material=m}for(const o of hidden)o.visible=true;for(const o of reHide)o.visible=false;renderer.setPixelRatio(pr);renderer.toneMapping=tm;renderer.outputColorSpace=cs;renderer.setClearColor(cc);rt.dispose();dirty=true;return res}
 function routeSamples(pos){const out={};for(const via of ['stay','cross']){const pts=routePath(pos,via),res=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];for(const k of [.3,.5,.7]){const q={x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,z:5.8};res.push(Cview.project(q))}}out[via]=res}return out}
 function stats(){return{tier:tierName,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio(),frameMs:frames.slice(-60)}}
 return{resize,setCamera,update,render,tick,routeSamples,get tier(){return tierName},get camera(){return camNow},get C(){return Cview},get baseC(){return C},setZoom,get zoom(){return zoom},G,projectNode,envelopeReport,idPass,stats,downgrade,renderer,labelLayer,markDirty:()=>{dirty=true}}}
