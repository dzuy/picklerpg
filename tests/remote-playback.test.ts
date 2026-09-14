import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePlayback} from '../src/multiplayer/playback';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';
test('a receipt newer than the scheduled frame starts playback at zero and skipping cannot change authority',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());const receipt=await service.act(s.id,A,action(s)),before=structuredClone(receipt);
 for(const segment of receipt.state.animation){const first=samplePlayback(segment,-20),last=samplePlayback(segment,1e9);assert.equal(first.progress,0);assert.deepEqual(first.position,segment.path[0]);assert.equal(last.progress,1);assert.deepEqual(last.position,segment.path.at(-1));}
 assert.deepEqual(receipt,before);assert.equal(db.receipts.size,1);
});
