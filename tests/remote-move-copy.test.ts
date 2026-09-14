import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCopy} from '../src/multiplayer/move-copy';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,action,testers,MemoryRepository} from './helpers/remote';
test('move banner names the actor and known opposing receiver, then states viewer turn',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),initial=await service.create(A,creation());
 assert.equal(moveCopy(initial),'Ready to serve. Your turn!');
 const s=(await service.act(initial.id,A,action(initial))).state;
 s.roster.you.name='Drew';s.roster['opponent-left'].name='Blake';
 s.animation=[{...s.animation[0],actor:'you',intent:{...s.animation[0].intent,type:'overhead'}}];
 s.result=null;s.display.currentHitter='opponent-left';s.currentTeam='away';s.viewerTeam='away';
 assert.equal(moveCopy(s),'Drew smashed the ball overhead to Blake. Your turn!');
 s.display.currentHitter=null;assert.ok(!moveCopy(s).includes('to Blake'));
 s.result={winner:'home',reason:'out'};s.status='completed';
 assert.match(moveCopy(s),/Their team won the point \(out\). Game finished\./);assert.ok(!moveCopy(s).includes('Your turn'));
});
