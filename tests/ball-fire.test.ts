import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BallFire,isFireballShot,fireballTrailPoint} from '../src/ball-fire';
import {Match} from '../src/match';

test('fireball starts at 90% selected power and only during flight',()=>{
 const shot=structuredClone(new Match().shot);
 for(const power of [undefined,.5,.899,NaN]){shot.intent.power=power;assert.equal(isFireballShot({phase:'flight'},shot),false);}
 for(const power of [.9,1]){shot.intent.power=power;assert.equal(isFireballShot({phase:'flight'},shot),true);for(const phase of ['decision','complete'] as const)assert.equal(isFireballShot({phase},shot),false);}
});
test('smoke samples the actual curved flight and follows the bounce into the next leg',()=>{
 const shot=structuredClone(new Match().shot);shot.legs=[{from:{x:0,y:1,z:0},to:{x:1,y:0,z:2},duration:.5,arc:1},{from:{x:1,y:0,z:2},to:{x:2,y:1,z:4},duration:.5,arc:.4}];
 assert.equal(fireballTrailPoint(shot,-.1),null);assert.deepEqual(fireballTrailPoint(shot,.5),shot.legs[0].to);
 const after=fireballTrailPoint(shot,.75)!;assert.equal(after.x,1.5);assert.equal(after.z,3);assert.ok(after.y>.5);
});
test('fire and smoke are repeatable across pauses, seeking and shot changes',()=>{
 const match=new Match(),state=structuredClone(match.state),shot=structuredClone(match.shot),fx=new BallFire();shot.intent.power=1;state.phase='flight';state.elapsed=.4;
 const ball=new THREE.Vector3(0,1,0),snapshot=()=>fx.group.children.map(o=>({position:o.position.toArray(),scale:o.scale.toArray(),visible:o.visible,rotation:o instanceof THREE.Sprite?o.material.rotation:0}));
 assert.equal(fx.update(state,shot,ball,1),true);const first=snapshot();state.paused=true;fx.update(state,shot,ball,1);assert.deepEqual(snapshot(),first);
 state.elapsed=.1;fx.update(state,shot,ball,1);state.elapsed=.4;fx.update(state,shot,ball,1);assert.deepEqual(snapshot(),first);
 shot.intent.power=.5;assert.equal(fx.update(state,shot,ball,1),false);assert.equal(fx.group.visible,false);fx.dispose();
});
test('reduced motion keeps the fireball core but suppresses drifting smoke',()=>{
 const match=new Match(),state=structuredClone(match.state),shot=structuredClone(match.shot),fx=new BallFire();shot.intent.power=1;state.phase='flight';state.elapsed=.4;
 fx.update(state,shot,new THREE.Vector3(0,1,0),1,true);assert.equal(fx.group.visible,true);assert.ok(fx.group.children.slice(13).every(o=>!o.visible));fx.dispose();
});
