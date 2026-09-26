import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {SHOT_TYPES,type ShotIntent} from '../src/engine/model';
import {SHOT_FAMILIES,type ShotContext} from '../src/engine/shot-families';
import {parseShotIntent,sameShotIntent} from '../src/engine/shot-intent';
import {executeShot} from '../src/engine/execution';
import {assessShot} from '../src/shot-assessment';
import {shotHoldDelay} from '../src/shot-power-control';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';

for(const type of SHOT_TYPES)test(`${type}: control improves accuracy, power changes flight, midpoint preserves execution`,()=>{
 const match=new Match(),players=match.state.players;
 const contact:ShotContext={contact:{x:1,y:type==='overhead'?2.5:.8,z:type==='serve'?7:3},feet:{x:1,y:0,z:type==='serve'?7:3},bounced:SHOT_FAMILIES[type].mode!=='volley',opening:type==='serve'?'serve':type==='return'?'return':'rally',twoBounceSatisfied:true,incomingSpeed:8};
 const intent:ShotIntent={...match.targetingMenu[0].intent,type,shape:type==='overhead'?'descending':'arc',target:{kind:'point',x:-1,z:-4},intendedNetClearance:type==='lob'?3:.25};
 let controlError=0,powerError=0;
 for(let seed=0;seed<100;seed++){
  const base=executeShot(intent,contact,players,{seed,balance:1}),middle=executeShot({...intent,power:.5},contact,players,{seed,balance:1});
  const {power,...normalized}=middle.intended.intent;middle.intended.intent=normalized;
  assert.deepEqual(middle,base);
  const low=executeShot({...intent,power:0},contact,players,{seed,balance:1}),high=executeShot({...intent,power:1},contact,players,{seed,balance:1});
  if(type==='lob'){
   assert.ok(high.intended.apex>base.intended.apex*1.8);
   assert.ok(high.intended.leg.duration>base.intended.leg.duration);
  }else assert.ok(high.intended.leg.duration<base.intended.leg.duration&&base.intended.leg.duration<low.intended.leg.duration);
  // Every family pays for the extremes, including soft shots and defensive shots.
  assert.ok(low.intended.leg.duration>base.intended.leg.duration*2.4);
  assert.ok(high.dispersion>base.dispersion*1.4);
  if(type!=='lob')assert.ok(base.intended.leg.duration/high.intended.leg.duration>=1.29);
  assert.deepEqual(low.intended.aimPoint,high.intended.aimPoint);
  controlError+=low.endpointError;powerError+=high.endpointError;
 }
 assert.ok(powerError>controlError*1.4,`${type}: ${controlError} vs ${powerError}`);
 const low=assessShot({...intent,power:0},contact,players),high=assessShot({...intent,power:1},contact,players);
 assert.ok(high.accuracyRadius!>low.accuracyRadius!);
 if(type!=='lob')assert.ok(high.pressureFill!>low.pressureFill!);
});

test('power is bounded, serialized and compared independently of input source',()=>{
 const intent=new Match().targetingMenu[0].intent;
 for(const power of [-.01,1.01,NaN,Infinity,'high',null])assert.throws(()=>parseShotIntent({...intent,power}));
 assert.equal(parseShotIntent({...intent,power:.8}).power,.8);
 assert.ok(sameShotIntent(intent,{...intent,power:.5}));
 const {spin,...withoutSpin}=intent;
 assert.ok(sameShotIntent(withoutSpin,{...withoutSpin,power:.5,spin:{side:'none',vertical:'none',strength:'medium'}}));
 assert.ok(!sameShotIntent(intent,{...intent,power:1}));
});

test('all serve variants preserve selected power through solo target selection',()=>{
 const match=new Match();
 for(const choice of match.targetingMenu){
  const target={x:-1,z:-4};
  const low=match.previewMenuTarget({...choice,intent:{...choice.intent,power:0}},target);
  const high=match.previewMenuTarget({...choice,intent:{...choice.intent,power:1}},target);
  assert.equal(high.intent.power,1);assert.equal(low.intent.power,0);
  assert.ok(high.legs[0].duration<low.legs[0].duration);
 }
});

test('multiplayer accepts power and preserves it in playback and idempotent retries',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 const request=action(game);request.action.intent={...request.action.intent,power:.85,target:{kind:'point',x:-1,z:-4}};
 const result=await service.act(game.id,A,request);
 assert.equal(result.state.animation[0].intent.power,.85);
 assert.deepEqual((await service.act(game.id,A,request)).state.animation,result.state.animation);
});

test('hold delay has a central default and a bounded playtest override',()=>{
 assert.equal(shotHoldDelay(''),100);assert.equal(shotHoldDelay('?shotHoldMs=0'),0);assert.equal(shotHoldDelay('?shotHoldMs=600'),600);
 for(const value of ['-5','Infinity','hello','100000'])assert.equal(shotHoldDelay(`?shotHoldMs=${value}`),100);
});

for(const technique of ['atp','erne'] as const)test(`${technique} keeps the power/accuracy tradeoff`,()=>{
 const match=new Match(),players=match.state.players;
 const context:ShotContext={contact:{x:3.5,y:1.1,z:1.5},feet:{x:3.6,y:0,z:1.5},bounced:technique==='atp',opening:'rally',twoBounceSatisfied:true,incomingSpeed:8,attemptTechnique:true,erneEligible:true};
 const intent:ShotIntent={...match.targetingMenu[0].intent,type:technique==='atp'?'drive':'volley',technique,target:{kind:'point',x:2.8,z:-4}};
 const low=executeShot({...intent,power:0},context,players,{seed:15,balance:1});
 const high=executeShot({...intent,power:1},context,players,{seed:15,balance:1});
 assert.ok(high.intended.leg.duration<low.intended.leg.duration);
 assert.ok(high.dispersion>low.dispersion*2);
});

for(const [type,limit] of [['dink',.65],['block',.85],['drop',1],['reset',.85]] as const)test(`${type}: maximum power bounds even mishits and keeps the ball moving toward the target`,()=>{
 const match=new Match(),players=match.state.players;
 const context:ShotContext={contact:{x:0,y:.8,z:1.2},feet:{x:0,y:0,z:2.3},bounced:type!=='block',opening:'rally',twoBounceSatisfied:true,incomingSpeed:16};
 const intent:ShotIntent={...match.targetingMenu[0].intent,type,power:1,target:{kind:'point',x:0,z:-.7},intendedNetClearance:.25};
 let mishits=0;
 for(let seed=0;seed<500;seed++){
  const shot=executeShot(intent,context,players,{seed,balance:.5});
  assert.ok(shot.endpointError<=limit+1e-9);
  assert.ok(shot.actualEndpoint.z<context.contact.z);
  if(shot.mishit)mishits++;
 }
 assert.ok(mishits>0,'includes mishits as well as ordinary contacts');
});
