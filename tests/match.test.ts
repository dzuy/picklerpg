import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DoublesScore} from '../src/engine/scoring';
import {PATTERNS} from '../src/engine/patterns';
import {Match} from '../src/match';
test('side-out scoring, partner rotation and win by two',()=>{
 const s=new DoublesScore();assert.equal(s.call,'0–0–2');s.award('away');assert.equal(s.server,'opponent-left');assert.equal(s.serverNumber,1);assert.equal(s.score.away,0);
 s.award('away');assert.equal(s.server,'opponent-left');assert.equal(s.right.away,'opponent-right');s.award('home');assert.equal(s.server,'opponent-right');assert.equal(s.serverNumber,2);s.award('home');assert.equal(s.server,'you');
 s.score={home:10,away:10};s.award('home');assert.equal(s.winner,null);s.award('home');assert.equal(s.winner,'home');assert.throws(()=>s.award('away'));
});
test('complete unscripted games terminate with valid score and no stuck contacts',()=>{
 for(const seed of [1,1741,99]){
 const m=new Match();m.seed=seed;m.reset();const types=new Set<string>();let points=0;
 for(let frames=0;frames<200000&&!m.scoring.winner;frames++){
  if(m.state.phase==='decision'){assert.ok(m.availableIntents.length);const options=m.availableIntents;const intent=options[(frames+seed)%options.length];types.add(intent.type);m.submitIntent(intent)}
  m.update(.2);
  if(m.state.phase==='complete'&&!m.scoring.winner){points++;m.nextPoint()}
 }
 assert.ok(m.scoring.winner,`seed ${seed}, points ${points}`);assert.ok(Math.abs(m.scoring.score.home-m.scoring.score.away)>=2);assert.ok(types.size>=2);const before=m.scoring.call;m.update(10);assert.equal(m.scoring.call,before);
 }
});
test('opening waits for two bounces and paused decisions preserve the court',()=>{
 const m=new Match();const before=m.snapshot();m.update(3);assert.deepEqual(m.snapshot(),before);
 m.submitIntent(m.availableIntents[0]);m.state.paused=true;const paused=m.snapshot();m.update(3);assert.deepEqual(m.snapshot(),paused);m.state.paused=false;
 for(let i=0;i<10000&&m.state.phase==='flight';i++)m.update(.02);
 if(m.state.phase==='decision'){assert.ok(m.state.bounces>=2);assert.ok(m.state.shotHistory.length>=2)}
});
test('home serve opens with four primary choices and additional serves',()=>{
 const m=new Match();
 assert.ok(m.availableIntents.length>4);
 assert.ok(m.availableIntents.every(intent=>intent.type==='serve'));
 assert.equal(new Set(m.availableIntents.map(intent=>JSON.stringify({...intent,source:'menu'}))).size,m.availableIntents.length);
 assert.deepEqual(m.availableIntents.slice(0,4).map(intent=>intent.target.kind==='zone'?`${intent.target.depth}-${intent.target.zone}`:'player'),['deep-crosscourt','deep-crosscourt','deep-wide','transition-wide']);
});
test('every contextual home shot has choices beyond the primary four',()=>{
 const m=new Match();
 for(const pattern of PATTERNS){m.startPractice(pattern.id);assert.ok(m.availableIntents.length>4,`${pattern.id} only offered ${m.availableIntents.length} choices`)}
});
test('a net fault animates from net contact down to the floor before ending',()=>{
 const m=new Match();m.seed=5;m.startPractice('middle');m.submitIntent(m.availableIntents[0]);
 assert.equal(m.shot.resolution?.result?.reason,'net');assert.equal(m.shot.legs.length,2);
 const [intoNet,drop]=m.shot.legs;assert.ok(Math.abs(intoNet.to.z)<1e-8);assert.deepEqual(drop.from,intoNet.to);assert.equal(drop.to.y,.037);assert.equal(drop.bounceAtEnd,true);
 m.update(intoNet.duration);assert.equal(m.state.phase,'flight');assert.deepEqual(m.state.ball.position,intoNet.to);
 m.update(drop.duration);assert.equal(m.state.phase,'complete');assert.equal(m.state.result?.reason,'net');assert.deepEqual(m.state.ball.position,drop.to);
});
test('point endings include boundary faults and unreturned balls across tactical samples',()=>{
 const outcomes=new Set<string>();let maxLength=0;
 for(let seed=1;seed<=30;seed++){
  const m=new Match();m.seed=seed;m.reset();
  for(let p=0;p<10&&!m.scoring.winner;p++){
   for(let f=0;f<10000&&m.state.phase!=='complete';f++){
    if(m.state.phase==='decision')m.submitIntent(m.availableIntents[(seed+p)%m.availableIntents.length]);m.update(.2);
   }
   assert.equal(m.state.phase,'complete');outcomes.add(m.state.result!.reason);maxLength=Math.max(maxLength,m.state.shotHistory.length);
   const score={...m.scoring.score};m.update(20);assert.deepEqual(m.scoring.score,score);if(!m.scoring.winner)m.nextPoint();
  }
 }
 assert.ok(outcomes.has('net'));assert.ok(outcomes.has('out'));assert.ok(outcomes.has('double-bounce')||outcomes.has('unreturned-attack'));assert.ok(maxLength>5);
});
test('score parity keeps the same server while swapping serving court',()=>{
 const score=new DoublesScore();for(let i=0;i<5;i++){const server=score.server,right=score.right.home;score.award('home');assert.equal(score.server,server);assert.notEqual(score.right.home,right)}
 score.award('away');assert.equal(score.serverNumber,1);assert.equal(score.server,score.right.away);
});
test('full match replay is seed deterministic and restart resets the game',()=>{
 const run=()=>{const m=new Match();for(let i=0;i<2000&&m.state.phase!=='complete';i++){if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.1)}return m};
 const a=run(),b=run();assert.equal(a.state.phase,'complete');assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.scoring,b.scoring);a.reset();assert.equal(a.scoring.call,'0–0–2');assert.equal(a.point,0);assert.equal(a.state.phase,'decision');
});
test('automatic replay traverses the whole point at normal gameplay speed without mutating its result',()=>{
 const m=new Match();for(let i=0;i<3000&&m.state.phase!=='complete';i++){if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.05)}
 assert.equal(m.state.phase,'complete');assert.ok(m.replayFrames.length>2);const completed=m.snapshot();m.startReplay();assert.equal(m.replayIndex,0);assert.equal(m.replayPlaying,true);
 let furthest=0;for(let i=0;i<3000&&m.replayPlaying;i++){m.update(.02);furthest=Math.max(furthest,m.replayIndex??m.replayFrames.length-1)}
 assert.ok(furthest>=m.replayFrames.length-1);assert.equal(m.replayPlaying,false);assert.equal(m.replayIndex,m.replayFrames.length-1);assert.deepEqual(m.snapshot(),completed);m.stopReplay();assert.equal(m.replayIndex,null);
});
test('every home contact waits for explicit selection',()=>{
 const m=new Match();let decisions=0;
 for(let i=0;i<20000&&m.state.phase!=='complete';i++){
  if(m.state.phase==='decision'){assert.equal(m.state.possession,'home');assert.ok(m.availableIntents.length>4);const before=m.snapshot();m.update(50);assert.deepEqual(m.snapshot(),before);decisions++;m.submitIntent(m.availableIntents[0])}
  m.update(.1);
 }
 assert.equal(m.state.phase,'complete');assert.equal(decisions,m.state.shotHistory.filter(s=>s.actor==='you'||s.actor==='partner').length);
});
