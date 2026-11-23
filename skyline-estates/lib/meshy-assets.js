/* Detailed Meshy-generated models for the Career boards (owner request 22 Nov 2026).
   Tokens (car, boat, plane, train), the 16 Crossroads landmark miniatures and the City Hall centrepiece.
   Files live in assets/meshy/ (textures ≤ 768 px, KHR_mesh_quantization geometry). Every model loads lazily
   and is optional: if a file is missing or fails to load, the board keeps its existing procedural model. */
import * as THREE from './three.module.min.js';
import {GLTFLoader} from './GLTFLoader.js';

const loader=new GLTFLoader();
const BASE=new URL('../assets/meshy/',import.meta.url).href;
const cache=new Map();

/* Only tokens cast shadows; landmark and centrepiece models are static decoration and skip the shadow pass
   (keeps frame cost close to the previous procedural models on older iPhones). */
export function meshyModel(name){
 if(!cache.has(name))cache.set(name,loader.loadAsync(BASE+name+'.glb').then(g=>{
  const token=name.startsWith('token_');g.scene.traverse(o=>{if(o.isMesh){o.castShadow=token;o.receiveShadow=token;if(o.material)o.material.envMapIntensity=1}});return g.scene})
  .catch(e=>{console.warn('Meshy model '+name+' unavailable; keeping the built-in model',e);return null}));
 return cache.get(name);
}

/* Scale a clone so its largest horizontal size is `size`, centre it on x/z and stand it on y=0.
   alongX: turn it so its longest horizontal side runs along +x (vehicles). */
export function fitted(src,size,{alongX=false,yaw=0}={}){
 const obj=src.clone(true),wrap=new THREE.Group(),inner=new THREE.Group();inner.add(obj);wrap.add(inner);
 let box=new THREE.Box3().setFromObject(obj),s=box.getSize(new THREE.Vector3());
 if(alongX&&s.z>s.x)inner.rotation.y=Math.PI/2;
 inner.rotation.y+=yaw;inner.updateMatrixWorld(true);
 box=new THREE.Box3().setFromObject(inner);s=box.getSize(new THREE.Vector3());
 const k=size/Math.max(s.x,s.z,1e-6);inner.scale.setScalar(k);inner.updateMatrixWorld(true);
 box=new THREE.Box3().setFromObject(inner);const c=box.getCenter(new THREE.Vector3());
 inner.position.set(-c.x,-box.min.y,-c.z);return wrap;
}

/* Token: keeps the board's chrome plinth and player-colour ring, swaps the hand-built body for the model.
   Token bodies are modelled facing +x (their direction of travel). */
const TOKEN_SIZE={car:.46,boat:.44,plane:.48,train:.46};
const TOKEN_YAW={car:0,boat:0,plane:0,train:0};
export function dressToken(g,kind,onReady){
 const body=g&&g.children&&g.children[0];if(!body||!TOKEN_SIZE[kind])return;
 meshyModel('token_'+kind).then(src=>{if(!src)return;
  const scale=g.scale.x||1,m=fitted(src,TOKEN_SIZE[kind],{alongX:true,yaw:TOKEN_YAW[kind]});
  body.clear();body.add(m);g.userData.meshy=true;onReady&&onReady(scale)});
}

/* Crossroads landmark name → model file (lm_<slug>.glb). */
export const landmarkFile=name=>'lm_'+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
