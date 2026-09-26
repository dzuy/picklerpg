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
  for(const child of [...root.children])if(child instanceof THREE.Mesh&&child.material instanceof THREE.MeshStandardMaterial){const key=child.material.color.getHexString()+':'+child.material.emissiveIntensity+':'+!!child.geometry.index;const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch)}
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
  super();this.group.name='Skyline';
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
  super(0);this.group.name='La Fortuna';
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

/** A public recreation park; every fixture sits beyond the pickleball run-off. */
export class NeighborhoodPark extends CourtEnvironment {
 constructor(){
  super(0);this.group.name='Hemingway';
  this.landscape();
  // Pale concrete walks connect the court, playground, and basketball court.
  this.box(49,.08,2.4,0,-.10,-12,'#d8cbb1');
  for(const x of [-8,8])this.box(2,.08,29,x,-.10,1,'#d8cbb1');
  this.box(2.4,.08,9,0,-.10,-17,'#d8cbb1');
  this.playground(-12,-19);this.basketball(13,-20);
  for(const [x,z,rotation] of [[-6.5,-11,0],[6.5,-11,0],[-10,-26,Math.PI],[9,8,-Math.PI/2]]){
   const bench=new THREE.Group();bench.name='park-bench';bench.position.set(x,0,z);bench.rotation.y=rotation;this.group.add(bench);
   for(const depth of [-.22,0,.22])this.box(2.4,.09,.16,0,.5,depth,'#ba804d',bench);
   for(const y of [.8,1.02])this.box(2.4,.15,.09,0,y,-.29,'#ba804d',bench);
   for(const side of [-1,1]){this.box(.09,1.06,.09,side*.9,.49,-.3,'#355b53',bench);this.box(.09,.5,.09,side*.9,.2,.24,'#355b53',bench);this.box(.1,.08,.68,side*1.05,.74,0,'#355b53',bench);}
   this.fadeable(bench);
  }
  for(const x of [-9.5,9.5]){
   const bin=new THREE.Group();bin.position.set(x,0,-10.5);this.group.add(bin);
   this.mesh(new THREE.CylinderGeometry(.32,.3,.85,12),'#355b53',0,.3,0,bin);
   this.mesh(new THREE.CylinderGeometry(.37,.37,.09,12),'#203d39',0,.77,0,bin);this.fadeable(bin);
  }
 }
 private landscape(){
  // Low, irregular turf patches and grass tufts break up the large lawn.
  const lawn=(x:number,z:number)=>!(Math.abs(x)<9.8&&z>-14&&z<17)&&!(z<-10&&z>-28&&Math.abs(x)<25)&&!(Math.abs(x)<19&&z>4&&z<12);
  const transform=new THREE.Object3D(),patchAreas:{x:number;z:number;r:number}[]=[];
  for(const [tone,color] of ['#80ad54','#719b48','#8bb45f'].entries()){
   const patches=new THREE.InstancedMesh(new THREE.CircleGeometry(1,9),new THREE.MeshStandardMaterial({color,roughness:1}),32);patches.name='varied-park-lawn';
   let count=0;
   for(let i=0;count<32&&i<500;i++){
    const a=(i*3+tone)*2.39996,r=12+i%15*3.1,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const radius=Math.max(1.3+i%4*.7,.8+i%3*.5);
    if(!lawn(x,z)||patchAreas.some(p=>Math.hypot(x-p.x,z-p.z)<radius+p.r+.1))continue;
    patchAreas.push({x,z,r:radius});
    transform.position.set(x,-.13,z);transform.rotation.set(-Math.PI/2,0,a);transform.scale.set(1.3+i%4*.7,.8+i%3*.5,1);transform.updateMatrix();patches.setMatrixAt(count++,transform.matrix);
   }
   patches.count=count;patches.receiveShadow=true;this.group.add(patches);
  }
  const grassGeometry=new THREE.BufferGeometry();grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.13,0,0,-.04,.29,0,.04,0,0,0,0,-.1,0,.22,.01,0,0,.12],3));grassGeometry.computeVertexNormals();
  const grass=new THREE.InstancedMesh(grassGeometry,new THREE.MeshStandardMaterial({color:'#557f3c',side:THREE.DoubleSide,roughness:1}),200);grass.name='park-grass-tufts';
  let count=0;
  for(let i=0;count<200&&i<1000;i++){
   const a=i*2.39996,r=10+i%31*1.4,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!lawn(x,z))continue;
   transform.position.set(x,-.14,z);transform.rotation.set(0,a,0);transform.scale.setScalar(.7+i%4*.15);transform.updateMatrix();grass.setMatrixAt(count++,transform.matrix);
  }
  grass.count=count;grass.receiveShadow=true;this.group.add(grass);
  for(const [x,z] of [[-11,-5],[11,-5],[-5,15.5],[5,15.5],[-23,-8],[23,10]])this.garden(x,z);
  for(const [x,z] of [[-12,2],[12,2],[-17,15],[18,-9],[-25,-26],[25,23],[-4,23]]){
   const rocks=new THREE.Group();rocks.name='park-rocks';rocks.position.set(x,0,z);this.group.add(rocks);
   for(let i=0;i<3;i++){const rock=this.orb(.45+i*.16,(i-1)*.65,.14,i%2*.5,['#839087','#a3a89a','#75877e'][i],rocks);rock.scale.set(1.15,.58,.85);rock.rotation.y=i*.8;}
   this.fadeable(rocks);
  }
  for(const side of [-1,1]){
   this.box(7,.065,1.5,side*12,-.10,8,'#d8cbb1');
   this.picnic(side*15,8,side*.2);
  }
  // Drinking fountain and a timber park noticeboard beside the walking path.
  const fountain=new THREE.Group();fountain.name='drinking-fountain';fountain.position.set(10.2,0,-.5);this.group.add(fountain);
  this.mesh(new THREE.CylinderGeometry(.22,.3,.95,10),'#527e76',0,.35,0,fountain);
  this.mesh(new THREE.CylinderGeometry(.4,.28,.12,12),'#b5c8c4',0,.88,0,fountain);
  this.box(.07,.13,.07,.2,.98,0,'#607e83',fountain);this.fadeable(fountain);
  const board=new THREE.Group();board.name='park-noticeboard';board.position.set(-10.4,0,.1);board.rotation.y=Math.PI/2;this.group.add(board);
  for(const x of [-.65,.65])this.box(.13,2,.13,x,.9,0,'#876441',board);
  this.box(1.6,1.1,.15,0,1.45,0,'#876441',board);this.box(1.35,.85,.035,0,1.45,.095,'#e8d7ad',board);
  this.box(.4,.52,.015,-.3,1.47,.12,'#f5eee0',board);this.box(.48,.3,.015,.3,1.58,.12,'#89ab80',board);this.box(.48,.16,.015,.3,1.26,.12,'#d7a569',board);
  this.box(1.85,.12,.4,0,2.05,0,'#466f60',board);this.fadeable(board);
 }
 private garden(x:number,z:number){
  const bed=new THREE.Group();bed.name='park-flower-bed';bed.position.set(x,0,z);this.group.add(bed);
  const soil=this.mesh(new THREE.CylinderGeometry(1.6,1.6,.08,12),'#866a48',0,-.08,0,bed);soil.scale.z=.7;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,stone=this.orb(.24,Math.cos(a)*1.55,.015,Math.sin(a)*1.08,'#b2b09b',bed);stone.scale.set(1,.6,.85);}
  for(let i=0;i<3;i++){const bush=this.orb(.48,(i-1)*.65,.28,-.15,['#4e8751','#659c56','#3e7950'][i],bed);bush.scale.set(1,.8,.9);}
  for(let i=0;i<13;i++){
   const a=i*2.39996,r=.45+(i%3)*.23,px=Math.cos(a)*r,pz=Math.sin(a)*r;
   this.box(.025,.32,.025,px,.08,pz,'#56834b',bed);
   const bloom=this.orb(.115,px,.28,pz,['#eac05e','#e49a94','#e5e4c5'][i%3],bed);bloom.scale.y=.5;
  }
  this.fadeable(bed);
 }
 private picnic(x:number,z:number,angle:number){
  const table=new THREE.Group();table.name='park-picnic-table';table.position.set(x,0,z);table.rotation.y=angle;this.group.add(table);
  const pad=this.mesh(new THREE.CylinderGeometry(2.5,2.5,.045,12),'#c2b798',0,-.12,0,table);pad.scale.z=.8;
  for(let i=0;i<5;i++)this.box(2.6,.1,.18,0,.82,(i-2)*.2,'#ad7949',table);
  for(const side of [-1,1]){
   this.box(2.7,.1,.35,0,.44,side*.85,'#ad7949',table);
   for(const end of [-1,1])this.link(new THREE.Vector3(end*.88,.79,side*.3),new THREE.Vector3(end*.88,-.08,side*.95),.065,'#39574d',table);
   this.box(.1,.09,2.05,side*.88,.33,0,'#39574d',table);
  }
  this.fadeable(table);
 }
 private playground(x:number,z:number){
  this.box(15,.10,10,x,-.09,z,'#cbb18a');
  // Low timber edging around the sand / wood-chip play area.
  for(const side of [-1,1]){this.box(15,.18,.16,x,.01,z+side*5,'#a08059');this.box(.16,.18,10,x+side*7.5,.01,z,'#a08059');}
  const play=new THREE.Group();play.name='playground';play.position.set(x-3,0,z);this.group.add(play);
  for(const px of [-1,1])for(const pz of [-1,1])this.box(.14,3.3,.14,px,1.5,pz,'#388e9c',play);
  this.box(2.25,.18,2.3,0,1.45,0,'#e6b452',play);
  const roof=this.mesh(new THREE.ConeGeometry(1.9,1.15,4),'#e57651',0,3.55,0,play);roof.rotation.y=Math.PI/4;
  for(const side of [-1,1])for(let i=-.8;i<=.8;i+=.4)this.box(.08,.8,.08,side,1.95,i,'#f5d06b',play);
  // Ladder to the platform and a broad yellow slide facing the court.
  for(const side of [-1,1])this.link(new THREE.Vector3(side*.5,0,-2),new THREE.Vector3(side*.5,1.5,-1),.07,'#388e9c',play);
  for(let i=0;i<5;i++)this.box(1,.08,.10,0,.2+i*.28,-1.87+i*.19,'#f1cf7a',play);
  const a=new THREE.Vector3(0,1.5,1),b=new THREE.Vector3(0,.12,3.7),mid=a.clone().add(b).multiplyScalar(.5);
  const slide=this.box(1.1,.10,a.distanceTo(b),mid.x,mid.y,mid.z,'#f4c64e',play);slide.rotation.x=Math.atan2(1.38,2.7);
  for(const side of [-1,1])this.link(new THREE.Vector3(side*.59,1.65,1),new THREE.Vector3(side*.59,.27,3.7),.09,'#e7a83d',play);
  this.fadeable(play);
  const swings=new THREE.Group();swings.name='swings';swings.position.set(x+3.7,0,z);this.group.add(swings);
  for(const sx of [-2.3,2.3])for(const sz of [-1.3,1.3])this.link(new THREE.Vector3(sx,0,sz),new THREE.Vector3(sx,3,0),.09,'#dc7851',swings);
  this.box(5,.16,.16,0,3,0,'#dc7851',swings);
  for(const sx of [-1,1]){
   for(const side of [-1,1])this.link(new THREE.Vector3(sx+side*.36,2.96,0),new THREE.Vector3(sx+side*.36,.62,.15),.018,'#647780',swings);
   this.box(.86,.09,.4,sx,.58,.15,'#355b53',swings);
  }
  this.fadeable(swings);
 }
 private basketball(x:number,z:number){
  const court=new THREE.Group();court.name='basketball-court';court.position.set(x,0,z);this.group.add(court);
  this.box(13,.1,12,0,-.08,0,'#718e8d',court);
  this.box(4,.012,4.8,0,-.015,-3,'#cd987a',court);
  for(const side of [-1,1]){this.box(.07,.015,11,side*6,-.005,0,'#f6eddb',court);this.box(12,.015,.07,0,-.005,side*5.5,'#f6eddb',court);this.box(.07,.015,4.8,side*2,.005,-3,'#f6eddb',court);}
  this.box(4,.015,.07,0,.005,-.6,'#f6eddb',court);
  const arc=new THREE.EllipseCurve(0,-3.8,5.1,5.1,0,Math.PI,false,0).getPoints(40);
  const stripe=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc.map(p=>new THREE.Vector3(p.x,.005,p.y))),40,.035,4,false),new THREE.MeshStandardMaterial({color:'#f6eddb'}));court.add(stripe);
  const hoop=new THREE.Group();hoop.name='basketball-hoop';hoop.position.set(x,0,z-5);this.group.add(hoop);
  this.box(.16,3.6,.16,0,1.7,0,'#526b70',hoop);this.box(.12,.12,1,0,3.25,.4,'#526b70',hoop);
  this.box(1.8,1.1,.10,0,3.35,.9,'#f5eedc',hoop);
  for(const sx of [-.32,.32])this.box(.045,.43,.02,sx,3.25,.965,'#ca6946',hoop);
  for(const y of [3.04,3.46])this.box(.68,.045,.02,0,y,.965,'#ca6946',hoop);
  const rim=this.mesh(new THREE.TorusGeometry(.28,.035,6,20),'#d86e3f',0,3.04,1.22,hoop);rim.rotation.x=Math.PI/2;
  for(let i=0;i<10;i++){const a=i*Math.PI/5;this.link(new THREE.Vector3(Math.cos(a)*.27,3.02,1.22+Math.sin(a)*.27),new THREE.Vector3(Math.cos(a)*.17,2.62,1.22+Math.sin(a)*.17),.012,'#f5eedc',hoop);}
  this.fadeable(hoop);
 }
}
