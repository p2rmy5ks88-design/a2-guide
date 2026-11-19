/* Editable local reconstruction of the approved oval glass civic landmark.
 * Built-in parametric meshes supply normals/UVs; surface maps reuse the local GLBs.
 * This is scenery only: no playable spaces, ownership or route changes.
 */
import * as THREE from '../lib/three.module.min.js';
export function createCircuitCivic(materials,{scale=35,baseY=-.42*35}={}){
 const group=new THREE.Group();group.name='Circuit civic oval reconstruction';group.scale.setScalar(scale);group.position.y=baseY;group.rotation.y=-.32;
 const source=materials.get('facade_glass'),maps={};for(const key of ['map','normalMap','aoMap','roughnessMap','metalnessMap'])maps[key]=source?.[key]||null;
 const wall=new THREE.MeshPhysicalMaterial({...maps,emissiveMap:source?.emissiveMap,emissive:'#ffe4ad',emissiveIntensity:.35,color:'#b6dbec',roughness:.58,metalness:.5,envMapIntensity:1.25,clearcoat:.55,clearcoatRoughness:.25});wall.normalScale.set(.15,.15);wall.aoMapIntensity=.55;
 const roof=new THREE.MeshPhysicalMaterial({...maps,map:null,color:'#a8cddf',roughness:.3,metalness:.26,envMapIntensity:1.35,clearcoat:.8,transparent:true,opacity:.82,depthWrite:false});roof.normalScale.set(.08,.08);roof.aoMapIntensity=.35;
 const gold=materials.get('gold').clone();gold.color.set('#ecca7c');gold.roughness=.7;gold.envMapIntensity=1.45;gold.emissive.set('#9c5214');gold.emissiveIntensity=.12;gold.normalScale.set(.12,.12);
 const stone=materials.get('marble').clone();stone.color.set('#f2dec0');stone.aoMapIntensity=.6;
 const sx=1.22,sz=.76,r=1.2;
 function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
 const plinth=mesh(new THREE.CylinderGeometry(1.57,1.62,.12,64),stone,0,.38,0);plinth.scale.set(sx,1,sz);
 const body=mesh(new THREE.CylinderGeometry(r,r,.79,64,4),wall,0,.835,0);body.scale.set(sx,1,sz);
 const cap=mesh(new THREE.SphereGeometry(r,64,20,0,Math.PI*2,0,Math.PI/2),roof,0,1.23,0);cap.scale.set(sx,.28,sz);
 function curve(points,radius=.012){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(16,points.length*2),radius,5,false),gold);}
 for(const y of [.45,.85,1.23]){const points=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*r*sx,y,Math.sin(a)*r*sz);});curve(points,.015);}
 // Fine vertical mullions and intersecting roof ribs, rather than a domed cage.
 for(let i=0;i<36;i++){const a=i/36*Math.PI*2,x=Math.cos(a)*r*sx,z=Math.sin(a)*r*sz;mesh(new THREE.CylinderGeometry(.009,.009,.8,5),gold,x,.835,z);}
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const points=Array.from({length:17},(_,j)=>{const t=j/16*Math.PI/2;return new THREE.Vector3(Math.cos(a)*r*sx*Math.sin(t),1.23+r*.28*Math.cos(t),Math.sin(a)*r*sz*Math.sin(t));});curve(points,.009);}
 for(const t of [.38,.72,1.06]){const points=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*r*sx*Math.sin(t),1.23+r*.28*Math.cos(t),Math.sin(a)*r*sz*Math.sin(t));});curve(points,.009);}
 for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.65,.04,.18),stone,0,.32+i*.04,1.45-i*.16);
 // Preserve every vertex/normal/UV, but submit the repeated mullions together.
 // Four material batches replace dozens of tiny individual draw calls.
 group.updateMatrixWorld(true);const batches=new Map();let before=0;
 for(const child of [...group.children]){
  child.updateMatrix();const g=child.geometry.clone().applyMatrix4(child.matrix),key=child.material;
  if(!batches.has(key))batches.set(key,{position:[],normal:[],uv:[],index:[]});const b=batches.get(key),offset=b.position.length/3;
  for(const name of ['position','normal','uv'])b[name].push(...g.attributes[name].array);
  const ids=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i);for(const id of ids)b.index.push(offset+id);before+=ids.length/3;
  g.dispose();child.geometry.dispose();group.remove(child);
 }
 let after=0;for(const[material,b]of batches){const g=new THREE.BufferGeometry();for(const[name,size]of [['position',3],['normal',3],['uv',2]])g.setAttribute(name,new THREE.Float32BufferAttribute(b[name],size));g.setIndex(b.index);g.computeBoundingSphere();const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);after+=b.index.length/3;}
 if(before!==after)throw Error('Civic geometry batching lost triangles');
 group.userData.landmark='approved-oval-civic';group.userData.batchAudit={triangles:after,drawCalls:group.children.length};return group;
}

export function removeSuppliedCentralDome(root){
 // Source meshes are batched by material. Remove only central landmark triangles,
 // preserving bridge glass, all surrounding architecture and the City name sign.
 const names=new Set(['glass_dome','gold','white','facade_white','lamp_glow']);let removed=0;
 root.traverse(o=>{if(!o.isMesh||!names.has(o.material?.name))return;const source=o.geometry,p=source.attributes.position,idx=source.index,keep=[];
  for(let i=0;i<(idx?idx.count:p.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k),inside=ids.every(k=>Math.hypot(p.getX(k),p.getZ(k))<1.82&&p.getY(k)>.39);
   if(inside){removed++;continue;}keep.push(...ids);
  }
  if(keep.length!==(idx?idx.count:p.count)){o.geometry=source.clone();o.geometry.setIndex(keep);}
 });return removed;
}
