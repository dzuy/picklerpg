import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {selectionOpportunity,selectionCapture} from '../server/multiplayer/selection-events';
import {creation} from './helpers/remote';

function game(){const m=new Match();m.seed=43;m.startLocalHumanMatch(creation().roster);return m;}
function take(m:Match,index=0){
 const choice=m.targetingMenu[index%m.targetingMenu.length];assert.ok(choice);
 const before=selectionOpportunity(m);
 m.submitTurn({decisionId:m.decisionId,playerId:m.currentPlayer!,...choice});m.settleCommittedPlayback();
 return selectionCapture(before,m,{kind:'play_shot',...choice});
}

test('selection snapshots retain offered timing variants and pre-action context, independently of chosen target',()=>{
 const m=game(),before=selectionOpportunity(m),choice=m.targetingMenu[0];
 assert.equal(before.completedContacts,0);assert.equal(before.pointIndex,0);
 assert.deepEqual(before.offered,m.targetingMenu.map(c=>({...c,timing:c.timing??null})));
 assert.equal(before.contexts[0].context.opening,'serve');
 const capture=take(m);
 assert.equal(capture.execution.selectedShotExecuted,true);assert.equal(capture.execution.contactOrdinal,1);
 assert.equal(capture.completedContacts,0);
 assert.equal(capture.offered[0].intent.type,choice.intent.type);
 const serialized=JSON.stringify(capture);
 for(const key of ['resolution_secret','seed','receptionChoice','legs'])assert.equal(serialized.includes(`"${key}"`),false);
});

test('a selected reply that is never struck is not a contact or the point-ending shot',()=>{
 const m=game();let reception=false;
 for(let i=0;i<400;i++){
  if(m.receptionDecision){reception=true;break;}
  if(m.scoring.winner)break;
  take(m,i);if(m.state.phase==='complete'&&!m.scoring.winner)m.nextPoint();
 }
 assert.ok(reception,'fixture must reach a reception decision');
 const checkpoint=m.exportCheckpoint();
 for(const branch of [checkpoint.rally.shot.receptionChoice?.airborne,checkpoint.rally.shot.receptionChoice?.bounced]){
  if(branch){branch.resolution.result={winner:m.decisionTeam==='home'?'away':'home',reason:'missed-swing',playerId:branch.resolution.receiver!};}
 }
 const incoming=checkpoint.rally.state.shotHistory.at(-1)!;
 const restored=Match.fromCheckpoint(checkpoint),before=selectionOpportunity(restored),capture=take(restored);
 assert.ok(before.contexts.every(c=>c.timing==='air'||c.timing==='bounce'));
 assert.equal(capture.execution.selectedShotExecuted,false);
 assert.equal(capture.execution.contactOrdinal,null);
 assert.equal(capture.execution.terminalContactOrdinal,before.completedContacts);
 assert.deepEqual(capture.execution.terminalIntent,incoming);
 assert.equal(capture.execution.pointResult?.reason,'missed-swing');
 assert.equal(restored.state.phase,'complete');
 const point=capture.pointIndex;restored.nextPoint();
 assert.equal(capture.pointIndex,point);assert.equal(restored.point,point+1);
});
