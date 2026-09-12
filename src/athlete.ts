import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import type {AthletePose} from './athlete-motion';
import type {PlayerId} from './simulation';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';

const MODEL_URL='/models/riley/riley.glb';
const loader=new GLTFLoader();
let base:THREE.Group|null=null,glassesBase:THREE.Group|null=null,visorBase:THREE.Group|null=null;
const palettes:Record<PlayerId,Partial<Appearance>>={
 you:{},partner:{skin:'#ad7553',hair:'#30271f',hat:'none',jersey:'#d8ebb0',accent:'#537464',shoes:'#537464',paddle:'#537464'},
 'opponent-left':{skin:'#e7b99a',hair:'#6a3f29',accent:'#a85856',jersey:'#cf6d63',shoes:'#a85856',paddle:'#a85856',hairStyle:'ponytail',hat:'none',top:'tank',bottom:'skirt'},
 'opponent-right':{skin:'#875338',hair:'#262324',accent:'#355b64',jersey:'#47747a',shoes:'#355b64',paddle:'#355b64',hat:'visor'}
};

/** Load once before the court and creator request synchronous character instances. */
export async function preloadAthletes(){
 if(base)return;
 const [player,glasses,visor]=await Promise.all([
  loader.loadAsync(MODEL_URL),loader.loadAsync('/models/riley/glasses.glb'),loader.loadAsync('/models/riley/hat_visor.glb')
 ]);
 base=player.scene;glassesBase=glasses.scene;visorBase=visor.scene;
}
function colorFor(material:string,a:Appearance){
 if(material==='MAT_skin'||material==='MAT_inner_ear')return a.skin;
 if(material==='MAT_hair'||material==='MAT_eyes_brows')return a.hair;
 if(material==='MAT_top')return a.jersey;
 if(material==='MAT_bottom'||material==='MAT_accessory')return a.accent;
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
function attachModule(target:THREE.Group,source:THREE.Group,a:Appearance){
 const option=cloneSkeleton(source) as THREE.Group,mainBones=new Map<string,THREE.Bone>();
 target.traverse(object=>{if(object instanceof THREE.Bone)mainBones.set(object.name,object)});
 option.updateMatrixWorld(true);const meshes:THREE.SkinnedMesh[]=[];option.traverse(object=>{if(object instanceof THREE.SkinnedMesh)meshes.push(object)});
 const module=new THREE.Group();module.name=meshes[0]?.userData.module_slot??'module';target.add(module);
 for(const mesh of meshes){
  const bones=mesh.skeleton.bones.map(bone=>mainBones.get(bone.name));if(bones.some(bone=>!bone))throw new Error(`Accessory rig does not match ${MODEL_URL}`);
  module.attach(mesh);mesh.bind(new THREE.Skeleton(bones as THREE.Bone[],mesh.skeleton.boneInverses),mesh.bindMatrix);cloneMaterials(mesh,a);
 }
 return module;
}
function moduleVisible(root:THREE.Object3D,slot:string,visible:boolean){root.traverse(object=>{if(object.userData.module_slot===slot||object.name===slot)object.visible=visible})}
function collectRig(root:THREE.Group){
 const bones=new Map<string,THREE.Bone>(),rest=new Map<string,THREE.Quaternion>(),positions=new Map<string,THREE.Vector3>();
 root.traverse(object=>{if(object instanceof THREE.Bone){bones.set(object.name,object);rest.set(object.name,object.quaternion.clone());positions.set(object.name,object.position.clone())}});
 return {bones,rest,positions};
}
export function createAthlete(id:PlayerId,color:string,appearance?:Appearance){
 if(!base||!glassesBase||!visorBase)throw new Error('Player asset was used before preloadAthletes() completed.');
 const a={...DEFAULT_APPEARANCE,jersey:color,...palettes[id],...appearance};
 const root=new THREE.Group(),model=cloneSkeleton(base) as THREE.Group;model.name='player-model';model.rotation.y=Math.PI;root.add(model);cloneMaterials(model,a);
 moduleVisible(model,'hair',a.hairStyle!=='none');if(a.glasses!=='none')attachModule(model,glassesBase,a);if(a.hat!=='none')attachModule(model,visorBase,a);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.32,.345,40),new THREE.MeshBasicMaterial({color:id==='you'?'#eeff87':'#d0dbbb',transparent:true,opacity:id==='you'?.85:.4,side:THREE.DoubleSide}));
 ring.name='ground-ring';ring.rotation.x=-Math.PI/2;ring.position.y=.055;root.add(ring);
 root.userData.playerRig=collectRig(model);root.userData.model=model;return root;
}
function resetRig(root:THREE.Group){const rig=root.userData.playerRig as ReturnType<typeof collectRig>;for(const [name,bone] of rig.bones){bone.quaternion.copy(rig.rest.get(name)!);bone.position.copy(rig.positions.get(name)!)}return rig}
function rotate(rig:ReturnType<typeof collectRig>,name:string,x=0,y=0,z=0){const bone=rig.bones.get(name);if(bone)bone.quaternion.copy(rig.rest.get(name)!).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')))}
/** Map the established tactical poses onto the production skeleton. */
export function animateAthlete(root:THREE.Group,pose:AthletePose){
 const rig=resetRig(root);const pelvis=rig.bones.get('pelvis');if(pelvis)pelvis.position.y=rig.positions.get('pelvis')!.y-pose.crouch;
 rotate(rig,'chest',pose.lean*.4,pose.torso,pose.lean);rotate(rig,'upper_arm.R',pose.armX*.72,pose.armY*.72,pose.armZ*.85);rotate(rig,'forearm.R',pose.elbow,pose.wrist*.18,pose.wrist*.35);rotate(rig,'hand.R',pose.wrist*.45,0,pose.wrist*.18);
 rotate(rig,'upper_arm.L',pose.offArm*.38,0,-.12-pose.offArm*.2);rotate(rig,'thigh.L',pose.stride,0,.045);rotate(rig,'shin.L',Math.max(0,-pose.stride)*.6);rotate(rig,'thigh.R',-pose.stride,0,-.045);rotate(rig,'shin.R',Math.max(0,pose.stride)*.6);root.rotation.z=pose.lean;
}
export function poseAthleteForPortrait(root:THREE.Group){
 const rig=resetRig(root);rotate(rig,'chest',0,.1);rotate(rig,'head',0,-.16,.025);rotate(rig,'upper_arm.R',-.08,0,.12);rotate(rig,'forearm.R',-.2);rotate(rig,'upper_arm.L',-.08,0,-.12);rotate(rig,'forearm.L',-.2);rotate(rig,'thigh.L',0,0,-.055);rotate(rig,'thigh.R',0,0,.055);
 const ring=root.getObjectByName('ground-ring');if(ring)ring.visible=false;
}
export function disposeAthlete(root:THREE.Group){root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose()})}
export function setAthleteHandedness(root:THREE.Group,hand:'left'|'right'){root.scale.x=hand==='left'?-1:1}
