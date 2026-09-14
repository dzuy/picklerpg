import * as THREE from 'three';
import type {PlayerId} from './engine/model';

/** Court-only material treatment; never writes back into a saved player design. */
export function styleCourtAthlete(root:THREE.Group,id:PlayerId){
 const seen=new Set<THREE.Material>();
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!(material instanceof THREE.MeshStandardMaterial)||seen.has(material))continue;
   seen.add(material);material.roughness=.88;material.metalness=0;
   if(material.name==='MAT_paddle_face')material.color.set('#101b2b');
   else if(material.name==='MAT_eyes_brows')material.color.set('#171321');
   else if(material.name==='MAT_hair')material.color.multiplyScalar(.78);
   else if(!['MAT_skin','MAT_inner_ear'].includes(material.name))material.color.offsetHSL(0,.08,0);
  }
 });
 const accent=id==='you'?'#DFFF32':id==='partner'?'#12E1F3':'#FF3D7D';
 const ring=root.getObjectByName('ground-ring') as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
 ring.geometry.dispose();ring.geometry=new THREE.RingGeometry(.34,id==='you'?.40:.365,48);
 ring.material.color.set(accent);ring.material.opacity=id==='you'?.95:.55;ring.material.depthWrite=false;ring.position.y=.075;
 // A cheap contact patch anchors the feet without a full-screen AO pass.
 const contact=new THREE.Mesh(new THREE.CircleGeometry(.31,24),new THREE.MeshBasicMaterial({color:'#071A43',transparent:true,opacity:.21,depthWrite:false}));
 contact.name='foot-contact';contact.userData.ownedGeometry=true;contact.rotation.x=-Math.PI/2;contact.position.y=.07;root.add(contact);
 if(id==='you'){
  const halo=new THREE.Mesh(new THREE.RingGeometry(.29,.44,48),new THREE.MeshBasicMaterial({color:'#12E1F3',transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));
  halo.name='selection-halo';halo.userData.ownedGeometry=true;halo.rotation.x=-Math.PI/2;halo.position.y=.072;root.add(halo);
  const shape=new THREE.Shape();shape.moveTo(-.10,0);shape.lineTo(.10,0);shape.lineTo(0,.18);shape.closePath();
  const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:accent,side:THREE.DoubleSide,depthWrite:false}));
  arrow.name='selection-arrow';arrow.userData.ownedGeometry=true;arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.075,-.5);root.add(arrow);
 }
}
