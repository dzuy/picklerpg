import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CALIBRATION_FAIRNESS_SCENARIOS,DEFAULT_SCENARIOS,PROGRESSION_SCENARIOS,evaluateGame,summarizeEvaluation,validateScenario} from '../src/game-evaluation';
const scenario=DEFAULT_SCENARIOS.find(s=>s.id==='equal-70')!;
test('seeded full-game evaluation reproduces outcomes and traces with consistent shot totals',()=>{
 const a=evaluateGame(scenario,1741,0,{trace:true}),b=evaluateGame(scenario,1741,0,{trace:true,captureReplay:true});
 assert.deepEqual(a,b);assert.equal(a.status,'complete');assert.equal(a.pointResults.length,a.points);
 assert.equal(Object.values(a.slots).reduce((n,s)=>n+s.shots,0),a.trace!.length);
 for(const slot of Object.keys(a.slots)){const metrics=a.slots[slot];assert.equal(metrics.shots,a.trace!.filter(s=>s.intent.actor===slot).length)}
 assert.ok(a.trace!.some(s=>s.intent.actor==='partner'));
 assert.equal(a.rallies.length,a.points);
 assert.equal(a.rallies.reduce((sum,r)=>sum+r.shots,0),a.trace!.length);
 assert.ok(Math.abs(a.rallies.reduce((sum,r)=>sum+r.seconds,0)-a.steps*.1)<1e-8);
 const lengths=a.rallies.map(r=>r.shots).sort((x,y)=>x-y),summary=summarizeEvaluation([a])[0];
 assert.equal(summary.rallyShots.max,lengths.at(-1));
 assert.equal(summary.rallyShots.p95,lengths[Math.ceil(lengths.length*.95)-1]);
});
test('rotations exchange teams and within-team players while keeping the seed fixed',()=>{
 const runs=[0,1,2,3].map(r=>evaluateGame(scenario,1741,r,{maxSteps:1}));
 assert.deepEqual(runs.map(g=>g.slots.you.player),['a-1','a-2','b-1','b-2']);
 assert.deepEqual(runs.map(g=>g.slots['opponent-left'].player),['b-1','b-2','a-1','a-2']);
 assert.ok(runs.every(g=>g.status==='capped'&&g.winner===null));
 const summary=summarizeEvaluation(runs)[0];assert.equal(summary.capped,4);assert.equal(summary.aWinRate,null);assert.equal(summary.completed,0);
});
test('bad profiles and run limits fail before simulation',()=>{
 assert.throws(()=>validateScenario({...scenario,a:[{...scenario.a[0],skills:{...scenario.a[0].skills,drive:101}},scenario.a[1]]}));
 assert.throws(()=>validateScenario({...scenario,personality:'Smuggler' as never}));assert.throws(()=>validateScenario({...scenario,intelligence:1.1}));
 assert.throws(()=>evaluateGame(scenario,-1));assert.throws(()=>evaluateGame(scenario,1,0,{dt:0}));
});
test('calibration suites cover ratings, roster shapes, handedness, personalities and every skill step',()=>{
 for(const scenario of [...CALIBRATION_FAIRNESS_SCENARIOS,...PROGRESSION_SCENARIOS])validateScenario(scenario);
 assert.ok(CALIBRATION_FAIRNESS_SCENARIOS.some(s=>s.id==='fair-star-support'));
 assert.ok(CALIBRATION_FAIRNESS_SCENARIOS.some(s=>s.a.some(p=>p.handedness==='left')));
 assert.equal(CALIBRATION_FAIRNESS_SCENARIOS.filter(s=>s.personality).length,6);
 assert.equal(PROGRESSION_SCENARIOS.length,22);
});
