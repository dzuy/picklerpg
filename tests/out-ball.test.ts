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

test('short flight timing cannot inject energy into dead-ball bounces',()=>{
 const leg:FlightLeg={from:{x:0,y:.65,z:-7},to:{x:1,y:.037,z:.5},arc:7,duration:.4,bounceAtEnd:true};
 const tail=outBallContinuation(leg);
 assert.ok(tail[0].arc<(7+.65)/4);
 assert.ok(tail.every(l=>l.duration>0));
 const roll=outBallContinuation({...leg,from:{x:0,y:.037,z:0},arc:0});
 assert.ok(roll.every(l=>l.duration>0&&l.arc===0));
});

test('Poppy short drop rebounds off the net instead of passing through it',()=>{
 const recorded:FlightLeg={from:{x:2.2444287561878014,y:.7041,z:-5.5673996434810675},to:{x:2.169240271088994,y:.037,z:-.4538361632054122},duration:1.1260498055289907,arc:.3491217467432446,bounceAtEnd:true};
 for(const side of [1,-1]){
  const leg={...recorded,from:{...recorded.from,z:recorded.from.z*side},to:{...recorded.to,z:recorded.to.z*side}};
  const tail=outBallContinuation(leg);assert.equal(tail.length,2);
  let previous=leg.to;
  for(const flight of tail){assert.deepEqual(flight.from,previous);for(let i=0;i<=100;i++)assert.ok(sampleFlight(flight,i/100).z*side<=-.037+1e-9);previous=flight.to;}
  assert.ok(Math.abs(tail.at(-1)!.to.z)>Math.abs(tail[0].to.z),'ball recoils from net');
 }
});
test('dead-ball rolls stop at the net but may pass outside the posts or above the tape',()=>{
 const short:FlightLeg={from:{x:0,y:.037,z:-2},to:{x:0,y:.037,z:-.04},duration:.2,arc:0,bounceAtEnd:true};
 assert.ok(outBallContinuation(short).every(l=>l.to.z<=-.037+1e-9));
 const wide={...short,from:{...short.from,x:5},to:{...short.to,x:5}};
 assert.ok(outBallContinuation(wide).at(-1)!.to.z>0);
 const high={...short,from:{x:0,y:8,z:-4},to:{x:0,y:.037,z:-1},duration:1,arc:4};
 const tail=outBallContinuation(high);
 assert.ok(tail[0].to.z>0,'high bounce clears net');
});
