import * as THREE from 'three';
import {treeBlocksView} from './trees';

/** A miniature LA postcard surrounding the unchanged regulation playing surface. */
export class VeniceSunset {
 readonly group=new THREE.Group();
 private palms:{root:THREE.Group;bounds:THREE.Box3;materials:THREE.MeshStandardMaterial[]}[]=[];
 private material(color:string){return new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true})}
 private mesh(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,parent:THREE.Object3D=this.group){
  const mesh=new THREE.Mesh(geometry,this.material(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 private box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:THREE.Object3D=this.group){return this.mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent)}
 private beam(a:THREE.Vector3,b:THREE.Vector3,r:number,color:string,parent:THREE.Object3D=this.group){const mesh=this.mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),6),color,0,0,0,parent);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return mesh}
 private sign(text:string,x:number,y:number,z:number,width:number,height:number,color:string,background?:string){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d')!;
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,1024,256)}
  ctx.fillStyle=color;ctx.font='900 112px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,134,970);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));sign.position.set(x,y,z);this.group.add(sign);
 }
 constructor(){
  this.group.name='Venice Sunset scenery';
  // Shoreline and broad bands of quiet Pacific water.
  this.box(340,.025,150,0,-.125,-106,'#599da9');
  for(let i=0;i<6;i++)this.box(230,.012,.20+i*.06,-12,-.10,-31-i*3.5,i%2?'#aed7ce':'#e9d8bd');
  // Boardwalk, beside rather than across the court's run-off.
  this.box(3,.035,60,8,-.10,0,'#b78575');
  for(let z=-29;z<=29;z+=.6)this.box(3,.008,.026,8,-.076,z,'#936c67');
  for(const x of [-6.12,6.12])this.box(.09,.018,21,x,-.008,0,'#f7b88c');
  // The boardwalk ends at z=-30; the pier continues along its axis into the Pacific.
  this.box(3,.22,18,8,.015,-39,'#bb8a79');
  this.box(12,.22,8,8,.015,-51,'#bb8a79');
  for(let z=-30;z>=-55;z-=.6)this.box(z>-47?3:12,.008,.026,8,.13,z,'#936c67');
  for(let z=-32;z>=-46;z-=3)for(const x of [6.65,9.35])this.box(.22,1.8,.22,x,-.7,z,'#755d67');
  for(const x of [6.55,9.45]){
   this.box(.08,.08,17,x,1.02,-38.5,'#f4cdaf');
   for(let z=-30.5;z>=-46;z-=1.5)this.box(.075,.9,.075,x,.59,z,'#f4cdaf');
  }
  for(const x of [2.1,13.9]){
   this.box(.08,.08,8,x,1.02,-51,'#f4cdaf');
   for(let z=-47;z>=-55;z-=2){this.box(.075,.9,.075,x,.59,z,'#f4cdaf');this.box(.22,1.8,.22,x,-.7,z,'#755d67')}
  }
  this.box(12,.08,.08,8,1.02,-54.9,'#f4cdaf');
  // Ferris wheel faces the beach on the wider platform at the seaward end.
  const wheel=new THREE.Group();wheel.position.set(7,4.9,-52);this.group.add(wheel);
  const rim=this.mesh(new THREE.TorusGeometry(3.6,.10,6,64),'#ffe0b8',0,0,0,wheel);
  rim.material.emissive.set('#b85d62');rim.material.emissiveIntensity=.3;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*3.6,y=Math.sin(a)*3.6;this.beam(new THREE.Vector3(),new THREE.Vector3(x,y,0),.035,'#f3bca7',wheel);this.box(.60,.55,.58,x,y-.25,0,['#e36f93','#57b7b6','#f8c477'][i%3],wheel)}
  for(const x of [5,9])this.beam(new THREE.Vector3(x,.15,-51.6),new THREE.Vector3(7,4.9,-52),.13,'#ece2c8');
  this.box(2,1.6,2,12,.95,-50,'#58b1b0');this.box(2.4,.25,2.4,12,1.9,-50,'#e77e9b');
  for(const x of [6.4,9.6])this.box(.10,2.8,.10,x,1.3,-31.5,'#f4cdaf');
  this.sign('PACIFIC PIER',8,2.55,-31.4,4.7,.85,'#ffe2af','#895770');
  // Warm sun, set low beyond the water.
  const sun=new THREE.Mesh(new THREE.SphereGeometry(3.3,32,16),new THREE.MeshBasicMaterial({color:'#ffdb9d',fog:false}));sun.position.set(-12,6,-48);this.group.add(sun);
  // Lifeguard tower with stilt legs, rails, and a surfboard.
  for(const x of [-12.9,-11.1])for(const z of [-11.7,-10.3])this.box(.12,1.5,.12,x,.6,z,'#c5917a');
  this.box(3,.15,2.6,-12,1.4,-11,'#f6d6b1');this.box(2.1,1.65,1.7,-12,2.25,-11.2,'#79c6c4');
  this.box(1.5,.60,.035,-12,2.5,-10.33,'#466979');this.box(2.7,.18,2.3,-12,3.15,-11.2,'#f497a7');
  for(let i=0;i<5;i++)this.box(1,.12,.35,-12,.22+i*.25,-8.1-i*.32,'#f6d6b1');
  const board=this.mesh(new THREE.CapsuleGeometry(.26,1.6,4,12),'#ef8aa9',-13.7,1,-10);board.rotation.z=-.18;
  // Loose groups of beach umbrellas, clear of the boardwalk and court apron.
  for(const [x,z,color] of [[-10,4,'#f18ea5'],[-16,-4,'#58babe'],[13,-17,'#f3b378'],[-5,-17,'#e89cb4'],[-18,7,'#f3b378'],[15,7,'#58babe'],[-20,-23,'#e89cb4'],[-11,-24,'#f3b378'],[1,-25,'#58babe'],[17,-25,'#f18ea5'],[23,-12,'#f3b378'],[-15,15,'#58babe'],[16,17,'#e89cb4']] as const){
   this.box(.055,2.3,.055,x,1,z,'#a9786f');const canopy=this.mesh(new THREE.ConeGeometry(1.5,.6,8),color,x,2.4,z);canopy.rotation.y=Math.PI/8;
   this.box(.8,.08,1.8,x-.5,.04,z+1,'#f9ddc0');this.box(.8,.08,.22,x-.5,.09,z+1.5,color);
  }
  for(const [x,z,h] of [[-8,-8,6.5],[10,-9,7.8],[-9,9,7],[11,9,6.5],[-18,-17,8],[6,-21,7],[-27,-8,8.5],[19,1,8]] as const)this.palm(x,z,h);
  // Venice-only molded beach benches: one beside each team’s half, both facing the court.
  for(const side of [-1,1]){
   const x=side*4.6,z=-side*3.2;
   for(const end of [-.83,.83])this.box(.62,.43,.28,x,.215,z+end,'#f8dfbf');
   this.box(.7,.16,2.5,x,.5,z,'#53aaa9');
   for(const end of [-1.12,1.12]){
    this.box(.10,.36,.12,x+side*.24,.70,z+end,'#f8dfbf');
    this.box(.66,.10,.14,x,.88,z+end,'#f8dfbf');
   }
   const back=this.box(.14,.44,2.5,x+side*.32,.81,z,'#df8da5');back.rotation.z=-side*.1;
  }
  // A low beachfront shop makes the boardwalk feel inhabited.
  this.box(4.5,2.3,3.5,13,1,-3,'#e8ac99');this.box(4.9,.22,3.9,13,2.25,-3,'#b96b88');
  this.box(3,1.3,.05,13,1.1,-1.22,'#568c99');
 }
 private palm(x:number,z:number,height:number){
  const root=new THREE.Group();root.position.set(x,0,z);this.group.add(root);
  const tip=new THREE.Vector3(.6,height,0);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.1,height*.5,0),tip]);
  this.mesh(new THREE.TubeGeometry(curve,10,.16,7,false),'#997261',0,0,0,root);
  for(let i=0;i<9;i++){
   const angle=i*Math.PI*2/9,reach=2.4+(i%3)*.25;
   const points=[];for(let j=0;j<=8;j++){const t=j/8;const r=reach*t;points.push(new THREE.Vector3(.6+Math.cos(angle)*r,height+Math.sin(t*Math.PI)*.65-t*.9,Math.sin(angle)*r))}
   const vertices:number[]=[];
   for(let j=0;j<8;j++){const p=points[j],q=points[j+1],width=Math.sin((j+.5)/8*Math.PI)*.38;const dx=-Math.sin(angle)*width,dz=Math.cos(angle)*width;const nextWidth=Math.sin((j+1)/8*Math.PI)*.38,nx=-Math.sin(angle)*nextWidth,nz=Math.cos(angle)*nextWidth;vertices.push(p.x-dx,p.y,p.z-dz,p.x+dx,p.y,p.z+dz,q.x+nx,q.y,q.z+nz,p.x-dx,p.y,p.z-dz,q.x+nx,q.y,q.z+nz,q.x-nx,q.y,q.z-nz)}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
   const leaf=this.mesh(geometry,i%2?'#397b72':'#4a9180',0,0,0,root);leaf.material.side=THREE.DoubleSide;
  }
  root.updateMatrixWorld(true);const materials:THREE.MeshStandardMaterial[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh){o.material.transparent=true;materials.push(o.material)}});
  this.palms.push({root,bounds:new THREE.Box3().setFromObject(root),materials});
 }
 update(camera:THREE.Camera,targets:THREE.Vector3[]){for(const palm of this.palms){const blocked=treeBlocksView(palm.bounds,camera.position,targets);for(const material of palm.materials){material.opacity=blocked?.12:1;material.depthWrite=!blocked}}}
}
