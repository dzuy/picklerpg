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
 await assert.rejects(()=>reactions.request('','/api/matches/different/trash-talk',{id:'long',text:'x'.repeat(501)}));
});

test('body bag replay includes the complete animation and scrubs using replay time',()=>{
 const match=new Match(),before=match.snapshot();
 match.state.phase='complete';match.state.result={winner:'home',reason:'body-hit',playerId:'opponent-left'};
 match.state.simulationTime=3;match.update(0);
 const live=match.snapshot();match.startReplay();
 assert.equal(match.replayView()!.bodyHit?.age,0);
 match.scrubReplayTime(2.2);
 assert.ok(Math.abs(match.replayView()!.bodyHit!.age-2.2)<1e-9);
 const paused=match.replayView();match.update(1);assert.deepEqual(match.replayView(),paused);
 match.scrubReplayTime(4.8);assert.equal(match.replayView()!.bodyHit,null);
 match.scrubReplayTime(0);assert.equal(match.replayView()!.bodyHit?.age,0);
 match.stopReplay();assert.deepEqual(match.snapshot(),live);assert.notDeepEqual(live,before);
 match.scoring.winner='home';match.startGameReplay();match.scrubReplayTime(2.2);
 assert.ok(Math.abs(match.replayView()!.bodyHit!.age-2.2)<1e-9);
 match.stopReplay();
});

test('full game replay maps message times back to each original point',()=>{
 const match=new Match();
 const frame=match.snapshot(),shot=structuredClone(match.shot);
 // The second rally starts at a different source time than its concatenated video time.
 (match as any).gameReplay=[{frames:[{...frame,simulationTime:10},{...frame,simulationTime:13}],shots:[shot,shot]},
  {frames:[{...frame,simulationTime:20},{...frame,simulationTime:26}],shots:[shot,shot]}];
 match.scoring.score.home=match.scoring.rules.target;match.scoring.winner='home';
 match.startGameReplay();
 match.scrubReplayTime(4);
 assert.equal(match.replayView()!.reactionContext.point,1);
 assert.equal(match.replayView()!.reactionContext.time,21.5);
 match.stopReplay();assert.equal(match.replayScope,'point');
});
