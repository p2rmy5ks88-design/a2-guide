/* Read-only bridge for the game's existing, animated token geometry. */
import * as THREE from '../lib/three.module.min.js';
export function createTokenAdapter({onChange=()=>{}}={}){
 const geometry=new WeakMap(),materials=new WeakMap(),textures=new Map(),nativeTextures=new Map(),loader=new THREE.TextureLoader();
 function meshGeometry(source){
  if(geometry.has(source))return geometry.get(source);
  const positions=[],normals=[],uvs=[];
  for(let i=0;i<source.v.length;i+=8){positions.push(...source.v.slice(i,i+3));normals.push(...source.v.slice(i+3,i+6));uvs.push(...source.v.slice(i+6,i+8));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(Array.from(source.idx));geometry.set(source,g);return g;
 }
 function material(source){
  let m=materials.get(source);
  if(!m){const c=new THREE.Color().setRGB(...source.c,THREE.SRGBColorSpace);m=source.unlit?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshStandardMaterial({color:c,roughness:.38,metalness:Math.min(.55,(source.spec||0)*.5),emissive:c,emissiveIntensity:source.em||0});m.transparent=source.a<1||!!source.blend;m.opacity=source.a??1;materials.set(source,m);}
  m.color.setRGB(...source.c,THREE.SRGBColorSpace);if(m.isMeshStandardMaterial){m.metalness=Math.min(.55,(source.spec||0)*.5);m.emissiveIntensity=source.em||0;m.emissive.copy(m.color);}
  if(source.tex?.canvas&&m.userData.nativeTexture!==source.tex){let map=nativeTextures.get(source.tex);if(!map){map=new THREE.CanvasTexture(source.tex.canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;nativeTextures.set(source.tex,map);}m.map=map;m.userData.nativeTexture=source.tex;m.needsUpdate=true;}
  return m;
 }
 return {nativeTextureCount:()=>nativeTextures.size,invalidateNativeTextures(){for(const texture of nativeTextures.values())texture.needsUpdate=true;},create(source,textureURL){
  const links=[];
  function visit(node){const sprite=node===source.bq,renderable=!!(node.geo&&node.mat);let mat=renderable?material(node.mat):null;if(sprite){let texture=textures.get(textureURL);if(!texture){texture=loader.load(textureURL,onChange);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.set(textureURL,texture);}mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.05,side:THREE.DoubleSide});}const object=renderable?new THREE.Mesh(meshGeometry(node.geo),mat):new THREE.Group();object.castShadow=false;object.receiveShadow=true;links.push([node,object]);for(const child of node.kids)if(child!==source.sh&&!(source.ill&&child===source.kids[1]&&child.geo))object.add(visit(child));return object;}
  const root=visit(source);
  return {source,root,poseKey:()=>links.map(([n])=>[n.p,n.r,n.s,n.visible]),sync(){for(const [node,object]of links){object.visible=node.visible!==false;object.rotation.fromArray([...node.r,'YXZ']);if(object.isMesh){object.geometry=meshGeometry(node.geo);if(node!==source.bq)object.material=material(node.mat);}object.scale.fromArray(node.s);if(object!==root)object.position.fromArray(node.p);}root.position.set(0,0,0);},faceCamera(camera){if(source.bq){const pair=links.find(([n])=>n===source.bq);pair?.[1].lookAt(camera.position);}},illustrated:!!source.ill,meshCount:links.filter(([,o])=>o.isMesh).length};
 }};
}

