import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFinishing} from '../src/finishing-evaluation';
import {overheadPressure} from '../src/engine/overhead-pressure';
import {Match} from '../src/match';
import {localDecision,tacticalSnapshot,OpponentMemory} from '../src/engine/opponent-brain';

test('higher overhead skill improves precision without promising a winner on every target',()=>{
 const low=evaluateFinishing(50,50),high=evaluateFinishing(90,50);
 for(let i=0;i<low.length;i++){
  assert.ok(high[i].meanError<low[i].meanError*.4);
  assert.ok(high[i].legalRate>=low[i].legalRate);
  assert.ok(Math.abs(high[i].immediateWinRate+high[i].faultRate+high[i].returnedRate-1)<1e-9);
 }
});

test('overhead choice favors defender time pressure without using execution samples',()=>{
 const m=new Match();m.startPractice('height');
 const options=m.availableIntents.filter(o=>o.type==='overhead');
 const snapshot=tacticalSnapshot(m.state,options,new OpponentMemory(),'Chess Player',.8),before=structuredClone(snapshot);
 const pressures=options.map(o=>overheadPressure(o,snapshot.ball.position,snapshot.players,8));
 assert.ok(Math.max(...pressures)>.5);assert.ok(pressures.some(p=>p===0));
 let difficult=0;
 for(let seed=0;seed<200;seed++){
  const choice=localDecision(snapshot,undefined,{seed,recent:[]});
  difficult+=Number(pressures[choice]>.5);
 }
 assert.ok(difficult>180,`selected pressure on ${difficult}/200 contacts`);
 assert.deepEqual(snapshot,before);
 const intent=options[0],contact=snapshot.ball.position;
 assert.equal(overheadPressure(intent,contact,snapshot.players,8),overheadPressure({...intent,source:'voice'},contact,snapshot.players,8));
});
