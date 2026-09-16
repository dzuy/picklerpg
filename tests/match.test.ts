import {receptionPauseTime} from '../src/engine/rally-engine';
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
  if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');
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
 assert.deepEqual(m.availableIntents.slice(0,5).map(intent=>intent.spin?.side!=='none'?'slice':intent.spin?.vertical==='topspin'?'topspin':intent.spin?.vertical==='slice'?'backspin':intent.pace),['topspin','slice','backspin','fast','soft']);
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
  // Include genuinely weak movers; prepared reception reduces easy misses for normal players.
  if(seed%3===0)for(const player of m.state.players)player.skills.movement=0;
  for(let p=0;p<10&&!m.scoring.winner;p++){
   for(let f=0;f<10000&&m.state.phase!=='complete';f++){
    if(m.receptionDecision){const preferAir=(seed+p)%2===1;m.chooseReception(preferAir&&m.canTakeAir?'air':m.canLetBounce?'bounce':'air')}if(m.state.phase==='decision')m.submitIntent(m.availableIntents[(seed+p)%m.availableIntents.length]);m.update(.2);
   }
   assert.equal(m.state.phase,'complete');outcomes.add(m.state.result!.reason);maxLength=Math.max(maxLength,m.state.shotHistory.length);
   if(m.state.result?.reason==='double-bounce'){
    const hitter=m.state.players.find(player=>player.id===m.shot.actor)!;
    assert.equal(m.state.result.winner,hitter.team,'The hitting team wins an unreturned second bounce');
    const bounces=m.state.rallyHistory.filter(event=>event.type==='bounce'&&event.shotIndex===m.state.shotIndex);
    assert.equal(bounces.length,2);assert.ok(bounces.every(event=>event.position.z*m.shot.contact.z<0),'Both bounces stay on the receiving side');
   }
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
 const run=()=>{const m=new Match();for(let i=0;i<2000&&m.state.phase!=='complete';i++){if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.1)}return m};
 const a=run(),b=run();assert.equal(a.state.phase,'complete');assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.scoring,b.scoring);a.reset();assert.equal(a.scoring.call,'0–0–2');assert.equal(a.point,0);assert.equal(a.state.phase,'decision');
});
test('automatic replay traverses the whole point at normal gameplay speed without mutating its result',()=>{
 const m=new Match();for(let i=0;i<3000&&m.state.phase!=='complete';i++){if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.05)}
 assert.equal(m.state.phase,'complete');assert.ok(m.replayFrames.length>2);const completed=m.snapshot();m.startReplay();assert.equal(m.replayIndex,0);assert.equal(m.replayPlaying,true);
 let furthest=0;for(let i=0;i<3000&&m.replayPlaying;i++){m.update(.02);furthest=Math.max(furthest,m.replayIndex??m.replayFrames.length-1)}
 assert.ok(furthest>=m.replayFrames.length-1);assert.equal(m.replayPlaying,false);assert.equal(m.replayIndex,m.replayFrames.length-1);assert.deepEqual(m.snapshot(),completed);m.stopReplay();assert.equal(m.replayIndex,null);
});
test('every home contact waits for explicit selection',()=>{
 const m=new Match();let decisions=0;
 for(let i=0;i<20000&&m.state.phase!=='complete';i++){
  if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');
  if(m.state.phase==='decision'){assert.equal(m.state.possession,'home');assert.ok(m.availableIntents.length>4);const before=m.snapshot();m.update(50);assert.deepEqual(m.snapshot(),before);decisions++;m.submitIntent(m.availableIntents[0])}
  m.update(.1);
 }
 assert.equal(m.state.phase,'complete');assert.equal(decisions,m.state.shotHistory.filter(s=>s.actor==='you'||s.actor==='partner').length);
});
test('a playable pop-up pauses at 75% of its trajectory and can be smashed before it bounces',()=>{
 const m=new Match();m.seed=1;m.reset();let found=false;
 for(let frame=0;frame<10000&&!found;frame++){
  if(m.receptionDecision){const contact=m.shot.receptionChoice?.airborne?.legs.at(-1)?.to;if(m.canTakeAir&&contact&&contact.y>=1.45){found=true;break}m.chooseReception(m.canLetBounce?'bounce':'air')}
  if(m.state.phase==='decision')m.submitIntent(m.availableIntents[(frame+1)%m.availableIntents.length]);
  m.update(.2);if(m.state.phase==='complete')m.nextPoint();
 }
 assert.equal(found,true);assert.equal(m.state.phase,'flight');assert.equal(m.state.paused,true);assert.ok(Math.abs(m.engine.runtime().shotElapsed-receptionPauseTime(m.shot))<1e-9);
 const bounces=m.state.bounces,overhead=m.receptionOptions.find(option=>option.timing==='air'&&option.intent.type==='overhead');assert.ok(overhead);m.chooseReceptionIntent(overhead);
 let exposedSecondDecision=false;for(let frame=0;frame<1000&&m.state.shotHistory.at(-1)?.type!=='overhead';frame++){m.update(.02);if(m.state.phase==='decision')exposedSecondDecision=true}
 assert.equal(exposedSecondDecision,false);assert.equal(m.state.bounces,bounces);assert.equal(m.state.shotHistory.at(-1)?.type,'overhead');
});
test('every playable incoming rally shot pauses at 75% of its trajectory and accepts a queued custom shot',async()=>{
 const m=new Match();let found=false;
 for(let frame=0;frame<5000&&!found;frame++){
  if(m.receptionDecision){found=true;break}
  if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.05);if(m.state.phase==='complete'&&!m.scoring.winner)m.nextPoint();
 }
 assert.equal(found,true);assert.ok(Math.abs(m.engine.runtime().shotElapsed-receptionPauseTime(m.shot))<1e-9);assert.equal(m.state.paused,true);
 const soft=m.receptionOptions.some(option=>option.timing==='bounce'&&option.intent.type==='dink')?'dink':'drop';
 const command=m.canLetBounce?`let it bounce then ${soft} far left`:'volley far left';await m.queueReceptionCommand(command);
 let exposedSecondDecision=false;for(let frame=0;frame<2000&&!m.state.shotHistory.some(intent=>intent.source==='text');frame++){m.update(.02);if(m.state.phase==='decision')exposedSecondDecision=true;await Promise.resolve()}
 const shot=m.state.shotHistory.find(intent=>intent.source==='text');assert.ok(shot);assert.equal(shot.target.kind,'zone');if(shot.target.kind==='zone')assert.equal(shot.target.zone,'far-left');
 assert.equal(exposedSecondDecision,false);
});

test('video replay seeks by elapsed time forward and backward across uneven frames',()=>{
 const m=new Match(),before=m.snapshot();
 m.replayFrames=[0,.03,.3,1.8].map(simulationTime=>({...structuredClone(before),simulationTime}));
 m.scrubReplayTime(.6);assert.equal(m.replayPlaying,false);assert.ok(Math.abs(m.replayPosition-2.4)<1e-9);
 m.scrubReplayTime(.01);assert.equal(m.replayPosition,.5);
 m.scrubReplayTime(100);assert.equal(m.replayPosition,3);
 m.scrubReplayTime(-1);assert.equal(m.replayPosition,0);
 m.scrubReplayTime(NaN);assert.equal(m.replayPosition,0);
 assert.deepEqual(m.snapshot(),before);
});

test('game replay includes every point, preserves final state, and clears on New Game',()=>{
 const m=new Match();m.seed=99;m.reset();let points=0,frames=0;
 for(let tick=0;tick<200000&&!m.scoring.winner;tick++){
  if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');
  if(m.state.phase==='decision')m.submitIntent(m.availableIntents[tick%m.availableIntents.length]);
  m.update(.2);
  if(m.state.phase==='complete'){points++;frames+=m.replayFrames.length;if(!m.scoring.winner)m.nextPoint()}
 }
 assert.ok(m.scoring.winner);assert.equal(m.recordedPoints,points);
 const final=m.snapshot(),pointFrames=m.replayFrames;const names=m.state.players.map(p=>p.name);
 m.startGameReplay();assert.equal(m.replayScope,'game');assert.equal(m.replayFrames.length,frames);assert.ok(frames>pointFrames.length);
 assert.ok(m.replayFrames.every((f,i)=>i===0||f.simulationTime>=m.replayFrames[i-1].simulationTime));
 assert.deepEqual(m.replayFrames[0].score,{home:0,away:0});assert.deepEqual(m.replayFrames.at(-1)!.score,m.scoring.score);
 m.pauseReplay();m.scrubReplayTime(0);m.resumeReplay();m.update(.1);assert.ok(m.replayPosition>0);
 m.scrubReplayTime(1e9);assert.equal(m.replayIndex,frames-1);assert.deepEqual(m.snapshot(),final);
 m.stopReplay();assert.equal(m.replayScope,'point');assert.equal(m.replayFrames,pointFrames);assert.deepEqual(m.snapshot(),final);
 m.reset();assert.equal(m.scoring.winner,null);assert.deepEqual(m.scoring.score,{home:0,away:0});assert.equal(m.recordedPoints,0);assert.equal(m.replayIndex,null);assert.deepEqual(m.state.players.map(p=>p.name),names);
});
