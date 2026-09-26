import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import type {AthletePose} from './athlete-motion';
import type {PlayerId} from './engine/model';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';
import {dressAthlete} from './athlete-options';

const MODEL_URL='/models/riley/riley.glb';
const loader=new GLTFLoader();
let base:THREE.Group|null=null;
const palettes:Record<PlayerId,Partial<Appearance>>={
 you:{},partner:{skin:'#ad7553',hair:'#30271f',hat:'none',jersey:'#d8ebb0',accent:'#537464',shoes:'#537464',paddle:'#537464'},
 'opponent-left':{skin:'#e7b99a',hair:'#6a3f29',accent:'#a85856',jersey:'#cf6d63',shoes:'#a85856',paddle:'#a85856',hairStyle:'ponytail',hat:'none',top:'tank',bottom:'skirt'},
 'opponent-right':{skin:'#875338',hair:'#262324',accent:'#355b64',jersey:'#47747a',shoes:'#355b64',paddle:'#355b64',hat:'visor'}
};

/** Load once before the court and creator request synchronous character instances. */
export async function preloadAthletes(){
 if(base)return;
 base=(await loader.loadAsync(MODEL_URL)).scene;
}
function colorFor(material:string,a:Appearance){
 if(material==='MAT_skin'||material==='MAT_inner_ear')return a.skin;
 if(material==='MAT_hair'||material==='MAT_eyes_brows')return a.hair;
 if(material==='MAT_top')return a.jersey;
 if(material==='MAT_bottom')return a.bottomColor;
 if(material==='MAT_accessory')return a.accent;
 if(material==='MAT_shoe_accent')return a.shoes;
 if(material==='MAT_paddle_color')return a.paddle;
 return null;
}
function cloneMaterials(root:THREE.Object3D,a:Appearance){
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const source=Array.isArray(object.material)?object.material:[object.material];
  const cloned=source.map(material=>{const result=material.clone(),color=colorFor(material.name,a);if(color&&'color' in result)(result as THREE.MeshStandardMaterial).color.set(color);return result});
  object.material=Array.isArray(object.material)?cloned:cloned[0];object.castShadow=true;object.receiveShadow=true;
 });
}
function collectRig(root:THREE.Group){
 const bones=new Map<string,THREE.Bone>(),rest=new Map<string,THREE.Quaternion>(),positions=new Map<string,THREE.Vector3>();
 root.traverse(object=>{if(object instanceof THREE.Bone){const name=object.name.replace(/(L|R)$/,'.$1');bones.set(name,object);rest.set(name,object.quaternion.clone());positions.set(name,object.position.clone())}});
 return {bones,rest,positions};
}
export function createAthlete(id:PlayerId,color:string,appearance?:Appearance){
 if(!base)throw new Error('Player asset was used before preloadAthletes() completed.');
 const a={...DEFAULT_APPEARANCE,jersey:color,...palettes[id],...appearance};
 const root=new THREE.Group(),model=cloneSkeleton(base) as THREE.Group;model.name='player-model';model.rotation.y=Math.PI;root.add(model);cloneMaterials(model,a);
 dressAthlete(model,a);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.32,.345,40),new THREE.MeshBasicMaterial({color:id==='you'?'#eeff87':'#d0dbbb',transparent:true,opacity:id==='you'?.85:.4,side:THREE.DoubleSide}));
 ring.userData.ownedGeometry=true;ring.name='ground-ring';ring.rotation.x=-Math.PI/2;ring.position.y=.055;root.add(ring);
 root.userData.appearance={...a};root.userData.playerRig=collectRig(model);root.userData.model=model;return root;
}
function resetRig(root:THREE.Group){const rig=root.userData.playerRig as ReturnType<typeof collectRig>;for(const [name,bone] of rig.bones){bone.quaternion.copy(rig.rest.get(name)!);bone.position.copy(rig.positions.get(name)!)}return rig}
function rotate(rig:ReturnType<typeof collectRig>,name:string,x=0,y=0,z=0){const bone=rig.bones.get(name);if(bone)bone.quaternion.copy(rig.rest.get(name)!).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')))}
/** Map the established tactical poses onto the production skeleton. */
export function animateAthlete(root:THREE.Group,pose:AthletePose){
 const rig=resetRig(root);const pelvis=rig.bones.get('pelvis');if(pelvis)pelvis.position.y=rig.positions.get('pelvis')!.y-pose.crouch;
 // Elevate the hitting shoulder so an overhead clears the stylized oversized head.
 const shoulder=rig.bones.get('clavicle.R');if(shoulder&&pose.shoulderLift){shoulder.position.y+=pose.shoulderLift;shoulder.position.x-=pose.shoulderLift*.65;}
 rotate(rig,'chest',pose.lean*.4,pose.torso,pose.lean);rotate(rig,'upper_arm.R',pose.armX,pose.armY,pose.armZ);rotate(rig,'forearm.R',pose.elbow,pose.wrist*.18,pose.wrist*.35);rotate(rig,'hand.R',pose.wrist*.45,0,pose.wrist*.18);
 rotate(rig,'upper_arm.L',pose.offArm,0,-.12);rotate(rig,'thigh.L',pose.stride,0,.045);rotate(rig,'shin.L',Math.max(0,-pose.stride)*.6);rotate(rig,'thigh.R',-pose.stride,0,-.045);rotate(rig,'shin.R',Math.max(0,pose.stride)*.6);root.rotation.z=pose.lean;
}
export function poseAthleteForPortrait(root:THREE.Group){
 const rig=resetRig(root);rotate(rig,'chest',0,.1);rotate(rig,'head',0,-.16,.025);rotate(rig,'upper_arm.R',-.08,0,.12);rotate(rig,'forearm.R',-.2);rotate(rig,'upper_arm.L',-.08,0,-.12);rotate(rig,'forearm.L',-.2);rotate(rig,'thigh.L',0,0,-.055);rotate(rig,'thigh.R',0,0,.055);
 const ring=root.getObjectByName('ground-ring');if(ring)ring.visible=false;
}
/** Relaxed open stance keeps the shirt and shorts visible in the outfit editor. */
export function poseAthleteForEditor(root:THREE.Group){
 poseAthleteForPortrait(root);
 const rig=root.userData.playerRig as ReturnType<typeof collectRig>;
 rotate(rig,'chest');rotate(rig,'head');
 rotate(rig,'upper_arm.R',-.08,0,.6);rotate(rig,'forearm.R',-.12);
 rotate(rig,'upper_arm.L',-.08,0,-.6);rotate(rig,'forearm.L',-.12);
 root.rotation.z=0;
}
export function disposeAthlete(root:THREE.Group){root.traverse(object=>{if(object instanceof THREE.Mesh){if(object.userData.ownedGeometry)object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose()}})}
export function setAthleteHandedness(root:THREE.Group,hand:'left'|'right'){root.scale.x=hand==='left'?-1:1}

/** Compact two-handed ready stance, with a gentle breathing cycle. */
function poseRosterReady(root:THREE.Group,time=0){
 const breath=Math.sin(time*1.8)*.018;
 const rig=resetRig(root);
 rotate(rig,'chest',.1,0,breath*.3);
 rotate(rig,'head',-.08);
 rotate(rig,'upper_arm.R',-.75+breath,0,-.35);
 rotate(rig,'forearm.R',-.8,0,-.25);
 rotate(rig,'hand.R',-.3,1.2,-.25);
 rotate(rig,'upper_arm.L',-.75+breath,0,.35);
 rotate(rig,'forearm.L',-.8,0,.25);
 rotate(rig,'thigh.L',-.4,0,-.14);
 rotate(rig,'thigh.R',-.4,0,.14);
 rotate(rig,'shin.L',.7);
 rotate(rig,'shin.R',.7);
 rotate(rig,'foot.L',-.3);
 rotate(rig,'foot.R',-.3);
 const pelvis=rig.bones.get('pelvis');if(pelvis)pelvis.position.y-=.065-breath*.2;
 const ring=root.getObjectByName('ground-ring');if(ring)ring.visible=false;
}

function poseRosterSwing(root:THREE.Group,phase:'load'|'contact'|'follow'){
 // Keep the stroke forward of the chest; broad cross-body finishes clip this compact rig.
 const frames={load:[-.85,.7,-.25,-.2],contact:[-1.2,.15,-.15,0],follow:[-1.3,-.2,-.2,.2]};
 const [armX,armZ,elbow,torso]=frames[phase];
 animateAthlete(root,{style:'forehand',reaction:null,armX,armY:0,armZ,elbow,wrist:0,offArm:-.4,torso,lean:0,crouch:.045,stride:phase==='follow'?.18:-.12,celebrate:false});
 const rig=root.userData.playerRig as ReturnType<typeof collectRig>;
 rotate(rig,'upper_arm.L',-.7,0,-.3);
 rotate(rig,'forearm.L',-.6);
 const ring=root.getObjectByName('ground-ring');if(ring)ring.visible=false;
}
/** Stable card variety: ready stance, forehand preparation, or low follow-through. */
export function poseAthleteForRoster(root:THREE.Group){
 const seed=JSON.stringify(root.userData.appearance).split('').reduce((sum,char)=>sum+char.charCodeAt(0),0);
 if(seed%3===1)poseRosterReady(root);
 else poseRosterSwing(root,seed%3===0?'load':'follow');
}
type ShowcaseFrame=Map<string,{rotation:THREE.Quaternion;position:THREE.Vector3}>;
/** A smooth practice loop: settle, prepare, swing, follow through, and recover. */
export function animateRosterAthlete(root:THREE.Group,time:number){
 const rig=root.userData.playerRig as ReturnType<typeof collectRig>;
 let frames=root.userData.rosterShowcaseFrames as ShowcaseFrame[]|undefined;
 if(!frames){
  frames=[];
  for(const pose of ['ready','load','contact','follow'] as const){
   if(pose==='ready')poseRosterReady(root);else poseRosterSwing(root,pose);
   frames.push(new Map([...rig.bones].map(([name,bone])=>[name,{rotation:bone.quaternion.clone(),position:bone.position.clone()}])));
  }
  root.userData.rosterShowcaseFrames=frames;
 }
 const beats=[{at:0,pose:0},{at:1.4,pose:0},{at:2.3,pose:1},{at:2.65,pose:2},{at:3.15,pose:3},{at:3.5,pose:3},{at:4.05,pose:2},{at:4.8,pose:0},{at:6,pose:0}];
 const t=((time%6)+6)%6;
 const index=beats.findIndex((beat,i)=>i<beats.length-1&&t>=beat.at&&t<beats[i+1].at);
 const from=beats[index],to=beats[index+1],progress=(t-from.at)/(to.at-from.at),blend=progress*progress*(3-2*progress);
 for(const [name,bone] of rig.bones){const a=frames[from.pose].get(name)!,b=frames[to.pose].get(name)!;bone.quaternion.slerpQuaternions(a.rotation,b.rotation,blend);bone.position.lerpVectors(a.position,b.position,blend);}
 root.rotation.z=0;
}
