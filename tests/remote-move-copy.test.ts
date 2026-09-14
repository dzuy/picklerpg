import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCopy} from '../src/multiplayer/move-copy';
import {SHOT_TYPES} from '../src/engine/model';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';
test('commentary varies across moves but remains stable across viewers and refreshes',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),initial=await service.create(A,creation());
 assert.doesNotMatch(moveCopy(initial),/your turn|waiting for/i);
 const s=(await service.act(initial.id,A,action(initial))).state;
 s.roster.you.name='Hulk';s.result=null;
 for(const type of SHOT_TYPES){
  s.animation=[{...s.animation[0],actor:'you',intent:{...s.animation[0].intent,type}}];
  const calls=new Set<string>();
  for(let version=0;version<12;version++){
   s.version=version;const call=moveCopy(s);calls.add(call);
   assert.match(call,/Hulk/);assert.doesNotMatch(call,/your turn|waiting for|undefined|\{a\}/i);
   assert.equal(call,moveCopy({...s,viewerTeam:s.viewerTeam==='home'?'away':'home'}));
   assert.equal(call,moveCopy(structuredClone(s)));
  }
  assert.ok(calls.size>=6,`${type} needs variety`);
 }
 s.roster['opponent-left'].name='Black Widow';
 s.result={winner:'home',reason:'body-hit',playerId:'opponent-left'};
 for(let i=0;i<12;i++){s.version=i;assert.match(moveCopy(s),/Black Widow/);assert.doesNotMatch(moveCopy(s),/Hulk/);}
 s.result={winner:'home',reason:'body-hit'};assert.doesNotMatch(moveCopy(s),/Black Widow|Hulk/);
 s.result={winner:'away',reason:'out'};assert.match(moveCopy(s),/out|far|bounds/i);
 s.result={winner:'away',reason:'net'};assert.match(moveCopy(s),/net/i);
 s.result=null;s.animation[0].intent.type='drive';s.animation[0].intent.pace='soft';
 for(let i=0;i<12;i++){s.version=i;assert.doesNotMatch(moveCopy(s),/HARD|rocket|throttle|ZIP/);}
});

test('only the hitter’s nonempty catchphrase enters the commentary rotation',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),initial=await service.create(A,creation());
 const s=(await service.act(initial.id,A,action(initial))).state;s.result=null;
 const hitter=s.animation.at(-1)!.actor;
 s.roster[hitter].name='Hulk';s.roster[hitter].catchphrase='Hulk smash!';
 const calls=[];for(let i=0;i<12;i++){s.version=i;calls.push(moveCopy(s));}
 assert.equal(calls.filter(c=>c==='Hulk: “Hulk smash!”').length,3);
 s.roster[hitter].catchphrase='  ';
 for(let i=0;i<12;i++){s.version=i;assert.doesNotMatch(moveCopy(s),/“|Hulk smash!/);}
 s.roster[hitter].catchphrase='Hulk smash!';s.result={winner:'away',reason:'net'};
 assert.match(moveCopy(s),/net/i);
});
