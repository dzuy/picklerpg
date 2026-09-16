import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {animateRosterAthlete} from '../src/athlete';

test('roster swing moves the production rig, stays finite, and loops without a jump',async()=>{
 const bytes=readFileSync(new URL('../public/models/riley/riley.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const root=new THREE.Group();root.add(scene);
 const bones=new Map<string,THREE.Bone>(),rest=new Map<string,THREE.Quaternion>(),positions=new Map<string,THREE.Vector3>();
 scene.traverse(object=>{if(object instanceof THREE.Bone){const name=object.name.replace(/(L|R)$/,'.$1');bones.set(name,object);rest.set(name,object.quaternion.clone());positions.set(name,object.position.clone());}});
 root.userData.playerRig={bones,rest,positions};
 animateRosterAthlete(root,0);const ready=bones.get('upper_arm.R')!.quaternion.clone();
 animateRosterAthlete(root,2.65);assert.ok(ready.angleTo(bones.get('upper_arm.R')!.quaternion)>.5);
 for(let time=0;time<=12;time+=.05){animateRosterAthlete(root,time);for(const bone of bones.values())assert.ok([...bone.position,...bone.quaternion].every(Number.isFinite));}
 animateRosterAthlete(root,6);assert.ok(ready.angleTo(bones.get('upper_arm.R')!.quaternion)<1e-6);
 animateRosterAthlete(root,5.999);assert.ok(ready.angleTo(bones.get('upper_arm.R')!.quaternion)<1e-6);
});
