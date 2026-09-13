import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executeShot} from '../src/engine/execution';
import {ShotLab,labSetup} from '../src/shot-lab';
function setup(){const lab=new ShotLab();return {intent:lab.shot.intent,players:lab.state.players,context:labSetup('drive').context}}
test('execution replays by seed, preserves intent and does not mutate inputs',()=>{
 const {intent,players,context}=setup(),before=structuredClone({intent,players,context});
 const run=(seed:number)=>executeShot(intent,context,players,{seed,balance:1});
 assert.deepEqual(run(12),run(12));assert.notDeepEqual(run(12).leg,run(13).leg);
 assert.deepEqual(run(12).intended.intent,intent);assert.deepEqual({intent,players,context},before);
 assert.deepEqual(run(12).leg,executeShot({...intent,source:'voice'},context,players,{seed:12,balance:1}).leg);
});
test('skill, balance, incoming speed and contact height change dispersion',()=>{
 const {intent,players,context}=setup();
 const baseline=executeShot(intent,context,players,{seed:1,balance:1});
 assert.ok(executeShot(intent,context,players,{seed:1,balance:0}).dispersion>baseline.dispersion);
 assert.ok(executeShot(intent,{...context,incomingSpeed:25},players,{seed:1,balance:1}).dispersion>baseline.dispersion);
 assert.ok(executeShot(intent,{...context,contact:{...context.contact,y:.2}},players,{seed:1,balance:1}).dispersion>baseline.dispersion);
 players[0].skills.drive=95;assert.ok(executeShot(intent,context,players,{seed:1,balance:1}).dispersion<baseline.dispersion);
});
test('samples produce net misses without repairing clearance and can land out',()=>{
 const {intent,players,context}=setup();players[0].skills.drive=10;
 const outcomes=new Set<string>();
 for(let seed=0;seed<200;seed++){
  const result=executeShot({...intent,target:{kind:'zone',zone:'wide',depth:'deep'}},context,players,{seed,balance:0});outcomes.add(result.outcome);
  if(result.outcome==='net'){assert.ok(Math.abs(result.leg.to.z)<1e-8);assert.equal(result.leg.bounceAtEnd,false)}
  assert.ok(result.leg.duration>0);assert.ok(Number.isFinite(result.endpointError));
 }
 assert.ok(outcomes.has('net'));assert.ok(outcomes.has('out'));assert.ok(outcomes.has('in'));
});
test('a shot that fails to cross the net plane is a fault for the hitter',()=>{
 const {intent,players,context}=setup();players[0].skills.drive=0;let failedCrossings=0;
 for(let seed=0;seed<1000;seed++){
  const result=executeShot(intent,context,players,{seed,balance:0});
  if(result.actualEndpoint.z*context.contact.z>=0){failedCrossings++;assert.equal(result.outcome,'out')}
 }
 assert.ok(failedCrossings>0,'Expected low-skill samples that never crossed the net');
});
test('lab plays the sampled flight, preserves target and replays the same sample',()=>{
 const lab=new ShotLab();lab.variance=true;lab.balance=0;lab.reset();const result=structuredClone(lab.execution);
 assert.deepEqual(lab.shot.aimPoint,lab.generated!.aimPoint);assert.deepEqual(lab.shot.legs[0],result!.leg);
 lab.play();lab.update(10);assert.equal(lab.state.phase,'complete');assert.ok(Math.hypot(lab.state.ball.position.x-result!.leg.to.x,lab.state.ball.position.y-result!.leg.to.y,lab.state.ball.position.z-result!.leg.to.z)<1e-8);
 lab.play();assert.deepEqual(lab.execution,result);lab.seed++;lab.reset();assert.notDeepEqual(lab.execution,result);
 lab.variance=false;lab.reset();assert.equal(lab.execution,null);assert.deepEqual(lab.shot.legs[0],lab.generated!.leg);
});
test('execution rejects invalid seeds and balance',()=>{const {intent,players,context}=setup();for(const seed of [-1,NaN,1.5,2**32])assert.throws(()=>executeShot(intent,context,players,{seed,balance:1}));assert.throws(()=>executeShot(intent,context,players,{seed:1,balance:2}));});
test('rare seeded mishits permit errors on otherwise safe trajectories',()=>{
 const {intent,players,context}=setup();let mishits=0;
 for(let seed=0;seed<1000;seed++){const result=executeShot({...intent,type:'lob',shape:'arc'},context,players,{seed,balance:1});if(result.mishit)mishits++}
 assert.ok(mishits>0&&mishits<100);
});
