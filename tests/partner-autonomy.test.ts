import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
function partnerReception(actor:'you'|'partner'='partner'){
 const match=new Match();
 for(let frame=0;frame<20000;frame++){
  if(match.receptionDecision){if(match.shot.resolution?.receiver===actor)return match;match.chooseReception(match.canLetBounce?'bounce':'air')}
  if(match.state.phase==='decision')match.submitIntent(match.availableIntents[frame%match.availableIntents.length]);
  match.update(.1);if(match.state.phase==='complete')match.nextPoint();
 }
 throw new Error('Expected a partner reception');
}
test('turning on partner auto-play resolves reception and plays immediately at contact',()=>{
 const match=partnerReception();assert.equal(match.manualReceptionDecision,true);
 match.update(.05);assert.equal(match.receptionDecision,true,'off keeps manual selection');
 const count=match.state.shotHistory.length;
 match.partnerAutonomy=true;assert.equal(match.manualReceptionDecision,false);
 match.update(.01);assert.equal(match.receptionDecision,false);assert.equal(match.state.paused,false);
 for(let frame=0;frame<500&&match.state.shotHistory.length===count;frame++)match.update(.02);
 assert.equal(match.thinking,false);
 assert.equal(match.state.shotHistory.length,count+1);assert.equal(match.state.shotHistory.at(-1)?.actor,'partner');assert.equal(match.state.shotHistory.at(-1)?.source,'ai');
});
test('turning auto-play off before contact leaves the shot for manual choice',()=>{
 const match=partnerReception();match.partnerAutonomy=true;match.update(.01);match.partnerAutonomy=false;
 const count=match.state.shotHistory.length;
 for(let frame=0;frame<500&&match.state.phase!=='decision';frame++)match.update(.02);
 assert.equal(match.state.phase,'decision');assert.equal(match.state.shotHistory.length,count);assert.equal(match.thinking,false);
});

test('partner auto-play leaves your reception waiting for your own choice',()=>{
 const match=partnerReception('you');match.partnerAutonomy=true;
 assert.equal(match.manualReceptionDecision,true);
 match.update(.1);assert.equal(match.receptionDecision,true);assert.equal(match.state.paused,true);
});
