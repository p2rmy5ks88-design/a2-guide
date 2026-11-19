/* Skyline Dominion — Board 3 interactive 3D renderer (PROTOTYPE, local review only).
   Presentation only: ownership, stages, costs, control and victory all come from SkylineDominion (career-dominion-rules.js)
   through D.view(state). The renderer never changes match state.
   Assets: Claude's supplied Dominion pack, copied locally to ./assets/dominion-local/ (excluded from git; see DOMINION-3D.md).
   Shared stage models come from the committed ./assets/approved-v5/buildings/. */
import * as THREE from './lib/three.module.min.js';
import {GLTFLoader} from './lib/GLTFLoader.js';
import {createWaterReflections} from './presentation/local-water-reflections.js';

const D=window.SkylineDominion;
export const PLAYER_COLORS=['#FF7A59','#4C9DFF','#F4E7C2','#D45CE0'];
export const PLAYER_SHAPES=['cone','cube','cylinder','octahedron'];
const STAGE_FILES=['dev_0_lot','dev_1_midrise_L1','dev_2_midrise_L2','dev_4_highrise_L4','dev_5_skyscraper_L5'];
const TIERS={low:{dpr:1.5,shadows:false,city:false,reflections:false},medium:{dpr:2,shadows:true,city:true,reflections:false},high:{dpr:3,shadows:true,city:true,reflections:true}};

export async function createDominionRenderer(canvas,{quality='high',onPick=()=>{}}={}){
 const tier=TIERS[quality]||TIERS.high,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,400);
 scene.background=new THREE.Color('#0a1530');scene.fog=new THREE.Fog('#2a2d4a',38,110);
 const makeRenderer=()=>{const r=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.02;
  r.shadowMap.enabled=tier.shadows;r.shadowMap.type=THREE.PCFSoftShadowMap;r.shadowMap.autoUpdate=false;r.shadowMap.needsUpdate=true;return r};
 let renderer=makeRenderer(),lost=false;
 // golden-hour rig (matches lighting/lighting.json of the supplied pack)
 const hemi=new THREE.HemisphereLight('#c9d4f2','#6b4a2e',.75),sun=new THREE.DirectionalLight('#ffc98a',3.1),fill=new THREE.DirectionalLight('#9fb4ec',.9);
 sun.position.set(14,10,16);fill.position.set(-12,14,-10);sun.castShadow=tier.shadows;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:1,far:60});sun.shadow.normalBias=.03;scene.add(hemi,sun,fill);
 const sky=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);for(const[p,col]of[[0,'#141d44'],[.45,'#5d5280'],[.6,'#f8ae6a'],[1,'#1a2036']])gr.addColorStop(p,col);g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
 const envScene=new THREE.Scene();envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100,32,16),new THREE.MeshBasicMaterial({map:sky,side:THREE.BackSide})));
 const buildEnv=()=>{const pm=new THREE.PMREMGenerator(renderer),rt=pm.fromScene(envScene,.04);pm.dispose();scene.environment=rt.texture};buildEnv();

 const loader=new GLTFLoader(),materials=new Map(),audit={files:[],triangles:{},materials:0};
 const shareMaterial=(m,file)=>{if(!m.normalMap||!m.aoMap||!m.roughnessMap||!m.metalnessMap)throw Error(`Incomplete PBR material ${m.name} in ${file}`);
  if(materials.has(m.name))return materials.get(m.name);m.envMapIntensity=.9;if(m.emissiveMap)m.emissiveIntensity=.85;
  for(const k of ['map','normalMap','aoMap','roughnessMap','metalnessMap','emissiveMap'])if(m[k])m[k].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());materials.set(m.name,m);return m};
 async function load(url,file){const g=await loader.loadAsync(url);let tris=0;g.scene.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes;if(!a.normal||!a.uv)throw Error('Missing normals/UVs in '+file);
  o.material=Array.isArray(o.material)?o.material.map(m=>shareMaterial(m,file)):shareMaterial(o.material,file);o.castShadow=o.receiveShadow=true;tris+=(o.geometry.index?o.geometry.index.count:a.position.count)/3});
  audit.files.push(file);audit.triangles[file]=Math.round(tris);return g.scene}
 const local=f=>new URL('./assets/dominion-local/'+f,import.meta.url).href,shared=f=>new URL('./assets/approved-v5/'+f,import.meta.url).href;

 const layout=await (await fetch(local('layouts/dominion_30.json'))).json();
 const POS=Object.fromEntries(layout.nodes.map(n=>[n.id,new THREE.Vector3(...n.position)]));
 const board=await load(local('boards/board_dominion_30.glb'),'board_dominion_30.glb');scene.add(board);
 let city=null;if(tier.city){city=await load(local('environments/dominion_waterfront_city.glb'),'dominion_waterfront_city.glb');scene.add(city)}
 const stageModels=await Promise.all(STAGE_FILES.map(f=>load(shared('buildings/'+f+'.glb'),f+'.glb')));audit.materials=materials.size;
 const water=createWaterReflections({scene,camera,getRenderer:()=>renderer,enabled:tier.reflections&&!!city,maxWidth:768,getExclusions:()=>[dynamic]});if(city)water.register(city);

 // ---- dynamic, state-bound layer (tokens, ownership, stages, selection, routes) ----
 const dynamic=new THREE.Group();scene.add(dynamic);
 const ringGeo=new THREE.TorusGeometry(.43,.035,8,48),hitGeo=new THREE.CylinderGeometry(.5,.5,.5,6),ownerMats=PLAYER_COLORS.map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.55,metalness:.3,roughness:.35}));
 const hit=new THREE.Group(),rings={},stagesAt={},tokens=[];dynamic.add(hit);
 for(const n of D.NODES){const m=new THREE.Mesh(hitGeo,new THREE.MeshBasicMaterial({visible:false}));m.position.copy(POS[n.id]);m.userData.id=n.id;hit.add(m);
  const r=new THREE.Mesh(ringGeo,ownerMats[0]);r.rotation.x=-Math.PI/2;r.position.copy(POS[n.id]).add(new THREE.Vector3(0,.03,0));r.visible=false;dynamic.add(r);rings[n.id]=r}
 const legalMat=new THREE.MeshBasicMaterial({color:'#7df9ff',transparent:true,opacity:.85,depthWrite:false}),selMat=new THREE.MeshBasicMaterial({color:'#ffe29c',depthWrite:false});
 const legalMarks=new THREE.Group(),sel=new THREE.Mesh(new THREE.RingGeometry(.5,.6,6),selMat);sel.rotation.x=-Math.PI/2;sel.visible=false;dynamic.add(legalMarks,sel);
 const routeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#7df9ff'}));dynamic.add(routeLine);
 const tokenGeo={cone:new THREE.ConeGeometry(.17,.42,24),cube:new THREE.BoxGeometry(.28,.28,.28),cylinder:new THREE.CylinderGeometry(.15,.15,.36,24),octahedron:new THREE.OctahedronGeometry(.2)};
 for(let i=0;i<4;i++){const g=new THREE.Group(),body=new THREE.Mesh(tokenGeo[PLAYER_SHAPES[i]],new THREE.MeshStandardMaterial({color:PLAYER_COLORS[i],metalness:.55,roughness:.25,emissive:PLAYER_COLORS[i],emissiveIntensity:.25}));
  body.position.y=.24;body.castShadow=true;const base=new THREE.Mesh(new THREE.CylinderGeometry(.19,.21,.05,24),new THREE.MeshStandardMaterial({color:'#d9a441',metalness:1,roughness:.3}));base.position.y=.02;
  const halo=new THREE.Mesh(new THREE.RingGeometry(.22,.29,32),new THREE.MeshBasicMaterial({color:PLAYER_COLORS[i],transparent:true,opacity:.9,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.01;
  g.add(base,body,halo);g.visible=false;dynamic.add(g);tokens.push(g)}
 const SLOT=[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]];
 const tokenTarget=(pid,id)=>POS[id].clone().add(new THREE.Vector3(SLOT[pid][0],.04,SLOT[pid][1]));

 // ---- camera: fit the actual board bounds into the visible board rect (no automatic zoom) ----
 const boardBox=new THREE.Box3().setFromObject(board),boardSize=boardBox.getSize(new THREE.Vector3()),boardCenter=boardBox.getCenter(new THREE.Vector3());
 let view={pitch:44,yaw:0,zoom:1,focus:null},rect={x:0,y:0,w:canvas.clientWidth||1,h:canvas.clientHeight||1},dirty=true,anim=[],renders=0,selected=null;
 // Fit by projecting the real board footprint corners (bounded search; same result every time, no animation).
 const fitPts=[];for(const y of [.35,1.6])for(const[x,z]of[[boardBox.min.x,boardBox.min.z],[boardBox.max.x,boardBox.min.z],[boardBox.min.x,boardBox.max.z],[boardBox.max.x,boardBox.max.z],[boardBox.min.x,boardCenter.z],[boardBox.max.x,boardCenter.z]])fitPts.push(new THREE.Vector3(x,y,z));
 function placeAt(dist,target){const pitch=THREE.MathUtils.degToRad(view.pitch),yaw=THREE.MathUtils.degToRad(view.yaw);
  camera.position.set(target.x+dist*Math.cos(pitch)*Math.sin(yaw),target.y+dist*Math.sin(pitch),target.z+dist*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(target);camera.updateMatrixWorld()}
 function placeCamera(){camera.aspect=rect.w/rect.h;camera.updateProjectionMatrix();
  const target=view.focus?POS[view.focus].clone():boardCenter.clone().setY(.4).add(new THREE.Vector3(0,0,.35));
  let lo=2,hi=200;for(let i=0;i<40;i++){const mid=(lo+hi)/2;placeAt(mid,target);const ok=fitPts.every(p=>{const v=p.clone().project(camera);return Math.abs(v.x)<=.97&&Math.abs(v.y)<=.95});if(ok)hi=mid;else lo=mid}
  placeAt(hi/view.zoom,target);dirty=true}
 function resize(r){rect=r||{x:0,y:0,w:canvas.clientWidth,h:canvas.clientHeight};const dpr=Math.min(devicePixelRatio||1,tier.dpr);renderer.setPixelRatio(dpr);renderer.setSize(rect.w,rect.h,false);placeCamera()}

 // ---- state binding ----
 let lastView=null;
 function sync(v,{legal=[],from=null}={}){lastView=v;
  for(const id of Object.keys(rings))rings[id].visible=false;
  for(const site of v.sites){const r=rings[site.id];if(site.owner>=0){r.material=ownerMats[site.owner];r.visible=true}
   const want=site.owner>=0?site.stage:-1,cur=stagesAt[site.id];if(cur&&cur.userData.stage===want)continue;if(cur){dynamic.remove(cur);delete stagesAt[site.id]}
   if(want>=0){const m=stageModels[want].clone(true);m.scale.setScalar(.36);const p=POS[site.id];m.position.set(p.x,p.y-.02,p.z);m.rotation.y=Math.atan2(-p.x,-p.z);m.userData.stage=want;
    const flag=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.04,6),ownerMats[site.owner]);flag.position.set(0,.06/.36,1.05);m.add(flag);dynamic.add(m);stagesAt[site.id]=m}}
  for(const p of v.players){const t=tokens[p.id];t.visible=!p.out;if(!anim.some(a=>a.pid===p.id))t.position.copy(tokenTarget(p.id,p.pos))}
  legalMarks.clear();const moves=legal.filter(a=>a.type==='reach');for(const m of moves){const mk=new THREE.Mesh(new THREE.RingGeometry(.33,.4,6),legalMat);mk.rotation.x=-Math.PI/2;mk.position.copy(POS[m.to]).add(new THREE.Vector3(0,.07,0));mk.userData.id=m.to;legalMarks.add(mk)}
  if(tier.shadows)renderer.shadowMap.needsUpdate=true;dirty=true}
 function select(id,route=null){selected=id;sel.visible=!!id;if(id)sel.position.copy(POS[id]).add(new THREE.Vector3(0,.08,0));
  if(route&&route.length>1){routeLine.geometry.setFromPoints(route.map(x=>POS[x].clone().add(new THREE.Vector3(0,.12,0))));routeLine.visible=true}else routeLine.visible=false;dirty=true}
 function moveToken(pid,from,to,ms=380){return new Promise(res=>{anim.push({pid,a:tokenTarget(pid,from),b:tokenTarget(pid,to),t0:performance.now(),ms,res});dirty=true;kick()})}

 // ---- picking (deterministic: nearest hit hexagon under the pointer) ----
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 canvas.addEventListener('pointerup',e=>{const b=canvas.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(ndc,camera);
  const h=ray.intersectObjects(hit.children,false)[0];onPick(h?h.object.userData.id:null)});
 function project(id){const v=POS[id].clone().project(camera),b=canvas.getBoundingClientRect();return{x:b.left+(v.x+1)/2*b.width,y:b.top+(1-v.y)/2*b.height,visible:Math.abs(v.x)<=1&&Math.abs(v.y)<=1}}

 // ---- on-demand rendering (no idle loop) ----
 let raf=0;function kick(){if(!raf)raf=requestAnimationFrame(frame)}
 function frame(now){raf=0;if(lost)return;
  anim=anim.filter(a=>{const k=Math.min(1,(now-a.t0)/a.ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;tokens[a.pid].position.lerpVectors(a.a,a.b,e);tokens[a.pid].position.y+=Math.sin(k*Math.PI)*.35;if(k>=1){a.res();return false}return true});
  if(dirty||anim.length){if(!anim.length)water.refresh(now);renderer.render(scene,camera);renders++;dirty=false}
  if(anim.length)kick()}
 const invalidate=()=>{dirty=true;kick()};
 addEventListener('resize',()=>invalidate());document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderer.shadowMap.needsUpdate=true;invalidate()}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;renderer.dispose()});
 canvas.addEventListener('webglcontextrestored',()=>{renderer=makeRenderer();buildEnv();water.restore();lost=false;resize(rect);if(lastView)sync(lastView);invalidate()});

 function setView(p){Object.assign(view,p);placeCamera();water.invalidate();invalidate()}
 function stats(){const info=renderer.info.render;return{ruleset:D.RULESET,quality,nodes:D.NODES.length,buffer:[canvas.width,canvas.height],css:[rect.w,rect.h],pixelRatio:renderer.getPixelRatio(),devicePixelRatio:devicePixelRatio,
  triangles:info.triangles,calls:info.calls,renders,materials:materials.size,files:audit.files,assetTriangles:audit.triangles,reflections:water.stats(),stagesShown:Object.keys(stagesAt).length,
  tokensVisible:tokens.filter(t=>t.visible).length,selected,physicalDevice:false,boardBounds:[+boardSize.x.toFixed(2),+boardSize.y.toFixed(2),+boardSize.z.toFixed(2)]}}
 resize();sync(D.view(window.__dominionLab?.state()||D.newMatch({seed:1})));invalidate();
 return{resize,sync,select,moveToken,project,setView,view:()=>({...view}),stats,invalidate,positions:POS,layout,renderNow(){renderer.render(scene,camera);renders++}}}
