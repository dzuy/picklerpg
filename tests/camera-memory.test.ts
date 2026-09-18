import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CourtScene} from '../src/scene';
function scene(){const s=Object.create(CourtScene.prototype) as any;s.camera=new THREE.PerspectiveCamera();s.controls={target:new THREE.Vector3(),minDistance:6,maxDistance:90,enableDamping:true,update(){}};s.host={clientWidth:0,clientHeight:0};s.cameraDistance=50;return s;}
test('camera memory restores exact orbit position, pan target, and distance',()=>{
 const first=scene();first.camera.position.set(13,18,-21);first.controls.target.set(2,1,3);first.cameraDistance=63;
 const saved=JSON.parse(JSON.stringify(first.cameraView()));const reopened=scene();assert.equal(reopened.restoreCameraView(saved),true);assert.deepEqual(reopened.cameraView(),saved);assert.equal(reopened.customizedView,true);assert.equal(reopened.controls.enableDamping,true);
});
test('invalid stored cameras do not replace the current view',()=>{
 const s=scene();for(const v of [null,{}, {position:[NaN,2,3],target:[0,0,0],distance:50},{position:[0,0,0],target:[0,0,0],distance:50},{position:[0,0,999],target:[0,0,0],distance:50}])assert.equal(s.restoreCameraView(v),false);
});
