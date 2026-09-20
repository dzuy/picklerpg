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

test('default court camera matches the selected phone view and mirrors for either team',()=>{
 const s=scene();s.host={clientWidth:412,clientHeight:867};s.camera.aspect=412/867;s.bottomOverlay=0;s.viewTeam='away';
 const away=s.cameraPose();
 assert.deepEqual(away.position.toArray(),[-.043266359038906514,15.480428319154527,-22.378986779359195]);
 assert.deepEqual(away.look.toArray(),[-.05715387399123549,0,-.18111166957307018]);
 s.viewTeam='home';const home=s.cameraPose();
 assert.equal(home.position.x,-away.position.x);assert.equal(home.position.z,-away.position.z);assert.equal(home.position.y,away.position.y);
 s.camera.aspect=320/900;const narrow=s.cameraPose();
 assert.ok(narrow.position.distanceTo(narrow.look)>home.position.distanceTo(home.look));
 assert.ok(narrow.position.clone().sub(narrow.look).normalize().distanceTo(home.position.clone().sub(home.look).normalize())<1e-12);
 s.camera.aspect=16/9;assert.deepEqual(s.cameraPose().position.toArray(),home.position.toArray());
});
