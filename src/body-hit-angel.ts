import * as THREE from 'three';
import {animateAthlete,createAthlete,disposeAthlete} from './athlete';
import type {AthletePose} from './athlete-motion';
import type {Appearance} from './player-design';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
/** Deterministic timing supports live play and scrubbing the same reaction in replay. */
export function angelFrame(age:number,reduced=false){
 const rise=clamp((age-.95)/3.5);
 // Accelerate into contact, then rebound once with a smaller settling bounce.
 const drop=Math.pow(clamp(age/.72),2.35),impact=Math.max(0,age-.72);
 const bounce=impact<.26?Math.sin(impact/.26*Math.PI)*.11:impact<.44?Math.sin((impact-.26)/.18*Math.PI)*.025:0;
 return {fall:reduced?1:drop-bounce,bounce:reduced?0:bounce*.48,rise:reduced?.45:rise,
  opacity:age<.8?0:.78*smooth((age-.8)/.35)*(1-smooth((age-3.8)/.8)),
  flap:reduced?0:Math.sin(Math.max(0,age-.8)*6)*.28};
}
/** Wave with the empty hand so the paddle never obscures the goodbye gesture. */
export function angelWavePose(age:number,reduced=false):AthletePose{
 const lift=reduced?1:smooth((age-1.1)/.5);
 const wave=reduced?0:Math.sin(Math.max(0,age-1.6)*9)*lift;
 return {style:'ready',reaction:null,armX:-.25,armY:0,armZ:.45,elbow:-.15,wrist:0,
  offShoulderLift:0,offArm:-.4-lift*1.1,offArmZ:-.12-lift*1.48+wave*.10,offElbow:-.25*lift,offWrist:wave*.5,
  torso:0,lean:0,crouch:0,stride:0,celebrate:false};
}
function crossedEyes(root:THREE.Group){
 const expression=root.getObjectByName(`option-expression-${root.userData.appearance.expression}`);
 if(!expression)return ()=>{};
 const hidden:THREE.Object3D[]=[];
 expression.traverse(o=>{if(o.userData.bodyHitEye&&o.visible){hidden.push(o);o.visible=false;}});
 const crosses=new THREE.Group();crosses.name='body-hit-x-eyes';expression.add(crosses);
 for(const sign of [-1,1])for(const slope of [-1,1]){
  const stroke=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.105,4,8),new THREE.MeshStandardMaterial({color:'#25272d',roughness:.85}));
  stroke.userData.ownedGeometry=true;stroke.position.set(sign*.137,1.603-.5064,.278);stroke.rotation.z=slope*Math.PI/4;crosses.add(stroke);
 }
 return ()=>{hidden.forEach(o=>o.visible=true);crosses.removeFromParent();disposeAthlete(crosses)};
}
export class BodyHitAngel {
 private restoreEyes:(()=>void)|null=null;
 private ghost:THREE.Group|null=null;
 private body:THREE.Group|null=null;
 private wings:THREE.Group[]=[];
 private materials:THREE.Material[]=[];
 clear(){
  this.restoreEyes?.();this.restoreEyes=null;
  if(this.body){const model=this.body.userData.model as THREE.Group;model.rotation.set(0,Math.PI,0);model.position.set(0,0,0);this.body=null;}
  if(this.ghost){this.ghost.removeFromParent();disposeAthlete(this.ghost);this.ghost=null;}
  this.materials=[];this.wings=[];
 }
 apply(body:THREE.Group,age:number,reduced=false){
  if(this.body!==body){this.clear();this.body=body;this.restoreEyes=crossedEyes(body);}
  const f=angelFrame(age,reduced),model=body.userData.model as THREE.Group;
  model.rotation.set(f.fall*Math.PI/2,Math.PI,0);model.position.y=.20*f.fall+f.bounce;
  if(!this.ghost){
   const ghost=createAthlete('you','#fff',body.userData.appearance as Appearance);this.ghost=ghost;ghost.name='body-hit-angel';body.parent!.add(ghost);
   ghost.getObjectByName('ground-ring')!.visible=false;
   // Runtime hair/face meshes share materials: tint each material only once.
   const unique=new Set<THREE.Material>(),natural=new Set<THREE.Material>(),hair=new Set<THREE.Material>();
   ghost.traverse(o=>{if(o instanceof THREE.Mesh){
    o.castShadow=false;o.receiveShadow=false;
    let feature=false,hairFeature=false;for(let node:THREE.Object3D|null=o;node;node=node.parent){if(node.name.startsWith('option-hair-')||node.userData.module_slot==='hair')hairFeature=true;if(node.name.startsWith('option-expression-'))feature=true;}
    for(const m of Array.isArray(o.material)?o.material:[o.material]){unique.add(m);if(feature||hairFeature||['MAT_hair','MAT_eyes_brows'].includes(m.name))natural.add(m);if(hairFeature||m.name==='MAT_hair')hair.add(m);}
   }});
   for(const m of unique){
    m.transparent=true;m.depthWrite=true;
    if(hair.has(m)&&m instanceof THREE.MeshStandardMaterial){m.color.lerp(new THREE.Color('#f5eee3'),.16);m.userData.angelOpacity=.88;}
    else if(natural.has(m)&&m instanceof THREE.MeshStandardMaterial){m.color.lerp(new THREE.Color('#f5eee3'),.16);m.userData.angelOpacity=.88;}
    else if(m instanceof THREE.MeshStandardMaterial){m.color.lerp(new THREE.Color('#e6faff'),.18);m.emissive.set('#b6eaff');m.emissiveIntensity=.08;}
    this.materials.push(m);
   }
   const rig=ghost.userData.playerRig as {bones:Map<string,THREE.Bone>};
   // Bind decorations in the rest pose so they follow both bones and the soul's tilt.
   const bind=(part:THREE.Object3D,bone:string)=>{ghost.updateMatrixWorld(true);rig.bones.get(bone)!.attach(part)};
   // Wing roots sit at the shoulder blades, below the oversized head.
   for(const side of [-1,1]){
    const wing=new THREE.Group();wing.name='angel-wing';wing.position.set(side*.10,.88,.14);wing.scale.set(.85,-.85,.85);ghost.add(wing);this.wings.push(wing);
    for(let i=0;i<6;i++){
     const mat=new THREE.MeshStandardMaterial({color:'#f0fbff',emissive:'#b6eaff',emissiveIntensity:.45,transparent:true,opacity:.5,depthWrite:false,roughness:.7});
     const feather=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat);feather.userData.ownedGeometry=true;
     feather.scale.set(.105,.47-i*.033,.045);feather.position.set(side*(.08+i*.105),.28-i*.065,0);feather.rotation.z=-side*(.35+i*.16);wing.add(feather);this.materials.push(mat);
    }
    bind(wing,'chest');wing.userData.restQuaternion=wing.quaternion.clone();
   }
   const haloMat=new THREE.MeshBasicMaterial({color:'#ffd45c',transparent:true,opacity:1,depthWrite:false,toneMapped:false});
   haloMat.userData.angelOpacity=1;
   const halo=new THREE.Mesh(new THREE.TorusGeometry(.27,.025,10,48),haloMat);halo.name='angel-halo';halo.userData.ownedGeometry=true;halo.rotation.x=Math.PI/2;halo.position.y=1.65;ghost.add(halo);bind(halo,'head');this.materials.push(haloMat);
   for(const [radius,opacity] of [[.045,.20],[.072,.09]]){
    const glowMat=new THREE.MeshBasicMaterial({color:'#ffd45c',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});glowMat.userData.angelOpacity=opacity;
    const glow=new THREE.Mesh(new THREE.TorusGeometry(.27,radius,12,48),glowMat);glow.userData.ownedGeometry=true;halo.add(glow);this.materials.push(glowMat);
   }
  }
  const ghost=this.ghost;ghost.visible=f.opacity>0;ghost.position.copy(body.position);ghost.scale.copy(body.scale);ghost.rotation.set(0,body.rotation.y,0);
  ghost.position.y+=.25+f.rise*f.rise*6;ghost.position.z+=Math.cos(body.rotation.y)*.5*(1-f.rise);
  const pose=angelWavePose(age,reduced);
  animateAthlete(ghost,pose,0);
  const soulModel=ghost.userData.model as THREE.Group;soulModel.rotation.x=(1-smooth((age-.8)/.65))*Math.PI/2;
  this.wings.forEach((wing,i)=>wing.quaternion.copy(wing.userData.restQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(i===0?-1:1)*f.flap)));
  for(const material of this.materials)material.opacity=f.opacity/.78*(material.userData.angelOpacity??.78);
 }
}
