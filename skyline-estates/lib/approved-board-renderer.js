/* Skyline Estates approved replacement: genuine 3D GLB board, raycast tiles,
   staged 3D buildings, independent 3D tokens and close-follow camera.
   Uses board_core.glb + optional environment_detail.glb; no screenshots on meshes. */
import * as THREE from '../lib/three.module.min.js';
import {GLTFLoader} from '../lib/GLTFLoader.js';
const TOKEN_KEYS=['lion','eagle','horse','ship'];
const STRUCTURES=['stage_0_plot.glb','stage_1_lowrise.glb','stage_2_midrise.glb','stage_3_highrise.glb','stage_4_skyscraper.glb','stage_5_hotel.glb'];
const PAWN_OFF=[[-.24,-.17],[.24,-.17],[-.24,.17],[.24,.17]];
export async function createBoard({canvas,source,board,base,onSelect=()=>{},quality='high'}){
 const scene=new THREE.Scene();scene.background=new THREE.Color(board==='empire'?0x081829:0x111522);
 scene.fog=new THREE.Fog(board==='empire'?0x112b41:0x343047,40,96);
 const camera=new THREE.PerspectiveCamera(34,1,.12,240);camera.up.set(0,1,0);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
 renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const hemi=new THREE.HemisphereLight(0xe5e9ff,0x5d442e,1.65),sun=new THREE.DirectionalLight(0xffd299,3.5);
 sun.position.set(-9,24,15);sun.castShadow=quality!=='low';sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);
 Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:90});scene.add(hemi,sun,new THREE.AmbientLight(0xffffff,.28));
 const loader=new GLTFLoader();const url=x=>base.replace(/\/$/,'')+'/'+x;
 const load=x=>new Promise((resolve,reject)=>loader.load(url(x),g=>resolve(g.scene),undefined,reject));
 const boardRoot=await load('board_core.glb');scene.add(boardRoot);
 // Keep tile textures readable and bright while environment retains real lighting.
 boardRoot.traverse(o=>{if(o.isMesh&&/^TILE_\d{3}_/.test(o.name)){
  const src=Array.isArray(o.material)?o.material[0]:o.material;
  if(src?.map){const mat=new THREE.MeshBasicMaterial({map:src.map,toneMapped:false,side:THREE.DoubleSide});o.material=mat;}
 }});
 let scenery=null;try{if(quality!=='low'){scenery=await load('environment_detail.glb');scene.add(scenery)}}catch(e){console.warn('Optional scene details unavailable',e)}
 const spaceMeshes=new Map(),clickable=[];
 for(const tile of source.spaces){const mesh=boardRoot.getObjectByName(tile.raycast_node);if(!mesh)throw Error('3D board missing named tile mesh: '+tile.raycast_node);
  mesh.userData.spaceId=tile.id;spaceMeshes.set(tile.id,mesh);clickable.push(mesh)}
 const tokenRoots=[];for(let i=0;i<4;i++){
  const mesh=await load('tokens/'+TOKEN_KEYS[i]+'.glb');
  const bb=new THREE.Box3().setFromObject(mesh),dim=bb.getSize(new THREE.Vector3());
  const norm=.72/Math.max(dim.x,dim.y,dim.z,.01);mesh.scale.setScalar(norm);
  mesh.userData.seat=i;tokenRoots.push(mesh);scene.add(mesh);
 }
 const structures=new Map(),prefabs=[];
 for(let i=0;i<STRUCTURES.length;i++)try{prefabs[i]=await load('buildings/'+STRUCTURES[i])}catch(e){if(i<5)throw e}
 const selectedMark=new THREE.Mesh(new THREE.RingGeometry(.42,.52,40),new THREE.MeshBasicMaterial({color:0xffe787,side:THREE.DoubleSide,transparent:true,opacity:.95,depthTest:false}));
 selectedMark.rotation.x=-Math.PI/2;selectedMark.renderOrder=50;selectedMark.visible=false;scene.add(selectedMark);
 const selectedDisc=new THREE.Mesh(new THREE.CircleGeometry(.38,32),new THREE.MeshBasicMaterial({color:0xffd96b,transparent:true,opacity:.12,depthTest:false,side:THREE.DoubleSide}));
 selectedDisc.rotation.x=-Math.PI/2;selectedDisc.renderOrder=49;selectedDisc.visible=false;scene.add(selectedDisc);
 const pawnAt=(idx,seat)=>{const tile=source.spaces[idx],o=PAWN_OFF[seat%4];return new THREE.Vector3(tile.pawn_anchor[0]+o[0],tile.pawn_anchor[1]+.03,tile.pawn_anchor[2]+o[1])};
 const renderTokens=players=>players.forEach(p=>{const mesh=tokenRoots[p.id];if(!mesh)return;mesh.visible=!p.bankrupt;if(!mesh.userData.inMotion)mesh.position.copy(pawnAt(p.pos,p.id))});
 const resetBuildings=properties=>{
  for(const [i,p] of Object.entries(properties)){
   const idx=+i;const old=structures.get(idx);if(p.owner<0){if(old){scene.remove(old);structures.delete(idx)}continue}
   if(old?.userData.stage===p.stage&&old?.userData.owner===p.owner)continue;
   if(old)scene.remove(old);
   const prefab=prefabs[Math.min(p.stage,prefabs.length-1)];if(!prefab)continue;
   const obj=prefab.clone(true),anchor=source.spaces[idx].build_anchor;
   const bounds=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());obj.scale.setScalar(.67/Math.max(bounds.x,bounds.z,1));
   obj.position.set(anchor[0],anchor[1],anchor[2]);
   obj.userData={stage:p.stage,owner:p.owner};scene.add(obj);structures.set(idx,obj)
  }
  for(const [i,obj] of [...structures.entries()])if(!properties[i]||properties[i].owner<0){scene.remove(obj);structures.delete(i)}
 };
 let selected=0,mode='whole',cameraTime=0,moving=false;
 const target=new THREE.Vector3(0,.18,0),desiredPos=new THREE.Vector3();
 let worldW=0,worldH=0,last=performance.now(),lastRender=0,raf=0;
 const choose=idx=>{selected=idx;const tile=source.spaces[idx];selectedMark.visible=true;selectedDisc.visible=true;
  selectedMark.position.set(tile.position[0],tile.position[1]+.092,tile.position[2]);selectedDisc.position.copy(selectedMark.position)};
 const overview=()=>{mode='whole';target.set(...source.board_camera.target);cameraTime=0};
 const close=idx=>{choose(idx);mode='close';target.set(...source.spaces[idx].position);target.y=.38;cameraTime=0};
 const calcEye=()=>{
  if(mode==='whole')return new THREE.Vector3(...source.board_camera.overview_position);
  const t=source.spaces[selected],nx=t.normal?.[0]??0,nz=t.normal?.[1]??-1;
  const len=Math.hypot(nx,nz)||1,d=source.board_camera.close_follow_distance||8.4;
  const a=(source.board_camera.close_follow_pitch_deg||48)*Math.PI/180;
  return new THREE.Vector3(target.x+nx/len*d*Math.cos(a),target.y+d*Math.sin(a),target.z+nz/len*d*Math.cos(a));
 };
 function tick(now){
  raf=requestAnimationFrame(tick);
  if(document.hidden)return;
  // High-density mobile canvases retain full DPR; idle scene is only refreshed
  // at 20 fps rather than redrawing 3–4 million pixels at 60 fps.
  const frameTime=moving?16:50;
  if(now-lastRender<frameTime)return;
  lastRender=now;
  const dt=Math.min(.1,(now-last)/1000||.016);last=now;
  const alpha=1-Math.exp(-dt*7);
  desiredPos.copy(calcEye());camera.position.lerp(desiredPos,alpha);
  const v=camera.userData.look||new THREE.Vector3(...source.board_camera.target);v.lerp(target,alpha);camera.userData.look=v;
  camera.up.set(0,1,0);camera.lookAt(v);camera.updateMatrixWorld();
  selectedMark.material.opacity=.78+.18*Math.sin(now*.004);
  renderer.render(scene,camera)
 }
 camera.position.set(...source.board_camera.overview_position);camera.lookAt(...source.board_camera.target);
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const onPointer=e=>{if(moving)return;const r=canvas.getBoundingClientRect();
  ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(clickable,false);
  if(hits.length){const idx=hits[0].object.userData.spaceId;choose(idx);onSelect(idx)}
 };
 canvas.addEventListener('pointerup',onPointer,{passive:true});
 const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,quality==='high'?3:quality==='medium'?2:1.5);
  worldW=Math.max(1,r.width);worldH=Math.max(1,r.height);
  renderer.setPixelRatio(dpr);renderer.setSize(worldW,worldH,false);camera.aspect=worldW/worldH;camera.updateProjectionMatrix()};
 addEventListener('resize',resize);resize();choose(0);raf=requestAnimationFrame(tick);
 const sync=state=>{renderTokens(state.players);resetBuildings(state.properties);choose(state.selected)};
 const move=async (seat,route,duration=135)=>{
  const mesh=tokenRoots[seat];if(!mesh||!route?.length)return;
  moving=true;mesh.userData.inMotion=true;
  try{let prev=mesh.position.clone();for(const tileId of route){const next=pawnAt(tileId,seat),start=performance.now();
    await new Promise(done=>{const step=now=>{const t=Math.min(1,(now-start)/Math.max(20,duration)),k=t*t*(3-2*t);
      mesh.position.lerpVectors(prev,next,k);mesh.position.y+=.26*Math.sin(Math.PI*k);
      if(t<1)requestAnimationFrame(step);else done()};requestAnimationFrame(step)});
    prev=next.clone();if(seat===0){selected=tileId;target.set(...source.spaces[tileId].position);target.y=.4;mode='close';choose(tileId)}
  }}finally{mesh.userData.inMotion=false;moving=false}
 };
 const projectTile=id=>{const t=source.spaces[id],p=new THREE.Vector3(...t.position).project(camera),r=canvas.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,visible:p.z>-1&&p.z<1}};
 const stats=()=>({spaces:spaceMeshes.size,buffer:[canvas.width,canvas.height],css:[worldW,worldH],dpr:renderer.getPixelRatio(),selected,mode,playingAssets:!!boardRoot,detailAssets:!!scenery,tokens:tokenRoots.length,stagePrefabs:prefabs.filter(Boolean).length,structuresShown:structures.size,cameraUp:camera.up.toArray(),physicalDevice:false});
 const destroy=()=>{cancelAnimationFrame(raf);canvas.removeEventListener('pointerup',onPointer);removeEventListener('resize',resize);renderer.dispose()};
 return {source,boardRoot,scene,camera,renderer,spaceMeshes,sync,choose,overview,close,move,resize,projectTile,stats,destroy};
}
