import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {canParseInstantly,parseLocalCommand,commandIntent,validateCommand} from '../src/engine/custom-command';
import {generateTrajectory} from '../src/engine/trajectory';
import {executeShot} from '../src/engine/execution';
import {COURT} from '../src/engine/model';

test('high lob wording preserves distinct loft through local and model parsing',()=>{
 for(const text of ['lob super high','very high lob','lob really high']){
  assert.equal(canParseInstantly(text),true);assert.equal(parseLocalCommand(text).loft,'very-high');
 }
 assert.equal(parseLocalCommand('lob high').loft,'high');assert.equal(parseLocalCommand('lob').loft,undefined);
 assert.equal(validateCommand({...parseLocalCommand('lob'),loft:'very-high'}).loft,'very-high');
 assert.throws(()=>validateCommand({...parseLocalCommand('lob'),loft:'infinite'}));
});
test('super high lob flies higher and longer with greater long-ball risk at the same target and skill',()=>{
 const m=new Match();m.startPractice('wide');const c=m['currentContext']!,players=m.state.players;
 const normal=commandIntent(parseLocalCommand('lob deep middle'),'you',c,players).intent;
 const high=commandIntent(parseLocalCommand('lob super high deep middle'),'you',c,players).intent;
 const a=generateTrajectory(normal,c,players),b=generateTrajectory(high,c,players);
 assert.deepEqual(high.target,normal.target);assert.ok(b.apex>a.apex+1);assert.ok(b.leg.duration>a.leg.duration);
 let regularLong=0,highLong=0;
 for(let seed=0;seed<400;seed++){
  const regular=executeShot(normal,c,players,{seed,balance:1}),extra=executeShot(high,c,players,{seed,balance:1});
  regularLong+=Number(Math.abs(regular.actualEndpoint.z)>COURT.length/2+.037);
  highLong+=Number(Math.abs(extra.actualEndpoint.z)>COURT.length/2+.037);
 }
 assert.ok(highLong>regularLong,`${highLong} vs ${regularLong}`);assert.ok(highLong<400);
});
test('spoken super high lob submits locally',async()=>{
 const m=new Match();m.startPractice('wide');await m.submitCommand('lob super high','voice');
 assert.equal(m.state.phase,'flight',m.customStatus);assert.equal(m.shot.intent.type,'lob');assert.equal(m.shot.intent.intendedNetClearance,7);assert.equal(m.shot.intent.source,'voice');
});

test('super high lob serves preserve legal serve intent with extra height and long-ball risk',async()=>{
 const m=new Match(),c=m['currentContext']!,players=m.state.players;
 const normal=commandIntent(parseLocalCommand('lob serve'),'you',c,players).intent;
 for(const phrase of ['super high lob serve','lob serve super high','serve really high']){
  assert.equal(canParseInstantly(phrase),true);const parsed=parseLocalCommand(phrase);
  assert.equal(parsed.shot,'lob-serve');assert.equal(parsed.loft,'very-high');
  const high=commandIntent(parsed,'you',c,players).intent;
  assert.equal(high.type,'serve');assert.deepEqual(high.target,normal.target);
  const a=generateTrajectory(normal,c,players),b=generateTrajectory(high,c,players);
  assert.ok(b.apex>a.apex+1);assert.ok(b.leg.duration>a.leg.duration);
 }
 const high=commandIntent(parseLocalCommand('super high lob serve'),'you',c,players).intent;
 let normalLong=0,highLong=0;
 for(let seed=0;seed<400;seed++){
  normalLong+=Number(Math.abs(executeShot(normal,c,players,{seed,balance:1}).actualEndpoint.z)>COURT.length/2+.037);
  highLong+=Number(Math.abs(executeShot(high,c,players,{seed,balance:1}).actualEndpoint.z)>COURT.length/2+.037);
 }
 assert.ok(highLong>normalLong,`${highLong} vs ${normalLong}`);
 await m.submitCommand('super high lob serve','voice');assert.equal(m.state.phase,'flight',m.customStatus);
 assert.equal(m.shot.intent.type,'serve');assert.equal(m.shot.intent.intendedNetClearance,7);assert.equal(m.shot.intent.source,'voice');
});
