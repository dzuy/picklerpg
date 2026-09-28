import test from 'node:test';
import assert from 'node:assert/strict';
import {actionBurstMotion} from '../src/action-burst';
test('comic burst pops, fades and hides outside its timeline',()=>{
 assert.equal(actionBurstMotion(-.1).visible,false);
 assert.ok(actionBurstMotion(.12).scale>1);
 assert.equal(actionBurstMotion(.5).opacity,1);
 assert.ok(actionBurstMotion(1.15).opacity<1);
 assert.equal(actionBurstMotion(1.25).visible,false);
 assert.deepEqual(actionBurstMotion(.3),actionBurstMotion(.3));
});
test('reduced motion preserves the label without scaling or shaking',()=>{
 for(const age of [0,.1,.8]){const frame=actionBurstMotion(age,1.25,true);assert.equal(frame.scale,1);assert.equal(frame.rotation,0);assert.equal(frame.visible,true)}
});
