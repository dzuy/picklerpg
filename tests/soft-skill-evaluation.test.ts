import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SOFT_OPENING_SKILLS,evaluateSoftOpening,evaluateDinkRallies} from '../src/soft-skill-evaluation';

test('opening and soft skills improve matched placement across contact conditions',()=>{
 for(const attribute of SOFT_OPENING_SKILLS){
  const low=evaluateSoftOpening(attribute,50,500),high=evaluateSoftOpening(attribute,90,500);
  for(let i=0;i<low.length;i++){
   assert.ok(high[i].meanError<low[i].meanError*.5,`${attribute} ${low[i].type} ${low[i].condition}`);
   assert.ok(high[i].legalRate>low[i].legalRate);
   assert.ok(high[i].targetDepthRate>low[i].targetDepthRate);
   assert.ok(high[i].targetDepthRate<=high[i].legalRate);
  }
 }
});

test('targeted dink starts translate accuracy into fewer actual opening faults',()=>{
 const low=evaluateDinkRallies(50,30),high=evaluateDinkRallies(90,30);
 for(let i=0;i<low.length;i++){
  assert.equal(low[i].completed,30);assert.equal(high[i].completed,30);
  assert.equal(high[i].capped,0);
  assert.ok(high[i].openingFaultRate<low[i].openingFaultRate);
  assert.ok(high[i].homeWinRate!>low[i].homeWinRate!);
  assert.ok(high[i].shots>=high[i].completed);
 }
});

test('a low rushed soft contact is harder than a prepared contact at fixed skill',()=>{
 for(const attribute of ['return','drop','dink','reset'] as const){
  const rows=evaluateSoftOpening(attribute,70,500);
  const prepared=rows.find(r=>r.type===attribute&&r.condition==='prepared')!;
  const pressured=rows.find(r=>r.type===attribute&&r.condition==='pressure')!;
  assert.ok(pressured.meanError>prepared.meanError);
  assert.ok(pressured.mishitRate>prepared.mishitRate);
 }
});
