/* Local planar reflections for supplied horizontal waterfront meshes.
 * One bounded render target, refreshed only with a dirty scene; no extra idle RAF.
 * Source GLBs and their normal/ORM textures remain unchanged.
 */
import * as THREE from '../lib/three.module.min.js';
export function createWaterReflections({scene,camera,getRenderer,enabled=true,maxWidth=768}){
 const surfaces=[],materials=new Set(),mirror=new THREE.PerspectiveCamera(),matrix=new THREE.Matrix4();
 let target=null,planeY=0,passes=0,lastTime=-Infinity,lastCamera='',lastViewport='',pending=true;
 const uniforms={localWaterReflection:{value:null},localWaterMatrix:{value:matrix},localWaterReady:{value:0}};
 const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),clip=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 const reflectionSky=new THREE.Color('#102540');
 const at=new THREE.Vector3(),forward=new THREE.Vector3(),up=new THREE.Vector3(),position=new THREE.Vector3();
 function register(root){
  root.updateWorldMatrix(true,true);
  root.traverse(o=>{
   if(!o.isMesh)return;
   const ms=Array.isArray(o.material)?o.material:[o.material];
   if(!ms.some(m=>/^water_/.test(m.name)))return;
   surfaces.push(o);o.geometry.computeBoundingBox();
   const p=o.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
   planeY=p.y;
   for(const m of ms){if(materials.has(m))continue;materials.add(m);
    // Keep the supplied normal and packed ORM maps. Reflectance stays restrained.
    m.normalScale.set(.32,.32);m.envMapIntensity=.85;
    m.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,uniforms);
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 localWaterMatrix; varying vec4 localWaterUV;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nlocalWaterUV=localWaterMatrix*modelMatrix*vec4(transformed,1.0);');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D localWaterReflection; uniform float localWaterReady; varying vec4 localWaterUV;').replace('#include <opaque_fragment>',`
      vec2 waterUV=localWaterUV.xy/localWaterUV.w + normal.xy*.006;
      vec2 edge=smoothstep(vec2(0.0),vec2(.05),waterUV)*smoothstep(vec2(0.0),vec2(.05),vec2(1.0)-waterUV);
      float facing=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);
      vec3 reflectedCity=texture2D(localWaterReflection,clamp(waterUV,0.0,1.0)).rgb;
      outgoingLight=mix(outgoingLight,reflectedCity,localWaterReady*(.20+.28*facing)*edge.x*edge.y);
      #include <opaque_fragment>`);
    };
    m.customProgramCacheKey=()=> 'skyline-local-planar-water-1';m.needsUpdate=true;
   }
  });pending=true;
 }
 function refresh(now=performance.now(),force=false){
  const renderer=getRenderer();if(!enabled||!surfaces.length||renderer.getContext().isContextLost())return;
  camera.updateMatrixWorld();const ck=camera.matrixWorld.elements.join(',')+'|'+camera.projectionMatrix.elements.join(',');
  const size=renderer.getDrawingBufferSize(new THREE.Vector2()),w=Math.min(maxWidth,size.x),h=Math.max(128,Math.round(w*size.y/size.x)),vp=w+'x'+h;
  if(vp!==lastViewport){target?.dispose();target=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,depthBuffer:true});target.texture.name='Skyline local waterfront reflection';uniforms.localWaterReflection.value=target.texture;lastViewport=vp;pending=true;}
  if(!pending&&!force&&ck===lastCamera&&now-lastTime<150)return;
  position.setFromMatrixPosition(camera.matrixWorld);camera.getWorldDirection(forward);at.copy(position).add(forward);up.copy(camera.up);
  position.y=2*planeY-position.y;at.y=2*planeY-at.y;up.y=-up.y;
  mirror.position.copy(position);mirror.up.copy(up);mirror.lookAt(at);mirror.near=camera.near;mirror.far=camera.far;mirror.projectionMatrix.copy(camera.projectionMatrix);mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);mirror.updateMatrixWorld();
  matrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
  const visible=surfaces.map(o=>o.visible),oldTarget=renderer.getRenderTarget(),oldClip=renderer.clippingPlanes,oldShadow=renderer.shadowMap.needsUpdate,oldBackground=scene.background;
  try{
   surfaces.forEach(o=>o.visible=false);scene.background=reflectionSky;clip.constant=-planeY;renderer.clippingPlanes=[clip];renderer.shadowMap.needsUpdate=false;
   renderer.setRenderTarget(target);renderer.render(scene,mirror);uniforms.localWaterReady.value=1;passes++;
  }finally{
   scene.background=oldBackground;renderer.setRenderTarget(oldTarget);renderer.clippingPlanes=oldClip;renderer.shadowMap.needsUpdate=oldShadow;surfaces.forEach((o,i)=>o.visible=visible[i]);
  }
  pending=false;lastCamera=ck;lastTime=now;
 }
 return{register,refresh,invalidate(){pending=true;},restore(){target=null;lastViewport='';uniforms.localWaterReady.value=0;pending=true;},stats(){return{enabled:enabled&&surfaces.length>0,surfaces:surfaces.length,passes,buffer:target?[target.width,target.height]:null,physicalDevice:false};},dispose(){target?.dispose();}};
}
