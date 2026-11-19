/* Real-time Origins reconstruction. No rules, saves or artwork backgrounds.
 * Render data is a read-only snapshot from the existing Classic game adapter.
 */
import * as THREE from './lib/three.module.min.js';
import {createMiniatures} from './presentation/production-miniatures.js';
import {createTokenAdapter} from './presentation/origins-token-adapter.js';
import {loadLocalOriginsAssets} from './presentation/local-supplied-assets.js';
import {createWaterReflections} from './presentation/local-water-reflections.js';

export function createOriginsRenderer(canvas,{read,onSquare,onError=console.error}={}){
 const mobile=matchMedia('(pointer:coarse)').matches,tier=new URLSearchParams(location.search).get('quality')||'high';
 const wantsPack=new URLSearchParams(location.search).get('source')!=='authored';
 let assetPack=null,assetError=null,assetGroup=null;
 const A=createMiniatures({tier}),M=A.mats,scene=new THREE.Scene();scene.background=new THREE.Color('#71818d');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 let pixelRatio=Math.min(devicePixelRatio,tier==='high'?3:tier==='low'?1.5:2),mode='board',running=true,last=0,dirty=true,frame=0;
 renderer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=tier!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const camera=new THREE.PerspectiveCamera(36,1,.1,120),reflectionCamera=camera.clone(),target=new THREE.Vector3(0,.1,0);
 const waterfront=createWaterReflections({scene,camera,getRenderer:()=>renderer,enabled:tier!=='low'});
 const ambient=new THREE.HemisphereLight('#b9d5ee','#716046',.75);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#ffd294',2.7);sun.position.set(-9,14,7);sun.castShadow=tier!=='low';sun.shadow.mapSize.set(tier==='high'?2048:1024,tier==='high'?2048:1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:42});sun.shadow.normalBias=.026;sun.shadow.bias=-.00015;scene.add(sun);
 const fill=new THREE.DirectionalLight('#b2d9ef',.65);fill.position.set(9,7,-7);scene.add(fill);
 // Locally authored HDR-like environment; glass/gold reflect physical scene lighting.
 const envScene=new THREE.Scene(),skyTex=A.texture((c,s)=>{const g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,'#5d829d');g.addColorStop(.4,'#b9c7cd');g.addColorStop(.56,'#ffe6b2');g.addColorStop(.7,'#cd9d6c');g.addColorStop(1,'#344d65');c.fillStyle=g;c.fillRect(0,0,s,s);},256);
 envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40,32,16),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide})));
 const pmrem=new THREE.PMREMGenerator(renderer);let envTarget=pmrem.fromScene(envScene,.04);scene.environment=envTarget.texture;pmrem.dispose();
 const statics=new THREE.Group(),dynamic=new THREE.Group(),tileGroup=new THREE.Group(),pick=[];scene.add(dynamic,tileGroup);
 const tilePositions=[];let stateKey='',rules=null,boardBuilt=false,shadowDirty=true;
 const coord=r=>({x:-(r.x+r.w/2-550)/100,z:(r.y+r.h/2-550)/100,w:r.w/100,d:r.h/100});
 if(!wantsPack){
 A.roundBox(statics,'walnut',0,-.35,0,11.55,.58,11.55,.16);A.roundBox(statics,'gold',0,-.055,0,11.57,.12,11.57,.12);A.roundBox(statics,'bronze',0,-.61,0,11.65,.1,11.65,.12);
 // Central landscaped city street grid, contact surfaces and dark civic dice plaza.
 A.box(statics,'paving',0,.035,0,8.05,.07,8.05);
 A.box(statics,'asphalt',0,.078,0,1.12,.02,7.9);A.box(statics,'asphalt',0,.078,0,7.9,.02,1.02);
 for(const x of [-.59,.59])A.box(statics,'ivory',x,.09,0,.055,.025,7.9);for(const z of [-.54,.54])A.box(statics,'ivory',0,.09,z,7.9,.025,.055);
 const plazaM=new THREE.MeshStandardMaterial({color:'#5a4b45',roughness:.66,metalness:.06});A.disk(statics,plazaM,0,.12,.7,1.03,.09);A.disk(statics,'gold',0,.17,.7,1.05,.025);A.disk(statics,plazaM,0,.19,.7,1.0,.025);
 for(let i=0;i<24;i++){const a=i*Math.PI/12;A.box(statics,'lamp',Math.cos(a)*1.02,.22,.7+Math.sin(a)*1.02,.045,.022,.045);}
 // Architecture is explicitly placed from the reference composition, not a repeated grid.
 const city=[[-2.75,-2.45,2,'residential',.9],[-1.75,-2.5,3,'residential',.95],[-.45,-2.65,4,'financial',1.03],[1.1,-2.55,5,'financial',1.05],[2.65,-2.35,4,'financial',1.04],[-2.75,-.9,3,'residential',.85],[-1.65,-1.2,2,'residential',.86],[1.45,-1.2,4,'financial',.93],[2.8,-.7,3,'residential',.9],[-2.9,.9,3,'residential',.9],[-1.8,1.9,2,'residential',.9],[1.8,1.9,3,'residential',.93],[2.85,1.1,2,'residential',.94],[-2.8,2.85,2,'residential',.8],[-.8,2.95,3,'financial',.85],[.75,2.9,2,'residential',.85],[2.65,2.8,3,'financial',.85]];
 city.forEach(([x,z,stage,kind,sc],i)=>{const b=A.building(kind,stage,i%3);b.position.set(x,.09,z);b.scale.setScalar(sc);b.rotation.y=(i%4)*Math.PI/2;statics.add(b);});
 const civic=A.civic();civic.position.set(0,.1,-1.35);civic.scale.setScalar(1.35);statics.add(civic);
 for(let i=0;i<80;i++){const angle=i*2.399963,r=1.6+(i%11)*.22,x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(Math.abs(x)<.72||Math.abs(z)<.64||city.some(a=>Math.hypot(a[0]-x,a[1]-z)<.55))continue;const t=A.tree(i+13);t.position.set(x,.12,z);t.scale.setScalar(.45+(i%4)*.08);statics.add(t);}
 for(let i=0;i<32;i++){const edge=Math.floor(i/8),p=-3.5+(i%8);const l=A.lamp();l.scale.setScalar(.65);l.position.set(edge===0?-3.8:edge===1?3.8:p,.11,edge===2?-3.8:edge===3?3.8:p);statics.add(l);}
 // Dense waterfront city, promenades and marina fingers sit beyond the board.
 for(let side=0;side<3;side++){const q=new THREE.Group();q.position.set(side===0?0:side===1?-8.2:8.2,-.34,side===0?-8.7:0);if(side)q.rotation.y=side===1?Math.PI/2:-Math.PI/2;
  A.roundBox(q,'limestone',0,.05,0,16,.15,2.6,.08);A.box(q,'paving',0,.14,.55,16,.04,1.28);
  for(let i=0;i<16;i++){const x=-7.5+i;const b=A.building(i%3?'residential':'financial',2+i%4,i%3);b.position.set(x,.18,-.45);b.scale.set(.85,.75+(i%3)*.12,.85);q.add(b);const l=A.lamp();l.position.set(x+.45,.17,1.0);q.add(l);const t=A.tree(i+side*21);t.position.set(x+.45,.15,.35);t.scale.setScalar(.7);q.add(t);}
  if(side===0)for(let i=0;i<4;i++){const x=-4.7+i*3.1;A.box(q,'walnut',x,.12,2.05,.17,.1,1.4);for(const s of [-1,1]){const y=A.yacht();y.position.set(x+s*.4,.0,2.0);q.add(y);}}
  statics.add(q);
 }
 }
 const staticBatched=A.batch(statics);scene.add(staticBatched);
 // Dynamic water normals and projective planar reflection, never a painted board image.
 const normal=A.texture((c,s)=>{c.fillStyle='#8080ff';c.fillRect(0,0,s,s);for(let i=0;i<180;i++){const y=(i*137)%s;c.strokeStyle=i%2?'#8397fa':'#7b75fe';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s*.3,y+3,s*.6,y-3,s,y);c.stroke();}},512,false);normal.repeat.set(16,16);
 const reflection=new THREE.WebGLRenderTarget(768,384,{type:THREE.HalfFloatType}),reflectionMatrix=new THREE.Matrix4();
 const waterMat=new THREE.MeshStandardMaterial({color:'#206b89',roughness:.25,metalness:.34,normalMap:normal,normalScale:new THREE.Vector2(.3,.3),envMapIntensity:1.1});
 const reflectionUniforms={uReflection:{value:reflection.texture},uReflectionMatrix:{value:reflectionMatrix}};
 waterMat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,reflectionUniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 uReflectionMatrix; varying vec4 vReflection;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvReflection=uReflectionMatrix*modelMatrix*vec4(transformed,1.0);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uReflection; varying vec4 vReflection;').replace('#include <dithering_fragment>','vec2 reflectionUV=vReflection.xy/vReflection.w;\n if(all(greaterThanEqual(reflectionUV,vec2(0.0)))&&all(lessThanEqual(reflectionUV,vec2(1.0)))) { vec3 reflected=texture2D(uReflection,reflectionUV).rgb; vec2 edgeFade=smoothstep(vec2(0.0),vec2(.12),reflectionUV)*smoothstep(vec2(0.0),vec2(.12),vec2(1.0)-reflectionUV); gl_FragColor.rgb=mix(gl_FragColor.rgb,reflected,.28*edgeFade.x*edgeFade.y); }\n#include <dithering_fragment>');};
 const water=new THREE.Mesh(new THREE.PlaneGeometry(100,100),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-.69;scene.add(water);
 const tileMats=[],buildings=new Map(),tokens=[],dice=[],nativeDice=[],tokenAdapter=createTokenAdapter({onChange:()=>{dirty=true;shadowDirty=true;}});
 const contactTex=A.texture((c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.45,'rgba(0,0,0,.24)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,s,s)},128);
 const contactMat=new THREE.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 function labelTexture(square,index,accent){return A.texture((c,s)=>{c.fillStyle='#f3ead7';c.fillRect(0,0,s,s);c.strokeStyle='#bfa26e';c.lineWidth=5;c.strokeRect(2,2,s-4,s-4);c.fillStyle=accent;c.fillRect(7,7,s-14,18);c.fillStyle='#172236';c.textAlign='center';c.font='800 76px Arial';let words=square.name.toUpperCase().split(' '),lines=[''];for(const w of words){let l=lines.length-1;if(c.measureText(lines[l]+w).width>s-38)lines.push(w+' ');else lines[l]+=w+' ';}const corner=index%10===0;lines.slice(0,3).forEach((t,k)=>c.fillText(t.trim(),s/2,s*(corner?.5:.29)+k*84));if(square.price){c.font='700 48px Arial';c.fillText(square.price,s/2,s-25);}else if(corner){c.font='800 100px Arial';c.fillText(index===0?'↗':index===10?'🔒':index===20?'☕':'↪',s/2,s*.28);}},512);}
 function buildTiles(v){v.squares.forEach((s,i)=>{let p=coord(s.rect);if(assetPack){const l=assetPack.layout[i],side=Math.floor(i/10),corner=i%10===0;p={x:l.position[0]*assetPack.scale,z:l.position[2]*assetPack.scale,w:(corner?l.size[0]:side%2?l.size[0]:l.size[1])*assetPack.scale,d:(corner?l.size[1]:side%2?l.size[1]:l.size[0])*assetPack.scale};}tilePositions[i]=p;const tile=new THREE.Group();tile.position.set(p.x,assetPack?.095:.04,p.z);tile.userData.square=i;const accent=new THREE.MeshStandardMaterial({color:s.color||'#b79145',roughness:.34,metalness:.12});const edge=A.roundBox(tile,accent,0,.0,0,p.w-.024,.13,p.d-.024,.035);pick.push(edge);edge.userData.square=i;
   const side=Math.floor(i/10),corner=i%10===0,vertical=side%2===0;
   // Neutral, camera-facing deed text occupies the outside of the tile. The
   // district-coloured inner surface stays separate for its actual development.
   const labelW=corner?p.w-.055:vertical?p.w*.59:p.w-.055,labelD=corner?p.d-.055:vertical?p.d-.055:p.d*.59;
   const map=labelTexture(s,i,s.color||'#b79145'),face=new THREE.Mesh(new THREE.PlaneGeometry(labelW,labelD),new THREE.MeshStandardMaterial({map,roughness:.7,metalness:0}));face.rotation.x=-Math.PI/2;face.position.set(corner?0:side===0?-p.w*.2:side===2?p.w*.2:0,.072,corner?0:side===1?-p.d*.2:side===3?p.d*.2:0);
   tile.add(face);
   if(s.type==='prop'){
    const plotW=vertical?p.w*.35:p.w-.05,plotD=vertical?p.d-.05:p.d*.35;
    const plot=new THREE.Mesh(new THREE.PlaneGeometry(plotW,plotD),new THREE.MeshBasicMaterial({color:s.color,toneMapped:false}));plot.rotation.x=-Math.PI/2;
    plot.position.set(side===0?p.w*.31:side===2?-p.w*.31:0,.074,side===1?p.d*.31:side===3?-p.d*.31:0);tile.add(plot);
   }
   tileGroup.add(tile);tileMats.push(map);});boardBuilt=true;}
 function updateState(v){rules=v;if(!boardBuilt)buildTiles(v);
  while(tokens.length>v.players.length)dynamic.remove(tokens.pop());
  v.players.forEach((p,i)=>{if(tokens[i]?.userData.token?.source===p.node)return;if(tokens[i])dynamic.remove(tokens[i]);const holder=new THREE.Group();holder.rotation.y=-Math.PI/2;const token=tokenAdapter.create(p.node,p.textureURL);holder.add(token.root);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.52,.42),contactMat);shadow.rotation.x=-Math.PI/2;holder.add(shadow);holder.userData.shadow=shadow;holder.userData.token=token;dynamic.add(holder);tokens[i]=holder;dirty=true;});
const key=JSON.stringify([v.ownership,v.players.map(p=>[p.id,p.out,p.color])]);if(key===stateKey)return;stateKey=key;
  for(const [i,b]of buildings){dynamic.remove(b);for(const resource of b.userData.ownedResources||[])resource.dispose();}buildings.clear();
  v.ownership.forEach((o,i)=>{if(o.owner<0)return;const s=v.squares[i],p=tilePositions[i];if(!s||!p)return;const group=new THREE.Group();const side=Math.floor(i/10),x=p.x-(side===0?-.5:side===2?.5:0),z=p.z-(side===1?-.5:side===3?.5:0);
   const ownerMat=new THREE.MeshStandardMaterial({color:s.color||'#9cadb8',roughness:.65});
   const ownerBase=A.roundBox(group,ownerMat,x,.155,z,.48,.035,.48,.015);
   const markerMat=new THREE.MeshBasicMaterial({color:v.players[o.owner]?.color||'#dab66a',toneMapped:false});const ownerMarker=A.roundBox(group,markerMat,x,.18,z+.235,.40,.025,.035,.01);
   if(s.type==='prop'){const b=assetPack?assetPack.cloneStage(o.stage):A.building(o.stage===5?'financial':'residential',Math.min(5,o.stage+1),i%3);const sc=assetPack?.44:.4;b.scale.setScalar(sc);b.position.set(x,assetPack?.19:.18,z);b.rotation.y=assetPack?assetPack.layout[i].yaw:(i<10?0:i<20?-Math.PI/2:i<30?Math.PI:Math.PI/2);group.userData.fadeMaterials=[];const cloned=new Map();b.traverse(n=>{if(!n.isMesh)return;const copy=m=>{if(!cloned.has(m)){const c=m.clone();c.userData.original={opacity:c.opacity,transparent:c.transparent,depthWrite:c.depthWrite};cloned.set(m,c);group.userData.fadeMaterials.push(c);}return cloned.get(m);};n.material=Array.isArray(n.material)?n.material.map(copy):copy(n.material);});group.add(b);}
   const ao=new THREE.Mesh(new THREE.PlaneGeometry(.85,.8),contactMat);ao.rotation.x=-Math.PI/2;ao.position.set(x,.133,z);group.add(ao);group.userData.ownedResources=[ownerMat,markerMat,ownerMarker.geometry,ownerBase.geometry,ao.geometry,...(group.userData.fadeMaterials||[])];dynamic.add(group);buildings.set(i,group);
  });
  shadowDirty=true;dirty=true;
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const usable=read()?.viewport||{left:0,right:0,top:0,bottom:0},availableW=Math.max(.3,1-(usable.left+usable.right)/w),availableH=Math.max(.3,1-(usable.top+usable.bottom)/h);const elevation=mode==='board'?.62:.52,yaw=0,angle=camera.fov*Math.PI/360;
  const distance=Math.max(11.6/(2*Math.tan(angle)*camera.aspect*availableW),11.6*Math.sin(elevation)/(2*Math.tan(angle)*availableH))*1.16;
  target.set(0,.15,0);camera.position.set(Math.sin(yaw)*distance,Math.sin(elevation)*distance,Math.cos(elevation)*distance);camera.lookAt(target);
  camera.clearViewOffset();
  const bounds=d=>{camera.position.set(0,Math.sin(elevation)*d,Math.cos(elevation)*d);camera.lookAt(target);camera.updateMatrixWorld();const points=[-5.8,5.8].flatMap(x=>[-5.8,5.8].map(z=>new THREE.Vector3(x,0,z).project(camera)));return{l:Math.min(...points.map(q=>(q.x+1)*w/2)),r:Math.max(...points.map(q=>(q.x+1)*w/2)),t:Math.min(...points.map(q=>(1-q.y)*h/2)),b:Math.max(...points.map(q=>(1-q.y)*h/2))};};
  const fits=d=>{const b=bounds(d);return b.r-b.l<=w-usable.left-usable.right-10&&b.b-b.t<=h-usable.top-usable.bottom-10;};
  let lo=8,hi=Math.max(distance,12);while(!fits(hi)&&hi<100)hi*=1.25;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(fits(mid))hi=mid;else lo=mid;}
  const box=bounds(hi),dx=(usable.left+w-usable.right-box.l-box.r)/2,dy=(usable.top+h-usable.bottom-box.t-box.b)/2;camera.setViewOffset(w,h,-dx,-dy,w,h);
  dirty=true;shadowDirty=true;
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
 canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;down=null;const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(pick,false);if(hits[0])onSquare(hits[0].object.userData.square);});
 const times=[];let downgrades=0,lastPose='',lastCosmetics='',lastWater=0,renderCount=0;
 function render(now){if(!running)return;requestAnimationFrame(render);if(document.hidden||renderer.getContext().isContextLost()||now-last<(tier==='low'?32:16))return;const v=read();if(!v?.active||(wantsPack&&!assetPack)){canvas.hidden=true;return;}canvas.hidden=false;updateState(v);const pose=JSON.stringify([v.players.map(p=>[p.world,p.node.r,p.node.s,p.node.m?.r,p.node.bq?.visible]),v.dice,v.diceSkin,v.nativeDice.map(d=>d.r),tokens.map(t=>t.userData.token.poseKey())]);if(v.cosmeticKey!==lastCosmetics){lastCosmetics=v.cosmeticKey;tokenAdapter.invalidateNativeTextures();dirty=true;}if(pose!==lastPose){lastPose=pose;dirty=true;}if(!assetPack&&now-lastWater>80){lastWater=now;dirty=true;}if(!dirty&&!shadowDirty)return;last=now;const renderStart=performance.now();
  v.players.forEach((p,i)=>{const g=tokens[i];g.visible=!p.out;g.userData.token.sync();if(assetPack)g.position.set(-p.world[2]*.99,p.world[1]+.21,p.world[0]*.99);else g.position.set(-p.world[0],p.world[1]+.16,p.world[2]);g.userData.shadow.position.y=.18-g.position.y;g.userData.shadow.scale.setScalar(Math.max(.35,1-Math.max(0,p.world[1])*.7));g.updateWorldMatrix(true,true);g.userData.token.faceCamera(camera);});
  for(const [i,b]of buildings){const p=tilePositions[i],near=tokens.some(t=>t.visible&&Math.hypot(t.position.x-p.x,t.position.z-p.z)<.72),factor=near?.38:1;for(const m of b.userData.fadeMaterials||[]){const o=m.userData.original;m.opacity=o.opacity*factor;const transparent=o.transparent||factor<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=factor<1?false:o.depthWrite;}}
  if(assetPack&&dice.length){
   const custom=v.diceSkin!=='classic',values=v.dice?[v.dice.a,v.dice.b,v.dice.sv]:[5,6,0];
   const nativeUp={1:[0,0,0],2:[-Math.PI/2,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],5:[Math.PI/2,0,0],6:[Math.PI,0,0]},suppliedUp={...nativeUp,1:[Math.PI,0,0],6:[0,0,0]};
   for(let i=0;i<3;i++){
    const needed=i<2?custom:!!v.dice?.sv;if(!needed){if(nativeDice[i])nativeDice[i].visible=false;continue;}
    const source=v.nativeDice[i];if(!nativeDice[i]){const bridge=tokenAdapter.create(source),holder=new THREE.Group();holder.add(bridge.root);holder.userData.bridge=bridge;scene.add(holder);nativeDice[i]=holder;}
    const holder=nativeDice[i],bridge=holder.userData.bridge;bridge.sync();bridge.root.visible=true;holder.visible=true;holder.position.set(i===2?0:i?.34:-.34,.5+(source.visible?Math.max(0,source.p[1]-.29)*.25:0),i===2?.55:0);
    if(!v.dice||!source.visible)bridge.root.rotation.fromArray([...(nativeUp[values[i]]||nativeUp[6]),'YXZ']);
   }
   dice.forEach((d,i)=>{d.visible=!custom;const final=suppliedUp[values[i]]||suppliedUp[6],native=nativeUp[values[i]]||nativeUp[6],source=v.nativeDice[i];if(v.dice&&source.visible){d.rotation.set(source.r[0]-native[0]+final[0],source.r[1],source.r[2]-native[2]+final[2],'YXZ');d.position.y=.455+Math.max(0,source.p[1]-.29)*.25;}else{d.rotation.fromArray([...final,'YXZ']);d.position.y=.455;}});
  }
  normal.offset.x=now*.000003;normal.offset.y=now*.000002;
  if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}
  if(!assetPack&&tier!=='low'&&frame++%8===0){const y=water.position.y;reflectionCamera.copy(camera);reflectionCamera.position.y=2*y-camera.position.y;reflectionCamera.up.set(0,-1,0);reflectionCamera.lookAt(target.x,2*y-target.y,target.z);reflectionCamera.updateMatrixWorld();reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);water.visible=false;renderer.setRenderTarget(reflection);renderer.render(scene,reflectionCamera);renderer.setRenderTarget(null);water.visible=true;}
  if(assetPack)waterfront.refresh(now);
  renderer.render(scene,camera);renderCount++;dirty=false;times.push(performance.now()-renderStart);if(times.length>120)times.shift();if(times.length===120&&now>12000&&downgrades<2&&pixelRatio>2){const sorted=[...times].sort((a,b)=>a-b);if(sorted[114]>45){pixelRatio=Math.max(2,pixelRatio-.25);renderer.setPixelRatio(pixelRatio);resize();downgrades++;times.length=0;}}
 }
 addEventListener('visibilitychange',()=>{if(!document.hidden){dirty=true;shadowDirty=true;resize();}});
 canvas.addEventListener('webglcontextrestored',()=>{waterfront.restore();const generator=new THREE.PMREMGenerator(renderer),next=generator.fromScene(envScene,.04);generator.dispose();envTarget=next;scene.environment=next.texture;dirty=true;shadowDirty=true;resize();});
 new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(render);
 if(wantsPack)loadLocalOriginsAssets().then(pack=>{assetPack=pack;
  // Match the supplied rig in linear-light intensities; preserve the source files.
  const rig=pack.lighting;sun.color.setRGB(...rig.sun.color);sun.intensity=rig.sun.intensity*.62;sun.position.fromArray(rig.sun.direction).multiplyScalar(-20);
  fill.color.setRGB(...rig.sky_fill.color);fill.intensity=rig.sky_fill.intensity*.55;ambient.intensity=.32;fill.position.fromArray(rig.sky_fill.direction).multiplyScalar(-20);
  ambient.groundColor.setRGB(...rig.ambient);renderer.toneMappingExposure=rig.exposure*.9;
  const gradient=rig.sky_gradient,toHex=a=>'#'+a.map(n=>n.toString(16).padStart(2,'0')).join('');
  const sky=A.texture((c,s)=>{const g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,toHex(gradient.zenith));g.addColorStop(.48,toHex(gradient.mid));g.addColorStop(.62,toHex(gradient.horizon));g.addColorStop(1,'#171e33');c.fillStyle=g;c.fillRect(0,0,s,s);},256);
  const skyMesh=envScene.children[0];skyMesh.material.map=sky;skyMesh.material.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer),newEnv=generator.fromScene(envScene,.04);scene.environment=newEnv.texture;generator.dispose();envTarget.dispose();envTarget=newEnv;
  assetGroup=new THREE.Group();pack.board.scale.setScalar(pack.scale);assetGroup.add(pack.board);pack.environment.scale.setScalar(pack.scale);assetGroup.add(pack.environment);water.visible=false;scene.add(assetGroup);waterfront.register(assetGroup);pack.board.updateMatrixWorld(true);
  // Actual dice use the separate supplied mesh and the real match's lastDice.
  for(let i=0;i<2;i++){const pivot=new THREE.Group(),die=pack.die.clone(true);die.position.y=-.2625;die.scale.setScalar(1.5);pivot.add(die);pivot.position.set(i?.34:-.34,.455,.0);scene.add(pivot);dice.push(pivot);}
  stateKey='';boardBuilt=false;for(const o of [...tileGroup.children]){tileGroup.remove(o);o.traverse(n=>{if(n.isMesh)n.geometry.dispose()});}pick.length=0;tilePositions.length=0;resize();shadowDirty=true;
 }).catch(e=>{assetError=String(e);onError(e);});
 function occludedFarStreetLabels(){
  if(!assetPack)return[];const origin=camera.getWorldPosition(new THREE.Vector3()),probe=new THREE.Raycaster(),blocked=[];
  assetPack.board.updateWorldMatrix(true,true);
  for(let i=11;i<20;i++){const p=tilePositions[i];if(!p)continue;const point=new THREE.Vector3(p.x,.167,p.z-p.d*.2),direction=point.clone().sub(origin);probe.set(origin,direction.clone().normalize());probe.far=direction.length()-.03;
   const hits=probe.intersectObject(assetPack.board,true).filter(h=>h.object.visible&&h.point.y>.18&&Math.max(Math.abs(h.point.x),Math.abs(h.point.z))<4.1);
   if(hits.length)blocked.push({square:i,point:hits[0].point.toArray(),mesh:hits[0].object.name});
  }return blocked;
 }
 return {revision:'origins-production-local-8',occludedFarStreetLabels,mode(value){mode=value==='detail'?'detail':'board';resize();},resize,stats(){const sorted=[...times].sort((a,b)=>a-b);return{waterReflections:waterfront.stats(),renderCount,timingKind:'CPU render submission, not physical GPU timing',framing:{insets:read()?.viewport,corners:[-5.8,5.8].flatMap(x=>[-5.8,5.8].map(z=>{const q=new THREE.Vector3(x,0,z).project(camera);return{x:(q.x+1)*canvas.clientWidth/2,y:(1-q.y)*canvas.clientHeight/2};}))},exposure:renderer.toneMappingExposure,buffer:[canvas.width,canvas.height],css:[canvas.clientWidth,canvas.clientHeight],pixelRatio,tier,downgrades,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,p95:sorted.length?sorted[Math.floor(sorted.length*.95)]:null,physicalDevice:false,assets:A.audit(assetGroup||staticBatched),pack:assetPack?.report()||{loading:wantsPack,error:assetError},spaces:tilePositions.length,nativeCanvasTextures:tokenAdapter.nativeTextureCount(),diceSkin:rules?.diceSkin,diceVisualSource:rules?.diceSkin==='classic'?'supplied-classic':'native-owned-skin',ownedModels:buildings.size,deemphasizedDevelopments:[...buildings].filter(([,b])=>(b.userData.fadeMaterials||[]).some(m=>m.opacity<m.userData.original.opacity-.01)).map(([i])=>i),tokenMeshes:tokens.map(t=>t.userData.token.meshCount),tokenModes:tokens.map(t=>t.userData.token.illustrated?'illustrated':'3d'),realTime3D:true};},project(i){const p=tilePositions[i];if(!p)return null;const q=new THREE.Vector3(p.x,.15,p.z).project(camera);return{x:(q.x+1)*canvas.clientWidth/2,y:(1-q.y)*canvas.clientHeight/2};},dispose(){running=false;waterfront.dispose();renderer.dispose();reflection.dispose();envTarget.dispose();}};
}
