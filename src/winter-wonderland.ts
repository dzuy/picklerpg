import * as THREE from 'three';
import {CourtEnvironment} from './court-environments';

/** Snow and holiday scenery stay outside the shared playable court. */
export class WinterWonderland extends CourtEnvironment {
 constructor(){
  super(0);this.group.name='Winter Wonderland';
  // A cleared blue playing surface is surrounded by soft, plowed snowbanks.
  for(const side of [-1,1]){
   for(let i=0;i<9;i++)this.snowbank(side*6.8,-10+i*2.5,1.3,.32);
   for(let i=0;i<7;i++)this.snowbank(-5.8+i*1.9,side*11.6,1.4,.38);
  }
  // Trees frame both baselines, so the setting reads from either team's view.
  for(const [x,z,h,decorated] of [[-8,-12,6,1],[8,-12,6.5,1],[-9,11,5.5,1],[9,12,6,1],[-13,-4,7,0],[13,4,7,0],[-15,-20,8,0],[0,-23,8,1],[15,-23,9,0],[-17,23,8,0],[1,25,9,0],[17,22,8,0]])this.pine(x,z,h,!!decorated);
  for(let i=0;i<22;i++){const angle=i*2.39996,r=32+i%5*6;this.pine(Math.cos(angle)*r,Math.sin(angle)*r,6+i%4,false);}
  this.snowman(-5.6,-10.8,.95,'#c74754');this.snowman(5.7,-10.8,1.1,'#287985');
  this.snowman(-6,12.5,1.05,'#287985');this.snowman(6,12.5,.9,'#c74754');
  for(const x of [-8.2,8.2])for(const z of [-7,0,7])this.lights(x,z);
  for(const side of [-1,1]){
   this.bench(side*5.25,2.3,side*Math.PI/2);
   this.gift(side*8.3-.55,-10.5,.7,'#c74754','#f5d585');
   this.gift(side*8.3+.3,-10.3,.5,'#357e76','#f6e8c0');
  }
 }
 private snowbank(x:number,z:number,r:number,h:number){const mound=this.orb(r,x,-.04,z,'#f2f8fc');mound.scale.set(1,h/r,.8);}
 private pine(x:number,z:number,h:number,festive:boolean){
  const tree=new THREE.Group();tree.name=festive?'decorated-pine':'snowy-pine';tree.position.set(x,-.13,z);this.group.add(tree);
  this.mesh(new THREE.CylinderGeometry(.14,.25,h*.28,7),'#725d54',0,h*.14,0,tree);
  for(let tier=0;tier<3;tier++){
   const radius=h*(.29-tier*.065),height=h*.48,y=h*(.32+tier*.21);
   this.mesh(new THREE.ConeGeometry(radius,height,8),['#285a56','#326e65','#428078'][tier],0,y,0,tree);
   // A smaller raised cone leaves a visible evergreen fringe below its snow cap.
   this.mesh(new THREE.ConeGeometry(radius*.84,height*.84,8),'#ecf5fc',0,y+height*.12,0,tree);
   if(festive)for(let j=0;j<7;j++){
    const angle=j*Math.PI*2/7+tier*.5,r=radius*.77;
    const bulb=this.orb(.11,Math.cos(angle)*r,y-height*.31,Math.sin(angle)*r,['#ef6b70','#ffdc85','#76d9ce'][j%3],tree);
    bulb.material.emissive.copy(bulb.material.color);bulb.material.emissiveIntensity=.7;
   }
  }
  if(festive){
   const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.16:.38;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();
   this.mesh(new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false}),'#f5d585',0,h*.99,-.05,tree,.6);
  }
  this.fadeable(tree);
 }
 private snowman(x:number,z:number,scale:number,scarf:string){
  const snowman=new THREE.Group();snowman.name='snowman';snowman.position.set(x,0,z);snowman.scale.setScalar(scale);snowman.rotation.y=z>0?Math.PI:0;this.group.add(snowman);
  this.orb(.64,0,.5,0,'#edf6fc',snowman);this.orb(.48,0,1.22,0,'#f7fbff',snowman);this.orb(.34,0,1.86,0,'#f7fbff',snowman);
  this.mesh(new THREE.CylinderGeometry(.51,.51,.09,12),'#263c50',0,2.12,0,snowman);
  this.mesh(new THREE.CylinderGeometry(.3,.33,.45,10),'#263c50',0,2.36,0,snowman);
  this.mesh(new THREE.CylinderGeometry(.325,.33,.10,10),scarf,0,2.19,0,snowman);
  this.mesh(new THREE.CylinderGeometry(.34,.36,.16,12),scarf,0,1.57,0,snowman);
  this.box(.18,.52,.1,.20,1.31,.43,scarf,snowman).rotation.z=.12;
  for(const eye of [-1,1])this.orb(.043,eye*.115,1.93,.30,'#263c50',snowman);
  const nose=this.mesh(new THREE.ConeGeometry(.075,.32,7),'#e79143',0,1.84,.42,snowman);nose.rotation.x=Math.PI/2;
  for(const y of [.98,1.18,1.38])this.orb(.047,0,y,.47,'#263c50',snowman);
  for(const side of [-1,1]){
   this.link(new THREE.Vector3(side*.36,1.27,0),new THREE.Vector3(side*.99,1.62,0),.035,'#735449',snowman);
   this.link(new THREE.Vector3(side*.83,1.53,0),new THREE.Vector3(side*.86,1.78,0),.024,'#735449',snowman);
  }
  this.fadeable(snowman);
 }
 private lights(x:number,z:number){
  const decor=new THREE.Group();decor.name='festive-lights';decor.position.set(x,0,z);this.group.add(decor);
  for(const end of [-1,1]){
   this.mesh(new THREE.CylinderGeometry(.06,.08,2.9,8),'#405968',0,1.3,end*3.5,decor);
   this.orb(.12,0,2.83,end*3.5,'#f6d893',decor);
  }
  const points=Array.from({length:17},(_,i)=>{const t=i/16;return new THREE.Vector3(0,2.75-Math.sin(t*Math.PI)*.5,-3.5+t*7)});
  this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.025,4,false),'#365d56',0,0,0,decor);
  for(let i=1;i<16;i+=2){const p=points[i];this.link(p,p.clone().add(new THREE.Vector3(0,-.15,0)),.014,'#365d56',decor);const bulb=this.orb(.09,p.x,p.y-.2,p.z,['#ffd88b','#ef7180','#73d8ca'][i%3],decor);bulb.material.emissive.copy(bulb.material.color);bulb.material.emissiveIntensity=1.5;}
  this.fadeable(decor);
 }
 private gift(x:number,z:number,size:number,color:string,ribbon:string){
  const gift=new THREE.Group();gift.name='holiday-gift';gift.position.set(x,0,z);this.group.add(gift);
  this.box(size,size,size,0,size/2,0,color,gift);this.box(size+.03,.05,size+.03,0,size,0,color,gift);
  this.box(size*.16,size+.07,size+.04,0,size/2,0,ribbon,gift);this.box(size+.04,size+.07,size*.16,0,size/2,0,ribbon,gift);
  for(const side of [-1,1]){const bow=this.mesh(new THREE.TorusGeometry(size*.15,.035,5,10),ribbon,side*size*.13,size+.1,0,gift);bow.rotation.y=side*.35;}
  this.fadeable(gift);
 }
 private bench(x:number,z:number,angle:number){
  const bench=new THREE.Group();bench.name='winter-bench';bench.position.set(x,0,z);bench.rotation.y=angle;this.group.add(bench);
  this.box(2.3,.12,.65,0,.5,0,'#9b5757',bench);this.box(2.3,.4,.10,0,.91,-.3,'#9b5757',bench);
  this.box(2.35,.09,.16,0,1.15,-.3,'#f1f8ff',bench);
  for(const sx of [-.9,.9]){this.box(.08,.5,.55,sx,.22,0,'#36505b',bench);this.box(.08,.95,.08,sx,.5,-.3,'#36505b',bench);}
  const wreath=this.mesh(new THREE.TorusGeometry(.23,.065,6,16),'#2b7462',0,.92,-.22,bench);
  this.orb(.07,0,.72,-.13,'#d75060',bench);wreath.name='holiday-wreath';this.fadeable(bench);
 }
}
