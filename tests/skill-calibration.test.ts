import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDrive,evaluateMovement,evaluateReceptions} from '../src/skill-evaluation';
test('higher drive skill improves matched-seed placement and consistency at all prepared contacts',()=>{
 const low=evaluateDrive(50,500),high=evaluateDrive(90,500);
 for(let i=0;i<low.length;i++){assert.ok(high[i].inCourtRate>low[i].inCourtRate);assert.ok(high[i].meanError<low[i].meanError*.4)}
});
test('movement expands reachable coverage and lowers pressure on the same grid',()=>{
 const low=evaluateMovement(50),mid=evaluateMovement(70),high=evaluateMovement(90);
 assert.ok(low.reachable<mid.reachable&&mid.reachable<high.reachable);
 assert.ok(low.meanPressure>mid.meanPressure&&mid.meanPressure>high.meanPressure);
});
test('faster receivers do not turn extra reach into more rushed contacts',()=>{
 const low=evaluateReceptions(50),high=evaluateReceptions(90);
 assert.ok(high.receptions>=low.receptions);
 assert.ok(high.meanTimingPressure!<low.meanTimingPressure!);
 assert.ok(high.meanTimingPressure!<.45,'take a prepared contact when the flight permits it');
});
