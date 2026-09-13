import * as THREE from 'three';
import {COURT} from './engine/model';

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

/** Stable park scatter: visually irregular without moving between page loads. */
export function parkTreePlacements(){
 const placements:[number,number,number][]=[];
 let seed=0x51a7b3;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const scatter=(count:number,minRadius:number,maxRadius:number,minSpacing:number)=>{
  let attempts=0;
  while(count>0&&attempts++<2000){
   // Independent angles deliberately allow loose clusters and open pockets.
   const angle=random()*Math.PI*2,radius=minRadius+Math.pow(random(),.82)*(maxRadius-minRadius);
   const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
   const outsideCourt=Math.abs(x)>COURT.width/2+2.5||Math.abs(z)>COURT.length/2+2.5;
   const spaced=placements.every(([px,pz])=>Math.hypot(x-px,z-pz)>minSpacing);
   if(!outsideCourt||!spaced)continue;
   placements.push([x,z,.68+random()*.62]);count--;
  }
 };
 scatter(18,9,27,2.2);
 scatter(36,23,78,2.8);
 return placements;
}

export class CourtTrees {
 readonly group=new THREE.Group();
 private trees:{root:THREE.Group;bounds:THREE.Box3;materials:THREE.MeshStandardMaterial[];opacity:number}[]=[];
 private courtTargets:THREE.Vector3[]=[];
 private lastUpdate=0;
 constructor(){
  const trunkGeometry=new THREE.CylinderGeometry(.14,.23,2.7,10);
  const crownGeometry=new THREE.IcosahedronGeometry(1,2);
  const placements=parkTreePlacements();
  for(const [index,[x,z,scale]] of placements.entries()){
   const root=new THREE.Group();root.position.set(x,-.13,z);root.scale.setScalar(scale);
   const foliage=['#426f55','#4f7c5c','#568267','#638c65'];
   const materials=['#78634b',foliage[index%foliage.length],index%3?'#6b9370':'#789d70'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,transparent:true}));
   const trunk=new THREE.Mesh(trunkGeometry,materials[0]);trunk.position.y=1.35;root.add(trunk);
   for(const [cx,cy,cz,r] of [[0,3.25,0,1.35],[-.65,2.75,.15,.95],[.65,2.95,-.2,1.05],[.1,4.1,.05,.85]]){
    const crown=new THREE.Mesh(crownGeometry,materials[cy>3.5?2:1]);crown.position.set(cx,cy,cz);crown.scale.set(r,r*.93,r);root.add(crown);
   }
   const near=Math.hypot(x,z)<24;
   root.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=near;object.receiveShadow=true}});
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
