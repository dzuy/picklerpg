import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShotLab,labSetup} from '../src/shot-lab';
import {chooseOpponentShot} from '../src/engine/opponent-policy';
import {generateTrajectory} from '../src/engine/trajectory';
import {parseShotIntent} from '../src/engine/shot-intent';
test('prepared situations produce canonical playable opponent responses',()=>{
 for(const [situation,type] of [['pressure','counter'],['low','reset'],['high','overhead'],['return','return'],['deep','drive'],['dink','dink']]){
  const lab=new ShotLab();lab.opponentSituation=situation;lab.reset();assert.equal(lab.issue,null,situation);assert.equal(lab.opponentDecision!.intent.type,type,situation);assert.equal(lab.shot.actor,'opponent-left');assert.equal(lab.shot.intent.source,'ai');parseShotIntent(lab.shot.intent);
  assert.ok(lab.shot.contact.z<0);assert.ok(lab.shot.aimPoint.z>0);lab.play();lab.update(10);assert.equal(lab.state.phase,'complete');assert.equal(lab.state.score.home,0);
 }
});
test('style and counter skill change response to the same contact',()=>{
 const lab=new ShotLab();lab.opponentSituation='pressure';lab.reset();assert.equal(lab.shot.intent.type,'counter');
 lab.opponentAggression=.3;lab.reset();assert.equal(lab.shot.intent.type,'block');
 lab.opponentAggression=.7;lab.skill=40;lab.reset();assert.equal(lab.shot.intent.type,'block');
 lab.opponentSituation='deep';lab.opponentAggression=.3;lab.reset();assert.equal(lab.shot.intent.type,'drop');
});
test('policy is deterministic, does not mutate and cannot volley through opening restrictions',()=>{
 const lab=new ShotLab(),players=lab.state.players,c=labSetup('counter').context;
 const before=structuredClone({players,c});const a=chooseOpponentShot('you',c,players);assert.deepEqual(a,chooseOpponentShot('you',c,players));assert.deepEqual({players,c},before);assert.ok(a);generateTrajectory(a.intent,c,players);
 assert.equal(chooseOpponentShot('you',{...c,twoBounceSatisfied:false},players),null);
 assert.equal(chooseOpponentShot('you',{...c,feet:{x:0,y:0,z:1}},players),null);
});
test('opponent execution and return to manual shot work without stale decision',()=>{
 const lab=new ShotLab();lab.opponentSituation='high';lab.variance=true;lab.reset();assert.ok(lab.execution);assert.equal(lab.execution!.intended.intent.actor,'opponent-left');
 lab.opponentSituation='off';lab.reset();assert.equal(lab.opponentDecision,null);assert.equal(lab.shot.actor,'you');
});
