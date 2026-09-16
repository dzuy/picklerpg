import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {checkpointRally,hydrateRally} from '../src/engine/checkpoint';
import {receptionPauseTime,sampleLeg} from '../src/engine/rally-engine';
import type {FlightLeg} from '../src/engine/model';

function flight(legs:FlightLeg[]){
 const m=new Match(),r=m.engine.runtime();
 r.state.phase='flight';r.state.paused=false;r.state.legIndex=0;r.state.elapsed=0;r.state.bounces=0;r.shotElapsed=0;r.receptionPrompt=false;
 r.shot.legs=legs;r.shot.contact=legs[0].from;
 r.shot.resolution={receiver:'opponent-left',bounced:legs.length>1};
 r.shot.receptionChoice={bounced:{legs:structuredClone(legs),positions:structuredClone(r.shot.positions),resolution:structuredClone(r.shot.resolution)}};
 m.engine.restoreRuntime(r);return m.engine;
}
test('fast kitchen ball passes the net and stops at exactly 75%, independent of frame size',()=>{
 const leg={from:{x:0,y:1,z:2.2},to:{x:0,y:1,z:-2.2},duration:.24,arc:.1};
 for(const dt of [.001,.05,10]){
  const e=flight([leg]);for(let i=0;i<1000&&!e.needsReceptionChoice;i++)e.update(dt);
  assert.ok(e.needsReceptionChoice);assert.ok(Math.abs(e.runtime().shotElapsed-.18)<1e-9);
  assert.ok(Math.abs(e.state.ball.position.z+1.1)<1e-9);
  const before=e.snapshot();e.update(10);assert.deepEqual(e.snapshot(),before);
  e.chooseReception('bounced');assert.deepEqual(e.state.ball.position,before.ball.position);
 }
});
test('75% spans the total flight including bounce legs and resumes without replaying the bounce',()=>{
 const legs=[{from:{x:0,y:1,z:2},to:{x:0,y:.037,z:-1},duration:.4,arc:.2,bounceAtEnd:true},
 {from:{x:0,y:.037,z:-1},to:{x:0,y:1,z:-3},duration:.8,arc:.2}];
 const e=flight(legs);e.advanceToBoundary();assert.equal(e.state.legIndex,1);assert.equal(e.state.bounces,1);
 assert.ok(Math.abs(e.runtime().shotElapsed-.9)<1e-9);assert.ok(Math.abs(e.state.elapsed-.5)<1e-9);
 const restored=hydrateRally(checkpointRally(e.runtime()));
 assert.equal(restored.state.legIndex,1);assert.ok(Math.abs(restored.state.elapsed-.5)<1e-9);assert.deepEqual(restored.state.ball,e.state.ball);
 e.restoreRuntime(restored);e.chooseReception('bounced');e.update(.01);assert.equal(e.state.bounces,1);assert.equal(e.state.legIndex,1);
});
test('an earlier volley remains available and legacy net checkpoints retain their exact position',()=>{
 const leg={from:{x:0,y:1,z:2},to:{x:0,y:1,z:-2},duration:1,arc:0},e=flight([leg]),r=e.runtime();
 r.shot.receptionChoice!.airborne={...structuredClone(r.shot.receptionChoice!.bounced!),legs:[{...leg,to:{x:0,y:1,z:-.8},duration:.7}]};
 e.restoreRuntime(r);assert.ok(Math.abs(receptionPauseTime(e.shot)-.525)<1e-9);e.advanceToBoundary();
 assert.ok(e.state.ball.position.z<0);e.chooseReception('airborne');assert.ok(e.state.elapsed<.7);
 const old=flight([leg]);old.advanceToBoundary();const legacy=checkpointRally(old.runtime());legacy.kind='reception';legacy.state.phase='flight';legacy.state.ball.position=sampleLeg(leg,.5);delete legacy.receptionProgress;
 const hydrated=hydrateRally(legacy);assert.equal(hydrated.shotElapsed,.5);assert.equal(hydrated.state.elapsed,.5);assert.equal(hydrated.state.ball.position.z,0);
});

test('a pause exactly on a bounce counts it once across reload and reception selection',()=>{
 const legs=[{from:{x:0,y:1,z:2},to:{x:0,y:.037,z:-1},duration:.9,arc:.2,bounceAtEnd:true},
 {from:{x:0,y:.037,z:-1},to:{x:0,y:1,z:-3},duration:.3,arc:.2}];
 const e=flight(legs);e.advanceToBoundary();assert.equal(e.state.bounces,1);
 e.restoreRuntime(hydrateRally(checkpointRally(e.runtime())));e.chooseReception('bounced');e.update(.01);
 assert.equal(e.state.bounces,1);assert.equal(e.state.legIndex,1);
});
