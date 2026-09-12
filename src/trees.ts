import * as THREE from 'three';
import {COURT} from './simulation';

/** Test the segment, not an infinite ray: trees behind play must stay visible. */
export function treeBlocksView(bounds: THREE.Box3, camera: THREE.Vector3, targets: THREE.Vector3[]) {
 if(bounds.distanceToPoint(camera)<.75)return true;
 const ray=new THREE.Ray();const hit=new THREE.Vector3();
 for(const target of targets){
  const distance=camera.distanceTo(target);
  if(distance<.001)continue;
  ray.set(camera, target.clone().sub(camera).divideScalar(distance));
  if(ray.intersectBox(bounds,hit)&&camera.distanceTo(hit)<distance)return true;
 }
 return false;
}

export class CourtTrees {
 readonly group=new THREE.Group();
 private trees:{root:THREE.Group;bounds:THREE.Box3;materials:THREE.MeshStandardMaterial[];opacity:number}[]=[];
 private courtTargets:THREE.Vector3[]=[];
 private lastUpdate=0;
 constructor(){
  const trunkGeometry=new THREE.CylinderGeometry(.14,.23,2.7,10);
  const crownGeometry=new THREE.IcosahedronGeometry(1,2);
  const placements=[[-7.8,-9,1],[-8.5,-2,.88],[-7.6,5,1.06],[-6.8,11,.92],[7.8,-9,.94],[8.4,-2,1.08],[7.7,5,.9],[6.8,11,1.02],[-3.4,-12,1.05],[3.4,-12,.9],[-3.4,13,.94],[3.4,13,1.06]];
  for(const [index,[x,z,scale]] of placements.entries()){
   const root=new THREE.Group();root.position.set(x,-.13,z);root.scale.setScalar(scale);
   const materials=['#78634b',index%2?'#568267':'#426f55','#6b9370'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,transparent:true}));
   const trunk=new THREE.Mesh(trunkGeometry,materials[0]);trunk.position.y=1.35;root.add(trunk);
   for(const [cx,cy,cz,r] of [[0,3.25,0,1.35],[-.65,2.75,.15,.95],[.65,2.95,-.2,1.05],[.1,4.1,.05,.85]]){
    const crown=new THREE.Mesh(crownGeometry,materials[cy>3.5?2:1]);crown.position.set(cx,cy,cz);crown.scale.set(r,r*.93,r);root.add(crown);
   }
   root.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true}});
   this.group.add(root);root.updateWorldMatrix(true,true);
   // Extra clearance starts the fade before foliage touches an athlete or ball.
   const bounds=new THREE.Box3().setFromObject(root).expandByScalar(.55);
   this.trees.push({root,bounds,materials,opacity:1});
  }
  // Protect the entire playable area, including baselines and overhead arcs.
  for(let x=-COURT.width/2-1;x<=COURT.width/2+1;x+=1)
   for(let z=-COURT.length/2-1;z<=COURT.length/2+1;z+=1)
    for(const y of [0,1.8,3.6])this.courtTargets.push(new THREE.Vector3(x,y,z));
 }
 update(camera:THREE.Camera,ball:THREE.Vector3,players:THREE.Vector3[]){
  const now=performance.now()/1000;const dt=this.lastUpdate?Math.min(now-this.lastUpdate,.1):1;this.lastUpdate=now;
  const targets=[ball,...players,...this.courtTargets];
  for(const tree of this.trees){
   const blocked=treeBlocksView(tree.bounds,camera.position,targets);
   // Fade away promptly and restore gently; this runs even during decision pauses.
   tree.opacity=THREE.MathUtils.damp(tree.opacity,blocked?0:1,blocked?28:6,dt);
   tree.root.visible=tree.opacity>.015;
   for(const material of tree.materials){material.opacity=tree.opacity;material.depthWrite=tree.opacity>.98}
   tree.root.traverse(object=>{if(object instanceof THREE.Mesh)object.castShadow=tree.opacity>.98});
  }
 }
}
