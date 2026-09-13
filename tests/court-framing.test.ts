import test from 'node:test';
import assert from 'node:assert/strict';
import {courtOverlayOffset} from '../src/scene-readability';

test('low views place the court above the shot dock without a large foreground gap',()=>{
 for(const [width,height,overlay,bottom] of [[1100,780,200,420],[390,780,300,390]]){
  const offset=courtOverlayOffset(width,height,overlay,bottom,.12);
  assert.equal(bottom-offset,height-overlay-48);
 }
});

test('tactical framing stays stable and no dock means no offset',()=>{
 assert.equal(courtOverlayOffset(1100,780,200,600,.7),120);
 assert.equal(courtOverlayOffset(390,780,300,600,.7),150);
 assert.equal(courtOverlayOffset(1100,780,0,400,.1),0);
});

test('orbiting smoothly transitions from low to tactical framing',()=>{
 let previous=-Infinity;
 for(let i=0;i<=100;i++){
  const offset=courtOverlayOffset(1100,780,200,420,i/100);
  assert.ok(Number.isFinite(offset));
  assert.ok(offset>=previous);
  if(Number.isFinite(previous))assert.ok(offset-previous<9);
  previous=offset;
 }
});
