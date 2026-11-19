/* Owner-approved runtime asset subset. Source ZIP/art/demo stay outside this worktree.
 */
import * as THREE from '../lib/three.module.min.js';
import {GLTFLoader} from '../lib/GLTFLoader.js';

export async function loadLocalOriginsAssets(){
 const root=new URL('../assets/approved-v5/',import.meta.url);
 const loader=new GLTFLoader(),materials=new Map(),loaded=[];
 async function load(file){const gltf=await loader.loadAsync(new URL(file,root).href);gltf.scene.traverse(o=>{
  if(!o.isMesh)return;
  if(!o.geometry.attributes.normal||!o.geometry.attributes.uv)throw Error(file+': missing normals or UVs');
  const unify=m=>{if(!m.normalMap||!m.aoMap||!m.roughnessMap||!m.metalnessMap)throw Error(file+': incomplete PBR material '+m.name+' missing '+['normalMap','aoMap','roughnessMap','metalnessMap'].filter(k=>!m[k]).join(',')+' type '+m.type);if(materials.has(m.name))return materials.get(m.name);m.envMapIntensity=.55;if(m.emissiveIntensity!==undefined)m.emissiveIntensity=.65;for(const key of ['map','emissiveMap','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])m[key].anisotropy=8;materials.set(m.name,m);return m;};
  o.material=Array.isArray(o.material)?o.material.map(unify):unify(o.material);o.castShadow=o.receiveShadow=true;
 });loaded.push(file);return gltf.scene;}
 const files=['boards/board_origins_40.glb','buildings/dev_0_lot.glb','buildings/dev_1_midrise_L1.glb','buildings/dev_2_midrise_L2.glb','buildings/dev_3_highrise_L3.glb','buildings/dev_4_highrise_L4.glb','buildings/dev_5_skyscraper_L5.glb','props/dice.glb','buildings/financial_tower_crown.glb','buildings/grand_boulevard_palace.glb','props/palm.glb','props/yacht.glb','props/street_lamp.glb'];
 // Sequential board first establishes canonical shared materials; remaining loads are local only.
 const board=await load(files[0]);const rest=await Promise.all(files.slice(1).map(load));
 // Only decorative centre architecture is shortened. Owned development prototypes,
 // outside waterfront models, tile positions and the game stage counts are intact.
 let centreMaxHeight=0;board.traverse(o=>{if(!o.isMesh)return;const position=o.geometry.attributes.position;let changed=false;
  for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i),y=position.getY(i);if(Math.abs(x)<4.3&&Math.abs(z)<4.3){if(y>.78){position.setY(i,.78+(y-.78)*.21);changed=true;}centreMaxHeight=Math.max(centreMaxHeight,position.getY(i));}}
  if(changed){position.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();}
 });
 const lighting=await fetch(new URL('lighting/lighting.json',root)).then(r=>{if(!r.ok)throw Error('Missing supplied lighting rig');return r.json();});
 const environment=await load('environments/origins_waterfront_city.glb');
 const lot=materials.get('label_forsale');if(lot){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#125d49';ctx.fillRect(0,0,256,256);ctx.fillStyle='#fff2cc';ctx.font='800 42px Arial';ctx.textAlign='center';ctx.fillText('OWNED',128,148);lot.map=new THREE.CanvasTexture(c);lot.map.colorSpace=THREE.SRGBColorSpace;lot.map.flipY=false;lot.needsUpdate=true;}
 const layout=await fetch(new URL('layouts/origins_40.json',root)).then(r=>{if(!r.ok)throw Error('Missing Origins layout');return r.json();});
 if(layout.spaces.length!==40)throw Error('Origins asset layout must contain exactly 40 spaces');
 // The asset atlas contains illustrative labels/order. Real tile faces are generated
 // from SQ and G, so no fictional ownership, prices, corners or district colours leak in.
 board.traverse(o=>{if(/__origins_40_tiles$|__dice$/.test(o.name))o.visible=false;});
 return {root:root.href,lighting,board,environment,stages:rest.slice(0,6),die:rest[6],tower:rest[7],palace:rest[8],palm:rest[9],yacht:rest[10],lamp:rest[11],layout:layout.spaces,loaded,materials,scale:.9,kind:'supplied-v5',
  cloneStage(stage){return this.stages[Math.max(0,Math.min(5,stage))].clone(true);},
  report(){let meshes=0,triangles=0;board.traverse(o=>{if(o.isMesh&&o.visible){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return{kind:this.kind,centreMaxHeight:centreMaxHeight*this.scale,files:loaded.slice(),boardSpaces:40,meshes,triangles,materialCount:materials.size,sourceUnmodified:true,embeddedTextures:true};}};
}
