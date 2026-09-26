import * as THREE from 'three';
import {CourtEnvironment} from './court-environments';

/** A harvest park surrounding the standard court; scenery never changes play. */
export class AutumnPark extends CourtEnvironment {
 constructor(){
  super(0);this.group.name='Autumn Park';
  for(const side of [-1,1]){
   this.box(2,.07,32,side*8,-.10,0,'#dba06b');
   this.box(18,.07,2,0,-.10,side*12,'#dba06b');
   this.tree(side*9.5,-11,6,side<0?0:1);this.tree(side*10,11.5,6.4,side<0?2:0);
   this.tree(side*14,0,7,1);this.harvest(side*5.5,-10.5,side*.2);this.harvest(side*5.5,11,Math.PI+side*.2);
   this.bench(side*5.1,side*4,-side*Math.PI/2);
   for(const z of [-6,6])this.lantern(side*8,z);
  }
  for(let i=0;i<27;i++){const a=i*2.39996,r=22+i%5*6;this.tree(Math.cos(a)*r,Math.sin(a)*r,5+i%4,i%3);}
  this.leaves();
 }
 private tree(x:number,z:number,h:number,tone:number){
  const tree=new THREE.Group();tree.name='autumn-tree';tree.position.set(x,-.13,z);this.group.add(tree);
  this.mesh(new THREE.CylinderGeometry(.17,.35,h*.66,7),'#71503b',0,h*.33,0,tree);
  const colors=[['#c75a25','#e97c2b','#f3ad43'],['#d17424','#ee942c','#f6be51'],['#aa492d','#d76a28','#ea9237']][tone];
  for(const side of [-1,1])this.link(new THREE.Vector3(0,h*.35,0),new THREE.Vector3(side*h*.22,h*.72,0),.11,'#71503b',tree);
  for(const [dx,dy,dz,r,c] of [[0,.78,0,.28,0],[-.2,.66,.04,.22,1],[.2,.72,-.03,.23,1],[.02,.97,.02,.21,2]]){
   const crown=this.orb(h*r,h*dx,h*dy,h*dz,colors[c],tree);crown.scale.y=.88;
  }
  this.fadeable(tree);
  // Low mounds of fallen foliage beneath the canopy.
  const pile=this.orb(h*.33,x,-.03,z,colors[0]);pile.scale.set(1,.065,.8);
 }
 private pumpkin(x:number,y:number,z:number,size:number,parent:THREE.Group,color='#e98325'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4,lobe=this.orb(size*.68,x+Math.cos(a)*size*.33,y+size*.63,z+Math.sin(a)*size*.33,color,parent);lobe.scale.set(.66,1,.66);}
  this.mesh(new THREE.CylinderGeometry(size*.10,size*.15,size*.32,6),'#5d6740',x,y+size*1.3,z,parent).rotation.z=-.18;
 }
 private harvest(x:number,z:number,rotation:number){
  const decor=new THREE.Group();decor.name='pumpkin-harvest';decor.position.set(x,0,z);decor.rotation.y=rotation;this.group.add(decor);
  this.box(2,.75,1,0,.27,0,'#d6a147',decor);
  for(const sx of [-.68,.68])this.box(.065,.78,1.035,sx,.27,0,'#997247',decor);
  // Straw ridges give the bale a bundled, fibrous edge.
  for(let i=0;i<8;i++)this.box(1.94,.026,.035,0,-.02+i*.085,.515,['#efc775','#b98a3f'][i%2],decor);
  this.pumpkin(-.4,.66,0,.40,decor);this.pumpkin(.5,.66,.03,.28,decor,'#f6b34e');
  this.pumpkin(-1.35,-.1,.28,.49,decor);this.pumpkin(.85,-.1,.85,.36,decor,'#ce6525');
  // A sheaf of dried corn behind the pumpkins.
  for(let i=0;i<5;i++){
   const sx=.6+(i-2)*.1,top=1.8+(i%3)*.2;
   this.link(new THREE.Vector3(.6,0,-.3),new THREE.Vector3(sx,top,-.3),.025,'#b79042',decor);
   for(const side of [-1,1]){const leaf=this.orb(.26,sx+side*.16,top-.55,-.3,'#d7ad53',decor);leaf.scale.set(.8,.16,.3);leaf.rotation.z=side*.6;}
   const ear=this.orb(.12,sx,top-.12,-.3,'#e3bd6b',decor);ear.scale.set(.45,1.5,.45);
  }
  this.fadeable(decor);
 }
 private bench(x:number,z:number,angle:number){
  const bench=new THREE.Group();bench.name='autumn-bench';bench.position.set(x,0,z);bench.rotation.y=angle;this.group.add(bench);
  for(const dz of [-.2,0,.2])this.box(2.4,.09,.16,0,.5,dz,'#925435',bench);
  for(const y of [.8,1])this.box(2.4,.15,.08,0,y,-.3,'#925435',bench);
  for(const sx of [-.9,.9]){this.box(.08,.5,.5,sx,.23,0,'#4e4c39',bench);this.box(.08,.95,.08,sx,.5,-.3,'#4e4c39',bench);}
  this.fadeable(bench);
 }
 private lantern(x:number,z:number){
  const lamp=new THREE.Group();lamp.name='harvest-lantern';lamp.position.set(x,0,z);this.group.add(lamp);
  this.box(.11,2.6,.11,0,1.2,0,'#61513d',lamp);this.box(.65,.1,.65,0,2.1,0,'#584733',lamp);
  this.box(.43,.65,.43,0,2.43,0,'#ffce77',lamp,.65);
  for(const sx of [-.25,.25])for(const sz of [-.25,.25])this.box(.045,.72,.045,sx,2.44,sz,'#584733',lamp);
  const roof=this.mesh(new THREE.ConeGeometry(.52,.3,4),'#805134',0,2.94,0,lamp);roof.rotation.y=Math.PI/4;
  // Orange and cream pennants fluttering down the outside of each post.
  for(let i=0;i<3;i++){const flag=this.mesh(new THREE.ConeGeometry(.19,.42,3),['#cf6027','#edaf4b','#f3cd86'][i],.16,1.7-i*.3,.03,lamp);flag.rotation.z=Math.PI/2;}
  this.fadeable(lamp);
 }
 private leaves(){
  // Instancing keeps the scattered leaves to three draw calls, away from play.
  for(const [tone,color] of ['#c86625','#efaa39','#a9502a'].entries()){
   const geometry=new THREE.CircleGeometry(.12,4);geometry.rotateX(-Math.PI/2);
   const leaves=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}),90);leaves.name='fallen-leaves';
   const transform=new THREE.Object3D();
   for(let i=0;i<90;i++){
    const a=(i*3+tone)*2.39996,r=10+(i%11)*1.8;let x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<6.6&&Math.abs(z)<11.5)z=Math.sign(z||1)*12;
    transform.position.set(x,-.04,z);transform.rotation.set(0,a,0);transform.scale.set(1+(i%3)*.25,1,.6);transform.updateMatrix();leaves.setMatrixAt(i,transform.matrix);
   }
   leaves.receiveShadow=true;this.group.add(leaves);
  }
 }
}
