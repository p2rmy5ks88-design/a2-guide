import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';

const W=420, H=750, LENGTH=960;
const boxGeo=new T.BoxGeometry(1,1,1);
const rockGeo=new T.IcosahedronGeometry(1,0);
const treeGeo=new T.ConeGeometry(1,1,6);
const sphereGeo=new T.SphereGeometry(1,12,8);
const cylinderGeo=new T.CylinderGeometry(1,1,1,12);
const material=(color,roughness=.74,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const deck=material(0x858477), runway=material(0x4c4d48), white=material(0xe1d7b6);
const roof=material(0x526050), walls=material(0x696759), rust=material(0x9b6244);
const bluff=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
bluff.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 coastPoint;\n'+shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n coastPoint=(modelMatrix*vec4(position,1.0)).xyz;'
  );
  shader.fragmentShader=`
    varying vec3 coastPoint;
    float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float landNoise(vec2 p){
      vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),
                 mix(landHash(i+vec2(0,1)),landHash(i+vec2(1,1)),f.x),f.y);
    }
  `+shader.fragmentShader.replace('#include <color_fragment>',`
    #include <color_fragment>
    vec2 p=coastPoint.xz;
    float patches=landNoise(p*.057);
    float mineral=landNoise(p*vec2(.19,.42));
    float grains=landNoise(p*.89);
    float rocky=1.0-smoothstep(12.0,22.0,coastPoint.y);
    float relief=patches*.28+mineral*.18+grains*.12+.72;
    vec3 rockTint=mix(vec3(.69,.66,.59),vec3(1.19,1.08,.88),mineral);
    vec3 grassTint=mix(vec3(.62,.77,.52),vec3(1.03,1.06,.81),patches);
    diffuseColor.rgb*=relief*mix(grassTint,rockTint,rocky);
  `);
};
const canopy=material(0x203c43,.25,.35), body=material(0xb9bdb1,.4,.32);
const dark=material(0x394244,.55,.31), hostile=material(0x947056,.58,.21);
const rescue=material(0xb6b8a5), stripe=material(0xe6b34f);
const plume=new T.MeshBasicMaterial({color:0xffcb83});
const contact=new T.MeshBasicMaterial({color:0x151b13,transparent:true,opacity:.27,depthWrite:false});

function mesh(parent,geometry,mat,x,y,z,sx,sy,sz){
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
}
function box(parent,mat,x,y,z,sx,sy,sz){return mesh(parent,boxGeo,mat,x,y,z,sx,sy,sz);}
function wing(parent,points,mat){
  const shape=new T.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));
  shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:true,bevelSize:.65,bevelThickness:.5,bevelSegments:1,steps:1});
  geo.rotateX(Math.PI/2);
  return mesh(parent,geo,mat,0,1.5,0,1,1,1);
}
function aircraft(kind){
  const root=new T.Group();
  const jet=new T.Group();root.add(jet);root.userData.jet=jet;
  const isPetrel=kind==='petrel', enemy=kind==='kite'||kind==='dart';
  const skin=isPetrel?rescue:enemy?hostile:body;
  const width=isPetrel?35:30;
  mesh(jet,sphereGeo,skin,0,0,-3,6.6,4.1,28);
  mesh(jet,sphereGeo,canopy,0,3.8,-11,3.9,2.4,8.5);
  for(const side of [-1,1]){
    wing(jet,[[side*4,-11],[side*(width-5),8],[side*width,20],[side*12,15],[side*5,13]],skin);
    wing(jet,[[side*6,11],[side*17,22],[side*18,26],[side*8,23]],dark);
    const engine=mesh(jet,cylinderGeo,skin,side*8,0,8,3.1,22,3.1);engine.rotation.x=Math.PI/2;
    const nozzle=mesh(jet,cylinderGeo,dark,side*8,0,19,3.05,2.8,3.05);nozzle.rotation.x=Math.PI/2;
    mesh(jet,sphereGeo,plume,side*8,0,23,1.45,1.25,4.3);
    const tail=box(jet,dark,side*9,3.4,16,1.9,6.2,10);tail.rotation.z=side*-.22;
    box(jet,stripe,side*(width-6),2.3,15,2.1,.35,5.4);
    if(isPetrel)mesh(jet,sphereGeo,white,side*16,-.7,5,3.2,2.7,10);
  }
  if(enemy){jet.rotation.y=Math.PI;root.scale.setScalar(kind==='kite'?.53:.69);}
  else root.scale.setScalar(.98);
  return root;
}
async function loadKestrel(root){
  const gltf=await new GLTFLoader().loadAsync(new URL('./kestrel.glb',import.meta.url).href);
  const surface=gltf.scene.getObjectByProperty('isMesh',true);
  if(!surface)throw new Error('Kestrel geometry missing');
  const geo=surface.geometry;
  geo.computeVertexNormals();
  const positions=geo.getAttribute('position'), colors=[], tint=new T.Color();
  for(let i=0;i<positions.count;i++){
    const length=positions.getX(i), height=positions.getY(i), span=Math.abs(positions.getZ(i));
    const glass=length>-.275&&length<-.098&&span<.046&&height>.014;
    const tail=length>.31&&height>.043;
    const marking=positions.getZ(i)<-.22&&length>.019&&length<.107;
    tint.setHex(glass?0x284858:tail?0x42474a:marking?0xffc477:0xc6cbc8);
    tint.multiplyScalar(.94+.05*Math.sin(length*63+span*32));
    colors.push(tint.r,tint.g,tint.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const skin=new T.MeshStandardMaterial({vertexColors:true,metalness:.27,roughness:.48});
  const imported=new T.Mesh(geo,skin);
  imported.rotation.y=-Math.PI/2;
  imported.scale.setScalar(78);
  const jet=root.userData.jet;
  jet.clear();jet.add(imported);
  for(const side of [-1,1]){
    mesh(jet,sphereGeo,plume,side*6.4,-1,37.5,1.3,1.2,3.8);
  }
}
function ship(kind){
  const group=new T.Group();
  if(kind==='barge'){
    mesh(group,rockGeo,hostile,0,0,0,27,6,26);
    box(group,dark,0,5,-4,30,8,28);
    mesh(group,cylinderGeo,rust,0,11,4,8,4,8);
    box(group,runway,0,12,11,4,3,14);
  }else{
    mesh(group,cylinderGeo,deck,0,0,0,70,8,29);
    for(const side of [-1,1]){
      box(group,dark,side*49,4,0,27,11,38);
      mesh(group,cylinderGeo,hostile,side*49,13,-1,12,9,12);
      mesh(group,cylinderGeo,plume,side*49,18,-1,6,1.3,6);
      box(group,white,side*58,10,14,9,1,5);
    }
    box(group,walls,0,7,-5,37,18,37);
    mesh(group,cylinderGeo,canopy,0,17,-8,13,5,13);
    mesh(group,cylinderGeo,plume,0,20,-8,6,1.4,6);
  }
  return group;
}
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function bank(z,side,port){
  const wave=Math.PI*2*z/LENGTH;
  return (side?93:66)+(port?13:0)+19*Math.sin(wave*2+side)+10*Math.sin(wave*5+side*.8)+7*Math.cos(wave*9+side);
}
function bankMesh(side,port){
  const xyz=[],rgb=[],indices=[],color=new T.Color(), n=96;
  const heights=[-.65,1.6,9,20,24];
  const colors=port?[0x646953,0x93917d,0x68675a,0x575a47,0x515843]:[0x718272,0xa5987e,0x9c8b6c,0x70694f,0x46523a];
  const offsets=[9,2,-6,-22,-148];
  for(let i=0;i<=n;i++){
    const z=i*LENGTH/n, edge=bank(z,side,port);
    offsets.forEach((offset,j)=>{
      const x=edge+offset;
      xyz.push(side?W-x:x,heights[j]+Math.sin(i*2*Math.PI/n*11+j)*j*.81+Math.cos(i*2*Math.PI/n*19+j)*j*.44,z);
      color.setHex(colors[j]).multiplyScalar(.92+.09*Math.sin(i*2*Math.PI/n*13+j*3));
      rgb.push(color.r,color.g,color.b);
      if(i<n&&j<offsets.length-1){
        const k=i*offsets.length+j;
        const quad=[k,k+offsets.length,k+1,k+1,k+offsets.length,k+offsets.length+1];
        indices.push(...(side?quad:quad.reverse()));
      }
    });
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return new T.Mesh(geo,bluff);
}
function field(port){
  const tile=new T.Group(), random=rng(port?7402:2957), tmp=new T.Object3D();
  const forestMat=material(0xffffff), rockMat=material(0xffffff);
  const forest=new T.InstancedMesh(treeGeo,forestMat,260);
  const rocks=new T.InstancedMesh(rockGeo,rockMat,120);
  const foam=new T.InstancedMesh(boxGeo,new T.MeshBasicMaterial({color:0xc2bfa2,transparent:true,opacity:.44,depthWrite:false}),180);
  const color=new T.Color();
  function place(object,i,x,y,z,sx,sy,sz,turn=0){
    tmp.position.set(x,y,z);tmp.rotation.set(0,turn,0);tmp.scale.set(sx,sy,sz);tmp.updateMatrix();
    object.setMatrixAt(i,tmp.matrix);
  }
  for(const side of [0,1])tile.add(bankMesh(side,port));
  for(let i=0;i<260;i++){
    const side=i%2,z=random()*LENGTH,b=bank(z,side,port);
    const line=b+4+random()*11;
    if(i<180)place(foam,i,side?W-line:line,.17,z,1+random()*3,.12,2+random()*13,random()*.7-.35);
    if(i<120){
      const rock=b-8-random()*10,h=3+random()*8;
      place(rocks,i,side?W-rock:rock,7+random()*5,z,h*1.1,h,h*1.5,random()*7);
      rocks.setColorAt(i,color.setHex([0x8e836c,0xa49982,0x62685d,0x80775f][i%4]));
    }
    {
      const land=b-22-random()*65,h=6+random()*15;
      place(forest,i,side?W-land:land,19+h*.47,z,2.4+h*.19,h,2.4+h*.19,random()*7);
      forest.setColorAt(i,color.setHex([0x535f3d,0x465640,0x6a7046,0x394b3e][i%4]));
    }
  }
  tile.add(rocks,forest,foam);
  for(const z of [210,670]){
    const x=port?370:377;
    box(tile,walls,x,11,z,121,22,183);
    box(tile,deck,x,22,z,120,1.4,182);
    box(tile,runway,x+12,23,z,30,.4,155);
    for(let i=-3;i<=3;i++)box(tile,white,x+12,23.3,z+i*19,1.15,.18,7);
    for(let i=0;i<3;i++){
      const dz=z-55+i*26;
      box(tile,walls,x-31,27,dz,23,10,16);
      const top=box(tile,port?rust:roof,x-31,34,dz,26,4,18);top.rotation.z=.14;
    }
    box(tile,walls,x-29,33,z+58,7,23,7);
    mesh(tile,sphereGeo,white,x-29,47,z+58,5.4,5.4,5.4);
    box(tile,deck,x-72,8,z+40,30,2,14);
    box(tile,hostile,x-91,5,z+40,17,5,46);
    box(tile,white,x-91,10,z+34,11,8,17);
  }
  return tile;
}
function waterMaterial(){
  return new T.ShaderMaterial({
    uniforms:{time:{value:0},storm:{value:0}},
    vertexShader:`
      varying vec3 world;
      void main(){world=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);}
    `,
    fragmentShader:`
      uniform float time;
      uniform float storm;
      varying vec3 world;
      void main(){
        vec2 p=world.xz;
        float a=sin(dot(p,vec2(.047,.031))+time*2.0);
        float b=sin(dot(p,vec2(.125,-.075))-time*2.9+a);
        float c=sin(dot(p,vec2(.23,.095))+time*3.1+b*.5);
        float ripples=sin(dot(p,vec2(.63,-.31))+a*2.7+b+time*3.4);
        float micro=sin(dot(p,vec2(1.1,.38))+b*2.0);
        float spec=pow(max(0.0,a*.38+b*.31+c*.18+ripples*.13),5.0);
        vec3 base=mix(vec3(.115,.19,.153),vec3(.11,.145,.135),storm);
        vec3 col=base+(a*.011+b*.018+c*.012+ripples*.007+micro*.004)+spec*vec3(.29,.30,.22);
        gl_FragColor=vec4(col,1.0);
      }
    `
  });
}
export function createFlightRenderer(canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor(0x263e34);
  const scene=new T.Scene();
  const camera=new T.OrthographicCamera(-W/2,W/2,H/2,-H/2,1,900);
  camera.position.set(W/2,680,H/2);
  camera.up.set(0,0,-1);
  camera.lookAt(W/2,0,H/2);
  scene.add(new T.HemisphereLight(0xffefd8,0x657662,2.05));
  const sun=new T.DirectionalLight(0xffe6b9,2.05);sun.position.set(-210,360,-165);scene.add(sun);
  const water=waterMaterial();
  const surface=mesh(scene,new T.PlaneGeometry(W+4,H+4),water,W/2,-1,H/2,1,1,1);surface.rotation.x=-Math.PI/2;

  const fields=[field(false),field(true)].map(tile=>{
    const group=new T.Group();group.add(tile,tile.clone());scene.add(group);return group;
  });
  const craft={kestrel:aircraft('kestrel'),petrel:aircraft('petrel')};
  scene.add(craft.kestrel,craft.petrel);
  const modelReady=loadKestrel(craft.kestrel).then(()=>{canvas.dataset.aircraftModel='meshy';}).catch(error=>console.warn('Using built-in Kestrel mesh',error));
  const shadow=mesh(scene,sphereGeo,contact,0,.4,0,19,.3,12);
  const active=new Map(), unused=new Map();
  let lastX=210;
  function syncEnemies(enemies){
    const live=new Set(enemies);
    for(const [enemy,object] of active){
      if(live.has(enemy))continue;
      object.visible=false;active.delete(enemy);
      if(!unused.has(enemy.type))unused.set(enemy.type,[]);
      unused.get(enemy.type).push(object);
    }
    for(const e of enemies){
      let object=active.get(e);
      if(!object){
        object=unused.get(e.type)?.pop()||(e.type==='barge'||e.type==='ark'?ship(e.type):aircraft(e.type));
        active.set(e,object);scene.add(object);
      }
      object.visible=true;
      object.position.set(e.x,57,e.y);
    }
  }
  function resize(width,height,dpr){
    if(width<=0||height<=0)return;
    const maxPixels=3200000;
    renderer.setPixelRatio(Math.min(3,dpr||1,Math.sqrt(maxPixels/(width*height))));
    renderer.setSize(width,height,false);
  }
  function draw(run,time,route,selected){
    const offset=(time*65)%LENGTH;
    water.uniforms.time.value=time;water.uniforms.storm.value=route;
    fields.forEach((group,i)=>{
      group.visible=i===route;
      group.children[0].position.z=offset;
      group.children[1].position.z=offset-LENGTH;
    });
    syncEnemies(run?.enemies||[]);
    const x=run?.x??210, z=run?.y??500;
    const shipVisible=!run||run.inv<=0||Math.floor(run.inv*16)%2===0;
    for(const [key,model] of Object.entries(craft)){
      model.visible=key===selected&&shipVisible;
      model.position.set(x,72,z);
      model.userData.jet.rotation.z=T.MathUtils.lerp(model.userData.jet.rotation.z,T.MathUtils.clamp((lastX-x)*.075,-.34,.34),.22);
    }
    shadow.position.set(x+12,.35,z+17);shadow.visible=shipVisible;
    lastX=x;renderer.render(scene,camera);
  }
  return {draw,resize,modelReady};
}
