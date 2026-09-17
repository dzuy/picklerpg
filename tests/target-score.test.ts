import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {parseCheckpoint} from '../src/engine/checkpoint';

for(const scoring of ['rally-doubles','side-out-doubles'] as const){
 test(`${scoring}: chosen target survives saving and requires a two-point lead`,()=>{
  const match=new Match();match.scoringPreference=scoring;match.startSoloMatch(7);
  match.reset();
  const saved=JSON.parse(JSON.stringify(match.exportCheckpoint()));
  const resumed=Match.fromCheckpoint(saved);
  assert.deepEqual(resumed.scoring.rules,{scoring,target:7,winBy:2});
  resumed.scoring.score={home:6,away:6};
  resumed.scoring.award('home');
  assert.equal(resumed.scoring.winner,null);
  resumed.scoring.award('home');
  assert.equal(resumed.scoring.winner,'home');
  resumed.reset();assert.equal(resumed.scoring.rules.target,7);
 });
}

test('target scores accept the range boundaries and reject invalid new or saved values',()=>{
 const match=new Match();
 for(const target of [1,99]){match.startSoloMatch(target);assert.equal(parseCheckpoint(match.exportCheckpoint()).rules.target,target);}
 const saved=match.exportCheckpoint();
 for(const target of [0,-1,100,2.5,NaN,Infinity]){
  assert.throws(()=>match.startSoloMatch(target));
  assert.throws(()=>parseCheckpoint({...saved,rules:{...saved.rules,target}}));
 }
 match.startSoloMatch();assert.equal(match.scoring.rules.target,11);
});
