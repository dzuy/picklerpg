import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyHitPose,BODY_HIT_REACTION_SECONDS} from '../src/body-hit-reaction';
import {athletePose} from '../src/athlete-motion';
import {PreparedShotFixture} from './helpers/prepared-shot';
test('body hit flails at impact, settles, and respects reduced motion',()=>{
 const fixture=new PreparedShotFixture();
 const base=()=>athletePose(fixture.state.players[0],fixture.state,fixture.shot);
 const a=base(),b=base();bodyHitPose(a,.1,false);bodyHitPose(b,.2,false);
 assert.notEqual(a.armX,b.armX);assert.notEqual(a.offArm,b.offArm);
 assert.equal(a.celebrate,false);
 const reducedA=base(),reducedB=base();bodyHitPose(reducedA,.1,true,true);bodyHitPose(reducedB,.2,true,true);
 assert.equal(reducedA.armX,reducedB.armX);assert.equal(reducedA.lean,0);
 const after=base(),original=structuredClone(after);bodyHitPose(after,BODY_HIT_REACTION_SECONDS,true);assert.deepEqual(after,original);
});


test('angel rises after the fall, stays translucent, and fades before cleanup',async()=>{
 const {angelFrame}=await import('../src/body-hit-angel');
 assert.equal(angelFrame(0).fall,0);assert.equal(angelFrame(.72).fall,1);
 assert.equal(angelFrame(.7).opacity,0);assert.equal(angelFrame(2).opacity,.78);
 assert.ok(angelFrame(3).rise>angelFrame(2).rise);
 assert.equal(angelFrame(BODY_HIT_REACTION_SECONDS).opacity,0);
 assert.equal(angelFrame(2,true).flap,0);assert.equal(angelFrame(2,true).rise,angelFrame(3,true).rise);
 assert.deepEqual(angelFrame(2),angelFrame(2),'scrubbing is deterministic');
});

test('fall accelerates into impact and rebounds before settling; angel waves goodbye',async()=>{
 const {angelFrame,angelWavePose}=await import('../src/body-hit-angel');
 assert.ok(angelFrame(.18).fall<.1);
 assert.ok(angelFrame(.7).fall-angelFrame(.6).fall>angelFrame(.2).fall-angelFrame(.1).fall);
 assert.ok(angelFrame(.85).fall<angelFrame(.72).fall);
 assert.ok(angelFrame(.85).bounce>0);assert.equal(angelFrame(1.2).bounce,0);
 assert.equal(angelFrame(1.2).fall,1);
 assert.notEqual(angelWavePose(2).offWrist,angelWavePose(2.2).offWrist);
 assert.equal(angelWavePose(2,true).offWrist,0);
});
