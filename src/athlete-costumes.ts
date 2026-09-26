import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Appearance} from './player-design';

/** Open-face animal suits share the athlete rig; no saved clothing is changed. */
export function dressCostume(model:THREE.Group,a:Appearance){
 const kind=a.outfit;if(!kind||kind==='none')return;
 const color=a.outfitColor??'#36936c',cream='#fff1c9',dark='#28262c',gold='#eaa038';
 const pale='#'+new THREE.Color(color).lerp(new THREE.Color(cream),.65).getHexString();
 const bones=new Map<string,THREE.Bone>();
 model.traverse(o=>{if(o instanceof THREE.Bone)bones.set(o.name,o);if(['top','bottom','shoes','socks','hair'].includes(o.userData.module_slot))o.visible=false;});
 const materials=new Map<string,THREE.MeshStandardMaterial>();
 function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,shade:string,p:THREE.Vector3){
  let material=materials.get(shade);if(!material){material=new THREE.MeshStandardMaterial({color:shade,roughness:.9});materials.set(shade,material)}
  const m=new THREE.Mesh(geometry,material);m.position.copy(p);m.castShadow=true;m.receiveShadow=true;m.userData.ownedGeometry=true;parent.add(m);return m;
 }
 const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
 function group(part:string){const g=new THREE.Group();g.name=`outfit-${kind}-${part}`;g.userData.option=`outfit-${kind}`;model.add(g);return g;}
 function attach(g:THREE.Group,bone:string){model.updateMatrixWorld(true);bones.get(bone)!.attach(g);}
 function point(bone:string){model.updateMatrixWorld(true);return model.worldToLocal(bones.get(bone)!.getWorldPosition(new THREE.Vector3()));}
 function ball(g:THREE.Object3D,p:THREE.Vector3,size:[number,number,number],shade=color){const m=mesh(g,new THREE.SphereGeometry(1,20,14),shade,p);m.scale.set(...size);return m;}
 function box(g:THREE.Object3D,p:THREE.Vector3,size:[number,number,number],shade=color){return mesh(g,new RoundedBoxGeometry(...size,3,.035),shade,p);}
 function link(g:THREE.Object3D,p:THREE.Vector3,q:THREE.Vector3,width:number,shade=color){const m=box(g,p.clone().add(q).multiplyScalar(.5),[width,p.distanceTo(q)+.05,width],shade);m.quaternion.setFromUnitVectors(v(0,1,0),q.clone().sub(p).normalize());return m;}
 function cone(g:THREE.Object3D,p:THREE.Vector3,r:number,h:number,shade:string){return mesh(g,new THREE.ConeGeometry(r,h,12),shade,p);}
 function tail(g:THREE.Object3D,points:THREE.Vector3[],radius:number,shade:string){
  const path=new THREE.CatmullRomCurve3(points),geometry=new THREE.TubeGeometry(path,32,radius,10,false),pos=geometry.attributes.position;
  for(let row=0;row<=32;row++){const center=path.getPointAt(row/32);for(let col=0;col<=10;col++){const i=row*11+col,p=new THREE.Vector3().fromBufferAttribute(pos,i).sub(center).multiplyScalar(1-row/32*.97).add(center);pos.setXYZ(i,p.x,p.y,p.z)}}
  geometry.computeVertexNormals();mesh(g,geometry,shade,v(0,0,0));return path;
 }
 const head=group('hood');
 // Four soft sides frame the human face; the rear shell covers hair and ears.
 box(head,v(0,1.22,-.23),[.80,.66,.23]);
 box(head,v(-.365,1.20,.07),[.13,.59,.53]);box(head,v(.365,1.20,.07),[.13,.59,.53]);
 box(head,v(0,1.505,.03),[.83,.16,.63]);box(head,v(0,.935,.045),[.75,.09,.58]);
 const body=group('body');ball(body,v(0,.66,0),[.235,.235,.175]);
 ball(body,v(0,.64,.15),[.16,.17,.052],kind==='bee'?gold:cream);
 if(kind==='bee')for(const y of [.53,.65,.77]){const band=mesh(body,new THREE.CylinderGeometry(.223,.223,.052,28),dark,v(0,y,0));band.scale.z=.76;}
 attach(body,'chest');
 const hips=group('hips');ball(hips,v(0,.49,0),[.22,.12,.17]);
 for(const side of ['L','R']){
  const shoulder=point('upper_arm'+side),elbow=point('forearm'+side),wrist=point('hand'+side);
  const upper=group('upper-arm-'+side);link(upper,shoulder,elbow,.175);attach(upper,'upper_arm'+side);
  const lower=group('forearm-'+side);link(lower,elbow,wrist,.155);attach(lower,'forearm'+side);
  const glove=group('glove-'+side);ball(glove,wrist,[.10,.10,.10]);attach(glove,'hand'+side);
  const hip=point('thigh'+side),knee=point('shin'+side),ankle=point('foot'+side);
  const thigh=group('thigh-'+side);link(thigh,hip,knee,.235);attach(thigh,'thigh'+side);
  const shin=group('shin-'+side);link(shin,knee,ankle,.195);attach(shin,'shin'+side);
  const foot=group('foot-'+side),center=ankle.clone().add(v(0,-.02,.085));ball(foot,center,[.13,.095,.21]);
  if(['frog','dinosaur'].includes(kind))for(const dx of [-.075,0,.075])ball(foot,center.clone().add(v(dx,-.01,.14)),[.047,.052,.085],color);
  if(kind==='bear'||kind==='lion')for(const dx of [-.065,0,.065])ball(foot,center.clone().add(v(dx,.025,.15)),[.025,.025,.055],cream);
  attach(foot,'foot'+side);
 }
 if(kind==='frog'){
  for(const sign of [-1,1]){ball(head,v(sign*.245,1.64,.045),[.16,.16,.15]);ball(head,v(sign*.245,1.67,.173),[.105,.10,.045],cream);ball(head,v(sign*.245,1.67,.21),[.049,.063,.018],dark);}
  box(head,v(0,1.49,.34),[.59,.04,.045],pale);
 }else if(kind==='dinosaur'){
  ball(head,v(0,1.53,.29),[.36,.12,.19]);
  for(const sign of [-1,1]){ball(head,v(sign*.28,1.63,.09),[.10,.10,.09],cream);ball(head,v(sign*.28,1.64,.17),[.032,.045,.025],dark);ball(head,v(sign*.15,1.57,.456),[.018,.012,.008],dark);}
  for(const z of [-.22,-.08,.06]){const spike=cone(head,v(0,1.62,z),.055,.10,gold);spike.name='dinosaur-head-spike';}
  const path=tail(hips,[v(0,.5,-.12),v(.15,.36,-.38),v(.46,.27,-.51),v(.76,.38,-.47)],.15,color);
  for(let i=0;i<6;i++){const t=.12+i*.14,p=path.getPointAt(t);p.y+=.14*(1-t);cone(hips,p,.053*(1-t)+.012,.14*(1-t)+.02,gold);}
 }else if(kind==='lion'||kind==='bear'){
  if(kind==='lion')for(let i=0;i<18;i++){const t=i*Math.PI/9;ball(head,v(Math.cos(t)*.43,1.22+Math.sin(t)*.38,-.02),[.15,.16,.14],gold);}
  for(const sign of [-1,1]){ball(head,v(sign*.31,1.62,-.03),[.135,.135,.10]);ball(head,v(sign*.31,1.63,.055),[.078,.075,.035],pale);}
  ball(head,v(0,1.50,.34),[.19,.09,.075],cream);ball(head,v(0,1.54,.40),[.057,.034,.025],dark);
  if(kind==='lion'){tail(hips,[v(0,.50,-.12),v(.18,.36,-.31),v(.38,.31,-.37),v(.51,.43,-.35)],.05,color);ball(hips,v(.51,.43,-.35),[.08,.10,.08],gold);}
  else ball(hips,v(0,.49,-.20),[.09,.09,.09]);
 }else{
  // Butterfly and bee wing pairs sit behind the torso and move with it.
  const wings=group('wings');
  const hinges:THREE.Group[]=[];
  for(const sign of [-1,1]){
   const hinge=new THREE.Group();hinge.name=`outfit-${kind}-wing-hinge-${sign}`;hinge.position.set(sign*.10,.73,-.23);hinge.userData.wingSign=sign;hinge.userData.wingKind=kind;wings.add(hinge);hinges.push(hinge);
   const wingPart=new THREE.Group();wingPart.position.copy(hinge.position).multiplyScalar(-1);hinge.add(wingPart);
   if(kind==='butterfly'){
    for(const [x,y,sx,sy] of [[.48,.89,.35,.36],[.40,.49,.28,.25]]){
     const outer=ball(wingPart,v(sign*x,y,-.22),[sx,sy,.045],dark);outer.rotation.z=-sign*.32;
     const inner=ball(wingPart,v(sign*x,y,-.17),[sx*.88,sy*.88,.025],color);inner.rotation.z=-sign*.32;
     ball(wingPart,v(sign*(x+.075),y+.02,-.14),[sx*.28,sy*.30,.012],pale);
     const back=ball(wingPart,v(sign*x,y,-.27),[sx*.88,sy*.88,.025],color);back.rotation.z=-sign*.32;
     ball(wingPart,v(sign*(x+.075),y+.02,-.30),[sx*.28,sy*.30,.012],pale);
    }
   }else{
    for(const [x,y] of [[.40,.92],[.34,.62]]){const wing=ball(wingPart,v(sign*x,y,-.44),[.32,.22,.04],cream);wing.rotation.z=sign*.45;}
   }
   const stalk=link(head,v(sign*.18,1.56,0),v(sign*.26,1.82,.015),.028,dark);stalk.name='costume-antenna';ball(head,v(sign*.26,1.82,.015),[.055,.055,.055],kind==='bee'?gold:color);
  }
  model.userData.costumeWingHinges=hinges;
  attach(wings,'chest');animateCostumeWings(model,0);
  if(kind==='bee'){const abdomen=ball(hips,v(0,.48,-.15),[.20,.14,.24],color);abdomen.name='bee-abdomen';const sting=cone(hips,v(0,.43,-.38),.05,.15,dark);sting.rotation.x=-Math.PI/2;}
 }
 // Seat the whole hood lower so its lower edge covers the character's chin.
 head.position.y-=.055;
 attach(hips,'pelvis');attach(head,'head');
}

/** A relaxed three-second flap, independent of the character's skeletal pose. */
export function animateCostumeWings(root:THREE.Group,time:number){
 const model=(root.userData.model??root) as THREE.Group;
 const hinges=model.userData.costumeWingHinges as THREE.Group[]|undefined;
 if(!hinges)return;
 const wave=(1-Math.cos(time*Math.PI*2/3))*.5;
 for(const hinge of hinges){const bee=hinge.userData.wingKind==='bee';hinge.rotation.y=hinge.userData.wingSign*((bee?.48:.12)+wave*(bee?.40:.48));}
}
