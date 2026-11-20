/* City Ventures — The Living Market: 3D board (Career Board 2, owner design package 20 Nov 2026).
   The approved board artwork is the plaza/centre surface; the 37 spaces, six corner badges, buildings and tokens
   are real 3D objects built from board_topology_37_tiles.json (correct names, CC prices). Close follow camera per
   camera_spec.json: ~46° pitch, critically damped, eases round the hex corners, pinch zoom, drag to look around. */
import * as THREE from './lib/three.module.min.js';

const ART='./assets/city-ventures/board-art.jpg';
// Corner badge centres in the approved 1254 px artwork (START bottom, then clockwise as indexed).
const CORNER_PX=[[627,1100],[1112,905],[1112,342],[627,142],[142,342],[142,905]];
const CORNER_TILES=[0,6,13,19,25,31];
const toWorld=([x,y])=>new THREE.Vector3((x-627)/100,0,(y-627)/100);
const CORNER_COLORS={0:'#0b4a8f',6:'#0b8aa3',13:'#17834f',19:'#a71d3a',25:'#1d5f9c',31:'#6a2a9c'};
const CORNER_ICON={0:'➜',6:'🛋',13:'🏛',19:'📈',25:'🔁',31:'🚆'};
const TYPE_ICON={event:'🃏',transit:'🚆',utility:'⚡',tax:'💰',fee:'🧾'};
const UTIL_ICON={'power-grid':'⚡','water-works':'💧','city-works':'⚙'};
export const PLAYER_COLORS=['#e85d5d','#3f8fe0','#f1c32c','#4cbf6b'];

function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrap(g,text,x,y,maxW,lh){const words=String(text).split(' ');let line='',lines=[];for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t}lines.push(line);lines.forEach((l,k)=>g.fillText(l,x,y+k*lh));return lines.length}

function tileTexture(t,colors,renderer){
 const W=300,H=620,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.fillStyle='#f6efdc';g.fillRect(0,0,W,H);
 const band=t.district?colors[t.district]:null;
 if(band){g.fillStyle=band;g.fillRect(0,0,W,150);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,0,W,20)}
 else{g.fillStyle='#e7dcc0';g.fillRect(0,0,W,110)}
 g.strokeStyle='#c9a24d';g.lineWidth=10;g.strokeRect(5,5,W-10,H-10);
 g.fillStyle='#1d2433';g.textAlign='center';g.textBaseline='alphabetic';
 const icon=t.type==='property'?'🏢':t.type==='utility'?(UTIL_ICON[t.id]||'⚡'):TYPE_ICON[t.type]||'';
 g.font='92px "Apple Color Emoji","Segoe UI Emoji",sans-serif';g.fillText(icon,W/2,band?118:96);
 const label=t.type==='event'?'Opportunity':t.name;
 g.font='800 50px -apple-system,"SF Pro Display",Inter,Arial,sans-serif';const lines=wrap(g,label,W/2,240,W-36,54);
 g.font='600 34px -apple-system,Inter,Arial,sans-serif';g.fillStyle='#4b5568';
 const sub=t.type==='transit'?'Transit':t.type==='utility'?'Utility':t.type==='tax'?'Tax':t.type==='fee'?'Fee':t.type==='event'?'Draw a card':'';
 if(sub)g.fillText(sub,W/2,240+lines*54+20);
 g.fillStyle='#1d2433';g.font='800 46px -apple-system,Inter,Arial,sans-serif';
 const price=t.price?t.price+' CC':t.charge?'Pay '+t.charge+' CC':'';if(price)g.fillText(price,W/2,H-46);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex}
function badgeTexture(t,renderer){
 const S=640,c=document.createElement('canvas');c.width=S;c.height=S;const g=c.getContext('2d');
 g.beginPath();for(let k=0;k<6;k++){const a=Math.PI/3*k;const x=S/2+Math.cos(a)*S*.5,y=S/2+Math.sin(a)*S*.5;k?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.clip();
 g.fillStyle=CORNER_COLORS[t.i];g.fillRect(0,0,S,S);
 const grd=g.createRadialGradient(S/2,S/2-40,40,S/2,S/2,S/2);grd.addColorStop(0,'rgba(255,255,255,.22)');grd.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=grd;g.fillRect(0,0,S,S);
 g.textAlign='center';g.fillStyle='#fff';g.font='96px "Apple Color Emoji","Segoe UI Emoji",sans-serif';g.fillText(CORNER_ICON[t.i],S/2,215);
 g.font='900 80px Georgia,"Times New Roman",serif';const words=t.name.toUpperCase().split(' ');
 g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=8;words.forEach((w,k)=>{const y=330+k*84;g.strokeText(w,S/2,y);g.fillStyle='#fff';g.fillText(w,S/2,y)});
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex}
function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#5a3a22';g.fillRect(0,0,512,512);
 for(let i=0;i<140;i++){g.strokeStyle=`rgba(${30+Math.random()*40|0},${18+Math.random()*20|0},${8},${.12+Math.random()*.2})`;g.lineWidth=1+Math.random()*3;g.beginPath();const y=Math.random()*512;g.moveTo(0,y);g.bezierCurveTo(170,y+Math.random()*20-10,340,y+Math.random()*20-10,512,y);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.colorSpace=THREE.SRGBColorSpace;return t}
function windowTexture(){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,64,128);g.fillStyle='#9fb6cf';
 for(let y=8;y<128;y+=16)for(let x=6;x<64;x+=14)g.fillRect(x,y,8,9);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}

export function createCityVenturesRenderer(canvas,{rules,onTile}={}){
 const CV=rules,TILES=CV.TILES;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let dpr=Math.min(devicePixelRatio||1,2.5);renderer.setPixelRatio(dpr);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#1a120c');scene.fog=new THREE.Fog('#1a120c',26,60);
 const camera=new THREE.PerspectiveCamera(40,1,.1,200);
 scene.add(new THREE.HemisphereLight('#fff4e0','#3a2a1a',1.25));
 const sun=new THREE.DirectionalLight('#ffe2b0',2.1);sun.position.set(-6,14,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});sun.shadow.bias=-.0006;scene.add(sun);
 const lamp=new THREE.PointLight('#ffb866',18,22,1.6);lamp.position.set(7,6,-6);scene.add(lamp);
 // table
 const table=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.75,metalness:0}));table.rotation.x=-Math.PI/2;table.position.y=-.32;table.receiveShadow=true;scene.add(table);

 // ---- board geometry from the approved art ----
 const corners=CORNER_PX.map(toWorld),center=new THREE.Vector3(0,0,0);
 const outline=corners.map(v=>v.clone().add(v.clone().setY(0).normalize().multiplyScalar(.95)));
 const shape=new THREE.Shape();outline.forEach((v,k)=>k?shape.lineTo(v.x,-v.z):shape.moveTo(v.x,-v.z));shape.closePath();
 const gold=new THREE.MeshStandardMaterial({color:'#d9a94a',metalness:.35,roughness:.38,emissive:'#3a2508',emissiveIntensity:.25});
 const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelThickness:.08,bevelSize:.14,bevelSegments:3}),gold);frame.rotation.x=-Math.PI/2;frame.position.y=-.47;frame.castShadow=true;frame.receiveShadow=true;scene.add(frame);
 const artTex=new THREE.TextureLoader().load(ART,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();dirty=true});
 const topGeo=new THREE.ShapeGeometry(shape);{const pos=topGeo.attributes.position,uv=topGeo.attributes.uv;for(let k=0;k<pos.count;k++){const x=pos.getX(k),z=-pos.getY(k);uv.setXY(k,(x*100+627)/1254,1-(z*100+627)/1254)}uv.needsUpdate=true}
 const top=new THREE.Mesh(topGeo,new THREE.MeshStandardMaterial({map:artTex,roughness:.85}));top.rotation.x=-Math.PI/2;top.position.y=.005;top.receiveShadow=true;scene.add(top);

 // ---- spaces ----
 const tileMeshes=[],tileInfo=[],pick=[];
 const sides=[[0,6],[6,13],[13,19],[19,25],[25,31],[31,37]];
 const BADGE=1.0,DEPTH=1.28;
 sides.forEach(([a,b],k)=>{const A=corners[k],B=corners[(k+1)%6],L=A.distanceTo(B),dir=B.clone().sub(A).normalize(),n=b-a-1,r=BADGE/L;
  const mid=A.clone().add(B).multiplyScalar(.5),inward=center.clone().sub(mid).setY(0).normalize();
  // make inward perpendicular to the side
  const perp=new THREE.Vector3(-dir.z,0,dir.x);if(perp.dot(inward)<0)perp.negate();
  for(let j=0;j<n;j++){const i=a+1+j,t=TILES[i],f=r+(j+.5)*(1-2*r)/n,pos=A.clone().lerp(B,f),w=(1-2*r)*L/n*.95;
   const grp=new THREE.Group();grp.position.copy(pos);grp.rotation.y=Math.atan2(-perp.x,-perp.z);
   const body=new THREE.Mesh(new THREE.BoxGeometry(w,.12,DEPTH),new THREE.MeshStandardMaterial({color:'#efe4c8',roughness:.7}));body.position.y=.06;body.castShadow=true;body.receiveShadow=true;grp.add(body);
   const face=new THREE.Mesh(new THREE.PlaneGeometry(w*.96,DEPTH*.97),new THREE.MeshStandardMaterial({map:tileTexture(t,CV.DISTRICT_COLORS,renderer),roughness:.62}));face.rotation.x=-Math.PI/2;face.position.y=.122;face.receiveShadow=true;grp.add(face);
   const ring=new THREE.Mesh(new THREE.BoxGeometry(w*1.06,.1,DEPTH*1.04),new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#000',roughness:.4}));ring.position.y=.03;ring.visible=false;grp.add(ring);
   const glow=new THREE.Mesh(new THREE.PlaneGeometry(w*1.02,DEPTH*1.02),new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:0,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.125;grp.add(glow);
   scene.add(grp);body.userData.tile=i;face.userData.tile=i;pick.push(body,face);
   const inner=pos.clone().add(perp.clone().multiplyScalar(DEPTH*.28)),outer=pos.clone().add(perp.clone().multiplyScalar(-DEPTH*.2));
   tileMeshes[i]={grp,face,ring,glow,building:null};tileInfo[i]={pos,inner,outer,perp,dir,w}}
 });
 CORNER_TILES.forEach((i,k)=>{const t=TILES[i],P=corners[k],grp=new THREE.Group();grp.position.copy(P);const inward=center.clone().sub(P).setY(0).normalize();grp.rotation.y=Math.atan2(-inward.x,-inward.z);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.18,.2,6),gold);rim.position.y=.1;rim.rotation.y=Math.PI/2;rim.castShadow=true;grp.add(rim);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.26,6),new THREE.MeshStandardMaterial({color:CORNER_COLORS[i],roughness:.45}));cap.position.y=.2;cap.rotation.y=Math.PI/2;cap.castShadow=true;grp.add(cap);
  // label: flat plane whose canvas top points to the board centre, so it reads upright from outside
  const label=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),new THREE.MeshStandardMaterial({map:badgeTexture(t,renderer),transparent:true,alphaTest:.05,roughness:.45}));label.rotation.x=-Math.PI/2;label.position.y=.335;grp.add(label);label.userData.tile=i;pick.push(label);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.25,6),new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:0,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.36;grp.add(glow);
  scene.add(grp);cap.userData.tile=i;pick.push(cap);
  tileMeshes[i]={grp,glow,cap};tileInfo[i]={pos:P.clone(),inner:P.clone().add(inward.clone().multiplyScalar(.2)),outer:P.clone(),perp:inward,dir:new THREE.Vector3(-inward.z,0,inward.x),w:1.6}});

 // ---- buildings ----
 const winTex=windowTexture();
 function building(stage,color){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color,map:winTex,roughness:.55,metalness:.05}),roof=new THREE.MeshStandardMaterial({color:'#e9d7a6',roughness:.5,metalness:.4});
  if(stage===0){const s=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.32),roof);s.position.y=.16;const f=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.02),new THREE.MeshStandardMaterial({color}));f.position.set(.1,.27,0);g.add(s,f);return g}
  const h=[0,.3,.62,1.05][stage],w=stage===3?.3:.34;const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);b.position.y=h/2;b.castShadow=true;g.add(b);
  if(stage===1){const r=new THREE.Mesh(new THREE.ConeGeometry(w*.78,.16,4),roof);r.rotation.y=Math.PI/4;r.position.y=h+.08;g.add(r)}
  if(stage>=2){const t=new THREE.Mesh(new THREE.BoxGeometry(w*.7,.12,w*.7),m);t.position.y=h+.06;g.add(t)}
  if(stage===3){const sp=new THREE.Mesh(new THREE.ConeGeometry(.06,.36,8),roof);sp.position.y=h+.3;const crown=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,16),roof);crown.rotation.x=Math.PI/2;crown.position.y=h+.13;g.add(sp,crown)}
  return g}

 // ---- tokens ----
 const tokens=[];
 function makeToken(color,kind){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.45}),dark=new THREE.MeshStandardMaterial({color:'#20242c',roughness:.5}),chrome=new THREE.MeshStandardMaterial({color:'#e8e2d0',metalness:.9,roughness:.2});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.24,.27,.06,32),chrome);base.position.y=.03;g.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.03,8,32),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4}));ring.rotation.x=Math.PI/2;ring.position.y=.05;g.add(ring);
  if(kind==='car'){const b=new THREE.Mesh(new THREE.BoxGeometry(.42,.13,.22),m);b.position.y=.15;const c=new THREE.Mesh(new THREE.BoxGeometry(.22,.1,.2),m);c.position.set(-.02,.26,0);g.add(b,c);for(const [x,z]of[[.13,.11],[-.13,.11],[.13,-.11],[-.13,-.11]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.04,12),dark);w.rotation.x=Math.PI/2;w.position.set(x,.1,z);g.add(w)}}
  else if(kind==='boat'){const h=new THREE.Mesh(new THREE.CylinderGeometry(.06,.2,.14,4,1),m);h.scale.set(2,1,.8);h.rotation.y=Math.PI/4;h.position.y=.14;const mast=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.4),chrome);mast.position.y=.38;const sail=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,3),new THREE.MeshStandardMaterial({color:'#fffaf0'}));sail.position.set(.06,.38,0);g.add(h,mast,sail)}
  else if(kind==='plane'){const f=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.36,4,10),m);f.rotation.z=Math.PI/2;f.position.y=.22;const w=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,.5),m);w.position.y=.22;const t=new THREE.Mesh(new THREE.BoxGeometry(.06,.14,.02),m);t.position.set(-.2,.3,0);g.add(f,w,t)}
  else{const b=new THREE.Mesh(new THREE.BoxGeometry(.38,.18,.2),m);b.position.y=.17;const c=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.14),dark);c.position.set(.12,.33,0);const cab=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,.2),m);cab.position.set(-.12,.32,0);g.add(b,c,cab)}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});g.scale.setScalar(1.25);return g}
 function slot(i,pid,count){const T=tileInfo[i];const off=count>1?[[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]][pid]:[0,0];return T.outer.clone().add(T.dir.clone().multiplyScalar(off[0])).add(T.perp.clone().multiplyScalar(off[1]))}

 // ---- camera ----
 const cam={target:new THREE.Vector3(0,0,1),yaw:0,pitch:THREE.MathUtils.degToRad(46),dist:6.2},goal={target:new THREE.Vector3(0,0,1),yaw:0,pitch:cam.pitch,dist:6.2};
 let pinned=false,frameBias=.2,mode='follow',followPid=0,userZoom=1,userYaw=0,pushIn=1,dirty=true,lastT=performance.now();
 function yawFor(p){return Math.atan2(p.x,p.z)}
 function overviewGoal(){goal.target.set(0,0,.85);goal.yaw=0;goal.pitch=THREE.MathUtils.degToRad(57);const a=camera.aspect||1.9;goal.dist=Math.max(13.5,13.5*1.55/a)*1.02}
 function followGoal(p){const pos=p.clone();const out=pos.clone().setY(0).normalize();goal.target.copy(pos.clone().add(out.multiplyScalar(frameBias)));goal.yaw=yawFor(pos)+userYaw;goal.pitch=THREE.MathUtils.degToRad(46);goal.dist=6.2*userZoom/pushIn}
 function angleLerp(a,b,t){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t}
 function applyCam(dt){const k=reduceMotion.matches?1:1-Math.exp(-dt/.18);cam.target.lerp(goal.target,k);cam.yaw=angleLerp(cam.yaw,goal.yaw,k);cam.pitch+=(goal.pitch-cam.pitch)*k;cam.dist+=(goal.dist-cam.dist)*k;
  const c=Math.cos(cam.pitch)*cam.dist;camera.position.set(cam.target.x+Math.sin(cam.yaw)*c,cam.target.y+Math.sin(cam.pitch)*cam.dist,cam.target.z+Math.cos(cam.yaw)*c);camera.lookAt(cam.target)}

 // ---- state sync ----
 let view=null,moving=false;const effects={market:null,civic:null,highlight:null};
 function sync(v){view=v;
  v.players.forEach((p,k)=>{if(!tokens[k]){const t=makeToken(p.color||PLAYER_COLORS[k],p.token||['car','boat','plane','train'][k]);scene.add(t);tokens[k]={g:t,tile:p.pos}}
   tokens[k].g.visible=!p.out;if(!moving||tokens[k].tile===p.pos){tokens[k].tile=p.pos}});
  if(!moving)placeTokens();
  v.own.forEach((o,i)=>{const T=tileMeshes[i];if(!T||!T.ring)return;const key=o?o.owner+':'+o.stage+':'+(o.mortgaged?1:0):'';if(T.key===key)return;T.key=key;
   if(T.building){T.grp.remove(T.building);T.building=null}
   if(o){T.ring.visible=true;T.ring.material.color.set(v.players[o.owner].color||PLAYER_COLORS[o.owner]);T.ring.material.emissive.set(v.players[o.owner].color||PLAYER_COLORS[o.owner]);T.ring.material.emissiveIntensity=.35;
    if(TILES[i].type==='property'){const b=building(o.stage,CV.DISTRICT_COLORS[TILES[i].district]);b.position.set(0,.12,-DEPTH*.3);T.grp.add(b);T.building=b}
    T.face.material.color.set(o.mortgaged?'#8a8a8a':'#ffffff')}else{T.ring.visible=false;T.face.material.color.set('#ffffff')}});
  effects.market=v.market;effects.civic=v.civic;dirty=true}
 function placeTokens(){const counts={};tokens.forEach((t,k)=>{if(t&&view.players[k]&&!view.players[k].out)counts[t.tile]=(counts[t.tile]||0)+1});
  tokens.forEach((t,k)=>{if(!t)return;const p=slot(t.tile,k,counts[t.tile]);t.g.position.set(p.x,.13,p.z);t.g.rotation.y=Math.atan2(tileInfo[t.tile].dir.x,tileInfo[t.tile].dir.z)-Math.PI/2});dirty=true}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function moveToken(pid,path,{express=false}={}){const t=tokens[pid];if(!t||!path.length)return;moving=true;followPid=pid;if(mode==='follow')pushIn=1;
  if(pinned)overviewGoal();
  const step=reduceMotion.matches?0:express?110:230;
  for(const i of path){const from=t.g.position.clone(),to=slot(i,pid,1);const t0=performance.now();
   if(step){await new Promise(res=>{const tick=()=>{const k=Math.min(1,(performance.now()-t0)/step);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;t.g.position.lerpVectors(from,to,e);t.g.position.y=.13+Math.sin(Math.PI*k)*.35;
     const ahead=tileInfo[i].outer.clone();if(mode==='follow')followGoal(t.g.position.clone().lerp(ahead,.6));t.g.rotation.y=Math.atan2(to.x-from.x,to.z-from.z)-Math.PI/2;dirty=true;if(k<1)requestAnimationFrame(tick);else res()};tick()})}
   t.tile=i}
  moving=false;placeTokens();if(mode==='follow'){pushIn=1.13;followGoal(tileInfo[t.tile].pos)}await wait(reduceMotion.matches?0:220)}
 function follow(pid){followPid=pid;if(pinned){dirty=true;return}mode='follow';userYaw=0;pushIn=1;const t=tokens[pid];if(t)followGoal(tileInfo[t.tile].pos);dirty=true}
 function focusTile(i){if(pinned){highlight(i);return}mode='follow';pushIn=1.13;followGoal(tileInfo[i].pos);highlight(i);dirty=true}
 function overview(on=true){pinned=on;mode=on?'overview':'follow';if(on)overviewGoal();else follow(followPid);dirty=true}
 function highlight(i){effects.highlight=i;dirty=true}

 // ---- input: tap, drag to look around, pinch zoom ----
 const pointers=new Map();let dragStart=null,pinch0=null,moved=false;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;dragStart={x:e.clientX,y:e.clientY,yaw:userYaw};
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),z:userZoom}}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch0){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);userZoom=THREE.MathUtils.clamp(pinch0.z*pinch0.d/Math.max(20,d),.75,1.4);moved=true;refreshGoal();return}
  if(dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>8){moved=true;if(mode==='follow'){userYaw=dragStart.yaw-(e.clientX-dragStart.x)*.006;refreshGoal()}else{goal.yaw=-(e.clientX-dragStart.x)*.004;}}});
 const up=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch0=null;if(!moved&&e.type==='pointerup'&&pointers.size===0)tap(e);if(!pointers.size)dragStart=null};
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',e=>{e.preventDefault();userZoom=THREE.MathUtils.clamp(userZoom*(e.deltaY>0?1.08:.93),.75,1.4);refreshGoal()},{passive:false});
 function refreshGoal(){if(mode==='follow'){const t=tokens[followPid];if(t)followGoal(tileInfo[t.tile].pos)}else{overviewGoal();goal.dist*=userZoom}dirty=true}
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 function tap(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects(pick,false)[0];if(hit&&onTile){highlight(hit.object.userData.tile);onTile(hit.object.userData.tile)}}

 // ---- loop ----
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='overview')overviewGoal();dirty=true}
 addEventListener('resize',resize);visualViewport&&visualViewport.addEventListener('resize',resize);
 let frames=0,fpsT=performance.now(),running=true;
 function loop(now){if(!running)return;requestAnimationFrame(loop);const dt=Math.min(.1,(now-lastT)/1000);lastT=now;
  applyCam(dt);
  const pulse=.5+.5*Math.sin(now/300);
  tileMeshes.forEach((T,i)=>{if(!T)return;let op=0,col='#ffd36b';
   if(effects.market&&TILES[i].district===effects.market.district){op=.22+.2*pulse;col=effects.market.type==='boom'?'#ff9a3c':'#5ab8ff'}
   if(effects.highlight===i){op=Math.max(op,.35+.25*pulse);col='#ffe28a'}
   if(effects.civic&&i===13){op=Math.max(op,.25+.2*pulse);col='#59e39a'}
   if(effects.market&&i===19){op=Math.max(op,.2+.2*pulse);col=effects.market.type==='boom'?'#ff9a3c':'#5ab8ff'}
   T.glow.material.opacity=op;T.glow.material.color.set(col)});
  tokens.forEach((t,k)=>{if(!t)return;const on=view&&view.turn&&view.turn.pid===k;const r=t.g.children[1];if(r&&r.material)r.material.emissiveIntensity=on?.6+.6*pulse:.25});
  renderer.render(scene,camera);
  frames++;if(now-fpsT>3000){const fps=frames*1000/(now-fpsT);frames=0;fpsT=now;if(fps<38&&dpr>1.4){dpr=Math.max(1.25,dpr-.4);renderer.setPixelRatio(dpr);resize()}}}
 resize();overviewGoal();Object.assign(cam,{target:goal.target.clone(),yaw:goal.yaw,pitch:goal.pitch,dist:goal.dist});requestAnimationFrame(loop);
 return{setFrameBias(v){frameBias=v;refreshGoal()},sync,moveToken,follow,focusTile,overview,highlight,resize,tileScreen:i=>{const v=tileInfo[i].pos.clone().project(camera);const r=canvas.getBoundingClientRect();return{x:(v.x+1)/2*r.width+r.left,y:(1-v.y)/2*r.height+r.top}},
  stats:()=>({dpr,mode,zoom:userZoom,camDist:cam.dist,tiles:tileMeshes.filter(Boolean).length,tokens:tokens.length}),mode:()=>mode,dispose(){running=false;renderer.dispose()}}}
