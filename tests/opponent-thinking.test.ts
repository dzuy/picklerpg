import test from 'node:test';
import assert from 'node:assert/strict';
import {thinkingOpponent} from '../src/multiplayer/thinking';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,MemoryRepository} from './helpers/remote';
test('thought follows the opponent athlete and never appears on your turn, playback, or an ended game',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),own=await service.create(A,creation()),other=await service.get(own.id,B);
 assert.equal(thinkingOpponent(own),null);
 assert.equal(thinkingOpponent(other),other.nextHitter);
 assert.equal(thinkingOpponent(other,true),null);
 assert.equal(thinkingOpponent({...other,status:'completed'}),null);
 assert.equal(thinkingOpponent({...other,friendState:'pending'}),null);
 assert.equal(thinkingOpponent({...other,nextHitter:'opponent-left'}),null);
 assert.equal(thinkingOpponent(null),null);
});
