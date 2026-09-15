import * as THREE from 'three';
import {treeBlocksView} from './trees';

/** Sonoran desert postcard. All scenery stays outside the shared court apron. */
export class ArizonaDesert {
 readonly group=new THREE.Group();
 private obstacles:{bounds:THREE.Box3;materials:THREE.MeshStandardMaterial[]}[]=[];
 private mesh(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,parent:THREE.Object3D=this.group){const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 private box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:THREE.Object3D=this.group){return this.mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent)}
 constructor(){
  this.group.name='Arizona Desert';
  // Layered, flat-topped sandstone buttes; smaller formations nearer the court.
  for(const [x,z,r,h] of [[-20,-32,8,11],[18,-38,11,13],[32,-18,7,8],[-31,12,9,10],[9,-53,16,9],[-10,38,12,10]] as const){
   const formation=new THREE.Group();formation.position.set(x,-.15,z);this.group.add(formation);
   for(let i=0;i<5;i++){const radius=r*(1-i*.13);const tier=this.mesh(new THREE.CylinderGeometry(radius*.84,radius,h/5,7),['#bd7051','#d58b5d','#b8684d','#df9967','#c87b52'][i],0,h/10+i*h/5,0,formation);tier.rotation.y=.18;}
   this.fadeable(formation);
  }
  // Dry wash and stones make an irregular desert floor, without covering the apron.
  for(let i=0;i<26;i++){
   const x=13+Math.sin(i*.4)*2,z=-25+i*2.4;
   const stone=this.mesh(new THREE.IcosahedronGeometry(1,0),'#c69370',x,-.04,z);stone.scale.set(1.5,.12,1.4);
  }
  for(let i=0;i<75;i++){
   const angle=i*2.39996,r=12+(i%11)*2.8,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
   const rock=this.mesh(new THREE.IcosahedronGeometry(1,0),['#d69e70','#b97859','#e1b58b'][i%3],x,.1,z);rock.scale.set(.25+(i%4)*.16,.18+(i%3)*.13,.35);rock.rotation.y=i;
   if(i%4===0)this.shrub(x+.8,z+.5);
  }
  for(const [x,z,h] of [[-8,-9,4.8],[9,-14,5.8],[-10,8,4.5],[11,10,5.5],[-16,-20,6],[18,-7,4],[-23,1,5],[5,-24,4],[-5,22,5],[22,20,4.5]] as const)this.saguaro(x,z,h);
  // Low prickly pear clusters and golden barrel cacti.
  for(const [x,z] of [[-7,1],[7,6],[-8,-17],[3,-18],[17,5],[-14,15]]){
   for(let i=0;i<4;i++){const pad=this.mesh(new THREE.SphereGeometry(1,10,8),'#789575',x+(i-1.5)*.24,.35+i*.11,z);pad.scale.set(.24,.4,.12);pad.rotation.z=(i-1.5)*.3;}
   const barrel=this.mesh(new THREE.SphereGeometry(.42,12,8),'#a6a36a',x+.9,.3,z+.3);barrel.scale.y=1.2;
  }
  // Two adobe-and-timber benches, one beside each team's half.
  for(const side of [-1,1]){
   const x=side*4.6,z=-side*3.4;
   for(const dz of [-.85,.85])this.box(.65,.5,.36,x,.18,z+dz,'#d39772');
   this.box(.72,.12,2.6,x,.47,z,'#715244');
   for(const dz of [-1.05,1.05])this.box(.1,.5,.1,x+side*.27,.68,z+dz,'#715244');
   this.box(.10,.3,2.6,x+side*.30,.84,z,'#aa6850');
  }
  // A small shade ramada and a turquoise water station beside the trail.
  const shade=new THREE.Group();shade.position.set(-12,0,-4);this.group.add(shade);
  for(const x of [-1.7,1.7])for(const z of [-1.6,1.6])this.box(.17,2.9,.17,x,1.3,z,'#775844',shade);
  for(let i=0;i<12;i++)this.box(.22,.14,4,-1.9+i*.35,2.8,0,'#ac7b52',shade);
  for(const z of [-1.55,1.55])this.box(4.2,.2,.18,0,2.65,z,'#775844',shade);
  this.box(1,.85,.6,0,.3,-1.2,'#429c9b',shade);this.box(1.08,.09,.66,0,.76,-1.2,'#e9cf9e',shade);this.fadeable(shade);
 }
 private shrub(x:number,z:number){for(let i=0;i<3;i++){const bush=this.mesh(new THREE.IcosahedronGeometry(.4,0),'#a9a280',x+(i-1)*.2,.15,z);bush.scale.set(1,.6,1)}}
 private saguaro(x:number,z:number,h:number){
  const root=new THREE.Group();root.position.set(x,-.15,z);this.group.add(root);
  const tube=(radius:number,length:number,px:number,py:number,pz:number)=>this.mesh(new THREE.CapsuleGeometry(radius,length,4,10),'#5f8773',px,py,pz,root);
  tube(.25,h-.5,0,h/2,0);
  for(const side of [-1,1]){const y=h*(side<0?.47:.63);const arm=tube(.17,.65,side*.47,y,0);arm.rotation.z=Math.PI/2;tube(.17,h*.24,side*.9,y+h*.12,0);}
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const rib=this.mesh(new THREE.CylinderGeometry(.019,.019,h-.35,4),'#87a18a',Math.cos(a)*.25,h/2,Math.sin(a)*.25,root);rib.castShadow=false;}
  this.fadeable(root);
 }
 private fadeable(root:THREE.Group){root.updateWorldMatrix(true,true);const materials:THREE.MeshStandardMaterial[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh){o.material.transparent=true;materials.push(o.material)}});this.obstacles.push({bounds:new THREE.Box3().setFromObject(root),materials});}
 update(camera:THREE.Camera,targets:THREE.Vector3[]){for(const item of this.obstacles){const blocked=treeBlocksView(item.bounds,camera.position,targets);for(const m of item.materials){m.opacity=blocked?.12:1;m.depthWrite=!blocked}}}
}
