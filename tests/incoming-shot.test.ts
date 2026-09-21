import test from 'node:test';
import assert from 'node:assert/strict';
import {incomingShotLabel} from '../src/incoming-shot';
import {Match} from '../src/match';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action,MemoryRepository} from './helpers/remote';
test('incoming descriptions distinguish pace, lob and spin without claiming outcomes',()=>{
 const base=new Match().targetingMenu[0].intent;
 assert.equal(incomingShotLabel({...base,type:'overhead',pace:'fast'}),'Strong overhead smash incoming');
 assert.equal(incomingShotLabel({...base,type:'lob'}),'High lob incoming');
 assert.equal(incomingShotLabel({...base,type:'drive',spin:{vertical:'slice',side:'none',strength:'strong'}}),'Sliced drive incoming');
 assert.equal(incomingShotLabel(undefined),null);
 assert.equal(incomingShotLabel({...base,type:'lob'},true),'Your serve');
});
test('remote header reflects the committed shot and resets for a new serve',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());
 assert.equal(s.incomingShotLabel,'Your serve');
 const after=(await service.act(s.id,A,action(s))).state;
 const row=db.rows.get(s.id)!;
 const match=Match.fromCheckpoint(row.checkpoint);
 assert.equal(after.incomingShotLabel,incomingShotLabel(match.state.shotHistory.at(-1),match.targetingMenu.some(c=>c.intent.type==='serve')));
 assert.equal((await service.get(s.id,B)).incomingShotLabel,after.incomingShotLabel);
});
