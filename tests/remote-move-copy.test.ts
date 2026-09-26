import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCopy} from '../src/multiplayer/move-copy';
import {SHOT_TYPES} from '../src/engine/model';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';

test('shot calls name the hitter and stay the same across versions and viewers',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),initial=await service.create(A,creation());
 assert.equal(moveCopy(initial),'Waiting for the serve');
 const s=(await service.act(initial.id,A,action(initial))).state;
 s.roster.you.name='Kai';s.result=null;
 for(const type of SHOT_TYPES){
  s.animation=[{...s.animation[0],actor:'you',intent:{...s.animation[0].intent,type}}];
  const first=moveCopy(s);
  assert.match(first,/^Kai /);
  assert.doesNotMatch(first,/!|quality|risk|pressure|“/i);
  for(let version=0;version<12;version++){
   s.version=version;
   assert.equal(moveCopy(s),first);
   assert.equal(moveCopy({...s,viewerTeam:s.viewerTeam==='home'?'away':'home'}),first);
   assert.equal(moveCopy(structuredClone(s)),first);
  }
 }
});

test('point endings state the observed result',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),initial=await service.create(A,creation());
 const s=(await service.act(initial.id,A,action(initial))).state;
 s.roster['opponent-left'].name='Amir';
 s.result={winner:'home',reason:'body-hit',playerId:'opponent-left'};
 assert.equal(moveCopy(s),'The ball hits Amir');
 s.result={winner:'away',reason:'out'};
 assert.equal(moveCopy(s),'The shot lands out');
 s.result={winner:'away',reason:'net'};
 assert.equal(moveCopy(s),'The shot hits the net');
});
