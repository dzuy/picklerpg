import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../src/browser-storage';
import {loadScoringPreference,saveScoringPreference} from '../src/scoring-preference';

const storage=()=>createSafeStorage(()=>{throw Error('Use isolated memory storage');}).storage;

test('the last started game overrides defaults in every new-game flow',()=>{
 const local=storage();
 for(const scoring of ['side-out-doubles','rally-doubles'] as const){
  saveScoringPreference({scoring,target:21},local);
  for(const target of [5,7,11])assert.deepEqual(loadScoringPreference({scoring:'rally-doubles',target},local),{scoring,target:21});
 }
 saveScoringPreference({scoring:'side-out-doubles',target:3},local);
 assert.deepEqual(loadScoringPreference(undefined,local),{scoring:'side-out-doubles',target:3});
});

test('opening setup does not save defaults or replace the last used settings',()=>{
 const local=storage();
 assert.deepEqual(loadScoringPreference({scoring:'rally-doubles',target:5},local),{scoring:'rally-doubles',target:5});
 assert.equal(local.length,0);
 saveScoringPreference({scoring:'side-out-doubles',target:15},local);
 loadScoringPreference({scoring:'rally-doubles',target:7},local);
 assert.deepEqual(loadScoringPreference(undefined,local),{scoring:'side-out-doubles',target:15});
});

test('legacy scoring is preserved and invalid settings cannot overwrite a valid preference',()=>{
 const local=storage();local.setItem('pickle-rpg-controls-v1',JSON.stringify({scoringPreference:'side-out-doubles'}));
 assert.deepEqual(loadScoringPreference(undefined,local),{scoring:'side-out-doubles',target:7});
 local.setItem('pickle-scoring-preference-v1','{broken');
 assert.equal(loadScoringPreference(undefined,local).scoring,'side-out-doubles');
 saveScoringPreference({scoring:'rally-doubles',target:9},local);
 for(const target of [0,100,1.5,NaN])saveScoringPreference({scoring:'side-out-doubles',target},local);
 assert.deepEqual(loadScoringPreference(undefined,local),{scoring:'rally-doubles',target:9});
});
