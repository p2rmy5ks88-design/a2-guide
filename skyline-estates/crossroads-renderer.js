/* Crossroads Capital — classic-sized circular 3D board (Career Board 3).
   Reuses classic Solo Play miniature architecture, wood/gold materials, landscaping, color bands,
   space labels, buildings and interactive tokens, retaining Landmark Chase movement and decisions.
   Only Crossroads rendering changes; all other boards and the Classic mode remain untouched. */
import * as THREE from './lib/three.module.min.js';
import {GLTFLoader} from './lib/GLTFLoader.js';
import {createMiniatures} from './presentation/production-miniatures.js';
export const PLAYER_COLORS=['#d63f51','#2c7fd4','#2bb875','#8e5cdc'];
const ART='./assets/crossroads/';
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrap(g,text,x,y,maxW,lh){const words=String(text).split(' ');let line='',lines=[];for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t}lines.push(line);lines.forEach((l,k)=>g.fillText(l,x,y+k*lh));return lines.length}

// Vector icons (no emoji) so labels stay crisp and saturated on every device.
function icon(g,kind,x,y,sz,col){g.save();g.translate(x,y);g.scale(sz/100,sz/100);g.fillStyle=col;g.strokeStyle=col;g.lineWidth=8;g.lineJoin='round';g.lineCap='round';
 const P=d=>g.fill(new Path2D(d));
 switch(kind){
  case'start':g.font='900 41px Arial,sans-serif';g.textAlign='center';g.fillText('GO',50,62);g.beginPath();g.moveTo(18,83);g.lineTo(82,83);g.lineTo(66,73);g.moveTo(82,83);g.lineTo(66,93);g.lineWidth=6;g.stroke();break;
  case'skybridge':g.beginPath();g.moveTo(9,82);g.lineTo(91,82);g.moveTo(16,82);g.quadraticCurveTo(50,12,84,82);g.moveTo(16,62);g.lineTo(16,91);g.moveTo(84,62);g.lineTo(84,91);for(const x of[32,50,68]){g.moveTo(x,57);g.lineTo(x,82)}g.lineWidth=7;g.stroke();break;
  case'property':P('M18 92V40h26v52zM52 92V14h32v78z');g.fillStyle='rgba(255,255,255,.0)';g.globalCompositeOperation='destination-out';for(const [a,b]of[[24,48],[34,48],[24,62],[34,62],[24,76],[34,76],[58,24],[72,24],[58,40],[72,40],[58,56],[72,56],[58,72],[72,72]])g.fillRect(a,b,6,8);g.globalCompositeOperation='source-over';break;
  case'transit':P('M22 12h56q10 0 10 10v48q0 10-10 10H22q-10 0-10-10V22q0-10 10-10zM22 26v22h56V26z');g.beginPath();g.moveTo(26,96);g.lineTo(36,80);g.moveTo(74,96);g.lineTo(64,80);g.stroke();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(30,64,6,0,7);g.arc(70,64,6,0,7);g.fill();g.globalCompositeOperation='source-over';break;
  case'power-grid':P('M58 4L18 56h28l-8 40 44-56H52z');break;
  case'water-works':P('M50 6C38 30 20 46 20 64a30 30 0 0060 0C80 46 62 30 50 6z');break;
  case'city-works':g.beginPath();g.arc(50,50,22,0,7);g.stroke();for(let k=0;k<8;k++){g.save();g.translate(50,50);g.rotate(k*Math.PI/4);g.fillRect(-7,-42,14,16);g.restore()}g.beginPath();g.arc(50,50,30,0,7);g.lineWidth=12;g.stroke();break;
  case'event':g.save();g.translate(50,50);g.rotate(-.18);g.fillRect(-30,-38,52,72);g.restore();g.fillStyle='#fff';g.font='900 46px Georgia,serif';g.textAlign='center';g.fillText('?',46,64);break;
  case'tax':g.beginPath();g.arc(50,54,34,0,7);g.fill();g.fillStyle='#fff';g.font='900 46px Georgia,serif';g.textAlign='center';g.fillText('¢',50,70);break;
  case'fee':P('M24 8h52v84l-10-8-8 8-8-8-8 8-8-8-10 8z');g.fillStyle='#fff';for(const y of[28,44,60])g.fillRect(34,y,32,6);break}
 g.restore()}
function tileTexture(t,colors,renderer){
 const W=320,H=600,X=2,c=document.createElement('canvas');c.width=W*X;c.height=H*X;const g=c.getContext('2d');g.scale(X,X);
 const navy='#0f1d33',gold='#c79a3e';
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#fffaf0');bg.addColorStop(1,'#f3e7cc');g.fillStyle=bg;g.fillRect(0,0,W,H);
 const band=t.district?colors[t.district]:t.type==='start'?'#13814c':t.type==='skybridge'?'#2465a5':null;
 if(band){const b=g.createLinearGradient(0,0,0,170);b.addColorStop(0,band);b.addColorStop(1,shade(band,-.18));g.fillStyle=b;g.fillRect(0,0,W,170);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(0,0,W,6);g.fillStyle=shade(band,-.35);g.fillRect(0,166,W,4);
  icon(g,t.type==='start'?'start':t.type==='skybridge'?'skybridge':'property',W/2-46,30,92,'#ffffff')}
 else{const kind=t.type==='utility'?t.id:t.type;icon(g,kind,W/2-48,26,96,t.type==='event'?'#7a3cc4':t.type==='transit'?'#1d4f8a':t.type==='utility'?(t.id==='water-works'?'#1f8fd6':t.id==='power-grid'?'#e0a10c':'#5b6676'):t.type==='tax'?'#c79a3e':'#8a5a2b')}
 // gold double border
 g.strokeStyle=gold;g.lineWidth=7;g.strokeRect(4,4,W-8,H-8);g.strokeStyle='rgba(199,154,62,.55)';g.lineWidth=2;g.strokeRect(14,14,W-28,H-28);
 // name
 const label=(t.type==='event'?'Opportunity':t.type==='start'?'Start / Payday':t.type==='skybridge'?'Skybridge Bonus':t.name).toUpperCase();g.fillStyle=navy;g.textAlign='center';g.textBaseline='alphabetic';
 let fs=52;g.font=`900 ${fs}px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;const words=label.split(' ');while(fs>34&&words.some(w=>g.measureText(w).width>W-40)){fs-=2;g.font=`900 ${fs}px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif`}
 const top=band?232:200;const lines=wrap(g,label,W/2,top,W-36,fs*1.05);
 const sub=t.type==='start'?'SALARY':t.type==='skybridge'?'LANDMARK HUB':t.type==='transit'?'TRANSIT':t.type==='utility'?'UTILITY':t.type==='tax'?'TAX':t.type==='fee'?'FEE':t.type==='event'?'DRAW A CARD':t.district?(t.district.toUpperCase()+' DISTRICT'):'';
 if(sub){g.font='800 24px -apple-system,"Helvetica Neue",Arial,sans-serif';g.fillStyle='#8a6a2a';g.letterSpacing='2px';g.fillText(sub,W/2,top+lines*fs*1.05+14);g.letterSpacing='0px'}
 // price plate
 const price=t.type==='start'?'PASS +200 CC':t.type==='skybridge'?'RIBBON CUTTING':t.price?t.price+' CC':t.charge?'PAY '+t.charge+' CC':'';
 if(price){g.fillStyle=navy;roundRect(g,26,H-118,W-52,76,16);g.fill();g.strokeStyle=gold;g.lineWidth=4;roundRect(g,26,H-118,W-52,76,16);g.stroke();g.fillStyle='#f6d987';g.font='900 46px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';g.fillText(price,W/2,H-64)}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=x=>Math.max(0,Math.min(255,Math.round(k<0?x*(1+k):x+(255-x)*k)));return'#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#5a3a22';g.fillRect(0,0,512,512);
 for(let i=0;i<140;i++){g.strokeStyle=`rgba(${30+Math.random()*40|0},${18+Math.random()*20|0},${8},${.12+Math.random()*.2})`;g.lineWidth=1+Math.random()*3;g.beginPath();const y=Math.random()*512;g.moveTo(0,y);g.bezierCurveTo(170,y+Math.random()*20-10,340,y+Math.random()*20-10,512,y);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.colorSpace=THREE.SRGBColorSpace;return t}
function windowTexture(){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,64,128);g.fillStyle='#9fb6cf';
 for(let y=8;y<128;y+=16)for(let x=6;x<64;x+=14)g.fillRect(x,y,8,9);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}


function discTexture(url,ring,renderer,onload){const S=1024,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const img=new Image();img.onload=()=>{g.save();g.beginPath();g.arc(S/2,S/2,S/2-4,0,7);g.clip();g.drawImage(img,0,0,S,S);const v=g.createRadialGradient(S/2,S/2,S*.32,S/2,S/2,S/2);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(6,14,30,.55)');g.fillStyle=v;g.fillRect(0,0,S,S);g.restore();
  g.beginPath();g.arc(S/2,S/2,S/2-10,0,7);g.lineWidth=18;g.strokeStyle=ring;g.stroke();tex.needsUpdate=true;onload&&onload()};img.src=url;return tex}
function hubTexture(t,renderer){const S=1024,X=1,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 const col={start:['#1d8a4e','#0d5a31'],exchange:['#16305c','#0a1730'],skybridge:['#1c4f8f','#0c2a55']}[t.type];
 const gr=g.createRadialGradient(S/2,S*.42,40,S/2,S/2,S/2);gr.addColorStop(0,col[0]);gr.addColorStop(1,col[1]);g.beginPath();g.arc(S/2,S/2,S/2-6,0,7);g.fillStyle=gr;g.fill();
 g.lineWidth=22;g.strokeStyle='#efc15c';g.stroke();g.beginPath();g.arc(S/2,S/2,S/2-46,0,7);g.lineWidth=5;g.strokeStyle='rgba(239,193,92,.7)';g.stroke();
 g.textAlign='center';g.fillStyle='#fff4d7';const lines={start:['START','PAYDAY'],exchange:['GRAND','EXCHANGE'],skybridge:['SKYBRIDGE','BONUS']}[t.type];
 g.font='900 150px Georgia,"Times New Roman",serif';g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=10;lines.forEach((l,k)=>{const y=S*.47+k*165;g.font=`900 ${l.length>7?132:160}px Georgia,"Times New Roman",serif`;g.strokeText(l,S/2,y);g.fillStyle=k?'#efc15c':'#fff4d7';g.fillText(l,S/2,y)});
 g.font='800 54px -apple-system,"Helvetica Neue",Arial,sans-serif';g.fillStyle='#fff4d7';g.fillText({start:'COLLECT 200 CC',exchange:'CHOOSE YOUR ROUTE',skybridge:'RIBBON CUTTING +1'}[t.type],S/2,S*.27);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex}
function labelSprite(text,color){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='rgba(10,23,48,.88)';roundRect(g,8,20,496,88,40);g.fill();g.strokeStyle=color;g.lineWidth=6;roundRect(g,8,20,496,88,40);g.stroke();
 g.fillStyle='#fff4d7';g.font='800 46px -apple-system,"Helvetica Neue",Arial,sans-serif';g.textAlign='center';g.fillText(text,256,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(1.2,.3,1);s.renderOrder=5;return s}

// Crossroads-only cinematic terrace: background meshes never enter the tile picking graph.
function installCrossroadsTerrace(scene,classic,renderer){
 const mat=(hex,metalness=0,roughness=.55)=>new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
 const bronze=mat('#c9a15b',.72,.22),deep=mat('#161b35',.38,.38),slate=mat('#49445b',.18,.69);
 const goldGlow=new THREE.MeshBasicMaterial({color:'#ffce7e',toneMapped:false});
 const aquaGlow=new THREE.MeshBasicMaterial({color:'#4fe0e4',toneMapped:false});
 // 360-degree sunset horizon responds naturally to camera rotation.
 const cv=document.createElement('canvas');cv.width=16;cv.height=512;const ctx=cv.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,512);
 for(const [p,c]of[[0,'#171a35'],[.27,'#3b376c'],[.46,'#b27398'],[.57,'#fac18b'],[.7,'#374e6b'],[1,'#17243b']])grad.addColorStop(p,c);
 ctx.fillStyle=grad;ctx.fillRect(0,0,16,512);
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(85,40,20),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false,depthWrite:false}));
 sky.position.y=-5;scene.add(sky);
 // Patterned dark-stone plaza instead of the plain brown table.
 const mc=document.createElement('canvas');mc.width=mc.height=256;const m=mc.getContext('2d');
 m.fillStyle='#343049';m.fillRect(0,0,256,256);
 for(let a=0;a<4;a++)for(let b=0;b<4;b++){
  m.fillStyle=(a+b)%2?'#413e57':'#393950';m.fillRect(a*64+2,b*64+2,60,60);
  m.strokeStyle='rgba(238,196,128,.26)';m.lineWidth=2;m.strokeRect(a*64+2,b*64+2,60,60)
 }
 const marble=new THREE.CanvasTexture(mc);marble.colorSpace=THREE.SRGBColorSpace;
 marble.wrapS=marble.wrapT=THREE.RepeatWrapping;marble.repeat.set(12,12);
 marble.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 // Open water around the stage: there is no longer an endless tiled floor.
 // A patterned luxury terrace floats over a blue harbour, with gold quay edging.
 const seaCanvas=document.createElement('canvas');seaCanvas.width=seaCanvas.height=512;
 const seaCtx=seaCanvas.getContext('2d'),sea=seaCtx.createLinearGradient(0,0,0,512);
 sea.addColorStop(0,'#103a57');sea.addColorStop(.4,'#1c6275');sea.addColorStop(.7,'#16475e');sea.addColorStop(1,'#102e52');
 seaCtx.fillStyle=sea;seaCtx.fillRect(0,0,512,512);
 for(let i=0;i<140;i++){
  const x=(i*97)%512,y=(i*131)%512,w=12+i%5*8;
  seaCtx.strokeStyle=i%3?'rgba(123,226,236,.11)':'rgba(244,206,135,.12)';
  seaCtx.lineWidth=i%4===0?2:1;seaCtx.beginPath();
  seaCtx.moveTo(x,y);seaCtx.quadraticCurveTo(x+w/2,y-3,x+w,y);seaCtx.stroke()
 }
 const seaTex=new THREE.CanvasTexture(seaCanvas);seaTex.colorSpace=THREE.SRGBColorSpace;
 seaTex.wrapS=seaTex.wrapT=THREE.RepeatWrapping;seaTex.repeat.set(9,9);
 seaTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const harbour=new THREE.Mesh(new THREE.PlaneGeometry(95,95),
  new THREE.MeshStandardMaterial({map:seaTex,metalness:.18,roughness:.29,envMapIntensity:.65}));
 harbour.rotation.x=-Math.PI/2;harbour.position.y=-.87;harbour.receiveShadow=false;scene.add(harbour);
 // This stone promenade is only 3.5 units wide, framing the board without
 // becoming another board or competing with readable property tiles.
 const floor=new THREE.Mesh(new THREE.RingGeometry(7.88,11.12,160),
  new THREE.MeshStandardMaterial({map:marble,roughness:.42,metalness:.25,side:THREE.DoubleSide}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.78;floor.receiveShadow=true;scene.add(floor);
 for(const [r,y,w,mt] of[[10.85,-.735,.031,bronze],[11.09,-.743,.018,aquaGlow]]){
  const rim=new THREE.Mesh(new THREE.TorusGeometry(r,w,9,160),mt);
  rim.rotation.x=Math.PI/2;rim.position.y=y;scene.add(rim)
 }
 const base=new THREE.Mesh(new THREE.CylinderGeometry(7.8,7.94,.30,128),deep);
 base.position.y=-.69;base.receiveShadow=true;scene.add(base);
 const step=new THREE.Mesh(new THREE.CylinderGeometry(7.17,7.23,.10,128),slate);
 step.position.y=-.49;step.receiveShadow=true;scene.add(step);
 const ring=(r,y,thick,material)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,thick,9,160),material);
  o.rotation.x=Math.PI/2;o.position.y=y;scene.add(o)};
 ring(7.74,-.53,.064,bronze);ring(7.53,-.52,.024,aquaGlow);
 ring(7.15,-.43,.036,bronze);ring(6.89,-.44,.022,goldGlow);
 // Illuminated rear balustrade plus landscaped planters.
 for(let i=0;i<=20;i++){
  const a=Math.PI+Math.PI*i/20,x=9.3*Math.cos(a),z=9.3*Math.sin(a);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.047,.060,.91,10),bronze);
  post.position.set(x,-.29,z);scene.add(post);
  const light=new THREE.Mesh(new THREE.SphereGeometry(.075,9,7),goldGlow);
  light.position.set(x,.21,z);scene.add(light)
 }
 for(const y of[-.07,.32]){
  const curve=new THREE.CatmullRomCurve3(Array.from({length:49},(_,i)=>{
   const a=Math.PI+Math.PI*i/48;return new THREE.Vector3(9.3*Math.cos(a),y,9.3*Math.sin(a))}));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,96,.025,6,false),bronze))
 }
 for(let i=0;i<12;i++){
  const a=(i+.5)*Math.PI/6,x=8.36*Math.cos(a),z=8.36*Math.sin(a);
  const urn=new THREE.Mesh(new THREE.CylinderGeometry(.39,.47,.27,16),bronze);
  urn.position.set(x,-.54,z);scene.add(urn);
  const tree=classic.tree(210+i);tree.scale.setScalar(.59);tree.position.set(x,-.34,z);scene.add(tree)
 }
 // Low-draw-call skyline landmark silhouettes visible in every camera direction.
 const N=54,body=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat('#203450',.1,.83),N);
 const tops=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),goldGlow,N);
 const unit=new THREE.Object3D(),col=new THREE.Color();
 for(let i=0;i<N;i++){
  const a=i*2*Math.PI/N,r=27+1.5*Math.sin(i*2.3),h=3.3+5.2*Math.abs(Math.sin(i*2.73));
  unit.position.set(Math.cos(a)*r,h/2-.8,Math.sin(a)*r);unit.rotation.y=-a;
  unit.scale.set(1.8+.5*Math.abs(Math.cos(i)),h,1.1);
  unit.updateMatrix();body.setMatrixAt(i,unit.matrix);
  col.setHSL(.59+.05*Math.sin(i),.46,.13+.055*Math.abs(Math.cos(i*1.7)));body.setColorAt(i,col);
  unit.position.y=h-.75;unit.scale.set(1.65,.018,.9);
  unit.updateMatrix();tops.setMatrixAt(i,unit.matrix)
 }
 body.instanceMatrix.needsUpdate=true;tops.instanceMatrix.needsUpdate=true;scene.add(body,tops);
 // The broad distant silhouettes above are atmospheric; these closer, detailed
 // skyline buildings make the sunset city visible in the actual iPhone overview.
 // All sit behind the terrace (z < -9.7) and are NEVER raycast for game actions.
 const vista=new THREE.Group();scene.add(vista);
 const facadeCanvas=document.createElement('canvas');facadeCanvas.width=256;facadeCanvas.height=512;
 const fc=facadeCanvas.getContext('2d');fc.fillStyle='#254663';fc.fillRect(0,0,256,512);
 for(let yy=24;yy<500;yy+=52)for(let xx=18;xx<250;xx+=43){
  fc.fillStyle=(Math.sin(xx*3.7+yy*.83)>.05)?'#f2cb85':'#6babc2';
  fc.fillRect(xx,yy,24,34);fc.fillStyle='#182f49';fc.fillRect(xx+11,yy,2,34);
  fc.fillStyle='#1c314e';fc.fillRect(xx,yy+17,24,2)
 }
 const facadeTex=new THREE.CanvasTexture(facadeCanvas);facadeTex.colorSpace=THREE.SRGBColorSpace;
 facadeTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const duskGlass=new THREE.MeshStandardMaterial({map:facadeTex,color:'#b5d7ee',metalness:.48,roughness:.24,
  emissive:'#f2b96b',emissiveIntensity:.10});
 const roofMetal=new THREE.MeshStandardMaterial({color:'#28365a',metalness:.6,roughness:.3});
 const ridge=new THREE.MeshBasicMaterial({color:'#f5c86e',toneMapped:false});
 const tall=[
  [-7.65,3.9,1.30],[-6.30,5.35,1.08],[-4.95,3.5,1.38],[-3.56,4.5,1.04],
  [3.57,4.18,1.1],[4.87,3.45,1.31],[6.20,5.10,1.08],[7.55,4.0,1.32]
 ];
 for(let i=0;i<tall.length;i++){
  const [x,h,w]=tall[i],z=-11.55-.35*Math.abs(Math.sin(i*1.9));
  const building=new THREE.Mesh(new THREE.BoxGeometry(w,h,.84),duskGlass);
  building.position.set(x,-.75+h/2,z);building.receiveShadow=false;vista.add(building);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.09,.09,.93),roofMetal);
  roof.position.set(x,h-.70,z);vista.add(roof);
  const rim=new THREE.Mesh(new THREE.BoxGeometry(w+.11,.026,.96),ridge);
  rim.position.set(x,h-.64,z);vista.add(rim);
  if(i===1||i===6){const spire=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.65,8),ridge);
   spire.position.set(x,h-.29,z);vista.add(spire)}
 }
 // Warm twilight light on the skyline's rear facades, with no expensive shadows.
 const glow=new THREE.PointLight('#ffad73',1.6,25,2);glow.position.set(0,3,-12);scene.add(glow);
 // The rear title is only for overview; it must not obscure moving tokens.
 const marquee=new THREE.Group();marquee.position.set(0,.95,-8.15);scene.add(marquee);
 const sign=new THREE.Mesh(new THREE.BoxGeometry(4.6,.96,.16),deep);marquee.add(sign);
 const outer=new THREE.Mesh(new THREE.BoxGeometry(4.7,1.07,.08),bronze);outer.position.z=-.11;marquee.add(outer);
 const label=document.createElement('canvas');label.width=1024;label.height=256;
 const gg=label.getContext('2d');gg.textAlign='center';gg.fillStyle='#fff4d0';gg.font='900 78px Georgia,serif';gg.fillText('SKYLINE ESTATES',512,84);
 gg.fillStyle='#f9cb70';gg.font='900 114px Arial,sans-serif';gg.fillText('CROSSROADS',512,175);gg.font='900 64px Arial,sans-serif';gg.fillText('CAPITAL',512,239);
 const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
 const lettering=new THREE.Mesh(new THREE.PlaneGeometry(4.5,.9),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));
 lettering.position.z=.091;marquee.add(lettering);
 return{marquee};
}

// Cinematic *decorative* living-city assets, entirely within the Crossroads scene.
// None of these meshes participate in tile picking, token routing or saved gameplay.
function installCrossroadsLivingCity(core,classic){
 const ivory=classic.mats.ivory,gold=classic.mats.gold,glass=classic.mats.glass;
 const navy=classic.mats.navy,foliage=classic.mats.foliageLight;
 const add=(geo,mat,x,y,z,parent=core)=>{const o=new THREE.Mesh(geo,mat);
  o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
 const box=(mat,x,y,z,w,h,d)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 function sign(text,w=.8,h=.18){
  const c=document.createElement('canvas');c.width=768;c.height=160;
  const ctx=c.getContext('2d');ctx.fillStyle='#142641';ctx.fillRect(0,0,768,160);
  ctx.strokeStyle='#e1b65d';ctx.lineWidth=11;ctx.strokeRect(6,6,756,148);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff2c9';
  let size=90;do{ctx.font='900 '+size+'px Arial,sans-serif';size-=3}
  while(ctx.measureText(text).width>705&&size>30);
  ctx.fillText(text,384,83);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),
   new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));
 }
 // A proper column-fronted City Hall along the near-side boulevard.
 const town=new THREE.Group();town.position.set(0,.15,2.45);core.add(town);
 const b=(mat,x,y,z,w,h,d)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,town);
 b(gold,0,.075,0,1.50,.14,1.08);
 b(ivory,0,.19,-.02,1.34,.31,.76);
 b(glass,0,.46,-.06,1.16,.34,.61);
 b(ivory,0,.64,-.05,1.35,.085,.80);
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.185;
  add(new THREE.CylinderGeometry(.033,.043,.44,12),ivory,x,.40,.35,town);
  b(gold,x,.61,.35,.10,.026,.10)
 }
 const pediment=new THREE.Shape();pediment.moveTo(-.72,0);pediment.lineTo(.72,0);pediment.lineTo(0,.24);pediment.closePath();
 const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(pediment,
  {depth:.12,bevelEnabled:true,bevelSize:.022,bevelThickness:.02,bevelSegments:1}),ivory);
 roof.position.set(0,.69,.34);roof.castShadow=true;town.add(roof);
 for(const x of[-.55,-.35,.35,.55])b(gold,x,.32,.265,.038,.24,.028);
 for(let i=0;i<3;i++)b(ivory,0,.015,.64+i*.14,1.25-i*.12,.027,.13);
 const hallSign=sign('CITY HALL',.81,.16);hallSign.position.set(0,.585,.41);town.add(hallSign);
 // A second recognizable landmark: gold-and-blue domed Civic Center.
 const civicSign=sign('CIVIC CENTER',.89,.15);
 civicSign.position.set(2.35,.71,1.19);core.add(civicSign);
 for(const dx of[-.45,.45]){
  const hedge=add(new THREE.SphereGeometry(.14,10,7),foliage,2.35+dx,.21,1.16);
  hedge.castShadow=false
 }
 // A warm-stone quay, rounded cyan lagoon edge and gold-lit pedestrian amenities.
 const ring=new THREE.Mesh(new THREE.RingGeometry(.99,1.025,96),
  new THREE.MeshBasicMaterial({color:'#ffe5ad',side:THREE.DoubleSide,toneMapped:false}));
 ring.rotation.x=-Math.PI/2;ring.scale.set(1.64,.78,1);
 ring.position.set(0,.151,-1.67);core.add(ring);
 for(let i=0;i<10;i++){
  const a=Math.PI*i/9,r=1.72,x=Math.cos(a)*r,z=-1.67+.83*Math.sin(a);
  const lamp=classic.lamp();lamp.scale.setScalar(.55);lamp.position.set(x,.15,z);
  core.add(lamp)
 }
 // Flowering shrubs (instanced to avoid one draw call per flower).
 const bloomColors=['#f85f85','#eec95a','#ff8f92','#d35ab4'];
 const petals=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045,0),
  new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.75}),72);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<72;i++){
  const j=i%18,k=Math.floor(i/18),a=j*Math.PI*2/18+k*.075;
  const r=2.9+.10*Math.sin(i*3.1),x=r*Math.cos(a),z=r*Math.sin(a);
  dummy.position.set(x,.17+.045*(.5+.5*Math.sin(i*7.2)),z);
  dummy.scale.setScalar(.7+.35*Math.abs(Math.sin(i*1.37)));dummy.updateMatrix();
  petals.setMatrixAt(i,dummy.matrix);
  petals.setColorAt(i,color.set(bloomColors[k%4]))
 }
 petals.instanceMatrix.needsUpdate=true;core.add(petals);
 // Actual moving miniature street traffic, completely independent of turns.
 const traffic=[];
 const paint=['#ffca39','#286bbd','#dc526a','#35aab0'];
 const chassis=new THREE.BoxGeometry(.20,.12,.38),glassCab=new THREE.BoxGeometry(.16,.08,.17);
 const wheelGeo=new THREE.CylinderGeometry(.047,.047,.035,10);
 const wheelMat=new THREE.MeshStandardMaterial({color:'#1b212a',roughness:.8});
 for(let i=0;i<4;i++){
  const car=new THREE.Group(),body=new THREE.Mesh(chassis,
   new THREE.MeshStandardMaterial({color:paint[i],roughness:.28,metalness:.28}));
  body.position.y=.17;car.add(body);
  const cab=new THREE.Mesh(glassCab,glass);cab.position.set(0,.27,-.04);car.add(cab);
  for(const x of[-.12,.12])for(const z of[-.10,.10]){
   const wheel=new THREE.Mesh(wheelGeo,wheelMat);
   wheel.rotation.z=Math.PI/2;wheel.position.set(x,.12,z);car.add(wheel)
  }
  car.userData.speed=[.000040,.000035,.000048,.000038][i];
  car.userData.angle=i*Math.PI/2+.28;
  car.position.y=.02;core.add(car);traffic.push(car)
 }
 function tick(ms){for(const car of traffic){
  const a=car.userData.angle+ms*car.userData.speed,r=3.65;
  car.position.set(r*Math.cos(a),.02,r*Math.sin(a));
  car.rotation.y=-a
 }}
 tick(0);
 return{tick,landmarks:2,trafficCount:traffic.length};
}

export function createCrossroadsRenderer(canvas,{rules,onTile}={}){
 const CC=rules,TILES=CC.TILES,BY=CC.BY;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');const maxDpr=Math.min(devicePixelRatio||1,3);let dpr=maxDpr;renderer.setPixelRatio(dpr);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#130d09');scene.fog=new THREE.Fog('#130d09',30,70);
 const camera=new THREE.PerspectiveCamera(40,1,.1,220);
 {const env=new THREE.Scene(),cv=document.createElement('canvas');cv.width=16;cv.height=256;const g=cv.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#24365e');gr.addColorStop(.42,'#ffcf8a');gr.addColorStop(.55,'#ffe7c0');gr.addColorStop(1,'#3a2414');g.fillStyle=gr;g.fillRect(0,0,16,256);
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.BackSide})));
  for(const [x,y,z,c]of[[18,22,10,'#fff1d6'],[-20,14,-8,'#ffd79a'],[0,30,-18,'#ffffff']]){const m=new THREE.Mesh(new THREE.PlaneGeometry(14,8),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m)}
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(env,.04).texture;scene.environmentIntensity=.55;pm.dispose()}
 scene.add(new THREE.HemisphereLight('#fff6ea','#4a3524',.55));
 const sun=new THREE.DirectionalLight('#fff0d8',1.55);sun.position.set(-7,15,10);sun.castShadow=true;sun.shadow.mapSize.set(maxDpr>=2?4096:2048,maxDpr>=2?4096:2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:8,bottom:-8,near:1,far:45});sun.shadow.bias=-.0006;scene.add(sun);
 const lamp=new THREE.PointLight('#ffc27a',8,24,1.6);lamp.position.set(0,6,-7);scene.add(lamp);
 let dirty=true;

 // ---- circular, classic-sized Skyline tabletop: one perimeter, two route arcs ----
 // Crossroads retains its established Landmark Chase rules and route choices:
 // west travels counter-clockwise from Start to Skybridge, east clockwise.
 // Both meet at the south hub and visit Grand Exchange in the playable centre.
 // The two original discs are deliberately gone: visually this is ONE circular board,
 // at the 11.7-unit diameter of the classic Solo Play tabletop.
 const classic=createMiniatures({tier:maxDpr>=2?'medium':'low'});
 const terrace=installCrossroadsTerrace(scene,classic,renderer);
 const R_OUT=5.49,R_IN=4.03,R_MID=(R_OUT+R_IN)/2,RIM=5.84;
 const CW=new THREE.Vector3(-1.76,0,0),CE=new THREE.Vector3(1.76,0,0);
 const gold=classic.mats.gold,navy=classic.mats.navy;
 const radial=(angle,r)=>new THREE.Vector3(r*Math.cos(angle),0,r*Math.sin(angle));
 const tabletop=new THREE.Mesh(new THREE.CylinderGeometry(RIM,RIM+.06,.43,128),classic.mats.walnut);
 tabletop.position.y=-.34;tabletop.receiveShadow=true;tabletop.castShadow=true;scene.add(tabletop);
 const bottomRim=new THREE.Mesh(new THREE.TorusGeometry(RIM-.11,.10,10,144),gold);
 bottomRim.rotation.x=Math.PI/2;bottomRim.position.y=-.12;scene.add(bottomRim);
 const topDeck=new THREE.Mesh(new THREE.CylinderGeometry(R_OUT+.13,R_OUT+.13,.09,128),navy);
 topDeck.position.y=-.045;topDeck.receiveShadow=true;scene.add(topDeck);
 const outerRail=new THREE.Mesh(new THREE.TorusGeometry(R_OUT+.17,.065,12,160),gold);
 outerRail.rotation.x=Math.PI/2;outerRail.position.y=.015;scene.add(outerRail);
 const innerRail=new THREE.Mesh(new THREE.TorusGeometry(R_IN-.04,.043,12,160),gold);
 innerRail.rotation.x=Math.PI/2;innerRail.position.y=.042;scene.add(innerRail);
 const core=new THREE.Group();scene.add(core);
 classic.disk(core,'foliageLight',0,.003,0,3.89,.065);
 // Premium waterfront city: a landscaped inner circular park with a playable
 // Grand Exchange hub, waterfront, bridge, ring road and clearly separated
 // building plots. These are decorative meshes: all click targets stay intact.
 const green=new THREE.MeshStandardMaterial({color:'#58a35c',roughness:.91});
 const hedge=new THREE.MeshStandardMaterial({color:'#35763e',roughness:.94});
 const stone=new THREE.MeshStandardMaterial({color:'#f7e4c0',roughness:.52});
 const water=new THREE.MeshPhysicalMaterial({color:'#17c0e8',metalness:.15,roughness:.14,
  clearcoat:.9,clearcoatRoughness:.09,transparent:false});
 const brightGold=new THREE.MeshBasicMaterial({color:'#ffd67c',toneMapped:false});
 const lake=new THREE.Mesh(new THREE.CircleGeometry(1,96),water);
 lake.rotation.x=-Math.PI/2;lake.scale.set(1.64,.78,1);
 lake.position.set(0,.13,-1.67);lake.receiveShadow=false;core.add(lake);
 const lakeEdge=new THREE.Mesh(new THREE.RingGeometry(.997,1.075,96),
  new THREE.MeshStandardMaterial({color:'#fff5d7',metalness:.16,roughness:.4,side:THREE.DoubleSide}));
 lakeEdge.rotation.x=-Math.PI/2;lakeEdge.scale.set(1.64,.78,1);
 lakeEdge.position.set(0,.141,-1.67);core.add(lakeEdge);
 // An actual driving ring, instead of the old flat intersection across the city.
 const road=new THREE.Mesh(new THREE.RingGeometry(3.47,3.82,112),
  new THREE.MeshStandardMaterial({color:'#2e3439',roughness:.9,side:THREE.DoubleSide}));
 road.rotation.x=-Math.PI/2;road.position.y=.081;road.receiveShadow=true;core.add(road);
 for(let k=0;k<48;k++){const a=k*2*Math.PI/48,r=3.65;
  const dash=new THREE.Mesh(new THREE.BoxGeometry(.095,.012,.023),classic.mats.ivory);
  dash.position.set(Math.cos(a)*r,.098,Math.sin(a)*r);dash.rotation.y=-a;core.add(dash)}
 for(const r of[3.47,3.81]){const curb=new THREE.Mesh(new THREE.TorusGeometry(r,.025,8,112),stone);
  curb.rotation.x=Math.PI/2;curb.position.y=.093;core.add(curb)}
 // The road to the Grand Exchange remains physically depicted, but the giant
 // four-way parking-lot cross is replaced with civic landscaping.
 classic.box(core,'asphalt',0,.069,1.17,.57,.035,2.15);
 for(const x of[-.31,.31])classic.box(core,'ivory',x,.098,1.17,.021,.012,2.08);
 for(const [x,z] of [[-2.6,.05],[2.6,.05],[-1.82,1.72],[1.82,1.72]]){
  const lawn=new THREE.Mesh(new THREE.CylinderGeometry(.48,.50,.052,24),green);
  lawn.position.set(x,.073,z);core.add(lawn);
  const border=new THREE.Mesh(new THREE.TorusGeometry(.48,.033,8,32),stone);
  border.rotation.x=Math.PI/2;border.position.set(x,.112,z);core.add(border)}
 // Boat, arch and fountain are deliberately behind the hub, keeping it selectable.
 {const yacht=classic.yacht();yacht.position.set(-.95,.16,-1.62);yacht.scale.setScalar(.55);
  yacht.rotation.y=.45;core.add(yacht)}
 for(const [dx,dz,h]of[[.75,-1.84,.37],[1.07,-1.65,.48],[.90,-1.40,.33]]){
  const plume=new THREE.Mesh(new THREE.CylinderGeometry(.018,.045,h,8),
   new THREE.MeshBasicMaterial({color:'#e9fbff',transparent:true,opacity:.78,depthWrite:false}));
  plume.position.set(dx,.16+h/2,dz);core.add(plume);
  const foam=new THREE.Mesh(new THREE.RingGeometry(.075,.10,16),
   new THREE.MeshBasicMaterial({color:'#e6ffff',transparent:true,opacity:.82,side:THREE.DoubleSide}));
  foam.rotation.x=-Math.PI/2;foam.position.set(dx,.157,dz);core.add(foam)}

 for(const [x,z,stage,kind,scale]of[
  [-2.83,-1.70,3,'residential',.78],[-1.83,-2.23,4,'financial',.78],[-.9,-2.75,2,'residential',.70],
  [1.15,-2.72,4,'financial',.75],[2.70,-1.62,3,'residential',.76],
  [-2.79,1.69,3,'residential',.72],[-1.73,2.43,3,'financial',.74],
  [.92,2.74,2,'residential',.72],[2.66,1.79,4,'financial',.77],
  [-2.42,.93,2,'residential',.65],[2.38,-.94,3,'financial',.68]
 ]){
   const house=classic.building(kind,stage,Math.round(Math.abs(x*17+z*11))%3);
   house.position.set(x,.086,z);house.scale.setScalar(scale);house.rotation.y=Math.atan2(x,z);
   core.add(house);
 }
 // Classic Solo's green courtyards and civic fountains make the centre a living city,
 // without covering the perimeter property names or the playable Grand Exchange.
 for(const [x,z,garden] of [[-1.4,1.18,true],[1.38,1.18,true],
                             [-2.18,-.38,false],[2.18,-.38,false]]){
  classic.box(core,'limestone',x,.090,z,1.18,.065,1.10);
  classic.box(core,garden?'foliageLight':'paving',x,.131,z,1.07,.025,.99);
  for(const dz of[-.38,.38])classic.box(core,'gold',x,.156,z+dz,.95,.014,.022);
  if(garden){
   for(const [dx,dz,n]of[[-.29,-.27,1],[.29,.24,2]]){
    const tree=classic.tree(Math.round((x+5)*19+(z+5)*7+n));
    tree.scale.setScalar(.45);tree.position.set(x+dx,.165,z+dz);core.add(tree);
   }
   classic.box(core,'paving',x,.159,z,.74,.012,.12);
  }else{
   const pool=classic.disk(core,'glass',x,.167,z,.30,.020);
   pool.castShadow=false;
   const centre=classic.disk(core,'ivory',x,.190,z,.065,.045);
   centre.castShadow=false;
   for(const dx of[-.35,.35]){const lamp=classic.lamp();lamp.scale.setScalar(.44);
    lamp.position.set(x+dx,.170,z+.35);core.add(lamp)}
  }
 }
 for(let i=0;i<20;i++){const a=i*Math.PI/10,r=3.14,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.abs(x)<.55||Math.abs(z)<.55)continue;
  const tree=classic.tree(i+27);tree.scale.setScalar(.54);tree.position.set(x,.06,z);core.add(tree)}
 for(let i=0;i<12;i++){const a=(i+.5)*Math.PI/6,r=3.29;
  const light=classic.lamp();light.scale.setScalar(.72);light.position.set(Math.cos(a)*r,.057,Math.sin(a)*r);core.add(light)}
 // Dark chocolate/burnished-gold table furniture and true 3D paths between hubs.
 // The central boulevard stops at City Hall, leaving the turquoise water in full view.
 const tileMeshes={},tileInfo={},pick=[];
 // Counter-clockwise west arc, clockwise east arc: precisely one shared circular perimeter.
 const ringOrder=['START',...Array.from({length:15},(_,k)=>'W'+String(k).padStart(2,'0')),
  'SKY',...Array.from({length:15},(_,k)=>'E'+String(14-k).padStart(2,'0'))];
 const SEG=2*Math.PI/ringOrder.length,GAP=.010;
 function sectorGeometry(t0,t1,r0,r1,nu=12,nv=2){
  const pos=[],uv=[],indices=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
   const u=i/nu,v=j/nv,p=radial(t0+(t1-t0)*u,r1+(r0-r1)*v);
   // The property colour bar faces the inner city, just like Classic Solo tiles.
   pos.push(p.x,0,p.z);uv.push(1-u,v);
  }
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
   const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  if(geo.attributes.normal.getY(0)<0){
   geo.setIndex(indices.map((v,k)=>indices[k-k%3+[0,2,1][k%3]]));
   geo.computeVertexNormals()
  }
  return geo;
 }
 function sectorSolid(t0,t1,r0,r1,h){
  const shape=new THREE.Shape(),n=16;
  for(let i=0;i<=n;i++){const p=radial(t0+(t1-t0)*i/n,r1);i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z)}
  for(let i=n;i>=0;i--){const p=radial(t0+(t1-t0)*i/n,r0);shape.lineTo(p.x,-p.z)}
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:12});
  geo.rotateX(-Math.PI/2);return geo;
 }
 const tileData=t=>({...t,district:t.group,
  charge:t.type==='tax'?200:t.type==='fee'?150:undefined,
  id:t.type==='utility'?(t.id==='W07'?'water-works':'power-grid'):t.id,
  type:t.type==='metro'?'transit':t.type,
  name:t.type==='metro'?t.name.replace(' Line',''):t.name});
 for(let i=0;i<ringOrder.length;i++){
  const id=ringOrder[i],t=BY[id],mid=Math.PI/2+i*SEG;
  const a=mid-SEG/2+GAP,b=mid+SEG/2-GAP,grp=new THREE.Group();scene.add(grp);
  const solid=new THREE.Mesh(sectorSolid(a,b,R_IN,R_OUT,.11),
   new THREE.MeshStandardMaterial({color:'#f3ead4',roughness:.7}));
  solid.castShadow=solid.receiveShadow=true;grp.add(solid);
  const ftex=tileTexture(tileData(t),CC.GROUP_COLORS,renderer);
  const face=new THREE.Mesh(sectorGeometry(a,b,R_IN+.035,R_OUT-.035,16,2),
   new THREE.MeshBasicMaterial({map:ftex,toneMapped:false,fog:false,side:THREE.DoubleSide}));
  face.position.y=.127;face.receiveShadow=true;grp.add(face);
  const ring=new THREE.Mesh(sectorSolid(a-.006,b+.006,R_IN-.035,R_OUT+.035,.09),
   new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.4}));
  ring.position.y=-.012;ring.visible=false;grp.add(ring);
  const glow=new THREE.Mesh(sectorGeometry(a,b,R_IN,R_OUT,8,1),
   new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  glow.position.y=.134;grp.add(glow);
  solid.userData.tile=face.userData.tile=id;pick.push(solid,face);
  const outward=radial(mid,1),tangent=new THREE.Vector3(-outward.z,0,outward.x);
  tileMeshes[id]={grp,face,ring,glow,building:null,loop:t.loop||null};
  tileInfo[id]={pos:radial(mid,R_MID),outer:radial(mid,R_OUT-.25),
   inner:radial(mid,R_MID-.38),build:radial(mid,R_IN-.17),
   perp:outward.clone().negate(),dir:tangent,center:new THREE.Vector3(0,0,0)};
 }
 // Grand Exchange is a real selectable tile in the central civic plaza and the
 // connecting node of the actual movement graph, not an ornamental illustration.
 {const id='EXCHANGE',t=BY[id],grp=new THREE.Group();scene.add(grp);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.90,.97,.22,80),gold);
  rim.position.y=.135;rim.castShadow=true;grp.add(rim);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.82,.84,.26,80),navy);cap.position.y=.20;grp.add(cap);
  const tex=hubTexture(t,renderer);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.82,80),
   new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));
  face.rotation.x=-Math.PI/2;face.position.y=.335;grp.add(face);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.95,80),
   new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:0,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.342;grp.add(glow);
  rim.userData.tile=cap.userData.tile=face.userData.tile=id;pick.push(rim,cap,face);
  tileMeshes[id]={grp,glow,hub:true};
  tileInfo[id]={pos:new THREE.Vector3(0,0,0),outer:new THREE.Vector3(0,0,.30),
   perp:new THREE.Vector3(0,0,-1),dir:new THREE.Vector3(1,0,0),
   center:new THREE.Vector3(0,0,-1),hub:true,y:.34};
 }
 // Familiar 3D bridge, civic dome and celebratory details from Solo Play.
 {const civic=classic.civic();civic.position.set(2.35,.14,.72);civic.scale.setScalar(.73);core.add(civic);
  const bridge=classic.bridge(1.52,.50);bridge.position.set(0,.16,-1.70);core.add(bridge);
  // Landmark cable-stayed mast and tension cables: visual-only 3D geometry.
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.045,.060,1.55,12),classic.mats.ivory);
  mast.position.set(0,.88,-1.70);mast.castShadow=true;core.add(mast);
  const stays=new THREE.Group();core.add(stays);
  for(const dz of[-.67,-.45,-.22,.22,.45,.67]){
   const start=new THREE.Vector3(0,1.60,-1.70),end=new THREE.Vector3(0,.23,-1.70+dz);
   const cable=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,start.distanceTo(end),8),
    classic.mats.gold);
   cable.position.copy(start).add(end).multiplyScalar(.5);
   cable.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());
   stays.add(cable)
  }
  const arch=new THREE.Mesh(new THREE.TorusGeometry(.78,.046,12,56,Math.PI),gold);
  arch.position.set(0,.20,-5.25);arch.castShadow=true;scene.add(arch)}
 
 const livingCity=installCrossroadsLivingCity(core,classic);

 // ---- buildings (6 stages) and landmark miniatures ----
 const winTex=windowTexture(),proto=[],props={},lmProto=[];const loader=new GLTFLoader(),base='./assets/approved-v5/';
 const fit=(obj,w)=>{const b=new THREE.Box3().setFromObject(obj),size=b.getSize(new THREE.Vector3()),k=w/Math.max(size.x,size.z);obj.scale.setScalar(k);const b2=new THREE.Box3().setFromObject(obj);obj.position.y-=b2.min.y;const c=b2.getCenter(new THREE.Vector3());obj.position.x-=c.x;obj.position.z-=c.z;const g=new THREE.Group();g.add(obj);return g};
 Promise.all(['dev_0_lot','dev_1_midrise_L1','dev_2_midrise_L2','dev_3_highrise_L3','dev_4_highrise_L4','dev_5_skyscraper_L5'].map(f=>loader.loadAsync(base+'buildings/'+f+'.glb').then(x=>x.scene))).then(list=>{list.forEach((sc,k)=>{sc.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});proto[k]=fit(sc,[.36,.32,.3,.28,.27,.26][k])});for(const id in tileMeshes)tileMeshes[id].key=null;if(view)sync(view)}).catch(e=>console.warn('Crossroads building models',e));
 Promise.all(['financial_tower_crown','grand_boulevard_palace','financial_tower_spire'].map(f=>loader.loadAsync(base+'buildings/'+f+'.glb').then(x=>x.scene))).then(list=>{list.forEach((sc,k)=>{sc.traverse(o=>{if(o.isMesh)o.castShadow=true});lmProto[k]=fit(sc,[.5,.75,.5][k])});lmKey='';if(view)sync(view)}).catch(e=>console.warn('Crossroads landmark models',e));
 Promise.all(['palm','street_lamp','yacht'].map(f=>loader.loadAsync(base+'props/'+f+'.glb').then(x=>x.scene))).then(([palm,lamp,yacht])=>{props.palm=fit(palm,.5);props.lamp=fit(lamp,.12);props.yacht=fit(yacht,.44);rebuildTokens();
  for(const [x,z,s] of[[-2.5,5.9,.9],[2.5,5.9,.9],[-2.5,-5.9,.9],[2.5,-5.9,.9],[-5.8,1.6,1.1],[-5.8,-1.6,1.1],[5.8,1.6,1.1],[5.8,-1.6,1.1]]){const p=props.palm.clone();p.position.set(x,Math.abs(x)<2?.02:-.30,z);p.scale.multiplyScalar(s);p.rotation.y=x*z;p.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(p)}
  for(const [x,z] of[[-.62,1.7],[.62,1.7],[-.62,-1.7],[.62,-1.7]]){const l=props.lamp.clone();l.position.set(x,.04,z);l.scale.multiplyScalar(1.6);scene.add(l)}dirty=true}).catch(e=>console.warn('Crossroads props',e));
 function building(stage,color){if(proto[stage]){const g=new THREE.Group(),m=proto[stage].clone(true);g.add(m);const pad=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.02,32),new THREE.MeshStandardMaterial({color,roughness:.5}));pad.position.y=.01;g.add(pad);m.position.y=.02;return g}
  const g=new THREE.Group(),h=.12+stage*.11,b=new THREE.Mesh(new THREE.BoxGeometry(.24,h,.24),new THREE.MeshStandardMaterial({color,map:winTex}));b.position.y=h/2;b.castShadow=true;g.add(b);return g}
 const LM_SLOTS=[[CW,-.75,-.35],[CE,.75,-.35],[CW,.65,.6],[CE,-.65,.6],[CW,-.6,.85],[CE,.6,.85],[CW,.25,-1.0],[CE,-.25,-1.0]];let lmKey='',lmGroup=new THREE.Group();scene.add(lmGroup);
 function syncLandmarks(list,players){const key=JSON.stringify(list)+lmProto.length;if(key===lmKey)return;lmKey=key;lmGroup.clear();
  list.slice(-LM_SLOTS.length).forEach((l,k)=>{const [c,dx,dz]=LM_SLOTS[k],g=new THREE.Group(),col=players[l.pid].color;g.position.set(c.x+dx,.01,c.z+dz);
   const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.34,.38,.08,48),gold);plinth.position.y=.04;plinth.castShadow=true;g.add(plinth);
   const band=new THREE.Mesh(new THREE.TorusGeometry(.36,.025,8,48),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.5}));band.rotation.x=Math.PI/2;band.position.y=.06;g.add(band);
   const m=lmProto.length?lmProto[k%lmProto.length].clone(true):new THREE.Mesh(new THREE.ConeGeometry(.2,.6,6),gold);m.position.y=lmProto.length?.08:.38;g.add(m);
   const lab=labelSprite(l.landmark,col);lab.position.y=1.15;g.add(lab);lmGroup.add(g)});dirty=true}

 // ---- tokens ----
 const tokens=[];function rebuildTokens(){tokens.forEach((t,k)=>{if(!t||!view)return;const p=view.players[k];if((p.token||'')!=='boat')return;const pos=t.g.position.clone(),rot=t.g.rotation.y;scene.remove(t.g);t.g=makeToken(p.color||PLAYER_COLORS[k],'boat');t.g.position.copy(pos);t.g.rotation.y=rot;scene.add(t.g)});dirty=true}
 // Detailed collectible game pieces (owner request 20 Nov 2026): clear-coated enamel in the player colour on a
 // polished chrome plinth with a colour ring. Sailboat uses the approved yacht model.
 function makeToken(color,kind){const g=new THREE.Group(),m=new THREE.Group();g.add(m);
  const enamel=new THREE.MeshPhysicalMaterial({color,metalness:.25,roughness:.22,clearcoat:1,clearcoatRoughness:.08}),
   chrome=new THREE.MeshStandardMaterial({color:'#e9e6df',metalness:1,roughness:.14}),gold=new THREE.MeshStandardMaterial({color:'#e2b25a',metalness:1,roughness:.22}),
   glass=new THREE.MeshPhysicalMaterial({color:'#1b2a3d',metalness:.2,roughness:.05,clearcoat:1}),dark=new THREE.MeshStandardMaterial({color:'#17191d',roughness:.55}),
   light=new THREE.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffe9a8',emissiveIntensity:.9}),red=new THREE.MeshStandardMaterial({color:'#ff3b30',emissive:'#ff2a1f',emissiveIntensity:.6});
  const add=(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;m.add(o);return o};
  // plinth
  const plinth=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.25,0],[.265,.012],[.265,.045],[.245,.06],[.235,.075],[0,.075]].map(([x,y])=>new THREE.Vector2(x,y)),48),chrome);plinth.castShadow=true;g.add(plinth);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.252,.016,12,64),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4,metalness:.3,roughness:.3}));ring.rotation.x=Math.PI/2;ring.position.y=.04;g.add(ring);
  m.position.y=.075;
  if(kind==='car'){const sh=new THREE.Shape();sh.moveTo(-.2,.03);sh.lineTo(.2,.03);sh.quadraticCurveTo(.215,.03,.215,.06);sh.lineTo(.21,.095);sh.quadraticCurveTo(.2,.11,.16,.112);sh.lineTo(.08,.118);sh.quadraticCurveTo(.05,.18,.0,.185);sh.lineTo(-.09,.183);sh.quadraticCurveTo(-.13,.175,-.15,.12);sh.lineTo(-.19,.112);sh.quadraticCurveTo(-.215,.105,-.215,.07);sh.quadraticCurveTo(-.215,.03,-.2,.03);
   const body=new THREE.ExtrudeGeometry(sh,{depth:.17,bevelEnabled:true,bevelThickness:.02,bevelSize:.015,bevelSegments:4,curveSegments:16});body.translate(0,0,-.085);add(body,enamel);
   const win=new THREE.Shape();win.moveTo(.065,.122);win.quadraticCurveTo(.04,.172,.0,.176);win.lineTo(-.085,.174);win.quadraticCurveTo(-.118,.168,-.135,.124);win.closePath();const wg=new THREE.ExtrudeGeometry(win,{depth:.205,bevelEnabled:false});wg.translate(0,0,-.1025);add(wg,glass);
   for(const [x,z]of[[.13,.1],[-.13,.1],[.13,-.1],[-.13,-.1]]){add(new THREE.CylinderGeometry(.048,.048,.04,28),dark,x,.048,z,Math.PI/2);add(new THREE.CylinderGeometry(.026,.026,.043,20),chrome,x,.048,z,Math.PI/2)}
   for(const z of[.055,-.055]){add(new THREE.SphereGeometry(.016,12,8),light,.226,.08,z);add(new THREE.BoxGeometry(.008,.016,.03),red,-.228,.085,z)}
   add(new THREE.BoxGeometry(.012,.02,.15),chrome,.232,.055,0)}
  else if(kind==='boat'&&props.yacht){const y=props.yacht.clone(true);y.traverse(o=>{if(o.isMesh)o.castShadow=true});m.add(y);
   const stripe=new THREE.Mesh(new THREE.TorusGeometry(.21,.01,8,48,Math.PI),enamel);stripe.rotation.set(Math.PI/2,0,0);stripe.position.y=.03;stripe.scale.set(1,.42,1);m.add(stripe)}
  else if(kind==='boat'){const hull=new THREE.Shape();hull.moveTo(-.2,0);hull.lineTo(.16,0);hull.quadraticCurveTo(.24,.02,.26,.07);hull.lineTo(-.22,.07);hull.closePath();const hg=new THREE.ExtrudeGeometry(hull,{depth:.14,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:3});hg.translate(0,0,-.07);add(hg,enamel,0,.02,0);
   add(new THREE.BoxGeometry(.18,.06,.1),new THREE.MeshPhysicalMaterial({color:'#fbfaf5',roughness:.3,clearcoat:1}),-.04,.12,0);add(new THREE.CylinderGeometry(.008,.01,.42,10),chrome,.02,.32,0);
   const sail=new THREE.Shape();sail.moveTo(0,0);sail.lineTo(0,.36);sail.lineTo(-.18,0);sail.closePath();add(new THREE.ShapeGeometry(sail),new THREE.MeshStandardMaterial({color:'#fffdf6',side:THREE.DoubleSide}),.015,.13,0)}
  else if(kind==='plane'){const fus=new THREE.LatheGeometry([[0,-.24],[.03,-.22],[.05,-.15],[.055,.05],[.05,.15],[.035,.21],[0,.25]].map(([x,y])=>new THREE.Vector2(x,y)),32);add(fus,enamel,0,.2,0,0,0,-Math.PI/2);
   const wing=new THREE.Shape();wing.moveTo(.06,0);wing.lineTo(-.04,.25);wing.lineTo(-.09,.25);wing.lineTo(-.06,0);wing.closePath();const wgeo=new THREE.ExtrudeGeometry(wing,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2});
   for(const sgn of[1,-1]){const w=add(wgeo,enamel,0,.195,0,-Math.PI/2*sgn,0,0);if(sgn<0)w.scale.z=-1;add(new THREE.CylinderGeometry(.022,.026,.09,20),chrome,.0,.17,.12*sgn,0,0,Math.PI/2)}
   const tail=new THREE.Shape();tail.moveTo(0,0);tail.lineTo(-.06,.11);tail.lineTo(-.1,.11);tail.lineTo(-.08,0);tail.closePath();add(new THREE.ExtrudeGeometry(tail,{depth:.01,bevelEnabled:false}),enamel,-.15,.22,-.005);
   for(const sgn of[1,-1])add(new THREE.BoxGeometry(.05,.008,.08),enamel,-.2,.205,.05*sgn);
   add(new THREE.SphereGeometry(.035,20,12,0,Math.PI*2,0,Math.PI/2),glass,.17,.225,0,0,0,-.35);add(new THREE.CylinderGeometry(.005,.005,.17,8),chrome,0,.1,0)}
  else{ // locomotive
   add(new THREE.CylinderGeometry(.075,.075,.26,32),enamel,.03,.17,0,0,0,Math.PI/2);for(const x of[-.06,.03,.12])add(new THREE.TorusGeometry(.076,.008,8,32),gold,x,.17,0,0,Math.PI/2,0);
   add(new THREE.CylinderGeometry(.078,.078,.012,32),gold,.165,.17,0,0,0,Math.PI/2);add(new THREE.SphereGeometry(.018,12,8),light,.175,.2,0);
   add(new THREE.LatheGeometry([[.022,0],[.026,.06],[.04,.1],[.042,.11],[0,.11]].map(([x,y])=>new THREE.Vector2(x,y)),20),dark,.11,.24,0);add(new THREE.SphereGeometry(.03,16,10,0,Math.PI*2,0,Math.PI/2),gold,0,.245,0);
   add(new THREE.BoxGeometry(.13,.15,.17),enamel,-.15,.2,0);add(new THREE.CylinderGeometry(.1,.1,.19,24,1,false,0,Math.PI),dark,-.15,.275,0,Math.PI/2,0,0);
   add(new THREE.BoxGeometry(.02,.05,.12),glass,-.085,.23,0);add(new THREE.BoxGeometry(.3,.025,.15),dark,0,.085,0);
   for(const x of[.12,.02,-.08])for(const z of[.08,-.08]){add(new THREE.CylinderGeometry(.045,.045,.02,24),new THREE.MeshStandardMaterial({color:'#b3261e',metalness:.4,roughness:.4}),x,.05,z,Math.PI/2);add(new THREE.CylinderGeometry(.018,.018,.024,12),chrome,x,.05,z,Math.PI/2)}
   const cc=new THREE.Shape();cc.moveTo(0,0);cc.lineTo(.06,0);cc.lineTo(0,.06);cc.closePath();const ccg=new THREE.ExtrudeGeometry(cc,{depth:.14,bevelEnabled:false});ccg.translate(0,0,-.07);add(ccg,chrome,.17,.01,0)}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true}});g.scale.setScalar(1.3);g.userData.ring=ring;return g}
 function slot(id,pid,count){const T=tileInfo[id],off=count>1?[[-.21,-.20],[.21,-.20],[-.21,.20],[.21,.20]][pid]:[0,0];
  return T.outer.clone().add(T.dir.clone().multiplyScalar(off[0])).add(T.perp.clone().multiplyScalar(off[1]))}
 const baseY=id=>tileInfo[id].hub?.27:.13;

 // ---- camera (RESPONSIVE_CAMERA_SPEC: ROLL_FOLLOW / LANDING_FOCUS / BOARD_OVERVIEW / RETURN_TO_TOKEN) ----
 const cam={target:new THREE.Vector3(),yaw:0,pitch:THREE.MathUtils.degToRad(48),dist:14},goal={target:new THREE.Vector3(),yaw:0,pitch:THREE.MathUtils.degToRad(48),dist:14};
 let pinned=false,frameBias=1.65,mode='follow',followPid=0,userZoom=1,userYaw=0,pushIn=1,lastT=performance.now(),lastYaw=0;
 function yawAt(id,p){const T=tileInfo[id];if(!T||T.hub){return Math.abs(p.x)<.9?(p.z<-1.2?Math.PI:0):lastYaw}const d=p.clone().sub(T.center);return Math.atan2(d.x,d.z)}
 function overviewGoal(){goal.target.set(0,0,.65);goal.yaw=0;goal.pitch=THREE.MathUtils.degToRad(41);const a=camera.aspect||2.17;goal.dist=Math.max(13.6,13.6*2.05/a)}
 function followGoal(p,id){const T=tileInfo[id]||{};const inward=T.perp?T.perp.clone():new THREE.Vector3(0,0,1);goal.target.copy(p.clone().add(inward.multiplyScalar(frameBias)));const y=yawAt(id,p);lastYaw=y;goal.yaw=y+userYaw;goal.pitch=THREE.MathUtils.degToRad(43);goal.dist=6.6*userZoom/pushIn}
 function angleLerp(a,b,t){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t}
 function applyCam(dt){const k=reduceMotion.matches?1:1-Math.exp(-dt/.2);cam.target.lerp(goal.target,k);cam.yaw=angleLerp(cam.yaw,goal.yaw,k);cam.pitch+=(goal.pitch-cam.pitch)*k;cam.dist+=(goal.dist-cam.dist)*k;
  const c=Math.cos(cam.pitch)*cam.dist;camera.up.set(0,1,0);camera.position.set(cam.target.x+Math.sin(cam.yaw)*c,cam.target.y+Math.sin(cam.pitch)*cam.dist,cam.target.z+Math.cos(cam.yaw)*c);camera.lookAt(cam.target)}

 // ---- state sync ----
 let view=null,moving=false;const effects={highlight:null};
 function sync(v){view=v;
  v.players.forEach((p,k)=>{if(!tokens[k]){const t=makeToken(p.color||PLAYER_COLORS[k],p.token||['car','boat','plane','train'][k]);scene.add(t);tokens[k]={g:t,tile:p.pos}}tokens[k].g.visible=!p.out;if(!moving)tokens[k].tile=p.pos});
  if(!moving)placeTokens();
  for(const t of TILES){const T=tileMeshes[t.id];if(!T||T.hub)continue;const o=v.own[t.id];const key=o?o.owner+':'+(o.stage||0)+':'+(o.mortgaged?1:0)+':'+proto.length:'';if(T.key===key)continue;T.key=key;
   if(T.building){scene.remove(T.building);T.building=null}
   if(o){const col=v.players[o.owner].color||PLAYER_COLORS[o.owner];T.ring.visible=true;T.ring.material.color.set(col);T.ring.material.emissive=new THREE.Color(col);T.ring.material.emissiveIntensity=.35;
    if(t.type==='property'){const b=building(o.stage||0,CC.GROUP_COLORS[t.group]);const at=tileInfo[t.id].build;b.position.set(at.x,.125,at.z);b.rotation.y=yawAt(t.id,tileInfo[t.id].pos);scene.add(b);T.building=b}
    T.face.material.color.set(o.mortgaged?'#8a8a8a':'#ffffff');/* Unlit text remains readable; mortgage tint uses material.color. */}else{T.ring.visible=false;T.face.material.color.set('#ffffff');/* Unlit face returns to full readable contrast. */}}
  syncLandmarks(v.landmarks||[],v.players);dirty=true}
 function placeTokens(){const counts={};tokens.forEach((t,k)=>{if(t&&view.players[k]&&!view.players[k].out)counts[t.tile]=(counts[t.tile]||0)+1});
  tokens.forEach((t,k)=>{if(!t)return;const p=slot(t.tile,k,counts[t.tile]);t.g.position.set(p.x,baseY(t.tile),p.z);const d=tileInfo[t.tile].dir;t.g.rotation.y=Math.atan2(d.x,d.z)-Math.PI/2});dirty=true}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function moveToken(pid,path,{express=false}={}){const t=tokens[pid];if(!t||!path.length)return;moving=true;followPid=pid;if(mode==='follow')pushIn=1;if(pinned)overviewGoal();
  const step=reduceMotion.matches?0:express?420:220;
  for(const id of path){const from=t.g.position.clone(),to=slot(id,pid,1);to.y=baseY(id);const t0=performance.now(),y0=from.y;
   if(step){await new Promise(res=>{const tick=()=>{const k=Math.min(1,(performance.now()-t0)/step);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;t.g.position.lerpVectors(from,to,e);t.g.position.y=y0+(to.y-y0)*e+Math.sin(Math.PI*k)*(express?.9:.32);
     if(mode==='follow')followGoal(t.g.position.clone(),id);if(to.distanceTo(from)>.01)t.g.rotation.y=Math.atan2(to.x-from.x,to.z-from.z)-Math.PI/2;dirty=true;if(k<1)requestAnimationFrame(tick);else res()};tick()})}
   t.tile=id}
  moving=false;placeTokens();if(mode==='follow'){pushIn=1.12;followGoal(tileInfo[t.tile].pos,t.tile)}await wait(reduceMotion.matches?0:200)}
 function follow(pid){followPid=pid;if(pinned){dirty=true;return}mode='follow';userYaw=0;pushIn=1;const t=tokens[pid];if(t)followGoal(tileInfo[t.tile].pos,t.tile);dirty=true}
 function focusTile(id){if(!tileInfo[id])return;if(pinned){highlight(id);return}mode='follow';pushIn=1.12;followGoal(tileInfo[id].pos,id);highlight(id);dirty=true}
 function overview(on=true){pinned=on;mode=on?'overview':'follow';if(on)overviewGoal();else follow(followPid);dirty=true}
 function highlight(id){effects.highlight=id;dirty=true}

 // ---- input ----
 const pointers=new Map();let dragStart=null,pinch0=null,moved=false;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;dragStart={x:e.clientX,y:e.clientY,yaw:userYaw,gy:goal.yaw};if(pointers.size===2){const [a,b]=[...pointers.values()];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),z:userZoom}}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch0){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);userZoom=THREE.MathUtils.clamp(pinch0.z*pinch0.d/Math.max(20,d),.7,1.45);moved=true;refreshGoal();return}
  if(dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>8){moved=true;if(mode==='follow'){userYaw=dragStart.yaw-(e.clientX-dragStart.x)*.006;refreshGoal()}else goal.yaw=dragStart.gy-(e.clientX-dragStart.x)*.004}});
 const up=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch0=null;if(!moved&&e.type==='pointerup'&&pointers.size===0)tap(e);if(!pointers.size)dragStart=null};
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',e=>{e.preventDefault();userZoom=THREE.MathUtils.clamp(userZoom*(e.deltaY>0?1.08:.93),.7,1.45);refreshGoal()},{passive:false});
 function refreshGoal(){if(mode==='follow'){const t=tokens[followPid];if(t)followGoal(tileInfo[t.tile].pos,t.tile)}else{const y=goal.yaw;overviewGoal();goal.yaw=y;goal.dist*=userZoom}dirty=true}
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 function tap(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects(pick,false)[0];if(hit&&onTile){highlight(hit.object.userData.tile);onTile(hit.object.userData.tile)}}

 // ---- loop ----
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='overview')overviewGoal();dirty=true}
 addEventListener('resize',resize);visualViewport&&visualViewport.addEventListener('resize',resize);
 let frames=0,fpsT=performance.now(),running=true;
 function loop(now){if(!running)return;requestAnimationFrame(loop);terrace.marquee.visible=mode==='overview';const dt=Math.min(.1,(now-lastT)/1000);lastT=now;applyCam(dt);const pulse=.5+.5*Math.sin(now/300);if(!reduceMotion.matches)livingCity.tick(now);
  for(const id in tileMeshes){const T=tileMeshes[id];T.glow.material.opacity=effects.highlight===id?.35+.25*pulse:0}
  tokens.forEach((t,k)=>{if(!t)return;const on=view&&view.turn&&view.turn.pid===k;const r=t.g.userData.ring;if(r&&r.material)r.material.emissiveIntensity=on?.6+.6*pulse:.25});
  renderer.render(scene,camera);frames++;if(now-fpsT>3000){const fps=frames*1000/(now-fpsT);frames=0;fpsT=now;if(fps<28&&dpr>2){dpr=Math.max(2,dpr-.5);renderer.setPixelRatio(dpr);resize()}}}
 resize();overviewGoal();Object.assign(cam,{target:goal.target.clone(),yaw:goal.yaw,pitch:goal.pitch,dist:goal.dist});requestAnimationFrame(loop);
 return{setFrameBias(v){frameBias=v;refreshGoal()},sync,moveToken,follow,focusTile,overview,highlight,resize,
  stats:()=>({dpr,mode,zoom:userZoom,camDist:cam.dist,goalDist:goal.dist,camYaw:cam.yaw,camPitch:cam.pitch,cameraUp:camera.up.toArray(),layout:'classic-circular',environment:'harbour-terrace',followBias:'inward',landmarksDetailed:livingCity.landmarks,ambientTraffic:livingCity.trafficCount,diameter:RIM*2,perimeterTiles:ringOrder.length,tiles:Object.keys(tileMeshes).length,tokens:tokens.length,landmarks:lmGroup.children.length}),mode:()=>mode,dispose(){running=false;renderer.dispose()}}}
