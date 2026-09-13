import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {canParseInstantly,parseLocalCommand,commandIntent} from '../src/engine/custom-command';
import {generateTrajectory,sampleFlight} from '../src/engine/trajectory';
import {executeShot} from '../src/engine/execution';
import {parseShotIntent} from '../src/engine/shot-intent';
import {COURT} from '../src/engine/model';

test('ATP words map to a drive technique locally',()=>{
 for(const text of ['ATP','around the post','around-the-post','A T P']){
  assert.equal(canParseInstantly(text),true,text);assert.equal(parseLocalCommand(text).shot,'atp');
 }
});
test('ATP passes outside either post below net height and targets the back of the court',async()=>{
 for(const side of [-1,1]){
  const m=new Match();m.startPractice('wide');const c=m['currentContext']!;
  c.contact={x:side*4.2,y:.4,z:2.5};c.feet={x:side*4,y:0,z:2.7};c.bounced=true;m.state.ball.position={...c.contact};
  const intent=commandIntent(parseLocalCommand('ATP'),'you',c,m.state.players).intent;
  assert.equal(parseShotIntent(intent).technique,'atp');assert.equal(intent.type,'drive');
  const trajectory=generateTrajectory(intent,c,m.state.players);
  const crossing=sampleFlight(trajectory.leg,c.contact.z/(c.contact.z-trajectory.leg.to.z));
  assert.ok(side*crossing.x>COURT.netWidth/2+.08);assert.ok(crossing.y<COURT.netCenter);
  assert.equal(Math.sign(trajectory.aimPoint.x),side);assert.equal(trajectory.aimPoint.z,-5.6);
  await m.submitCommand('ATP','voice');assert.equal(m.state.phase,'flight',m.customStatus);
  assert.equal(m.shot.intent.technique,'atp');assert.equal(m.shot.intent.source,'voice');assert.match(m.shot.title,/ATP/);
 }
});
test('ATP cannot magically curve around a post from an inside contact or a blocked angle',()=>{
 const m=new Match();m.startPractice('wide');const c=m['currentContext']!;
 const intent=commandIntent(parseLocalCommand('ATP'),'you',c,m.state.players).intent;
 assert.throws(()=>generateTrajectory(intent,c,m.state.players),/wider/);
 const narrow={...c,contact:{x:3.5,y:.4,z:5}};
 const blocked=commandIntent(parseLocalCommand('ATP'),'you',narrow,m.state.players).intent;
 assert.throws(()=>generateTrajectory(blocked,narrow,m.state.players),/angle/);
});
test('ATP usually fails for ordinary players and improves only with elite drive and hands',()=>{
 const rates=[] as number[];
 for(const rating of [50,70,90,100]){
  const m=new Match();m.startPractice('wide');const c=m['currentContext']!;
  c.contact={x:4.2,y:.4,z:2.5};c.feet={x:4,y:0,z:2.7};c.bounced=true;
  const players=structuredClone(m.state.players),you=players.find(player=>player.id==='you')!;
  you.skills.drive=rating;you.skills.hands=rating;
  const intent=commandIntent(parseLocalCommand('ATP'),'you',c,players).intent;
  let made=0;
  for(let seed=0;seed<1000;seed++)made+=Number(executeShot(intent,c,players,{seed,balance:1}).outcome==='in');
  rates.push(made/1000);
 }
 assert.ok(rates[1]<.5,`A 70-rated player made ${(rates[1]*100).toFixed(1)}%`);
 assert.ok(rates[2]>rates[1]&&rates[3]>rates[2],rates.join(', '));
 assert.ok(rates[3]>.5,`A 100-rated player made ${(rates[3]*100).toFixed(1)}%`);
});
test('ATP skill is limited by the weaker of drive and hands',()=>{
 const m=new Match();m.startPractice('wide');const c=m['currentContext']!;
 c.contact={x:-4.2,y:.4,z:2.5};c.feet={x:-4,y:0,z:2.7};c.bounced=true;
 const players=structuredClone(m.state.players),you=players.find(player=>player.id==='you')!;
 const intent=commandIntent(parseLocalCommand('ATP'),'you',c,players).intent;
 you.skills.drive=98;you.skills.hands=55;
 const weakHands=executeShot(intent,c,players,{seed:12,balance:1});
 assert.equal(weakHands.skill,55);assert.ok(weakHands.difficulty.includes('ATP timing'));
 you.skills.drive=55;you.skills.hands=98;
 assert.equal(executeShot(intent,c,players,{seed:12,balance:1}).skill,55);
});
