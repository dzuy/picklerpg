import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePlayback} from '../src/multiplayer/playback';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';
test('a receipt newer than the scheduled frame starts playback at zero and skipping cannot change authority',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());const receipt=await service.act(s.id,A,action(s)),before=structuredClone(receipt);
 for(const segment of receipt.state.animation){const first=samplePlayback(segment,-20),last=samplePlayback(segment,1e9);assert.equal(first.progress,0);assert.deepEqual(first.position,segment.path[0]);assert.equal(last.progress,1);assert.deepEqual(last.position,segment.path.at(-1));}
 const dink={...receipt.state.animation[0],duration:5,pathTimes:undefined,intent:{...receipt.state.animation[0].intent,type:'dink' as const}};assert.equal(samplePlayback(dink,5000).progress,1);assert.equal(samplePlayback(dink,2500).progress,.5);
 const exact={...receipt.state.animation[0],pathTimes:undefined,path:[{x:0,y:.9,z:0},{x:0,y:.037,z:0}]};assert.deepEqual(samplePlayback(exact,1e9).position,exact.path[1],'endpoint is exact even when interpolation would round');
 assert.deepEqual(receipt,before);assert.equal(db.receipts.size,1);
});

test('replay visits a bounce between regular sample times without cutting across it',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 const receipt=await service.act(game.id,A,action(game));
 const segment={...receipt.state.animation[0],duration:1,pathTimes:[0,.43,1],path:[{x:0,y:1,z:0},{x:1,y:.037,z:1},{x:2,y:.7,z:2}]};
 assert.deepEqual(samplePlayback(segment,430).position,segment.path[1]);
 assert.ok(samplePlayback(segment,400).position.y>.037);assert.ok(samplePlayback(segment,460).position.y>.037);
 for(const original of receipt.state.animation){assert.equal(original.pathTimes?.length,original.path.length);assert.equal(original.pathTimes?.[0],0);assert.equal(original.pathTimes?.at(-1),original.duration);}
});
