import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyHitPose,BODY_HIT_REACTION_SECONDS} from '../src/body-hit-reaction';
import {athletePose} from '../src/athlete-motion';
import {PreparedShotFixture} from './helpers/prepared-shot';
test('body hit flails both arms, recovers, and respects reduced motion',()=>{
 const fixture=new PreparedShotFixture();
 const base=()=>athletePose(fixture.state.players[0],fixture.state,fixture.shot);
 const a=base(),b=base();bodyHitPose(a,.1,false);bodyHitPose(b,.2,false);
 assert.notEqual(a.armX,b.armX);assert.notEqual(a.offArm,b.offArm);
 assert.equal(a.celebrate,false);
 const reducedA=base(),reducedB=base();bodyHitPose(reducedA,.1,true,true);bodyHitPose(reducedB,.2,true,true);
 assert.equal(reducedA.armX,reducedB.armX);assert.equal(reducedA.lean,0);
 const after=base(),original=structuredClone(after);bodyHitPose(after,BODY_HIT_REACTION_SECONDS,true);assert.deepEqual(after,original);
});
