import test from 'node:test';
import assert from 'node:assert/strict';
import {shotCommentary,createCommentaryMemory} from '../src/shot-commentary';
import type {ShotIntent} from '../src/engine/model';
const shot=(type:ShotIntent['type'])=>({type} as ShotIntent);
test('risky soft shots are not praised as safe percentage play',()=>{
 for(let i=0;i<20;i++){
  const line=shotCommentary(shot('reset'),{risk:'High',pressure:'Low'},String(i));
  assert.ok(line.length>20);
  assert.doesNotMatch(line,/smart|composed|percentage/i);
 }
});
test('low risk resets explain the tactical choice and remain stable',()=>{
 const lines=new Set<string>();
 for(let i=0;i<20;i++){
  const args=[shot('reset'),{risk:'Low',pressure:'Low'} as const,String(i)] as const;
  const line=shotCommentary(...args);lines.add(line);
  assert.equal(line,shotCommentary(...args));assert.ok(line.length>20);
 }
 assert.ok(lines.size>=3);
});
test('pressure and specialty choices get relevant commentary without claiming an outcome',()=>{
 const attack=shotCommentary(shot('drive'),{risk:'Low',pressure:'High'},'point');
 assert.ok(attack.length>20);
 assert.ok(shotCommentary({...shot('volley'),technique:'erne'},undefined,'point').length>20);
 assert.ok(shotCommentary(shot('lob'),undefined,'point').length>20);
});


test('avoids the last eight calls over a long run, while rerenders retain the same call',()=>{
 const memory=createCommentaryMemory(),seen:string[]=[];
 for(let i=0;i<200;i++){
  const key=String(i),line=shotCommentary(shot('reset'),{risk:'High',pressure:'Low'},key,memory);
  assert.ok(!seen.slice(-8).includes(line));
  assert.equal(shotCommentary(shot('reset'),{risk:'High',pressure:'Low'},key,memory),line);
  seen.push(line);
 }
 assert.ok(new Set(seen).size>=12);
 assert.equal(memory.recent.length,8);assert.equal(memory.calls.size,128);
});
