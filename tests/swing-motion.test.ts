import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {animateAthlete,setAthleteHandedness} from '../src/athlete';
import {athletePose} from '../src/athlete-motion';
import {Match} from '../src/match';

async function fixture(){
 const bytes=await readFile(new URL('../public/models/riley/riley.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const root=new THREE.Group();root.add(scene);
 const bones=new Map(),rest=new Map(),positions=new Map();
 scene.traverse(object=>{if(object instanceof THREE.Bone){const name=object.name.replace(/(L|R)$/,'.$1');bones.set(name,object);rest.set(name,object.quaternion.clone());positions.set(name,object.position.clone());}});
 root.userData.playerRig={bones,rest,positions};
 const match=new Match(),state=match.snapshot(),shot=structuredClone(match.shot),player=state.players[0];
 shot.contact.x=player.position.x+.4;delete shot.feedback;state.phase='flight';
 function paddle(type:'overhead'|'drive'|'lob',age:number,left=false){
  shot.intent.type=type;state.elapsed=age;
  animateAthlete(root,athletePose(player,state,shot));setAthleteHandedness(root,left?'left':'right');root.updateMatrixWorld(true);
  let mesh!:THREE.SkinnedMesh;scene.getObjectByName('paddle_01')!.traverse(object=>{if(!mesh&&object instanceof THREE.SkinnedMesh)mesh=object;});
  const center=new THREE.Vector3();
  for(let i=0;i<mesh.geometry.attributes.position.count;i++)center.add(mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).applyMatrix4(mesh.matrixWorld));
  return center.divideScalar(mesh.geometry.attributes.position.count);
 }
 return {paddle};
}
test('production paddle rises beside the head for an overhead and slams down',async()=>{
 const {paddle}=await fixture();const raised=paddle('overhead',0),finish=paddle('overhead',.33);
 assert.ok(raised.y>1.25,`Paddle must clear the face: ${raised.y}`);
 assert.ok(raised.y-finish.y>.6,'Overhead needs a substantial downward arc');
});
test('production drive sweeps sideways and mirrors for a left-handed player',async()=>{
 const {paddle}=await fixture();const load=paddle('drive',0),finish=paddle('drive',.41),left=paddle('drive',.41,true);
 assert.ok(finish.x-load.x>.45,'Drive should cross the body');
 assert.ok(Math.abs(left.x+finish.x)<1e-6);assert.ok(Math.abs(left.y-finish.y)<1e-6);
});
test('production lob scoops low to high then recovers without a pose snap',async()=>{
 const {paddle}=await fixture();const load=paddle('lob',0),finish=paddle('lob',.51);
 assert.ok(finish.y-load.y>.4,'Lob needs a visible upward lift');
 const delta=paddle('lob',.8499).distanceTo(paddle('lob',.85));assert.ok(delta<.001,`Recovery should remain continuous: ${delta}`);
});
