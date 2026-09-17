import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {LocalReactions,type ReactionContext} from '../src/local-reactions';
import type {TrashTalkFeed} from '../src/multiplayer/trash-talk';

test('bot rally replay pauses presentation and leaves the pending shot and score unchanged',()=>{
 const match=new Match();match.submitIntent(match.availableIntents[0]);for(let i=0;i<8;i++)match.update(.05);
 assert.equal(match.canReplay,true);const before=match.snapshot(),score=structuredClone(match.scoring);
 match.startRecentReplay();assert.notEqual(match.replayIndex,null);match.update(2);assert.deepEqual(match.snapshot(),before);assert.deepEqual(structuredClone(match.scoring),score);
 match.stopReplay();assert.deepEqual(match.snapshot(),before);match.update(.1);assert.equal(match.replayIndex,null);
});
test('previous point can replay after the next serve is ready, then restore current buffers',()=>{
 const m=new Match();for(let i=0;i<3000&&m.state.phase!=='complete';i++){if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.05)}
 assert.equal(m.state.phase,'complete');m.nextPoint();const pending=m.snapshot(),frames=m.replayFrames,shots=m.replayShots;
 m.startRecentReplay();assert.notEqual(m.replayIndex,null);assert.equal(m.replayScope,'point');assert.equal(m.replayPointIndex,0);m.update(5);m.stopReplay();
 assert.deepEqual(m.snapshot(),pending);assert.equal(m.replayFrames,frames);assert.equal(m.replayShots,shots);assert.equal(m.replayPointIndex,1);
});
test('local reactions persist by owner and match, sanitize and replay at their original point and time',async()=>{
 const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}};
 let owner='one';let context:ReactionContext={id:'match',point:2,time:4,player:'partner'};
 const reactions=new LocalReactions(storage,()=>owner,()=>context);
 const feed=await reactions.request<TrashTalkFeed>('','/api/matches/match/trash-talk',{id:'message',text:'  Nice   shot!  '});assert.equal(feed.messages[0].text,'Nice shot!');assert.equal(feed.messages[0].player,'partner');
 await reactions.request('','/api/matches/match/trash-talk',{id:'message',text:'Nice shot!'});assert.equal(reactions.replay('match',2,4).length,1);
 assert.equal(reactions.replay('match',1,4).length,0);assert.equal(reactions.replay('match',2,3).length,0);assert.equal(reactions.replay('match',2,12).length,0);
 assert.equal(new LocalReactions(storage,()=>owner,()=>context).replay('match',2,4).length,1);
 owner='two';assert.equal(reactions.replay('match',2,4).length,0);owner='one';context={...context,id:'different'};assert.equal(reactions.replay('different',2,4).length,0);
 await assert.rejects(()=>reactions.request('','/api/matches/match/trash-talk',{id:'stale',text:'Hi'}));
 await assert.rejects(()=>reactions.request('','/api/matches/different/trash-talk',{id:'long',text:'x'.repeat(41)}));
});
