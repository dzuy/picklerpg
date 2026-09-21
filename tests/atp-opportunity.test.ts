import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {generateTrajectory,sampleFlight} from '../src/engine/trajectory';
import {COURT} from '../src/engine/model';
import {PreparedShotFixture,preparedContact} from './helpers/prepared-shot';
import {assessChoice} from '../src/shot-assessment';

test('ATP is a top option only for a bounced rally contact with a route outside the post',()=>{
 const players=new PreparedShotFixture().state.players;
 for(const side of [-1,1]){
  const context={...preparedContact('drive').context,contact:{x:side*4.5,y:.5,z:1.5},feet:{x:side*4,y:0,z:1.8}};
  const options=buildDecisionMenu('you',context,players),atp=options[0];
  assert.equal(atp.intent.technique,'atp');assert.equal(atp.label,'ATP');
  const trajectory=generateTrajectory(atp.intent,context,players);
  const cross=sampleFlight(trajectory.leg,context.contact.z/(context.contact.z-trajectory.aimPoint.z));
  assert.ok(Math.abs(cross.x)>COURT.netWidth/2+.08);
  const rating=assessChoice({intent:atp.intent},{x:-side*2,z:-4},[{actor:'you',timing:null,context,players}]);
  assert.equal(rating?.risk,'High','bad ATP angle is rated high risk');
  for(const change of [{bounced:false},{opening:'return' as const},{twoBounceSatisfied:false},{contact:{x:side*2,y:.5,z:1.5}},{contact:{x:side*3.5,y:.5,z:6}}]){
   assert.ok(!buildDecisionMenu('you',{...context,...change},players).some(o=>o.intent.technique==='atp'));
  }
 }
});

test('multiplayer ATP selection respects the tapped target, including a bad angle',async()=>{
 const {remoteTargeting}=await import('../src/multiplayer/targeting');
 const players=new PreparedShotFixture().state.players;
 const context={...preparedContact('drive').context,contact:{x:4.5,y:.5,z:1.5},feet:{x:4,y:0,z:1.8}};
 const choice={intent:buildDecisionMenu('you',context,players)[0].intent,timing:'bounce' as const};
 let submitted:any;
 const session:any={state:{choices:[choice],status:'active',viewerTeam:'home',currentTeam:'home',display:{players}},submit:async(value:any)=>{submitted=value}};
 remoteTargeting(()=>session,()=>{},message=>assert.fail(message)).play(choice,{x:-2,z:-4});
 assert.equal(submitted.intent.technique,'atp');assert.deepEqual(submitted.intent.target,{kind:'point',x:-2,z:-4});
});


test('bad ATP targeting is attempted without silently correcting the aim',async()=>{
 const {executeShot}=await import('../src/engine/execution');
 const players=new PreparedShotFixture().state.players;
 const context={...preparedContact('drive').context,contact:{x:4.5,y:.5,z:1.5},feet:{x:4,y:0,z:1.8},attemptTechnique:true};
 const atp=buildDecisionMenu('you',{...context,attemptTechnique:false},players)[0].intent;
 const intent={...atp,target:{kind:'point' as const,x:-2,z:-4}};
 let nets=0;
 for(let seed=0;seed<100;seed++){
  const result=executeShot(intent,context,players,{seed,balance:1});
  assert.equal(result.intended.aimPoint.x,-2);assert.equal(result.intended.aimPoint.z,-4);
  if(result.outcome==='net')nets++;
 }
 assert.ok(nets>50,'aim across the net loses the around-post route');
});
