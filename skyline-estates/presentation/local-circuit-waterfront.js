/* Distant waterfront scenery, assembled from the supplied local architecture.
 * Instances share the original geometry/maps. No properties or ownership here.
 */
import * as THREE from '../lib/three.module.min.js';
export function createCircuitWaterfront({midrise,spire,crown,materials,scale=35}){
 const group=new THREE.Group();group.name='Circuit distant waterfront';group.scale.setScalar(scale);group.position.set(0,-.42*scale,4.5*scale);
 const paving=materials.get('paving_warm'),stone=materials.get('marble'),gold=materials.get('gold');
 function box(mat,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;}
 box(stone,0,.02,-16,35,.45,5);box(paving,0,.27,-16,35,.05,5);
 box(gold,0,.34,-13.52,35,.025,.035);box(stone,0,.32,-13.7,35,.12,.12);
 // Two rows make a continuous, varied waterfront without cloning a whole scene.
 const fronts=Array.from({length:21},(_,i)=>({x:(i-10)*1.58,z:-14.65,y:.3,sx:1.8,sy:.9+((i*5)%9)*.10,sz:1.3,yaw:0}));
 const towers=[-15.5,-13.8,-13,-10.5,-9.2,-7.5,-5,-3.4,-2.8,0,1.4,3.8,5.7,7.4,9.3,10.2,13.8,15.5].map((x,i)=>({x,z:-16.8-(i%3)*.45,y:.3,sx:.75+(i%3)*.13,sy:.32+((i*7)%11)*.047,sz:.9,yaw:(i%3-1)*.1}));
 let batches=0,triangles=0;
 function instances(model,placements){model.updateWorldMatrix(true,true);model.traverse(o=>{if(!o.isMesh)return;const mesh=new THREE.InstancedMesh(o.geometry,o.material,placements.length),pose=new THREE.Object3D();
   placements.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.scale.set(p.sx,p.sy,p.sz);pose.rotation.y=p.yaw;pose.updateMatrix();mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(pose.matrix,o.matrixWorld));});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=false;group.add(mesh);batches++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*placements.length;
  });}
 instances(midrise,fronts);instances(spire,towers.filter((_,i)=>i%2===0));instances(crown,towers.filter((_,i)=>i%2===1));
 group.userData.audit={instances:fronts.length+towers.length,drawCalls:batches+4,triangles,sceneryOnly:true};return group;
}
