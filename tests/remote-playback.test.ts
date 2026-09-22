import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePlayback,replayOutcome} from '../src/multiplayer/playback';
import {BODY_HIT_REACTION_SECONDS} from '../src/body-hit-reaction';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';
test('body bag replay includes the reaction and seeks deterministically around impact',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 const receipt=await service.act(game.id,A,action(game));
 const segments=receipt.state.animation,contact=segments.reduce((sum,s)=>sum+s.duration,0);
 const result={winner:'home' as const,reason:'body-hit' as const,playerId:'opponent-right' as const};
 const before=structuredClone(segments);
 assert.equal(replayOutcome(segments,result,0).duration,contact+BODY_HIT_REACTION_SECONDS);
 assert.equal(replayOutcome(segments,result,contact-.01).bodyHit,null);
 const hit=replayOutcome(segments,result,contact+.4).bodyHit!;
 assert.equal(hit.player,result.playerId);assert.equal(hit.height,segments.at(-1)!.path.at(-1)!.y);assert.ok(Math.abs(hit.age-.4)<1e-9);
 assert.deepEqual(replayOutcome(segments,result,contact+.4).bodyHit,hit,'paused time preserves the pose');
 assert.equal(replayOutcome(segments,result,contact+BODY_HIT_REACTION_SECONDS+.001).bodyHit,null);
 assert.equal(replayOutcome(segments,result,0).bodyHit,null,'rewinding removes the reaction');
 assert.equal(replayOutcome(segments,result,contact).bodyHit?.age,0,'replaying retriggers impact');
 assert.equal(replayOutcome(segments,null,contact).duration,contact);
 assert.deepEqual(segments,before);
});
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
 for(const original of receipt.state.animation){assert.equal(original.pathTimes?.length,original.path.length);assert.equal(original.pathTimes?.[0],0);assert.ok(Math.abs(original.pathTimes!.at(-1)!-original.duration)<1e-9,'final path time matches duration within floating-point precision');}
});
