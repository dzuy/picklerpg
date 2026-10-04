import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRallyBrief,simulateStudioCandidate,matchingStart,recordStudioTake,type StudioRequest} from '../src/rally-studio-model';
import {sampleLeg} from '../src/engine/rally-engine';
import {newPlayer} from '../src/player-design';
const request:StudioRequest={brief:parseRallyBrief('3-5 hit rally that ends with someone getting body bagged'),players:[0,1,2,3].map(i=>newPlayer(`studio-${i}`)),seed:1744,scoring:'rally-doubles',scope:'finish',attempts:100};
test('rally briefs retain count, ending and real shot constraints',()=>{
 assert.deepEqual(request.brief,{min:3,max:5,ending:'body-hit',shots:[],technique:null});
 assert.deepEqual(parseRallyBrief('6 to 12 shots with an overhead winner'),{min:6,max:12,ending:'winner',shots:['overhead'],technique:null});
 assert.equal(parseRallyBrief('5-hit rally with an ATP').technique,'atp');
 for(const text of ['','dance party','50 hit rally','9-3 hits'])assert.throws(()=>parseRallyBrief(text));
});
test('a real body-hit point can be selected as a finishing excerpt without fabricating contacts',()=>{
 const match=simulateStudioCandidate(request,1744);
 assert.equal(match.state.result?.reason,'body-hit');
 const start=matchingStart(match,request.brief,'finish');assert.notEqual(start,null);
 assert.ok(match.state.shotHistory.length-start!<=5);
 assert.equal(matchingStart(match,request.brief,'full'),null);
 assert.equal(matchingStart(match,{...request.brief,ending:'net'},'finish'),null);
 const repeated=simulateStudioCandidate(request,1744);assert.deepEqual(repeated.state,match.state);
});
test('recording preserves the real result, player skills and contiguous flight endpoints',()=>{
 const take=recordStudioTake(request,1744,1);assert.ok(take);assert.equal(take.result,'body-hit');assert.equal(take.count,5);assert.equal(take.frames.length,take.shots.length);
 assert.equal(take.frames.at(-1)!.phase,'complete');assert.ok(take.end>take.start);
 assert.deepEqual(take.frames[0].players[0].skills,request.players[0].skills);
 for(let i=1;i<take.frames.length;i++){
  assert.ok(take.frames[i].simulationTime>=take.frames[i-1].simulationTime);
  const frame=take.frames[i],leg=take.shots[i].legs[frame.legIndex];
  if(frame.phase==='flight')assert.deepEqual(frame.ball.position,sampleLeg(leg,frame.elapsed/leg.duration),'recorded ball follows the actual engine flight');
 }
});

test('real picker presentation pauses only the selected player and preserves replay time',async()=>{
 const {studioPlayback,STUDIO_PICKER_SECONDS}=await import('../src/rally-studio-model');
 const take=recordStudioTake(request,1744,1)!;const decision=take.decisions[0],at=decision.time-take.start;
 const during=studioPlayback(take,at+1.5,decision.actor);
 assert.equal(during.decision?.index,decision.index);assert.equal(during.time,decision.time);assert.equal(during.age,1.5);
 assert.equal(studioPlayback(take,at+1.5,'').time,take.start+at+1.5);
 assert.ok(Math.abs(studioPlayback(take,at+STUDIO_PICKER_SECONDS+.01,decision.actor).time-decision.time-.01)<1e-8);
 assert.ok(decision.options.length);assert.ok(decision.assessment.length);
 assert.equal(decision.selected.actor,decision.actor);
});
