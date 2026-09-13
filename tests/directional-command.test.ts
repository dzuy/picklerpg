import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {canParseInstantly,parseLocalCommand,commandIntent} from '../src/engine/custom-command';
import {resolveTarget} from '../src/engine/targeting';
import {COURT} from '../src/engine/model';
test('far-left and far-right dinks target kitchen sidelines from either contact side',async()=>{
 const old=fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Must parse locally')};
 try{
  for(const side of ['left','right'])for(const x of [-1,1]){
   const m=new Match();m.startPractice('wide');const c={...m['currentContext']!,contact:{...m['currentContext']!.contact,x}};
   const text=`dink far ${side}`;assert.equal(canParseInstantly(text),true);
   const parsed=parseLocalCommand(text);assert.equal(parsed.target,`far-${side}`);
   const intent=commandIntent(parsed,'you',c,m.state.players).intent;
   const target=resolveTarget(intent.target,{actor:'you',contact:c.contact,players:m.state.players,shotType:'dink'});
   assert.equal(target.point.x,(side==='left'?-1:1)*(COURT.width/2-.25));assert.equal(target.point.z,-1.25);
   await m.submitCommand(text,'voice');assert.equal(m.state.phase,'flight',m.customStatus);assert.equal(m.shot.intent.type,'dink');assert.equal(m.shot.intent.source,'voice');
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=old}
});
