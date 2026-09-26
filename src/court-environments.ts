import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {treeBlocksView} from './trees';

/** Decorative scenery never changes the shared playable court or physics. */
export class CourtEnvironment {
 readonly group=new THREE.Group();
 constructor(private readonly occludedOpacity=.08){}
 private obstacles:{bounds:THREE.Box3;materials:THREE.MeshStandardMaterial[]}[]=[];
 protected mesh(g:THREE.BufferGeometry,color:string,x:number,y:number,z:number,parent:THREE.Object3D=this.group,glow=0){
  const material=new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true,emissive:color,emissiveIntensity:glow});
  const mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.castShadow=!glow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 protected box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:THREE.Object3D=this.group,glow=0){return this.mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent,glow)}
 protected orb(r:number,x:number,y:number,z:number,color:string,parent:THREE.Object3D=this.group){return this.mesh(new THREE.IcosahedronGeometry(r,1),color,x,y,z,parent)}
 protected link(a:THREE.Vector3,b:THREE.Vector3,r:number,color:string,parent:THREE.Object3D=this.group){const m=this.mesh(new THREE.CylinderGeometry(r*.75,r,a.distanceTo(b),7),color,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number],parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m}
 protected fadeable(root:THREE.Object3D){
  // Batch static parts by material so skyline windows and canopy clusters stay cheap.
  const batches=new Map<string,THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]>();
  for(const child of [...root.children])if(child instanceof THREE.Mesh&&child.material instanceof THREE.MeshStandardMaterial){const key=child.material.color.getHexString()+':'+child.material.emissiveIntensity;const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch)}
  for(const meshes of batches.values())if(meshes.length>1){
   const geometries=meshes.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix)});
   const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
   if(geometry){const combined=new THREE.Mesh(geometry,meshes[0].material);combined.castShadow=meshes[0].castShadow;combined.receiveShadow=true;root.add(combined);for(const mesh of meshes){root.remove(mesh);mesh.geometry.dispose();if(mesh.material!==combined.material)mesh.material.dispose();}}
  }
  root.updateWorldMatrix(true,true);const materials:THREE.MeshStandardMaterial[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial){o.material.transparent=true;materials.push(o.material)}});this.obstacles.push({bounds:new THREE.Box3().setFromObject(root),materials});}
 update(camera:THREE.Camera,targets:THREE.Vector3[]){for(const item of this.obstacles){const blocked=treeBlocksView(item.bounds,camera.position,targets);for(const m of item.materials){m.opacity=blocked?this.occludedOpacity:1;m.depthWrite=!blocked}}}
}

export class CityRooftop extends CourtEnvironment {
 constructor(){
  super();this.group.name='The City';
  // The playing surface is sixty metres above the street, on its own tower.
  this.box(17,60,26,0,-30.2,0,'#26374f');
  this.box(18,.35,27,0,-.24,0,'#64748a');
  for(const x of [-8.7,8.7]){
   this.box(.22,.55,26,x,.1,0,'#9daabc');
   for(let z=-12;z<=12;z+=2)this.box(.065,1.15,.065,x,.65,z,'#bdd9e2');
   this.box(.08,.08,26,x,1.22,0,'#b7cdd9');
   this.box(.06,.035,26,x,.42,0,'#68dbff',this.group,1.4);
  }
  for(const z of [-13,13]){this.box(17.5,.55,.22,0,.1,z,'#9daabc');this.box(17.5,.08,.08,0,1.22,z,'#b7cdd9');for(let x=-8;x<=8;x+=2)this.box(.065,1.15,.065,x,.65,z,'#bdd9e2');}
  for(let i=0;i<26;i++){
   const angle=i*2.39996,r=27+(i%5)*9,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
   const top=4+(i*13%31),w=6+i%4*1.5,d=6+i%3*2;
   const tower=new THREE.Group();tower.position.set(x,0,z);tower.name='skyline-tower';this.group.add(tower);
   this.box(w,60+top,d,0,(top-60)/2,0,['#26334c','#354e67','#3c4563','#2e5262'][i%4],tower);
   this.box(w+.3,.3,d+.3,0,top,0,'#65768c',tower);
   // Shared ribbons of windows keep the surrounding skyline inexpensive.
   for(let y=-45;y<top-1;y+=2.5){
    const color=(i+Math.floor(y))%3?'#d8b675':'#7ab8d1';
    for(const side of [-1,1]){
     this.box(w-.8,.55,.025,0,y,side*(d/2+.02),color,tower,.5);
     this.box(.025,.55,d-.8,side*(w/2+.02),y,0,color,tower,.5);
    }
   }
   if(i%3===0){this.box(w*.5,1.8,d*.5,0,top+.9,0,'#53627b',tower);this.box(.1,3,.1,0,top+3,0,'#8794a5',tower);this.orb(.13,0,top+4.5,0,'#ff7973',tower);}
   this.fadeable(tower);
  }
  // Rooftop access, ventilation, and planted seating make the platform legible.
  const access=new THREE.Group();access.position.set(5.9,0,-10);this.group.add(access);
  this.box(3,2.7,2.5,0,1.2,0,'#53657b',access);this.box(.9,1.95,.06,0,.87,1.28,'#243343',access);this.box(1.15,.1,.12,0,2.05,1.32,'#70edda',access,1);this.fadeable(access);
  for(const side of [-1,1]){
   this.box(.8,.45,2.8,side*6.7,.2,3,'#d5a37a');
   for(const z of [-7,7]){this.box(1.2,.55,1.5,side*7,.15,z,'#36445c');for(let j=0;j<3;j++)this.orb(.47,side*7,.7,z+(j-1)*.4,'#52846c');}
  }
 }
}

export class GlowballHall extends CourtEnvironment {
 constructor(){
  super();this.group.name='Glowball';
  this.box(31,.2,40,0,-.2,0,'#080d1c');
  // A cutaway roof keeps the orbit camera usable while the trusses read as indoor.
  for(const side of [-1,1]){
   const wall=new THREE.Group();this.group.add(wall);
   this.box(.3,9,39,side*15,4.4,0,'#10152a',wall);
   for(let z=-18;z<=18;z+=6){this.box(.35,9,.4,side*14.7,4.4,z,'#252b45',wall);this.box(.07,6,.12,side*14.45,3.3,z,side<0?'#ae55ff':'#22e5ed',wall,2);}
   this.box(.08,.1,38,side*14.4,.4,0,'#d946fc',wall,2);this.fadeable(wall);
   const end=new THREE.Group();this.group.add(end);
   this.box(30,9,.3,0,4.4,side*19.5,'#10152a',end);
   this.box(25,.15,.08,0,6.6,side*19.3,'#24dfef',end,2);
   for(const x of [-10,0,10])this.box(4,1.8,.1,x,3.3,side*19.3,'#211a40',end);
   this.fadeable(end);
  }
  for(const z of [-15,0,15]){
   const truss=new THREE.Group();this.group.add(truss);
   this.box(30,.2,.25,0,9,z,'#33354e',truss);this.box(30,.15,.15,0,8.3,z,'#33354e',truss);
   for(let x=-14;x<14;x+=2)this.link(new THREE.Vector3(x,8.3,z),new THREE.Vector3(x+2,9,z),.045,'#404361',truss);
   this.box(8,.06,.15,0,8.2,z,'#a374ff',truss,2);this.fadeable(truss);
  }
  // Visible rings of blacklight fixtures; modest local light keeps players readable.
  for(const x of [-6,6])for(const z of [-9,9]){
   this.box(.18,2.5,.18,x,1.25,z,'#26243f');this.box(.35,.12,.35,x,2.5,z,'#ca6bff',this.group,3);
   const lamp=new THREE.PointLight(x<0?'#a070ff':'#29e1f3',28,15,2);lamp.position.set(x,3,z);this.group.add(lamp);
  }
  for(const side of [-1,1]){this.box(.8,.4,3.5,side*7,.2,2,'#26233f');this.box(.85,.045,3.6,side*7,.43,2,'#e34cff',this.group,1.4);}
 }
}

export class CostaRicanJungle extends CourtEnvironment {
 constructor(){
  super(0);this.group.name='The Jungle';
  for(let i=0;i<58;i++){
   const angle=i*2.39996,r=13+(i%8)*3.6,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
   // Leave a wider clearing by removing the two innermost rings of trees.
   if(r<19)continue;
   this.tree(x,z,6+(i%5)*1.25,i);
  }
  for(let i=0;i<85;i++){
   const a=i*2.39996,r=10+(i%9)*2.3,x=Math.cos(a)*r,z=Math.sin(a)*r;
   for(let j=0;j<3;j++){const leaf=this.orb(.65,x+(j-1)*.25,.5,z,['#368148','#4b9346','#21705a'][i%3]);leaf.scale.set(.45,1.5,1);leaf.rotation.z=(j-1)*.65;leaf.rotation.y=a;}
   if(i%7===0){this.orb(.17,x,.95,z,'#f37854');this.orb(.12,x+.18,.82,z,'#ffd157');}
  }
  // A narrow stream curves past the clearing; stepping stones sit outside play.
  const water=new THREE.MeshStandardMaterial({color:'#318c85',roughness:.25,metalness:.2});
  for(let i=0;i<26;i++){const pool=new THREE.Mesh(new THREE.CylinderGeometry(2,2,.025,12),water);pool.position.set(17+Math.sin(i*.45)*2,-.11,-32+i*2.5);this.group.add(pool);}
  for(let i=0;i<12;i++){const rock=this.orb(.55,14+Math.sin(i)*.8,.06,-14+i*2.5,'#69796b');rock.scale.y=.5;}
  for(const side of [-1,1])this.box(.7,.42,2.8,side*4.8,.21,-3,'#805632');
  this.toucan(-7,2.1,-6);this.toucan(8,2.5,8);
  this.monkey(-8,1.3,5);this.monkey(9,2,-9);
  this.sloth(-10,3.5,-10);this.jaguar(8,.1,3);
 }
 private tree(x:number,z:number,h:number,seed:number){
  const tree=new THREE.Group();tree.position.set(x,0,z);this.group.add(tree);tree.name='jungle-tree';
  this.mesh(new THREE.CylinderGeometry(.22,.48,h,7),'#67523a',0,h/2,0,tree);
  for(let j=0;j<4;j++){const a=j*Math.PI/2;this.link(new THREE.Vector3(0,1.2,0),new THREE.Vector3(Math.cos(a)*1.4,0,Math.sin(a)*1.4),.18,'#67523a',tree);}
  if(seed%3===0){
   for(let j=0;j<7;j++){
    const a=j*Math.PI*2/7;
    this.link(new THREE.Vector3(0,h-.15,0),new THREE.Vector3(Math.cos(a)*3,h-.9,Math.sin(a)*3),.055,'#488749',tree);
    const leaf=this.orb(1,Math.cos(a)*1.6,h-.3,Math.sin(a)*1.6,'#318b52',tree);leaf.scale.set(2,.18,.52);leaf.rotation.y=-a;leaf.rotation.z=-.17;
   }
  }else{
   for(let j=0;j<4;j++){const a=j*2.1;const canopy=this.orb(2.25,Math.cos(a)*1.2,h+j%2*.8,Math.sin(a)*1.2,['#24694b','#327b48','#3c884f'][seed%3],tree);canopy.scale.y=.65;}
   for(const side of [-1,1])this.link(new THREE.Vector3(side*1.7,h-.4,0),new THREE.Vector3(side*1.8,h-3.5,.1),.035,'#488249',tree);
  }
  this.fadeable(tree);
 }
 private animal(name:string,x:number,y:number,z:number){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);this.group.add(g);return g}
 private toucan(x:number,y:number,z:number){
  const g=this.animal('toucan',x,y,z);this.box(.14,y,.14,x,y/2,z,'#72553a');
  const body=this.orb(.32,0,.1,0,'#192a30',g);body.scale.set(.8,1.25,.8);this.orb(.23,0,.48,0,'#15252c',g);this.orb(.18,.12,.26,.15,'#fff4b6',g);
  const bill=this.orb(.29,.31,.48,.08,'#f5b934',g);bill.scale.set(1.5,.65,.6);this.orb(.1,.67,.48,.08,'#d66438',g);this.orb(.045,.12,.54,.19,'#e4f3d2',g);this.orb(.023,.13,.54,.225,'#121921',g);
  this.box(.13,.45,.09,-.1,-.3,0,'#172f34',g).rotation.z=-.3;
 }
 private monkey(x:number,y:number,z:number){
  const g=this.animal('white-faced-capuchin',x,y,z);this.box(2.7,.16,.2,x,y-.4,z,'#755039');this.box(.24,y+1,.25,x-1,(y+1)/2,z,'#755039');
  this.orb(.4,0,0,0,'#4a3328',g);this.orb(.3,0,.48,.05,'#efe0b7',g);this.orb(.22,0,.45,.23,'#b48b62',g);
  for(const side of [-1,1]){this.orb(.1,side*.28,.48,.03,'#d1b085',g);this.orb(.035,side*.09,.52,.42,'#1c231c',g);this.link(new THREE.Vector3(side*.27,.15,0),new THREE.Vector3(side*.55,-.32,.12),.085,'#4a3328',g);this.link(new THREE.Vector3(side*.18,-.2,0),new THREE.Vector3(side*.3,-.4,.25),.10,'#4a3328',g);}
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.1,-.25),new THREE.Vector3(.4,-.3,-.6),new THREE.Vector3(.75,.1,-.5),new THREE.Vector3(.55,.35,-.4)]);this.mesh(new THREE.TubeGeometry(curve,16,.06,6,false),'#4a3328',0,0,0,g);
 }
 private sloth(x:number,y:number,z:number){
  const g=this.animal('three-toed-sloth',x,y,z);this.box(3,.18,.2,x,y+.6,z,'#6e5239');this.box(.3,y+1,.3,x-1.2,(y+1)/2,z,'#6e5239');
  const body=this.orb(.48,0,0,0,'#9b967c',g);body.scale.x=1.35;
  for(const side of [-1,1])this.link(new THREE.Vector3(side*.4,0,0),new THREE.Vector3(side*.6,.65,0),.105,'#9b967c',g);
  this.orb(.3,.48,-.05,.14,'#d4c9a7',g);for(const side of [-1,1]){const eye=this.orb(.07,.48+side*.10,-.04,.4,'#504739',g);eye.scale.x=1.5;}this.orb(.05,.48,-.13,.43,'#3e3830',g);
 }
 private jaguar(x:number,y:number,z:number){
  const g=this.animal('jaguar',x,y,z);g.rotation.y=-.5;
  const body=this.orb(.48,0,.63,0,'#d29a49',g);body.scale.set(1.8,.85,.8);this.orb(.34,.82,.75,0,'#e4af5c',g);
  for(const side of [-1,1]){this.orb(.12,.85,1.03,side*.2,'#a87837',g);this.orb(.04,1.09,.82,side*.2,'#19291c',g);for(const end of [-1,1])this.link(new THREE.Vector3(end*.5,.55,side*.24),new THREE.Vector3(end*.6,.08,side*.27),.11,'#cc9445',g);}
  for(let i=0;i<18;i++){const spot=this.orb(.055,(i%6-2.5)*.22,.6+Math.floor(i/6)*.13,(i%2?1:-1)*.35,'#48372a',g);spot.scale.y=1.3;}
  this.link(new THREE.Vector3(-.75,.6,0),new THREE.Vector3(-1.5,.82,.2),.075,'#c79349',g);this.orb(.09,1.13,.65,0,'#523c2c',g);
 }
}
