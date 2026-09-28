import test from 'node:test';
import assert from 'node:assert/strict';
import {flightGuidePoints} from '../src/flight-guide';
import {flightCursor,sampleLeg} from '../src/engine/rally-engine';
import type {FlightLeg} from '../src/engine/model';

const legs:FlightLeg[]=[
 {from:{x:0,y:1,z:5},to:{x:1,y:0,z:-3},arc:2,duration:2},
 {from:{x:1,y:0,z:-3},to:{x:2,y:1,z:-5},arc:.5,duration:1},
];

test('guide starts empty of flight and grows precisely to the ball, without revealing the bounce',()=>{
 assert.deepEqual(flightGuidePoints(legs,{legIndex:0,elapsed:0}),[legs[0].from]);
 const points=flightGuidePoints(legs,{legIndex:0,elapsed:.73});
 assert.deepEqual(points.at(-1),sampleLeg(legs[0],.73/2));
 assert.ok(points.every(point=>point.z>=points.at(-1)!.z));
});

test('guide follows multi-leg playback and rewinds deterministically when seeking',()=>{
 const at=(time:number)=>flightGuidePoints(legs,flightCursor(legs,time));
 assert.deepEqual(at(2).at(-1),legs[0].to);
 const tip=at(2.4).at(-1)!,ball=sampleLeg(legs[1],.4);
 assert.ok(Math.hypot(tip.x-ball.x,tip.y-ball.y,tip.z-ball.z)<1e-10);
 assert.deepEqual(at(3),flightGuidePoints(legs));
 const paused=at(.8);
 at(2.8);
 assert.deepEqual(at(.8),paused);
 assert.ok(at(.2).length<paused.length);
});
