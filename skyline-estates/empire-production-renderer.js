/* Skyline Empire — Board 4 interactive 3D renderer (PROTOTYPE, local review only).
   Presentation only: ownership, stages, market, tower progress and victory come from SkylineEmpire.view(state).
   Assets: Claude's supplied Empire pack in ./assets/empire-local/ (excluded from git; see EMPIRE-3D.md);
   stage models from the committed ./assets/approved-v5/buildings/. */
import * as THREE from './lib/three.module.min.js';
import {GLTFLoader} from './lib/GLTFLoader.js';
import {createWaterReflections} from './presentation/local-water-reflections.js';
import {fitToFree} from './presentation/board-camera-fit.js';

const E=window.SkylineEmpire;
export const PLAYER_COLORS=['#FF7A59','#4C9DFF','#F4E7C2','#D45CE0'];
export const PLAYER_SHAPES=['cone','cube','cylinder','octahedron'];
const STAGE_FILES=['dev_0_lot','dev_1_midrise_L1','dev_2_midrise_L2','dev_4_highrise_L4','dev_5_skyscraper_L5'];
const TIERS={low:{dpr:1.5,shadows:false,city:false,reflections:false},medium:{dpr:2,shadows:true,city:false,reflections:false},high:{dpr:3,shadows:true,city:true,reflections:true}};
const TOWER=new THREE.Vector3(0,.3,-.6),TOWER_SCALE=1.25,TOWER_H=10*TOWER_SCALE;

export async function createEmpireRenderer(canvas,{quality='high',onPick=()=>{}}={}){
 const tier=TIERS[quality]||TIERS.high,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,500);
 scene.background=new THREE.Color('#0a1530');scene.fog=new THREE.Fog('#3a3456',60,170);
 const makeRenderer=()=>{const r=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.02;
  r.localClippingEnabled=true;r.shadowMap.enabled=tier.shadows;r.shadowMap.type=THREE.PCFSoftShadowMap;r.shadowMap.autoUpdate=false;r.shadowMap.needsUpdate=true;return r};
 let renderer=makeRenderer(),lost=false;
 const hemi=new THREE.HemisphereLight('#c9d4f2','#6b4a2e',.75),sun=new THREE.DirectionalLight('#ffc98a',3.1),fill=new THREE.DirectionalLight('#9fb4ec',.9);
 sun.position.set(20,16,24);fill.position.set(-16,20,-14);sun.castShadow=tier.shadows;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:90});sun.shadow.normalBias=.03;scene.add(hemi,sun,fill);
 const sky=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);for(const[p,col]of[[0,'#141d44'],[.45,'#5d5280'],[.6,'#f8ae6a'],[1,'#1a2036']])gr.addColorStop(p,col);g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
 const envScene=new THREE.Scene();envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100,32,16),new THREE.MeshBasicMaterial({map:sky,side:THREE.BackSide})));
 const buildEnv=()=>{const pm=new THREE.PMREMGenerator(renderer),rt=pm.fromScene(envScene,.04);pm.dispose();scene.environment=rt.texture};buildEnv();

 const loader=new GLTFLoader(),materials=new Map(),audit={files:[],triangles:{}};
 const share=(m,file)=>{if(!m.normalMap||!m.aoMap||!m.roughnessMap||!m.metalnessMap)throw Error(`Incomplete PBR material ${m.name} in ${file}`);if(materials.has(m.name))return materials.get(m.name);
  m.envMapIntensity=.9;if(m.emissiveMap)m.emissiveIntensity=.85;for(const k of ['map','normalMap','aoMap','roughnessMap','metalnessMap','emissiveMap'])if(m[k])m[k].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());materials.set(m.name,m);return m};
 async function load(url,file,{own=false}={}){const g=await loader.loadAsync(url);let tris=0;g.scene.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes;if(!a.normal||!a.uv)throw Error('Missing normals/UVs in '+file);
  const f=m=>{if(own){share(m,file);const c=m.clone();c.name=m.name;return c}return share(m,file)};o.material=Array.isArray(o.material)?o.material.map(f):f(o.material);o.castShadow=o.receiveShadow=true;tris+=(o.geometry.index?o.geometry.index.count:a.position.count)/3});
  audit.files.push(file);audit.triangles[file]=Math.round(tris);return g.scene}
 const local=f=>new URL('./assets/empire-local/'+f,import.meta.url).href,shared=f=>new URL('./assets/approved-v5/'+f,import.meta.url).href;
 const layout=await (await fetch(local('layouts/empire_44.json'))).json();
 const POS={},YAW={};for(const sp of layout.spaces){POS['E'+sp.index]=new THREE.Vector3(...sp.position);YAW['E'+sp.index]=sp.yaw}
 const board=await load(local('boards/board_empire_44.glb'),'board_empire_44.glb');
 // The supplied board bakes a finished Empire Tower in. Remove those triangles (above the islet plinth, inside the moat) so the
 // landmark shown always follows the real funded stage (handoff §2.4). Everything else in the board is untouched.
 let removed=0;board.traverse(o=>{if(!o.isMesh||!o.geometry.index)return;const p=o.geometry.attributes.position,idx=o.geometry.index.array,keep=[];
  for(let i=0;i<idx.length;i+=3){let inside=true;for(let k=0;k<3;k++){const v=idx[i+k],x=p.getX(v),y=p.getY(v),z=p.getZ(v);if(!(Math.hypot(x-TOWER.x,z-TOWER.z)<2.1&&y>.62)){inside=false;break}}if(!inside)keep.push(idx[i],idx[i+1],idx[i+2]);else removed++}
  if(keep.length<idx.length){o.geometry.setIndex(keep)}});audit.towerTrianglesRemoved=removed;scene.add(board);
 let city=null;if(tier.city){city=await load(local('environments/empire_bay_skyline.glb'),'empire_bay_skyline.glb');scene.add(city)}
 const stageModels=await Promise.all(STAGE_FILES.map(f=>load(shared('buildings/'+f+'.glb'),f+'.glb')));
 // Empire Tower: the supplied landmark with its own cloned materials, clipped to the funded height; crane + scaffold while incomplete.
 const tower=await load(local('landmarks/empire_tower.glb'),'empire_tower.glb',{own:true});tower.scale.setScalar(TOWER_SCALE);tower.position.copy(TOWER);scene.add(tower);
 const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),0);tower.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))m.clippingPlanes=[clip]});
 const crane=await load(local('props/tower_crane.glb'),'tower_crane.glb');crane.scale.setScalar(1.4);crane.position.set(TOWER.x+1.7,TOWER.y,TOWER.z+.6);crane.rotation.y=-2.2;scene.add(crane);
 const scaffold=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.5,8,1,true),new THREE.MeshStandardMaterial({color:'#c8a050',wireframe:true,metalness:.6,roughness:.5}));scene.add(scaffold);
 const water=createWaterReflections({scene,camera,getRenderer:()=>renderer,enabled:tier.reflections&&!!city,maxWidth:768,getExclusions:()=>[dynamic]});water.register(board);if(city)water.register(city);

 const dynamic=new THREE.Group();scene.add(dynamic);
 const hitGeo=new THREE.BoxGeometry(1.25,.4,1.25),ringGeo=new THREE.TorusGeometry(.5,.04,8,40),ownerMats=PLAYER_COLORS.map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.55,metalness:.3,roughness:.35}));
 const hit=new THREE.Group(),rings={},stagesAt={},tokens=[];dynamic.add(hit);
 for(const n of E.NODES){const m=new THREE.Mesh(hitGeo,new THREE.MeshBasicMaterial({visible:false}));m.position.copy(POS[n.id]);m.rotation.y=YAW[n.id];m.userData.id=n.id;hit.add(m);
  if(n.type==='property'){const r=new THREE.Mesh(ringGeo,ownerMats[0]);r.rotation.x=-Math.PI/2;r.position.copy(POS[n.id]).add(new THREE.Vector3(0,.03,0));r.visible=false;dynamic.add(r);rings[n.id]=r}}
 const sel=new THREE.Mesh(new THREE.RingGeometry(.58,.7,4),new THREE.MeshBasicMaterial({color:'#ffe29c',depthWrite:false}));sel.rotation.x=-Math.PI/2;sel.visible=false;dynamic.add(sel);
 const tokenGeo={cone:new THREE.ConeGeometry(.2,.5,24),cube:new THREE.BoxGeometry(.32,.32,.32),cylinder:new THREE.CylinderGeometry(.17,.17,.42,24),octahedron:new THREE.OctahedronGeometry(.23)};
 for(let i=0;i<4;i++){const g=new THREE.Group(),body=new THREE.Mesh(tokenGeo[PLAYER_SHAPES[i]],new THREE.MeshStandardMaterial({color:PLAYER_COLORS[i],metalness:.55,roughness:.25,emissive:PLAYER_COLORS[i],emissiveIntensity:.25}));body.position.y=.28;body.castShadow=true;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.05,24),new THREE.MeshStandardMaterial({color:'#d9a441',metalness:1,roughness:.3}));base.position.y=.02;
  const halo=new THREE.Mesh(new THREE.RingGeometry(.26,.34,32),new THREE.MeshBasicMaterial({color:PLAYER_COLORS[i],transparent:true,opacity:.9,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.01;g.add(base,body,halo);g.visible=false;dynamic.add(g);tokens.push(g)}
 const SLOT=[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]],tokenTarget=(pid,id)=>POS[id].clone().add(new THREE.Vector3(SLOT[pid][0],.04,SLOT[pid][1]));

 // camera: fit the playable island (track spaces + tower footprint) into the board area; no automatic zoom.
 const fitPts=[];for(const id of Object.keys(POS))fitPts.push(POS[id].clone().add(new THREE.Vector3(0,.2,0)));let view={pitch:46,yaw:0,zoom:1,focus:null},rect={x:0,y:0,w:canvas.clientWidth||1,h:canvas.clientHeight||1},dirty=true,anim=[],renders=0,selected=null;
 const prefersLess=matchMedia('(prefers-reduced-motion: reduce)'),overviewEye=new THREE.Vector3(),overviewTarget=new THREE.Vector3(),followTarget=new THREE.Vector3(),followEye=new THREE.Vector3(),cameraAim=new THREE.Vector3();
 let tracking=0,trackingUntil=0,trackingPid=-1,trackingYaw=0,trackingAt=0;
 const centre=fitPts.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/fitPts.length);
 function placeAt(d,t){const p=THREE.MathUtils.degToRad(view.pitch),y=THREE.MathUtils.degToRad(view.yaw);camera.up.set(0,1,0);camera.position.set(t.x+d*Math.cos(p)*Math.sin(y),t.y+d*Math.sin(p),t.z+d*Math.cos(p)*Math.cos(y));camera.lookAt(t);camera.updateMatrixWorld()}
 function placeCamera(){const t=view.focus?POS[view.focus].clone():centre.clone().setY(.6);const around=c=>[[-2.2,-2.2],[2.2,-2.2],[-2.2,2.2],[2.2,2.2]].map(([x,z])=>c.clone().add(new THREE.Vector3(x,0,z)));fitToFree(THREE,camera,view.focus?around(POS[view.focus]):fitPts,rect,d=>placeAt(d,t));overviewEye.copy(camera.position);overviewTarget.copy(t);dirty=true}
 function resize(r){rect=r||{x:0,y:0,w:canvas.clientWidth,h:canvas.clientHeight,free:rect.free};renderer.setPixelRatio(Math.min(devicePixelRatio||1,tier.dpr));renderer.setSize(rect.w,rect.h,false);placeCamera()}

 let lastView=null;
 function sync(v){lastView=v;
  for(const site of v.sites){const r=rings[site.id];r.visible=site.owner>=0;if(site.owner>=0)r.material=ownerMats[site.owner];
   const want=site.owner>=0?site.stage:-1,cur=stagesAt[site.id];if(cur&&cur.userData.stage===want)continue;if(cur){dynamic.remove(cur);delete stagesAt[site.id]}
   if(want>=0){const m=stageModels[want].clone(true);m.scale.setScalar(.42);const p=POS[site.id];m.position.set(p.x,p.y,p.z);m.rotation.y=YAW[site.id]+Math.PI;m.userData.stage=want;dynamic.add(m);stagesAt[site.id]=m}}
  const frac=v.tower.stage/5,h=TOWER.y+.15+frac*TOWER_H*.98;clip.constant=v.tower.stage>=5?1e4:h;crane.visible=v.tower.stage<5;scaffold.visible=v.tower.stage<5;scaffold.position.set(TOWER.x,Math.max(TOWER.y+.4,h-.2),TOWER.z);
  for(const p of v.players){tokens[p.id].visible=!p.out;if(!anim.some(a=>a.pid===p.id))tokens[p.id].position.copy(tokenTarget(p.id,p.pos))}
  if(tier.shadows)renderer.shadowMap.needsUpdate=true;water.invalidate();dirty=true;kick()}
 function select(id){selected=id;sel.visible=!!id;if(id){sel.position.copy(POS[id]).add(new THREE.Vector3(0,.09,0));sel.rotation.z=YAW[id]+Math.PI/4}dirty=true;kick()}
 function moveToken(pid,from,to,ms=220){return new Promise(res=>{
  const now=performance.now(),duration=Math.max(1,ms);
  if(!view.focus&&!prefersLess.matches){trackingPid=pid;trackingUntil=now+duration+700;}
  anim.push({pid,a:tokenTarget(pid,from),b:tokenTarget(pid,to),t0:now,ms:duration,res});dirty=true;kick();
 })}
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 canvas.addEventListener('pointerup',e=>{const b=canvas.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(ndc,camera);const h=ray.intersectObjects(hit.children,false)[0];onPick(h?h.object.userData.id:null)});
 function project(id){const v=POS[id].clone().project(camera),b=canvas.getBoundingClientRect();return{x:b.left+(v.x+1)/2*b.width,y:b.top+(1-v.y)/2*b.height}}
 let raf=0;function kick(){if(!raf)raf=requestAnimationFrame(frame)}
 function frame(now){raf=0;if(lost)return;anim=anim.filter(a=>{const k=Math.min(1,(now-a.t0)/a.ms);tokens[a.pid].position.lerpVectors(a.a,a.b,k);tokens[a.pid].position.y+=Math.sin(k*Math.PI)*.4;if(k>=1){a.res();return false}return true});
  if(trackingPid>=0&&!view.focus&&!prefersLess.matches){
    const dt=Math.min(70,trackingAt?now-trackingAt:16),k=1-Math.exp(-dt/210),active=anim.some(a=>a.pid===trackingPid)||now<trackingUntil;
    tracking+=(Number(active)-tracking)*k;if(!active&&tracking<.003)tracking=0;
    followTarget.copy(tokens[trackingPid].position);followTarget.y+=.28;
    const yaw=Math.atan2(followTarget.x-centre.x,followTarget.z-centre.z);
    trackingYaw+=Math.atan2(Math.sin(yaw-trackingYaw),Math.cos(yaw-trackingYaw))*k;
    const distance=THREE.MathUtils.clamp(overviewEye.distanceTo(overviewTarget)*.44,9,16),pitch=.79;
    followEye.set(followTarget.x+Math.sin(trackingYaw)*Math.cos(pitch)*distance,followTarget.y+Math.sin(pitch)*distance,followTarget.z+Math.cos(trackingYaw)*Math.cos(pitch)*distance);
    camera.position.copy(overviewEye).lerp(followEye,tracking);cameraAim.copy(overviewTarget).lerp(followTarget,tracking);
    camera.up.set(0,1,0);camera.lookAt(cameraAim);camera.updateMatrixWorld();dirty=true;
   }else if(tracking>0){tracking=0;camera.position.copy(overviewEye);camera.up.set(0,1,0);camera.lookAt(overviewTarget);dirty=true}
   trackingAt=now;
   if(dirty||anim.length){if(!anim.length)water.refresh(now);renderer.render(scene,camera);renders++;dirty=false}if(anim.length||tracking>0)kick()}
 const invalidate=()=>{dirty=true;kick()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderer.shadowMap.needsUpdate=true;invalidate()}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;renderer.dispose()});
 canvas.addEventListener('webglcontextrestored',()=>{renderer=makeRenderer();buildEnv();water.restore();lost=false;resize(rect);if(lastView)sync(lastView);invalidate()});
 function setView(p){Object.assign(view,p);tracking=0;trackingUntil=0;placeCamera();water.invalidate();invalidate()}
 function stats(){const i=renderer.info.render;return{ruleset:E.RULESET,quality,nodes:E.NODES.length,buffer:[canvas.width,canvas.height],css:[rect.w,rect.h],pixelRatio:renderer.getPixelRatio(),devicePixelRatio,
  triangles:i.triangles,calls:i.calls,renders,materials:materials.size,files:audit.files,assetTriangles:audit.triangles,towerTrianglesRemoved:audit.towerTrianglesRemoved,towerClip:clip.constant,craneVisible:crane.visible,
  reflections:water.stats(),stagesShown:Object.keys(stagesAt).length,tokensVisible:tokens.filter(t=>t.visible).length,selected,tracking:+tracking.toFixed(3),cameraUp:camera.up.toArray(),physicalDevice:false}}
 resize();invalidate();
 return{resize,sync,select,moveToken,project,setView,stats,invalidate,positions:POS,layout}}
