/* LOCAL AUTHORING SOURCE — architectural miniature asset library.
 * Original procedural geometry/materials. No image-backed scene, remote assets,
 * rule imports or storage writes. All mesh geometries carry normals and UVs.
 * Units: board world units, +Y up. Stage/ownership are supplied by the game.
 */
import * as THREE from '../lib/three.module.min.js';
import {mergeGeometries} from '../lib/BufferGeometryUtils.js';

export const ASSET_REVISION='local-pbr-authoring-1';
export function createMiniatures({tier='medium'}={}){
 const hi=tier==='high',low=tier==='low',textures=[],materials={},cache=new Map();
 const rand=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function texture(draw,size=512,color=true){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;textures.push(t);return t;}
 const stoneMap=texture((c,s)=>{c.fillStyle='#e3d6bf';c.fillRect(0,0,s,s);const r=rand(71);for(let i=0;i<10000;i++){c.fillStyle=`rgba(${r()>.5?'111,92,68':'255,249,227'},${r()*.09})`;c.fillRect(r()*s,r()*s,1+r()*3,1+r()*2)}c.strokeStyle='#a4927c40';c.lineWidth=1;for(let y=0;y<s;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke();for(let x=(y%128?32:0);x<s;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke()}}});
 const stoneBump=texture((c,s)=>{c.fillStyle='#b5b5b5';c.fillRect(0,0,s,s);c.strokeStyle='#666';for(let y=0;y<s;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke()}},256,false);
 const glassMap=texture((c,s)=>{const g=c.createLinearGradient(0,0,s,s);g.addColorStop(0,'#92c4d2');g.addColorStop(.4,'#346d8c');g.addColorStop(.65,'#75a8c2');g.addColorStop(1,'#1c3d62');c.fillStyle=g;c.fillRect(0,0,s,s);const r=rand(39);for(let y=0;y<s;y+=32)for(let x=0;x<s;x+=48){c.fillStyle=r()>.72?'#e7b66b':'rgba(12,39,65,.23)';c.fillRect(x+3,y+3,42,26)}c.strokeStyle='#142e45';c.lineWidth=2;for(let y=0;y<s;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke()}for(let x=0;x<s;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke()}},hi?1024:512);
 const emission=texture((c,s)=>{c.fillStyle='#000';c.fillRect(0,0,s,s);const r=rand(39);for(let y=0;y<s;y+=32)for(let x=0;x<s;x+=48){if(r()>.72){c.fillStyle='#ffdba0';c.fillRect(x+4,y+4,40,24)}}},hi?1024:512);
 const glassRough=texture((c,s)=>{c.fillStyle='#555';c.fillRect(0,0,s,s);c.strokeStyle='#bcbcbc';c.lineWidth=2;for(let y=0;y<s;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke()}for(let x=0;x<s;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke()}},hi?1024:512,false);
 const woodMap=texture((c,s)=>{c.fillStyle='#463022';c.fillRect(0,0,s,s);const r=rand(11);for(let k=0;k<1200;k++){c.strokeStyle=`rgba(${k%2?'205,146,74':'20,10,5'},${.02+r()*.15})`;c.beginPath();const y=r()*s;c.moveTo(0,y);c.bezierCurveTo(s*.3,y-3,s*.7,y+4,s,y);c.stroke()}});
 const pavingMap=texture((c,s)=>{c.fillStyle='#948574';c.fillRect(0,0,s,s);c.lineWidth=2;c.strokeStyle='#4a453e';for(let y=0;y<s;y+=32)for(let x=(y%64?16:0);x<s;x+=48)c.strokeRect(x,y,48,32);const r=rand(21);for(let i=0;i<1200;i++){c.fillStyle='#fff2';c.fillRect(r()*s,r()*s,2,1)}},512);
 const asphaltMap=texture((c,s)=>{c.fillStyle='#393a3c';c.fillRect(0,0,s,s);const r=rand(99);for(let i=0;i<5000;i++){c.fillStyle=i%2?'#fff1':'#0002';c.fillRect(r()*s,r()*s,1,1)}},256);
 function mat(name,opt){const m=new THREE.MeshStandardMaterial(opt);m.name=name;materials[name]=m;return m;}
 mat('limestone',{map:stoneMap,bumpMap:stoneBump,bumpScale:.016,color:'#fff4de',roughness:.79,metalness:0});
 mat('ivory',{color:'#f4e8cc',roughness:.58,metalness:.03});
 mat('glass',{map:glassMap,roughnessMap:glassRough,metalness:.5,roughness:.48,emissiveMap:emission,emissive:'#ffd394',emissiveIntensity:.4,envMapIntensity:1.1});
 mat('bronze',{color:'#5d4a37',metalness:.78,roughness:.35});
 mat('gold',{color:'#dba847',metalness:.86,roughness:.28,envMapIntensity:1.3});
 mat('navy',{color:'#152438',metalness:.12,roughness:.48});
 mat('slate',{color:'#354453',roughness:.83,metalness:.05});
 mat('walnut',{map:woodMap,roughness:.48,metalness:0});
 mat('paving',{map:pavingMap,bumpMap:pavingMap,bumpScale:.018,roughness:.91});
 mat('asphalt',{map:asphaltMap,bumpMap:asphaltMap,bumpScale:.008,roughness:.93});
 mat('foliage',{color:'#426a2a',roughness:.95,metalness:0});
 mat('foliageLight',{color:'#638b36',roughness:.94,metalness:0});
 mat('trunk',{color:'#66503a',roughness:1});
 mat('lamp',{color:'#ffe4ab',emissive:'#ffc971',emissiveIntensity:2,roughness:.3});
 const leafMap=texture((c,s)=>{c.clearRect(0,0,s,s);const r=rand(204);for(let i=0;i<110;i++){const x=s*(.15+r()*.7),y=s*(.12+r()*.76),a=r()*6.28;c.save();c.translate(x,y);c.rotate(a);c.fillStyle=['#345322','#4b702d','#74943e','#587e32'][i%4];c.beginPath();c.ellipse(0,0,5+r()*7,2+r()*4,0,0,Math.PI*2);c.fill();c.restore();}},256);
 mat('leaves',{map:leafMap,color:'#b5c790',roughness:.95,alphaTest:.38,side:THREE.DoubleSide});
 const boxGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,low?12:20),sphereGeo=new THREE.SphereGeometry(1,low?8:14,low?6:10);
 const mats=materials;
 function mesh(geo,m,x,y,z,sx=1,sy=1,sz=1,parent){const a=new THREE.Mesh(geo,typeof m==='string'?mats[m]:m);a.position.set(x,y,z);a.scale.set(sx,sy,sz);a.castShadow=a.receiveShadow=true;if(parent)parent.add(a);return a;}
 const box=(parent,m,x,y,z,w,h,d)=>mesh(boxGeo,m,x,y,z,w,h,d,parent);
 function roundBox(parent,m,x,y,z,w,h,d,r=.05){const shape=new THREE.Shape(),a=w/2,b=d/2;shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);const geo=new THREE.ExtrudeGeometry(shape,{depth:h-2*r,bevelEnabled:true,bevelSegments:low?1:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);return mesh(geo,m,x,y,z,1,1,1,parent);}
 function disk(parent,m,x,y,z,r,h){return mesh(cylGeo,m,x,y,z,r,h,r,parent);}
 function tree(seed=1){const key='tree'+seed;if(cache.has(key))return cache.get(key).clone(true);const g=new THREE.Group(),r=rand(seed);disk(g,'trunk',0,.22,0,.027,.44);for(let i=0;i<(low?4:7);i++){const a=r()*Math.PI*2,rr=r()*.15,x=Math.cos(a)*rr,z=Math.sin(a)*rr;for(let k=0;k<3;k++){const leaf=mesh(new THREE.PlaneGeometry(.36,.34),'leaves',x,.48+r()*.22,z,1,1,1,g);leaf.rotation.set(k*Math.PI/3,a+k*Math.PI/3,.1);}}const baked=batch(g);cache.set(key,baked);return baked.clone(true);}
 function planter(g,x,z,w=.22){box(g,'limestone',x,.055,z,w,.11,w);const t=tree(Math.round((x+z+12)*13));t.scale.setScalar(w/.35);t.position.set(x,.1,z);g.add(t);}
 function lamp(){const g=new THREE.Group();disk(g,'bronze',0,.015,0,.065,.03);disk(g,'bronze',0,.22,0,.018,.44);disk(g,'gold',0,.44,0,.055,.04);mesh(sphereGeo,'lamp',0,.49,0,.045,.06,.045,g);disk(g,'bronze',0,.555,0,.06,.025);return g;}
 function building(kind='residential',stage=3,variant=0){const key=[kind,stage,variant].join();if(cache.has(key))return cache.get(key).clone(true);const g=new THREE.Group();g.name=key;g.userData={kind,stage,tier,authoringRevision:ASSET_REVISION};
  const h=[.04,.44,.76,1.18,1.72,2.35][Math.max(0,Math.min(5,stage))],w=stage>=4?.54:.64,d=.58;
  roundBox(g,'limestone',0,.045,0,.88,.09,.84,.025);roundBox(g,'gold',0,.095,0,.86,.025,.82,.015);
  if(stage===0){box(g,'foliage',0,.115,0,.73,.025,.69);cache.set(key,g);return g.clone(true);}
  // Distinctive articulated podium, recessed glazed lobby and projecting stone cornices.
  roundBox(g,'limestone',0,.2,0,.72,.19,.67,.025);box(g,'glass',0,.21,.342,.48,.14,.018);box(g,'bronze',0,.21,.355,.024,.15,.025);
  const body=stage<=2?'limestone':'glass';box(g,body,0,.26+h/2,0,w,h,d);
  if(kind==='residential'||stage<3){
   for(let f=0;f<Math.max(2,Math.round(h/.18));f++){const y=.34+f*.18;for(const side of [-1,1]){for(const x of [-.2,0,.2]){box(g,'navy',x,y,side*(d/2+.009),.12,.115,.022);box(g,'glass',x,y,side*(d/2+.025),.09,.093,.012)}box(g,'ivory',0,y-.074,side*.34,.74,.026,.11);if(!low)for(const x of [-.32,-.16,0,.16,.32])box(g,'bronze',x,y-.038,side*.389,.009,.075,.009);}}
  }else{
   // Physical corner piers and mullions break the silhouette; glazing is mapped PBR.
   for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,variant%2?'gold':'ivory',x,.26+h/2,z,.035,h+.03,.035);
   if(!low)for(let f=1;f<Math.round(h/.19);f++)box(g,'bronze',0,.26+f*.19,0,w+.018,.017,d+.018);
   if(stage>=4){const wing=.2;box(g,'limestone',-.25,.26+h*.34,-.14,.3,h*.68,.44);box(g,'glass',-.25,.26+h*.34,.09,.25,h*.62,.012);box(g,'ivory',-.25,.28+h*.68,-.14,.34,.04,.48);}
  }
  const roofY=.28+h;
  roundBox(g,'ivory',0,roofY,0,w+.13,.055,d+.13,.018);
  box(g,'slate',0,roofY+.035,0,w-.08,.024,d-.08);
  if(stage<=2){const roof=new THREE.ConeGeometry(.51,.24,4);roof.rotateY(Math.PI/4);mesh(roof,'slate',0,roofY+.15,0,.9,1,.8,g);box(g,'limestone',.18,roofY+.21,-.1,.09,.23,.11);}
  else {box(g,'glass',.08,roofY+.16,-.04,w*.52,.25,d*.5);box(g,'gold',.08,roofY+.3,-.04,w*.58,.035,d*.55);if(stage===5){for(let i=0;i<6;i++)box(g,'gold',-.2+i*.08,roofY+.36,0,.012,.2,.4);disk(g,'bronze',0,roofY+.5,0,.012,.42);}}
  if(!low){planter(g,-.32,.31,.15);planter(g,.32,.31,.15);for(const x of [-.29,.29])box(g,'lamp',x,.235,.365,.035,.045,.025);}
  const baked=batch(g);baked.name=key;baked.userData=g.userData;cache.set(key,baked);return baked.clone(true);
 }
 function civic(){const g=new THREE.Group();disk(g,'limestone',0,.08,0,.68,.16);disk(g,'gold',0,.18,0,.65,.055);disk(g,'glass',0,.44,0,.59,.48);for(let i=0;i<18;i++){const a=i*Math.PI/9;box(g,'ivory',Math.cos(a)*.6,.45,Math.sin(a)*.6,.035,.53,.035);}disk(g,'ivory',0,.72,0,.67,.07);disk(g,'gold',0,.77,0,.62,.03);const roof=mesh(new THREE.SphereGeometry(.58,low?16:32,low?8:16,0,Math.PI*2,0,Math.PI/2),'glass',0,.79,0,1,.45,1,g);for(let i=0;i<12;i++){const a=i*Math.PI/6;const curve=new THREE.EllipseCurve(0,0,.59,.27,0,Math.PI,false,0);const pts=curve.getPoints(24).map(p=>new THREE.Vector3(p.x,p.y,0));const arch=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.01,5,false),mats.gold);arch.rotation.y=a;arch.position.y=.8;g.add(arch);}return g;}
 function bridge(length=1.4,width=.48){const g=new THREE.Group();box(g,'limestone',0,.1,0,width,.12,length);box(g,'paving',0,.175,0,width-.08,.035,length);for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const t=i/24;pts.push(new THREE.Vector3(side*width/2,.23+Math.sin(t*Math.PI)*.36,(t-.5)*length));}const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.026,low?5:8,false);g.add(new THREE.Mesh(geo,mats.gold));for(let i=0;i<=6;i++){const t=i/6,hh=.1+Math.sin(t*Math.PI)*.36;box(g,'bronze',side*width/2,.19+hh/2,(t-.5)*length,.016,hh,.016);}}return g;}
 function yacht(){const g=new THREE.Group(),hull=new THREE.SphereGeometry(1,16,8);mesh(hull,'ivory',0,.06,0,.14,.07,.46,g);box(g,'walnut',0,.105,0,.21,.025,.62);roundBox(g,'ivory',0,.16,-.05,.17,.1,.28,.025);box(g,'glass',0,.2,.1,.15,.055,.025);disk(g,'bronze',0,.3,-.02,.006,.3);return g;}
 function batch(group){group.updateMatrixWorld(true);const by=new Map();group.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);if(!geo.attributes.normal)geo.computeVertexNormals();if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(geo);});const out=new THREE.Group();for(const [m,list]of by){const g=mergeGeometries(list.map(x=>x.index?x.toNonIndexed():x),false);for(const a of list)a.dispose();if(g){const mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;out.add(mesh);}}return out;}
 function audit(group){let meshes=0,vertices=0,triangles=0,missing=[];group.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;vertices+=g.attributes.position.count;triangles+=(g.index?g.index.count:g.attributes.position.count)/3;for(const a of ['normal','uv'])if(!g.attributes[a])missing.push(o.name+':'+a);});return{revision:ASSET_REVISION,tier,meshes,vertices,triangles,missingAttributes:missing,materialCount:Object.keys(mats).length,textureCount:textures.length,pbr:true};}
 return{THREE,mats,textures,box,roundBox,disk,mesh,building,tree,lamp,civic,bridge,yacht,batch,audit,texture};
}
