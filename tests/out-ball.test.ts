import {test} from 'node:test';
import assert from 'node:assert/strict';
import {outBallContinuation,sampleFlight} from '../src/engine/trajectory';
import type {FlightLeg} from '../src/engine/model';
import {Match} from '../src/match';
test('long and wide out balls retain momentum through diminishing bounces and roll',()=>{
 for(const to of [{x:1,y:.037,z:-9},{x:5,y:.037,z:-4},{x:-2,y:.037,z:9}]){
  const incoming:FlightLeg={from:{x:0,y:1,z:0},to,duration:.7,arc:.2,bounceAtEnd:true};
  const tail=outBallContinuation(incoming);let previous=to;
  for(const leg of tail){assert.deepEqual(leg.from,previous);assert.ok(leg.duration>0);assert.ok(sampleFlight(leg,.5).y>=.037);assert.ok((leg.to.x-leg.from.x)*to.x+(leg.to.z-leg.from.z)*to.z>0);previous=leg.to;}
  assert.ok(Math.hypot(previous.x-to.x,previous.z-to.z)>1);
  assert.ok(tail[1].arc<tail[0].arc&&tail[2].arc<tail[1].arc);
  assert.deepEqual(outBallContinuation(incoming),tail);
 }
});
test('an out drive includes follow-through and still awards the opponent the point',()=>{
 const m=new Match();m.startPractice('middle');m.seed=7;
 const shot=m.targetShot('drive',{x:0,z:-6.7});
 assert.equal(shot.resolution?.result?.reason,'out');assert.ok(shot.legs.length>1);
 assert.ok(shot.legs.at(-1)!.to.z<shot.legs[0].to.z-1);
 m.engine.offerCustom(shot);m.submitIntent(shot.intent);
 m.update(shot.legs[0].duration+.05);assert.equal(m.state.phase,'flight');assert.ok(m.state.ball.position.z<shot.legs[0].to.z);
 for(let i=0;i<200&&m.state.phase!=='complete';i++)m.update(.1);
 assert.equal(m.state.phase,'complete');assert.equal(m.state.result?.reason,'out');assert.equal(m.state.result?.winner,'away');
});
