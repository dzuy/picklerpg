import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';

test('autoplay resolves the intentional reception pause for either home player',()=>{
 const match=new Match();let found=false;
 for(let frame=0;frame<10000;frame++){
  if(match.receptionDecision){
   found=true;assert.equal(match.state.paused,true);
   const index=match.state.shotIndex;
   match.playerAutonomy=true;match.partnerAutonomy=true;match.update(.01);
   assert.ok(!match.receptionDecision||match.state.shotIndex!==index);
   assert.equal(match.state.paused,false);break;
  }
  if(match.state.phase==='decision')match.submitIntent(match.availableIntents[0]);
  if(match.state.phase==='complete'){if(match.scoring.winner)match.reset();else match.nextPoint()}
  match.update(.05);
 }
 assert.ok(found,'must exercise a reception prompt');
});

test('player autoplay serves automatically and respects pause and opt-out',()=>{
 const match=new Match();match.reset();
 assert.equal(match.state.currentHitter,'you');
 match.update(.01);assert.equal(match.state.phase,'decision');
 match.playerAutonomy=true;match.state.paused=true;
 match.update(.01);assert.equal(match.state.phase,'decision');
 match.state.paused=false;match.update(.01);
 assert.equal(match.state.phase,'flight');
 match.playerAutonomy=false;match.reset();match.update(.01);
 assert.equal(match.state.phase,'decision');
});
